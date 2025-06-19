import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Text, View, YGroup } from 'tamagui';
import { DollarSign, FolderInput, FolderOutput, Tags } from '@tamagui/lucide-icons';
import * as React from 'react';
import { SettingsItem } from '../../components/settings/SettingsItem';
import { ManageCategoriesSheet } from '../../components/sheet/ManageCategoriesSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { CurrencySelect } from '../../components/CurrencySelect';
import { ExportDataSheet } from '../../components/sheet/ExportDataSheet';
import {
  TransactionPreviewSheet,
  TransactionPreviewSheetRef,
} from '../../components/sheet/TransactionPreviewSheet';
import { ImportCSVSheet } from '../../components/sheet/ImportCSVSheet';
import { useRouter } from 'expo-router';
import { ExportDateRange } from '../../hooks/useTransactionExport';

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const manageCategoriesSheetRef = React.useRef<BottomSheetModal | null>(null);
  const currencySheetRef = React.useRef<BottomSheetModal | null>(null);
  const exportDataSheetRef = React.useRef<BottomSheetModal | null>(null);
  const transactionPreviewSheetRef = React.useRef<TransactionPreviewSheetRef | null>(null);
  const importCsvSheetRef = React.useRef<BottomSheetModal | null>(null);
  const { setDefaultCurrency, defaultCurrency } = useDefaultCurrency();

  const router = useRouter();

  const handleViewTransactions = (dateRange: ExportDateRange) => {
    exportDataSheetRef.current?.dismiss();
    transactionPreviewSheetRef.current?.present(dateRange);
  };

  const handleBackToExport = () => {
    transactionPreviewSheetRef.current?.dismiss();
    exportDataSheetRef.current?.present();
  };

  return (
    <>
      <ScrollView
        style={{ paddingTop: top || 8 }}
        backgroundColor={'$bgPrimary'}
        paddingHorizontal={'$2'}>
        <Text fontSize={'$8'} fontWeight={'bold'} marginBottom={'$4'}>
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
              exportDataSheetRef.current?.present();
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
          <SettingsItem
            label="Privacy Policy"
            onPress={() => {
              router.push({
                pathname: '/webview',
                params: { url: `${BASE_WEBSITE_URL}/privacy-policy` },
              });
            }}
          />
          <SettingsItem
            label="Terms and Conditions"
            onPress={() => {
              router.push({
                pathname: '/webview',
                params: {
                  url: `${BASE_WEBSITE_URL}/terms-and-conditions`,
                },
              });
            }}
          />
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
      <ExportDataSheet sheetRef={exportDataSheetRef} onViewTransactions={handleViewTransactions} />
      <TransactionPreviewSheet ref={transactionPreviewSheetRef} onBack={handleBackToExport} />
      <ImportCSVSheet sheetRef={importCsvSheetRef} />
    </>
  );
}

const BASE_WEBSITE_URL = 'https://stroberi.app';
