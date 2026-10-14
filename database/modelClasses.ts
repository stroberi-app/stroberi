import { BudgetCategoryModel } from './budget-category-model';
import { BudgetModel } from './budget-model';
import { CategoryModel } from './category-model';
import { RecurringTransactionModel } from './recurring-transaction-model';
import { TransactionModel } from './transaction-model';
import { TripModel } from './trip-model';

export const modelClasses = [
  TransactionModel,
  CategoryModel,
  RecurringTransactionModel,
  BudgetModel,
  BudgetCategoryModel,
  TripModel,
];
