import { STORAGE_KEYS } from '../lib/storageKeys';
import { useFeatureFlag } from './useFeatureFlag';

export const useBudgetingEnabled = () => {
  const { value, isLoading, setValue } = useFeatureFlag(STORAGE_KEYS.BUDGETING_ENABLED);
  return { budgetingEnabled: value, isLoading, setBudgetingEnabled: setValue };
};
