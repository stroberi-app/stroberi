import { notifyFeatureFlagChanged, useFeatureFlag } from './useFeatureFlag';
import { STORAGE_KEYS } from '../lib/storageKeys';

export const notifyBudgetingEnabledChanged = (enabled: boolean) => {
  notifyFeatureFlagChanged(STORAGE_KEYS.BUDGETING_ENABLED, enabled);
};

export const useBudgetingEnabled = () => {
  const {
    value: budgetingEnabled,
    isLoading,
    setValue: setBudgetingEnabled,
  } = useFeatureFlag(STORAGE_KEYS.BUDGETING_ENABLED, false);

  return { budgetingEnabled, isLoading, setBudgetingEnabled };
};
