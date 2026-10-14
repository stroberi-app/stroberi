import { Model, type Relation } from '@nozbe/watermelondb';
import { date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';
import type { Cadence } from '../lib/recurrence';
import type { CategoryModel } from './category-model';

export type RecurringFrequency = Cadence;

export class RecurringTransactionModel extends Model {
  static table = 'recurring_transactions';
  static associations: Associations = {
    categories: {
      key: 'categoryId',
      type: 'belongs_to',
    },
  };

  @text('merchant') merchant: string;
  @field('amount') amount: number;
  @text('currencyCode') currencyCode: string;
  @text('note') note: string;
  @text('frequency') frequency: RecurringFrequency;
  @date('startDate') startDate: Date;
  @date('endDate') endDate: Date | null;
  @date('nextDueDate') nextDueDate: Date;
  @date('lastCreatedDate') lastCreatedDate: Date | null;
  @field('isActive') isActive: boolean;

  @relation('categories', 'categoryId') category: Relation<CategoryModel> | null;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
