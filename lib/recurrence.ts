import dayjs, { type Dayjs, type ManipulateType } from 'dayjs';

/**
 * Calendar cadence shared by recurring transactions and budget periods.
 * Budget periods are the subset without `daily`.
 */
export type Cadence = 'daily' | 'weekly' | 'monthly' | 'yearly';

const CADENCE_UNITS: Record<Cadence, ManipulateType> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
};

const CADENCE_LABELS: Record<Cadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

// Persisted values are plain strings; anything unrecognised behaves as monthly
// so corrupt rows can't stall the stepping loops below.
const unitFor = (cadence: Cadence): ManipulateType => CADENCE_UNITS[cadence] ?? 'month';

export const formatCadence = (cadence: Cadence): string =>
  CADENCE_LABELS[cadence] ?? CADENCE_LABELS.monthly;

export const advanceByCadence = (
  date: Date | Dayjs,
  cadence: Cadence,
  steps = 1
): Dayjs => {
  const current = dayjs(date);
  return steps === 0 ? current : current.add(steps, unitFor(cadence));
};

/**
 * Steps forward from `start` until reaching the first occurrence that is not
 * before the start of `reference`'s day.
 */
export const firstOccurrenceOnOrAfter = (
  start: Date,
  cadence: Cadence,
  reference: Date = new Date()
): Dayjs => {
  const floor = dayjs(reference).startOf('day');
  let current = dayjs(start);

  while (current.isBefore(floor)) {
    current = advanceByCadence(current, cadence);
  }

  return current;
};

/**
 * Lists up to `limit` upcoming occurrences from today onwards, stopping at
 * `endDate` when one is provided.
 */
export const upcomingOccurrences = ({
  startDate,
  cadence,
  endDate,
  limit,
  reference = new Date(),
}: {
  startDate: Date;
  cadence: Cadence;
  endDate?: Date | null;
  limit: number;
  reference?: Date;
}): Date[] => {
  const isPastEnd = (date: Dayjs) => Boolean(endDate) && date.isAfter(dayjs(endDate));
  const occurrences: Date[] = [];
  let current = firstOccurrenceOnOrAfter(startDate, cadence, reference);

  while (occurrences.length < limit && !isPastEnd(current)) {
    occurrences.push(current.toDate());
    current = advanceByCadence(current, cadence);
  }

  return occurrences;
};

/**
 * Finds the cadence window containing `reference` for a schedule anchored at
 * `anchor`, optionally shifted by whole periods (e.g. -1 for the previous one).
 * The window ends one second before the next period starts.
 */
export const periodWindow = (
  anchor: Date,
  cadence: Cadence,
  { offset = 0, reference = new Date() }: { offset?: number; reference?: Date } = {}
) => {
  const now = dayjs(reference);
  let start = dayjs(anchor);

  while (advanceByCadence(start, cadence).isBefore(now)) {
    start = advanceByCadence(start, cadence);
  }

  start = advanceByCadence(start, cadence, offset);

  return {
    start: start.toDate(),
    end: advanceByCadence(start, cadence).subtract(1, 'second').toDate(),
  };
};
