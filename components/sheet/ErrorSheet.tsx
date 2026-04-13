import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { AlertCircle, Download, FileText, RefreshCw, X } from '@tamagui/lucide-icons';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator, Text, View, XStack, YStack } from 'tamagui';
import { summarizeImportIssues } from '../../features/import/errorSummary';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { backgroundStyle, handleIndicatorStyle } from './constants';

export interface ErrorInfo {
  title: string;
  message: string;
  errors?: string[];
  type: 'file' | 'format' | 'validation' | 'import' | 'parse';
  showTemplateButton?: boolean;
  showRetryButton?: boolean;
}

type ErrorSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  errorInfo: ErrorInfo | null;
  onDownloadTemplate: () => void;
  onRetry: () => void;
  onDismiss: () => void;
};

const errorSnapPoints = ['70%', '90%'];
const ROW_GROUPS_PAGE_SIZE = 20;

export const ErrorSheet = ({
  sheetRef,
  errorInfo,
  onDownloadTemplate,
  onRetry,
  onDismiss,
}: ErrorSheetProps) => {
  const { bottom } = useSafeAreaInsets();
  const [visibleRowGroups, setVisibleRowGroups] = useState(ROW_GROUPS_PAGE_SIZE);
  const issueSummary = useMemo(
    () => summarizeImportIssues(errorInfo?.errors ?? []),
    [errorInfo?.errors]
  );

  if (!errorInfo) return null;

  const visibleRows = issueSummary.rows.slice(0, visibleRowGroups);
  const remainingRows = issueSummary.rows.length - visibleRows.length;

  const getErrorIcon = () => {
    switch (errorInfo.type) {
      case 'file':
        return <FileText size={24} color="$red9" />;
      case 'format':
        return <AlertCircle size={24} color="$orange9" />;
      case 'validation':
        return <AlertCircle size={24} color="$yellow9" />;
      case 'parse':
        return <FileText size={24} color="$red9" />;
      default:
        return <AlertCircle size={24} color="$red9" />;
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={errorSnapPoints}
      enableDynamicSizing={false}
      backdropComponent={CustomBackdrop}
      handleIndicatorStyle={handleIndicatorStyle}
      backgroundStyle={backgroundStyle}
    >
      <BottomSheetScrollView style={{ paddingHorizontal: 16 }}>
        <View pb={bottom + 16}>
          <XStack justifyContent={'space-between'} alignItems={'center'} mb={'$4'}>
            <XStack alignItems={'center'} gap={'$3'}>
              {getErrorIcon()}
              <Text fontSize={'$6'} fontWeight={'bold'} color={'$red11'}>
                {errorInfo.title}
              </Text>
            </XStack>
            <Button
              size={'$3'}
              circular
              backgroundColor={'$gray4'}
              onPress={onDismiss}
              padding={'$2'}
            >
              <X size={16} color={'$gray11'} />
            </Button>
          </XStack>

          <Separator mb={'$4'} />

          <YStack gap={'$4'}>
            <Text fontSize={'$4'} color={'$gray12'} lineHeight={'$2'}>
              {errorInfo.message}
            </Text>

            {issueSummary.totalIssues > 0 && (
              <YStack gap={'$3'}>
                <Text fontSize={'$4'} fontWeight={'600'} color={'$gray12'}>
                  Issues found:
                </Text>

                <XStack gap={'$2'} flexWrap={'wrap'}>
                  <View
                    backgroundColor={'$gray3'}
                    borderRadius={'$10'}
                    paddingVertical={'$1'}
                    paddingHorizontal={'$3'}
                  >
                    <Text fontSize={'$2'} color={'$gray11'} fontWeight={'600'}>
                      Total issues: {issueSummary.totalIssues}
                    </Text>
                  </View>

                  {issueSummary.rows.length > 0 && (
                    <View
                      backgroundColor={'$gray3'}
                      borderRadius={'$10'}
                      paddingVertical={'$1'}
                      paddingHorizontal={'$3'}
                    >
                      <Text fontSize={'$2'} color={'$gray11'} fontWeight={'600'}>
                        Affected rows: {issueSummary.rows.length}
                      </Text>
                    </View>
                  )}

                  {issueSummary.rowIssueCount > 0 && (
                    <View
                      backgroundColor={'$gray3'}
                      borderRadius={'$10'}
                      paddingVertical={'$1'}
                      paddingHorizontal={'$3'}
                    >
                      <Text fontSize={'$2'} color={'$gray11'} fontWeight={'600'}>
                        Row-specific issues: {issueSummary.rowIssueCount}
                      </Text>
                    </View>
                  )}

                  {issueSummary.generalIssues.length > 0 && (
                    <View
                      backgroundColor={'$gray3'}
                      borderRadius={'$10'}
                      paddingVertical={'$1'}
                      paddingHorizontal={'$3'}
                    >
                      <Text fontSize={'$2'} color={'$gray11'} fontWeight={'600'}>
                        General issues: {issueSummary.generalIssues.length}
                      </Text>
                    </View>
                  )}
                </XStack>

                {issueSummary.rows.length > 0 && (
                  <YStack
                    gap={'$2'}
                    backgroundColor={'$yellow2'}
                    borderColor={'$yellow6'}
                    borderWidth={1}
                    borderRadius={'$4'}
                    padding={'$3'}
                  >
                    {visibleRows.map((rowIssue) => (
                      <View
                        key={rowIssue.rowNumber}
                        backgroundColor={'$background'}
                        borderRadius={'$3'}
                        borderColor={'$yellow5'}
                        borderWidth={1}
                        padding={'$2'}
                      >
                        <XStack justifyContent={'space-between'} alignItems={'center'}>
                          <Text fontSize={'$3'} color={'$yellow11'} fontWeight={'700'}>
                            Row {rowIssue.rowNumber}
                          </Text>
                          <Text fontSize={'$2'} color={'$yellow10'}>
                            {rowIssue.messages.length}{' '}
                            {rowIssue.messages.length === 1 ? 'issue' : 'issues'}
                          </Text>
                        </XStack>
                        <YStack mt={'$1'} gap={'$1'}>
                          {rowIssue.messages.map((message, index) => (
                            <XStack
                              key={`${rowIssue.rowNumber}-${message}`}
                              alignItems={'flex-start'}
                              gap={'$2'}
                            >
                              <Text fontSize={'$2'} color={'$yellow9'} mt={'$0.5'}>
                                {index + 1}.
                              </Text>
                              <Text
                                fontSize={'$3'}
                                color={'$yellow11'}
                                flex={1}
                                lineHeight={'$1'}
                              >
                                {message}
                              </Text>
                            </XStack>
                          ))}
                        </YStack>
                      </View>
                    ))}
                  </YStack>
                )}

                {remainingRows > 0 && (
                  <Button
                    size={'$3'}
                    fontWeight={'600'}
                    backgroundColor={'$gray8'}
                    onPress={() => {
                      setVisibleRowGroups((current) =>
                        Math.min(current + ROW_GROUPS_PAGE_SIZE, issueSummary.rows.length)
                      );
                    }}
                  >
                    <Text color={'white'} fontWeight={'600'}>
                      Show next {Math.min(ROW_GROUPS_PAGE_SIZE, remainingRows)} row
                      {remainingRows === 1 ? '' : 's'} ({remainingRows} remaining)
                    </Text>
                  </Button>
                )}

                {issueSummary.generalIssues.length > 0 && (
                  <YStack
                    gap={'$2'}
                    backgroundColor={'$red2'}
                    borderColor={'$red6'}
                    borderWidth={1}
                    borderRadius={'$4'}
                    padding={'$3'}
                  >
                    <Text fontSize={'$3'} color={'$red11'} fontWeight={'600'}>
                      General issues
                    </Text>
                    {issueSummary.generalIssues.map((issue, index) => (
                      <XStack key={`${index}-${issue}`} alignItems={'flex-start'} gap={'$2'}>
                        <Text fontSize={'$2'} color={'$red9'} mt={'$0.5'}>
                          •
                        </Text>
                        <Text fontSize={'$3'} color={'$red11'} flex={1} lineHeight={'$1'}>
                          {issue}
                        </Text>
                      </XStack>
                    ))}
                  </YStack>
                )}
              </YStack>
            )}

            <YStack gap={'$3'} mt={'$4'}>
              {errorInfo.showTemplateButton && (
                <Button
                  fontWeight={'600'}
                  backgroundColor={'$blue9'}
                  onPress={onDownloadTemplate}
                >
                  <XStack alignItems={'center'} gap={'$2'}>
                    <Download size={18} color={'white'} />
                    <Text color={'white'} fontWeight={'600'}>
                      Download Correct Template
                    </Text>
                  </XStack>
                </Button>
              )}

              {errorInfo.showRetryButton && (
                <Button fontWeight={'600'} backgroundColor={'$green9'} onPress={onRetry}>
                  <XStack alignItems={'center'} gap={'$2'}>
                    <RefreshCw size={18} color={'white'} />
                    <Text color={'white'} fontWeight={'600'}>
                      Try Again
                    </Text>
                  </XStack>
                </Button>
              )}

              <Button fontWeight={'600'} backgroundColor={'$gray8'} onPress={onDismiss}>
                <Text color={'white'} fontWeight={'600'}>
                  Dismiss
                </Text>
              </Button>
            </YStack>
          </YStack>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};
