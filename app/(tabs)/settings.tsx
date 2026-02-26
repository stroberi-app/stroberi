import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  Crown,
  DollarSign,
  FolderInput,
  FolderOutput,
  Plane,
  RefreshCw,
  ShieldCheck,
  Tags,
  TrendingUp,
  Wallet,
} from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
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
import { database } from '../../database/index';
import {
  notifyBudgetingEnabledChanged,
  useBudgetingEnabled,
} from '../../hooks/useBudgetingEnabled';
import { notifyTripsEnabledChanged, useTripsEnabled } from '../../hooks/useTripsEnabled';
import {
  notifyAdvancedAnalyticsEnabledChanged,
  useAdvancedAnalyticsEnabled,
} from '../../hooks/useAdvancedAnalyticsEnabled';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import type { ExportDateRange } from '../../hooks/useTransactionExport';
import { PAYWALL_ENABLED, REVENUECAT_ENTITLEMENT_ID } from '../../lib/revenuecat';
import { STORAGE_KEYS } from '../../lib/storageKeys';

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
  const { budgetingEnabled } = useBudgetingEnabled();
  const { tripsEnabled } = useTripsEnabled();
  const { advancedAnalyticsEnabled } = useAdvancedAnalyticsEnabled();
  const [localBudgetingEnabled, setLocalBudgetingEnabled] = useState(budgetingEnabled);
  const [localTripsEnabled, setLocalTripsEnabled] = useState(tripsEnabled);
  const [localAnalyticsEnabled, setLocalAnalyticsEnabled] = useState(
    advancedAnalyticsEnabled
  );
  const {
    hasPro,
    isLoading: isRevenueCatLoading,
    isPaywallLoading,
    isRestoring,
    error: revenueCatError,
    presentPaywall,
    restorePurchases,
    openCustomerCenter,
  } = useRevenueCat();
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    setLocalBudgetingEnabled(budgetingEnabled);
  }, [budgetingEnabled]);

  useEffect(() => {
    setLocalTripsEnabled(tripsEnabled);
  }, [tripsEnabled]);

  useEffect(() => {
    setLocalAnalyticsEnabled(advancedAnalyticsEnabled);
  }, [advancedAnalyticsEnabled]);

  useEffect(() => {
    if (revenueCatError) {
      setSubscriptionMessage(revenueCatError);
    }
  }, [revenueCatError]);

  const handleBudgetingToggle = async () => {
    if (!hasPro) {
      await handlePaywall();
      return;
    }
    const newValue = !localBudgetingEnabled;
    setLocalBudgetingEnabled(newValue);
    await database.localStorage.set(STORAGE_KEYS.BUDGETING_ENABLED, newValue.toString());
    notifyBudgetingEnabledChanged(newValue);
  };

  const handleTripsToggle = async () => {
    if (!hasPro) {
      await handlePaywall();
      return;
    }
    const newValue = !localTripsEnabled;
    setLocalTripsEnabled(newValue);
    await database.localStorage.set(STORAGE_KEYS.TRIPS_ENABLED, newValue.toString());
    notifyTripsEnabledChanged(newValue);
  };

  const handleAnalyticsToggle = async () => {
    if (!hasPro) {
      await handlePaywall();
      return;
    }
    const newValue = !localAnalyticsEnabled;
    setLocalAnalyticsEnabled(newValue);
    await database.localStorage.set(
      STORAGE_KEYS.ADVANCED_ANALYTICS_ENABLED,
      newValue.toString()
    );
    notifyAdvancedAnalyticsEnabledChanged(newValue);
  };

  const handleViewTransactions = (dateRange: ExportDateRange) => {
    exportDataSheetRef.current?.dismiss();
    transactionPreviewSheetRef.current?.present(dateRange);
  };

  const handleBackToExport = () => {
    transactionPreviewSheetRef.current?.dismiss();
    exportDataSheetRef.current?.present();
  };

  const formatError = (err: unknown) => {
    if (
      typeof err === 'object' &&
      err !== null &&
      'message' in err &&
      typeof (err as { message?: unknown }).message === 'string'
    ) {
      return (err as { message: string }).message;
    }
    return 'Something went wrong. Please try again.';
  };

  const handlePaywall = async () => {
    setSubscriptionMessage(null);
    try {
      const result = await presentPaywall();
      const proActive = result?.customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
      if (proActive) {
        setSubscriptionMessage('Stroberi Pro is active. Thank you for upgrading!');
      }
    } catch (err) {
      Alert.alert('Purchase failed', formatError(err));
    }
  };

  const handleRestore = async () => {
    setSubscriptionMessage(null);
    try {
      const restoredInfo = await restorePurchases();
      const restoredPro = restoredInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
      setSubscriptionMessage(
        restoredPro ? 'Purchases restored. Stroberi Pro is active.' : 'No purchases to restore.'
      );
    } catch (err) {
      Alert.alert('Restore failed', formatError(err));
    }
  };

  const handleManageSubscription = async () => {
    setSubscriptionMessage(null);
    try {
      await openCustomerCenter();
    } catch (err) {
      Alert.alert('Manage subscription', formatError(err));
    }
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
          borderColor={PAYWALL_ENABLED && hasPro ? '$stroberi' : PAYWALL_ENABLED ? '$gray6' : '$gray4'}
        >
          {PAYWALL_ENABLED && (
            <>
              <View flexDirection="row" alignItems="center" gap="$2" marginBottom="$3">
                <Crown size={20} color={hasPro ? '$stroberi' : '$gray9'} />
                <Text fontSize={'$7'} fontWeight="bold" color={hasPro ? '$stroberi' : '$gray11'}>
                  Stroberi Pro
                </Text>
                {hasPro && (
                  <View
                    backgroundColor="$stroberi"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$2"
                  >
                    <Text fontSize="$1" fontWeight="600" color="white">
                      ACTIVE
                    </Text>
                  </View>
                )}
              </View>
              {!hasPro && (
                <Text fontSize="$3" color="$gray9" marginBottom="$3">
                  Unlock advanced features with Stroberi Pro
                </Text>
              )}
              <YGroup>
                {!hasPro && (
                  <>
                    <SettingsItem
                      label={'Stroberi Pro'}
                      IconComponent={ShieldCheck}
                      rightLabel={'Locked'}
                      isLoading={isRevenueCatLoading || isPaywallLoading}
                      onPress={handlePaywall}
                    />
                    <SettingsItem
                      label={'Upgrade / View Plans'}
                      IconComponent={Crown}
                      rightLabel={'Upgrade'}
                      isLoading={isPaywallLoading}
                      onPress={handlePaywall}
                    />
                  </>
                )}
              </YGroup>
            </>
          )}
          {(hasPro || !PAYWALL_ENABLED) && (
            <>
              {PAYWALL_ENABLED && (
                <Text fontSize="$5" fontWeight="600" marginBottom="$2" color="$gray11">
                  Pro Features
                </Text>
              )}
              {!PAYWALL_ENABLED && (
                <Text fontSize="$5" fontWeight="600" marginBottom="$2" color="$gray11">
                  Features
                </Text>
              )}
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
                      checked={localBudgetingEnabled}
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
                    <Switch checked={localTripsEnabled} onCheckedChange={handleTripsToggle}>
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
                      checked={localAnalyticsEnabled}
                      onCheckedChange={handleAnalyticsToggle}
                    >
                      <Switch.Thumb animation="bouncy" />
                    </Switch>
                  </View>
                </YGroup.Item>
              </YGroup>
            </>
          )}
          {PAYWALL_ENABLED && !hasPro && (
            <View marginTop="$3">
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
                    borderColor="$gray6"
                    opacity={0.6}
                  >
                    <View flexDirection="row" alignItems="center" gap="$3" flex={1}>
                      <View
                        backgroundColor="$gray5"
                        borderRadius="$2"
                        padding="$2"
                        width={32}
                        height={32}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Wallet size={18} color="$gray9" />
                      </View>
                      <View flex={1}>
                        <View flexDirection="row" alignItems="center" gap="$2">
                          <Text fontSize="$4" fontWeight="500" color="$gray9">
                            Enable Budgeting
                          </Text>
                          <Crown size={14} color="$gray9" />
                        </View>
                        <Text fontSize="$2" color="$gray10">
                          Show budgets tab and features
                        </Text>
                      </View>
                    </View>
                    <Switch checked={false} disabled>
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
                    borderColor="$gray6"
                    opacity={0.6}
                  >
                    <View flexDirection="row" alignItems="center" gap="$3" flex={1}>
                      <View
                        backgroundColor="$gray5"
                        borderRadius="$2"
                        padding="$2"
                        width={32}
                        height={32}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Plane size={18} color="$gray9" />
                      </View>
                      <View flex={1}>
                        <View flexDirection="row" alignItems="center" gap="$2">
                          <Text fontSize="$4" fontWeight="500" color="$gray9">
                            Enable Trips
                          </Text>
                          <Crown size={14} color="$gray9" />
                        </View>
                        <Text fontSize="$2" color="$gray10">
                          Track spending by trip
                        </Text>
                      </View>
                    </View>
                    <Switch checked={false} disabled>
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
                    borderColor="$gray6"
                    opacity={0.6}
                  >
                    <View flexDirection="row" alignItems="center" gap="$3" flex={1}>
                      <View
                        backgroundColor="$gray5"
                        borderRadius="$2"
                        padding="$2"
                        width={32}
                        height={32}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <TrendingUp size={18} color="$gray9" />
                      </View>
                      <View flex={1}>
                        <View flexDirection="row" alignItems="center" gap="$2">
                          <Text fontSize="$4" fontWeight="500" color="$gray9">
                            Advanced Analytics
                          </Text>
                          <Crown size={14} color="$gray9" />
                        </View>
                        <Text fontSize="$2" color="$gray10">
                          Deep financial insights & scores
                        </Text>
                      </View>
                    </View>
                    <Switch checked={false} disabled>
                      <Switch.Thumb animation="bouncy" />
                    </Switch>
                  </View>
                </YGroup.Item>
              </YGroup>
            </View>
          )}
          {PAYWALL_ENABLED && subscriptionMessage ? (
            <Text fontSize="$4" color="$gray9" marginTop="$3">
              {subscriptionMessage}
            </Text>
          ) : null}
          {PAYWALL_ENABLED && hasPro && (
            <View
              flexDirection="row"
              gap="$4"
              marginTop="$3"
              paddingTop="$3"
              borderTopWidth={1}
              borderTopColor="$gray5"
            >
              <TouchableOpacity onPress={handleManageSubscription} disabled={isPaywallLoading}>
                <Text fontSize="$3" color="$gray9" textDecorationLine="underline">
                  Manage Subscription
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
                <Text fontSize="$3" color="$gray9" textDecorationLine="underline">
                  Restore Purchases
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
