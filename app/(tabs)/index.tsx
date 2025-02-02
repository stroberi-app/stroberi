import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';
import { Carousel } from '../../components/carousel/Carousel';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { HomeTransactionsSection } from '../../components/home/HomeTransactionsSection';
import { SpendByType } from '../../components/charts/SpendByTypeChart';
import SpendByCategory from '../../components/charts/SpendByCategoryChart';
import { useCallback, useMemo } from 'react';
import SpendOverview from '../../components/home/SpendOverview';
import { CreateFirstTransactionSection } from '../../components/CreateFirstTransactionSection';
import { CreateTransactionButtons } from '../../components/CreateTransactionButtons';

export default function HomeScreen() {
  const { top } = useSafeAreaInsets();
  const database = useDatabase();

  const carouselItems = useMemo(
    () => [
      <SpendOverview database={database} key="overview" />,
      <SpendByType database={database} type="expense" key="expense" />,
      <SpendByType database={database} type="income" key="income" />,
      <SpendByCategory database={database} key="spend_by_category" />,
    ],
    []
  );
  const renderCarouselItem = useCallback(({ index }: { index: number }) => {
    const item = carouselItems[index];
    if (item) {
      return item;
    }

    return <View />;
  }, []);

  const carouselData = useMemo(() => {
    return carouselItems.map((_, i) => i);
  }, []);

  return (
    <>
      <View
        style={{ paddingTop: top || 8, flex: 1 }}
        backgroundColor="$bgPrimary"
        paddingHorizontal="$2">
        <HomeTransactionsSection
          database={database}
          header={transactionCount => (
            <>
              <Text fontSize="$8" fontWeight="bold" marginBottom="$2">
                Overview
              </Text>
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
