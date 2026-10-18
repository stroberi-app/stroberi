import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  DollarSign,
  FolderInput,
  FolderOutput,
  PiggyBank,
  Plane,
  RefreshCw,
  Smartphone,
  Tags,
  TrendingUp,
  Wallet,
} from '@tamagui/lucide-icons-2';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Text, View, YGroup } from 'tamagui';
import { CurrencySelect } from '../../components/CurrencySelect';
import { Switch } from '../../components/Switch';
import { SettingsItem } from '../../components/settings/SettingsItem';
import { ExportDataSheet } from '../../components/sheet/ExportDataSheet';
import { ImportCSVSheet } from '../../components/sheet/ImportCSVSheet';
import { ShortcutsSetupSheet } from '../../components/sheet/ShortcutsSetupSheet';
import { ManageRecurringTransactionsSheet } from '../../components/sheet/ManageRecurringTransactionsSheet';
import { SavingsRateTargetSheet } from '../../components/sheet/SavingsRateTargetSheet';
import {
  TransactionPreviewSheet,
  type TransactionPreviewSheetRef,
} from '../../components/sheet/TransactionPreviewSheet';
import { useBudgetingEnabled } from '../../hooks/useBudgetingEnabled';
import { useTripsEnabled } from '../../hooks/useTripsEnabled';
import { useAdvancedAnalyticsEnabled } from '../../hooks/useAdvancedAnalyticsEnabled';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { useSavingsRateEnabled } from '../../hooks/useSavingsRateEnabled';
import { useSavingsRateTarget } from '../../hooks/useSavingsRateTarget';
import useToast from '../../hooks/useToast';
import type { ExportDateRange } from '../../hooks/useTransactionExport';

type FeatureToggleProps = {
  IconComponent: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
};

const FeatureToggle = ({
  IconComponent,
  title,
  description,
  checked,
  onToggle,
}: FeatureToggleProps) => (
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
          <IconComponent size={18} color="white" />
        </View>
        <View flex={1}>
          <Text fontSize="$4" fontWeight="500" color="white">
            {title}
          </Text>
          <Text fontSize="$2" color="$gray9">
            {description}
          </Text>
        </View>
      </View>
      <Switch checked={checked} onCheckedChange={onToggle}>
        <Switch.Thumb />
      </Switch>
    </View>
  </YGroup.Item>
);

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const manageRecurringSheetRef = React.useRef<BottomSheetModal | null>(null);
  const currencySheetRef = React.useRef<BottomSheetModal | null>(null);
  const exportDataSheetRef = React.useRef<BottomSheetModal | null>(null);
  const transactionPreviewSheetRef = React.useRef<TransactionPreviewSheetRef | null>(
    null
  );
  const importCsvSheetRef = React.useRef<BottomSheetModal | null>(null);
  const shortcutsSetupSheetRef = React.useRef<BottomSheetModal | null>(null);
  const savingsRateTargetSheetRef = React.useRef<BottomSheetModal | null>(null);
  const { setDefaultCurrency, defaultCurrency, currency, isUpdatingCurrency } =
    useDefaultCurrency();
  const { budgetingEnabled, setBudgetingEnabled } = useBudgetingEnabled();
  const { tripsEnabled, setTripsEnabled } = useTripsEnabled();
  const { advancedAnalyticsEnabled, setAdvancedAnalyticsEnabled } =
    useAdvancedAnalyticsEnabled();
  const { savingsRateEnabled } = useSavingsRateEnabled();
  const { savingsRateTarget } = useSavingsRateTarget();
  const [isTogglingFeature, setIsTogglingFeature] = useState(false);

  const router = useRouter();
  const toast = useToast();

  const toggleFeature = async (
    setEnabled: (enabled: boolean) => Promise<void>,
    enabled: boolean
  ) => {
    if (isTogglingFeature) return;
    setIsTogglingFeature(true);
    try {
      await setEnabled(!enabled);
    } finally {
      setIsTogglingFeature(false);
    }
  };

  const handleCurrencySelect = async (currencyCode: string) => {
    if (isUpdatingCurrency) {
      return;
    }
    currencySheetRef.current?.close();
    try {
      await setDefaultCurrency(currencyCode);
    } catch {
      toast.show({
        title: 'Currency update failed',
        message:
          "Your transactions couldn't be converted to the new currency. Please try again.",
        preset: 'error',
        haptic: 'error',
      });
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
              router.push({ pathname: '/select-category', params: { mode: 'manage' } });
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
          <SettingsItem
            label={'Savings Rate'}
            IconComponent={PiggyBank}
            rightLabel={savingsRateEnabled ? `${savingsRateTarget}%` : 'Off'}
            onPress={() => {
              savingsRateTargetSheetRef.current?.present();
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
            <FeatureToggle
              IconComponent={Wallet}
              title="Enable Budgeting"
              description="Show budgets tab and features"
              checked={budgetingEnabled}
              onToggle={() => toggleFeature(setBudgetingEnabled, budgetingEnabled)}
            />
            <FeatureToggle
              IconComponent={Plane}
              title="Enable Trips"
              description="Track spending by trip"
              checked={tripsEnabled}
              onToggle={() => toggleFeature(setTripsEnabled, tripsEnabled)}
            />
            <FeatureToggle
              IconComponent={TrendingUp}
              title="Advanced Analytics"
              description="Deep financial insights & scores"
              checked={advancedAnalyticsEnabled}
              onToggle={() =>
                toggleFeature(setAdvancedAnalyticsEnabled, advancedAnalyticsEnabled)
              }
            />
          </YGroup>
        </View>

        {Platform.OS === 'ios' && (
          <>
            <Text fontSize={'$7'} marginTop="$4" marginBottom={'$2'}>
              Integrations
            </Text>
            <YGroup>
              <SettingsItem
                label={'Apple Wallet Automation'}
                IconComponent={Smartphone}
                rightLabel={''}
                onPress={() => {
                  shortcutsSetupSheetRef.current?.present();
                }}
              />
            </YGroup>
          </>
        )}

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
      <ManageRecurringTransactionsSheet sheetRef={manageRecurringSheetRef} />
      <SavingsRateTargetSheet sheetRef={savingsRateTargetSheetRef} />
      <CurrencySelect
        sheetRef={currencySheetRef}
        onSelect={(selected) => handleCurrencySelect(selected.code)}
        selectedCurrency={currency}
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
      {Platform.OS === 'ios' && <ShortcutsSetupSheet sheetRef={shortcutsSetupSheetRef} />}
    </>
  );
}

const BASE_WEBSITE_URL = 'https://stroberi.app';
