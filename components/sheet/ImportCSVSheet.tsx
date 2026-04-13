import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  FolderInput,
  Info,
} from '@tamagui/lucide-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import type React from 'react';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Progress, Separator, Spinner, Text, View, XStack, YStack } from 'tamagui';
import { currencies } from '../../data/currencies';
import type { CategoryModel } from '../../database/category-model';
import { createCategoriesBatch } from '../../database/actions/categories';
import { createTransactionsBatch } from '../../database/actions/transactions';
import { processImportBatches } from '../../features/import/batching';
import {
  buildImportTransactionPayloads,
  prepareImportRows,
  type PreparedImportTransaction,
} from '../../features/import/preparation';
import type { CSVRow } from '../../features/import/validation';
import type { ConversionResult } from '../../lib/currencyConversion';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import useToast from '../../hooks/useToast';
import {
  MAX_IMPORT_FILE_SIZE_BYTES,
  formatFileSize,
  isLargeImportFile,
} from '../../lib/dataLimits';
import { doExport } from '../../lib/downloads';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { backgroundStyle, handleIndicatorStyle } from './constants';
import { type ErrorInfo, ErrorSheet } from './ErrorSheet';

type ImportCSVSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
};

interface ImportProgress {
  phase: 'parsing' | 'validating' | 'importing' | 'complete';
  current: number;
  total: number;
  message: string;
}

type ImportSession = {
  validTransactions: ReturnType<typeof buildImportTransactionPayloads>;
  conversionCache: Map<string, ConversionResult>;
  importedCount: number;
  nextBatchIndex: number;
};

const snapPoints = ['65%'];
const BATCH_SIZE = 100;
const supportedCurrencyCodes = currencies.map((currency) => currency.code);

export const ImportCSVSheet = ({ sheetRef }: ImportCSVSheetProps) => {
  const toast = useToast();
  const { bottom } = useSafeAreaInsets();
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  const errorSheetRef = useRef<BottomSheetModal>(null);
  const importSessionRef = useRef<ImportSession | null>(null);

  const { defaultCurrency } = useDefaultCurrency();
  const database = useDatabase();

  const showError = (error: ErrorInfo) => {
    setErrorInfo(error);
    errorSheetRef.current?.present();
  };

  const hideError = () => {
    errorSheetRef.current?.dismiss();
    setErrorInfo(null);
  };

  const resetAllStates = () => {
    setImporting(false);
    setDownloading(false);
    setProgress(null);
    setErrorInfo(null);
    importSessionRef.current = null;
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
        setImporting(false);
        setProgress(null);
        return;
      }

      const importBaseCurrency = defaultCurrency;
      if (!importBaseCurrency) {
        setImporting(false);
        setProgress(null);
        showError({
          title: 'Default Currency Required',
          message:
            'Set your default currency in Settings > Default Currency, then retry import.',
          type: 'validation',
          showRetryButton: false,
        });
        return;
      }

      setProgress((prev) => (prev ? { ...prev, message: 'Reading your file...' } : null));

      const fileInfo = await FileSystem.getInfoAsync(res.assets[0].uri);
      const fileSize =
        'size' in fileInfo && typeof fileInfo.size === 'number'
          ? fileInfo.size
          : typeof res.assets[0].size === 'number'
            ? res.assets[0].size
            : null;

      if (fileSize !== null && isLargeImportFile(fileSize)) {
        setImporting(false);
        setProgress(null);
        showError({
          title: 'CSV File Too Large',
          message: `This file is ${formatFileSize(fileSize)}. Import works best under ${formatFileSize(MAX_IMPORT_FILE_SIZE_BYTES)}. Please split it into smaller files and try again.`,
          type: 'file',
          showTemplateButton: false,
          showRetryButton: true,
        });
        return;
      }

      const content = await FileSystem.readAsStringAsync(res.assets[0].uri);

      setProgress((prev) =>
        prev ? { ...prev, message: 'Processing CSV data...' } : null
      );

      const results = Papa.parse<CSVRow>(content, {
        header: true,
        skipEmptyLines: true,
      });

      if (results.errors.length > 0) {
        setImporting(false);
        setProgress(null);
        showError({
          title: "Can't Read Your File",
          message:
            "There seems to be an issue with your CSV file format. Make sure it's a valid CSV file and try again.",
          type: 'parse',
          showTemplateButton: true,
          showRetryButton: true,
        });
        return;
      }

      if (results.data.length === 0) {
        setImporting(false);
        setProgress(null);
        showError({
          title: 'Empty File',
          message:
            "Your CSV file doesn't contain any transaction data. Please check the file and try again.",
          type: 'file',
          showTemplateButton: true,
          showRetryButton: true,
        });
        return;
      }

      const requiredColumns = ['amount', 'date', 'currencyCode'];
      const missingColumns = requiredColumns.filter(
        (col) => !results.meta.fields?.includes(col)
      );

      if (missingColumns.length > 0) {
        setImporting(false);
        setProgress(null);
        showError({
          title: 'Wrong Format',
          message:
            'Your CSV file is missing required columns. Please make sure your file includes all the necessary columns and matches our template format.',
          errors: [`Missing columns: ${missingColumns.join(', ')}`],
          type: 'format',
          showTemplateButton: true,
          showRetryButton: true,
        });
        return;
      }

      setProgress({
        phase: 'validating',
        current: 0,
        total: results.data.length,
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
      const existingCategoryNames = new Set(categoryNameMap.keys());

      const allErrors: string[] = [];
      const preparedTransactions: PreparedImportTransaction[] = [];
      const categoriesToCreate = new Map<string, { name: string; icon: string }>();

      for (let index = 0; index < results.data.length; index += BATCH_SIZE) {
        const chunk = results.data.slice(
          index,
          Math.min(index + BATCH_SIZE, results.data.length)
        );
        const preparedChunk = prepareImportRows({
          rows: chunk,
          supportedCurrencyCodes,
          existingCategoryNames,
          baseCurrency: importBaseCurrency,
          startIndex: index,
        });

        preparedTransactions.push(...preparedChunk.preparedTransactions);
        allErrors.push(...preparedChunk.errors);

        for (const [
          categoryName,
          categoryData,
        ] of preparedChunk.categoriesToCreate.entries()) {
          if (!categoriesToCreate.has(categoryName)) {
            categoriesToCreate.set(categoryName, categoryData);
          }
        }

        setProgress((prev) =>
          prev
            ? {
                ...prev,
                current: Math.min(index + BATCH_SIZE, results.data.length),
                message: `Validated ${Math.min(index + BATCH_SIZE, results.data.length)} out of ${results.data.length} transactions`,
              }
            : null
        );
      }

      if (allErrors.length > 0) {
        setImporting(false);
        setProgress(null);
        showError({
          title: 'Data Validation Issues',
          message: `We found ${allErrors.length} issue${allErrors.length > 1 ? 's' : ''} in your CSV file. Please fix these issues and try importing again.`,
          errors: allErrors,
          type: 'validation',
          showTemplateButton: true,
          showRetryButton: true,
        });
        return;
      }

      if (preparedTransactions.length === 0) {
        setImporting(false);
        setProgress(null);
        showError({
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
          setImporting(false);
          setProgress(null);
          showError({
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

      if (importResult.failed.length > 0) {
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                current: importResult.importedCount,
                message: `Imported ${importResult.importedCount} of ${validTransactions.length}; ${importResult.failed.length} skipped`,
              }
              : null
        );
      }

      clearImportSession();
      setProgress({
        phase: 'complete',
        current: importResult.importedCount,
        total: validTransactions.length,
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
          errors: importResult.failed
            .map((failure) => `Row ${failure.row}: ${failure.reason}`),
          type: 'validation',
          showTemplateButton: false,
          showRetryButton: false,
        });
      } else {
        showError({
          title: 'No Transactions Imported',
          message: 'No rows could be imported. Review the issues below and try again.',
          errors: importResult.failed
            .map((failure) => `Row ${failure.row}: ${failure.reason}`),
          type: 'validation',
          showTemplateButton: true,
          showRetryButton: true,
        });
      }

      if (importResult.importedCount > 0) {
        sheetRef.current?.dismiss();

        setTimeout(() => {
          setImporting(false);
          setProgress(null);
        }, 500);
      } else {
        setImporting(false);
        setProgress(null);
      }
    } catch (_error) {
      setImporting(false);
      setProgress(null);
      showError({
        title: 'Import Failed',
        message:
          "We couldn't complete the import. Try Again will continue from the last successful batch.",
        type: 'import',
        showRetryButton: true,
      });
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

      if (importResult.failed.length > 0) {
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                current: importResult.importedCount,
                message: `Imported ${importResult.importedCount} of ${importSession.validTransactions.length}; ${importResult.failed.length} skipped`,
              }
            : null
        );
      }

      clearImportSession();
      setProgress({
        phase: 'complete',
        current: importResult.importedCount,
        total: importSession.validTransactions.length,
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
          errors: importResult.failed
            .map((failure) => `Row ${failure.row}: ${failure.reason}`),
          type: 'validation',
          showTemplateButton: false,
          showRetryButton: false,
        });
      } else {
        showError({
          title: 'No Transactions Imported',
          message: 'No rows could be imported. Review the issues below and try again.',
          errors: importResult.failed
            .map((failure) => `Row ${failure.row}: ${failure.reason}`),
          type: 'validation',
          showTemplateButton: true,
          showRetryButton: true,
        });
      }

      if (importResult.importedCount > 0) {
        sheetRef.current?.dismiss();

        setTimeout(() => {
          setImporting(false);
          setProgress(null);
        }, 500);
      } else {
        setImporting(false);
        setProgress(null);
      }
    } catch (_error) {
      setImporting(false);
      setProgress(null);
      showError({
        title: 'Import Failed',
        message:
          "We couldn't complete the import. Try Again will continue from the last successful batch.",
        type: 'import',
        showRetryButton: true,
      });
    }
  };

  const handleDownloadCSVFileTemplate = async () => {
    setDownloading(true);
    try {
      const template = `merchant,amount,date,note,currencyCode,category,categoryIcon
Starbucks,-4.50,2024-01-15,Morning coffee,USD,Food & Drink,☕
Amazon,-29.99,2024-01-14,Book purchase,USD,Shopping,📦
Salary,3000.00,2024-01-01,Monthly salary,USD,Income,💰`;
      const filename = 'stroberi_csv_template.csv';
      await doExport(filename, template, 'text/csv');
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

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'parsing':
        return <FileText size={16} color="$blue9" />;
      case 'validating':
        return <AlertCircle size={16} color="$orange9" />;
      case 'importing':
        return <FolderInput size={16} color="$green9" />;
      case 'complete':
        return <CheckCircle size={16} color="$green9" />;
      default:
        return <Info size={16} color="$gray9" />;
    }
  };

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        enableContentPanningGesture={false}
        snapPoints={snapPoints}
        stackBehavior="push"
        enableDynamicSizing={false}
        enablePanDownToClose={!importing}
        animateOnMount={true}
        backdropComponent={CustomBackdrop}
        handleIndicatorStyle={handleIndicatorStyle}
        backgroundStyle={backgroundStyle}
        onAnimate={(fromIndex, toIndex) => {
          // Reset states when sheet is opened (going from -1 to 0)
          if (fromIndex === -1 && toIndex === 0) {
            resetAllStates();
          }
        }}
      >
        <View padding={'$4'} pb={bottom + 16} height={'100%'}>
          <XStack justifyContent={'space-between'} alignItems={'center'} mb={'$3'}>
            <Text fontSize={'$6'} fontWeight={'bold'} color={'$gray12'}>
              Import Transactions
            </Text>
            <FileText size={24} color="$gray9" />
          </XStack>

          <Separator mb={'$4'} />

          {!importing && !progress && (
            <YStack gap={'$3'} mb={'$4'}>
              <XStack alignItems={'flex-start'} gap={'$3'} pr={'$3'}>
                <Info size={18} color="$blue9" mt={'$1'} />
                <YStack flex={1} gap={'$2'}>
                  <Text fontSize={'$4'} fontWeight={'600'} color={'$gray12'}>
                    Ready to import your transactions?
                  </Text>
                  <Text fontSize={'$3'} color={'$gray11'} lineHeight={'$1'}>
                    Upload a CSV file with your transaction data. Make sure it includes
                    columns for amount, date, and currency code. Merchant is optional.
                  </Text>
                </YStack>
              </XStack>

              <XStack alignItems={'center'} gap={'$3'} mt={'$2'} pr={'$3'}>
                <Download size={16} color="$gray9" />
                <Text fontSize={'$3'} color={'$gray11'}>
                  Don't have a CSV? Download our template with example data to get
                  started.
                </Text>
              </XStack>
            </YStack>
          )}

          {progress && (
            <YStack
              gap={'$4'}
              my={'$4'}
              p={'$4'}
              backgroundColor={'$gray2'}
              borderRadius={'$4'}
            >
              <XStack alignItems={'center'} justifyContent={'center'} gap={'$3'}>
                {getPhaseIcon(progress.phase)}
                <Text
                  fontSize={'$4'}
                  fontWeight={'600'}
                  textAlign={'center'}
                  color={'$gray12'}
                >
                  {progress.message}
                </Text>
              </XStack>

              <YStack gap={'$2'}>
                <Progress
                  value={
                    progress.total > 0 ? (progress.current / progress.total) * 100 : 0
                  }
                  backgroundColor={'$gray5'}
                  height={'$1'}
                >
                  <Progress.Indicator backgroundColor={'$green9'} />
                </Progress>
                <XStack justifyContent={'space-between'} alignItems={'center'}>
                  <Text fontSize={'$2'} color={'$gray10'}>
                    {progress.phase === 'parsing' && 'Getting ready...'}
                    {progress.phase === 'validating' &&
                      `${progress.current} / ${progress.total}`}
                    {progress.phase === 'importing' &&
                      `${progress.current} / ${progress.total}`}
                    {progress.phase === 'complete' && 'Complete!'}
                  </Text>
                  <Text fontSize={'$2'} color={'$gray10'}>
                    {progress.total > 0
                      ? `${Math.round((progress.current / progress.total) * 100)}%`
                      : ''}
                  </Text>
                </XStack>
              </YStack>
            </YStack>
          )}

          <YStack gap={'$3'} mt={'auto'}>
            <Button
              fontWeight={'600'}
              backgroundColor={'$gray8'}
              borderColor={'$gray7'}
              borderWidth={1}
              onPress={handleDownloadCSVFileTemplate}
              disabled={importing || downloading}
            >
              <XStack alignItems={'center'} gap={'$2'}>
                {downloading ? (
                  <Spinner size="small" color={'white'} />
                ) : (
                  <Download size={18} color={'white'} />
                )}
                <Text color={'white'} fontWeight={'600'}>
                  {downloading ? 'Preparing...' : 'Download Template'}
                </Text>
              </XStack>
            </Button>

            <Button
              fontWeight={'600'}
              backgroundColor={'$green9'}
              onPress={handleImport}
              disabled={importing || downloading}
            >
              <XStack alignItems={'center'} gap={'$2'}>
                {importing ? (
                  <Spinner size="small" color={'white'} />
                ) : (
                  <FolderInput size={18} color={'white'} />
                )}
                <Text color={'white'} fontWeight={'600'}>
                  {importing ? 'Importing...' : 'Choose CSV File'}
                </Text>
              </XStack>
            </Button>
          </YStack>
        </View>
      </BottomSheetModal>

      <ErrorSheet
        key={
          errorInfo
            ? `${errorInfo.type}-${errorInfo.title}-${errorInfo.message}-${errorInfo.errors?.length ?? 0}`
            : 'error-sheet-empty'
        }
        sheetRef={errorSheetRef}
        errorInfo={errorInfo}
        onDownloadTemplate={handleDownloadCSVFileTemplate}
        onRetry={handleRetry}
        onDismiss={hideError}
      />
    </>
  );
};
