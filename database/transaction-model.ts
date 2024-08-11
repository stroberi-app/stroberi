import { Model, Relation } from '@nozbe/watermelondb';
import { field, readonly, relation, text, writer, date } from '@nozbe/watermelondb/decorators';
import { CategoryModel } from './category-model';

export class TransactionModel extends Model {
  static table = 'transactions';

  @text('merchant') merchant: string;
  @text('note') note: string;
  @text('currencyCode') currencyCode: string;
  @field('amount') amount: number;
  @date('date') date: Date;

  @relation('categories', 'categoryId') categoryId: Relation<CategoryModel> | null;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;

  @writer deleteTx() {
    return this.markAsDeleted();
  }
}
