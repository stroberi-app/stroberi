import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 7,
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
      ],
    }),
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
