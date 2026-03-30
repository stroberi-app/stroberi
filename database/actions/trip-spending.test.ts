import { getTripSpending } from './trips';

let mockSql = '';
let mockParams: unknown[] = [];
let unsafeFetchRawCalls = 0;

// @ts-expect-error Jest globals are available at runtime in test execution.
jest.mock('../index', () => ({
  database: {
    get: (table: string) => {
      if (table === 'trips') {
        return {
          find: async () => ({
            id: 'trip_1',
            currencyCode: 'EUR',
          }),
        };
      }

      if (table === 'transactions') {
        return {
          query: () => ({
            unsafeFetchRaw: async () => {
              unsafeFetchRawCalls += 1;
              return [
                {
                  transactionCount: '3',
                  totalSpent: '42.5',
                  totalIncome: '10',
                },
              ];
            },
          }),
        };
      }

      throw new Error(`Unexpected table lookup: ${table}`);
    },
  },
}));

// @ts-expect-error Jest globals are available at runtime in test execution.
jest.mock('@nozbe/watermelondb', () => ({
  Q: {
    unsafeSqlQuery: (sql: string, params: unknown[]) => {
      mockSql = sql;
      mockParams = params;
      return { sql, params };
    },
  },
}));

describe('getTripSpending', () => {
  it('aggregates all linked transactions from base-currency amounts', async () => {
    const result = await getTripSpending('trip_1');

    expect(mockSql).toContain('amountInBaseCurrency');
    expect(mockSql.includes('currencyCode = ?')).toBe(false);
    expect(mockParams).toEqual(['trip_1']);
    expect(unsafeFetchRawCalls).toBe(1);
    expect(result).toEqual({
      trip: {
        id: 'trip_1',
        currencyCode: 'EUR',
      },
      totalSpent: 42.5,
      totalIncome: 10,
      netAmount: -32.5,
      transactionCount: 3,
      currencyCode: null,
    });
  });
});
