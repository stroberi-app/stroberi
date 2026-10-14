import { Model, type Query } from '@nozbe/watermelondb';
import { children, date, field, readonly, text } from '@nozbe/watermelondb/decorators';
import type { Cadence } from '../lib/recurrence';
import type { BudgetCategoryModel } from './budget-category-model';

export type BudgetPeriod = Exclude<Cadence, 'daily'>;

export class BudgetModel extends Model {
  static table = 'budgets';

  static associations = {
    budget_categories: { type: 'has_many' as const, foreignKey: 'budget_id' },
  };

  @text('name') name: string;
  @field('amount') amount: number;
  @text('period') period: BudgetPeriod;
  @date('startDate') startDate: Date;
  @field('rollover') rollover: boolean;
  @field('isActive') isActive: boolean;
  @field('alertThreshold') alertThreshold: number;

  @children('budget_categories') budgetCategories: Query<BudgetCategoryModel>;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
