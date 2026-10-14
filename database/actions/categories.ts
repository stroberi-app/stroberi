import { Q } from '@nozbe/watermelondb';
import { DEFAULT_CATEGORIES } from '../../data/defaultCategories';
import type { CategoryModel } from '../category-model';
import { database } from '../index';
import { collection, findRecordOrThrow, runWriteAction } from './shared';

type CategoryInput = { name: string; icon: string };

export class DuplicateCategoryError extends Error {
  constructor() {
    super('A category with this name already exists');
    this.name = 'DuplicateCategoryError';
  }
}

const normalizeName = (name: string) => name.trim().toLowerCase();

/** Category names are unique, ignoring case and surrounding whitespace. */
const assertNameAvailable = async (name: string, exceptId?: string) => {
  const categories = await collection('categories').query().fetch();
  const taken = categories.some(
    (category) =>
      category.id !== exceptId && normalizeName(category.name) === normalizeName(name)
  );

  if (taken) {
    throw new DuplicateCategoryError();
  }
};

const prepareCategory = ({ name, icon }: CategoryInput) =>
  collection('categories').prepareCreate((category) => {
    category.name = name;
    category.icon = icon;
    category.usageCount = 0;
  });

const findCategory = (id: string) =>
  findRecordOrThrow(collection('categories'), id, 'Category');

export const createCategory = (input: CategoryInput): Promise<CategoryModel> =>
  runWriteAction('create category', async () => {
    await assertNameAvailable(input.name);
    const category = prepareCategory(input);
    await database.batch(category);
    return category;
  });

export const createCategoriesBatch = async (
  categories: CategoryInput[]
): Promise<CategoryModel[]> => {
  if (!categories.length) {
    return [];
  }

  return runWriteAction('create categories', async () => {
    const prepared = categories.map(prepareCategory);
    await database.batch(...prepared);
    return prepared;
  });
};

/** Seeds the default category set on first launch; a no-op afterwards. */
export const seedDefaultCategories = (): Promise<CategoryModel[]> =>
  runWriteAction('seed default categories', async () => {
    if ((await collection('categories').query().fetchCount()) > 0) {
      return [];
    }

    const prepared = DEFAULT_CATEGORIES.map(prepareCategory);
    await database.batch(...prepared);
    return prepared;
  });

export const updateCategory = ({
  id,
  ...input
}: { id: string } & CategoryInput): Promise<CategoryModel> =>
  runWriteAction('update category', async () => {
    const category = await findCategory(id);
    await assertNameAvailable(input.name, id);

    return category.update((record) => {
      record.name = input.name;
      record.icon = input.icon;
    });
  });

export const deleteCategory = (categoryId: string): Promise<CategoryModel> =>
  runWriteAction('delete category', async () => {
    const category = await findCategory(categoryId);
    const linkCounts = await Promise.all([
      collection('transactions').query(Q.where('categoryId', categoryId)).fetchCount(),
      collection('recurring_transactions')
        .query(Q.where('categoryId', categoryId))
        .fetchCount(),
      collection('budget_categories')
        .query(Q.where('category_id', categoryId))
        .fetchCount(),
    ]);

    if (linkCounts.some((count) => count > 0)) {
      throw new Error(
        'This category is still being used. Reassign or remove its linked transactions, budgets, and recurring items before deleting it.'
      );
    }

    await category.markAsDeleted();
    return category;
  });
