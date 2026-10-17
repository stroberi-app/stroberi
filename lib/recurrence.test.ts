import {
  advanceByCadence,
  type Cadence,
  firstOccurrenceOnOrAfter,
  formatCadence,
  periodWindow,
  upcomingOccurrences,
} from './recurrence';

const at = (iso: string) => new Date(iso);

describe('advanceByCadence', () => {
  it.each<[Cadence, string]>([
    ['daily', '2026-01-16T09:00:00'],
    ['weekly', '2026-01-22T09:00:00'],
    ['monthly', '2026-02-15T09:00:00'],
    ['yearly', '2027-01-15T09:00:00'],
  ])('steps %s by one unit', (cadence, expected) => {
    expect(advanceByCadence(at('2026-01-15T09:00:00'), cadence).toDate()).toEqual(
      at(expected)
    );
  });

  it('supports negative and zero steps', () => {
    const start = at('2026-03-31T00:00:00');
    expect(advanceByCadence(start, 'monthly', -1).toDate()).toEqual(
      at('2026-02-28T00:00:00')
    );
    expect(advanceByCadence(start, 'monthly', 0).toDate()).toEqual(start);
  });

  it('treats unknown persisted cadences as monthly', () => {
    expect(
      advanceByCadence(at('2026-01-15T00:00:00'), 'fortnightly' as Cadence).toDate()
    ).toEqual(at('2026-02-15T00:00:00'));
  });
});

describe('firstOccurrenceOnOrAfter', () => {
  it('keeps future start dates unchanged', () => {
    const start = at('2026-05-01T08:00:00');
    expect(
      firstOccurrenceOnOrAfter(start, 'monthly', at('2026-04-10T12:00:00')).toDate()
    ).toEqual(start);
  });

  it('counts an occurrence earlier today as due', () => {
    expect(
      firstOccurrenceOnOrAfter(
        at('2026-04-01T08:00:00'),
        'weekly',
        at('2026-04-15T20:00:00')
      ).toDate()
    ).toEqual(at('2026-04-15T08:00:00'));
  });

  it('terminates for unknown cadences', () => {
    expect(
      firstOccurrenceOnOrAfter(
        at('2026-01-10T00:00:00'),
        'bogus' as Cadence,
        at('2026-03-01T00:00:00')
      ).toDate()
    ).toEqual(at('2026-03-10T00:00:00'));
  });
});

describe('upcomingOccurrences', () => {
  const reference = at('2026-04-15T12:00:00');

  it('lists the next occurrences from today', () => {
    expect(
      upcomingOccurrences({
        startDate: at('2026-04-01T00:00:00'),
        cadence: 'weekly',
        limit: 3,
        reference,
      })
    ).toEqual([
      at('2026-04-15T00:00:00'),
      at('2026-04-22T00:00:00'),
      at('2026-04-29T00:00:00'),
    ]);
  });

  it('stops at the end date', () => {
    expect(
      upcomingOccurrences({
        startDate: at('2026-04-15T00:00:00'),
        cadence: 'daily',
        endDate: at('2026-04-16T00:00:00'),
        limit: 5,
        reference,
      })
    ).toEqual([at('2026-04-15T00:00:00'), at('2026-04-16T00:00:00')]);
  });

  it('returns nothing when the schedule already ended', () => {
    expect(
      upcomingOccurrences({
        startDate: at('2026-01-01T00:00:00'),
        cadence: 'monthly',
        endDate: at('2026-03-01T00:00:00'),
        limit: 5,
        reference,
      })
    ).toEqual([]);
  });
});

describe('periodWindow', () => {
  const anchor = at('2026-01-10T00:00:00');
  const reference = at('2026-03-20T12:00:00');

  it('finds the window containing the reference date', () => {
    expect(periodWindow(anchor, 'monthly', { reference })).toEqual({
      start: at('2026-03-10T00:00:00'),
      end: at('2026-04-09T23:59:59'),
    });
  });

  it('shifts by whole periods', () => {
    expect(periodWindow(anchor, 'monthly', { reference, offset: -1 })).toEqual({
      start: at('2026-02-10T00:00:00'),
      end: at('2026-03-09T23:59:59'),
    });
  });

  it('starts at the anchor when it is in the future', () => {
    expect(
      periodWindow(at('2026-06-01T00:00:00'), 'yearly', { reference }).start
    ).toEqual(at('2026-06-01T00:00:00'));
  });
});

describe('formatCadence', () => {
  it('labels known cadences and falls back to monthly', () => {
    expect(formatCadence('weekly')).toBe('Weekly');
    expect(formatCadence('nope' as Cadence)).toBe('Monthly');
  });
});
