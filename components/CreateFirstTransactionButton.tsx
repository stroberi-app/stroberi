import { Text, View, YStack } from 'tamagui';
import { Button } from './button/Button';
import { PlusCircle } from '@tamagui/lucide-icons';
import * as React from 'react';
import { useRouter } from 'expo-router';

type CreateFirstTransactionButton = React.ComponentProps<typeof YStack>;
export const CreateFirstTransactionButton = ({ ...rest }: CreateFirstTransactionButton) => {
  const router = useRouter();
  return (
    <YStack alignItems="center" justifyContent="center" p="$4" {...rest}>
      <Text color="white" fontWeight="bold" fontSize="$5">
        Add your first transaction
      </Text>
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
          <PlusCircle color="$stroberi" size={16} /> Expense
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
    </YStack>
  );
};
