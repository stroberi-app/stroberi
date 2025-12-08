import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import dayjs from 'dayjs';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import { useState } from 'react';
import { Platform } from 'react-native';
import type { TransactionModel } from '../database/transaction-model';
import useToast from './useToast';
import { saveUriToDownloadsOnAndroid } from '../lib/androidDownloads';

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
};

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

const useTransactionExport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

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

  const fetchTransactionsForExport = async (
    dateRange: ExportDateRange
  ): Promise<TransactionExportData[]> => {
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
          `,
            [
              dayjs(dateRange.fromDate).startOf('day').toDate().getTime(),
              dayjs(dateRange.toDate).endOf('day').toDate().getTime(),
            ]
          )
        )
        .unsafeFetchRaw();

      return transactions as TransactionExportData[];
    } catch (_error) {
      throw new Error('Failed to fetch transactions');
    }
  };

  const getPreviewCount = async (dateRange: ExportDateRange): Promise<number> => {
    if (dayjs(dateRange.fromDate).isAfter(dayjs(dateRange.toDate))) {
      return 0;
    }

    setIsLoadingPreview(true);
    try {
      const count = await database.collections
        .get<TransactionModel>('transactions')
        .query(
          Q.where(
            'date',
            Q.gte(dayjs(dateRange.fromDate).startOf('day').toDate().getTime())
          ),
          Q.where('date', Q.lte(dayjs(dateRange.toDate).endOf('day').toDate().getTime()))
        )
        .fetchCount();

      setPreviewCount(count);
      return count;
    } catch (_error) {
      setPreviewCount(null);
      return 0;
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const formatDataForExport = (
    transactions: TransactionExportData[],
    columns: ExportColumn[]
  ): Record<string, unknown>[] => {
    return transactions.map((transaction) => {
      const exportRow: Record<string, unknown> = {};
      columns.forEach((column) => {
        if (column.checked) {
          exportRow[column.label] = transaction[column.name];
        }
      });
      return exportRow;
    });
  };

  const showSaveOptions = async (
    data: Record<string, unknown>[],
    filename: string,
    fileType: 'csv' | 'json'
  ): Promise<void> => {
    const content =
      fileType === 'csv' ? Papa.unparse(data) : JSON.stringify(data, null, 2);
    const mimeType = fileType === 'csv' ? 'text/csv' : 'application/json';

    const tempPath = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(tempPath, content);

    if (Platform.OS === 'android') {
      await saveUriToDownloadsOnAndroid({
        sourceUri: tempPath,
        filename,
        mimeType,
      });
    } else {
      await Sharing.shareAsync(tempPath, {
        dialogTitle: `Save ${fileType.toUpperCase()} File`,
        mimeType,
      });
    }

    setTimeout(async () => {
      try {
        await FileSystem.deleteAsync(tempPath, { idempotent: true });
      } catch (_error) {}
    }, 5000);
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

    if (previewCount === 0) {
      show({
        title: 'No transactions found in the selected date range',
        preset: 'error',
      });
      return;
    }

    setIsLoading(true);
    try {
      const transactions = await fetchTransactionsForExport(options.dateRange);
      const formattedData = formatDataForExport(transactions, options.columns);

      const filename = generateFilename(options.dateRange, options.destination);

      switch (options.destination) {
        case 'csv':
          await showSaveOptions(formattedData, filename, 'csv');
          break;
        case 'json':
          await showSaveOptions(formattedData, filename, 'json');
          break;
        default:
          throw new Error(`Unsupported export destination: ${options.destination}`);
      }

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
    getPreviewCount,
    fetchTransactionsForExport,
    isLoading,
    previewCount,
    isLoadingPreview,
    validateExportOptions,
  };
};

export default useTransactionExport;
