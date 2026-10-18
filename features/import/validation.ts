import dayjs from 'dayjs';

export interface CSVRow {
  merchant?: string;
  amount: string;
  date: string;
  note?: string;
  currencyCode: string;
  category?: string;
  categoryIcon?: string;
}

export const normalizeCurrencyCode = (currencyCode: string) =>
  currencyCode.trim().toUpperCase();

/**
 * Parses an import date in local time. `new Date('2024-01-15')` would read a
 * date-only value as UTC midnight, shifting it to the previous day west of UTC.
 */
export const parseImportDate = (value: string): Date | null => {
  const parsed = dayjs(value.trim());
  return parsed.isValid() ? parsed.toDate() : null;
};

export const validateCSVRow = (
  row: CSVRow,
  index: number,
  supportedCurrencyCodes: string[]
): string[] => {
  const errors: string[] = [];
  const amount = row.amount?.trim() ?? '';
  const date = row.date?.trim() ?? '';
  const currencyCode = normalizeCurrencyCode(row.currencyCode ?? '');
  const missingFields: string[] = [];

  if (!amount) {
    missingFields.push('amount');
  }

  if (!date) {
    missingFields.push('date');
  }

  if (!currencyCode) {
    missingFields.push('currency');
  }

  if (missingFields.length > 0) {
    errors.push(`Row ${index + 1}: Missing required fields: ${missingFields.join(', ')}`);
  }

  if (amount && Number.isNaN(Number(amount))) {
    errors.push(`Row ${index + 1}: Amount must be a valid number`);
  }

  if (date && !parseImportDate(date)) {
    errors.push(`Row ${index + 1}: Date format is invalid (use YYYY-MM-DD)`);
  }

  if (currencyCode && !supportedCurrencyCodes.includes(currencyCode)) {
    errors.push(`Row ${index + 1}: Currency code '${currencyCode}' is not supported`);
  }

  return errors;
};
