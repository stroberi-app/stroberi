export const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(value);
