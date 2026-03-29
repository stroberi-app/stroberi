import { getLocales } from 'expo-localization';
import { useEffect, useState } from 'react';
import { database } from '../database';
import type { TransactionModel } from '../database/transaction-model';
import { getCurrencyConversion } from '../lib/currencyConversionService';
import type { ConversionResult } from '../lib/currencyConversion';
import { STORAGE_KEYS } from '../lib/storageKeys';

let defaultCurrencyListeners: Array<(currency: string | null) => void> = [];

const notifyDefaultCurrencyChanged = (currency: string | null) => {
  defaultCurrencyListeners.forEach((listener) => listener(currency));
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
          return [
            currencyCode,
            { rate: 1, status: 'ok' } satisfies ConversionResult,
          ] as const;
        }

        const conversion = await getCurrencyConversion(newBaseCurrency, currencyCode);

        return [currencyCode, conversion] as const;
      })
    );

    return new Map(rateEntries.filter(Boolean) as [string, ConversionResult][]);
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
        const conversion = exchangeRates.get(transaction.currencyCode);
        if (!conversion) {
          return [];
        }

        const exchangeRate = conversion.rate;
        const conversionStatus = conversion.status;
        const isMissingRate =
          transaction.currencyCode !== newBaseCurrency && exchangeRate === null;

        return [
          transaction.prepareUpdate((record) => {
            record.baseCurrencyCode = newBaseCurrency;
            if (isMissingRate) {
              record.amountInBaseCurrency = transaction.amount;
              record.exchangeRate = 1;
              record.conversionStatus = 'missing_rate';
              return;
            }

            record.amountInBaseCurrency = transaction.amount * (exchangeRate ?? 1);
            record.exchangeRate = exchangeRate ?? 1;
            record.conversionStatus = conversionStatus;
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
    isDefaultCurrencyLoaded,
  };
};
