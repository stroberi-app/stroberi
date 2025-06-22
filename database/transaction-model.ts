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
import type { CategoryModel } from './category-model';

export class TransactionModel extends Model {
  static table = 'transactions';
  static associations: Associations = {
    categories: {
      key: 'id',
      type: 'belongs_to',
    },
  };

  @text('merchant') merchant: string;
  @text('note') note: string;
  @text('currencyCode') currencyCode: string; // Existing field for original currency
  @field('amount') amount: number; // Original amount in the transaction's currency
  @text('baseCurrencyCode') baseCurrencyCode: string; // New field for the base currency
  @field('amountInBaseCurrency') amountInBaseCurrency: number; // New field for amount in base currency
  @field('exchangeRate') exchangeRate: number; // New field for the exchange rate used

  @date('date') date: Date;

  @relation('categories', 'categoryId') category: Relation<CategoryModel> | null;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;

  @writer deleteTx() {
    return this.markAsDeleted();
  }
}
