import dayjs from 'dayjs';
import { CarouselItemWrapper } from './carousel/CarouselItemWrapper';
import { Button, Text, View, YGroup } from 'tamagui';
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
import { DatePicker } from './DatePicker';
import BottomSheetDynamicSize from './filtering/BottomSheetDynamicSize';
import { useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

type SpendOverviewProps = {
  totalExpense: number;
  totalIncome: number;
  transactionCount: number;
  highestSpendCategory$: { category: string; total: number };
  categories: CategoryModel[];
  onDatePress: () => void;
  fromDate: dayjs.Dayjs;
  toDate: dayjs.Dayjs;
};
const SpendOverview = withObservables<
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

  const balance = totalIncome + totalExpense;
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
            title={'Period Income'}
            color={totalIncome > 0 ? '$green' : 'white'}
            value={defaultCurrency ? formatCurrency(totalIncome, defaultCurrency) : ''}
          />
          <InfoItem
            title={'Period Balance'}
            color={balance > 0 ? '$green' : balance === 0 ? 'white' : '$stroberi'}
            value={
              defaultCurrency ? formatCurrency(totalIncome + totalExpense, defaultCurrency) : ''
            }
          />
        </YGroup>
        <YGroup paddingHorizontal={'$4'} gap={'$5'}>
          <InfoItem
            title={'Period Spend'}
            color={totalExpense !== 0 ? '$stroberi' : 'white'}
            value={defaultCurrency ? formatCurrency(totalExpense, defaultCurrency) : ''}
          />
          <InfoItem title={'Transaction No.'} value={transactionCount.toString()} />
        </YGroup>
      </YGroup>
      <View paddingHorizontal={'$4'} gap={'$1'} mb={'$2'}>
        <Text fontSize={'$2'}>Top Spend Category</Text>
        {category ? (
          <Text fontSize={'$5'} fontWeight={'bold'}>
            {category?.name ?? 'Uncategorized'} {category?.icon}{' '}
            {defaultCurrency ? formatCurrency(highestSpendCategory$?.total, defaultCurrency) : null}
          </Text>
        ) : (
          <Text fontSize={'$5'} fontWeight={'bold'}>
            N/A
          </Text>
        )}
      </View>
    </CarouselItemWrapper>
  );
});

type WithDateFilterProps = {
  database: Database;
};
const WithDateFilter = ({ database }: WithDateFilterProps) => {
  const dateSheetRef = React.useRef<BottomSheetModal | null>(null);
  const [fromDate, setFromDate] = useState<dayjs.Dayjs>(dayjs().startOf('month'));
  const [toDate, setToDate] = useState(dayjs().endOf('month'));
  const [tempFromDate, setTempFromDate] = useState(fromDate);
  const [tempToDate, setTempToDate] = useState(toDate);
  return (
    <>
      <SpendOverview
        database={database}
        fromDate={fromDate}
        toDate={toDate}
        onDatePress={() => {
          dateSheetRef.current?.present();
        }}
      />
      <BottomSheetDynamicSize sheetRef={dateSheetRef}>
        <View paddingHorizontal={'$4'} paddingVertical={'$2'} gap={'$5'}>
          <View flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
            <Text fontSize={'$6'} fontWeight={'bold'}>
              From Date
            </Text>
            <DatePicker date={tempFromDate.toDate()} setDate={d => setTempFromDate(dayjs(d))} />
          </View>
          <View flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
            <Text fontSize={'$6'} fontWeight={'bold'}>
              To Date
            </Text>
            <DatePicker date={tempToDate.toDate()} setDate={d => setTempToDate(dayjs(d))} />
          </View>
          <Button
            backgroundColor={'$green'}
            gap={'$0'}
            paddingHorizontal={'$2'}
            onPress={() => {
              setFromDate(tempFromDate);
              setToDate(tempToDate);
              dateSheetRef.current?.close();
            }}>
            Apply
          </Button>
        </View>
      </BottomSheetDynamicSize>
    </>
  );
};

export default WithDateFilter;
