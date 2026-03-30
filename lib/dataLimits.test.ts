import {
  MAX_EXPORT_TRANSACTION_COUNT,
  MAX_IMPORT_FILE_SIZE_BYTES,
  formatFileSize,
  isLargeExportTransactionCount,
  isLargeImportFile,
} from './dataLimits';

describe('data limits', () => {
  it('flags import files above the configured size limit', () => {
    expect(isLargeImportFile(MAX_IMPORT_FILE_SIZE_BYTES)).toBe(false);
    expect(isLargeImportFile(MAX_IMPORT_FILE_SIZE_BYTES + 1)).toBe(true);
  });

  it('flags export counts above the configured row limit', () => {
    expect(isLargeExportTransactionCount(MAX_EXPORT_TRANSACTION_COUNT)).toBe(false);
    expect(isLargeExportTransactionCount(MAX_EXPORT_TRANSACTION_COUNT + 1)).toBe(true);
  });

  it('formats file sizes for user-facing messages', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
  });
});
