import { CategoryModel } from '../database/category-model';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, useBottomSheet } from '@gorhom/bottom-sheet';
import { ListItem } from './ListItem';
import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Pressable } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, LinearTransition } from 'react-native-reanimated';
import { Pen, Trash2 } from '@tamagui/lucide-icons';
import { View } from 'tamagui';
import { useActionSheet } from '@expo/react-native-action-sheet';

type CategoriesListProps = {
  categories: CategoryModel[];
  onSelect?: (category: CategoryModel) => void;
  selectedCategory?: CategoryModel | null;
  preventClose?: boolean;
  selectedCategories?: CategoryModel[];
  swipeable?: boolean;
};

const Component = ({
  categories,
  onSelect,
  selectedCategory,
  preventClose,
  selectedCategories,
  swipeable,
}: CategoriesListProps) => {
  const { bottom } = useSafeAreaInsets();
  const { close } = useBottomSheet();

  const onEdit = (category: CategoryModel) => {
    // Implement edit logic here
    console.log({ category });
  };

  const { showActionSheetWithOptions } = useActionSheet();

  const onDelete = (category: CategoryModel) => {
    showActionSheetWithOptions(
      {
        title: 'Are you sure you want to delete this category?',
        options: ['Delete', 'Cancel'],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      buttonIndex => {
        if (buttonIndex === 0) {
          category.deleteCategory();
        }
      }
    );
  };

  const renderRightAction = (
    category: CategoryModel,
    prog: SharedValue<number>,
    drag: SharedValue<number>
  ) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 100 }],
        flexDirection: 'row',
      };
    });

    return (
      <Animated.View style={styleAnimation}>
        <View backgroundColor={'gray'} width={50}>
          <Pressable
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}
            onPress={() => onEdit(category)}
            accessibilityLabel="Edit category"
            accessibilityRole="button">
            <Pen height={24} width={24} />
          </Pressable>
        </View>
        <View backgroundColor={'$stroberiLight'} width={50}>
          <Pressable
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
            onPress={() => onDelete(category)}>
            <Trash2 height={8} width={8} />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  const renderItem = useCallback(
    ({ item: category }: { item: CategoryModel }) => {
      const inner = (
        <TouchableOpacity
          onPress={() => {
            if (onSelect) {
              onSelect(category);
              if (!preventClose) {
                close();
              }
            }
          }}
          disabled={!onSelect}>
          <ListItem
            name={category.name}
            extra={category.icon}
            selected={
              category.id === selectedCategory?.id ||
              selectedCategories?.some(c => c.id === category.id)
            }
          />
        </TouchableOpacity>
      );
      if (swipeable) {
        return (
          <ReanimatedSwipeable
            friction={2}
            enableTrackpadTwoFingerGesture
            rightThreshold={40}
            renderRightActions={(prog, drag) => renderRightAction(category, prog, drag)}>
            {inner}
          </ReanimatedSwipeable>
        );
      }
      return inner;
    },
    [selectedCategory, selectedCategories, swipeable, preventClose]
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
    <Animated.FlatList
      data={categories}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      bounces={false}
      keyboardShouldPersistTaps={'always'}
      itemLayoutAnimation={LinearTransition}
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
