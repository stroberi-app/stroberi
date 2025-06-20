export type ChartDomainData = {
  yDomain: [number, number];
  yTickValues: number[];
};

export function calculateChartDomain(
  data: Record<string, unknown>[],
  yKeys: string[]
): ChartDomainData {
  if (data.length === 0) return { yDomain: [0, 100], yTickValues: [0, 25, 50, 75, 100] };

  const yValues = data.flatMap(item =>
    yKeys
      .map(key => {
        const value = item[key];
        return typeof value === 'number' ? value : parseFloat(String(value) || '0');
      })
      .filter(val => !isNaN(val))
  );

  if (yValues.length === 0) return { yDomain: [0, 100], yTickValues: [0, 25, 50, 75, 100] };

  const maxValue = Math.max(...yValues);
  const minValue = 0;

  const range = maxValue - minValue;

  if (range === 0) {
    return {
      yDomain: [0, Math.max(maxValue + 1, 10)],
      yTickValues: [0, Math.max(maxValue + 1, 10)],
    };
  }

  let tickInterval: number;

  if (range < 10) {
    tickInterval = 1;
  } else if (range < 50) {
    tickInterval = 5;
  } else if (range < 100) {
    tickInterval = 10;
  } else if (range < 500) {
    tickInterval = 50;
  } else if (range < 1000) {
    tickInterval = 100;
  } else if (range < 5000) {
    tickInterval = 1000;
  } else if (range < 10000) {
    tickInterval = 2000;
  } else if (range < 50000) {
    tickInterval = 10000;
  } else if (range < 100000) {
    tickInterval = 20000;
  } else if (range < 500000) {
    tickInterval = 50000;
  } else {
    tickInterval = 200000;
  }

  const ticks: number[] = [0];
  let currentTick = tickInterval;
  const maxTick = Math.ceil(maxValue / tickInterval) * tickInterval;

  while (currentTick <= maxTick && ticks.length < 8) {
    ticks.push(currentTick);
    currentTick += tickInterval;
  }

  const domainMax = Math.max(maxTick, maxValue);

  return {
    yDomain: [0, domainMax],
    yTickValues: ticks,
  };
}

export function formatYAxisLabel(value: number | string): string {
  const numY = typeof value === 'number' ? value : parseFloat(value?.toString() || '0');
  if (isNaN(numY)) return '0';

  if (numY >= 1000000) {
    const millions = numY / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }

  if (numY >= 1000) {
    const thousands = numY / 1000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
  }

  return numY.toString();
}
