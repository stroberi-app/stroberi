import { useActionSheet } from '@expo/react-native-action-sheet';
import { TouchableOpacity, useBottomSheet } from '@gorhom/bottom-sheet';
import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { Pen, Trash2 } from '@tamagui/lucide-icons';
import { useCallback, useMemo } from 'react';
import { Pressable } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  LinearTransition,
  type SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Observable } from 'rxjs';
import { View } from 'tamagui';
import type { CategoryModel } from '../database/category-model';
import { deleteCategory } from '../database/actions/categories';
import useToast from '../hooks/useToast';
import { ListItem } from './ListItem';

type RightActionViewProps = {
  drag: SharedValue<number>;
  children: React.ReactNode;
};

const RightActionView = ({ drag, children }: RightActionViewProps) => {
  const styleAnimation = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: drag.value + 100 }],
      flexDirection: 'row',
    };
  });

  return <Animated.View style={styleAnimation}>{children}</Animated.View>;
};

type CategoriesListProps = {
  categories: CategoryModel[];
  onSelect?: (category: CategoryModel) => void;
  selectedCategory?: CategoryModel | null;
  preventClose?: boolean;
  selectedCategories?: CategoryModel[];
  swipeable?: boolean;
  onEdit?: (category: CategoryModel) => void;
};

const Component = ({
  categories,
  onSelect,
  selectedCategory,
  preventClose,
  selectedCategories,
  swipeable,
  onEdit,
}: CategoriesListProps) => {
  const { bottom } = useSafeAreaInsets();
  const { close } = useBottomSheet();
  const toast = useToast();

  const { showActionSheetWithOptions } = useActionSheet();

  const onDelete = useCallback(
    (category: CategoryModel) => {
      showActionSheetWithOptions(
        {
          title: 'Are you sure you want to delete this category?',
          options: ['Delete', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            try {
              await deleteCategory(category.id);
              toast.show({
                title: 'Category deleted',
                preset: 'done',
              });
            } catch (error) {
              toast.show({
                title: 'Unable to delete category',
                message:
                  error instanceof Error ? error.message : 'Failed to delete category.',
                preset: 'error',
              });
            }
          }
        }
      );
    },
    [showActionSheetWithOptions, toast]
  );

  const renderRightAction = useCallback(
    (category: CategoryModel, _prog: SharedValue<number>, drag: SharedValue<number>) => {
      return (
        <RightActionView drag={drag}>
          {!!onEdit && (
            <View backgroundColor="gray" width={50}>
              <Pressable
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}
                onPress={() => {
                  onEdit(category);
                  drag.value = withTiming(0, { duration: 200 });
                }}
                accessibilityLabel="Edit category"
                accessibilityRole="button"
              >
                <Pen height={24} width={24} />
              </Pressable>
            </View>
          )}
          <View backgroundColor="$stroberiLight" width={50}>
            <Pressable
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
              onPress={() => {
                onDelete(category);
                drag.value = withTiming(0, { duration: 200 });
              }}
            >
              <Trash2 height={20} width={20} />
            </Pressable>
          </View>
        </RightActionView>
      );
    },
    [onEdit, onDelete]
  );

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
          disabled={!onSelect}
        >
          <ListItem
            name={category.name}
            extra={category.icon}
            selected={
              category.id === selectedCategory?.id ||
              selectedCategories?.some((c) => c.id === category.id)
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
            renderRightActions={(prog, drag) => renderRightAction(category, prog, drag)}
          >
            {inner}
          </ReanimatedSwipeable>
        );
      }
      return inner;
    },
    [
      selectedCategory,
      selectedCategories,
      swipeable,
      preventClose,
      close,
      onSelect,
      renderRightAction,
    ]
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
      keyboardShouldPersistTaps="always"
      itemLayoutAnimation={LinearTransition}
      {...props}
    />
  );
};

const withData = withObservables<
  { database: Database; search: string },
  { categories: Observable<CategoryModel[]> }
>(['search'], ({ database, search }) => {
  return {
    categories: database.collections
      .get<CategoryModel>('categories')
      .query(Q.where('name', Q.like(`%${search}%`)), Q.sortBy('usageCount', Q.desc))
      .observe(),
  };
});

export const CategoriesList = withData(Component);

const keyExtractor = (item: CategoryModel) => item.id;
