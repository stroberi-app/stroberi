import { Model, type Relation } from '@nozbe/watermelondb';
import { date, field, relation, text } from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';
import type { TripModel } from './trip-model';

export class FxSnapshotModel extends Model {
  static table = 'fx_snapshots';

  static associations: Associations = {
    trips: { type: 'belongs_to', key: 'trip_id' },
  };

  @text('trip_id') tripId: string | null;
  @text('baseCurrencyCode') baseCurrencyCode: string;
  @text('counterCurrencyCode') counterCurrencyCode: string;
  @field('rate') rate: number;
  @text('source') source: string | null;
  @relation('trips', 'trip_id') trip: Relation<TripModel> | null;

  @date('captured_at') capturedAt: Date;
}
