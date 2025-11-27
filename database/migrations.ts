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
  ],
});
