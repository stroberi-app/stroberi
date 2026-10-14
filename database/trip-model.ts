import { Model, type Query } from '@nozbe/watermelondb';
import { children, date, field, readonly, text } from '@nozbe/watermelondb/decorators';
import type { TransactionModel } from './transaction-model';

export class TripModel extends Model {
  static table = 'trips';

  static associations = {
    transactions: { type: 'has_many' as const, foreignKey: 'tripId' },
  };

  @text('name') name: string;
  @text('icon') icon: string;
  @text('currencyCode') currencyCode: string | null;
  @date('startDate') startDate: Date;
  @date('endDate') endDate: Date | null;
  @field('isArchived') isArchived: boolean;

  @children('transactions') transactions: Query<TransactionModel>;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
