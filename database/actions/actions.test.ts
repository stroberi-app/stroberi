import { database } from '../index';
import type { ConversionResult } from '../../lib/currencyConversion';
import { createBudget, deleteBudget, updateBudget } from './budgets';
import {
  createCategory,
  deleteCategory,
  seedDefaultCategories,
  updateCategory,
} from './categories';
import {
  checkAndCreateDueTransactions,
  createRecurringTransaction,
  toggleRecurringTransaction,
} from './recurring-transactions';
import { collection } from './shared';
import {
  createTransaction,
  createTransactionsBatch,
  deleteTransaction,
  rebaseTransactionsToCurrency,
  updateTransaction,
} from './transactions';
import {
  createTrip,
  deleteTrip,
  getMostRecentActiveTrip,
  toggleTripArchive,
  updateTrip,
} from './trips';

jest.mock('../index', () => ({
  database: require('../testing/createTestDatabase').createTestDatabase(),
}));

const mockRates: Record<string, number | null> = {};
jest.mock('../../lib/currencyConversionService', () => ({
  getCurrencyConversion: jest.fn(
    async (base: string, target: string): Promise<ConversionResult> => {
      const rate = mockRates[`${base}_${target}`] ?? null;
      return rate === null ? { status: 'missing_rate', rate } : { status: 'ok', rate };
    }
  ),
}));

const DAY_MS = 24 * 60 * 60 * 1000;

const baseTransaction = {
  merchant: 'Cafe',
  amount: -10,
  categoryId: null,
  date: new Date('2026-04-10T09:00:00'),
  currencyCode: 'EUR',
  note: '',
  baseCurrency: 'EUR',
};

const usageCountOf = async (categoryId: string) =>
  (await collection('categories').find(categoryId)).usageCount;

beforeEach(async () => {
  for (const key of Object.keys(mockRates)) delete mockRates[key];
  await database.write(() => database.unsafeResetDatabase());
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('transactions', () => {
  it('tracks category usage across create, recategorise and delete', async () => {
    const food = await createCategory({ name: 'Food', icon: '🍔' });
    const fun = await createCategory({ name: 'Fun', icon: '🎉' });

    const transaction = await createTransaction({
      ...baseTransaction,
      categoryId: food.id,
    });
    expect(await usageCountOf(food.id)).toBe(1);

    await updateTransaction({
      ...baseTransaction,
      id: transaction.id,
      categoryId: fun.id,
    });
    expect(transaction.categoryId).toBe(fun.id);
    expect(await usageCountOf(food.id)).toBe(0);
    expect(await usageCountOf(fun.id)).toBe(1);

    await deleteTransaction(transaction.id);
    expect(await usageCountOf(fun.id)).toBe(0);
  });

  it('converts into the base currency and keeps trips unless told otherwise', async () => {
    mockRates.EUR_USD = 0.5;
    const trip = await createTrip({ name: 'NYC', icon: '🗽', startDate: new Date() });

    const transaction = await createTransaction({
      ...baseTransaction,
      currencyCode: 'USD',
      tripId: trip.id,
    });
    expect(transaction.amountInBaseCurrency).toBe(-5);
    expect(transaction.exchangeRate).toBe(0.5);
    expect(transaction.conversionStatus).toBe('ok');

    await updateTransaction({ ...baseTransaction, id: transaction.id, amount: -20 });
    expect(transaction.tripId).toBe(trip.id);
    expect(transaction.amountInBaseCurrency).toBe(-20);

    await updateTransaction({ ...baseTransaction, id: transaction.id, tripId: null });
    expect(transaction.tripId).toBeNull();
  });

  it('rejects missing rates unless explicitly allowed', async () => {
    const payload = { ...baseTransaction, currencyCode: 'JPY' };

    await expect(createTransaction(payload)).rejects.toThrow(
      'No exchange rate available'
    );

    const transaction = await createTransaction({ ...payload, allowMissingRate: true });
    expect(transaction.conversionStatus).toBe('missing_rate');
    expect(transaction.amountInBaseCurrency).toBe(-10);
  });

  it('imports batches, reporting failed rows and bumping usage once per row', async () => {
    const food = await createCategory({ name: 'Food', icon: '🍔' });

    const result = await createTransactionsBatch([
      { ...baseTransaction, categoryId: food.id, sourceRowNumber: 2 },
      { ...baseTransaction, categoryId: food.id, sourceRowNumber: 3 },
      { ...baseTransaction, categoryId: 'missing', sourceRowNumber: 4 },
      { ...baseTransaction, currencyCode: 'JPY', sourceRowNumber: 5 },
    ]);

    expect(result.importedCount).toBe(2);
    expect(result.failed).toEqual([
      { row: 4, reason: 'Category not found: missing' },
      { row: 5, reason: 'No exchange rate available for JPY -> EUR' },
    ]);
    expect(await usageCountOf(food.id)).toBe(2);
  });

  it('rebases every transaction into a new base currency', async () => {
    mockRates.USD_EUR = 2;
    const euro = await createTransaction(baseTransaction);
    const yen = await createTransaction({
      ...baseTransaction,
      currencyCode: 'JPY',
      allowMissingRate: true,
    });

    await rebaseTransactionsToCurrency('USD');

    expect(euro).toMatchObject({
      baseCurrencyCode: 'USD',
      amountInBaseCurrency: -20,
      exchangeRate: 2,
      conversionStatus: 'ok',
    });
    expect(yen).toMatchObject({
      baseCurrencyCode: 'USD',
      amountInBaseCurrency: -10,
      exchangeRate: 1,
      conversionStatus: 'missing_rate',
    });
  });
});

describe('categories', () => {
  it('seeds defaults only into an empty database', async () => {
    const seeded = await seedDefaultCategories();
    expect(seeded.length).toBeGreaterThan(0);
    expect(await seedDefaultCategories()).toEqual([]);
    expect(await collection('categories').query().fetchCount()).toBe(seeded.length);
  });

  it('updates and refuses to delete categories that are still linked', async () => {
    const category = await createCategory({ name: 'Food', icon: '🍔' });
    await updateCategory({ id: category.id, name: 'Groceries', icon: '🛒' });
    expect(category.name).toBe('Groceries');

    const transaction = await createTransaction({
      ...baseTransaction,
      categoryId: category.id,
    });
    await expect(deleteCategory(category.id)).rejects.toThrow('still being used');

    await deleteTransaction(transaction.id);
    await deleteCategory(category.id);
    expect(await collection('categories').query().fetchCount()).toBe(0);
  });
});

describe('budgets', () => {
  const budgetPayload = {
    name: 'Monthly',
    amount: 500,
    period: 'monthly' as const,
    startDate: new Date('2026-01-01T00:00:00'),
    rollover: false,
    alertThreshold: 80,
  };

  it('replaces category links on update and removes them on delete', async () => {
    const food = await createCategory({ name: 'Food', icon: '🍔' });
    const fun = await createCategory({ name: 'Fun', icon: '🎉' });
    const budget = await createBudget({ ...budgetPayload, categoryIds: [food.id] });
    expect(budget.isActive).toBe(true);

    await updateBudget({
      ...budgetPayload,
      id: budget.id,
      amount: 600,
      categoryIds: [fun.id],
    });
    const links = await budget.budgetCategories.fetch();
    expect(budget.amount).toBe(600);
    expect(links.map((link) => link.categoryId)).toEqual([fun.id]);

    await deleteBudget(budget.id);
    expect(await collection('budget_categories').query().fetchCount()).toBe(0);
  });
});

describe('trips', () => {
  it('archives and unarchives without deadlocking the write queue', async () => {
    const trip = await createTrip({ name: 'Rome', icon: '🏛️', startDate: new Date() });

    await toggleTripArchive(trip.id);
    expect(trip.isArchived).toBe(true);
    await toggleTripArchive(trip.id);
    expect(trip.isArchived).toBe(false);
  });

  it('finds the latest in-progress trip', async () => {
    const now = Date.now();
    const ongoing = await createTrip({
      name: 'Ongoing',
      icon: '✈️',
      startDate: new Date(now - 5 * DAY_MS),
    });
    const newer = await createTrip({
      name: 'Newer',
      icon: '✈️',
      startDate: new Date(now - DAY_MS),
      endDate: new Date(now + DAY_MS),
    });
    await createTrip({ name: 'Future', icon: '✈️', startDate: new Date(now + DAY_MS) });
    await createTrip({
      name: 'Ended',
      icon: '✈️',
      startDate: new Date(now - 10 * DAY_MS),
      endDate: new Date(now - DAY_MS),
    });

    expect((await getMostRecentActiveTrip())?.id).toBe(newer.id);

    await toggleTripArchive(newer.id);
    expect((await getMostRecentActiveTrip())?.id).toBe(ongoing.id);

    await updateTrip({
      id: ongoing.id,
      name: 'Ongoing',
      icon: '✈️',
      startDate: new Date(now + DAY_MS),
    });
    expect(await getMostRecentActiveTrip()).toBeNull();
  });

  it('refuses to delete trips that still have transactions', async () => {
    const trip = await createTrip({ name: 'Rome', icon: '🏛️', startDate: new Date() });
    await createTransaction({ ...baseTransaction, tripId: trip.id });

    await expect(deleteTrip(trip.id)).rejects.toThrow('Archive it instead');
  });
});

describe('recurring transactions', () => {
  const schedule = {
    merchant: 'Gym',
    amount: -30,
    categoryId: null,
    currencyCode: 'EUR',
    note: '',
    frequency: 'monthly' as const,
  };

  it('materialises due schedules once and advances them atomically', async () => {
    const startDate = new Date();
    startDate.setHours(7, 30, 0, 0);
    const recurring = await createRecurringTransaction({ ...schedule, startDate });

    const [created] = await checkAndCreateDueTransactions('EUR');
    expect(created.recurringTransactionId).toBe(recurring.id);
    expect(created.date.getHours()).toBe(7);
    expect(created.date.getMinutes()).toBe(30);
    expect(recurring.nextDueDate.getMonth()).toBe((startDate.getMonth() + 1) % 12);
    expect(recurring.lastCreatedDate).not.toBeNull();

    expect(await checkAndCreateDueTransactions('EUR')).toEqual([]);
  });

  it('skips paused schedules and ones whose rate is unavailable', async () => {
    const paused = await createRecurringTransaction({
      ...schedule,
      startDate: new Date(),
    });
    await toggleRecurringTransaction(paused.id);
    expect(paused.isActive).toBe(false);

    const foreign = await createRecurringTransaction({
      ...schedule,
      currencyCode: 'JPY',
      startDate: new Date(),
    });

    expect(await checkAndCreateDueTransactions('EUR')).toEqual([]);
    expect(foreign.lastCreatedDate).toBeNull();
    expect(await collection('transactions').query().fetchCount()).toBe(0);
  });
});
