import type { BudgetModel } from '../../database/budget-model';
import type { CategoryModel } from '../../database/category-model';
import { buildBudgetFormState } from './budgetFormUtils';

describe('buildBudgetFormState', () => {
  const initialCategory = { id: 'food' } as CategoryModel;

  it('preselects categories for a new budget', async () => {
    const state = await buildBudgetFormState(undefined, [initialCategory]);

    expect(state.selectedCategories).toEqual([initialCategory]);
  });

  it('uses persisted categories when editing a budget', async () => {
    const persistedCategory = { id: 'rent' } as CategoryModel;
    const budget = {
      name: 'Rent',
      amount: 1000,
      period: 'monthly',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      rollover: false,
      alertThreshold: 90,
      budgetCategories: {
        fetch: async () => [
          { category: { fetch: async () => persistedCategory } },
        ],
      },
    } as unknown as BudgetModel;

    const state = await buildBudgetFormState(budget, [initialCategory]);

    expect(state.selectedCategories).toEqual([persistedCategory]);
  });
});
