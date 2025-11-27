import { Model, type Relation } from '@nozbe/watermelondb';
import { immutableRelation, text } from '@nozbe/watermelondb/decorators';
import type { BudgetModel } from './budget-model';
import type { CategoryModel } from './category-model';

export class BudgetCategoryModel extends Model {
  static table = 'budget_categories';

  static associations = {
    budgets: { type: 'belongs_to' as const, key: 'budget_id' },
    categories: { type: 'belongs_to' as const, key: 'category_id' },
  };

  @text('budget_id') budgetId: string;
  @text('category_id') categoryId: string;

  @immutableRelation('budgets', 'budget_id') budget: Relation<BudgetModel>;
  @immutableRelation('categories', 'category_id') category: Relation<CategoryModel>;
}

