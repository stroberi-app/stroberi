import type { CategoryModel } from '../database/category-model';

type CategorySelection = CategoryModel | CategoryModel[] | null;
type CategorySelectionHandler = (category: CategorySelection) => void;

const handlers = new Map<string, CategorySelectionHandler>();

export const registerCategorySelectionHandler = (
  id: string,
  handler: CategorySelectionHandler
) => {
  handlers.set(id, handler);
  return () => {
    handlers.delete(id);
  };
};

export const selectCategoryForHandler = (
  id: string,
  category: CategorySelection
) => {
  handlers.get(id)?.(category);
};
