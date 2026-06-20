import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';
import { useSavingsRateTarget } from '../../hooks/useSavingsRateTarget';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { backgroundStyle, handleIndicatorStyle } from './constants';

type SavingsRateTargetSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
};

const clampTarget = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export const SavingsRateTargetSheet = ({ sheetRef }: SavingsRateTargetSheetProps) => {
  const { bottom } = useSafeAreaInsets();
  const { savingsRateTarget, setSavingsRateTarget } = useSavingsRateTarget();
  const [draft, setDraft] = useState(String(savingsRateTarget));

  useEffect(() => {
    setDraft(String(savingsRateTarget));
  }, [savingsRateTarget]);

  const handleSave = async () => {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed) ? clampTarget(parsed) : savingsRateTarget;
    await setSavingsRateTarget(next);
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['40%']}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
      backdropComponent={CustomBackdrop}
    >
      <BottomSheetView>
        <View padding="$4" paddingBottom={bottom + 16} gap="$4">
          <Text fontSize="$6" fontWeight="bold" color="white">
            Savings rate target
          </Text>
          <Text fontSize="$3" color="$gray10">
            Set the percentage of income you want to save each month.
          </Text>
          <View
            flexDirection="row"
            alignItems="center"
            gap="$2"
            backgroundColor="$gray3"
            borderRadius="$3"
            paddingHorizontal="$4"
            paddingVertical="$3"
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="20"
              placeholderTextColor="#888"
              style={{ color: 'white', fontSize: 28, fontWeight: 'bold', flex: 1 }}
            />
            <Text fontSize="$8" fontWeight="bold" color="white">
              %
            </Text>
          </View>
          <Button onPress={handleSave}>Save</Button>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
