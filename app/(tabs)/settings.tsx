import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Text, View, YGroup } from 'tamagui';
import { DollarSign, FolderInput, FolderOutput, Tags } from '@tamagui/lucide-icons';
import * as React from 'react';
import { SettingsItem } from '../../components/settings/SettingsItem';
import { ManageCategoriesSheet } from '../../components/sheet/ManageCategoriesSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { CurrencySelect } from '../../components/CurrencySelect';
import { ExportCSVSheet } from '../../components/sheet/ExportCSVSheet';
import { ImportCSVSheet } from '../../components/sheet/ImportCSVSheet';

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const manageCategoriesSheetRef = React.useRef<BottomSheetModal | null>(null);
  const currencySheetRef = React.useRef<BottomSheetModal | null>(null);
  const exportCsvSheetRef = React.useRef<BottomSheetModal | null>(null);
  const importCsvSheetRef = React.useRef<BottomSheetModal | null>(null);
  const { setDefaultCurrency, defaultCurrency } = useDefaultCurrency();
  return (
    <>
      <ScrollView
        style={{ paddingTop: top }}
        backgroundColor={'$bgPrimary'}
        paddingHorizontal={'$2'}>
        <Text fontSize={'$9'} fontWeight={'bold'} marginBottom={'$4'}>
          Settings
        </Text>

        <Text fontSize={'$7'} marginBottom={'$2'}>
          General
        </Text>
        <YGroup>
          <SettingsItem
            label={'Default Currency'}
            IconComponent={DollarSign}
            rightLabel={defaultCurrency ?? 'Select'}
            onPress={() => {
              currencySheetRef.current?.present();
            }}
          />
          <SettingsItem
            label={'Manage Categories'}
            IconComponent={Tags}
            rightLabel={''}
            onPress={() => {
              manageCategoriesSheetRef.current?.present();
            }}
          />
        </YGroup>

        <Text fontSize={'$7'} marginTop="$4" marginBottom={'$2'}>
          Data
        </Text>
        <YGroup>
          <SettingsItem
            label={'CSV Export'}
            IconComponent={FolderOutput}
            rightLabel={''}
            onPress={() => {
              exportCsvSheetRef.current?.present();
            }}
          />
          <SettingsItem
            label={'CSV Import'}
            IconComponent={FolderInput}
            rightLabel={''}
            onPress={() => {
              importCsvSheetRef.current?.present();
            }}
          />
        </YGroup>
        <Text fontSize={'$7'} marginTop="$4" marginBottom={'$2'}>
          Legal
        </Text>
        <YGroup>
          <SettingsItem label={'Privacy Policy'} />
          <SettingsItem label={'Terms of Service'} />
        </YGroup>
        <View height={140} />
      </ScrollView>
      <ManageCategoriesSheet sheetRef={manageCategoriesSheetRef} noSearch swipeable />
      <CurrencySelect
        sheetRef={currencySheetRef}
        onSelect={currency => {
          setDefaultCurrency(currency.code);
          currencySheetRef.current?.close();
        }}
        selectedCurrency={defaultCurrency ?? 'USD'}
      />
      <ExportCSVSheet sheetRef={exportCsvSheetRef} />
      <ImportCSVSheet sheetRef={importCsvSheetRef} />
    </>
  );
}
