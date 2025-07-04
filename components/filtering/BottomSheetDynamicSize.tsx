import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type React from 'react';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomBackdrop } from '../CustomBackdrop';
import { backgroundStyle, handleIndicatorStyle } from '../sheet/constants';

type BottomSheetWrapperProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  children: React.ReactNode;
} & React.ComponentProps<typeof BottomSheetModal>;

const BottomSheetDynamicSize = ({
  sheetRef,
  children,
  ...rest
}: BottomSheetWrapperProps) => {
  const { bottom } = useSafeAreaInsets();
  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing={true}
      backdropComponent={CustomBackdrop}
      stackBehavior="push"
      handleIndicatorStyle={handleIndicatorStyle}
      backgroundStyle={backgroundStyle}
      {...rest}
    >
      <BottomSheetView style={{ paddingBottom: bottom + 16 }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
};

export default BottomSheetDynamicSize;
