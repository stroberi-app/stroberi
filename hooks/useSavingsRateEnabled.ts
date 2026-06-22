import { notifyFeatureFlagChanged, useFeatureFlag } from './useFeatureFlag';
import { STORAGE_KEYS } from '../lib/storageKeys';

export const notifySavingsRateEnabledChanged = (enabled: boolean) => {
  notifyFeatureFlagChanged(STORAGE_KEYS.SAVINGS_RATE_ENABLED, enabled);
};

export const useSavingsRateEnabled = () => {
  const {
    value: savingsRateEnabled,
    isLoading,
    setValue: setSavingsRateEnabled,
  } = useFeatureFlag(STORAGE_KEYS.SAVINGS_RATE_ENABLED, false);

  return { savingsRateEnabled, isLoading, setSavingsRateEnabled };
};
