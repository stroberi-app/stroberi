import { database } from '../database';
import type { ConversionResult } from './currencyConversion';
import { STORAGE_KEYS } from './storageKeys';

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Same dataset from two hosts; the second is a fallback when the CDN fails.
const RATE_SOURCES = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies',
  'https://currency-api.pages.dev/v1/currencies',
];

type CachedRate = {
  rate: number;
  timestamp: number;
};

const memoryCache = new Map<string, CachedRate>();
const inFlightRequests = new Map<string, Promise<ConversionResult>>();

const getCurrencyConversionCacheKey = (baseCurrency: string, targetCurrency: string) =>
  `${STORAGE_KEYS.CURRENCY_CONVERSION_CACHE_PREFIX}${baseCurrency}_${targetCurrency}`;

const parseCachedRate = (cachedData: unknown): CachedRate | null => {
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

const isFresh = (cachedRate: CachedRate) => {
  return Date.now() - cachedRate.timestamp < CACHE_EXPIRY_MS;
};

/** Fetches a rate from one source; resolves to null on any failure. */
const fetchFromSource = async (
  sourceUrl: string,
  baseCurrency: string,
  targetCurrency: string
): Promise<number | null> => {
  try {
    const response = await fetch(`${sourceUrl}/${targetCurrency.toLowerCase()}.json`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rate = data?.[targetCurrency.toLowerCase()]?.[baseCurrency.toLowerCase()];
    return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
};

const getCurrencyConversionCacheEntry = async (
  cacheKey: string
): Promise<CachedRate | null> => {
  const inMemory = memoryCache.get(cacheKey);
  if (inMemory) {
    return inMemory;
  }

  const cachedData = await database.localStorage.get(cacheKey);
  const parsed = parseCachedRate(cachedData);

  if (parsed) {
    memoryCache.set(cacheKey, parsed);
  }

  return parsed;
};

const setCurrencyConversionCacheEntry = async (cacheKey: string, data: CachedRate) => {
  memoryCache.set(cacheKey, data);
  await database.localStorage.set(cacheKey, JSON.stringify(data));
};

export const getCurrencyConversion = async (
  baseCurrency: string,
  targetCurrency: string
): Promise<ConversionResult> => {
  const cacheKey = getCurrencyConversionCacheKey(baseCurrency, targetCurrency);
  const cachedData = await getCurrencyConversionCacheEntry(cacheKey);

  if (cachedData && isFresh(cachedData)) {
    return {
      status: 'ok',
      rate: cachedData.rate,
    };
  }

  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async (): Promise<ConversionResult> => {
    try {
      for (const sourceUrl of RATE_SOURCES) {
        const rate = await fetchFromSource(sourceUrl, baseCurrency, targetCurrency);
        if (rate) {
          await setCurrencyConversionCacheEntry(cacheKey, {
            rate,
            timestamp: Date.now(),
          });
          return { status: 'ok', rate };
        }
      }
    } catch {
      // Caching the fresh rate failed; fall back to the last known rate.
    }

    return cachedData
      ? { status: 'stale', rate: cachedData.rate }
      : { status: 'missing_rate', rate: null };
  })();

  inFlightRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    if (inFlightRequests.get(cacheKey) === request) {
      inFlightRequests.delete(cacheKey);
    }
  }
};
