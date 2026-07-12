import { useDatabase } from '@nozbe/watermelondb/hooks';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';
import { LinkButton } from '../components/button/LinkButton';
import type { CategoryModel } from '../database/category-model';
import { createCategory, updateCategory } from '../database/actions/categories';
import { spendingCategories } from '../data/emojis';
import useToast from '../hooks/useToast';

type EditCategoryParams = {
  categoryId?: string | string[];
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getRandomIcon = () =>
  spendingCategories[Math.floor(Math.random() * spendingCategories.length)] ?? '📦';

export default function EditCategoryScreen() {
  const database = useDatabase();
  const router = useRouter();
  const toast = useToast();
  const { top } = useSafeAreaInsets();
  const params = useLocalSearchParams<EditCategoryParams>();
  const categoryId = firstParam(params.categoryId);
  const [category, setCategory] = useState<CategoryModel | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(getRandomIcon);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCategory = async () => {
      if (!categoryId) {
        return;
      }

      const nextCategory = await database
        .get<CategoryModel>('categories')
        .find(categoryId)
        .catch(() => null);

      if (!isMounted || !nextCategory) {
        return;
      }

      setCategory(nextCategory);
      setName(nextCategory.name);
      setIcon(nextCategory.icon);
    };

    loadCategory();

    return () => {
      isMounted = false;
    };
  }, [categoryId, database]);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    Keyboard.dismiss();
    const trimmedName = name.trim();
    const trimmedIcon = icon.trim() || '📦';

    if (!trimmedName) {
      toast.show({
        title: 'Missing Name',
        message: 'Category name cannot be empty',
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    setIsSaving(true);

    try {
      const existingCategories = await database
        .get<CategoryModel>('categories')
        .query()
        .fetch();

      const duplicate = existingCategories.find(
        (item) =>
          item.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
          item.id !== category?.id
      );

      if (duplicate) {
        toast.show({
          title: 'Duplicate Category',
          message: 'A category with this name already exists',
          preset: 'error',
          haptic: 'error',
        });
        setIsSaving(false);
        return;
      }

      if (category?.id) {
        await updateCategory({ id: category.id, name: trimmedName, icon: trimmedIcon });
      } else {
        await createCategory({ name: trimmedName, icon: trimmedIcon });
      }

      setIsSaving(false);
      router.back();
    } catch (error) {
      setIsSaving(false);
      toast.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save category',
        preset: 'error',
        haptic: 'error',
      });
    }
  };

  return (
    <View flex={1} backgroundColor="$background" paddingTop={top + 8}>
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3"
        marginBottom="$6"
      >
        <LinkButton
          backgroundColor="transparent"
          paddingHorizontal="$2"
          color="gray"
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="gray" />
          Back
        </LinkButton>
        <Text color="white" fontSize="$6" fontWeight="700">
          {category ? 'Edit Category' : 'Create Category'}
        </Text>
        <LinkButton
          backgroundColor="$green"
          color="white"
          onPress={handleSave}
          opacity={isSaving ? 0.6 : 1}
          disabled={isSaving}
        >
          Save
        </LinkButton>
      </View>

      <View paddingHorizontal="$4" gap="$4">
        <View gap="$2">
          <Text color="gray" fontSize="$3">
            Name
          </Text>
          <Input
            placeholder="Category name"
            value={name}
            onChangeText={setName}
            autoFocus={!categoryId}
          />
        </View>
        <View gap="$2">
          <Text color="gray" fontSize="$3">
            Icon
          </Text>
          <Input placeholder="Emoji" value={icon} onChangeText={setIcon} maxLength={4} />
        </View>
      </View>
    </View>
  );
}
