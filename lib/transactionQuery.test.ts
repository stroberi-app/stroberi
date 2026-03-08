import type { CategoryModel } from '../database/category-model';
import { buildTransactionFilterClauses } from './transactionQuery';

describe('buildTransactionFilterClauses', () => {
  it('builds this month date filters', () => {
    const clauses = buildTransactionFilterClauses({
      dateFilter: 'This Month',
      categories: [],
    });

    const firstClause = clauses[0] as {
      left: string;
      comparison: { operator: string };
    };
    const secondClause = clauses[1] as {
      left: string;
      comparison: { operator: string };
    };

    expect(clauses.length).toBe(2);
    expect(firstClause.left).toBe('date');
    expect(firstClause.comparison.operator).toBe('gte');
    expect(secondClause.left).toBe('date');
    expect(secondClause.comparison.operator).toBe('lte');
  });

  it('builds custom range and category filters together', () => {
    const categories = [{ id: 'groceries' }, { id: 'rent' }] as CategoryModel[];

    const clauses = buildTransactionFilterClauses({
      dateFilter: 'Custom',
      customRange: [new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-31T23:59:59.999Z')],
      categories,
    });

    const firstClause = clauses[0] as {
      left: string;
      comparison: { operator: string };
    };
    const secondClause = clauses[1] as {
      left: string;
      comparison: { operator: string };
    };
    const thirdClause = clauses[2] as {
      left: string;
      comparison: { operator: string };
    };

    expect(clauses.length).toBe(3);
    expect(firstClause.left).toBe('date');
    expect(firstClause.comparison.operator).toBe('gte');
    expect(secondClause.left).toBe('date');
    expect(secondClause.comparison.operator).toBe('lte');
    expect(thirdClause.left).toBe('categoryId');
    expect(thirdClause.comparison.operator).toBe('oneOf');
  });
});
