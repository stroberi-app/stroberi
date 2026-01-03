import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { database } from '../database/index';
import { STORAGE_KEYS } from '../lib/storageKeys';

let advancedAnalyticsEnabledListeners: Array<(enabled: boolean) => void> = [];

export const notifyAdvancedAnalyticsEnabledChanged = (enabled: boolean) => {
  advancedAnalyticsEnabledListeners.forEach((listener) => listener(enabled));
};

export const useAdvancedAnalyticsEnabled = () => {
  const [advancedAnalyticsEnabled, setAdvancedAnalyticsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAdvancedAnalyticsSetting = async () => {
      try {
        const enabled = await database.localStorage.get(
          STORAGE_KEYS.ADVANCED_ANALYTICS_ENABLED
        );
        setAdvancedAnalyticsEnabled(enabled === 'true');
      } finally {
        setIsLoading(false);
      }
    };
    loadAdvancedAnalyticsSetting();

    advancedAnalyticsEnabledListeners.push(setAdvancedAnalyticsEnabled);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadAdvancedAnalyticsSetting();
      }
    });

    return () => {
      advancedAnalyticsEnabledListeners = advancedAnalyticsEnabledListeners.filter(
        (listener) => listener !== setAdvancedAnalyticsEnabled
      );
      subscription.remove();
    };
  }, []);

  return { advancedAnalyticsEnabled, isLoading };
};
