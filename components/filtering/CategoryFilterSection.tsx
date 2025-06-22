import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { PlusCircle, XCircle } from '@tamagui/lucide-icons';
import { useRef } from 'react';
import { Text, View } from 'tamagui';
import type { CategoryModel } from '../../database/category-model';
import { LinkButton } from '../button/LinkButton';
import { ManageCategoriesSheet } from '../sheet/ManageCategoriesSheet';
import FilterOption from './FilterOptions';

type CategoryFilterSectionProps = {
  selectedCategories: CategoryModel[];
  setSelectedCategory: (category: CategoryModel[]) => void;
};

const CategoryFilterSection = ({
  selectedCategories,
  setSelectedCategory,
}: CategoryFilterSectionProps) => {
  const manageCategoriesSheetRef = useRef<BottomSheetModal>(null);
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
          onPress={() => manageCategoriesSheetRef.current?.present()}
        >
          <PlusCircle size={18} color="white" />
          <Text>Add Category</Text>
        </LinkButton>
      </View>

      <ManageCategoriesSheet
        preventClose
        selectedCategories={selectedCategories}
        sheetRef={manageCategoriesSheetRef}
        setSelectedCategory={(category) => {
          handleCategoryPress(category);
        }}
      />
    </View>
  );
};

export default CategoryFilterSection;
