import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import logger from '@nozbe/watermelondb/utils/common/logger';
import { modelClasses } from '../modelClasses';
import { schema } from '../schema';

logger.silence();

/**
 * In-memory WatermelonDB for tests. Exercises the real write queue, batching
 * and relations, so database actions can be verified without native SQLite.
 */
export const createTestDatabase = () =>
  new Database({
    adapter: new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      extraLokiOptions: { autosave: false },
    }),
    modelClasses,
  });
