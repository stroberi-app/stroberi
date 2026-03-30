export const MAX_IMPORT_FILE_SIZE_BYTES = 3 * 1024 * 1024;
export const MAX_EXPORT_TRANSACTION_COUNT = 5000;

export const isLargeImportFile = (sizeInBytes: number) => {
  return sizeInBytes > MAX_IMPORT_FILE_SIZE_BYTES;
};

export const isLargeExportTransactionCount = (count: number) => {
  return count > MAX_EXPORT_TRANSACTION_COUNT;
};

export const formatFileSize = (sizeInBytes: number) => {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes < 0) {
    return '0 B';
  }

  if (sizeInBytes < 1024) {
    return `${Math.round(sizeInBytes)} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = sizeInBytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};
