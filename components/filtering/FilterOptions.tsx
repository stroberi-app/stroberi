import React from 'react';
import { Text } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { LinkButton } from '../button/LinkButton';

type FilterOptionProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  icon?: string;
};

const FilterOption = ({ label, isSelected, onPress, icon }: FilterOptionProps) => (
  <LinkButton
    paddingHorizontal={'$4'}
    onPress={onPress}
    backgroundColor={isSelected ? '$green' : '$background075'}>
    <Text>
      {label} {icon}
    </Text>
    {isSelected && <Check size={12} color={'white'} />}
  </LinkButton>
);

export default FilterOption;
