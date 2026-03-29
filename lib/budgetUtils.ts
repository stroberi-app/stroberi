import dayjs from 'dayjs';
import type { BudgetModel, BudgetPeriod } from '../database/budget-model';
import './date';

type BudgetPeriodConfig = Pick<BudgetModel, 'period' | 'startDate'>;
type BudgetRolloverConfig = Pick<BudgetModel, 'amount' | 'rollover'>;

const shiftPeriod = (date: dayjs.Dayjs, period: BudgetPeriod, periods: number) => {
  if (periods === 0) {
    return date;
  }

  switch (period) {
    case 'weekly':
      return date.add(periods, 'week');
    case 'monthly':
      return date.add(periods, 'month');
    case 'yearly':
      return date.add(periods, 'year');
    default:
      return date.add(periods, 'month');
  }
};

export const calculateBudgetPeriodDates = (
  budget: BudgetPeriodConfig,
  periodOffset = 0
) => {
  const now = dayjs();
  const startDate = dayjs(budget.startDate);

  let currentPeriodStart = startDate;

  switch (budget.period) {
    case 'weekly': {
      while (currentPeriodStart.add(1, 'week').isBefore(now)) {
        currentPeriodStart = currentPeriodStart.add(1, 'week');
      }
      currentPeriodStart = shiftPeriod(currentPeriodStart, budget.period, periodOffset);
      return {
        start: currentPeriodStart.toDate(),
        end: currentPeriodStart.add(1, 'week').subtract(1, 'second').toDate(),
      };
    }
    case 'monthly': {
      while (currentPeriodStart.add(1, 'month').isBefore(now)) {
        currentPeriodStart = currentPeriodStart.add(1, 'month');
      }
      currentPeriodStart = shiftPeriod(currentPeriodStart, budget.period, periodOffset);
      return {
        start: currentPeriodStart.toDate(),
        end: currentPeriodStart.add(1, 'month').subtract(1, 'second').toDate(),
      };
    }
    case 'yearly': {
      while (currentPeriodStart.add(1, 'year').isBefore(now)) {
        currentPeriodStart = currentPeriodStart.add(1, 'year');
      }
      currentPeriodStart = shiftPeriod(currentPeriodStart, budget.period, periodOffset);
      return {
        start: currentPeriodStart.toDate(),
        end: currentPeriodStart.add(1, 'year').subtract(1, 'second').toDate(),
      };
    }
    default:
      currentPeriodStart = shiftPeriod(currentPeriodStart, budget.period, periodOffset);
      return {
        start: currentPeriodStart.toDate(),
        end: currentPeriodStart.add(1, 'month').subtract(1, 'second').toDate(),
      };
  }
};

export const getNextPeriodDate = (period: BudgetPeriod, currentDate: Date): Date => {
  const current = dayjs(currentDate);

  switch (period) {
    case 'weekly':
      return current.add(1, 'week').toDate();
    case 'monthly':
      return current.add(1, 'month').toDate();
    case 'yearly':
      return current.add(1, 'year').toDate();
    default:
      return current.add(1, 'month').toDate();
  }
};

export const calculateRollover = (
  budget: BudgetRolloverConfig,
  previousSpent: number
): number => {
  if (!budget.rollover) {
    return 0;
  }

  const remaining = budget.amount - previousSpent;
  return remaining > 0 ? remaining : 0;
};

export const getBudgetProgressColor = (percentage: number, threshold: number): string => {
  if (percentage >= 100) {
    return '$stroberi';
  }
  if (percentage >= threshold) {
    return '$yellow';
  }
  return '$green';
};

export const formatBudgetPeriod = (period: BudgetPeriod): string => {
  switch (period) {
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Monthly';
  }
};

export const getPeriodLabel = (budget: BudgetModel): string => {
  const { start, end } = calculateBudgetPeriodDates(budget);
  const format = budget.period === 'yearly' ? 'MMM D, YYYY' : 'MMM D';

  return `${dayjs(start).format(format)} - ${dayjs(end).format(format)}`;
};
