import {
  Circle,
  type SkFont,
  Line as SkiaLine,
  RoundedRect,
  Text as SkiaText,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { ChartBounds } from 'victory-native';

const BUBBLE_HEIGHT = 22;
const BUBBLE_PADDING_X = 8;
const BUBBLE_GAP = 12;
const APPROX_CHAR_WIDTH = 6.4; // Inter @ ~12px, good enough for bubble sizing.

type ChartTooltipProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** Formatted value string shown in the bubble (e.g. "Mar: $1.2K"). */
  label: SharedValue<string>;
  font: SkFont | null;
  chartBounds: ChartBounds;
  color?: string;
};

/**
 * Crosshair guide line + highlighted point + floating value bubble.
 * Replaces the old single-dot tooltip and the title-hijack value readout.
 */
export function ChartTooltip({
  x,
  y,
  label,
  font,
  chartBounds,
  color = 'rgba(255, 255, 255, 0.95)',
}: ChartTooltipProps) {
  const lineTop = useDerivedValue(() => vec(x.value, chartBounds.top));
  const lineBottom = useDerivedValue(() => vec(x.value, chartBounds.bottom));

  const bubbleWidth = useDerivedValue(() =>
    Math.max(40, label.value.length * APPROX_CHAR_WIDTH + BUBBLE_PADDING_X * 2)
  );

  const bubbleX = useDerivedValue(() => {
    const half = bubbleWidth.value / 2;
    const min = chartBounds.left;
    const max = chartBounds.right - bubbleWidth.value;
    return Math.min(Math.max(x.value - half, min), Math.max(min, max));
  });

  const bubbleY = useDerivedValue(() =>
    Math.max(chartBounds.top, y.value - BUBBLE_HEIGHT - BUBBLE_GAP)
  );

  const textX = useDerivedValue(() => bubbleX.value + BUBBLE_PADDING_X);
  const textY = useDerivedValue(() => bubbleY.value + BUBBLE_HEIGHT - 7);

  return (
    <>
      <SkiaLine
        p1={lineTop}
        p2={lineBottom}
        color="rgba(255, 255, 255, 0.18)"
        strokeWidth={1}
      />
      <Circle cx={x} cy={y} r={5} color={color} />
      <RoundedRect
        x={bubbleX}
        y={bubbleY}
        width={bubbleWidth}
        height={BUBBLE_HEIGHT}
        r={6}
        color="rgba(18, 18, 18, 0.92)"
      />
      {font && <SkiaText x={textX} y={textY} text={label} font={font} color="white" />}
    </>
  );
}
