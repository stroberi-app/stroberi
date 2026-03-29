import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, Calendar, FolderOutput, Info } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Text, View, XStack } from 'tamagui';
import useTransactionExport, {
  EXPORT_PREVIEW_SAMPLE_SIZE,
  EXTENDED_EXPORT_COLUMNS,
  isPartialPreviewCount,
  type ExportDateRange,
  type TransactionExportData,
} from '../../hooks/useTransactionExport';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './constants';

type TransactionPreviewSheetProps = {
  onBack: () => void;
};

export interface TransactionPreviewSheetRef {
  present: (dateRange: ExportDateRange) => void;
  dismiss: () => void;
}

const TRANSACTION_PREVIEW_ROW_ESTIMATED_SIZE = 76;

export const TransactionPreviewSheet = forwardRef<
  TransactionPreviewSheetRef,
  TransactionPreviewSheetProps
>(({ onBack }, ref) => {
  const { bottom } = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<TransactionExportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPartialPreview, setIsPartialPreview] = useState(false);
  const [dateRange, setDateRange] = useState<ExportDateRange | null>(null);
  const sheetRef = React.useRef<BottomSheetModal>(null);

  const {
    exportTransactions,
    fetchTransactionsCount,
    fetchTransactionsForExport,
    fetchTransactionsSample,
  } = useTransactionExport();

  useImperativeHandle(ref, () => ({
    present: (nextDateRange: ExportDateRange) => {
      setDateRange(nextDateRange);
      setIsOpening(true);
      sheetRef.current?.present();
    },
    dismiss: () => {
      sheetRef.current?.dismiss();
    },
  }));

  const loadTransactions = async () => {
    if (!dateRange) return;

    setIsLoading(true);
    try {
      const count = await fetchTransactionsCount(dateRange);
      setTotalCount(count);

      if (count === 0) {
        setTransactions([]);
        setIsPartialPreview(false);
        return;
      }

      if (isPartialPreviewCount(count)) {
        const data = await fetchTransactionsSample(dateRange);
        setTransactions(data);
        setIsPartialPreview(true);
        return;
      }

      const data = await fetchTransactionsForExport(dateRange);
      setTransactions(data);
      setIsPartialPreview(false);
    } catch (_error) {
      setTransactions([]);
      setTotalCount(0);
      setIsPartialPreview(false);
    } finally {
      setIsLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: preview should load once per date range/open transition
  useEffect(() => {
    if (dateRange && !isOpening) {
      loadTransactions();
    }
  }, [dateRange, isOpening]);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MMM DD, YYYY');
  };

  const handleExport = async () => {
    if (!dateRange) return;

    setIsExporting(true);
    try {
      await exportTransactions({
        dateRange,
        columns: EXTENDED_EXPORT_COLUMNS,
        destination: 'csv',
        preloadedTransactions: isPartialPreview ? undefined : transactions,
      });
    } catch (_error) {
    } finally {
      setIsExporting(false);
    }
  };

  const renderItem = ({ item }: { item: TransactionExportData }) => {
    return (
      <View
        backgroundColor="$gray1"
        padding="$3"
        borderRadius="$2"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <XStack justifyContent="space-between" alignItems="flex-start">
          <View flex={1}>
            <Text fontSize="$4" fontWeight="600">
              {item.merchant || 'Unknown Merchant'}
            </Text>
            <Text fontSize="$3" color="$gray11">
              {item.category || 'Uncategorized'} • {formatDate(item.date)}
            </Text>
            {item.note && (
              <Text fontSize="$2" color="$gray10" mt="$1">
                {item.note}
              </Text>
            )}
          </View>

          <View alignItems="flex-end">
            <Text
              fontSize="$4"
              fontWeight="700"
              color={item.amountInBaseCurrency >= 0 ? '$green10' : '$red10'}
            >
              {formatAmount(item.amount, item.currencyCode)}
            </Text>
            {item.currencyCode !== item.baseCurrencyCode && (
              <Text fontSize="$2" color="$gray10">
                {item.currencyCode}
              </Text>
            )}
          </View>
        </XStack>
      </View>
    );
  };

  const showEmptyState = !isLoading && !isOpening && totalCount === 0;

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableContentPanningGesture={false}
      snapPoints={snapPoints}
      stackBehavior="push"
      enableDynamicSizing={false}
      enablePanDownToClose={true}
      animateOnMount={true}
      backdropComponent={CustomBackdrop}
      handleIndicatorStyle={handleIndicatorStyle}
      backgroundStyle={backgroundStyle}
      onChange={(index) => {
        if (index === 0 && isOpening) {
          setTimeout(() => {
            setIsOpening(false);
          }, 300);
        }
      }}
      onDismiss={() => {
        setDateRange(null);
        setTransactions([]);
        setTotalCount(0);
        setIsOpening(false);
        setIsPartialPreview(false);
      }}
    >
      <View flex={1} padding="$4" gap="$4" pb={bottom + 16}>
        <XStack alignItems="center" gap="$3">
          <Button
            size="$3"
            variant="outlined"
            onPress={onBack}
            backgroundColor="$gray2"
            borderColor="$borderColor"
          >
            <ArrowLeft size={16} />
          </Button>
          <View flex={1}>
            <Text fontSize="$6" fontWeight="bold">
              Transaction Preview
            </Text>
            {dateRange && (
              <Text fontSize="$3" color="$gray11">
                {formatDate(dateRange.fromDate.toISOString())} -{' '}
                {formatDate(dateRange.toDate.toISOString())}
              </Text>
            )}
          </View>
          <Button
            size="$3"
            variant="outlined"
            onPress={handleExport}
            disabled={isExporting || totalCount === 0 || isOpening}
            backgroundColor="$green2"
            borderColor="$green8"
            opacity={isExporting || totalCount === 0 || isOpening ? 0.5 : 1}
          >
            {isExporting ? (
              <Spinner size="small" color="$green10" />
            ) : (
              <FolderOutput size={16} color="$green10" />
            )}
          </Button>
        </XStack>

        <View
          backgroundColor="$blue2"
          padding="$3"
          borderRadius="$3"
          borderWidth={1}
          borderColor="$blue8"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$4" fontWeight="600" color="$blue11">
              Total Transactions:
            </Text>
            {isOpening ? (
              <View backgroundColor="$blue4" height={20} width={40} borderRadius="$1" />
            ) : (
              <Text fontSize="$5" fontWeight="700" color="$blue11">
                {totalCount}
              </Text>
            )}
          </XStack>
        </View>

        {isPartialPreview && totalCount > 0 && (
          <XStack
            alignItems="center"
            gap="$2"
            backgroundColor="$orange2"
            padding="$3"
            borderRadius="$3"
            borderWidth={1}
            borderColor="$orange8"
          >
            <Info size={16} color="$orange10" />
            <Text fontSize="$3" color="$orange10" flex={1}>
              Showing the first {EXPORT_PREVIEW_SAMPLE_SIZE} transactions out of{' '}
              {totalCount}. Export will still include the full dataset.
            </Text>
          </XStack>
        )}

        {isLoading || isOpening ? (
          <View flex={1} alignItems="center" justifyContent="center" padding="$6">
            <Spinner size="large" />
            <Text fontSize="$4" color="$gray11" mt="$2">
              Loading transactions...
            </Text>
          </View>
        ) : showEmptyState ? (
          <View flex={1} alignItems="center" justifyContent="center" padding="$6">
            <Calendar size={48} color="$gray9" />
            <Text fontSize="$5" fontWeight="600" color="$gray11" mt="$3">
              No transactions found
            </Text>
            <Text fontSize="$3" color="$gray10" textAlign="center" mt="$1">
              Try selecting a different date range
            </Text>
          </View>
        ) : (
          <View flex={1}>
            <Text fontSize="$4" fontWeight="600" mb="$2">
              Transactions ({transactions.length}
              {isPartialPreview ? ` shown of ${totalCount}` : ''})
            </Text>

            <FlashList
              data={transactions}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              estimatedItemSize={TRANSACTION_PREVIEW_ROW_ESTIMATED_SIZE}
              contentContainerStyle={{ paddingBottom: bottom + 16 }}
            />
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
});
