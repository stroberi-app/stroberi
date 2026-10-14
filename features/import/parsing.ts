import Papa from 'papaparse';
import type { ErrorInfo } from './types';
import type { CSVRow } from './validation';

export const REQUIRED_IMPORT_COLUMNS = ['amount', 'date', 'currencyCode'] as const;

export type ParsedImportCsv =
  | { ok: true; rows: CSVRow[] }
  | { ok: false; error: ErrorInfo };

/** Parses CSV text and checks it has rows and the columns import needs. */
export const parseImportCsv = (content: string): ParsedImportCsv => {
  const results = Papa.parse<CSVRow>(content, { header: true, skipEmptyLines: true });

  if (results.errors.length > 0) {
    return {
      ok: false,
      error: {
        title: "Can't Read Your File",
        message:
          "There seems to be an issue with your CSV file format. Make sure it's a valid CSV file and try again.",
        type: 'parse',
        showTemplateButton: true,
        showRetryButton: true,
      },
    };
  }

  if (results.data.length === 0) {
    return {
      ok: false,
      error: {
        title: 'Empty File',
        message:
          "Your CSV file doesn't contain any transaction data. Please check the file and try again.",
        type: 'file',
        showTemplateButton: true,
        showRetryButton: true,
      },
    };
  }

  const missingColumns = REQUIRED_IMPORT_COLUMNS.filter(
    (column) => !results.meta.fields?.includes(column)
  );
  if (missingColumns.length > 0) {
    return {
      ok: false,
      error: {
        title: 'Wrong Format',
        message:
          'Your CSV file is missing required columns. Please make sure your file includes all the necessary columns and matches our template format.',
        errors: [`Missing columns: ${missingColumns.join(', ')}`],
        type: 'format',
        showTemplateButton: true,
        showRetryButton: true,
      },
    };
  }

  return { ok: true, rows: results.data };
};
