import { Model } from '@nozbe/watermelondb';
import { date, readonly, text, writer } from '@nozbe/watermelondb/decorators';

export class CategoryModel extends Model {
  static table = 'categories';
  @text('name') name: string;
  @text('icon') icon: string;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;

  @writer deleteCategory() {
    return this.markAsDeleted();
  }

  @writer updateCategory({ name, icon }: { name: string; icon: string }) {
    return this.prepareUpdate(tx => {
      tx.name = name;
      tx.icon = icon;
    });
  }
}
