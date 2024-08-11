import { Text, View } from 'tamagui';
import * as React from 'react';
import { Check } from '@tamagui/lucide-icons';

type CurrencyItemProps = {
  name: string;
  code: string;
  selected?: boolean;
};
export const CurrencyItem = ({ name, code, selected }: CurrencyItemProps) => {
  return (
    <View
      backgroundColor={'transparent'}
      flexDirection={'row'}
      paddingVertical={'$3'}
      paddingHorizontal={'$4'}
      gap={'$4'}
      borderWidth={'$0.5'}
      borderColor={'$borderColor'}
      borderRadius={'$0'}>
      <View flexDirection={'column'}>
        <Text fontSize={'$5'} fontWeight={'bold'}>
          {name}
        </Text>
      </View>
      <View marginLeft={'auto'} alignItems={'flex-end'} flexDirection={'row'} gap={'$3'}>
        {selected && <Check size={20} />}
        <Text fontSize={'$5'}>{code}</Text>
      </View>
    </View>
  );
};
