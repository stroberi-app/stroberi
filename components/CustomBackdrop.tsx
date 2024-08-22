import React, { useMemo } from 'react';
import { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

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

  // styles
  const containerStyle = useMemo(() => [style, containerAnimatedStyle], [style]);

  const blurViewProps = useAnimatedProps(() => {
    return {
      intensity: interpolate(animatedIndex.value, [-1, 0], [0, 10], Extrapolation.CLAMP),
    };
  });

  return (
    <AnimatedBlurView animatedProps={blurViewProps} style={containerStyle} pointerEvents={'none'} />
  );
};
