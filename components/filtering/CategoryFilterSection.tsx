import { PlusCircle, XCircle } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Text, View } from 'tamagui';
import type { CategoryModel } from '../../database/category-model';
import { registerCategorySelectionHandler } from '../../lib/categorySelectionBridge';
import { LinkButton } from '../button/LinkButton';
import FilterOption from './FilterOptions';

type CategoryFilterSectionProps = {
  selectedCategories: CategoryModel[];
  setSelectedCategory: (category: CategoryModel[]) => void;
};

const CategoryFilterSection = ({
  selectedCategories,
  setSelectedCategory,
}: CategoryFilterSectionProps) => {
  const router = useRouter();
  const categorySelectionIdRef = useRef(
    `category-filter-${Date.now()}-${Math.random()}`
  );

  useEffect(
    () =>
      registerCategorySelectionHandler(categorySelectionIdRef.current, (categories) => {
        if (Array.isArray(categories)) {
          setSelectedCategory(categories);
        }
      }),
    [setSelectedCategory]
  );

  const handleCategoryPress = (category: CategoryModel) => {
    if (selectedCategories.some((c) => c.id === category.id)) {
      setSelectedCategory(selectedCategories.filter((cat) => cat.id !== category.id));
    } else {
      setSelectedCategory([...selectedCategories, category]);
    }
  };

  return (
    <View paddingHorizontal="$4" paddingVertical="$2">
      <View
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="$4"
      >
        <Text fontSize="$6" fontWeight="bold" marginBottom="$2">
          Filter by Category
        </Text>
        {selectedCategories.length > 0 && (
          <LinkButton onPress={() => setSelectedCategory([])}>
            <XCircle size={18} color="white" />
          </LinkButton>
        )}
      </View>
      <View flexDirection="row" gap="$3" flexWrap="wrap">
        {selectedCategories?.map((category) => (
          <FilterOption
            key={category.id}
            label={category.name}
            icon={category.icon}
            isSelected={selectedCategories?.some((c) => c.id === category.id) ?? false}
            onPress={() => handleCategoryPress(category)}
          />
        ))}
        <LinkButton
          paddingHorizontal="$4"
          onPress={() =>
            router.push({
              pathname: '/select-category',
              params: {
                mode: 'multi',
                selectionId: categorySelectionIdRef.current,
                selectedCategoryIds: selectedCategories
                  .map((category) => category.id)
                  .join(','),
              },
            })
          }
        >
          <PlusCircle size={18} color="white" />
          <Text>Add Category</Text>
        </LinkButton>
      </View>
    </View>
  );
};

export default CategoryFilterSection;
