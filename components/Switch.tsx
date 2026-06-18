import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from 'tamagui';

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 24;
const PADDING = 2;
const TRAVEL = TRACK_WIDTH - THUMB_SIZE - PADDING * 2;

// Matches the `quick` spring preset we previously tried to use via tamagui.
const SPRING_CONFIG = { damping: 25, mass: 1, stiffness: 550 } as const;

type SwitchProps = {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  // Accepted for API compatibility with the previous compound `<Switch.Thumb />`
  // usage. The thumb is rendered internally, so children are ignored.
  children?: ReactNode;
};

function SwitchComponent({ checked, onCheckedChange, disabled }: SwitchProps) {
  const theme = useTheme();
  const offColor = theme.gray4?.val ?? '#3a3a3a';
  const onColor = theme.green?.val ?? 'hsl(151, 50.0%, 53.2%)';

  const progress = useDerivedValue(
    () => withSpring(checked ? 1 : 0, SPRING_CONFIG),
    [checked]
  );

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [offColor, onColor]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onCheckedChange?.(!checked)}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      hitSlop={8}
    >
      <Animated.View style={[styles.track, disabled && styles.disabled, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: 999,
    padding: PADDING,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 999,
    backgroundColor: 'white',
  },
  disabled: {
    opacity: 0.5,
  },
});

// No-op kept so existing `<Switch.Thumb />` children remain valid.
const Thumb = () => null;

export const Switch = Object.assign(SwitchComponent, { Thumb });
