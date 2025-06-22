import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import dayjs from 'dayjs';
import * as React from 'react';
import { map, type Observable } from 'rxjs';
import { Button, styled, View } from 'tamagui';
import type { TransactionModel } from '../../database/transaction-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { SpendLineChart } from './SpendLineChart';

type SpendingTrendsProps = {
  chartData: SpendingTrendsChartData;
  trendType: SpendingTrendType;
  setTrendType: (type: SpendingTrendType) => void;
};

export type SpendingTrendsChartData = {
  period: string;
  total: number;
  sortKey: number;
  weekIndex?: number;
}[];

type SpendingTrendType = 'daily' | 'last30days' | 'weekly';

export const SpendingTrends = withObservables<
  { database: Database; trendType: SpendingTrendType },
  {
    chartData: Observable<SpendingTrendsChartData>;
  }
>(['trendType'], ({ database, trendType }) => {
  return {
    chartData: database.collections
      .get<TransactionModel>('transactions')
      .query(Q.where('amountInBaseCurrency', Q.lt(0)))
      .observeWithColumns(['date', 'amountInBaseCurrency'])
      .pipe(
        map((transactions) => {
          if (trendType === 'daily') {
            const currentMonth = dayjs().startOf('month');
            const today = dayjs();
            const daysToShow = today.isSame(currentMonth, 'month')
              ? today.date()
              : currentMonth.daysInMonth();

            return Array.from({ length: daysToShow }, (_, i) => {
              const date = currentMonth.add(i, 'day');
              const dayName = date.format('DD');
              const sortKey = date.valueOf();

              const total = transactions
                .filter((transaction) => {
                  const transactionDate = dayjs(transaction.date);
                  return transactionDate.isSame(date, 'day');
                })
                .reduce(
                  (acc, transaction) => acc + Math.abs(transaction.amountInBaseCurrency),
                  0
                );

              return {
                period: dayName,
                total,
                sortKey,
              };
            }).sort((a, b) => a.sortKey - b.sortKey);
          } else if (trendType === 'last30days') {
            const last30Days = Array.from({ length: 30 }, (_, i) => {
              return dayjs().subtract(29 - i, 'day');
            });

            return last30Days
              .map((date) => {
                const dayLabel = date.format('DD');
                const sortKey = date.valueOf();

                const total = transactions
                  .filter((transaction) => {
                    const transactionDate = dayjs(transaction.date);
                    return transactionDate.isSame(date, 'day');
                  })
                  .reduce(
                    (acc, transaction) =>
                      acc + Math.abs(transaction.amountInBaseCurrency),
                    0
                  );

                return {
                  period: dayLabel,
                  total,
                  sortKey,
                };
              })
              .sort((a, b) => a.sortKey - b.sortKey);
          } else {
            const last8Weeks = Array.from({ length: 8 }, (_, i) => {
              return dayjs().subtract(i, 'week').startOf('week');
            }).reverse();

            return last8Weeks
              .map((weekStart, index) => {
                const weekEnd = weekStart.endOf('week');
                const weekLabel = weekStart.format('MMM DD');
                const sortKey = weekStart.valueOf();

                const total = transactions
                  .filter((transaction) => {
                    const transactionDate = dayjs(transaction.date);
                    return (
                      transactionDate.isAfter(weekStart.subtract(1, 'day')) &&
                      transactionDate.isBefore(weekEnd.add(1, 'day'))
                    );
                  })
                  .reduce(
                    (acc, transaction) =>
                      acc + Math.abs(transaction.amountInBaseCurrency),
                    0
                  );

                return {
                  period: weekLabel,
                  total,
                  sortKey,
                  weekIndex: index,
                };
              })
              .sort((a, b) => a.sortKey - b.sortKey);
          }
        })
      ),
  };
})(({ chartData, trendType, setTrendType }: SpendingTrendsProps) => {
  const { defaultCurrency } = useDefaultCurrency();

  const formatPeriodLabel = React.useCallback(
    (period: string) => {
      if (trendType === 'daily' || trendType === 'last30days') {
        return period?.toString() || '';
      } else {
        // For weekly view, show only every other label to reduce crowding
        // Find the index of this period in our chart data
        const dataIndex = chartData.findIndex((item) => item.period === period);
        if (dataIndex !== -1 && dataIndex % 2 !== 0) {
          return '';
        }
        const str = period?.toString() || '';
        return str.length > 6 ? str.substring(0, 6) : str;
      }
    },
    [trendType, chartData]
  );

  const chartTitle = React.useMemo(() => {
    switch (trendType) {
      case 'daily':
        return `Daily spend this month (${defaultCurrency})`;
      case 'last30days':
        return `Daily spend last 30 days (${defaultCurrency})`;
      case 'weekly':
        return `Weekly spend trends (${defaultCurrency})`;
      default:
        return `Spending trends (${defaultCurrency})`;
    }
  }, [trendType, defaultCurrency]);

  return (
    <SpendLineChart
      chartData={chartData}
      title={chartTitle}
      isEmpty={chartData.every((el) => el.total === 0)}
      xKey={'period'}
      yKeys={['total']}
      formatXLabel={formatPeriodLabel}
      strokeWidth={2}
      curveType={
        trendType === 'daily' || trendType === 'last30days' ? 'linear' : 'natural'
      }
      footer={
        <View
          flexDirection={'row'}
          gap={'$2'}
          justifyContent={'center'}
          paddingHorizontal={'$2'}
          paddingVertical={'$2'}
          alignItems={'center'}
        >
          <FilterButton
            active={trendType === 'daily'}
            onPress={() => setTrendType('daily')}
          >
            This Month
          </FilterButton>
          <FilterButton
            active={trendType === 'last30days'}
            onPress={() => setTrendType('last30days')}
          >
            Last 30 Days
          </FilterButton>
          <FilterButton
            active={trendType === 'weekly'}
            onPress={() => setTrendType('weekly')}
          >
            Weekly
          </FilterButton>
        </View>
      }
    />
  );
});

const FilterButton = styled(Button, {
  alignSelf: 'flex-start',
  backgroundColor: '$gray',
  color: 'white',
  borderRadius: '$5',
  paddingVertical: '$1',
  paddingHorizontal: '$3',
  height: 'fit-content',
  fontSize: '$2',
  variants: {
    active: {
      true: {
        backgroundColor: '$stroberi',
      },
    },
  },
});

type WithFiltersProps = {
  database: Database;
};

const WithFilters = ({ database }: WithFiltersProps) => {
  const [trendType, setTrendType] = React.useState<SpendingTrendType>('daily');
  return (
    <SpendingTrends
      trendType={trendType}
      setTrendType={setTrendType}
      database={database}
    />
  );
};

export default WithFilters;
