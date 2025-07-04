import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { AlertCircle, Calendar, Eye, FolderOutput } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Text, View, XStack, YStack } from 'tamagui';
import useTransactionExport, {
  EXTENDED_EXPORT_COLUMNS,
  type ExportColumn,
  type ExportDateRange,
  type ExportDestination,
} from '../../hooks/useTransactionExport';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { DatePicker } from '../DatePicker';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './constants';

type ExportDataSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  onViewTransactions: (dateRange: ExportDateRange) => void;
};

type DateOption = 'last30' | 'all' | 'custom';

export const ExportDataSheet = ({
  sheetRef,
  onViewTransactions,
}: ExportDataSheetProps) => {
  const { bottom } = useSafeAreaInsets();

  const [fromDate, setFromDate] = useState(() => dayjs().subtract(30, 'days').toDate());
  const [toDate, setToDate] = useState(new Date());
  const [selectedDateOption, setSelectedDateOption] = useState<DateOption>('last30');

  // Smart defaults - comprehensive export columns and CSV format
  const [includedColumns] = useState<ExportColumn[]>(EXTENDED_EXPORT_COLUMNS);
  const selectedDestination: ExportDestination = 'csv';

  const { exportTransactions, isLoading } = useTransactionExport();

  const dateRange: ExportDateRange = { fromDate, toDate };

  // Update dates when date option changes
  useEffect(() => {
    if (selectedDateOption === 'last30') {
      setFromDate(dayjs().subtract(30, 'days').toDate());
      setToDate(new Date());
    } else if (selectedDateOption === 'all') {
      setFromDate(dayjs().subtract(10, 'years').toDate());
      setToDate(new Date());
    }
    // For 'custom', dates remain as user set them
  }, [selectedDateOption]);

  const isDateRangeValid = !dayjs(fromDate).isAfter(dayjs(toDate));

  const handleDateOptionChange = (option: DateOption) => {
    setSelectedDateOption(option);
  };

  const handleViewTransactions = () => {
    onViewTransactions(dateRange);
  };

  const handleExport = async () => {
    await exportTransactions({
      dateRange,
      columns: includedColumns,
      destination: selectedDestination,
    });

    sheetRef.current?.dismiss();
  };

  const getExportButtonText = () => {
    return 'Export CSV';
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
    >
      <View flex={1} pb={bottom}>
        <BottomSheetScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View padding="$4" gap="$4" flex={1}>
            <Text fontSize="$7" fontWeight="bold" textAlign="center">
              Export CSV
            </Text>

            {/* Date Range Selection */}
            <View>
              <Text fontSize="$5" fontWeight="600" mb="$3">
                Time Period
              </Text>

              {/* Date Option Buttons */}
              <YStack gap="$2" mb="$3">
                <Button
                  size="$4"
                  variant="outlined"
                  onPress={() => handleDateOptionChange('last30')}
                  backgroundColor={
                    selectedDateOption === 'last30' ? '$blue5' : 'transparent'
                  }
                  borderColor={
                    selectedDateOption === 'last30' ? '$blue8' : '$borderColor'
                  }
                >
                  <Calendar size={16} />
                  <Text fontSize="$4">Last 30 days</Text>
                </Button>

                <Button
                  size="$4"
                  variant="outlined"
                  onPress={() => handleDateOptionChange('all')}
                  backgroundColor={
                    selectedDateOption === 'all' ? '$blue5' : 'transparent'
                  }
                  borderColor={selectedDateOption === 'all' ? '$blue8' : '$borderColor'}
                >
                  <Calendar size={16} />
                  <Text fontSize="$4">All time</Text>
                </Button>

                <Button
                  size="$4"
                  variant="outlined"
                  onPress={() => handleDateOptionChange('custom')}
                  backgroundColor={
                    selectedDateOption === 'custom' ? '$blue5' : 'transparent'
                  }
                  borderColor={
                    selectedDateOption === 'custom' ? '$blue8' : '$borderColor'
                  }
                >
                  <Calendar size={16} />
                  <Text fontSize="$4">Custom range</Text>
                </Button>
              </YStack>

              {/* Custom Date Inputs - Only show when custom is selected */}
              {selectedDateOption === 'custom' && (
                <View>
                  <XStack gap="$3" alignItems="center">
                    <View flex={1} alignItems="center" gap="$2">
                      <Text fontSize="$3" color="$gray11" mb="$1">
                        From
                      </Text>
                      <DatePicker date={fromDate} setDate={setFromDate} />
                    </View>
                    <View flex={1} alignItems="center" gap="$2">
                      <Text fontSize="$3" color="$gray11" mb="$1">
                        To
                      </Text>
                      <DatePicker date={toDate} setDate={setToDate} />
                    </View>
                  </XStack>

                  {!isDateRangeValid && (
                    <XStack
                      alignItems="center"
                      gap="$2"
                      backgroundColor="$red2"
                      padding="$3"
                      borderRadius="$3"
                      mt="$2"
                    >
                      <AlertCircle size={16} color="$red10" />
                      <Text fontSize="$3" color="$red10">
                        Please select a valid date range
                      </Text>
                    </XStack>
                  )}
                </View>
              )}
            </View>

            {/* Spacer to push buttons to bottom */}
            <View flex={1} />
          </View>
        </BottomSheetScrollView>

        {/* Bottom Buttons - Fixed at bottom */}
        <View padding="$4" gap="$3">
          {/* View Transactions Button */}
          <Button
            size="$4"
            variant="outlined"
            onPress={handleViewTransactions}
            disabled={!isDateRangeValid}
            borderColor="$borderColor"
            backgroundColor="$gray2"
          >
            <Eye size={18} />
            <Text fontSize="$4">View Transactions</Text>
          </Button>

          {/* Export Button */}
          <Button
            size="$5"
            gap="$2"
            fontWeight="bold"
            backgroundColor="$green10"
            onPress={handleExport}
            disabled={isLoading || !isDateRangeValid}
            opacity={isLoading || !isDateRangeValid ? 0.5 : 1}
          >
            {isLoading ? (
              <>
                <Text color="white" fontSize="$4">
                  Exporting...
                </Text>
                <Spinner color="white" />
              </>
            ) : (
              <>
                <FolderOutput size={20} color="white" />
                <Text color="white" fontSize="$4">
                  {getExportButtonText()}
                </Text>
              </>
            )}
          </Button>
        </View>
      </View>
    </BottomSheetModal>
  );
};
