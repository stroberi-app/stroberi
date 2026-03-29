import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { Pen, Trash2 } from '@tamagui/lucide-icons';
import { Alert } from 'react-native';
import { combineLatest, map, type Observable, of, switchMap } from 'rxjs';
import { ScrollView, Text, View, XStack } from 'tamagui';
import type { BudgetCategoryModel } from '../database/budget-category-model';
import type { BudgetModel } from '../database/budget-model';
import type { CategoryModel } from '../database/category-model';
import { deleteBudget } from '../database/actions/budgets';
import { database } from '../database/index';
import type { TransactionModel } from '../database/transaction-model';
import { useDefaultCurrency } from '../hooks/useDefaultCurrency';
import {
  calculateBudgetPeriodDates,
  calculateRollover,
  formatBudgetPeriod,
  getBudgetProgressColor,
  getPeriodLabel,
} from '../lib/budgetUtils';
import { BudgetProgress } from './BudgetProgress';
import { LinkButton } from './button/LinkButton';

type BudgetStatus = {
  spent: number;
  remaining: number;
  percentage: number;
  budgetLimit: number;
  status: 'ok' | 'warning' | 'exceeded';
};

type BudgetItemProps = {
  budget: BudgetModel;
  onEdit: (budget: BudgetModel) => void;
  budgetStatus: BudgetStatus;
  categories: CategoryModel[];
};

const BudgetItemContent = ({
  budget,
  budgetStatus,
  categories,
  onEdit,
}: BudgetItemProps) => {
  const { defaultCurrency } = useDefaultCurrency();

  const handleDelete = () => {
    Alert.alert('Delete Budget', 'Are you sure you want to delete this budget?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBudget(budget.id);
          } catch {
            Alert.alert('Error', 'Failed to delete budget');
          }
        },
      },
    ]);
  };

  const progressColor = getBudgetProgressColor(
    budgetStatus.percentage,
    budget.alertThreshold
  );

  const statusMessage =
    budgetStatus.status === 'exceeded'
      ? 'Budget exceeded!'
      : budgetStatus.status === 'warning'
        ? 'Approaching limit'
        : null;

  return (
    <View
      backgroundColor="$gray2"
      padding="$4"
      borderRadius="$4"
      marginBottom="$3"
      opacity={budget.isActive ? 1 : 0.5}
    >
      <View
        flexDirection="row"
        justifyContent="space-between"
        alignItems="flex-start"
        marginBottom="$3"
      >
        <View flex={1}>
          <Text fontSize="$6" fontWeight="bold" marginBottom="$1">
            {budget.name || `${formatBudgetPeriod(budget.period)} Budget`}
          </Text>
          <Text fontSize="$2" color="$gray10">
            {getPeriodLabel(budget)}
          </Text>
        </View>
        <View flexDirection="row" gap="$2" alignItems="center">
          <LinkButton
            backgroundColor="transparent"
            padding="$2"
            onPress={() => onEdit(budget)}
          >
            <Pen size={20} color="$gray11" />
          </LinkButton>
          <LinkButton backgroundColor="transparent" padding="$2" onPress={handleDelete}>
            <Trash2 size={20} color="$stroberi" />
          </LinkButton>
        </View>
      </View>

      {categories.length > 0 && (
        <View marginBottom="$3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack gap="$2">
              {categories.map((category) => (
                <View
                  key={category.id}
                  flexDirection="row"
                  alignItems="center"
                  backgroundColor="$gray4"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$3"
                  gap="$1"
                >
                  <Text fontSize="$2">{category.icon}</Text>
                  <Text fontSize="$2" color="$gray11">
                    {category.name}
                  </Text>
                </View>
              ))}
            </XStack>
          </ScrollView>
        </View>
      )}

      {categories.length === 0 && (
        <View marginBottom="$3">
          <Text fontSize="$2" color="$gray9">
            All categories
          </Text>
        </View>
      )}

      <BudgetProgress
        spent={budgetStatus.spent}
        budget={budgetStatus.budgetLimit}
        percentage={budgetStatus.percentage}
        currency={defaultCurrency || 'USD'}
        color={progressColor}
      />

      {statusMessage && (
        <View marginTop="$2">
          <Text fontSize="$2" color={progressColor} fontWeight="600" textAlign="center">
            {statusMessage}
          </Text>
        </View>
      )}
    </View>
  );
};

export const BudgetItem = withObservables<
  { budget: BudgetModel; onEdit: (budget: BudgetModel) => void },
  {
    budgetStatus: Observable<BudgetStatus>;
    categories: Observable<CategoryModel[]>;
  }
>(['budget'], ({ budget }) => {
  const periodDates = calculateBudgetPeriodDates(budget);

  const budgetCategoriesObservable = budget.budgetCategories.observe();

  const categoriesObservable = budgetCategoriesObservable.pipe(
    switchMap((budgetCategories: BudgetCategoryModel[]) => {
      if (budgetCategories.length === 0) {
        return of([]);
      }
      const categoryObservables = budgetCategories.map((bc) =>
        database.get<CategoryModel>('categories').findAndObserve(bc.categoryId)
      );
      return combineLatest(categoryObservables);
    })
  );

  const previousPeriodDates = calculateBudgetPeriodDates(budget, -1);
  const budgetStatusObservable = budgetCategoriesObservable.pipe(
    switchMap((budgetCategories: BudgetCategoryModel[]) => {
      const categoryIds = budgetCategories.map((bc) => bc.categoryId);

      const currentPeriodConditions = [
        Q.where('date', Q.gte(periodDates.start.getTime())),
        Q.where('date', Q.lte(periodDates.end.getTime())),
        Q.where('amountInBaseCurrency', Q.lt(0)),
      ];

      if (categoryIds.length > 0) {
        currentPeriodConditions.push(Q.where('categoryId', Q.oneOf(categoryIds)));
      }

      const currentTransactionsObservable = database
        .get<TransactionModel>('transactions')
        .query(...currentPeriodConditions)
        .observeWithColumns(['amountInBaseCurrency']);

      if (!budget.rollover) {
        return currentTransactionsObservable.pipe(
          map((transactions) => {
            const spent = transactions.reduce(
              (sum, tx) => sum + Math.abs(tx.amountInBaseCurrency),
              0
            );
            const budgetLimit = budget.amount;
            const remaining = budgetLimit - spent;
            const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;

            const status =
              percentage >= 100
                ? ('exceeded' as const)
                : percentage >= budget.alertThreshold
                  ? ('warning' as const)
                  : ('ok' as const);

            return {
              spent,
              remaining,
              percentage,
              budgetLimit,
              status,
            };
          })
        );
      }

      const previousPeriodConditions = [
        Q.where('date', Q.gte(previousPeriodDates.start.getTime())),
        Q.where('date', Q.lte(previousPeriodDates.end.getTime())),
        Q.where('amountInBaseCurrency', Q.lt(0)),
      ];
      if (categoryIds.length > 0) {
        previousPeriodConditions.push(Q.where('categoryId', Q.oneOf(categoryIds)));
      }

      const previousTransactionsObservable = database
        .get<TransactionModel>('transactions')
        .query(...previousPeriodConditions)
        .observeWithColumns(['amountInBaseCurrency']);

      return combineLatest([
        currentTransactionsObservable,
        previousTransactionsObservable,
      ]).pipe(
        map(([transactions, previousTransactions]) => {
          const spent = transactions.reduce(
            (sum, tx) => sum + Math.abs(tx.amountInBaseCurrency),
            0
          );
          const previousSpent = previousTransactions.reduce(
            (sum, tx) => sum + Math.abs(tx.amountInBaseCurrency),
            0
          );
          const rolloverAmount = calculateRollover(budget, previousSpent);
          const budgetLimit = budget.amount + rolloverAmount;
          const remaining = budgetLimit - spent;
          const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;

          const status =
            percentage >= 100
              ? ('exceeded' as const)
              : percentage >= budget.alertThreshold
                ? ('warning' as const)
                : ('ok' as const);

          return {
            spent,
            remaining,
            percentage,
            budgetLimit,
            status,
          };
        })
      );
    })
  );

  return {
    budgetStatus: budgetStatusObservable,
    categories: categoriesObservable,
  };
})(BudgetItemContent);
