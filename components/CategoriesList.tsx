import { CategoryModel } from '../database/category-model';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useMemo } from 'react';
import { BottomSheetFlatList, TouchableOpacity, useBottomSheet } from '@gorhom/bottom-sheet';
import { CurrencyItem } from './CurrencyItem';
import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';

type CategoriesListProps = {
  categories: CategoryModel[];
  onSelect?: (category: CategoryModel) => void;
  selectedCategory?: CategoryModel;
};

const Component = ({ categories, onSelect, selectedCategory }: CategoriesListProps) => {
  const { bottom } = useSafeAreaInsets();
  const { close } = useBottomSheet();
  const renderItem = useCallback(
    ({ item: category }: { item: CategoryModel }) => (
      <TouchableOpacity
        key={category.id}
        onPress={() => {
          if (onSelect) {
            onSelect(category);
            close();
          }
        }}
        disabled={!onSelect}>
        <CurrencyItem
          name={category.name}
          code={category.icon}
          selected={category.id === selectedCategory?.id}
        />
      </TouchableOpacity>
    ),
    [selectedCategory]
  );

  const props = useMemo(
    () => ({
      contentInset: {
        bottom: bottom + 16,
      },
      contentContainerStyle: {
        paddingBottom: bottom,
      },
      style: { marginBottom: bottom },
    }),
    [bottom]
  );

  return (
    <BottomSheetFlatList
      data={categories}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      bounces={false}
      {...props}
    />
  );
};

const enhance = withObservables<
  { database: Database; search: string },
  { categories: Observable<CategoryModel[]> }
>(['search'], ({ database, search }) => {
  return {
    categories: database.collections
      .get<CategoryModel>('categories')
      .query(Q.where('name', Q.like('%' + search + '%')), Q.sortBy('created_at', 'desc'))
      .observe(),
  };
});

export const CategoriesList = enhance(Component);

const keyExtractor = (item: CategoryModel) => item.id;
