import type { BudgetModel, BudgetPeriod } from '../../database/budget-model';
import type { CategoryModel } from '../../database/category-model';
import { formatBudgetPeriod } from '../../lib/budgetUtils';

export type BudgetFormState = {
  alertThreshold: number;
  amount: string;
  name: string;
  period: BudgetPeriod;
  rollover: boolean;
  selectedCategories: CategoryModel[];
  startDate: Date;
};

export const getStartOfBudgetPeriod = (period: BudgetPeriod): Date => {
  const now = new Date();

  if (period === 'weekly') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (period === 'yearly') {
    return new Date(now.getFullYear(), 0, 1);
  }

  return now;
};

export const getDefaultBudgetFormState = (): BudgetFormState => {
  const period: BudgetPeriod = 'monthly';

  return {
    name: '',
    amount: '',
    period,
    startDate: getStartOfBudgetPeriod(period),
    rollover: false,
    alertThreshold: 90,
    selectedCategories: [],
  };
};

export const buildBudgetFormState = async (
  budget: BudgetModel | null | undefined
): Promise<BudgetFormState> => {
  if (!budget) {
    return getDefaultBudgetFormState();
  }

  const budgetCategories = await budget.budgetCategories.fetch();
  const categories = await Promise.all(
    budgetCategories.map((budgetCategory) => budgetCategory.category.fetch())
  );

  return {
    name: budget.name || '',
    amount: budget.amount.toString(),
    period: budget.period,
    startDate: budget.startDate,
    rollover: budget.rollover,
    alertThreshold: budget.alertThreshold,
    selectedCategories: categories.filter(Boolean) as CategoryModel[],
  };
};

export const parseBudgetAmount = (amount: string) => {
  if (!amount.trim()) {
    return null;
  }

  const nextAmount = Number(amount);
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    return null;
  }

  return nextAmount;
};

export const buildBudgetPayload = ({
  name,
  amount,
  period,
  startDate,
  rollover,
  alertThreshold,
  selectedCategories,
}: {
  name: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  rollover: boolean;
  alertThreshold: number;
  selectedCategories: CategoryModel[];
}) => {
  return {
    name: name.trim() || `${formatBudgetPeriod(period)} Budget`,
    amount,
    period,
    startDate,
    rollover,
    alertThreshold,
    categoryIds: selectedCategories.map((category) => category.id),
  };
};
