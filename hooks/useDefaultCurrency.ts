import { getLocales } from 'expo-localization';
import { useEffect, useState } from 'react';
import { database } from '../database';
import { rebaseTransactionsToCurrency } from '../database/actions/transactions';
import { FALLBACK_CURRENCY } from '../lib/format';
import { STORAGE_KEYS } from '../lib/storageKeys';

let defaultCurrencyListeners: Array<(currency: string | null) => void> = [];

const notifyDefaultCurrencyChanged = (currency: string | null) => {
  defaultCurrencyListeners.forEach((listener) => {
    listener(currency);
  });
};

export const useDefaultCurrency = () => {
  const [defaultCurrency, setDefaultCurrency] = useState<string | null>(null);
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);
  const [isDefaultCurrencyLoaded, setIsDefaultCurrencyLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDefaultCurrency = async () => {
      try {
        const currency = await database.localStorage.get(STORAGE_KEYS.DEFAULT_CURRENCY);
        if (!currency) {
          const [locale] = getLocales();
          if (locale.currencyCode) {
            database.localStorage.set(STORAGE_KEYS.DEFAULT_CURRENCY, locale.currencyCode);
            setDefaultCurrency(locale.currencyCode);
          }
        } else if (typeof currency === 'string') {
          setDefaultCurrency(currency);
        }
      } catch (error) {
        console.error('Failed to load default currency:', error);
      } finally {
        if (isMounted) {
          setIsDefaultCurrencyLoaded(true);
        }
      }
    };

    loadDefaultCurrency();

    defaultCurrencyListeners.push(setDefaultCurrency);

    return () => {
      isMounted = false;
      defaultCurrencyListeners = defaultCurrencyListeners.filter(
        (listener) => listener !== setDefaultCurrency
      );
    };
  }, []);

  const handleSetDefaultCurrency = async (currency: string) => {
    if (isUpdatingCurrency) {
      return;
    }

    setIsUpdatingCurrency(true);
    setDefaultCurrency(currency);
    notifyDefaultCurrencyChanged(currency);

    try {
      await database.localStorage.set(STORAGE_KEYS.DEFAULT_CURRENCY, currency);
      await rebaseTransactionsToCurrency(currency);
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  return {
    defaultCurrency,
    /** `defaultCurrency`, or the fallback while none is set; use for display. */
    currency: defaultCurrency ?? FALLBACK_CURRENCY,
    setDefaultCurrency: handleSetDefaultCurrency,
    isUpdatingCurrency,
    isDefaultCurrencyLoaded,
  };
};
