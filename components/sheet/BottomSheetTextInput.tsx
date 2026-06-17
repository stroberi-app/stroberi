import type React from 'react';
import { Input } from 'tamagui';

export const BottomSheetTextInput = Input as React.ComponentType<
  React.ComponentProps<typeof Input> & {
    flex?: number;
    gap?: string;
    width?: string;
  }
>;
