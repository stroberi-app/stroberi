import { withObservables } from '@nozbe/watermelondb/react';
import { Pen, Trash2 } from '@tamagui/lucide-icons-2';
import { Alert } from 'react-native';
import { combineLatest, map, type Observable, of, switchMap } from 'rxjs';
import { ScrollView, Text, View, XStack } from 'tamagui';
import type { BudgetModel } from '../database/budget-model';
import type { CategoryModel } from '../database/category-model';
import { deleteBudget } from '../database/actions/budgets';
import { database } from '../database/index';
import { observeBudgetSpend } from '../features/budget/observeBudgetSpend';
import { useDefaultCurrency } from '../hooks/useDefaultCurrency';
import {
  type BudgetEvaluation,
  evaluateBudget,
  getBudgetDisplayName,
  getBudgetProgressColor,
  getPeriodLabel,
} from '../lib/budgetUtils';
import { BudgetProgress } from './BudgetProgress';
import { LinkButton } from './button/LinkButton';

type BudgetItemProps = {
  budget: BudgetModel;
  onEdit: (budget: BudgetModel) => void;
  budgetStatus: BudgetEvaluation;
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
            {getBudgetDisplayName(budget)}
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
    budgetStatus: Observable<BudgetEvaluation>;
    categories: Observable<CategoryModel[]>;
  }
>(['budget'], ({ budget }) => {
  const categoryIds = budget.budgetCategories
    .observe()
    .pipe(map((links) => links.map((link) => link.categoryId)));

  return {
    budgetStatus: categoryIds.pipe(
      switchMap((ids) =>
        // Model fields are prototype getters, so pass them explicitly (no spread).
        observeBudgetSpend(database, {
          period: budget.period,
          startDate: budget.startDate,
          rollover: budget.rollover,
          categoryIds: ids,
        })
      ),
      map(({ spent, previousSpent }) => evaluateBudget(budget, spent, previousSpent))
    ),
    categories: categoryIds.pipe(
      switchMap((ids) =>
        ids.length === 0
          ? of([])
          : combineLatest(
              ids.map((id) =>
                database.get<CategoryModel>('categories').findAndObserve(id)
              )
            )
      )
    ),
  };
})(BudgetItemContent);
