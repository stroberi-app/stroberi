import { type BottomSheetBackdropProps, useBottomSheetModal } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { useCallback, useMemo } from 'react';
import { Keyboard } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const CustomBackdrop = ({ animatedIndex, style }: BottomSheetBackdropProps) => {
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,0,0,${interpolate(
      animatedIndex.value,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    )})`,
  }));

  const { dismiss } = useBottomSheetModal();
  const containerStyle = useMemo(
    () => [style, containerAnimatedStyle],
    [style, containerAnimatedStyle]
  );

  const blurViewProps = useAnimatedProps(() => {
    return {
      intensity: interpolate(animatedIndex.value, [-1, 0], [0, 10], Extrapolation.CLAMP),
    };
  });

  const onTouchEnd = useCallback(() => {
    Keyboard.dismiss();
    dismiss();
  }, [dismiss]);

  return (
    <AnimatedBlurView
      animatedProps={blurViewProps}
      style={containerStyle}
      onTouchEnd={onTouchEnd}
    />
  );
};
