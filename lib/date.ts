import dayjs from 'dayjs';

export enum DateFormats {
  FullMonthFullDay = 'MMM DD',
  FullMonthFullDayTime = 'MMM DD HH:mm',
}

export function formatDateRange(fromDate: number, toDate: number): string {
  const from = dayjs(fromDate);
  const to = dayjs(toDate);

  if (from.date() === 1 && to.date() === to.daysInMonth() && from.isSame(to, 'month')) {
    return from.format('MMM YYYY');
  } else if (from.isSame(to, 'year')) {
    return `${from.format('MMM D')} - ${to.format('MMM D, YYYY')}`;
  } else {
    return `${from.format('MMM D, YYYY')} - ${to.format('MMM D, YYYY')}`;
  }
}
