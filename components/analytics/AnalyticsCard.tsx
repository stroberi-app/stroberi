import type * as React from 'react';
import { Text, View } from 'tamagui';

export const ANALYTICS_CARD_HEIGHT = 200;

type AnalyticsCardProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  accentColor?: string;
};

export const AnalyticsCard = ({
  title,
  icon,
  children,
  accentColor = '$stroberi',
}: AnalyticsCardProps) => {
  return (
    <View
      backgroundColor="$gray3"
      borderRadius="$4"
      padding="$4"
      marginBottom="$3"
      borderLeftWidth={4}
      borderLeftColor={accentColor}
    >
      <View flexDirection="row" alignItems="center" gap="$2" marginBottom="$3">
        {icon}
        <Text fontSize="$5" fontWeight="bold" color="white">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
};

type MetricRowProps = {
  label: string;
  value: string;
  subValue?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
};

export const MetricRow = ({
  label,
  value,
  subValue,
  color = 'white',
  size = 'medium',
}: MetricRowProps) => {
  const fontSize = size === 'large' ? '$7' : size === 'medium' ? '$5' : '$4';

  return (
    <View
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      paddingVertical="$1.5"
    >
      <Text fontSize="$3" color="$gray11">
        {label}
      </Text>
      <View alignItems="flex-end">
        <Text fontSize={fontSize} fontWeight="bold" color={color}>
          {value}
        </Text>
        {subValue && (
          <Text fontSize="$2" color="$gray10">
            {subValue}
          </Text>
        )}
      </View>
    </View>
  );
};

type TrendBadgeProps = {
  trend:
    | 'up'
    | 'down'
    | 'stable'
    | 'growing'
    | 'shrinking'
    | 'accelerating'
    | 'decelerating';
  label?: string;
};

export const TrendBadge = ({ trend, label }: TrendBadgeProps) => {
  const getConfig = () => {
    switch (trend) {
      case 'up':
      case 'growing':
        return { icon: '↑', color: '$green', bg: 'rgba(34, 197, 94, 0.15)' };
      case 'down':
      case 'shrinking':
      case 'decelerating':
        return { icon: '↓', color: '$stroberi', bg: 'rgba(229, 75, 75, 0.15)' };
      case 'accelerating':
        return { icon: '⚡', color: '$yellow', bg: 'rgba(234, 179, 8, 0.15)' };
      default:
        return { icon: '→', color: '$gray11', bg: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  const config = getConfig();
  const displayLabel = label || trend.charAt(0).toUpperCase() + trend.slice(1);

  return (
    <View
      flexDirection="row"
      alignItems="center"
      gap="$1"
      backgroundColor={config.bg}
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$2"
    >
      <Text fontSize="$2" color={config.color}>
        {config.icon}
      </Text>
      <Text fontSize="$2" color={config.color} fontWeight="600">
        {displayLabel}
      </Text>
    </View>
  );
};

type ProgressBarProps = {
  value: number; // 0-100
  color?: string;
  backgroundColor?: string;
  height?: number;
};

export const ProgressBar = ({
  value,
  color = '$green',
  backgroundColor = '$gray5',
  height = 8,
}: ProgressBarProps) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <View
      height={height}
      backgroundColor={backgroundColor}
      borderRadius={height / 2}
      overflow="hidden"
    >
      <View
        height="100%"
        width={`${clampedValue}%`}
        backgroundColor={color}
        borderRadius={height / 2}
      />
    </View>
  );
};

type ScoreGaugeProps = {
  score: number; // 0-100
  grade: string;
  size?: number;
};

export const ScoreGauge = ({ score, grade, size = 120 }: ScoreGaugeProps) => {
  const getColor = () => {
    if (score >= 80) return '$green';
    if (score >= 60) return '$yellow';
    return '$stroberi';
  };

  return (
    <View
      width={size}
      height={size}
      borderRadius={size / 2}
      borderWidth={8}
      borderColor="$gray5"
      justifyContent="center"
      alignItems="center"
      position="relative"
    >
      {/* Colored progress arc - simplified as a border highlight */}
      <View
        position="absolute"
        width={size}
        height={size}
        borderRadius={size / 2}
        borderWidth={8}
        borderColor={getColor()}
        borderTopColor="transparent"
        borderRightColor={score >= 25 ? getColor() : 'transparent'}
        borderBottomColor={score >= 50 ? getColor() : 'transparent'}
        borderLeftColor={score >= 75 ? getColor() : 'transparent'}
        style={{ transform: [{ rotate: '-45deg' }] }}
      />
      <View alignItems="center">
        <Text fontSize="$8" fontWeight="bold" color={getColor()}>
          {grade}
        </Text>
        <Text fontSize="$4" color="$gray11">
          {score}/100
        </Text>
      </View>
    </View>
  );
};
