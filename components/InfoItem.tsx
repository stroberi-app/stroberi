import { Text, View, YGroup } from 'tamagui';
import * as React from 'react';

export const InfoItem = ({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color?: string;
}) => {
  return (
    <YGroup.Item>
      <View gap={'$1'}>
        <Text fontSize={'$2'}>{title}</Text>
        <Text fontSize={'$5'} fontWeight={'bold'} color={color}>
          {value}
        </Text>
      </View>
    </YGroup.Item>
  );
};
