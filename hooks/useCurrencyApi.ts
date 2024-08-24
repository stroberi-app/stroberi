import { database } from '../database';

const CACHE_KEY_PREFIX = 'currency_conversion_cache_';
const CACHE_TIMESTAMP_KEY_PREFIX = 'currency_conversion_cache_timestamp_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const getCurrencyConversion = async (baseCurrency: string, targetCurrency: string) => {
  const cacheKey = `${CACHE_KEY_PREFIX}${baseCurrency}_${targetCurrency}`;
  const fetchFromApi = async (url: string) => {
    const response = await fetch(url);
    const data = await response.json();
    return data[targetCurrency.toLowerCase()][baseCurrency.toLowerCase()];
  };

  const getCachedData = async (key: string) => {
    const cachedData = await database.localStorage.get(key);
    const cachedTimestamp = Number(
      (await database.localStorage.get(CACHE_TIMESTAMP_KEY_PREFIX)) ?? 0
    );
    if (cachedData && cachedTimestamp && Date.now() - cachedTimestamp < CACHE_EXPIRY_MS) {
      return JSON.parse(cachedData as string);
    }
    return null;
  };

  const setCachedData = async (data: number) => {
    await database.localStorage.set(CACHE_TIMESTAMP_KEY_PREFIX, Date.now());
    await database.localStorage.set(cacheKey, JSON.stringify(data));
  };

  const cachedData = await getCachedData(cacheKey);
  if (cachedData) {
    console.log('returning cached data', { baseCurrency, targetCurrency, cachedData });
    return cachedData;
  }

  try {
    const primaryUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${targetCurrency.toLowerCase()}.json`;
    const data = await fetchFromApi(primaryUrl);
    await setCachedData(data);
    return data;
  } catch (error) {
    console.error('Error fetching from primary API, trying fallback:', error);
    try {
      const fallbackUrl = `https://currency-api.pages.dev/v1/currencies/${targetCurrency.toLowerCase()}.json`;
      const data = await fetchFromApi(fallbackUrl);
      await setCachedData(data);
      return data;
    } catch (fallbackError) {
      console.error('Error fetching from fallback API:', fallbackError);
      return null;
    }
  }
};
