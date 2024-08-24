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
import { useCallback } from 'react';

export default function TabTwoScreen() {
  const { top } = useSafeAreaInsets();
  const database = useDatabase();
  const renderCarouselItem = useCallback(
    ({ index }: { index: number }) => {
      if (index === 0) {
        return <SpendByType database={database} type={'expense'} />;
      }
      if (index === 1) {
        return <SpendByType database={database} type={'income'} />;
      }
      if (index === 2) {
        return <SpendByCategory database={database} />;
      }

      return <View />;
    },
    [database]
  );

  const router = useRouter();
  return (
    <ScrollView style={{ paddingTop: top }} backgroundColor={'$bgPrimary'} paddingHorizontal={'$2'}>
      {/*<View justifyContent={'space-between'} flexDirection={'row'}>*/}
      {/*  <LinkButton>Jun 2024</LinkButton>*/}
      {/*  <LinkButton paddingHorizontal={'$2'}>*/}
      {/*    <MoreHorizontal size={'$1'} color={'$stroberi'} />*/}
      {/*  </LinkButton>*/}
      {/*</View>*/}
      <Text fontSize={'$9'} fontWeight={'bold'} marginBottom={'$2'}>
        Overview
      </Text>
      <Carousel renderItem={renderCarouselItem} data={[...new Array(3).keys()]} />
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
        {/*<Button*/}
        {/*  gap={'$0'}*/}
        {/*  paddingHorizontal={'$2'}*/}
        {/*  flex={1}*/}
        {/*  onPress={() => {*/}
        {/*    router.push('/create-transaction');*/}
        {/*  }}>*/}
        {/*  <ScanText size={16} /> Receipt*/}
        {/*</Button>*/}
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
      <HomeTransactionsSection database={database} />
      <View height={140} />
    </ScrollView>
  );
}
