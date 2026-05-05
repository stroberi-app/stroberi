const fallbackFormat = (value: number, currency: string) => {
  const code =
    typeof currency === 'string' && currency.trim().length > 0 ? currency.trim() : '?';
  const amount = Number.isFinite(value) ? value.toFixed(2) : String(value);
  return `${code} ${amount}`;
};

export const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    // Intl.NumberFormat throws on unsupported/malformed currency codes.
    // Fall back to a plain representation so a single bad row can't
    // crash the screen — the user can still see and delete the entry.
    return fallbackFormat(value, currency);
  }
};

export const formatCurrencyWorklet = (value: number, currency: string) => {
  'worklet';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    const code =
      typeof currency === 'string' && currency.trim().length > 0 ? currency.trim() : '?';
    const amount = Number.isFinite(value) ? value.toFixed(2) : String(value);
    return `${code} ${amount}`;
  }
};
