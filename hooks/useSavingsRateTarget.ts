import { STORAGE_KEYS } from '../lib/storageKeys';
import { numberSetting, useStoredSetting } from './useStoredSetting';

const savingsRateTarget = numberSetting(20);

export const useSavingsRateTarget = () => {
  const { value, isLoading, setValue } = useStoredSetting(
    STORAGE_KEYS.SAVINGS_RATE_TARGET,
    savingsRateTarget
  );
  return { savingsRateTarget: value, isLoading, setSavingsRateTarget: setValue };
};
