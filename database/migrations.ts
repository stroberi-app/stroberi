import { addColumns, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

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
  ],
});
