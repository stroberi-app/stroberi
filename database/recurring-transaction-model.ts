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
import dayjs from 'dayjs';
import '../lib/date';
import type { CategoryModel } from './category-model';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

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

  @writer async toggle() {
    return this.update((record) => {
      record.isActive = !record.isActive;
    });
  }

  @writer async updateNextDueDate(nextDate: Date) {
    return this.update((record) => {
      record.nextDueDate = nextDate;
    });
  }

  @writer async markAsCreated(createdDate: Date) {
    return this.update((record) => {
      record.lastCreatedDate = createdDate;
    });
  }

  @writer deleteRecurring() {
    return this.markAsDeleted();
  }

  calculateNextDueDate(fromDate: Date = new Date()): Date {
    const current = dayjs(fromDate);

    switch (this.frequency) {
      case 'daily':
        return current.add(1, 'day').toDate();
      case 'weekly':
        return current.add(1, 'week').toDate();
      case 'monthly':
        return current.add(1, 'month').toDate();
      case 'yearly':
        return current.add(1, 'year').toDate();
      default:
        return current.add(1, 'month').toDate();
    }
  }

  isDue(): boolean {
    if (!this.isActive) return false;
    if (this.endDate && dayjs().isAfter(dayjs(this.endDate))) return false;
    return dayjs().isSameOrAfter(dayjs(this.nextDueDate), 'day');
  }
}
