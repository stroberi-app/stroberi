import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import dayjs from 'dayjs';
import { map, type Observable } from 'rxjs';
import type { TransactionModel } from '../../database/transaction-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { SpendBarChart } from './SpendBarChart';

type SpendByMonthProps = {
  chartData: SpendByMonthChartData;
  type: 'expense' | 'income';
};
export type SpendByMonthChartData = {
  month: string;
  year: number;
  total: number;
  sortKey: number;
}[];

export const SpendByType = withObservables<
  { database: Database; type: 'expense' | 'income' },
  {
    chartData: Observable<SpendByMonthChartData>;
  }
>(['type'], ({ database, type }) => {
  const startDate = dayjs().subtract(5, 'month').startOf('month').toDate().getTime();
  const endDate = dayjs().endOf('month').toDate().getTime();

  return {
    chartData: database.collections
      .get<TransactionModel>('transactions')
      .query(
        Q.where('amountInBaseCurrency', type === 'income' ? Q.gte(0) : Q.lt(0)),
        Q.where('date', Q.gte(startDate)),
        Q.where('date', Q.lte(endDate))
      )
      .observeWithColumns(['date', 'amountInBaseCurrency'])
      .pipe(
        map((transactions) => {
          const totalsByMonthKey = new Map<string, number>();
          for (const transaction of transactions) {
            const transactionDate = dayjs(transaction.date);
            const monthKey = transactionDate.format('YYYY-MM');
            const currentTotal = totalsByMonthKey.get(monthKey) ?? 0;
            totalsByMonthKey.set(
              monthKey,
              currentTotal + Math.abs(transaction.amountInBaseCurrency)
            );
          }

          const last6Months = Array.from({ length: 6 }, (_, i) => {
            return dayjs().subtract(i, 'month');
          }).reverse();

          return last6Months
            .map((date) => {
              const month = date.format('MMM');
              const year = date.year();
              const sortKey = date.valueOf();
              const monthKey = date.format('YYYY-MM');
              const total = totalsByMonthKey.get(monthKey) ?? 0;

              return {
                month,
                year,
                sortKey,
                total,
              };
            })
            .sort((a, b) => a.sortKey - b.sortKey);
        })
      ),
  };
})(({ chartData, type }: SpendByMonthProps) => {
  const { defaultCurrency } = useDefaultCurrency();

  const formatMonthLabel = (month: string) => {
    return month?.toString() || '';
  };

  return (
    <SpendBarChart
      chartData={chartData}
      title={
        type === 'expense'
          ? `Spend by Month (${defaultCurrency})`
          : `Income by Month (${defaultCurrency})`
      }
      isEmpty={chartData.every((el) => el.total === 0)}
      xKey={'month'}
      yKeys={['total']}
      formatXLabel={formatMonthLabel}
    />
  );
});
