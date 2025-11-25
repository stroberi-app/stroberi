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
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import type React from 'react';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Progress, Separator, Spinner, Text, View, XStack, YStack } from 'tamagui';
import { currencies } from '../../data/currencies';
import type { CategoryModel } from '../../database/category-model';
import {
  type CreateTransactionPayload,
  createCategory,
  createTransaction,
} from '../../database/helpers';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import useToast from '../../hooks/useToast';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { backgroundStyle, handleIndicatorStyle } from './constants';
import { type ErrorInfo, ErrorSheet } from './ErrorSheet';

interface CSVRow {
  merchant: string;
  amount: string;
  date: string;
  note?: string;
  currencyCode: string;
  category?: string;
  categoryIcon?: string;
}

type ImportCSVSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
};

interface ImportProgress {
  phase: 'parsing' | 'validating' | 'importing' | 'complete';
  current: number;
  total: number;
  message: string;
}

const snapPoints = ['65%'];
const BATCH_SIZE = 10;

export const ImportCSVSheet = ({ sheetRef }: ImportCSVSheetProps) => {
  const toast = useToast();
  const { bottom } = useSafeAreaInsets();
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  const errorSheetRef = useRef<BottomSheetModal>(null);

  const { defaultCurrency } = useDefaultCurrency();
  const database = useDatabase();

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  };

  const handleRetry = () => {
    // First dismiss the error sheet and reset error state
    hideError();
    // Small delay to ensure sheet is dismissed before starting new import
    setTimeout(() => {
      handleImport();
    }, 300);
  };

  const validateCSVRow = (row: CSVRow, index: number): string[] => {
    const errors: string[] = [];
    const { amount, date, currencyCode } = row;

    if (!amount || !date || !currencyCode) {
      errors.push(
        `Row ${index + 1}: Missing required fields (merchant, amount, date, or currency)`
      );
    }

    if (amount && Number.isNaN(Number(amount))) {
      errors.push(`Row ${index + 1}: Amount must be a valid number`);
    }

    if (date) {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.push(`Row ${index + 1}: Date format is invalid (use YYYY-MM-DD)`);
      }
    }

    if (currencyCode && !currencies.some((currency) => currency.code === currencyCode)) {
      errors.push(`Row ${index + 1}: Currency code '${currencyCode}' is not supported`);
    }

    return errors;
  };

  const processTransactionsInBatches = async (
    transactions: CreateTransactionPayload[],
    updateProgress: (current: number) => void
  ) => {
    const totalBatches = Math.ceil(transactions.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, transactions.length);
      const batch = transactions.slice(start, end);

      await Promise.all(batch.map((transaction) => createTransaction(transaction)));

      updateProgress(end);

      await sleep(50);
    }
  };

  const handleImport = async () => {
    // Prevent multiple simultaneous imports
    if (importing) return;

    // Reset all states at the beginning
    setImporting(true);
    setProgress(null);
    setErrorInfo(null);

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
        return;
      }

      setProgress((prev) => (prev ? { ...prev, message: 'Reading your file...' } : null));
      await sleep(100);

      const content = await FileSystem.readAsStringAsync(res.assets[0].uri);

      setProgress((prev) =>
        prev ? { ...prev, message: 'Processing CSV data...' } : null
      );
      await sleep(100);

      Papa.parse<CSVRow>(content, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
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

            const requiredColumns = ['merchant', 'amount', 'date', 'currencyCode'];
            const missingColumns = requiredColumns.filter(
              (col) => !results.meta.fields?.includes(col)
            );

            if (missingColumns.length > 0) {
              setImporting(false);
              setProgress(null);
              showError({
                title: 'Wrong Format',
                message: `Your CSV file is missing required columns. Please make sure your file includes all the necessary columns and matches our template format.`,
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
              message: 'Checking for new categories...',
            });
            await sleep(100);

            const existingCategories = await database
              .get<CategoryModel>('categories')
              .query()
              .fetch();
            const existingCategoryMap = new Map(
              existingCategories.map((c) => [c.name, c])
            );

            const newCategoriesToCreate = new Map<
              string,
              { name: string; icon: string }
            >();
            for (const row of results.data) {
              const { category, categoryIcon } = row;
              if (
                category &&
                categoryIcon &&
                !existingCategoryMap.has(category) &&
                !newCategoriesToCreate.has(category)
              ) {
                newCategoriesToCreate.set(category, {
                  name: category,
                  icon: categoryIcon,
                });
              }
            }

            if (newCategoriesToCreate.size > 0) {
              setProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      message: `Creating ${newCategoriesToCreate.size} new categor${newCategoriesToCreate.size > 1 ? 'ies' : 'y'}...`,
                    }
                  : null
              );
              await sleep(100);

              const newCategoryPromises = Array.from(newCategoriesToCreate.values()).map(
                (cat) => createCategory({ name: cat.name, icon: cat.icon })
              );

              try {
                await Promise.all(newCategoryPromises);
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

            setProgress((prev) =>
              prev
                ? {
                    ...prev,
                    message: 'Checking your transactions...',
                  }
                : null
            );
            await sleep(100);

            const allCategories = await database
              .get<CategoryModel>('categories')
              .query()
              .fetch();
            const categoryMap = new Map(allCategories.map((c) => [c.name, c.id]));
            const validTransactions: CreateTransactionPayload[] = [];
            const allErrors: string[] = [];

            for (let i = 0; i < results.data.length; i += BATCH_SIZE) {
              const chunk = results.data.slice(
                i,
                Math.min(i + BATCH_SIZE, results.data.length)
              );

              for (let j = 0; j < chunk.length; j++) {
                const rowIndex = i + j;
                const row = chunk[j];

                if (!row || typeof row !== 'object') {
                  allErrors.push(`Row ${rowIndex + 1}: Invalid data format`);
                  continue;
                }

                const validationErrors = validateCSVRow(row, rowIndex);
                if (validationErrors.length > 0) {
                  allErrors.push(...validationErrors);
                  continue;
                }

                const { merchant, amount, date, note, currencyCode, category } = row;

                const categoryId = category ? (categoryMap.get(category) ?? null) : null;

                validTransactions.push({
                  merchant,
                  amount: Number(amount),
                  date: new Date(date),
                  note: note || '',
                  currencyCode,
                  categoryId,
                  baseCurrency: defaultCurrency as string,
                });
              }

              setProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      current: Math.min(i + BATCH_SIZE, results.data.length),
                      message: `Validated ${Math.min(i + BATCH_SIZE, results.data.length)} out of ${results.data.length} transactions`,
                    }
                  : null
              );

              await sleep(50);
            }

            if (allErrors.length > 0) {
              setImporting(false);
              setProgress(null);
              showError({
                title: 'Data Validation Issues',
                message: `We found ${allErrors.length} issue${allErrors.length > 1 ? 's' : ''} in your CSV file. Please fix these issues and try importing again.`,
                errors: allErrors.slice(0, 10), // Show first 10 errors
                type: 'validation',
                showTemplateButton: true,
                showRetryButton: true,
              });
              return;
            }

            if (validTransactions.length === 0) {
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

            setProgress({
              phase: 'importing',
              current: 0,
              total: validTransactions.length,
              message: 'Adding transactions to your account...',
            });

            await processTransactionsInBatches(validTransactions, (current) => {
              setProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      current,
                      message: `Added ${current} out of ${validTransactions.length} transactions`,
                    }
                  : null
              );
            });

            setProgress({
              phase: 'complete',
              current: validTransactions.length,
              total: validTransactions.length,
              message: 'All done! Your transactions are ready.',
            });

            toast.show({
              title: '🎉 Import successful!',
              message: `Successfully imported ${validTransactions.length} ${
                validTransactions.length === 1 ? 'transaction' : 'transactions'
              } to your account.`,
              preset: 'custom',
              duration: 4,
            });

            await sleep(1500);
            sheetRef.current?.dismiss();

            // Reset states after dismissing the sheet
            setTimeout(() => {
              setImporting(false);
              setProgress(null);
            }, 500);
          } catch (_error) {
            setImporting(false);
            setProgress(null);
            showError({
              title: 'Import Failed',
              message:
                "We couldn't complete the import. Please try again or contact support if the issue persists.",
              type: 'import',
              showRetryButton: true,
            });
          }
        },
        error: (_error: unknown) => {
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
        },
      });
    } catch (_error) {
      setImporting(false);
      setProgress(null);
      showError({
        title: 'File Error',
        message:
          "We couldn't read the selected file. Please try selecting a different file.",
        type: 'file',
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
      const uri = `${FileSystem.cacheDirectory}stroberi_csv_template.csv`;
      await FileSystem.writeAsStringAsync(uri, template);
      await Sharing.shareAsync(uri);
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
                    columns for merchant, amount, date, and currency code.
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
        sheetRef={errorSheetRef}
        errorInfo={errorInfo}
        onDownloadTemplate={handleDownloadCSVFileTemplate}
        onRetry={handleRetry}
        onDismiss={hideError}
      />
    </>
  );
};
