import type { CreateTransactionPayload } from '../../database/actions/transactions';
import { processImportBatches } from './batching';

describe('processImportBatches', () => {
  const buildTransaction = (sourceRowNumber: number): CreateTransactionPayload => ({
    merchant: `Merchant ${sourceRowNumber}`,
    amount: -10,
    categoryId: null,
    date: new Date(`2024-01-${String(sourceRowNumber).padStart(2, '0')}`),
    currencyCode: 'USD',
    note: '',
    baseCurrency: 'USD',
    sourceRowNumber,
  });

  it('resumes from the next batch checkpoint after a successful batch', async () => {
    const transactions = Array.from({ length: 5 }, (_, index) => buildTransaction(index + 1));
    const calls: number[] = [];
    const createBatch = async (batch: CreateTransactionPayload[]) => {
      calls.push(batch.length);

      if (calls.length === 1) {
        return { importedCount: 2, failed: [] };
      }

      if (calls.length === 2) {
        return { importedCount: 2, failed: [] };
      }

      return { importedCount: 1, failed: [] };
    };
    const checkpoints: Array<{ importedCount: number; nextBatchIndex: number }> = [];

    const result = await processImportBatches({
      transactions,
      batchSize: 2,
      startBatchIndex: 0,
      createBatch,
      onBatchSuccess: (checkpoint) => {
        checkpoints.push(checkpoint);
      },
    });

    expect(calls).toEqual([2, 2, 1]);
    expect(checkpoints).toEqual([
      { importedCount: 2, nextBatchIndex: 1 },
      { importedCount: 4, nextBatchIndex: 2 },
      { importedCount: 5, nextBatchIndex: 3 },
    ]);
    expect(result).toEqual({
      importedCount: 5,
      failed: [],
      nextBatchIndex: 3,
      totalBatches: 3,
    });
  });

  it('keeps the checkpoint on the last successful batch when a later batch fails', async () => {
    const transactions = Array.from({ length: 4 }, (_, index) => buildTransaction(index + 1));
    const calls: number[] = [];
    const createBatch = async (batch: CreateTransactionPayload[]) => {
      calls.push(batch.length);

      if (calls.length === 1) {
        return { importedCount: 2, failed: [] };
      }

      throw new Error('database write failed');
    };
    const checkpoints: Array<{ importedCount: number; nextBatchIndex: number }> = [];

    try {
      await processImportBatches({
        transactions,
        batchSize: 2,
        startBatchIndex: 0,
        createBatch,
        onBatchSuccess: (checkpoint) => {
          checkpoints.push(checkpoint);
        },
      });
      expect(false).toBe(true);
    } catch (error) {
      expect(error instanceof Error ? error.message : '').toBe('database write failed');
    }

    expect(calls).toEqual([2, 2]);
    expect(checkpoints).toEqual([{ importedCount: 2, nextBatchIndex: 1 }]);
  });

  it('continues the cumulative imported count when resuming from a checkpoint', async () => {
    const transactions = Array.from({ length: 5 }, (_, index) => buildTransaction(index + 1));
    const calls: number[] = [];
    const createBatch = async (batch: CreateTransactionPayload[]) => {
      calls.push(batch.length);

      if (calls.length === 1) {
        return { importedCount: 2, failed: [] };
      }

      return { importedCount: 1, failed: [] };
    };

    const result = await processImportBatches({
      transactions,
      batchSize: 2,
      startBatchIndex: 1,
      initialImportedCount: 2,
      createBatch,
    });

    expect(calls).toEqual([2, 1]);
    expect(result).toEqual({
      importedCount: 5,
      failed: [],
      nextBatchIndex: 3,
      totalBatches: 3,
    });
  });
});
