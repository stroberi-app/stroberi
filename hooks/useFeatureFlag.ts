import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { database } from '../database';

type FeatureFlagListener = (enabled: boolean) => void;

const listenersByKey = new Map<string, Set<FeatureFlagListener>>();

export const notifyFeatureFlagChanged = (key: string, enabled: boolean) => {
  const listeners = listenersByKey.get(key);
  if (!listeners) {
    return;
  }

  listeners.forEach((listener) => listener(enabled));
};

export const useFeatureFlag = (key: string, defaultValue: boolean) => {
  const [value, setValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  const loadValue = useCallback(async () => {
    try {
      const stored = await database.localStorage.get(key);
      if (stored === null || stored === undefined) {
        setValue(defaultValue);
        return;
      }

      setValue(stored === 'true');
    } finally {
      setIsLoading(false);
    }
  }, [defaultValue, key]);

  useEffect(() => {
    loadValue();

    const listeners = listenersByKey.get(key) ?? new Set<FeatureFlagListener>();
    listeners.add(setValue);
    listenersByKey.set(key, listeners);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadValue();
      }
    });

    return () => {
      const currentListeners = listenersByKey.get(key);
      currentListeners?.delete(setValue);
      if (currentListeners && currentListeners.size === 0) {
        listenersByKey.delete(key);
      }
      subscription.remove();
    };
  }, [key, loadValue]);

  const setFeatureFlag = useCallback(
    async (nextValue: boolean) => {
      setValue(nextValue);
      await database.localStorage.set(key, nextValue.toString());
      notifyFeatureFlagChanged(key, nextValue);
    },
    [key]
  );

  return {
    value,
    isLoading,
    setValue: setFeatureFlag,
  };
};
