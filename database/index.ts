import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Platform } from 'react-native';
import { BudgetCategoryModel } from './budget-category-model';
import { BudgetModel } from './budget-model';
import { CategoryModel } from './category-model';
import { migrations } from './migrations';
import { RecurringTransactionModel } from './recurring-transaction-model';
import { schema } from './schema';
import { TransactionModel } from './transaction-model';

const adapter = new SQLiteAdapter({
  schema,
  jsi: Platform.OS === 'ios',
  migrations,
});

export const database = new Database({
  adapter,
  modelClasses: [
    TransactionModel,
    CategoryModel,
    RecurringTransactionModel,
    BudgetModel,
    BudgetCategoryModel,
  ],
});
