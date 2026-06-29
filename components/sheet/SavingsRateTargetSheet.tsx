import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';
import { useSavingsRateEnabled } from '../../hooks/useSavingsRateEnabled';
import { useSavingsRateTarget } from '../../hooks/useSavingsRateTarget';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { Switch } from '../Switch';
import { backgroundStyle, handleIndicatorStyle } from './constants';

type SavingsRateTargetSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
};

const clampTarget = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export const SavingsRateTargetSheet = ({ sheetRef }: SavingsRateTargetSheetProps) => {
  const { bottom } = useSafeAreaInsets();
  const { savingsRateTarget, setSavingsRateTarget } = useSavingsRateTarget();
  const { savingsRateEnabled, setSavingsRateEnabled } = useSavingsRateEnabled();
  const [draft, setDraft] = useState(String(savingsRateTarget));
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);

  useEffect(() => {
    setDraft(String(savingsRateTarget));
  }, [savingsRateTarget]);

  const handleSave = async () => {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed) ? clampTarget(parsed) : savingsRateTarget;
    await setSavingsRateTarget(next);
    sheetRef.current?.dismiss();
  };

  const handleSavingsRateToggle = async (next: boolean) => {
    if (isTogglingEnabled) return;
    setIsTogglingEnabled(true);
    try {
      await setSavingsRateEnabled(next);
    } finally {
      setIsTogglingEnabled(false);
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['45%']}
      enableDynamicSizing={false}
      enablePanDownToClose={true}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
      backdropComponent={CustomBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView>
        <View padding="$4" paddingBottom={bottom + 16} gap="$4">
          <Text fontSize="$6" fontWeight="bold" color="white">
            Savings rate target
          </Text>

          <View
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            gap="$3"
            backgroundColor="$gray3"
            borderRadius="$3"
            paddingHorizontal="$4"
            paddingVertical="$3"
          >
            <View flex={1}>
              <Text fontSize="$4" fontWeight="500" color="white">
                Track savings rate
              </Text>
              <Text fontSize="$2" color="$gray10" marginTop="$1">
                Show the savings rate card in Analytics.
              </Text>
            </View>
            <Switch
              checked={savingsRateEnabled}
              onCheckedChange={handleSavingsRateToggle}
            >
              <Switch.Thumb />
            </Switch>
          </View>

          {savingsRateEnabled && (
            <>
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
                <BottomSheetTextInput
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
            </>
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
