import { isTripActiveAt } from './trips';

describe('isTripActiveAt', () => {
  const referenceTime = new Date('2026-03-30T12:00:00.000Z').getTime();

  it('returns false for trips that have not started yet', () => {
    expect(
      isTripActiveAt(
        {
          isArchived: false,
          startDate: new Date('2026-03-31T00:00:00.000Z'),
          endDate: null,
        },
        referenceTime
      )
    ).toBe(false);
  });

  it('returns true for trips that have started and are not archived', () => {
    expect(
      isTripActiveAt(
        {
          isArchived: false,
          startDate: new Date('2026-03-01T00:00:00.000Z'),
          endDate: null,
        },
        referenceTime
      )
    ).toBe(true);
  });

  it('returns false for archived trips even if the dates are otherwise active', () => {
    expect(
      isTripActiveAt(
        {
          isArchived: true,
          startDate: new Date('2026-03-01T00:00:00.000Z'),
          endDate: null,
        },
        referenceTime
      )
    ).toBe(false);
  });

  it('returns false for trips that have already ended', () => {
    expect(
      isTripActiveAt(
        {
          isArchived: false,
          startDate: new Date('2026-03-01T00:00:00.000Z'),
          endDate: new Date('2026-03-29T23:59:59.000Z'),
        },
        referenceTime
      )
    ).toBe(false);
  });
});
