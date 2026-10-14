import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class CategoryModel extends Model {
  static table = 'categories';
  @text('name') name: string;
  @text('icon') icon: string;
  @field('usageCount') usageCount: number;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
