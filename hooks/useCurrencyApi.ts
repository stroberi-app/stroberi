import { database } from '../database';
import type { ConversionResult } from '../lib/currencyConversion';
import { STORAGE_KEYS } from '../lib/storageKeys';

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

type CachedRate = {
  rate: number;
  timestamp: number;
};

export const getCurrencyConversion = async (
  baseCurrency: string,
  targetCurrency: string
) => {
  const cacheKey = `${STORAGE_KEYS.CURRENCY_CONVERSION_CACHE_PREFIX}${baseCurrency}_${targetCurrency}`;

  const fetchFromApi = async (url: string): Promise<number | null> => {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rawRate = data?.[targetCurrency.toLowerCase()]?.[baseCurrency.toLowerCase()];

    if (typeof rawRate !== 'number' || !Number.isFinite(rawRate) || rawRate <= 0) {
      return null;
    }

    return rawRate;
  };

  const getCachedData = async (key: string): Promise<CachedRate | null> => {
    const cachedData = await database.localStorage.get(key);

    if (!cachedData || typeof cachedData !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(cachedData) as Partial<CachedRate>;
      if (
        typeof parsed.rate === 'number' &&
        Number.isFinite(parsed.rate) &&
        parsed.rate > 0 &&
        typeof parsed.timestamp === 'number' &&
        Number.isFinite(parsed.timestamp)
      ) {
        return { rate: parsed.rate, timestamp: parsed.timestamp };
      }
    } catch {
      // Ignore corrupted cache entries.
    }

    return null;
  };

  const setCachedData = async (data: CachedRate) => {
    await database.localStorage.set(cacheKey, JSON.stringify(data));
  };

  const cachedData = await getCachedData(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRY_MS) {
    return {
      status: 'ok',
      rate: cachedData.rate,
    } satisfies ConversionResult;
  }

  const getFromNetwork = async (): Promise<ConversionResult | null> => {
    const primaryUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${targetCurrency.toLowerCase()}.json`;
    const primaryRate = await fetchFromApi(primaryUrl);

    if (primaryRate) {
      await setCachedData({
        rate: primaryRate,
        timestamp: Date.now(),
      });
      return { status: 'ok', rate: primaryRate };
    }

    const fallbackUrl = `https://currency-api.pages.dev/v1/currencies/${targetCurrency.toLowerCase()}.json`;
    const fallbackRate = await fetchFromApi(fallbackUrl);

    if (fallbackRate) {
      await setCachedData({
        rate: fallbackRate,
        timestamp: Date.now(),
      });
      return { status: 'ok', rate: fallbackRate };
    }

    return null;
  };

  try {
    const networkResult = await getFromNetwork();
    if (networkResult) {
      return networkResult;
    }

    if (cachedData) {
      return {
        status: 'stale',
        rate: cachedData.rate,
      } satisfies ConversionResult;
    }
  } catch {
    if (cachedData) {
      return {
        status: 'stale',
        rate: cachedData.rate,
      } satisfies ConversionResult;
    }
  }

  return {
    status: 'missing_rate',
    rate: null,
  } satisfies ConversionResult;
};

export const getCachedCurrencyConversion = async (
  baseCurrency: string,
  targetCurrency: string
): Promise<ConversionResult> => {
  const cacheKey = `${STORAGE_KEYS.CURRENCY_CONVERSION_CACHE_PREFIX}${baseCurrency}_${targetCurrency}`;
  const cachedData = await database.localStorage.get(cacheKey);
  if (!cachedData || typeof cachedData !== 'string') {
    return { status: 'missing_rate', rate: null };
  }

  try {
    const parsed = JSON.parse(cachedData) as CachedRate;
    if (
      typeof parsed.rate === 'number' &&
      Number.isFinite(parsed.rate) &&
      parsed.rate > 0 &&
      typeof parsed.timestamp === 'number'
    ) {
      return {
        status: Date.now() - parsed.timestamp < CACHE_EXPIRY_MS ? 'ok' : 'stale',
        rate: parsed.rate,
      };
    }
  } catch {
    // Ignore.
  }

  return { status: 'missing_rate', rate: null };
};
