import { getConversionStatusChip, shouldShowConversionBlock } from './transactionDetail';

describe('shouldShowConversionBlock', () => {
  it('shows the conversion block when currencies differ', () => {
    expect(shouldShowConversionBlock('USD', 'EUR')).toBe(true);
  });

  it('hides the conversion block when currencies match', () => {
    expect(shouldShowConversionBlock('USD', 'USD')).toBe(false);
  });

  it('hides the conversion block when the base currency is missing', () => {
    expect(shouldShowConversionBlock('USD', '')).toBe(false);
    expect(shouldShowConversionBlock('USD', null)).toBe(false);
  });
});

describe('getConversionStatusChip', () => {
  it('returns null when the conversion is ok', () => {
    expect(getConversionStatusChip('ok')).toEqual(null);
  });

  it('returns null when the status is missing', () => {
    expect(getConversionStatusChip(null)).toEqual(null);
  });

  it('returns a stale chip with a label', () => {
    expect(getConversionStatusChip('stale')).toEqual({
      label: 'Rate may be outdated',
      tone: 'warning',
    });
  });

  it('returns a missing-rate chip with a label', () => {
    expect(getConversionStatusChip('missing_rate')).toEqual({
      label: 'No exchange rate',
      tone: 'error',
    });
  });
});
