import { notifyFeatureFlagChanged, useFeatureFlag } from './useFeatureFlag';
import { STORAGE_KEYS } from '../lib/storageKeys';

export const notifyAdvancedAnalyticsEnabledChanged = (enabled: boolean) => {
  notifyFeatureFlagChanged(STORAGE_KEYS.ADVANCED_ANALYTICS_ENABLED, enabled);
};

export const useAdvancedAnalyticsEnabled = () => {
  const {
    value: advancedAnalyticsEnabled,
    isLoading,
    setValue: setAdvancedAnalyticsEnabled,
  } = useFeatureFlag(STORAGE_KEYS.ADVANCED_ANALYTICS_ENABLED, false);

  return { advancedAnalyticsEnabled, isLoading, setAdvancedAnalyticsEnabled };
};
