import { Check } from '@tamagui/lucide-icons';
import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import { Text, View } from 'tamagui';

type CategoryRowProps = {
  name: string;
  icon: string;
  selected?: boolean;
  onPress?: () => void;
  right?: ReactNode;
};

export const CategoryRow = ({ name, icon, selected, onPress, right }: CategoryRowProps) => {
  const content = (
    <View
      flexDirection="row"
      alignItems="center"
      gap="$3"
      paddingVertical="$3"
      paddingHorizontal="$3"
      borderRadius="$6"
      backgroundColor={selected ? '$gray4' : '$gray3'}
      borderWidth={selected ? 1.5 : 0}
      borderColor="$green"
    >
      <View
        width={40}
        height={40}
        borderRadius={20}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$gray5"
      >
        <Text fontSize="$6">{icon}</Text>
      </View>
      <Text flex={1} fontSize="$5" fontWeight="600" color="white" numberOfLines={1}>
        {name}
      </Text>
      {selected && <Check size={20} color="$green" />}
      {right}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
};
