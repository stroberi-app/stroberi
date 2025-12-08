export const REVENUECAT_API_KEY = 'test_ieuCBpObewjgluTnXzljsGPGFoA';
export const REVENUECAT_ENTITLEMENT_ID = 'Stroberi Pro';
export const REVENUECAT_OFFERING_ID = 'default';

export const REVENUECAT_PACKAGE_IDS = ['monthly', 'yearly', 'lifetime'] as const;
export type RevenueCatPackageId = (typeof REVENUECAT_PACKAGE_IDS)[number];
