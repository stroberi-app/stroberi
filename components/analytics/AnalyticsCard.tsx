import type * as React from 'react';
import { Text, View } from 'tamagui';

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

type TrendBadgeProps = {
  trend: 'up' | 'down' | 'stable';
  label?: string;
};

export const TrendBadge = ({ trend, label }: TrendBadgeProps) => {
  const getConfig = () => {
    switch (trend) {
      case 'up':
        return { icon: '↑', color: '$green', bg: 'rgba(34, 197, 94, 0.15)' };
      case 'down':
        return { icon: '↓', color: '$stroberi', bg: 'rgba(229, 75, 75, 0.15)' };
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
