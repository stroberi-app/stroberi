import type { Collection, Model } from '@nozbe/watermelondb';
import type { BudgetCategoryModel } from '../budget-category-model';
import type { BudgetModel } from '../budget-model';
import type { CategoryModel } from '../category-model';
import { database } from '../index';
import type { RecurringTransactionModel } from '../recurring-transaction-model';
import type { TransactionModel } from '../transaction-model';
import type { TripModel } from '../trip-model';

type TableModels = {
  transactions: TransactionModel;
  categories: CategoryModel;
  recurring_transactions: RecurringTransactionModel;
  budgets: BudgetModel;
  budget_categories: BudgetCategoryModel;
  trips: TripModel;
};

/** Typed collection accessor: the table name determines the model type. */
export const collection = <Table extends keyof TableModels>(table: Table) =>
  database.get<TableModels[Table] & Model>(table);

/**
 * An expected refusal (e.g. a duplicate name) whose message is meant for the
 * user. Actions throw it without logging it as a failure.
 */
export class ActionRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionRejectedError';
  }
}

/**
 * Runs an action, logging unexpected failures and normalising whatever was
 * thrown into an `Error` so callers can always surface `error.message`.
 */
export const runAction = async <T>(
  action: string,
  work: () => Promise<T>
): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    if (!(error instanceof ActionRejectedError)) {
      console.error(`Failed to ${action}:`, error);
    }
    throw error instanceof Error ? error : new Error(`Failed to ${action}`);
  }
};

/**
 * `runAction` inside a single database writer. Writers must not be nested, so
 * `work` performs its updates directly (or via `database.batch`).
 */
export const runWriteAction = <T>(action: string, work: () => Promise<T>) =>
  runAction(action, () => database.write(work, action));

export const findRecordOrThrow = async <T extends Model>(
  records: Collection<T>,
  id: string,
  label: string
): Promise<T> => {
  try {
    return await records.find(id);
  } catch {
    throw new Error(`${label} not found: ${id}`);
  }
};

export const findCategoryOrThrow = async (categoryId: string | null) =>
  categoryId ? findRecordOrThrow(collection('categories'), categoryId, 'Category') : null;

/** Keeps `usageCount` (used to rank category pickers) in step with links. */
export const prepareCategoryUsageChange = (category: CategoryModel, delta: number) =>
  category.prepareUpdate((record) => {
    record.usageCount = Math.max(0, (record.usageCount || 0) + delta);
  });
