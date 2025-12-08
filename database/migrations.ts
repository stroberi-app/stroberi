import {
  addColumns,
  createTable,
  schemaMigrations,
} from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 7,
      steps: [
        addColumns({
          table: 'transactions',
          columns: [{ name: 'note', type: 'string' }],
        }),
      ],
    },
    {
      toVersion: 8,
      steps: [
        addColumns({
          table: 'transactions',
          columns: [
            { name: 'baseCurrencyCode', type: 'string' },
            { name: 'amountInBaseCurrency', type: 'number' },
            { name: 'exchangeRate', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: 'categories',
          columns: [{ name: 'usageCount', type: 'number', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 10,
      steps: [
        addColumns({
          table: 'transactions',
          columns: [
            {
              name: 'recurringTransactionId',
              type: 'string',
              isOptional: true,
              isIndexed: true,
            },
          ],
        }),
        createTable({
          name: 'recurring_transactions',
          columns: [
            { name: 'merchant', type: 'string' },
            { name: 'amount', type: 'number' },
            { name: 'currencyCode', type: 'string' },
            { name: 'note', type: 'string' },
            { name: 'categoryId', type: 'string', isOptional: true },
            { name: 'frequency', type: 'string' },
            { name: 'startDate', type: 'number' },
            { name: 'endDate', type: 'number', isOptional: true },
            { name: 'nextDueDate', type: 'number' },
            { name: 'lastCreatedDate', type: 'number', isOptional: true },
            { name: 'isActive', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 11,
      steps: [
        createTable({
          name: 'budgets',
          columns: [
            { name: 'amount', type: 'number' },
            { name: 'period', type: 'string' },
            { name: 'startDate', type: 'number' },
            { name: 'rollover', type: 'boolean' },
            { name: 'isActive', type: 'boolean' },
            { name: 'alertThreshold', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 12,
      steps: [
        addColumns({
          table: 'budgets',
          columns: [{ name: 'name', type: 'string' }],
        }),
      ],
    },
    {
      toVersion: 13,
      steps: [
        createTable({
          name: 'budget_categories',
          columns: [
            { name: 'budget_id', type: 'string', isIndexed: true },
            { name: 'category_id', type: 'string', isIndexed: true },
          ],
        }),
      ],
    },
    {
      toVersion: 14,
      steps: [
        addColumns({
          table: 'transactions',
          columns: [
            { name: 'tripId', type: 'string', isOptional: true, isIndexed: true },
            { name: 'tripCurrencyCode', type: 'string', isOptional: true },
            { name: 'amountInTripCurrency', type: 'number', isOptional: true },
            { name: 'tripExchangeRate', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 15,
      steps: [
        createTable({
          name: 'trips',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'homeCurrencyCode', type: 'string' },
            { name: 'startDate', type: 'number', isOptional: true },
            { name: 'endDate', type: 'number', isOptional: true },
            { name: 'isArchived', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 16,
      steps: [
        createTable({
          name: 'trip_budgets',
          columns: [
            { name: 'trip_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'amount', type: 'number' },
            { name: 'currencyCode', type: 'string' },
            { name: 'type', type: 'string' },
            { name: 'alertThreshold', type: 'number' },
            { name: 'isActive', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 17,
      steps: [
        createTable({
          name: 'trip_budget_categories',
          columns: [
            { name: 'trip_budget_id', type: 'string', isIndexed: true },
            { name: 'category_id', type: 'string', isIndexed: true },
          ],
        }),
      ],
    },
    {
      toVersion: 18,
      steps: [
        createTable({
          name: 'fx_snapshots',
          columns: [
            { name: 'trip_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'baseCurrencyCode', type: 'string' },
            { name: 'counterCurrencyCode', type: 'string' },
            { name: 'rate', type: 'number' },
            { name: 'source', type: 'string', isOptional: true },
            { name: 'captured_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
