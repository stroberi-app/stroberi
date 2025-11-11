import { database } from '../database';
import { STORAGE_KEYS } from '../lib/storageKeys';

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

export const getCurrencyConversion = async (
  baseCurrency: string,
  targetCurrency: string
) => {
  const cacheKey = `${STORAGE_KEYS.CURRENCY_CONVERSION_CACHE_PREFIX}${baseCurrency}_${targetCurrency}`;
  const fetchFromApi = async (url: string) => {
    const response = await fetch(url);
    const data = await response.json();
    return data[targetCurrency.toLowerCase()][baseCurrency.toLowerCase()];
  };

  const getCachedData = async (key: string) => {
    const cachedData = await database.localStorage.get(key);
    const cachedTimestamp = Number(
      (await database.localStorage.get(
        STORAGE_KEYS.CURRENCY_CONVERSION_CACHE_TIMESTAMP_PREFIX
      )) ?? 0
    );
    if (cachedData && cachedTimestamp && Date.now() - cachedTimestamp < CACHE_EXPIRY_MS) {
      return JSON.parse(cachedData as string);
    }
    return null;
  };

  const setCachedData = async (data: number) => {
    await database.localStorage.set(
      STORAGE_KEYS.CURRENCY_CONVERSION_CACHE_TIMESTAMP_PREFIX,
      Date.now()
    );
    await database.localStorage.set(cacheKey, JSON.stringify(data));
  };

  const cachedData = await getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const primaryUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${targetCurrency.toLowerCase()}.json`;
    const data = await fetchFromApi(primaryUrl);
    await setCachedData(data);
    return data;
  } catch (_error) {
    try {
      const fallbackUrl = `https://currency-api.pages.dev/v1/currencies/${targetCurrency.toLowerCase()}.json`;
      const data = await fetchFromApi(fallbackUrl);
      await setCachedData(data);
      return data;
    } catch (_fallbackError) {
      return null;
    }
  }
};
