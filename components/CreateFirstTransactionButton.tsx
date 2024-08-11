import { View, YStack } from 'tamagui';
import { Button } from './button/Button';
import { CarouselItemText } from './carousel/CarouselItemText';
import { PlusCircle } from '@tamagui/lucide-icons';
import * as React from 'react';
import { useRouter } from 'expo-router';

type CreateFirstTransactionButton = React.ComponentProps<typeof YStack>;
export const CreateFirstTransactionButton = ({ ...rest }: CreateFirstTransactionButton) => {
  const router = useRouter();
  return (
    <YStack alignItems={'center'} justifyContent={'center'} {...rest}>
      <Button
        height={'auto'}
        onPress={() => {
          router.push({
            pathname: '/create-transaction',
            params: {
              transactionType: 'expense',
            },
          });
        }}>
        <View alignItems={'center'} py={'$3'} gap={'$2'}>
          <CarouselItemText color={'white'}>Create your first transaction</CarouselItemText>
          <PlusCircle size={32} color={'white'} />
        </View>
      </Button>
    </YStack>
  );
};
