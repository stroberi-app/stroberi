import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  DollarSign,
  FolderInput,
  FolderOutput,
  Plane,
  RefreshCw,
  Tags,
  TrendingUp,
  Wallet,
} from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Text, View, YGroup } from 'tamagui';
import { CurrencySelect } from '../../components/CurrencySelect';
import { Switch } from '../../components/Switch';
import { SettingsItem } from '../../components/settings/SettingsItem';
import { ExportDataSheet } from '../../components/sheet/ExportDataSheet';
import { ImportCSVSheet } from '../../components/sheet/ImportCSVSheet';
import { ManageCategoriesSheet } from '../../components/sheet/ManageCategoriesSheet';
import { ManageRecurringTransactionsSheet } from '../../components/sheet/ManageRecurringTransactionsSheet';
import {
  TransactionPreviewSheet,
  type TransactionPreviewSheetRef,
} from '../../components/sheet/TransactionPreviewSheet';
import { useBudgetingEnabled } from '../../hooks/useBudgetingEnabled';
import { useTripsEnabled } from '../../hooks/useTripsEnabled';
import { useAdvancedAnalyticsEnabled } from '../../hooks/useAdvancedAnalyticsEnabled';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import type { ExportDateRange } from '../../hooks/useTransactionExport';

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const manageCategoriesSheetRef = React.useRef<BottomSheetModal | null>(null);
  const manageRecurringSheetRef = React.useRef<BottomSheetModal | null>(null);
  const currencySheetRef = React.useRef<BottomSheetModal | null>(null);
  const exportDataSheetRef = React.useRef<BottomSheetModal | null>(null);
  const transactionPreviewSheetRef = React.useRef<TransactionPreviewSheetRef | null>(
    null
  );
  const importCsvSheetRef = React.useRef<BottomSheetModal | null>(null);
  const { setDefaultCurrency, defaultCurrency, isUpdatingCurrency } =
    useDefaultCurrency();
  const { budgetingEnabled, setBudgetingEnabled } = useBudgetingEnabled();
  const { tripsEnabled, setTripsEnabled } = useTripsEnabled();
  const { advancedAnalyticsEnabled, setAdvancedAnalyticsEnabled } =
    useAdvancedAnalyticsEnabled();
  const [isTogglingFeature, setIsTogglingFeature] = useState(false);

  const router = useRouter();

  const handleBudgetingToggle = async () => {
    if (isTogglingFeature) return;
    setIsTogglingFeature(true);
    try {
      await setBudgetingEnabled(!budgetingEnabled);
    } finally {
      setIsTogglingFeature(false);
    }
  };

  const handleTripsToggle = async () => {
    if (isTogglingFeature) return;
    setIsTogglingFeature(true);
    try {
      await setTripsEnabled(!tripsEnabled);
    } finally {
      setIsTogglingFeature(false);
    }
  };

  const handleAnalyticsToggle = async () => {
    if (isTogglingFeature) return;
    setIsTogglingFeature(true);
    try {
      await setAdvancedAnalyticsEnabled(!advancedAnalyticsEnabled);
    } finally {
      setIsTogglingFeature(false);
    }
  };

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
        paddingTop={top || '$2'}
        backgroundColor={'$bgPrimary'}
        paddingHorizontal={'$2'}
      >
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
            isLoading={isUpdatingCurrency}
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
          <SettingsItem
            label={'Recurring Transactions'}
            IconComponent={RefreshCw}
            rightLabel={''}
            onPress={() => {
              manageRecurringSheetRef.current?.present();
            }}
          />
        </YGroup>

        <View
          marginTop="$4"
          marginBottom="$2"
          padding="$3"
          borderRadius="$4"
          backgroundColor="$gray2"
          borderWidth={1}
          borderColor="$gray4"
        >
          <Text fontSize="$5" fontWeight="600" marginBottom="$2" color="$gray11">
            Features
          </Text>
          <YGroup>
            <YGroup.Item>
              <View
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                padding="$3"
                backgroundColor="$gray3"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$gray5"
              >
                <View flexDirection="row" alignItems="center" gap="$3" flex={1}>
                  <View
                    backgroundColor="$stroberi"
                    borderRadius="$2"
                    padding="$2"
                    width={32}
                    height={32}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Wallet size={18} color="white" />
                  </View>
                  <View flex={1}>
                    <Text fontSize="$4" fontWeight="500" color="white">
                      Enable Budgeting
                    </Text>
                    <Text fontSize="$2" color="$gray9">
                      Show budgets tab and features
                    </Text>
                  </View>
                </View>
                <Switch
                  checked={budgetingEnabled}
                  onCheckedChange={handleBudgetingToggle}
                >
                  <Switch.Thumb animation="bouncy" />
                </Switch>
              </View>
            </YGroup.Item>
            <YGroup.Item>
              <View
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                padding="$3"
                backgroundColor="$gray3"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$gray5"
              >
                <View flexDirection="row" alignItems="center" gap="$3" flex={1}>
                  <View
                    backgroundColor="$stroberi"
                    borderRadius="$2"
                    padding="$2"
                    width={32}
                    height={32}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Plane size={18} color="white" />
                  </View>
                  <View flex={1}>
                    <Text fontSize="$4" fontWeight="500" color="white">
                      Enable Trips
                    </Text>
                    <Text fontSize="$2" color="$gray9">
                      Track spending by trip
                    </Text>
                  </View>
                </View>
                <Switch checked={tripsEnabled} onCheckedChange={handleTripsToggle}>
                  <Switch.Thumb animation="bouncy" />
                </Switch>
              </View>
            </YGroup.Item>
            <YGroup.Item>
              <View
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                padding="$3"
                backgroundColor="$gray3"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$gray5"
              >
                <View flexDirection="row" alignItems="center" gap="$3" flex={1}>
                  <View
                    backgroundColor="$stroberi"
                    borderRadius="$2"
                    padding="$2"
                    width={32}
                    height={32}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <TrendingUp size={18} color="white" />
                  </View>
                  <View flex={1}>
                    <Text fontSize="$4" fontWeight="500" color="white">
                      Advanced Analytics
                    </Text>
                    <Text fontSize="$2" color="$gray9">
                      Deep financial insights & scores
                    </Text>
                  </View>
                </View>
                <Switch
                  checked={advancedAnalyticsEnabled}
                  onCheckedChange={handleAnalyticsToggle}
                >
                  <Switch.Thumb animation="bouncy" />
                </Switch>
              </View>
            </YGroup.Item>
          </YGroup>
        </View>

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
      <ManageRecurringTransactionsSheet sheetRef={manageRecurringSheetRef} />
      <CurrencySelect
        sheetRef={currencySheetRef}
        onSelect={(currency) => {
          if (isUpdatingCurrency) {
            return;
          }
          setDefaultCurrency(currency.code);
          currencySheetRef.current?.close();
        }}
        selectedCurrency={defaultCurrency ?? 'USD'}
      />
      <ExportDataSheet
        sheetRef={exportDataSheetRef}
        onViewTransactions={handleViewTransactions}
      />
      <TransactionPreviewSheet
        ref={transactionPreviewSheetRef}
        onBack={handleBackToExport}
      />
      <ImportCSVSheet sheetRef={importCsvSheetRef} />
    </>
  );
}

const BASE_WEBSITE_URL = 'https://stroberi.app';
