import React, { useRef, useState } from 'react';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { BottomSheetView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './constants';
import { Text, View } from 'tamagui';
import { LinkButton } from '../button/LinkButton';
import { PlusCircle } from '@tamagui/lucide-icons';
import { CategoriesList } from '../CategoriesList';
import { ManageCategoryItemSheet } from './ManageCategoryItemSheet';
import type { CategoryModel } from '../../database/category-model';
import { CustomBackdrop } from '../CustomBackdrop';
import { BottomSheetTextInput } from './BottomSheetTextInput';

type ManageCategoriesSheetProps = {
  selectedCategory?: CategoryModel | null;
  selectedCategories?: CategoryModel[];
  setSelectedCategory?: (category: CategoryModel) => void;
  interactive?: boolean;
  sheetRef: React.RefObject<BottomSheetModal>;
  preventClose?: boolean;
  noSearch?: boolean;
  swipeable?: boolean;
};

export const ManageCategoriesSheet = ({
  selectedCategory,
  setSelectedCategory,
  sheetRef,
  preventClose = false,
  selectedCategories,
  noSearch,
  swipeable = false,
}: ManageCategoriesSheetProps) => {
  const [search, setSearch] = useState('');
  const categorySheet = useRef<BottomSheetModal>(null);
  const database = useDatabase();
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryModel | null>(null);

  const handleEdit = (category: CategoryModel) => {
    setCategoryToEdit(category);
    categorySheet.current?.present();
  };
  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        $modal={false}
        stackBehavior="push"
        enableContentPanningGesture={false}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        animateOnMount={true}
        handleIndicatorStyle={handleIndicatorStyle}
        backdropComponent={CustomBackdrop}
        backgroundStyle={backgroundStyle}>
        <BottomSheetView>
          <View
            flexDirection="row"
            alignItems="center"
            paddingHorizontal="$3"
            width="100%"
            justifyContent="space-between"
            marginBottom="$2">
            <Text color="white" fontSize="$6">
              Categories
            </Text>
            <LinkButton
              alignSelf="center"
              color="white"
              backgroundColor="$green"
              onPress={() => categorySheet.current?.present()}>
              <PlusCircle size={18} color="white" />
            </LinkButton>
          </View>
          {!noSearch && (
            <View padding="$2">
              <BottomSheetTextInput
                placeholder="Search categories"
                value={search}
                onChangeText={setSearch}
                gap="$4"
                width="100%"
              />
            </View>
          )}
          <CategoriesList
            preventClose={preventClose}
            search={search}
            database={database}
            onSelect={setSelectedCategory}
            onEdit={handleEdit}
            selectedCategory={selectedCategory}
            selectedCategories={selectedCategories}
            swipeable={swipeable}
          />
        </BottomSheetView>
      </BottomSheetModal>
      <ManageCategoryItemSheet
        sheetRef={categorySheet}
        category={categoryToEdit}
        onClose={() => {
          setCategoryToEdit(null);
        }}
      />
    </>
  );
};
