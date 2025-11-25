import { getLocales } from 'expo-localization';
import { useEffect, useState } from 'react';
import { database } from '../database';
import type { TransactionModel } from '../database/transaction-model';
import { getCurrencyConversion } from '../hooks/useCurrencyApi';
import { STORAGE_KEYS } from '../lib/storageKeys';

export const useDefaultCurrency = () => {
  const [defaultCurrency, setDefaultCurrency] = useState<string | null>(null);

  useEffect(() => {
    database.localStorage.get(STORAGE_KEYS.DEFAULT_CURRENCY).then((currency) => {
      if (!currency) {
        const [locale] = getLocales();
        if (locale.currencyCode) {
          database.localStorage.set(STORAGE_KEYS.DEFAULT_CURRENCY, locale.currencyCode);
        }
      } else if (typeof currency === 'string') {
        setDefaultCurrency(currency);
      }
    });
  }, []);

  const updateTransactionsCurrency = async (newBaseCurrency: string) => {
    const transactionsCollection =
      database.collections.get<TransactionModel>('transactions');
    const transactions = await transactionsCollection.query().fetch();

    await database.write(async () => {
      for (const transaction of transactions) {
        const { currencyCode, amount } = transaction;
        const exchangeRate = await getCurrencyConversion(newBaseCurrency, currencyCode);

        if (exchangeRate) {
          await transaction.update((record) => {
            record.baseCurrencyCode = newBaseCurrency;
            record.amountInBaseCurrency = amount * exchangeRate;
            record.exchangeRate = exchangeRate;
          });
        }
      }
    });
  };

  const handleSetDefaultCurrency = async (currency: string) => {
    await database.localStorage.set(STORAGE_KEYS.DEFAULT_CURRENCY, currency);
    setDefaultCurrency(currency);
    await updateTransactionsCurrency(currency);
  };

  return {
    defaultCurrency,
    setDefaultCurrency: handleSetDefaultCurrency,
  };
};
