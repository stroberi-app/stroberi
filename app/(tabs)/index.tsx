import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, View } from 'tamagui';
import { PlusCircle } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Carousel } from '../../components/carousel/Carousel';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { HomeTransactionsSection } from '../../components/HomeTransactionsSection';
import { SpendByType } from '../../components/charts/SpendByTypeChart';
import SpendByCategory from '../../components/charts/SpendByCategoryChart';
import { useCallback, useMemo } from 'react';
import SpendOverview from '../../components/SpendOverview';

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

  const router = useRouter();

  const carouselData = useMemo(() => {
    return carouselItems.map((_, i) => i);
  }, []);

  return (
    <>
      <View
        style={{ paddingTop: top, flex: 1 }}
        backgroundColor="$bgPrimary"
        paddingHorizontal="$2">
        <HomeTransactionsSection
          database={database}
          header={
            <>
              <Text fontSize="$8" fontWeight="bold" marginBottom="$2">
                Overview
              </Text>
              <Carousel renderItem={renderCarouselItem} data={carouselData} />
              <View flexDirection="row" gap="$2" marginTop="$4" width="100%">
                <Button
                  gap="$0"
                  paddingHorizontal="$2"
                  flex={1}
                  color="$stroberi"
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
                  color="$green"
                  gap="$0"
                  paddingHorizontal="$2"
                  onPress={() => {
                    router.push({
                      pathname: '/create-transaction',
                      params: {
                        transactionType: 'income',
                      },
                    });
                  }}>
                  <PlusCircle color="$green" size={16} /> Income
                </Button>
              </View>
            </>
          }
        />
      </View>
    </>
  );
}
