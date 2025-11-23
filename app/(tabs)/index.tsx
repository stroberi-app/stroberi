import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useScrollToTop } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef } from 'react';
import type Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';
import { CreateFirstTransactionSection } from '../../components/CreateFirstTransactionSection';
import { CreateTransactionButtons } from '../../components/CreateTransactionButtons';
import { Carousel } from '../../components/carousel/Carousel';
import SpendByCategory from '../../components/charts/SpendByCategoryChart';
import { SpendByType } from '../../components/charts/SpendByTypeChart';
import SpendingTrends from '../../components/charts/SpendingTrendsChart';
import BudgetAlertCard from '../../components/home/BudgetAlertCard';
import { HomeTransactionsSection } from '../../components/home/HomeTransactionsSection';
import SpendOverview from '../../components/home/SpendOverview';
import type { TransactionModel } from '../../database/transaction-model';

export default function HomeScreen() {
  const { top } = useSafeAreaInsets();
  const database = useDatabase();
  const scrollRef = useRef<Reanimated.FlatList<TransactionModel>>(null);

  useScrollToTop(scrollRef);

  const carouselItems = useMemo(
    () => [
      <SpendOverview database={database} key="overview" />,
      <SpendByType database={database} type="expense" key="expense" />,
      <SpendByType database={database} type="income" key="income" />,
      <SpendByCategory database={database} key="spend_by_category" />,
      <SpendingTrends database={database} key="spending_trends" />,
    ],
    [database]
  );
  const renderCarouselItem = useCallback(
    ({ index }: { index: number }) => {
      const item = carouselItems[index];
      if (item) {
        return item;
      }

      return <View />;
    },
    [carouselItems]
  );

  const carouselData = useMemo(() => {
    return carouselItems.map((_, i) => i);
  }, [carouselItems]);

  return (
    <>
      <View
        paddingTop={top || '$2'}
        flex={1}
        backgroundColor="$bgPrimary"
        paddingHorizontal="$2"
      >
        <HomeTransactionsSection
          database={database}
          scrollRef={scrollRef}
          header={(transactionCount) => (
            <>
              <Text fontSize="$8" fontWeight="bold" marginBottom="$2">
                Overview
              </Text>
              <BudgetAlertCard database={database} />
              <Carousel renderItem={renderCarouselItem} data={carouselData} />
              {transactionCount > 0 ? (
                <View flexDirection="row" gap="$2" marginTop="$4" width="100%">
                  <CreateTransactionButtons />
                </View>
              ) : (
                <CreateFirstTransactionSection />
              )}
            </>
          )}
        />
      </View>
    </>
  );
}
