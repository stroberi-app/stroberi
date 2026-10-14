import type {
  ConversionCache,
  CreateTransactionPayload,
} from '../../database/actions/transactions';
import type { ImportResult } from './types';

export type ProcessImportBatchesOptions = {
  transactions: CreateTransactionPayload[];
  batchSize: number;
  startBatchIndex?: number;
  initialImportedCount?: number;
  conversionCache?: ConversionCache;
  createBatch: (
    transactions: CreateTransactionPayload[],
    conversionCache: ConversionCache
  ) => Promise<ImportResult>;
  onBatchSuccess?: (checkpoint: {
    importedCount: number;
    nextBatchIndex: number;
  }) => void;
};

export type ProcessImportBatchesResult = ImportResult & {
  nextBatchIndex: number;
  totalBatches: number;
};

export const processImportBatches = async ({
  transactions,
  batchSize,
  startBatchIndex = 0,
  initialImportedCount = 0,
  conversionCache = new Map(),
  createBatch,
  onBatchSuccess,
}: ProcessImportBatchesOptions): Promise<ProcessImportBatchesResult> => {
  const totalBatches = Math.ceil(transactions.length / batchSize);
  const importResult: ImportResult = {
    importedCount: initialImportedCount ?? 0,
    failed: [],
  };

  for (let batchIndex = startBatchIndex; batchIndex < totalBatches; batchIndex += 1) {
    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, transactions.length);
    const batch = transactions.slice(start, end);

    const batchResult = await createBatch(batch, conversionCache);
    importResult.importedCount += batchResult.importedCount;
    importResult.failed.push(...batchResult.failed);

    onBatchSuccess?.({
      importedCount: importResult.importedCount,
      nextBatchIndex: batchIndex + 1,
    });
  }

  return {
    ...importResult,
    nextBatchIndex: totalBatches,
    totalBatches,
  };
};
