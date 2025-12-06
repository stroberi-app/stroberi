import { getLocales } from 'expo-localization';
import { useEffect, useState } from 'react';
import { database } from '../database';
import type { TransactionModel } from '../database/transaction-model';
import { getCurrencyConversion } from '../hooks/useCurrencyApi';
import { STORAGE_KEYS } from '../lib/storageKeys';

let defaultCurrencyListeners: Array<(currency: string | null) => void> = [];

const notifyDefaultCurrencyChanged = (currency: string | null) => {
  defaultCurrencyListeners.forEach((listener) => listener(currency));
};

export const useDefaultCurrency = () => {
  const [defaultCurrency, setDefaultCurrency] = useState<string | null>(null);
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);

  useEffect(() => {
    database.localStorage.get(STORAGE_KEYS.DEFAULT_CURRENCY).then((currency) => {
      if (!currency) {
        const [locale] = getLocales();
        if (locale.currencyCode) {
          database.localStorage.set(STORAGE_KEYS.DEFAULT_CURRENCY, locale.currencyCode);
          setDefaultCurrency(locale.currencyCode);
        }
      } else if (typeof currency === 'string') {
        setDefaultCurrency(currency);
      }
    });

    defaultCurrencyListeners.push(setDefaultCurrency);

    return () => {
      defaultCurrencyListeners = defaultCurrencyListeners.filter(
        (listener) => listener !== setDefaultCurrency
      );
    };
  }, []);

  const getExchangeRatesForTransactions = async (
    newBaseCurrency: string,
    transactions: TransactionModel[]
  ) => {
    const uniqueCurrencies = Array.from(
      new Set(transactions.map((transaction) => transaction.currencyCode))
    );

    const rateEntries = await Promise.all(
      uniqueCurrencies.map(async (currencyCode) => {
        if (currencyCode === newBaseCurrency) {
          return [currencyCode, 1] as const;
        }

        const exchangeRate = await getCurrencyConversion(newBaseCurrency, currencyCode);

        return exchangeRate ? ([currencyCode, exchangeRate] as const) : null;
      })
    );

    return new Map(rateEntries.filter(Boolean) as [string, number][]);
  };

  const updateTransactionsCurrency = async (newBaseCurrency: string) => {
    const transactionsCollection =
      database.collections.get<TransactionModel>('transactions');
    const transactions = await transactionsCollection.query().fetch();

    if (!transactions.length) {
      return;
    }

    const exchangeRates = await getExchangeRatesForTransactions(
      newBaseCurrency,
      transactions
    );

    if (!exchangeRates.size) {
      return;
    }

    await database.write(async () => {
      const updates = transactions.flatMap((transaction) => {
        const exchangeRate = exchangeRates.get(transaction.currencyCode);
        if (!exchangeRate) {
          return [];
        }

        return [
          transaction.prepareUpdate((record) => {
            record.baseCurrencyCode = newBaseCurrency;
            record.amountInBaseCurrency = transaction.amount * exchangeRate;
            record.exchangeRate = exchangeRate;
          }),
        ];
      });

      if (updates.length) {
        await database.batch(...updates);
      }
    });
  };

  const handleSetDefaultCurrency = async (currency: string) => {
    if (isUpdatingCurrency) {
      return;
    }

    setIsUpdatingCurrency(true);
    setDefaultCurrency(currency);
    notifyDefaultCurrencyChanged(currency);

    try {
      await database.localStorage.set(STORAGE_KEYS.DEFAULT_CURRENCY, currency);
      await updateTransactionsCurrency(currency);
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  return {
    defaultCurrency,
    setDefaultCurrency: handleSetDefaultCurrency,
    isUpdatingCurrency,
  };
};
