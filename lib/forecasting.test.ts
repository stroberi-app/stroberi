import dayjs from 'dayjs';
import { calculateProjectedSpending, detectRecurringTransactions } from './forecasting';

const entry = (date: string, amountInBaseCurrency: number, merchant = 'Shop') => ({
  date: new Date(date),
  amountInBaseCurrency,
  merchant,
});

describe('calculateProjectedSpending', () => {
  const today = dayjs('2026-04-10T12:00:00');

  it('extrapolates month-to-date expenses only', () => {
    const forecast = calculateProjectedSpending(
      [
        entry('2026-03-31T18:00:00', -500), // previous month
        entry('2026-04-02T10:00:00', -60),
        entry('2026-04-09T10:00:00', -40),
        entry('2026-04-05T10:00:00', 2000), // income
      ],
      undefined,
      today
    );

    expect(forecast.currentSpend).toBe(100);
    expect(forecast.dailyAverage).toBe(10);
    expect(forecast.daysRemaining).toBe(20);
    expect(forecast.projectedSpend).toBe(300);
    expect(forecast.status).toBe('on-track');
    expect(forecast.confidence).toBe('low');
  });

  it('grades the projection against a budget', () => {
    const spend = [entry('2026-04-01T10:00:00', -100)];

    expect(calculateProjectedSpending(spend, 250, today).status).toBe('critical');
    expect(calculateProjectedSpending(spend, 320, today).status).toBe('warning');
    expect(calculateProjectedSpending(spend, 400, today).status).toBe('on-track');
  });
});

describe('detectRecurringTransactions', () => {
  const today = dayjs('2026-04-20T12:00:00');

  it('flags merchants charging a similar amount about a month apart', () => {
    expect(
      detectRecurringTransactions(
        [
          entry('2026-03-03T08:00:00', -9.99, 'Stream'),
          entry('2026-04-02T08:00:00', -10.2, 'Stream'),
          entry('2026-03-10T08:00:00', -50, 'Grocer'),
          entry('2026-04-01T08:00:00', -80, 'Grocer'),
          entry('2026-04-05T08:00:00', -12, 'Once'),
        ],
        today
      )
    ).toEqual([
      {
        merchant: 'Stream',
        amount: 10.2,
        frequency: 'monthly',
        predictedDate: new Date('2026-05-02T08:00:00'),
        confidence: 0.8,
        lastDate: new Date('2026-04-02T08:00:00'),
      },
    ]);
  });
});
