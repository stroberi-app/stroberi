import {
  EXPORT_PREVIEW_FULL_THRESHOLD,
  EXPORT_PREVIEW_SAMPLE_SIZE,
  isPartialPreviewCount,
} from './useTransactionExport';

describe('transaction export preview thresholds', () => {
  it('keeps full preview at the threshold', () => {
    expect(isPartialPreviewCount(EXPORT_PREVIEW_FULL_THRESHOLD - 1)).toBe(false);
    expect(isPartialPreviewCount(EXPORT_PREVIEW_FULL_THRESHOLD)).toBe(false);
  });

  it('switches to sampled preview above the threshold', () => {
    expect(isPartialPreviewCount(EXPORT_PREVIEW_FULL_THRESHOLD + 1)).toBe(true);
    expect(EXPORT_PREVIEW_SAMPLE_SIZE).toBe(200);
  });
});
