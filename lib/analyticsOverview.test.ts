import type { BudgetCategoryModel } from '../database/budget-category-model';
import type { BudgetModel } from '../database/budget-model';
import { calculateGlobalMonthlyBudgetLimit } from './analyticsOverview';

describe('calculateGlobalMonthlyBudgetLimit', () => {
  it('sums only active monthly budgets without category scopes', () => {
    const budgets = [
      { id: 'monthly-global-1', amount: 250, period: 'monthly' },
      { id: 'monthly-global-2', amount: 100, period: 'monthly' },
      { id: 'weekly-global', amount: 80, period: 'weekly' },
      { id: 'yearly-global', amount: 1200, period: 'yearly' },
      { id: 'monthly-scoped', amount: 500, period: 'monthly' },
    ] as Array<Pick<BudgetModel, 'id' | 'amount' | 'period'>>;

    const budgetCategories = [{ budgetId: 'monthly-scoped' }] as Array<
      Pick<BudgetCategoryModel, 'budgetId'>
    >;

    expect(calculateGlobalMonthlyBudgetLimit(budgets, budgetCategories)).toBe(350);
  });

  it('returns undefined when there is no safe global monthly aggregate', () => {
    const budgets = [
      { id: 'weekly-only', amount: 80, period: 'weekly' },
      { id: 'monthly-scoped', amount: 500, period: 'monthly' },
    ] as Array<Pick<BudgetModel, 'id' | 'amount' | 'period'>>;

    const budgetCategories = [{ budgetId: 'monthly-scoped' }] as Array<
      Pick<BudgetCategoryModel, 'budgetId'>
    >;

    expect(calculateGlobalMonthlyBudgetLimit(budgets, budgetCategories)).toBe(undefined);
  });
});
