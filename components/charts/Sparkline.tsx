import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import * as React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';

type SparklineProps = {
  values: number[];
  /** Fixed width. Omit to stretch to the parent's width. */
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  /** Render a soft gradient fill under the line. */
  filled?: boolean;
};

/**
 * Minimal, axis-less trend line for inline use inside cards. Self-contained
 * Skia drawing (no CartesianChart overhead) so it stays cheap to render in lists.
 * When `width` is omitted it stretches to fill its parent.
 */
export const Sparkline = (props: SparklineProps) => {
  const [measuredWidth, setMeasuredWidth] = React.useState(0);

  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    setMeasuredWidth(event.nativeEvent.layout.width);
  }, []);

  if (props.width != null) {
    return <SparklineCanvas {...props} width={props.width} />;
  }

  return (
    <View style={{ width: '100%' }} onLayout={onLayout}>
      {measuredWidth > 0 && <SparklineCanvas {...props} width={measuredWidth} />}
    </View>
  );
};

const SparklineCanvas = ({
  values,
  width = 120,
  height = 36,
  color = '#6BCB77',
  strokeWidth = 2,
  filled = true,
}: SparklineProps & { width: number }) => {
  const { linePath, fillPath } = React.useMemo(() => {
    const line = Skia.Path.Make();
    const fill = Skia.Path.Make();
    if (values.length === 0) return { linePath: line, fillPath: fill };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const inset = strokeWidth; // keep the stroke from clipping at the edges
    const usableH = height - inset * 2;
    const stepX = width / Math.max(1, values.length - 1);

    const coords = values.map((value, index) => ({
      x: index * stepX,
      y: inset + usableH - ((value - min) / range) * usableH,
    }));

    coords.forEach(({ x, y }, index) => {
      if (index === 0) {
        line.moveTo(x, y);
        fill.moveTo(x, height);
        fill.lineTo(x, y);
      } else {
        line.lineTo(x, y);
        fill.lineTo(x, y);
      }
    });

    const last = coords[coords.length - 1];
    fill.lineTo(last.x, height);
    fill.close();

    return { linePath: line, fillPath: fill };
  }, [values, width, height, strokeWidth]);

  if (values.length < 2) return null;

  return (
    <Canvas style={{ width, height }}>
      {filled && (
        <Path path={fillPath} style="fill">
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={[`${color}59`, `${color}00`]}
          />
        </Path>
      )}
      <Path
        path={linePath}
        style="stroke"
        strokeWidth={strokeWidth}
        color={color}
        strokeJoin="round"
        strokeCap="round"
      />
    </Canvas>
  );
};
