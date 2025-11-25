import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text, writer } from '@nozbe/watermelondb/decorators';

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export class BudgetModel extends Model {
  static table = 'budgets';

  @text('name') name: string;
  @field('amount') amount: number;
  @text('period') period: BudgetPeriod;
  @date('startDate') startDate: Date;
  @field('rollover') rollover: boolean;
  @field('isActive') isActive: boolean;
  @field('alertThreshold') alertThreshold: number;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;

  @writer async toggle() {
    return this.update((record) => {
      record.isActive = !record.isActive;
    });
  }

  @writer deleteBudget() {
    return this.markAsDeleted();
  }

  @writer async updateBudget(payload: {
    name: string;
    amount: number;
    period: BudgetPeriod;
    startDate: Date;
    rollover: boolean;
    alertThreshold: number;
  }) {
    return this.update((record) => {
      record.name = payload.name;
      record.amount = payload.amount;
      record.period = payload.period;
      record.startDate = payload.startDate;
      record.rollover = payload.rollover;
      record.alertThreshold = payload.alertThreshold;
    });
  }
}
