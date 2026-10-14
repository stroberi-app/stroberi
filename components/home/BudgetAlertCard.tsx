import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { AlertTriangle, X } from '@tamagui/lucide-icons-2';
import { combineLatest, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Text, View } from 'tamagui';
import type { BudgetCategoryModel } from '../../database/budget-category-model';
import type { BudgetModel } from '../../database/budget-model';
import type { TransactionModel } from '../../database/transaction-model';
import { useBudgetingEnabled } from '../../hooks/useBudgetingEnabled';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { stringListSetting, useStoredSetting } from '../../hooks/useStoredSetting';
import { calculateBudgetAlerts, type BudgetAlertData } from '../../lib/budgetAlerts';
import { getBudgetDisplayName } from '../../lib/budgetUtils';
import { formatCurrency } from '../../lib/format';
import { STORAGE_KEYS } from '../../lib/storageKeys';
import { LinkButton } from '../button/LinkButton';

type BudgetAlertCardProps = {
  budgetAlerts: BudgetAlertData[];
};

const BudgetAlertCard = ({ budgetAlerts }: BudgetAlertCardProps) => {
  const { defaultCurrency } = useDefaultCurrency();
  const { budgetingEnabled } = useBudgetingEnabled();
  const { value: dismissedBudgetIds, setValue: setDismissedBudgetIds } = useStoredSetting(
    STORAGE_KEYS.DISMISSED_BUDGET_ALERTS,
    stringListSetting
  );

  const handleDismissBudget = (budgetId: string) =>
    setDismissedBudgetIds([...dismissedBudgetIds, budgetId]);

  const visibleAlerts = budgetAlerts.filter(
    (alert) => !dismissedBudgetIds.includes(alert.budget.id)
  );

  if (!budgetingEnabled || visibleAlerts.length === 0) {
    return null;
  }

  const exceededCount = visibleAlerts.filter(
    (alert) => alert.status === 'exceeded'
  ).length;
  const warningCount = visibleAlerts.filter((alert) => alert.status === 'warning').length;

  return (
    <View
      backgroundColor="$gray3"
      borderWidth={1}
      borderColor="$gray5"
      padding="$3"
      borderRadius="$4"
      marginBottom="$3"
      marginHorizontal="$2"
    >
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="flex-start"
        marginBottom="$2"
        gap="$2"
      >
        <AlertTriangle size={20} color="$stroberi" />
        <Text fontSize="$5" fontWeight="bold" color="$stroberi">
          Budget Alert
        </Text>
      </View>

      {exceededCount > 0 && (
        <Text fontSize="$3" color="$gray11" marginBottom="$1">
          {exceededCount} {exceededCount === 1 ? 'budget' : 'budgets'} exceeded
        </Text>
      )}

      {warningCount > 0 && (
        <Text fontSize="$3" color="$gray11" marginBottom="$1">
          {warningCount} {warningCount === 1 ? 'budget' : 'budgets'} approaching limit
        </Text>
      )}

      <View marginTop="$2" gap="$1">
        {visibleAlerts.slice(0, 2).map((alert) => (
          <View
            key={alert.budget.id}
            backgroundColor="$gray4"
            padding="$2"
            borderRadius="$2"
          >
            <View
              flexDirection="row"
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <View flex={1}>
                <View
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  marginBottom="$1"
                >
                  <Text fontSize="$2" color="white" fontWeight="bold" flex={1}>
                    {getBudgetDisplayName(alert.budget)}
                  </Text>
                  <View
                    backgroundColor={
                      alert.status === 'exceeded' ? '$stroberi' : '$yellow'
                    }
                    paddingHorizontal="$1.5"
                    paddingVertical="$0.5"
                    borderRadius="$1"
                    marginLeft="$2"
                  >
                    <Text fontSize="$1" color="white" fontWeight="bold">
                      {Math.round(alert.percentage)}%
                    </Text>
                  </View>
                </View>
                <Text fontSize="$2" color="$gray11">
                  {formatCurrency(alert.spent, defaultCurrency || 'USD')} /{' '}
                  {formatCurrency(alert.budgetLimit, defaultCurrency || 'USD')}
                </Text>
              </View>
              <LinkButton
                backgroundColor="transparent"
                padding="$1"
                marginLeft="$2"
                marginTop={-4}
                onPress={() => handleDismissBudget(alert.budget.id)}
              >
                <X size={16} color="$gray11" />
              </LinkButton>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const enhance = withObservables<
  { database: Database },
  { budgetAlerts: Observable<BudgetAlertData[]> }
>(['database'], ({ database }) => {
  const budgetsObservable = database
    .get<BudgetModel>('budgets')
    .query(Q.where('isActive', true))
    .observe();
  const budgetCategoriesObservable = database
    .get<BudgetCategoryModel>('budget_categories')
    .query()
    .observe();
  const transactionsObservable = database
    .get<TransactionModel>('transactions')
    .query(Q.where('amountInBaseCurrency', Q.lt(0)))
    .observeWithColumns(['amountInBaseCurrency', 'date', 'categoryId']);

  return {
    budgetAlerts: combineLatest([
      budgetsObservable,
      budgetCategoriesObservable,
      transactionsObservable,
    ]).pipe(
      map(([budgets, budgetCategories, transactions]) =>
        calculateBudgetAlerts({
          budgets,
          budgetCategories,
          transactions,
        })
      )
    ),
  };
});

export default enhance(BudgetAlertCard);
