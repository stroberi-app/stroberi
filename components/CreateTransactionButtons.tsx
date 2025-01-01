import { useRouter } from 'expo-router';
import { Button } from './button/Button';
import { PlusCircle } from '@tamagui/lucide-icons';
import * as React from 'react';

export const CreateTransactionButtons = () => {
  const router = useRouter();
  return (
    <>
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
        <PlusCircle color="$stroberi" size={16} strokeWidth={3} /> Expense
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
        <PlusCircle color="$green" size={16} strokeWidth={3} /> Income
      </Button>
    </>
  );
};
