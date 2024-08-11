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

dayjs.extend(isToday);
dayjs.extend(isYesterday);

export default function TransactionsScreen() {
  const { top } = useSafeAreaInsets();

  const database = useDatabase();
  return (
    <ScrollView style={{ paddingTop: top }} backgroundColor={'$bgPrimary'} paddingHorizontal={'$2'}>
      <View flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Text fontSize={'$9'} fontWeight={'bold'} marginBottom={'$2'}>
          Transactions
        </Text>
        <LinkButton paddingHorizontal={'$2'}>
          <Filter size={'$1'} color={'$stroberi'} />
        </LinkButton>
      </View>
      <TransactionsList database={database} />
      <View height={140} />
    </ScrollView>
  );
}
