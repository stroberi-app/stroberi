import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { TamaguiProvider } from 'tamagui';
import '../tamagui-web.css';

import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { database } from '../database';
import { useDefaultCurrency } from '../hooks/useDefaultCurrency';
import { useRecurringTransactions } from '../hooks/useRecurringTransactions';
import { useSeedCategories } from '../hooks/useSeedCategories';
import config from '../tamagui.config';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});
export default function RootLayout() {
  const [interLoaded, interError] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  });

  useEffect(() => {
    if (interLoaded || interError) {
      SplashScreen.hideAsync();
    }
  }, [interLoaded, interError]);

  useDefaultCurrency();
  useSeedCategories();
  useRecurringTransactions();

  if (!interLoaded && !interError) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <GestureHandlerRootView style={style}>
      <KeyboardProvider>
        <TamaguiProvider config={config} defaultTheme="dark">
          <ActionSheetProvider>
            <DatabaseProvider database={database}>
              <BottomSheetModalProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={tabsOptions} />
                  <Stack.Screen name="create-transaction" options={options} />
                </Stack>
              </BottomSheetModalProvider>
            </DatabaseProvider>
          </ActionSheetProvider>
        </TamaguiProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const style = { flex: 1 };

const options = {
  presentation: 'modal',
  header: () => null,
} as const;

const tabsOptions = {
  headerShown: false,
};
