import { STORAGE_KEYS } from '../lib/storageKeys';
import { useFeatureFlag } from './useFeatureFlag';

export const useAdvancedAnalyticsEnabled = () => {
  const { value, isLoading, setValue } = useFeatureFlag(
    STORAGE_KEYS.ADVANCED_ANALYTICS_ENABLED
  );
  return {
    advancedAnalyticsEnabled: value,
    isLoading,
    setAdvancedAnalyticsEnabled: setValue,
  };
};
