import { Model, type Query } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  readonly,
  text,
  writer,
} from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';
import type { TripBudgetModel } from './trip-budget-model';
import type { TransactionModel } from './transaction-model';

export class TripModel extends Model {
  static table = 'trips';

  static associations: Associations = {
    transactions: { type: 'has_many', foreignKey: 'tripId' },
    trip_budgets: { type: 'has_many', foreignKey: 'trip_id' },
  };

  @text('name') name: string;
  @text('homeCurrencyCode') homeCurrencyCode: string;
  @date('startDate') startDate: Date | null;
  @date('endDate') endDate: Date | null;
  @field('isArchived') isArchived: boolean;

  @children('transactions') transactions!: Query<TransactionModel>;
  @children('trip_budgets') tripBudgets!: Query<TripBudgetModel>;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;

  @writer archive() {
    return this.update((record) => {
      record.isArchived = true;
    });
  }

  @writer updateTrip(payload: {
    name: string;
    homeCurrencyCode: string;
    startDate: Date | null;
    endDate: Date | null;
    isArchived: boolean;
  }) {
    return this.update((record) => {
      record.name = payload.name;
      record.homeCurrencyCode = payload.homeCurrencyCode;
      record.startDate = payload.startDate;
      record.endDate = payload.endDate;
      record.isArchived = payload.isArchived;
    });
  }
}
