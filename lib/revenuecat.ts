import { Platform } from 'react-native';

/**
 * Feature flag to enable/disable paywall and pro features.
 * When false, all pro features are unlocked without requiring payment.
 * Set to true to enable monetization via RevenueCat.
 */
export const PAYWALL_ENABLED = false;

const isProduction = __DEV__;
const getRevenueCatApiKey = () => {
  if (Platform.OS === 'ios' && isProduction) {
    return 'appl_fbvsRPQfxEsOcPxpzJiKKSSiMRI';
  }
  return 'test_ieuCBpObewjgluTnXzljsGPGFoA';
};

export const REVENUECAT_API_KEY = getRevenueCatApiKey();
export const REVENUECAT_ENTITLEMENT_ID = isProduction ? 'Stoberi Pro Prod' : 'Stroberi Pro';
export const REVENUECAT_OFFERING_ID = 'default';

export const REVENUECAT_PACKAGE_IDS = isProduction ? ['Monthly', 'Yearly'] : ['monthly', 'yearly'] as const;
export type RevenueCatPackageId = (typeof REVENUECAT_PACKAGE_IDS)[number];
