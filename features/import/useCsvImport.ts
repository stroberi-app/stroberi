import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import type { RefObject } from 'react';
import { useRef, useState } from 'react';
import { currencies } from '../../data/currencies';
import { createCategoriesBatch } from '../../database/actions/categories';
import {
  type ConversionCache,
  createTransactionsBatch,
} from '../../database/actions/transactions';
import type { CategoryModel } from '../../database/category-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import useToast from '../../hooks/useToast';
import {
  formatFileSize,
  isLargeImportFile,
  MAX_IMPORT_FILE_SIZE_BYTES,
} from '../../lib/dataLimits';
import { doExport } from '../../lib/downloads';
import { processImportBatches, type ProcessImportBatchesResult } from './batching';
import { parseImportCsv } from './parsing';
import { buildImportTransactionPayloads, prepareImportRows } from './preparation';
import type { ErrorInfo, ImportRowFailure } from './types';

export interface ImportProgress {
  phase: 'parsing' | 'validating' | 'importing' | 'complete';
  current: number;
  total: number;
  message: string;
}

type ImportSession = {
  validTransactions: ReturnType<typeof buildImportTransactionPayloads>;
  conversionCache: ConversionCache;
  importedCount: number;
  nextBatchIndex: number;
};

const BATCH_SIZE = 100;
const supportedCurrencyCodes = currencies.map((currency) => currency.code);

const describeFailures = (failed: ImportRowFailure[]) =>
  failed.map((failure) => `Row ${failure.row}: ${failure.reason}`);

const CSV_TEMPLATE = `merchant,amount,date,note,currencyCode,category,categoryIcon
Starbucks,-4.50,2024-01-15,Morning coffee,USD,Food & Drink,☕
Amazon,-29.99,2024-01-14,Book purchase,USD,Shopping,📦
Salary,3000.00,2024-01-01,Monthly salary,USD,Income,💰`;

type UseCsvImportParams = {
  sheetRef: RefObject<BottomSheetModal | null>;
  errorSheetRef: RefObject<BottomSheetModal | null>;
};

export const useCsvImport = ({ sheetRef, errorSheetRef }: UseCsvImportParams) => {
  const toast = useToast();
  const database = useDatabase();
  const { defaultCurrency } = useDefaultCurrency();

  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  const importSessionRef = useRef<ImportSession | null>(null);

  const showError = (error: ErrorInfo) => {
    setErrorInfo(error);
    errorSheetRef.current?.present();
  };

  const hideError = () => {
    errorSheetRef.current?.dismiss();
    setErrorInfo(null);
  };

  const stopImporting = () => {
    setImporting(false);
    setProgress(null);
  };

  /** Ends the current import attempt and explains why. */
  const fail = (error: ErrorInfo) => {
    stopImporting();
    showError(error);
  };

  const resetAllStates = () => {
    setImporting(false);
    setDownloading(false);
    setProgress(null);
    setErrorInfo(null);
    importSessionRef.current = null;
  };

  const clearImportSession = () => {
    importSessionRef.current = null;
  };

  const updateImportProgress = (session: ImportSession) => {
    setProgress({
      phase: 'importing',
      current: session.importedCount,
      total: session.validTransactions.length,
      message:
        session.importedCount > 0
          ? `Added ${session.importedCount} out of ${session.validTransactions.length} transactions`
          : 'Adding transactions to your account...',
    });
  };

  const runImportSession = async (session: ImportSession) => {
    updateImportProgress(session);

    return processImportBatches({
      transactions: session.validTransactions,
      batchSize: BATCH_SIZE,
      startBatchIndex: session.nextBatchIndex,
      initialImportedCount: session.importedCount,
      conversionCache: session.conversionCache,
      createBatch: createTransactionsBatch,
      onBatchSuccess: ({ importedCount, nextBatchIndex }) => {
        session.importedCount = importedCount;
        session.nextBatchIndex = nextBatchIndex;
        updateImportProgress(session);
      },
    });
  };

  // Shared completion handling for both a fresh import and a resumed import.
  const finalizeImport = (
    session: ImportSession,
    importResult: ProcessImportBatchesResult
  ) => {
    const total = session.validTransactions.length;

    clearImportSession();
    setProgress({
      phase: 'complete',
      current: importResult.importedCount,
      total,
      message: 'All done! Your transactions are ready.',
    });

    if (importResult.importedCount > 0 && importResult.failed.length === 0) {
      toast.show({
        title: '🎉 Import successful!',
        message: `Successfully imported ${importResult.importedCount} ${importResult.importedCount === 1 ? 'transaction' : 'transactions'} to your account.`,
        preset: 'custom',
        duration: 4,
      });
    } else if (importResult.importedCount > 0) {
      toast.show({
        title: 'Import completed with issues',
        message: `Imported ${importResult.importedCount} transactions and skipped ${importResult.failed.length} rows.`,
        preset: 'custom',
        duration: 5,
      });

      showError({
        title: 'Some Rows Were Skipped',
        message:
          'A few rows could not be imported. Review the details below and retry those rows if needed.',
        errors: describeFailures(importResult.failed),
        type: 'validation',
        showTemplateButton: false,
        showRetryButton: false,
      });
    } else {
      showError({
        title: 'No Transactions Imported',
        message: 'No rows could be imported. Review the issues below and try again.',
        errors: describeFailures(importResult.failed),
        type: 'validation',
        showTemplateButton: true,
        showRetryButton: true,
      });
    }

    if (importResult.importedCount > 0) {
      sheetRef.current?.dismiss();
      setTimeout(stopImporting, 500);
    } else {
      stopImporting();
    }
  };

  const handleImportError = () => {
    fail({
      title: 'Import Failed',
      message:
        "We couldn't complete the import. Try Again will continue from the last successful batch.",
      type: 'import',
      showRetryButton: true,
    });
  };

  const handleImport = async () => {
    // Prevent multiple simultaneous imports
    if (importing) return;

    // Reset all states at the beginning
    setImporting(true);
    setProgress(null);
    setErrorInfo(null);
    clearImportSession();

    try {
      setProgress({
        phase: 'parsing',
        current: 0,
        total: 0,
        message: 'Choose your CSV file...',
      });

      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'application/csv'],
        copyToCacheDirectory: true,
      });
      if (!res.assets?.[0].uri) {
        stopImporting();
        return;
      }

      const importBaseCurrency = defaultCurrency;
      if (!importBaseCurrency) {
        fail({
          title: 'Default Currency Required',
          message:
            'Set your default currency in Settings > Default Currency, then retry import.',
          type: 'validation',
          showRetryButton: false,
        });
        return;
      }

      setProgress((prev) => (prev ? { ...prev, message: 'Reading your file...' } : null));

      const file = new File(res.assets[0].uri);
      const fileSize =
        typeof file.size === 'number'
          ? file.size
          : typeof res.assets[0].size === 'number'
            ? res.assets[0].size
            : null;

      if (fileSize !== null && isLargeImportFile(fileSize)) {
        fail({
          title: 'CSV File Too Large',
          message: `This file is ${formatFileSize(fileSize)}. Import works best under ${formatFileSize(MAX_IMPORT_FILE_SIZE_BYTES)}. Please split it into smaller files and try again.`,
          type: 'file',
          showTemplateButton: false,
          showRetryButton: true,
        });
        return;
      }

      const content = await file.text();

      setProgress((prev) =>
        prev ? { ...prev, message: 'Processing CSV data...' } : null
      );

      const parsed = parseImportCsv(content);
      if (!parsed.ok) {
        fail(parsed.error);
        return;
      }

      setProgress({
        phase: 'validating',
        current: 0,
        total: parsed.rows.length,
        message: 'Checking your transactions...',
      });

      const existingCategories = await database
        .get<CategoryModel>('categories')
        .query()
        .fetch();
      const categoryNameMap = new Map(
        existingCategories.map((category) => [
          category.name.trim().toLowerCase(),
          category.id,
        ])
      );

      const { preparedTransactions, categoriesToCreate, errors } = prepareImportRows({
        rows: parsed.rows,
        supportedCurrencyCodes,
        existingCategoryNames: new Set(categoryNameMap.keys()),
        baseCurrency: importBaseCurrency,
      });

      if (errors.length > 0) {
        fail({
          title: 'Data Validation Issues',
          message: `We found ${errors.length} issue${errors.length > 1 ? 's' : ''} in your CSV file. Please fix these issues and try importing again.`,
          errors,
          type: 'validation',
          showTemplateButton: true,
          showRetryButton: true,
        });
        return;
      }

      if (preparedTransactions.length === 0) {
        fail({
          title: 'No Valid Transactions',
          message:
            "We couldn't find any valid transactions in your CSV file. Please check the format and try again.",
          type: 'validation',
          showTemplateButton: true,
          showRetryButton: true,
        });
        return;
      }

      if (categoriesToCreate.size > 0) {
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                message: `Creating ${categoriesToCreate.size} new categor${categoriesToCreate.size > 1 ? 'ies' : 'y'}...`,
              }
            : null
        );

        try {
          const createdCategories = await createCategoriesBatch(
            Array.from(categoriesToCreate.values())
          );

          for (const category of createdCategories) {
            categoryNameMap.set(category.name.trim().toLowerCase(), category.id);
          }
        } catch (_error) {
          fail({
            title: 'Category Creation Failed',
            message:
              "We couldn't create some of the new categories found in your file. Please check for duplicates or invalid data.",
            type: 'import',
            showRetryButton: true,
          });
          return;
        }
      }

      const validTransactions = buildImportTransactionPayloads({
        preparedTransactions,
        categoryIdsByName: categoryNameMap,
      });

      const importSession: ImportSession = {
        validTransactions,
        conversionCache: new Map(),
        importedCount: 0,
        nextBatchIndex: 0,
      };

      importSessionRef.current = importSession;

      const importResult = await runImportSession(importSession);
      finalizeImport(importSession, importResult);
    } catch (_error) {
      handleImportError();
    }
  };

  const resumeImport = async () => {
    const importSession = importSessionRef.current;
    if (!importSession) {
      return handleImport();
    }

    if (importing) {
      return;
    }

    setImporting(true);
    setProgress(null);
    setErrorInfo(null);

    try {
      const importResult = await runImportSession(importSession);
      finalizeImport(importSession, importResult);
    } catch (_error) {
      handleImportError();
    }
  };

  const handleRetry = () => {
    const canResumeImport =
      errorInfo?.type === 'import' && importSessionRef.current !== null;

    // First dismiss the error sheet and reset error state
    hideError();
    // Small delay to ensure sheet is dismissed before starting new import
    setTimeout(() => {
      if (canResumeImport) {
        resumeImport();
        return;
      }

      handleImport();
    }, 300);
  };

  const handleDownloadCSVFileTemplate = async () => {
    setDownloading(true);
    try {
      const filename = 'stroberi_csv_template.csv';
      await doExport(filename, CSV_TEMPLATE, 'text/csv');
    } catch (_e) {
      showError({
        title: 'Download Failed',
        message: "We couldn't create the template file. Please try again.",
        type: 'file',
        showRetryButton: false,
      });
    }
    setDownloading(false);
  };

  return {
    importing,
    downloading,
    progress,
    errorInfo,
    resetAllStates,
    hideError,
    handleImport,
    handleRetry,
    handleDownloadCSVFileTemplate,
  };
};
