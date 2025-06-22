import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ArrowLeft, Calendar, FolderOutput } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Spinner, Text, View, XStack, YStack } from 'tamagui';
import useTransactionExport, {
  EXTENDED_EXPORT_COLUMNS,
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

export const TransactionPreviewSheet = forwardRef<
  TransactionPreviewSheetRef,
  TransactionPreviewSheetProps
>(({ onBack }, ref) => {
  const { bottom } = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<TransactionExportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<ExportDateRange | null>(null);
  const sheetRef = React.useRef<BottomSheetModal>(null);

  const { fetchTransactionsForExport, exportTransactions } = useTransactionExport();

  useImperativeHandle(ref, () => ({
    present: (dateRange: ExportDateRange) => {
      setDateRange(dateRange);
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
      const data = await fetchTransactionsForExport(dateRange);
      setTransactions(data);
    } catch (_error) {
    } finally {
      setIsLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
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
      });
    } catch (_error) {
    } finally {
      setIsExporting(false);
    }
  };

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
        setIsOpening(false);
      }}
    >
      <BottomSheetScrollView>
        <View padding="$4" gap="$4" pb={bottom + 16}>
          {/* Header */}
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
              disabled={isExporting || transactions.length === 0 || isOpening}
              backgroundColor="$green2"
              borderColor="$green8"
              opacity={isExporting || transactions.length === 0 || isOpening ? 0.5 : 1}
            >
              {isExporting ? (
                <Spinner size="small" color="$green10" />
              ) : (
                <FolderOutput size={16} color="$green10" />
              )}
            </Button>
          </XStack>

          {/* Summary */}
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
                  {transactions.length}
                </Text>
              )}
            </XStack>
          </View>

          {/* Transaction List */}
          {isLoading || isOpening ? (
            <View alignItems="center" padding="$6">
              <Spinner size="large" />
              <Text fontSize="$4" color="$gray11" mt="$2">
                Loading transactions...
              </Text>
            </View>
          ) : transactions.length === 0 ? (
            <View alignItems="center" padding="$6">
              <Calendar size={48} color="$gray9" />
              <Text fontSize="$5" fontWeight="600" color="$gray11" mt="$3">
                No transactions found
              </Text>
              <Text fontSize="$3" color="$gray10" textAlign="center" mt="$1">
                Try selecting a different date range
              </Text>
            </View>
          ) : (
            <YStack gap="$2">
              <Text fontSize="$4" fontWeight="600" mb="$2">
                Transactions ({transactions.length})
              </Text>

              <ScrollView>
                <YStack gap="$1">
                  {transactions.map((transaction) => (
                    <View
                      key={transaction.id}
                      backgroundColor="$gray1"
                      padding="$3"
                      borderRadius="$2"
                      borderWidth={1}
                      borderColor="$borderColor"
                    >
                      <XStack justifyContent="space-between" alignItems="flex-start">
                        <View flex={1}>
                          <Text fontSize="$4" fontWeight="600">
                            {transaction.merchant || 'Unknown Merchant'}
                          </Text>
                          <Text fontSize="$3" color="$gray11">
                            {transaction.category || 'Uncategorized'} •{' '}
                            {formatDate(transaction.date)}
                          </Text>
                          {transaction.note && (
                            <Text fontSize="$2" color="$gray10" mt="$1">
                              {transaction.note}
                            </Text>
                          )}
                        </View>

                        <View alignItems="flex-end">
                          <Text
                            fontSize="$4"
                            fontWeight="700"
                            color={
                              transaction.amountInBaseCurrency >= 0
                                ? '$green10'
                                : '$red10'
                            }
                          >
                            {formatAmount(transaction.amount, transaction.currencyCode)}
                          </Text>
                          {transaction.currencyCode !== 'USD' && (
                            <Text fontSize="$2" color="$gray10">
                              {transaction.currencyCode}
                            </Text>
                          )}
                        </View>
                      </XStack>
                    </View>
                  ))}
                </YStack>
              </ScrollView>
            </YStack>
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
