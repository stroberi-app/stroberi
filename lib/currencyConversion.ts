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
