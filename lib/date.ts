import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

export enum DateFormats {
  FullMonthFullDay = 'MMM DD',
  FullMonthFullDayTime = 'MMM DD HH:mm',
}

export function formatDateRange(from: dayjs.Dayjs, to: dayjs.Dayjs): string {
  if (from.date() === 1 && to.date() === to.daysInMonth() && from.isSame(to, 'month')) {
    return from.format('MMM YYYY');
  } else if (from.isSame(to, 'year')) {
    return `${from.format('MMM D')} - ${to.format('MMM D, YYYY')}`;
  } else {
    return `${from.format('MMM D, YYYY')} - ${to.format('MMM D, YYYY')}`;
  }
}

export type DateFilters = 'This Year' | 'This Month' | 'Custom';
