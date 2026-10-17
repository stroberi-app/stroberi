import type { Model } from '@nozbe/watermelondb';
import type { BudgetModel, BudgetPeriod } from '../budget-model';
import { database } from '../index';
import { collection, findRecordOrThrow, runWriteAction } from './shared';

export type CreateBudgetPayload = {
  name: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  rollover: boolean;
  alertThreshold: number;
  categoryIds?: string[];
};

const assignBudget = (record: BudgetModel, payload: CreateBudgetPayload) => {
  record.name = payload.name;
  record.amount = payload.amount;
  record.period = payload.period;
  record.startDate = payload.startDate;
  record.rollover = payload.rollover;
  record.alertThreshold = payload.alertThreshold;
};

const prepareBudgetCategories = (budgetId: string, categoryIds: string[] = []) =>
  categoryIds.map((categoryId) =>
    collection('budget_categories').prepareCreate((record) => {
      record.budgetId = budgetId;
      record.categoryId = categoryId;
    })
  );

const prepareBudgetCategoriesRemoval = async (budget: BudgetModel) =>
  (await budget.budgetCategories.fetch()).map((link) => link.prepareMarkAsDeleted());

const findBudget = (id: string) => findRecordOrThrow(collection('budgets'), id, 'Budget');

export const createBudget = (payload: CreateBudgetPayload): Promise<BudgetModel> =>
  runWriteAction('create budget', async () => {
    const budget = collection('budgets').prepareCreate((record) => {
      assignBudget(record, payload);
      record.isActive = true;
    });

    await database.batch(
      budget,
      ...prepareBudgetCategories(budget.id, payload.categoryIds)
    );
    return budget;
  });

export const updateBudget = ({
  id,
  ...payload
}: { id: string } & CreateBudgetPayload): Promise<BudgetModel> =>
  runWriteAction('update budget', async () => {
    const budget = await findBudget(id);
    const records: Model[] = [
      budget.prepareUpdate((record) => assignBudget(record, payload)),
      ...(await prepareBudgetCategoriesRemoval(budget)),
      ...prepareBudgetCategories(budget.id, payload.categoryIds),
    ];

    await database.batch(...records);
    return budget;
  });

export const deleteBudget = (budgetId: string): Promise<BudgetModel> =>
  runWriteAction('delete budget', async () => {
    const budget = await findBudget(budgetId);

    await database.batch(
      budget.prepareMarkAsDeleted(),
      ...(await prepareBudgetCategoriesRemoval(budget))
    );
    return budget;
  });
