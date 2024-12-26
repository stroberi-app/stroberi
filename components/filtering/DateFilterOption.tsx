import React from 'react';
import { Text } from 'tamagui';

import { Check } from '@tamagui/lucide-icons';
import { LinkButton } from '../button/LinkButton';

type DateFilterOptionProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
};

const DateFilterOption = ({ label, isSelected, onPress }: DateFilterOptionProps) => (
  <LinkButton
    paddingHorizontal="$4"
    onPress={onPress}
    backgroundColor={isSelected ? '$green' : '$background075'}>
    <Text>{label}</Text>
    {isSelected && <Check size={12} color="white" />}
  </LinkButton>
);

export default DateFilterOption;
