import { notifyFeatureFlagChanged, useFeatureFlag } from './useFeatureFlag';
import { STORAGE_KEYS } from '../lib/storageKeys';

export const notifyTripsEnabledChanged = (enabled: boolean) => {
  notifyFeatureFlagChanged(STORAGE_KEYS.TRIPS_ENABLED, enabled);
};

export const useTripsEnabled = () => {
  const { value: tripsEnabled, isLoading, setValue: setTripsEnabled } = useFeatureFlag(
    STORAGE_KEYS.TRIPS_ENABLED,
    false
  );

  return { tripsEnabled, isLoading, setTripsEnabled };
};
