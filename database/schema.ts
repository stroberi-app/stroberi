import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 12,
  tables: [
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'merchant', type: 'string' },
        { name: 'note', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'date', type: 'number' },
        { name: 'currencyCode', type: 'string' },
        { name: 'categoryId', type: 'string', isOptional: true },
        { name: 'baseCurrencyCode', type: 'string' },
        { name: 'amountInBaseCurrency', type: 'number' },
        { name: 'exchangeRate', type: 'number' },
        {
          name: 'recurringTransactionId',
          type: 'string',
          isOptional: true,
          isIndexed: true,
        },
      ],
    }),
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'usageCount', type: 'number' },
      ],
    }),
    tableSchema({
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
    tableSchema({
      name: 'budgets',
      columns: [
        { name: 'name', type: 'string' },
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
});
