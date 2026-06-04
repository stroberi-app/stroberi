export const sanitizeChartPressNumber = (
  value: number | undefined,
  fallback: number
): number => {
  'worklet';
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
};

