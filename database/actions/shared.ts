import type { Collection, Model } from '@nozbe/watermelondb';
import type { CategoryModel } from '../category-model';
import { database } from '../index';

export const toError = (error: unknown, fallbackMessage: string) => {
  return error instanceof Error ? error : new Error(fallbackMessage);
};

export const logAndRethrow = (
  message: string,
  error: unknown,
  fallbackMessage: string
): never => {
  console.error(message, error);
  throw toError(error, fallbackMessage);
};

export const findRecordOrThrow = async <T extends Model>(
  collection: Collection<T>,
  id: string,
  label: string
): Promise<T> => {
  try {
    return await collection.find(id);
  } catch {
    throw new Error(`${label} not found: ${id}`);
  }
};

export const findCategoryOrThrow = async (categoryId: string | null) => {
  if (!categoryId) {
    return null;
  }

  try {
    return await database.get<CategoryModel>('categories').find(categoryId);
  } catch {
    throw new Error(`Category not found: ${categoryId}`);
  }
};
