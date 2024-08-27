import { useEffect, useState } from 'react';
import { database } from '../database';
import { getLocales } from 'expo-localization';
import { getCurrencyConversion } from '../hooks/useCurrencyApi';
import { TransactionModel } from '../database/transaction-model';

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

  const updateTransactionsCurrency = async (newBaseCurrency: string) => {
    const transactionsCollection = database.collections.get<TransactionModel>('transactions');
    const transactions = await transactionsCollection.query().fetch();

    await database.write(async () => {
      for (const transaction of transactions) {
        const { currencyCode, amount } = transaction;
        const exchangeRate = await getCurrencyConversion(newBaseCurrency, currencyCode);

        if (exchangeRate) {
          await transaction.update(record => {
            record.baseCurrencyCode = newBaseCurrency;
            record.amountInBaseCurrency = amount * exchangeRate;
            record.exchangeRate = exchangeRate;
          });
        }
      }
    });
  };

  const handleSetDefaultCurrency = async (currency: string) => {
    await database.localStorage.set('defaultCurrency', currency);
    setDefaultCurrency(currency);
    await updateTransactionsCurrency(currency);
  };

  return {
    defaultCurrency,
    setDefaultCurrency: handleSetDefaultCurrency,
  };
};
