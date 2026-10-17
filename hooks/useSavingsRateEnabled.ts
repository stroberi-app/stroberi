import { STORAGE_KEYS } from '../lib/storageKeys';
import { useFeatureFlag } from './useFeatureFlag';

export const useSavingsRateEnabled = () => {
  const { value, isLoading, setValue } = useFeatureFlag(
    STORAGE_KEYS.SAVINGS_RATE_ENABLED
  );
  return { savingsRateEnabled: value, isLoading, setSavingsRateEnabled: setValue };
};
