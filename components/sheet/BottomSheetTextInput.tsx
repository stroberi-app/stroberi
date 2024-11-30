import React, { memo, useCallback, forwardRef, useEffect } from 'react';
import type { NativeSyntheticEvent, TextInputFocusEventData } from 'react-native';
import { Input as TextInput } from 'tamagui';
import { useBottomSheetInternal } from '@gorhom/bottom-sheet';

const BottomSheetTextInputComponent = forwardRef<TextInput, React.ComponentProps<typeof TextInput>>(
  ({ onFocus, onBlur, ...rest }, ref) => {
    //#region hooks
    const { shouldHandleKeyboardEvents } = useBottomSheetInternal();
    //#endregion

    //#region callbacks
    const handleOnFocus = useCallback(
      (args: NativeSyntheticEvent<TextInputFocusEventData>) => {
        shouldHandleKeyboardEvents.value = true;
        if (onFocus) {
          onFocus(args);
        }
      },
      [onFocus, shouldHandleKeyboardEvents]
    );
    const handleOnBlur = useCallback(
      (args: NativeSyntheticEvent<TextInputFocusEventData>) => {
        shouldHandleKeyboardEvents.value = false;
        if (onBlur) {
          onBlur(args);
        }
      },
      [onBlur, shouldHandleKeyboardEvents]
    );
    //#endregion

    //#region effects
    useEffect(() => {
      return () => {
        // Reset the flag on unmount
        shouldHandleKeyboardEvents.value = false;
      };
    }, [shouldHandleKeyboardEvents]);
    //#endregion
    return <TextInput ref={ref} onFocus={handleOnFocus} onBlur={handleOnBlur} {...rest} />;
  }
);

export const BottomSheetTextInput = memo(BottomSheetTextInputComponent);
BottomSheetTextInput.displayName = 'BottomSheetTextInput';
