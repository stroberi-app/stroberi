import { STORAGE_KEYS } from '../lib/storageKeys';
import { useFeatureFlag } from './useFeatureFlag';

export const useTripsEnabled = () => {
  const { value, isLoading, setValue } = useFeatureFlag(STORAGE_KEYS.TRIPS_ENABLED);
  return { tripsEnabled: value, isLoading, setTripsEnabled: setValue };
};
