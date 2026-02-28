import { Model, type Relation } from '@nozbe/watermelondb';
import {
  date,
  field,
  readonly,
  relation,
  text,
  writer,
} from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';
import type { ConversionStatus } from '../lib/currencyConversion';
import type { CategoryModel } from './category-model';
import type { RecurringTransactionModel } from './recurring-transaction-model';
import type { TripModel } from './trip-model';

export class TransactionModel extends Model {
  static table = 'transactions';
  static associations: Associations = {
    categories: {
      key: 'categoryId',
      type: 'belongs_to',
    },
    recurring_transactions: {
      key: 'recurringTransactionId',
      type: 'belongs_to',
    },
    trips: {
      key: 'tripId',
      type: 'belongs_to',
    },
  };

  @text('merchant') merchant: string;
  @text('note') note: string;
  @text('currencyCode') currencyCode: string;
  @field('amount') amount: number;
  @text('baseCurrencyCode') baseCurrencyCode: string;
  @field('amountInBaseCurrency') amountInBaseCurrency: number;
  @field('exchangeRate') exchangeRate: number;
  @text('conversionStatus') conversionStatus: ConversionStatus | null;
  @text('recurringTransactionId') recurringTransactionId: string | null;
  @text('tripId') tripId: string | null;

  @date('date') date: Date;

  @relation('categories', 'categoryId') category: Relation<CategoryModel> | null;
  @relation('recurring_transactions', 'recurringTransactionId')
  recurringTransaction: Relation<RecurringTransactionModel> | null;
  @relation('trips', 'tripId') trip: Relation<TripModel> | null;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;

  @writer deleteTx() {
    return this.markAsDeleted();
  }
}
