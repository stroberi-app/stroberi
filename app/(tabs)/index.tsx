import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ScrollView, Text, View } from 'tamagui';
import { PlusCircle } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Carousel } from '../../components/carousel/Carousel';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { HomeTransactionsSection } from '../../components/HomeTransactionsSection';
import { SpendByType } from '../../components/charts/SpendByTypeChart';
import { SpendByCategory } from '../../components/charts/SpendByCategoryChart';
import { useCallback, useState } from 'react';
import { SpendOverview } from '../../components/SpendOverview';
import dayjs from 'dayjs';
import { DatePicker } from '../../components/DatePicker';
import BottomSheetWrapper from '../../components/filtering/BottomSheetWrapper';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

export default function TabTwoScreen() {
  const { top } = useSafeAreaInsets();
  const dateSheetRef = React.useRef<BottomSheetModal | null>(null);
  const [fromDate, setFromDate] = useState(dayjs().startOf('month'));
  const [toDate, setToDate] = useState(dayjs().endOf('month'));
  const [tempFromDate, setTempFromDate] = useState(fromDate);
  const [tempToDate, setTempToDate] = useState(toDate);
  const database = useDatabase();

  const renderCarouselItem = useCallback(
    ({ index }: { index: number }) => {
      if (index === 0) {
        return (
          <SpendOverview
            database={database}
            fromDate={fromDate}
            toDate={toDate}
            onDatePress={() => {
              dateSheetRef.current?.present();
            }}
          />
        );
      }
      if (index === 1) {
        return <SpendByType database={database} type={'expense'} />;
      }
      if (index === 2) {
        return <SpendByType database={database} type={'income'} />;
      }
      if (index === 3) {
        return <SpendByCategory database={database} />;
      }

      return <View />;
    },
    [database, fromDate, toDate]
  );

  const router = useRouter();
  return (
    <>
      <View style={{ paddingTop: top }} backgroundColor={'$bgPrimary'} paddingHorizontal={'$2'}>
        <HomeTransactionsSection
          database={database}
          header={
            <>
              <Text fontSize={'$9'} fontWeight={'bold'} marginBottom={'$2'}>
                Overview
              </Text>
              <Carousel renderItem={renderCarouselItem} data={[...new Array(4).keys()]} />
              <View flexDirection={'row'} gap={'$2'} marginTop={'$4'} width={'100%'}>
                <Button
                  gap={'$0'}
                  paddingHorizontal={'$2'}
                  flex={1}
                  color={'$stroberi'}
                  onPress={() => {
                    router.push({
                      pathname: '/create-transaction',
                      params: {
                        transactionType: 'expense',
                      },
                    });
                  }}>
                  <PlusCircle color={'$stroberi'} size={16} /> Expense
                </Button>
                <Button
                  flex={1}
                  color={'$green'}
                  gap={'$0'}
                  paddingHorizontal={'$2'}
                  onPress={() => {
                    router.push({
                      pathname: '/create-transaction',
                      params: {
                        transactionType: 'income',
                      },
                    });
                  }}>
                  <PlusCircle color={'$green'} size={16} /> Income
                </Button>
              </View>
              <Text fontSize={'$9'} fontWeight={'bold'} marginTop={'$4'} marginBottom={'$2'}>
                Recent Transactions
              </Text>
            </>
          }
        />
      </View>
      <BottomSheetWrapper sheetRef={dateSheetRef}>
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
      </BottomSheetWrapper>
    </>
  );
}
