import { TransactionModel } from './transaction-model';

describe('TransactionModel associations', () => {
  it('uses correct foreign keys for belongs_to associations', () => {
    expect(TransactionModel.associations.categories).toEqual({
      key: 'categoryId',
      type: 'belongs_to',
    });
    expect(TransactionModel.associations.recurring_transactions).toEqual({
      key: 'recurringTransactionId',
      type: 'belongs_to',
    });
    expect(TransactionModel.associations.trips).toEqual({
      key: 'tripId',
      type: 'belongs_to',
    });
  });
});
