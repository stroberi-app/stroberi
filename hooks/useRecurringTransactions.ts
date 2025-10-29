import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { checkAndCreateDueTransactions } from '../database/helpers';
import { useDefaultCurrency } from './useDefaultCurrency';

export const useRecurringTransactions = () => {
  const { defaultCurrency } = useDefaultCurrency();
  const hasRunInitialCheck = useRef(false);

  const checkDueTransactions = useCallback(async () => {
    if (!defaultCurrency) return;

    try {
      const created = await checkAndCreateDueTransactions(defaultCurrency);
      if (created.length > 0) {
        console.log(`Created ${created.length} recurring transactions`);
      }
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
