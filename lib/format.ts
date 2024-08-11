export const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(value);
