import { migrations } from './migrations';
import { schema } from './schema';

describe('transaction performance schema and migration', () => {
  it('uses schema version 17', () => {
    expect(schema.version).toBe(17);
  });

  it('indexes transactions date and categoryId columns in schema', () => {
    const transactionsTable = schema.tables.transactions;

    expect(transactionsTable.columns.date.isIndexed).toBe(true);
    expect(transactionsTable.columns.categoryId.isIndexed).toBe(true);
  });

  it('adds SQL migration for transactions date and category indexes', () => {
    const migration17 = migrations.sortedMigrations.find((migration) => {
      return migration.toVersion === 17;
    });

    expect(Boolean(migration17)).toBe(true);

    const sqlSteps = ((migration17?.steps ?? []).filter(
      (step) => step.type === 'sql'
    ) as Array<{ type: 'sql'; sql: string }>);
    const sqlStatements = sqlSteps.map((step) => step.sql.toLowerCase());

    expect(sqlStatements.length).toBe(2);
    expect(
      sqlStatements.some(
        (sql) => sql.includes('transactions') && sql.includes('(date)')
      )
    ).toBe(true);
    expect(
      sqlStatements.some(
        (sql) => sql.includes('transactions') && sql.includes('(categoryid)')
      )
    ).toBe(true);
  });
});
