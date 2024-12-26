import * as React from 'react';
import { Text, View, YGroup } from 'tamagui';
import { ArrowRight } from '@tamagui/lucide-icons';
import { TouchableOpacity } from 'react-native';

type SettingsItemProps = {
  label: string;
  IconComponent?: React.ElementType;
  rightLabel?: string;
  onPress?: () => void;
};

export const SettingsItem = ({ label, IconComponent, rightLabel, onPress }: SettingsItemProps) => {
  const Component = onPress ? TouchableOpacity : View;
  return (
    <YGroup.Item>
      <View backgroundColor="$gray1" gap="$4" borderWidth={1} borderColor="$borderColor">
        <Component onPress={onPress}>
          <View
            paddingVertical="$2.5"
            paddingHorizontal="$4"
            gap="$4"
            flexDirection="row"
            width="100%"
            justifyContent="space-between"
            alignItems="center">
            <View flexDirection="row" alignItems="center" gap="$2">
              {IconComponent && <IconComponent size={18} />}
              <Text fontSize="$5">{label}</Text>
            </View>
            <View flexDirection="row" alignItems="center" gap="$2">
              <Text fontSize="$5">{rightLabel}</Text>
              <ArrowRight size={18} color="$gray9" />
            </View>
          </View>
        </Component>
      </View>
    </YGroup.Item>
  );
};
