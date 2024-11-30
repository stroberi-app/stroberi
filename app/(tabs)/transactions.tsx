import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Text, View } from 'tamagui';
import * as React from 'react';
import { Filter } from '@tamagui/lucide-icons';
import { LinkButton } from '../../components/button/LinkButton';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import TransactionsList from '../../components/TransactionsList';
import { DatePicker } from '../../components/DatePicker';
import { useState } from 'react';
import { Button } from '../../components/button/Button';
import DateFilterSection from '../../components/filtering/DateFilterSection';
import BottomSheetWrapper from '../../components/filtering/BottomSheetWrapper';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import CategoryFilterSection from '../../components/filtering/CategoryFilterSection';
import { CategoryModel } from '../../database/category-model';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

export type DateFilters = 'This Year' | 'This Month' | 'Custom';

export default function TransactionsScreen() {
  const { top } = useSafeAreaInsets();
  const [dateFilter, setDateFilter] = useState<DateFilters | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<CategoryModel[]>([]);
  const sheetRef = React.useRef<BottomSheetModal>(null);
  const dateSheetRef = React.useRef<BottomSheetModal>(null);
  const database = useDatabase();
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());

  const appliedNumberOfFilters = [dateFilter, selectedCategories.length].filter(Boolean).length;
  return (
    <>
      <ScrollView
        style={{ paddingTop: top }}
        backgroundColor={'$bgPrimary'}
        paddingHorizontal={'$2'}>
        <View flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
          <Text fontSize={'$9'} fontWeight={'bold'} marginBottom={'$2'}>
            Transactions
          </Text>
          <LinkButton paddingHorizontal={'$2'} onPress={() => sheetRef.current?.present()}>
            <Filter size={'$1'} color={'$stroberi'} />
            {appliedNumberOfFilters > 0 && (
              <Text color={'$stroberi'} fontWeight={'bold'}>
                +{appliedNumberOfFilters}
              </Text>
            )}
          </LinkButton>
        </View>
        <TransactionsList
          database={database}
          dateFilter={dateFilter}
          customRange={dateFilter === 'Custom' ? [fromDate, toDate] : undefined}
          categories={selectedCategories}
        />
        <View height={140} />
      </ScrollView>
      <BottomSheetWrapper sheetRef={sheetRef}>
        <DateFilterSection
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          fromDate={fromDate}
          toDate={toDate}
          dateSheetRef={dateSheetRef}
        />
        <CategoryFilterSection
          selectedCategories={selectedCategories}
          setSelectedCategory={setSelectedCategories}
        />
      </BottomSheetWrapper>
      <BottomSheetWrapper sheetRef={dateSheetRef}>
        <View paddingHorizontal={'$4'} paddingVertical={'$2'} gap={'$5'}>
          <View flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
            <Text fontSize={'$6'} fontWeight={'bold'}>
              From Date
            </Text>
            <DatePicker date={fromDate} setDate={setFromDate} />
          </View>
          <View flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
            <Text fontSize={'$6'} fontWeight={'bold'}>
              To Date
            </Text>
            <DatePicker date={toDate} setDate={setToDate} />
          </View>
          <Button
            backgroundColor={'$green'}
            gap={'$0'}
            paddingHorizontal={'$2'}
            onPress={() => {
              dateSheetRef.current?.close();
              setDateFilter('Custom');
            }}>
            Apply
          </Button>
        </View>
      </BottomSheetWrapper>
    </>
  );
}
