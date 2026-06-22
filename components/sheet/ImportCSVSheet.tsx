import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Download, FileText, FolderInput } from '@tamagui/lucide-icons';
import type React from 'react';
import { useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator, Spinner, Text, View, XStack, YStack } from 'tamagui';
import { useCsvImport } from '../../features/import/useCsvImport';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { backgroundStyle, handleIndicatorStyle } from './constants';
import { ErrorSheet } from './ErrorSheet';
import { ImportIntro } from './import/ImportIntro';
import { ImportProgressCard } from './import/ImportProgressCard';

type ImportCSVSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
};

const snapPoints = ['65%'];

export const ImportCSVSheet = ({ sheetRef }: ImportCSVSheetProps) => {
  const { bottom } = useSafeAreaInsets();
  const errorSheetRef = useRef<BottomSheetModal>(null);

  const {
    importing,
    downloading,
    progress,
    errorInfo,
    resetAllStates,
    hideError,
    handleImport,
    handleRetry,
    handleDownloadCSVFileTemplate,
  } = useCsvImport({ sheetRef, errorSheetRef });

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

          {!importing && !progress && <ImportIntro />}

          {progress && <ImportProgressCard progress={progress} />}

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
