import { PlusCircle } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Button } from './button/Button';

export const CreateTransactionButtons = () => {
  const router = useRouter();
  const handleTransactionNavigation = (type: 'expense' | 'income') => {
    router.push({ pathname: '/create-transaction', params: { transactionType: type } });
  };
  return (
    <>
      <Button
        gap="$0"
        paddingHorizontal="$2"
        flex={1}
        color="$stroberi"
        onPress={() => {
          handleTransactionNavigation('expense');
        }}
      >
        <PlusCircle color="$stroberi" size={16} strokeWidth={3} /> Expense
      </Button>
      <Button
        flex={1}
        color="$green"
        gap="$0"
        paddingHorizontal="$2"
        onPress={() => {
          handleTransactionNavigation('income');
        }}
      >
        <PlusCircle color="$green" size={16} strokeWidth={3} /> Income
      </Button>
    </>
  );
};
