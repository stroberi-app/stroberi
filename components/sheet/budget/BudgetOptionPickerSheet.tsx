import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type React from 'react';
import { Text, View, YGroup } from 'tamagui';
import { LinkButton } from '../../button/LinkButton';
import { CustomBackdrop } from '../../CustomBackdrop';
import { backgroundStyle, handleIndicatorStyle } from '../constants';

type Option<T> = { value: T; label: string };

type BudgetOptionPickerSheetProps<T> = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  title: string;
  options: Option<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
};

/**
 * Simple single-select picker rendered in a stacked bottom sheet. Backs the
 * budget period and alert-threshold pickers.
 */
export const BudgetOptionPickerSheet = <T extends string | number>({
  sheetRef,
  title,
  options,
  selectedValue,
  onSelect,
}: BudgetOptionPickerSheetProps<T>) => (
  <BottomSheetModal
    ref={sheetRef}
    snapPoints={['40%']}
    enableDynamicSizing={false}
    enablePanDownToClose={true}
    handleIndicatorStyle={handleIndicatorStyle}
    backdropComponent={CustomBackdrop}
    backgroundStyle={backgroundStyle}
    stackBehavior="push"
  >
    <BottomSheetView>
      <View paddingHorizontal="$4" paddingVertical="$2">
        <Text fontSize="$6" fontWeight="bold" marginBottom="$3">
          {title}
        </Text>
        <YGroup gap="$2">
          {options.map((option) => (
            <YGroup.Item key={option.value}>
              <LinkButton
                width="100%"
                justifyContent="flex-start"
                backgroundColor={
                  selectedValue === option.value ? '$gray4' : 'transparent'
                }
                onPress={() => onSelect(option.value)}
              >
                <Text fontSize="$4">{option.label}</Text>
              </LinkButton>
            </YGroup.Item>
          ))}
        </YGroup>
      </View>
    </BottomSheetView>
  </BottomSheetModal>
);
