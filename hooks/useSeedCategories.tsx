import { useEffect } from 'react';
import { database } from '../database';
import { CategoryModel } from '../database/category-model';
import { DEFAULT_CATEGORIES } from '../data/defaultCategories';

export const useSeedCategories = () => {
  useEffect(() => {
    (async () => {
      const existingCategories = await database.collections
        .get<CategoryModel>('categories')
        .query()
        .fetch();

      if (existingCategories.length === 0) {
        await database.write(async () => {
          for (const category of DEFAULT_CATEGORIES) {
            await database.collections.get<CategoryModel>('categories').create(newCategory => {
              newCategory.name = category.name;
              newCategory.icon = category.icon;
            });
          }
        });
      }
    })();
  }, []);
};
