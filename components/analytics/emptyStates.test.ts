import {
  INSIGHTS_CARD_GAP,
  getInsightInboxEmptyState,
  getSafeToSpendDisplayText,
  getWeeklyRecapDisplayState,
} from './emptyStates';
import type { SafeToSpendSummary, WeeklyRecap } from '../../lib/insights';

const weeklyRecap = (overrides: Partial<WeeklyRecap> = {}): WeeklyRecap => ({
  totalSpent: 0,
  previousWeekSpent: 0,
  changeAmount: 0,
  changePercent: 0,
  summary: 'You spent €0 this week, €0 less than the previous week.',
  ...overrides,
});

const safeToSpend = (
  overrides: Partial<SafeToSpendSummary> = {}
): SafeToSpendSummary => ({
  status: 'unknown',
  dailyAmount: 0,
  remainingAmount: 0,
  periodStart: new Date('2026-06-01T00:00:00.000Z'),
  periodEnd: new Date('2026-06-30T23:59:59.999Z'),
  daysLeft: 0,
  confidence: 'low',
  explanation: 'Not enough data.',
  inputs: {
    incomeSoFar: 0,
    spentSoFar: 0,
    expectedRecurring: 0,
  },
  ...overrides,
});

describe('analytics empty states', () => {
  it('uses a generous gap between insight cards', () => {
    expect(INSIGHTS_CARD_GAP).toBe('$4');
  });

  it('shows an intentional empty insight inbox state', () => {
    const state = getInsightInboxEmptyState();

    expect(state.title).toBe('No insights yet');
    expect(state.body).toContain('categorized transactions');
  });

  it('replaces zero weekly recap copy with a useful empty state', () => {
    const state = getWeeklyRecapDisplayState(weeklyRecap());

    expect(state.isEmpty).toBe(true);
    expect(state.title).toBe('Nothing to recap yet');
    expect(state.summary).toContain('This week is still waiting');
  });

  it('keeps real weekly recap copy when there is activity', () => {
    const state = getWeeklyRecapDisplayState(
      weeklyRecap({ totalSpent: 42, summary: 'You spent €42 this week.' })
    );

    expect(state.isEmpty).toBe(false);
    expect(state.summary).toBe('You spent €42 this week.');
  });

  it('uses a clear safe-to-spend empty label when unknown', () => {
    expect(getSafeToSpendDisplayText(safeToSpend(), 'RSD')).toBe('Add income first');
  });
});
