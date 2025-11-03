import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { database } from '../database/index';

let budgetingEnabledListeners: Array<(enabled: boolean) => void> = [];

export const notifyBudgetingEnabledChanged = (enabled: boolean) => {
  budgetingEnabledListeners.forEach((listener) => listener(enabled));
};

export const useBudgetingEnabled = () => {
  const [budgetingEnabled, setBudgetingEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBudgetingSetting = async () => {
      try {
        const enabled = await database.localStorage.get('budgeting_enabled');
        setBudgetingEnabled(enabled !== 'false');
      } finally {
        setIsLoading(false);
      }
    };
    loadBudgetingSetting();

    budgetingEnabledListeners.push(setBudgetingEnabled);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadBudgetingSetting();
      }
    });

    return () => {
      budgetingEnabledListeners = budgetingEnabledListeners.filter(
        (listener) => listener !== setBudgetingEnabled
      );
      subscription.remove();
    };
  }, []);

  return { budgetingEnabled, isLoading };
};
