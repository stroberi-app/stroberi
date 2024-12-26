import { Checkbox, Label, XStack } from 'tamagui';
import { Check as CheckIcon } from '@tamagui/lucide-icons';
import React from 'react';

type CheckboxWithLabelProps = React.ComponentProps<typeof Checkbox> & {
  label: string;
  name: string;
};
export function CheckboxWithLabel({ size, name, label, ...checkboxProps }: CheckboxWithLabelProps) {
  return (
    <XStack alignItems="center" gap="$3">
      <Checkbox id={name} size={size} {...checkboxProps}>
        <Checkbox.Indicator>
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox>
      <Label size={size} htmlFor={name}>
        {label}
      </Label>
    </XStack>
  );
}
