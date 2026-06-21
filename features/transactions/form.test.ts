import type { TransactionModel } from '../../database/transaction-model';
import { shouldFocusTransactionAmountInput } from './form';

const existingTransaction = {
  id: 'existing-transaction',
} as unknown as TransactionModel;

describe('transaction form helpers', () => {
  describe('shouldFocusTransactionAmountInput', () => {
    it('does not auto-focus new transaction amounts on Android', () => {
      expect(
        shouldFocusTransactionAmountInput({
          platform: 'android',
          transaction: null,
        })
      ).toBe(false);
    });

    it('keeps auto-focus for new transaction amounts on iOS', () => {
      expect(
        shouldFocusTransactionAmountInput({
          platform: 'ios',
          transaction: null,
        })
      ).toBe(true);
    });

    it('does not auto-focus while editing an existing transaction', () => {
      expect(
        shouldFocusTransactionAmountInput({
          platform: 'ios',
          transaction: existingTransaction,
        })
      ).toBe(false);
    });
  });
});
