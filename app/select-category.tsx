import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { ArrowLeft, PlusCircle, Search } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';
import { LinkButton } from '../components/button/LinkButton';
import { ListItem } from '../components/ListItem';
import type { CategoryModel } from '../database/category-model';
import { deleteCategory } from '../database/actions/categories';
import { selectCategoryForHandler } from '../lib/categorySelectionBridge';
import useToast from '../hooks/useToast';

type CategoryRouteParams = {
  selectionId?: string | string[];
  selectedCategoryId?: string | string[];
  selectedCategoryIds?: string | string[];
  mode?: string | string[];
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function SelectCategoryScreen() {
  const database = useDatabase();
  const router = useRouter();
  const params = useLocalSearchParams<CategoryRouteParams>();
  const { top, bottom } = useSafeAreaInsets();
  const toast = useToast();
  const { showActionSheetWithOptions } = useActionSheet();
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<CategoryModel[]>([]);

  const selectionId = firstParam(params.selectionId);
  const selectedCategoryId = firstParam(params.selectedCategoryId);
  const mode = firstParam(params.mode) ?? 'single';
  const isMultiMode = mode === 'multi';
  const isManageMode = mode === 'manage';
  const selectedCategoryIdsParam = firstParam(params.selectedCategoryIds);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(selectedCategoryIdsParam?.split(',').filter(Boolean) ?? [])
  );

  useEffect(() => {
    const subscription = database
      .get<CategoryModel>('categories')
      .query(Q.sortBy('usageCount', Q.desc))
      .observe()
      .subscribe(setCategories);

    return () => subscription.unsubscribe();
  }, [database]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalizedSearch)
    );
  }, [categories, search]);

  const handleSelect = useCallback(
    (category: CategoryModel | null) => {
      if (isManageMode) {
        return;
      }

      if (isMultiMode) {
        if (!category) {
          setSelectedIds(new Set());
          return;
        }

        setSelectedIds((current) => {
          const next = new Set(current);
          if (next.has(category.id)) {
            next.delete(category.id);
          } else {
            next.add(category.id);
          }
          return next;
        });
        return;
      }

      if (selectionId) {
        selectCategoryForHandler(selectionId, category);
      }
      router.back();
    },
    [isManageMode, isMultiMode, router, selectionId]
  );

  const handleDone = useCallback(() => {
    if (selectionId) {
      selectCategoryForHandler(
        selectionId,
        categories.filter((category) => selectedIds.has(category.id))
      );
    }
    router.back();
  }, [categories, router, selectedIds, selectionId]);

  const handleEdit = useCallback(
    (category: CategoryModel | null) => {
      router.push({
        pathname: '/edit-category',
        params: category ? { categoryId: category.id } : {},
      });
    },
    [router]
  );

  const handleDelete = useCallback(
    (category: CategoryModel) => {
      showActionSheetWithOptions(
        {
          title: 'Are you sure you want to delete this category?',
          options: ['Delete', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        async (buttonIndex) => {
          if (buttonIndex !== 0) {
            return;
          }

          try {
            await deleteCategory(category.id);
            toast.show({ title: 'Category deleted', preset: 'done' });
          } catch (error) {
            toast.show({
              title: 'Unable to delete category',
              message:
                error instanceof Error ? error.message : 'Failed to delete category.',
              preset: 'error',
            });
          }
        }
      );
    },
    [showActionSheetWithOptions, toast]
  );

  const renderCategory = useCallback(
    ({ item }: { item: CategoryModel }) => {
      const selected = isMultiMode
        ? selectedIds.has(item.id)
        : item.id === selectedCategoryId;

      if (isManageMode) {
        return (
          <View
            flexDirection="row"
            alignItems="center"
            borderWidth="$0.5"
            borderColor="$borderColor"
            paddingLeft="$4"
          >
            <Pressable style={styles.manageRowMain} onPress={() => handleEdit(item)}>
              <Text fontSize="$5" fontWeight="bold" flex={1}>
                {item.name}
              </Text>
              <Text fontSize="$5" marginRight="$4">
                {item.icon}
              </Text>
            </Pressable>
            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
              accessibilityLabel={`Delete ${item.name}`}
              accessibilityRole="button"
            >
              <Text color="$stroberi" fontSize="$3" fontWeight="700">
                Delete
              </Text>
            </Pressable>
          </View>
        );
      }

      return (
        <View flexDirection="row" alignItems="center">
          <Pressable style={{ flex: 1 }} onPress={() => handleSelect(item)}>
            <ListItem name={item.name} extra={item.icon} selected={selected} />
          </Pressable>
        </View>
      );
    },
    [
      handleDelete,
      handleEdit,
      handleSelect,
      isManageMode,
      isMultiMode,
      selectedCategoryId,
      selectedIds,
    ]
  );

  return (
    <View flex={1} backgroundColor="$background" paddingTop={top + 8}>
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3"
        marginBottom="$3"
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
          {isManageMode ? 'Categories' : 'Category'}
        </Text>
        {isMultiMode ? (
          <LinkButton backgroundColor="$green" color="white" onPress={handleDone}>
            Done
          </LinkButton>
        ) : (
          <View width={72} />
        )}
      </View>

      <View paddingHorizontal="$3" marginBottom="$3">
        <View
          flexDirection="row"
          alignItems="center"
          gap="$2"
          backgroundColor="$gray3"
          borderRadius="$3"
          paddingHorizontal="$3"
        >
          <Search size={18} color="gray" />
          <Input
            flex={1}
            borderWidth={0}
            backgroundColor="transparent"
            placeholder="Search categories"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          isManageMode ? (
            <Pressable style={styles.createRow} onPress={() => handleEdit(null)}>
              <PlusCircle size={20} color="white" />
              <Text color="white" fontSize="$5" fontWeight="700">
                Create category
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => handleSelect(null)}>
              <ListItem
                name={isMultiMode ? 'All categories' : 'Uncategorized'}
                extra="📦"
                selected={isMultiMode ? selectedIds.size === 0 : !selectedCategoryId}
              />
            </Pressable>
          )
        }
        contentContainerStyle={{ paddingBottom: bottom + 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  createRow: {
    alignItems: 'center',
    borderColor: '#2f2f35',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deleteButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 72,
  },
  manageRowMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minHeight: 48,
  },
});
