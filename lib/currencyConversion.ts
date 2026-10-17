export type ConversionStatus = 'ok' | 'stale' | 'missing_rate';

export type ConversionResult = {
  status: ConversionStatus;
  rate: number | null;
};

export class MissingCurrencyRateError extends Error {
  readonly baseCurrency: string;
  readonly targetCurrency: string;

  constructor(baseCurrency: string, targetCurrency: string) {
    super(`No exchange rate available for ${targetCurrency} -> ${baseCurrency}`);
    this.name = 'MissingCurrencyRateError';
    this.baseCurrency = baseCurrency;
    this.targetCurrency = targetCurrency;
  }
}

export type BaseCurrencyAmount = {
  baseCurrencyCode: string;
  amountInBaseCurrency: number;
  exchangeRate: number;
  conversionStatus: ConversionStatus;
};

/**
 * Normalises `amount` into `baseCurrency`. Same-currency amounts never need a
 * rate. When a rate is unavailable the amount is kept 1:1 and flagged as
 * `missing_rate`, but only if the caller opted in via `allowMissingRate`.
 */
export const toBaseCurrencyAmount = ({
  amount,
  currencyCode,
  baseCurrency,
  conversion,
  allowMissingRate = false,
}: {
  amount: number;
  currencyCode: string;
  baseCurrency: string;
  conversion: ConversionResult | null;
  allowMissingRate?: boolean;
}): BaseCurrencyAmount => {
  if (currencyCode === baseCurrency) {
    return {
      baseCurrencyCode: baseCurrency,
      amountInBaseCurrency: amount,
      exchangeRate: 1,
      conversionStatus: 'ok',
    };
  }

  if (conversion?.rate != null) {
    return {
      baseCurrencyCode: baseCurrency,
      amountInBaseCurrency: amount * conversion.rate,
      exchangeRate: conversion.rate,
      conversionStatus: conversion.status,
    };
  }

  if (!allowMissingRate) {
    throw new MissingCurrencyRateError(baseCurrency, currencyCode);
  }

  return {
    baseCurrencyCode: baseCurrency,
    amountInBaseCurrency: amount,
    exchangeRate: 1,
    conversionStatus: 'missing_rate',
  };
};
