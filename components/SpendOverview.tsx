import dayjs from 'dayjs';
import { CarouselItemWrapper } from './carousel/CarouselItemWrapper';
import { Text, View, YGroup } from 'tamagui';
import { Calendar } from '@tamagui/lucide-icons';

import { LinkButton } from './button/LinkButton';
import * as React from 'react';
import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { map, Observable } from 'rxjs';
import { TransactionModel } from '../database/transaction-model';
import { formatCurrency } from '../lib/format';
import { useDefaultCurrency } from '../hooks/useDefaultCurrency';
import { CategoryModel } from '../database/category-model';
import { InfoItem } from './InfoItem';
import { formatDateRange } from '../lib/date';

type SpendOverviewProps = {
  totalExpense: number;
  totalIncome: number;
  transactionCount: number;
  highestSpendCategory$: { category: string; total: number };
  categories: CategoryModel[];
  selectedDate: dayjs.Dayjs;
  onDatePress: () => void;
  fromDate: number;
  toDate: number;
};
export const SpendOverview = withObservables<
  {
    database: Database;
    fromDate: dayjs.Dayjs;
    toDate: dayjs.Dayjs;
  },
  {
    totalExpense: Observable<number>;
    totalIncome: Observable<number>;
    transactionCount: Observable<number>;
    highestSpendCategory$: Observable<{ category: string; total: number }>;
    categories: Observable<CategoryModel[]>;
  }
>(['fromDate', 'toDate'], ({ database, fromDate: fd, toDate: td }) => {
  const fromDate = fd.toDate().getTime();
  const toDate = td.toDate().getTime();
  const highestSpendCategory$ = database.collections
    .get<TransactionModel>('transactions')
    .query(
      Q.where('amountInBaseCurrency', Q.lt(0)),
      Q.where('date', Q.gte(fromDate)),
      Q.where('date', Q.lte(toDate))
    )
    .observe()
    .pipe(
      map(transactions => {
        const categories = transactions.reduce(
          (acc, transaction) => {
            const category = transaction.category?.id || 'Uncategorized';
            if (!acc[category]) {
              acc[category] = 0;
            }
            acc[category] += Math.abs(transaction.amountInBaseCurrency);
            return acc;
          },
          {} as Record<string, number>
        );

        return Object.entries(categories).reduce(
          (max, [category, total]) => (total > max.total ? { category, total } : max),
          { category: 'Uncategorized', total: 0 }
        );
      })
    );

  return {
    totalExpense: database.collections
      .get<TransactionModel>('transactions')
      .query(
        Q.where('amountInBaseCurrency', Q.lt(0)),
        Q.where('date', Q.gte(fromDate)),
        Q.where('date', Q.lte(toDate))
      )
      .observe()
      .pipe(
        map(transactions =>
          transactions.reduce((sum, transaction) => sum + transaction.amountInBaseCurrency, 0)
        )
      ),
    totalIncome: database.collections
      .get<TransactionModel>('transactions')
      .query(
        Q.where('amountInBaseCurrency', Q.gte(0)),
        Q.where('date', Q.gte(fromDate)),
        Q.where('date', Q.lte(toDate))
      )
      .observe()
      .pipe(
        map(transactions =>
          transactions.reduce((sum, transaction) => sum + transaction.amountInBaseCurrency, 0)
        )
      ),
    transactionCount: database.collections
      .get<TransactionModel>('transactions')
      .query(Q.where('date', Q.gte(fromDate)), Q.where('date', Q.lte(toDate)))
      .observeCount(),
    highestSpendCategory$,
    categories: database.collections.get<CategoryModel>('categories').query().observe(),
  };
})(({
  totalExpense,
  fromDate,
  toDate,
  totalIncome,
  transactionCount,
  highestSpendCategory$,
  categories,
  onDatePress,
}: SpendOverviewProps) => {
  const { defaultCurrency } = useDefaultCurrency();

  const category = categories.find(c => c.id === highestSpendCategory$.category);
  return (
    <CarouselItemWrapper>
      <View
        justifyContent={'flex-start'}
        flexDirection={'row'}
        marginBottom={'$4'}
        paddingHorizontal={'$3'}>
        <LinkButton onPress={onDatePress} color={'white'} backgroundColor={'$gray2'}>
          <View flexDirection={'row'} gap={'$2'} alignItems={'center'}>
            <Text fontSize={'$5'}>{formatDateRange(fromDate, toDate)}</Text>
            <Calendar size={16} />
          </View>
        </LinkButton>
      </View>
      <YGroup
        flexDirection={'row'}
        paddingHorizontal={'$4'}
        justifyContent={'space-between'}
        mb={'$5'}>
        <YGroup gap={'$5'}>
          <InfoItem
            title={'Period income'}
            color={'$green'}
            value={defaultCurrency ? formatCurrency(totalIncome, defaultCurrency) : ''}
          />
          <InfoItem
            title={'Period Balance'}
            color={totalIncome + totalExpense >= 0 ? '$green' : '$stroberi'}
            value={
              defaultCurrency ? formatCurrency(totalIncome + totalExpense, defaultCurrency) : ''
            }
          />
        </YGroup>
        <YGroup paddingHorizontal={'$4'} gap={'$5'}>
          <InfoItem
            title={'Period expenses'}
            color={'$stroberi'}
            value={defaultCurrency ? formatCurrency(totalExpense, defaultCurrency) : ''}
          />
          <InfoItem title={'Transaction count'} value={transactionCount.toString()} />
        </YGroup>
      </YGroup>
      {!!category && (
        <View paddingHorizontal={'$4'} gap={'$1'} mb={'$2'}>
          <Text fontSize={'$2'}>Top Spend Category</Text>
          <Text fontSize={'$5'} fontWeight={'bold'}>
            {category?.name ?? 'Uncategorized'} {category?.icon}{' '}
            {defaultCurrency ? formatCurrency(highestSpendCategory$?.total, defaultCurrency) : null}
          </Text>
        </View>
      )}
    </CarouselItemWrapper>
  );
});
