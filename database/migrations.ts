import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

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
  ],
});
