import { SplashScreen, Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import '../tamagui-web.css';

import config from '../tamagui.config';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { database } from '../database';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { useDefaultCurrency } from '../hooks/useDefaultCurrency';
import { CategoryModel } from '../database/category-model';
import { DEFAULT_CATEGORIES } from '../data/defaultCategories';

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

export default function RootLayout() {
  const [interLoaded, interError] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  });

  useDefaultCurrency();

  useEffect(() => {
    if (interLoaded || interError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync();
    }
  }, [interLoaded, interError]);

  useEffect(() => {
    (async () => {
      const categories = await database.collections
        .get<CategoryModel>('categories')
        .query()
        .fetch();
      if (categories.length === 0) {
        await database.write(async () => {
          for (const category of DEFAULT_CATEGORIES) {
            await database.collections.get<CategoryModel>('categories').create(newCategory => {
              newCategory.name = category.name;
              newCategory.icon = category.icon;
            });
          }
        });
      }
    })();
  }, []);

  if (!interLoaded && !interError) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <GestureHandlerRootView style={style}>
      <KeyboardProvider>
        <TamaguiProvider config={config} defaultTheme={'dark'}>
          <DatabaseProvider database={database}>
            <BottomSheetModalProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={tabsOptions} />
                <Stack.Screen name="create-transaction" options={options} />
              </Stack>
            </BottomSheetModalProvider>
          </DatabaseProvider>
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