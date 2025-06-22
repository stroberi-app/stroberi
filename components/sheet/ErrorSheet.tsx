import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { AlertCircle, Download, FileText, RefreshCw, X } from '@tamagui/lucide-icons';
import type React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator, Text, View, XStack, YStack } from 'tamagui';
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

export const ErrorSheet = ({
  sheetRef,
  errorInfo,
  onDownloadTemplate,
  onRetry,
  onDismiss,
}: ErrorSheetProps) => {
  const { bottom } = useSafeAreaInsets();

  if (!errorInfo) return null;

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

            {errorInfo.errors && errorInfo.errors.length > 0 && (
              <YStack gap={'$3'}>
                <Text fontSize={'$4'} fontWeight={'600'} color={'$gray12'}>
                  Issues found:
                </Text>
                <View
                  backgroundColor={'$red2'}
                  borderColor={'$red6'}
                  borderWidth={1}
                  borderRadius={'$4'}
                  padding={'$3'}
                  maxHeight={200}
                >
                  <YStack gap={'$2'}>
                    {errorInfo.errors.map((error, index) => (
                      <XStack key={index} alignItems={'flex-start'} gap={'$2'}>
                        <Text fontSize={'$2'} color={'$red9'} mt={'$0.5'}>
                          •
                        </Text>
                        <Text fontSize={'$3'} color={'$red11'} flex={1} lineHeight={'$1'}>
                          {error}
                        </Text>
                      </XStack>
                    ))}
                  </YStack>
                </View>
                {errorInfo.errors.length > 5 && (
                  <Text fontSize={'$2'} color={'$gray10'} fontStyle={'italic'}>
                    {errorInfo.errors.length > 10
                      ? `Showing first 10 of ${errorInfo.errors.length} errors`
                      : `${errorInfo.errors.length} errors found`}
                  </Text>
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
