const mockStorage = new Map<string, string>();
jest.mock('../database', () => ({
  database: {
    localStorage: {
      get: async (key: string) => mockStorage.get(key) ?? null,
      set: async (key: string, value: string) => {
        mockStorage.set(key, value);
      },
    },
  },
}));

const respond = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: async () => body } as Response);

describe('getCurrencyConversion', () => {
  let getCurrencyConversion: typeof import('./currencyConversionService').getCurrencyConversion;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    mockStorage.clear();
    fetchMock.mockReset();
    global.fetch = fetchMock;
    ({ getCurrencyConversion } = require('./currencyConversionService'));
  });

  it('reads the rate for the base currency and caches it', async () => {
    fetchMock.mockReturnValueOnce(respond({ usd: { eur: 0.9 } }));

    expect(await getCurrencyConversion('EUR', 'USD')).toEqual({
      status: 'ok',
      rate: 0.9,
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/usd.json'));
    expect(await getCurrencyConversion('EUR', 'USD')).toEqual({
      status: 'ok',
      rate: 0.9,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the second source when the first throws or fails', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockReturnValueOnce(respond({ usd: { eur: 0.8 } }));
    expect(await getCurrencyConversion('EUR', 'USD')).toEqual({
      status: 'ok',
      rate: 0.8,
    });

    fetchMock
      .mockReturnValueOnce(respond({}, false))
      .mockReturnValueOnce(respond({ gbp: { eur: 1.2 } }));
    expect(await getCurrencyConversion('EUR', 'GBP')).toEqual({
      status: 'ok',
      rate: 1.2,
    });
  });

  it('serves an expired cached rate as stale when every source fails', async () => {
    mockStorage.set(
      'currency_conversion_cache_EUR_USD',
      JSON.stringify({ rate: 0.7, timestamp: 0 })
    );
    fetchMock.mockRejectedValue(new Error('offline'));

    expect(await getCurrencyConversion('EUR', 'USD')).toEqual({
      status: 'stale',
      rate: 0.7,
    });
    expect(await getCurrencyConversion('EUR', 'JPY')).toEqual({
      status: 'missing_rate',
      rate: null,
    });
  });
});
