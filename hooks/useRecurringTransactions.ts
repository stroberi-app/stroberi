import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { checkAndCreateDueTransactions } from '../database/actions/recurring-transactions';

export const useRecurringTransactions = (defaultCurrency: string | null) => {
  const hasRunInitialCheck = useRef(false);

  const checkDueTransactions = useCallback(async () => {
    if (!defaultCurrency) return;

    try {
      await checkAndCreateDueTransactions(defaultCurrency);
    } catch (error) {
      console.error('Failed to check recurring transactions:', error);
    }
  }, [defaultCurrency]);

  useEffect(() => {
    if (!hasRunInitialCheck.current && defaultCurrency) {
      checkDueTransactions();
      hasRunInitialCheck.current = true;
    }
  }, [defaultCurrency, checkDueTransactions]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && defaultCurrency) {
        checkDueTransactions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [defaultCurrency, checkDueTransactions]);

  return { checkDueTransactions };
};
