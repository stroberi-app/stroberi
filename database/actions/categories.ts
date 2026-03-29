import { Q } from '@nozbe/watermelondb';
import type { BudgetCategoryModel } from '../budget-category-model';
import type { CategoryModel } from '../category-model';
import { database } from '../index';
import type { RecurringTransactionModel } from '../recurring-transaction-model';
import type { TransactionModel } from '../transaction-model';
import { findRecordOrThrow, logAndRethrow } from './shared';

export const createCategory = async ({
  name,
  icon,
}: {
  name: string;
  icon: string;
}): Promise<CategoryModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<CategoryModel>('categories');

      return collection.create((category) => {
        category.name = name;
        category.icon = icon;
        category.usageCount = 0;
      });
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to create category:',
      error,
      'Failed to create category'
    );
  }
};

export const createCategoriesBatch = async (
  categories: Array<{ name: string; icon: string }>
): Promise<CategoryModel[]> => {
  if (!categories.length) {
    return [];
  }

  try {
    return await database.write(async () => {
      const collection = database.get<CategoryModel>('categories');
      const preparedCategories = categories.map(({ name, icon }) =>
        collection.prepareCreate((category) => {
          category.name = name;
          category.icon = icon;
          category.usageCount = 0;
        })
      );

      await database.batch(...preparedCategories);
      return preparedCategories;
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to create categories batch:',
      error,
      'Failed to create categories'
    );
  }
};

export const updateCategory = async ({
  id,
  name,
  icon,
}: {
  id: string;
  name: string;
  icon: string;
}): Promise<CategoryModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<CategoryModel>('categories');
      const category = await findRecordOrThrow(collection, id, 'Category');

      return await category.update((record) => {
        record.name = name;
        record.icon = icon;
      });
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to update category:',
      error,
      'Failed to update category'
    );
  }
};

export const deleteCategory = async (categoryId: string): Promise<CategoryModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<CategoryModel>('categories');
      const category = await findRecordOrThrow(collection, categoryId, 'Category');

      const [transactionCount, recurringCount, budgetCount] = await Promise.all([
        database
          .get<TransactionModel>('transactions')
          .query(Q.where('categoryId', categoryId))
          .fetchCount(),
        database
          .get<RecurringTransactionModel>('recurring_transactions')
          .query(Q.where('categoryId', categoryId))
          .fetchCount(),
        database
          .get<BudgetCategoryModel>('budget_categories')
          .query(Q.where('category_id', categoryId))
          .fetchCount(),
      ]);

      if (transactionCount > 0 || recurringCount > 0 || budgetCount > 0) {
        throw new Error(
          'This category is still being used. Reassign or remove its linked transactions, budgets, and recurring items before deleting it.'
        );
      }

      await category.markAsDeleted();
      return category;
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to delete category:',
      error,
      'Failed to delete category'
    );
  }
};
