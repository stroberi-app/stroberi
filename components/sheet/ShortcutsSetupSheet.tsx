import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, NativeModules, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Text, View } from 'tamagui';
import { Button } from '../button/Button';
import { backgroundStyle, handleIndicatorStyle } from './constants';

const renderBoldText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} fontWeight="bold" color="$gray11">
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
};

type ShortcutsSetupSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
};

// Previews shown inline after the step they illustrate (0-indexed).
// IMG_3788: the finished automation (trigger + Log Transaction action).
// IMG_3789: Log Transaction action with Amount / Merchant variables mapped.
const STEP_PREVIEWS: Record<number, { source: number; caption: string }> = {
  5: {
    source: require('../../assets/images/ios_shortcute/IMG_3788-portrait.png'),
    caption: 'Your automation should look like this.',
  },
  7: {
    source: require('../../assets/images/ios_shortcute/IMG_3789-portrait.png'),
    caption: 'Amount and Merchant should be linked to the blue variables.',
  },
};

const STEPS = [
  'Open the **Shortcuts** app on your iPhone',
  'Go to the **Automation** tab',
  'Tap **+** then choose **Wallet**',
  'Pick your card(s) and tap **Next**',
  'Press **Create New Shortcut**',
  'Search for **"Log Transaction"** and select the Stroberi action',
  "Map **Amount** to the transaction's **Amount** variable (leave it formatted — Stroberi reads the currency from it)",
  'Map **Merchant** to the **Merchant** variable',
  'Confirm the shortcut on top right',
];

export const ShortcutsSetupSheet = ({ sheetRef }: ShortcutsSetupSheetProps) => {
  const { bottom } = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['90%'], []);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestPress = useCallback(async () => {
    if (isTesting) return;
    setIsTesting(true);
    try {
      const { ShortcutsModule } = NativeModules;
      if (!ShortcutsModule) {
        Alert.alert('Unavailable', 'Shortcuts module is not available on this device.');
        return;
      }
      await ShortcutsModule.testLogTransaction();
      Alert.alert('Success', 'Test transaction created! Check your transaction list.');
    } catch {
      Alert.alert('Error', 'Failed to create test transaction.');
    } finally {
      setIsTesting(false);
    }
  }, [isTesting]);

  const isIOS = Platform.OS === 'ios';
  const iosVersion = isIOS ? Number.parseInt(Platform.Version as string, 10) : 0;
  const supportsShortcuts = isIOS && iosVersion >= 16;

  if (!isIOS) {
    return null;
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      stackBehavior="push"
      animateOnMount
      handleIndicatorStyle={handleIndicatorStyle}
      backgroundStyle={backgroundStyle}
    >
      <BottomSheetScrollView
        style={{ paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: bottom + 16 }}
      >
        <Text fontSize="$7" fontWeight="bold" marginBottom="$2">
          Apple Pay Quick Add
        </Text>
        <Text fontSize="$4" color="$gray9" marginBottom="$5">
          Automatically log transactions after every Apple Pay purchase using iOS
          Shortcuts.
        </Text>

        {!supportsShortcuts && isIOS && (
          <View backgroundColor="$gray3" padding="$3" borderRadius="$3" marginBottom="$4">
            <Text fontSize="$4" color="$yellow10">
              This feature requires iOS 16 or later. Please update your device to use
              Shortcuts integration.
            </Text>
          </View>
        )}

        <Text fontSize="$5" fontWeight="600" marginBottom="$3">
          Setup Instructions
        </Text>

        {STEPS.map((step, index) => {
          return (
            <View key={index} marginBottom="$3">
              <View flexDirection="row" gap="$3" alignItems="center">
                <View
                  backgroundColor="$stroberi"
                  borderRadius={100}
                  width={24}
                  height={24}
                  justifyContent="center"
                  alignItems="center"
                  flexShrink={0}
                >
                  <Text fontSize="$3" fontWeight="bold" color="white">
                    {index + 1}
                  </Text>
                </View>
                <Text fontSize="$4" color="$gray11" flex={1}>
                  {renderBoldText(step)}
                </Text>
              </View>
            </View>
          );
        })}

        <View marginTop="$4">
          <Text fontSize="$3" fontWeight="600" color="$gray11">
            This is how it should look like in the end:
          </Text>
          <View flexDirection="row">
            <Image
              source={STEP_PREVIEWS[7].source}
              resizeMode="contain"
              style={{ width: '50%', height: 440, borderRadius: 12 }}
            />
            <Image
              source={STEP_PREVIEWS[5].source}
              resizeMode="contain"
              style={{ width: '50%', height: 440, borderRadius: 12 }}
            />
          </View>
        </View>

        {supportsShortcuts && (
          <View marginTop="$4">
            <Button brand="primary" onPress={handleTestPress} disabled={isTesting}>
              {isTesting ? <Spinner size="small" color="white" /> : 'Test It'}
            </Button>
            <Text fontSize="$2" color="$gray8" textAlign="center" marginTop="$2">
              Creates a test transaction you can delete from your transaction list.
            </Text>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};
