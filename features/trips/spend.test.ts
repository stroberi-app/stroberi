import { calculateTripSpend } from './spend';

const tx = (amount: number, currencyCode: string, amountInBaseCurrency = amount) => ({
  amount,
  currencyCode,
  amountInBaseCurrency,
});

describe('calculateTripSpend', () => {
  const transactions = [
    tx(-100, 'JPY', -0.6),
    tx(-50, 'JPY', -0.3),
    tx(-20, 'EUR'),
    tx(30, 'JPY', 0.2),
  ];

  it('totals expenses in the trip currency when one is set', () => {
    expect(calculateTripSpend({ currencyCode: 'JPY' }, transactions)).toBe(150);
  });

  it('totals expenses in the base currency otherwise', () => {
    expect(calculateTripSpend({ currencyCode: null }, transactions)).toBeCloseTo(20.9);
  });
});
