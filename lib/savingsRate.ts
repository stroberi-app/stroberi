import type { SavingsRateAnalysis } from './advancedAnalytics';

export type SavingsRateStatus = 'onTrack' | 'behind' | 'unknown';

export interface SavingsRateChartPoint {
  month: string;
  rate: number;
}

export interface SavingsRateSummary {
  currentRate: number;
  target: number;
  status: SavingsRateStatus;
  gap: number;
  chartData: SavingsRateChartPoint[];
  averageRate: number;
  bestMonth: SavingsRateChartPoint | null;
  monthsMet: number;
  streak: number;
  tip: string;
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

export const buildSavingsRateSummary = ({
  analysis,
  target,
}: {
  analysis: SavingsRateAnalysis;
  target: number;
}): SavingsRateSummary => {
  const months = analysis.monthlyRates;
  const chartData: SavingsRateChartPoint[] = months.map((m) => ({
    month: m.month,
    rate: round1(m.rate),
  }));

  const current = months.length > 0 ? months[months.length - 1] : null;
  const currentRate = current ? round1(current.rate) : 0;

  let status: SavingsRateStatus;
  if (!current || current.income <= 0) {
    status = 'unknown';
  } else {
    status = currentRate >= target ? 'onTrack' : 'behind';
  }

  const gap = round1(currentRate - target);

  const averageRate =
    chartData.length > 0
      ? round1(chartData.reduce((s, m) => s + m.rate, 0) / chartData.length)
      : 0;

  const bestMonth = chartData.reduce<SavingsRateChartPoint | null>((best, m) => {
    if (!best || m.rate > best.rate) {
      return m;
    }
    return best;
  }, null);

  const monthsMet = chartData.filter((m) => m.rate >= target).length;

  let streak = 0;
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (chartData[i].rate >= target) {
      streak++;
    } else {
      break;
    }
  }

  let tip: string;
  if (status === 'unknown') {
    tip = 'Add income for this month to start tracking your savings rate.';
  } else if (status === 'onTrack') {
    tip = `You're ${round1(currentRate - target)}% above your ${target}% target. Keep it up.`;
  } else {
    const income = current ? current.income : 0;
    const targetSavings = (target / 100) * income;
    const currentSavings = income - (current ? current.expenses : 0);
    const extraNeeded = round2(Math.max(0, targetSavings - currentSavings));
    tip = `Save ${extraNeeded} more this month to reach your ${target}% target.`;
  }

  return {
    currentRate,
    target,
    status,
    gap,
    chartData,
    averageRate,
    bestMonth,
    monthsMet,
    streak,
    tip,
  };
};
