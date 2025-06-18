import dayjs from 'dayjs';
import { CarouselItemWrapper } from '../carousel/CarouselItemWrapper';
import { Button, Text, View, YGroup } from 'tamagui';
import { Calendar } from '@tamagui/lucide-icons';

import { LinkButton } from '../button/LinkButton';
import * as React from 'react';
import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { map, Observable } from 'rxjs';
import { TransactionModel } from '../../database/transaction-model';
import { formatCurrency } from '../../lib/format';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { CategoryModel } from '../../database/category-model';
import { InfoItem } from '../InfoItem';
import { formatDateRange } from '../../lib/date';
import { DatePicker } from '../DatePicker';
import BottomSheetDynamicSize from '../filtering/BottomSheetDynamicSize';
import { useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  calculateTransactionAnalytics,
  TransactionAnalytics,
} from '../../lib/transactionAnalytics';

type SpendOverviewProps = {
  analytics: TransactionAnalytics;
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
    analytics: Observable<TransactionAnalytics>;
    categories: Observable<CategoryModel[]>;
  }
>(['fromDate', 'toDate'], ({ database, fromDate: fd, toDate: td }) => {
  const fromDate = fd.toDate().getTime();
  const toDate = td.toDate().getTime();

  return {
    // Single optimized query for all transaction analytics
    analytics: database.collections
      .get<TransactionModel>('transactions')
      .query(Q.where('date', Q.gte(fromDate)), Q.where('date', Q.lte(toDate)))
      .observeWithColumns(['categoryId', 'amountInBaseCurrency', 'date'])
      .pipe(map(transactions => calculateTransactionAnalytics(transactions))),
    categories: database.collections.get<CategoryModel>('categories').query().observe(),
  };
})(({ analytics, fromDate, toDate, categories, onDatePress }: SpendOverviewProps) => {
  const { defaultCurrency } = useDefaultCurrency();

  const category = categories.find(c => c.id === analytics.highestSpendCategory.category);
  return (
    <CarouselItemWrapper>
      <View
        justifyContent="flex-start"
        flexDirection="row"
        marginBottom="$4"
        paddingHorizontal="$3">
        <LinkButton onPress={onDatePress} color="white" backgroundColor="$gray2">
          <View flexDirection="row" gap="$2" alignItems="center">
            <Text fontSize="$5">{formatDateRange(fromDate, toDate)}</Text>
            <Calendar size={16} />
          </View>
        </LinkButton>
      </View>
      <YGroup flexDirection="row" paddingHorizontal="$4" justifyContent="space-between" mb="$5">
        <YGroup gap="$5">
          <InfoItem
            title="Period Income"
            color={analytics.totalIncome > 0 ? '$green' : 'white'}
            value={defaultCurrency ? formatCurrency(analytics.totalIncome, defaultCurrency) : ''}
          />
          <InfoItem
            title="Period Balance"
            color={
              analytics.balance > 0 ? '$green' : analytics.balance === 0 ? 'white' : '$stroberi'
            }
            value={defaultCurrency ? formatCurrency(analytics.balance, defaultCurrency) : ''}
          />
        </YGroup>
        <YGroup paddingHorizontal="$4" gap="$5">
          <InfoItem
            title="Period Spend"
            color={analytics.totalExpense !== 0 ? '$stroberi' : 'white'}
            value={defaultCurrency ? formatCurrency(analytics.totalExpense, defaultCurrency) : ''}
          />
          <InfoItem title="Transaction No." value={analytics.transactionCount.toString()} />
        </YGroup>
      </YGroup>
      <View paddingHorizontal="$4" gap="$1" mb="$2">
        <Text fontSize="$2">Top Spend Category</Text>
        {category ? (
          <Text fontSize="$5" fontWeight="bold">
            {category?.name ?? 'Uncategorized'} {category?.icon}{' '}
            {defaultCurrency
              ? formatCurrency(analytics.highestSpendCategory.total, defaultCurrency)
              : null}
          </Text>
        ) : (
          <Text fontSize="$5" fontWeight="bold">
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
        <View paddingHorizontal="$4" paddingVertical="$2" gap="$5">
          <View flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text fontSize="$6" fontWeight="bold">
              From Date
            </Text>
            <DatePicker date={tempFromDate.toDate()} setDate={d => setTempFromDate(dayjs(d))} />
          </View>
          <View flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text fontSize="$6" fontWeight="bold">
              To Date
            </Text>
            <DatePicker date={tempToDate.toDate()} setDate={d => setTempToDate(dayjs(d))} />
          </View>
          <Button
            backgroundColor="$green"
            gap="$0"
            paddingHorizontal="$2"
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
