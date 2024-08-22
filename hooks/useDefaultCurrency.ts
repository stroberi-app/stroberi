import { useEffect, useState } from 'react';
import { database } from '../database';
import { getLocales } from 'expo-localization';

export const useDefaultCurrency = () => {
  const [defaultCurrency, setDefaultCurrency] = useState<string | null>(null);

  useEffect(() => {
    database.localStorage.get('defaultCurrency').then(currency => {
      if (!currency) {
        const [locale] = getLocales();
        if (locale.currencyCode) {
          // set some default currency
          database.localStorage.set('defaultCurrency', locale.currencyCode);
        }
      } else if (typeof currency === 'string') {
        setDefaultCurrency(currency);
      }
    });
  }, []);

  const handleSetDefaultCurrency = async (currency: string) => {
    await database.localStorage.set('defaultCurrency', currency);
    setDefaultCurrency(currency);
  };

  return {
    defaultCurrency,
    setDefaultCurrency: handleSetDefaultCurrency,
  };
};
