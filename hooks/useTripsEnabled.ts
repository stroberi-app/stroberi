import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { database } from '../database/index';
import { STORAGE_KEYS } from '../lib/storageKeys';

let tripsEnabledListeners: Array<(enabled: boolean) => void> = [];

export const notifyTripsEnabledChanged = (enabled: boolean) => {
  tripsEnabledListeners.forEach((listener) => listener(enabled));
};

export const useTripsEnabled = () => {
  const [tripsEnabled, setTripsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTripsSetting = async () => {
      try {
        const enabled = await database.localStorage.get(STORAGE_KEYS.TRIPS_ENABLED);
        setTripsEnabled(enabled === 'true');
      } finally {
        setIsLoading(false);
      }
    };
    loadTripsSetting();

    tripsEnabledListeners.push(setTripsEnabled);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadTripsSetting();
      }
    });

    return () => {
      tripsEnabledListeners = tripsEnabledListeners.filter(
        (listener) => listener !== setTripsEnabled
      );
      subscription.remove();
    };
  }, []);

  return { tripsEnabled, isLoading };
};
