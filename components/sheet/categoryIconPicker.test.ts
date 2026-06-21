import {
  getAndroidCategoryIconPresets,
  shouldUseNativeCategoryIconPicker,
} from './categoryIconPicker';
import { spendingCategories } from '../../data/emojis';

describe('shouldUseNativeCategoryIconPicker', () => {
  it('uses the native emoji keyboard on iOS', () => {
    expect(shouldUseNativeCategoryIconPicker('ios')).toBe(true);
  });

  it('does not use the native emoji keyboard on Android', () => {
    expect(shouldUseNativeCategoryIconPicker('android')).toBe(false);
  });
});

describe('getAndroidCategoryIconPresets', () => {
  it('adds extra Android presets without removing existing spending icons', () => {
    const presets = getAndroidCategoryIconPresets();

    expect(presets.length > spendingCategories.length).toBe(true);
    for (const icon of spendingCategories) {
      expect(presets).toContain(icon);
    }
    expect(presets).toContain('☕');
    expect(presets).toContain('🏋️');
    expect(presets).toContain('🧾');
    expect(presets).toContain('💸');
  });

  it('deduplicates Android presets', () => {
    const presets = getAndroidCategoryIconPresets();

    expect(new Set(presets).size).toBe(presets.length);
  });
});
