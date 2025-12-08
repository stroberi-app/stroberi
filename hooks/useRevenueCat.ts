import { useCallback, useEffect, useMemo, useState } from 'react';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import {
  REVENUECAT_API_KEY,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_OFFERING_ID,
} from '../lib/revenuecat';
import type { RevenueCatPackageId } from '../lib/revenuecat';

type PaywallResult = (typeof PAYWALL_RESULT)[keyof typeof PAYWALL_RESULT];

export type PresentedPaywallResult = {
  paywallResult: PaywallResult;
  customerInfo: CustomerInfo | null;
};

let configurePromise: Promise<void> | null = null;

const ensureRevenueCatConfigured = async () => {
  if (!configurePromise) {
    configurePromise = (async () => {
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    })();
  }
  return configurePromise;
};

const isCancelledPurchase = (error: unknown) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'number'
  ) {
    return (
      (error as { code: number }).code ===
      Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    );
  }
  return false;
};

const formatPurchasesError = (error: unknown) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Something went wrong. Please try again.';
};

const findPackageById = (offerings: PurchasesOfferings | null, id: RevenueCatPackageId) => {
  const available = offerings?.current?.availablePackages ?? [];
  return available.find((pkg) => pkg.identifier === id) ?? null;
};

const findOfferingById = (offerings: PurchasesOfferings | null, id: string) => {
  if (!offerings) {
    return null;
  }
  if (offerings.current?.identifier === id) {
    return offerings.current;
  }
  return offerings.all?.[id] ?? null;
};

export const useRevenueCat = () => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaywallLoading, setIsPaywallLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await ensureRevenueCatConfigured();
        const [info, fetchedOfferings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        if (!isMounted) {
          return;
        }
        setCustomerInfo(info);
        setOfferings(fetchedOfferings);
        setError(null);
      } catch (err) {
        if (isMounted) {
          setError(formatPurchasesError(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    const listener = (updatedInfo: CustomerInfo) => setCustomerInfo(updatedInfo);
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      isMounted = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const refreshOfferings = useCallback(async () => {
    await ensureRevenueCatConfigured();
    const fetchedOfferings = await Purchases.getOfferings();
    setOfferings(fetchedOfferings);
    return fetchedOfferings;
  }, []);

  const purchasePackageWithPackage = useCallback(
    async (pkg: PurchasesPackage) => {
      try {
        const { customerInfo: updatedInfo } = await Purchases.purchasePackage(pkg);
        setCustomerInfo(updatedInfo);
        return updatedInfo;
      } catch (err) {
        if (isCancelledPurchase(err)) {
          return null;
        }
        setError(formatPurchasesError(err));
        throw err;
      }
    },
    []
  );

  const purchasePackage = useCallback(
    async (packageId: RevenueCatPackageId) => {
      await ensureRevenueCatConfigured();
      const pkg: PurchasesPackage | null = findPackageById(offerings, packageId);
      if (!pkg) {
        const refreshResult = await refreshOfferings();
        const refreshedPackage = findPackageById(refreshResult, packageId);
        if (!refreshedPackage) {
          throw new Error('Package not found. Please try again later.');
        }
        return purchasePackageWithPackage(refreshedPackage);
      }

      return purchasePackageWithPackage(pkg);
    },
    [offerings, refreshOfferings, purchasePackageWithPackage]
  );

  const presentPaywall = useCallback(
    async (): Promise<PresentedPaywallResult | null> => {
      setIsPaywallLoading(true);
      try {
        await ensureRevenueCatConfigured();
        let offeringToPresent = findOfferingById(offerings, REVENUECAT_OFFERING_ID);
        if (!offeringToPresent) {
          const refreshedOfferings = await refreshOfferings();
          offeringToPresent = findOfferingById(refreshedOfferings, REVENUECAT_OFFERING_ID);
        }
        const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
          offering: offeringToPresent ?? undefined,
          requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_ID,
        });
        if (
          paywallResult === PAYWALL_RESULT.CANCELLED ||
          paywallResult === PAYWALL_RESULT.NOT_PRESENTED
        ) {
          return null;
        }
        let updatedInfo: CustomerInfo | null = null;
        if (
          paywallResult === PAYWALL_RESULT.PURCHASED ||
          paywallResult === PAYWALL_RESULT.RESTORED
        ) {
          updatedInfo = await Purchases.getCustomerInfo();
          setCustomerInfo(updatedInfo);
          setError(null);
        }
        return {
          paywallResult,
          customerInfo: updatedInfo,
        };
      } catch (err) {
        if (isCancelledPurchase(err)) {
          return null;
        }
        setError(formatPurchasesError(err));
        throw err;
      } finally {
        setIsPaywallLoading(false);
      }
    },
    [offerings, refreshOfferings]
  );

  const restorePurchases = useCallback(async () => {
    setIsRestoring(true);
    try {
      await ensureRevenueCatConfigured();
      const restoredInfo = await Purchases.restorePurchases();
      setCustomerInfo(restoredInfo);
      setError(null);
      return restoredInfo;
    } catch (err) {
      setError(formatPurchasesError(err));
      throw err;
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const openCustomerCenter = useCallback(async () => {
    setIsPaywallLoading(true);
    try {
      await ensureRevenueCatConfigured();
      await RevenueCatUI.presentCustomerCenter();
    } catch (err) {
      setError(formatPurchasesError(err));
      throw err;
    } finally {
      setIsPaywallLoading(false);
    }
  }, []);

  const hasPro = useMemo(
    () => Boolean(customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID]),
    [customerInfo]
  );

  return {
    customerInfo,
    offerings,
    hasPro,
    isLoading,
    isPaywallLoading,
    isRestoring,
    error,
    presentPaywall,
    purchasePackage,
    restorePurchases,
    openCustomerCenter,
    refreshOfferings,
  };
};

export const useRevenueCatBootstrap = () => {
  useEffect(() => {
    void ensureRevenueCatConfigured().catch((err) => {
      console.warn('Failed to configure RevenueCat', err);
    });
  }, []);
};
