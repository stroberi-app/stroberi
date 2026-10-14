import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { database } from '../database';

/** How a setting is read from and written to local storage. */
export type SettingCodec<T> = {
  parse: (stored: unknown) => T;
  serialize: (value: T) => string;
};

export const booleanSetting = (defaultValue: boolean): SettingCodec<boolean> => ({
  parse: (stored) => (stored == null ? defaultValue : stored === 'true'),
  serialize: String,
});

export const numberSetting = (defaultValue: number): SettingCodec<number> => ({
  parse: (stored) => {
    const parsed = stored == null ? Number.NaN : Number(stored);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  },
  serialize: String,
});

export const stringListSetting: SettingCodec<string[]> = {
  parse: (stored) => {
    if (typeof stored !== 'string') {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  },
  serialize: (value) => JSON.stringify(value),
};

// Mounted hooks per key, so a change made on one screen reaches the others.
const listenersByKey = new Map<string, Set<(stored: string) => void>>();

/**
 * A setting persisted in local storage and kept in sync across every mounted
 * consumer. It is re-read whenever the app returns to the foreground. `codec`
 * must be referentially stable (define it at module level or memoize it).
 */
export const useStoredSetting = <T>(
  key: string,
  { parse, serialize }: SettingCodec<T>
) => {
  const [value, setValue] = useState(() => parse(null));
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setValue(parse(await database.localStorage.get(key)));
    } finally {
      setIsLoading(false);
    }
  }, [key, parse]);

  useEffect(() => {
    load();

    const listener = (stored: string) => setValue(parse(stored));
    const listeners = listenersByKey.get(key) ?? new Set();
    listeners.add(listener);
    listenersByKey.set(key, listeners);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        load();
      }
    });

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        listenersByKey.delete(key);
      }
      subscription.remove();
    };
  }, [key, load, parse]);

  const update = useCallback(
    async (nextValue: T) => {
      const stored = serialize(nextValue);
      setValue(nextValue);
      await database.localStorage.set(key, stored);
      for (const listener of listenersByKey.get(key) ?? []) {
        listener(stored);
      }
    },
    [key, serialize]
  );

  return { value, isLoading, setValue: update };
};
