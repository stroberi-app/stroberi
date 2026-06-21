import type { ConversionStatus } from '../../lib/currencyConversion';

/**
 * The currency-conversion block is only relevant when the transaction was
 * recorded in a currency different from the base currency.
 */
export const shouldShowConversionBlock = (
  currencyCode: string,
  baseCurrencyCode: string | null | undefined
): boolean => {
  if (!baseCurrencyCode) {
    return false;
  }
  return currencyCode !== baseCurrencyCode;
};

export type ConversionStatusChipTone = 'warning' | 'error';

export type ConversionStatusChip = {
  label: string;
  tone: ConversionStatusChipTone;
};

/**
 * Returns a chip describing a non-ok conversion status, or null when the
 * conversion is fine (or unknown) and no chip should be shown.
 */
export const getConversionStatusChip = (
  status: ConversionStatus | null | undefined
): ConversionStatusChip | null => {
  switch (status) {
    case 'stale':
      return { label: 'Rate may be outdated', tone: 'warning' };
    case 'missing_rate':
      return { label: 'No exchange rate', tone: 'error' };
    default:
      return null;
  }
};
