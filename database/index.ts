import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Platform } from 'react-native';
import { migrations } from './migrations';
import { modelClasses } from './modelClasses';
import { schema } from './schema';

const adapter = new SQLiteAdapter({
  schema,
  jsi: Platform.OS === 'ios',
  migrations,
});

export const database = new Database({ adapter, modelClasses });
