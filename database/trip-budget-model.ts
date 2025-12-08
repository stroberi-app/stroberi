import { Model, type Query, type Relation } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  readonly,
  relation,
  text,
  writer,
} from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';
import type { TripBudgetCategoryModel } from './trip-budget-category-model';
import type { TripModel } from './trip-model';

export type TripBudgetType = 'overall' | 'category';

export class TripBudgetModel extends Model {
  static table = 'trip_budgets';

  static associations: Associations = {
    trip_budget_categories: {
      type: 'has_many',
      foreignKey: 'trip_budget_id',
    },
    trips: {
      type: 'belongs_to',
      key: 'trip_id',
    },
  };

  @text('name') name: string;
  @text('trip_id') tripId: string;
  @field('amount') amount: number;
  @text('currencyCode') currencyCode: string;
  @text('type') type: TripBudgetType;
  @field('alertThreshold') alertThreshold: number;
  @field('isActive') isActive: boolean;

  @relation('trips', 'trip_id') trip: Relation<TripModel>;
  @children('trip_budget_categories')
  tripBudgetCategories: Query<TripBudgetCategoryModel>;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;

  @writer async toggle() {
    return this.update((record) => {
      record.isActive = !record.isActive;
    });
  }

  @writer async updateBudget(payload: {
    name: string;
    amount: number;
    currencyCode: string;
    type: TripBudgetType;
    alertThreshold: number;
    isActive: boolean;
  }) {
    return this.update((record) => {
      record.name = payload.name;
      record.amount = payload.amount;
      record.currencyCode = payload.currencyCode;
      record.type = payload.type;
      record.alertThreshold = payload.alertThreshold;
      record.isActive = payload.isActive;
    });
  }
}
