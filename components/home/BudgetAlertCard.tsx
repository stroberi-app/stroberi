import { Q, type Database } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { AlertTriangle, X } from '@tamagui/lucide-icons';
import { useEffect, useState } from 'react';
import { from, type Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Text, View } from 'tamagui';
import type { BudgetModel } from '../../database/budget-model';
import { database } from '../../database/index';
import type { TransactionModel } from '../../database/transaction-model';
import { useBudgetingEnabled } from '../../hooks/useBudgetingEnabled';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { calculateBudgetPeriodDates } from '../../lib/budgetUtils';
import { formatCurrency } from '../../lib/format';
import { STORAGE_KEYS } from '../../lib/storageKeys';
import { LinkButton } from '../button/LinkButton';

type BudgetAlertData = {
  budget: BudgetModel;
  spent: number;
  percentage: number;
};

type BudgetAlertCardProps = {
  budgetAlerts: BudgetAlertData[];
};

const BudgetAlertCard = ({ budgetAlerts }: BudgetAlertCardProps) => {
  const { defaultCurrency } = useDefaultCurrency();
  const { budgetingEnabled } = useBudgetingEnabled();
  const [dismissedBudgetIds, setDismissedBudgetIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadDismissedState = async () => {
      const dismissed = await database.localStorage.get(
        STORAGE_KEYS.DISMISSED_BUDGET_ALERTS
      );
      if (dismissed && typeof dismissed === 'string') {
        try {
          const ids = JSON.parse(dismissed) as string[];
          setDismissedBudgetIds(new Set(ids));
        } catch {
          setDismissedBudgetIds(new Set());
        }
      }
    };
    loadDismissedState();
  }, []);

  const handleDismissBudget = async (budgetId: string) => {
    const newDismissedIds = new Set(dismissedBudgetIds);
    newDismissedIds.add(budgetId);
    setDismissedBudgetIds(newDismissedIds);
    await database.localStorage.set(
      STORAGE_KEYS.DISMISSED_BUDGET_ALERTS,
      JSON.stringify(Array.from(newDismissedIds))
    );
  };

  const visibleAlerts = budgetAlerts.filter(
    (alert) => !dismissedBudgetIds.has(alert.budget.id)
  );

  if (!budgetingEnabled || visibleAlerts.length === 0) {
    return null;
  }

  const exceededCount = visibleAlerts.filter((alert) => alert.percentage >= 100).length;
  const warningCount = visibleAlerts.filter(
    (alert) => alert.percentage >= alert.budget.alertThreshold && alert.percentage < 100
  ).length;

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
                    {alert.budget.name ||
                      `${alert.budget.period.charAt(0).toUpperCase() + alert.budget.period.slice(1)} Budget`}
                  </Text>
                  <View
                    backgroundColor={alert.percentage >= 100 ? '$stroberi' : '$yellow'}
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
                  {formatCurrency(alert.budget.amount, defaultCurrency || 'USD')}
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

  return {
    budgetAlerts: budgetsObservable.pipe(
      switchMap((budgets) =>
        from(
          (async () => {
            const alerts: BudgetAlertData[] = [];

            for (const budget of budgets) {
              const { start, end } = calculateBudgetPeriodDates(budget);

              const transactions = await database
                .get<TransactionModel>('transactions')
                .query(
                  Q.where('date', Q.gte(start.getTime())),
                  Q.where('date', Q.lte(end.getTime())),
                  Q.where('amountInBaseCurrency', Q.lt(0))
                )
                .fetch();

              const spent = transactions.reduce(
                (sum, tx) => sum + Math.abs(tx.amountInBaseCurrency),
                0
              );
              const percentage = (spent / budget.amount) * 100;

              if (percentage >= budget.alertThreshold) {
                alerts.push({ budget, spent, percentage });
              }
            }

            return alerts.sort((a, b) => b.percentage - a.percentage);
          })()
        )
      )
    ),
  };
});

export default enhance(BudgetAlertCard);
