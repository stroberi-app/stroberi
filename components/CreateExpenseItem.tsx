import { Separator, Text, View, YGroup } from 'tamagui';
import React from 'react';

type CreateExpenseItemProps = {
  IconComponent: React.ElementType;
  label: string;
  children: React.ReactNode;
  bottom?: React.ReactNode;
};
export const CreateExpenseItem = ({
  IconComponent,
  label,
  children,
  bottom,
}: CreateExpenseItemProps) => {
  return (
    <YGroup.Item>
      <View backgroundColor={'$gray1'} paddingVertical={'$2.5'} paddingHorizontal={'$4'} gap={'$4'}>
        <View
          gap={'$4'}
          flexDirection={'row'}
          width={'100%'}
          justifyContent={'space-between'}
          alignItems={'center'}>
          <View flexDirection={'row'} alignItems={'center'} gap={'$2'}>
            <IconComponent size={20} />
            <Text fontSize={'$5'}>{label}</Text>
          </View>
          {children}
        </View>
        {bottom && (
          <>
            <Separator />
            {bottom}
          </>
        )}
      </View>
    </YGroup.Item>
  );
};
