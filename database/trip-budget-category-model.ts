import { Model, type Relation } from '@nozbe/watermelondb';
import { immutableRelation, text } from '@nozbe/watermelondb/decorators';
import type { TripBudgetModel } from './trip-budget-model';
import type { CategoryModel } from './category-model';

export class TripBudgetCategoryModel extends Model {
  static table = 'trip_budget_categories';

  static associations = {
    trip_budgets: { type: 'belongs_to' as const, key: 'trip_budget_id' },
    categories: { type: 'belongs_to' as const, key: 'category_id' },
  };

  @text('trip_budget_id') tripBudgetId: string;
  @text('category_id') categoryId: string;

  @immutableRelation('trip_budgets', 'trip_budget_id')
  tripBudget: Relation<TripBudgetModel>;
  @immutableRelation('categories', 'category_id') category: Relation<CategoryModel>;
}
