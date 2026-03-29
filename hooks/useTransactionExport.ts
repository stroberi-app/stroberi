import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import dayjs from 'dayjs';
import Papa from 'papaparse';
import { useState } from 'react';
import type { TransactionModel } from '../database/transaction-model';
import { doExport } from '../lib/downloads';
import useToast from './useToast';

export type ExportColumn = {
  name: string;
  checked: boolean;
  label: string;
};

export type ExportDateRange = {
  fromDate: Date;
  toDate: Date;
};

export type TransactionExportData = {
  id: string;
  merchant: string;
  amount: number;
  amountInBaseCurrency: number;
  date: string;
  note: string;
  currencyCode: string;
  baseCurrencyCode: string;
  exchangeRate: number;
  category: string;
  categoryIcon: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type ExportDestination = 'csv' | 'json';

export type ExportOptions = {
  dateRange: ExportDateRange;
  columns: ExportColumn[];
  destination: ExportDestination;
  preloadedTransactions?: TransactionExportData[];
};

export const EXPORT_PREVIEW_FULL_THRESHOLD = 500;
export const EXPORT_PREVIEW_SAMPLE_SIZE = 200;

// Shared default export columns
export const DEFAULT_EXPORT_COLUMNS: ExportColumn[] = [
  { name: 'date', checked: true, label: 'date' },
  { name: 'amount', checked: true, label: 'amount' },
  { name: 'merchant', checked: true, label: 'merchant' },
  { name: 'category', checked: true, label: 'category' },
  { name: 'currencyCode', checked: true, label: 'currencyCode' },
  { name: 'note', checked: true, label: 'note' },
];

export const EXTENDED_EXPORT_COLUMNS: ExportColumn[] = [
  ...DEFAULT_EXPORT_COLUMNS,
  { name: 'baseCurrencyCode', checked: true, label: 'baseCurrencyCode' },
  { name: 'amountInBaseCurrency', checked: true, label: 'amountInBaseCurrency' },
  { name: 'exchangeRate', checked: true, label: 'exchangeRate' },
];

export const isPartialPreviewCount = (count: number) => {
  return count > EXPORT_PREVIEW_FULL_THRESHOLD;
};

const getDateRangeBounds = (dateRange: ExportDateRange) => {
  return {
    from: dayjs(dateRange.fromDate).startOf('day').toDate().getTime(),
    to: dayjs(dateRange.toDate).endOf('day').toDate().getTime(),
  };
};

const useTransactionExport = () => {
  const [isLoading, setIsLoading] = useState(false);

  const database = useDatabase();
  const { show } = useToast();

  const validateExportOptions = (options: ExportOptions): string | null => {
    const { dateRange, columns } = options;

    if (dayjs(dateRange.fromDate).isAfter(dayjs(dateRange.toDate))) {
      return 'From date must be before to date';
    }

    if (!columns.some((col) => col.checked)) {
      return 'Please select at least one column to export';
    }

    return null;
  };

  const fetchTransactionsRaw = async (
    dateRange: ExportDateRange,
    limit?: number
  ): Promise<TransactionExportData[]> => {
    const { from, to } = getDateRangeBounds(dateRange);
    const params = limit ? [from, to, limit] : [from, to];
    const limitClause = limit ? 'LIMIT ?' : '';

    try {
      const transactions = await database.collections
        .get<TransactionModel>('transactions')
        .query(
          Q.unsafeSqlQuery(
            `
            SELECT 
              transactions.id,
              transactions.merchant,
              transactions.amount,
              transactions.amountInBaseCurrency,
              transactions.currencyCode,
              transactions.baseCurrencyCode,
              transactions.exchangeRate,
              transactions.note,
              transactions.categoryId,
              categories.name as category,
              categories.icon as categoryIcon,
              strftime('%Y-%m-%d %H:%M:%S', transactions.date / 1000, 'unixepoch') as date,
              strftime('%Y-%m-%d %H:%M:%S', transactions.created_at / 1000, 'unixepoch') as createdAt,
              strftime('%Y-%m-%d %H:%M:%S', transactions.updated_at / 1000, 'unixepoch') as updatedAt
            FROM transactions
            LEFT JOIN categories ON transactions.categoryId = categories.id
            WHERE transactions.date >= ? AND transactions.date <= ? AND 
                transactions._status != 'deleted'
            ORDER BY transactions.date DESC
            ${limitClause}
          `,
            params
          )
        )
        .unsafeFetchRaw();

      return transactions as TransactionExportData[];
    } catch (_error) {
      throw new Error('Failed to fetch transactions');
    }
  };

  const fetchTransactionsForExport = async (
    dateRange: ExportDateRange
  ): Promise<TransactionExportData[]> => {
    return fetchTransactionsRaw(dateRange);
  };

  const fetchTransactionsCount = async (dateRange: ExportDateRange): Promise<number> => {
    if (dayjs(dateRange.fromDate).isAfter(dayjs(dateRange.toDate))) {
      return 0;
    }

    const { from, to } = getDateRangeBounds(dateRange);

    try {
      const results = await database.collections
        .get<TransactionModel>('transactions')
        .query(
          Q.unsafeSqlQuery(
            `
            SELECT COUNT(*) as totalCount
            FROM transactions
            WHERE transactions.date >= ? AND transactions.date <= ? AND
              transactions._status != 'deleted'
          `,
            [from, to]
          )
        )
        .unsafeFetchRaw();

      const rawCount =
        (results[0] as { totalCount?: number | string } | undefined)?.totalCount ?? 0;
      return Number(rawCount);
    } catch (_error) {
      return 0;
    }
  };

  const fetchTransactionsSample = async (
    dateRange: ExportDateRange
  ): Promise<TransactionExportData[]> => {
    return fetchTransactionsRaw(dateRange, EXPORT_PREVIEW_SAMPLE_SIZE);
  };

  const formatDataForExport = (
    transactions: TransactionExportData[],
    columns: ExportColumn[]
  ): Record<string, unknown>[] => {
    const selectedColumns = columns.filter((column) => column.checked);

    return transactions.map((transaction) => {
      const exportRow: Record<string, unknown> = {};

      for (const column of selectedColumns) {
        exportRow[column.label] = transaction[column.name];
      }

      return exportRow;
    });
  };

  const saveExportData = async ({
    transactions,
    dateRange,
    columns,
    destination,
  }: {
    transactions: TransactionExportData[];
    dateRange: ExportDateRange;
    columns: ExportColumn[];
    destination: ExportDestination;
  }): Promise<void> => {
    const formattedData = formatDataForExport(transactions, columns);
    const filename = generateFilename(dateRange, destination);
    const content =
      destination === 'csv'
        ? Papa.unparse(formattedData)
        : JSON.stringify(formattedData, null, 2);
    const mimeType = destination === 'csv' ? 'text/csv' : 'application/json';

    await doExport(filename, content, mimeType);
  };

  const generateFilename = (
    dateRange: ExportDateRange,
    destination: ExportDestination
  ): string => {
    const dateRangeStr = `${dayjs(dateRange.fromDate).format('YYYY-MM-DD')}_to_${dayjs(dateRange.toDate).format('YYYY-MM-DD')}`;
    const extension = destination === 'json' ? 'json' : 'csv';
    return `stroberi_transactions_${dateRangeStr}.${extension}`;
  };

  const exportTransactions = async (options: ExportOptions): Promise<void> => {
    const validationError = validateExportOptions(options);
    if (validationError) {
      show({ title: validationError, preset: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const transactions =
        options.preloadedTransactions ??
        (await fetchTransactionsForExport(options.dateRange));

      if (transactions.length === 0) {
        show({
          title: 'No transactions found in the selected date range',
          preset: 'error',
        });
        return;
      }

      await saveExportData({
        transactions,
        dateRange: options.dateRange,
        columns: options.columns,
        destination: options.destination,
      });

      show({
        title: `Successfully exported ${transactions.length} transactions`,
        preset: 'done',
      });
    } catch (error) {
      show({
        title:
          error instanceof Error ? error.message : 'Export failed. Please try again.',
        preset: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    exportTransactions,
    fetchTransactionsCount,
    fetchTransactionsForExport,
    fetchTransactionsSample,
    isLoading,
    saveExportData,
    validateExportOptions,
  };
};

export default useTransactionExport;
