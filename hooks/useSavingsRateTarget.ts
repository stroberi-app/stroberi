import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { database } from '../database';
import { STORAGE_KEYS } from '../lib/storageKeys';

export const SAVINGS_RATE_TARGET_DEFAULT = 20;

type Listener = (value: number) => void;
const listeners = new Set<Listener>();

export const notifySavingsRateTargetChanged = (value: number) => {
  listeners.forEach((listener) => {
    listener(value);
  });
};

const parseTarget = (stored: unknown): number => {
  if (stored === null || stored === undefined) {
    return SAVINGS_RATE_TARGET_DEFAULT;
  }
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : SAVINGS_RATE_TARGET_DEFAULT;
};

export const useSavingsRateTarget = () => {
  const [savingsRateTarget, setValue] = useState(SAVINGS_RATE_TARGET_DEFAULT);
  const [isLoading, setIsLoading] = useState(true);

  const loadValue = useCallback(async () => {
    try {
      const stored = await database.localStorage.get(STORAGE_KEYS.SAVINGS_RATE_TARGET);
      setValue(parseTarget(stored));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadValue();
    listeners.add(setValue);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadValue();
      }
    });

    return () => {
      listeners.delete(setValue);
      subscription.remove();
    };
  }, [loadValue]);

  const setSavingsRateTarget = useCallback(async (nextValue: number) => {
    setValue(nextValue);
    await database.localStorage.set(
      STORAGE_KEYS.SAVINGS_RATE_TARGET,
      nextValue.toString()
    );
    notifySavingsRateTargetChanged(nextValue);
  }, []);

  return { savingsRateTarget, isLoading, setSavingsRateTarget };
};
