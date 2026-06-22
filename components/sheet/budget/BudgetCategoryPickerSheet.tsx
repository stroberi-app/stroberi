import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { Database } from '@nozbe/watermelondb';
import type React from 'react';
import { Text, View } from 'tamagui';
import type { CategoryModel } from '../../../database/category-model';
import { LinkButton } from '../../button/LinkButton';
import { CategoriesList } from '../../CategoriesList';
import { CustomBackdrop } from '../../CustomBackdrop';
import { backgroundStyle, handleIndicatorStyle } from '../constants';

type BudgetCategoryPickerSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  database: Database;
  search: string;
  onSearchChange: (search: string) => void;
  selectedCategories: CategoryModel[];
  onSelectCategory: (category: CategoryModel) => void;
};

export const BudgetCategoryPickerSheet = ({
  sheetRef,
  database,
  search,
  onSearchChange,
  selectedCategories,
  onSelectCategory,
}: BudgetCategoryPickerSheetProps) => (
  <BottomSheetModal
    ref={sheetRef}
    snapPoints={['70%']}
    enableDynamicSizing={false}
    stackBehavior="push"
    enablePanDownToClose={true}
    handleIndicatorStyle={handleIndicatorStyle}
    backdropComponent={CustomBackdrop}
    backgroundStyle={backgroundStyle}
  >
    <BottomSheetView style={{ flex: 1 }}>
      <View paddingHorizontal="$4" paddingTop="$2" flex={1}>
        <View
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginBottom="$3"
        >
          <Text fontSize="$6" fontWeight="bold">
            Select Categories
          </Text>
          <LinkButton backgroundColor="$green" onPress={() => sheetRef.current?.close()}>
            <Text color="white">Done</Text>
          </LinkButton>
        </View>
        <Text fontSize="$2" color="$gray9" marginBottom="$3">
          Leave empty to track all expenses
        </Text>
        <BottomSheetTextInput
          placeholder="Search categories..."
          value={search}
          onChangeText={onSearchChange}
          style={{
            backgroundColor: '#2a2a2a',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
            color: 'white',
            fontSize: 16,
          }}
          placeholderTextColor="#666"
        />
        <CategoriesList
          database={database}
          search={search}
          onSelect={onSelectCategory}
          selectedCategories={selectedCategories}
          preventClose
        />
      </View>
    </BottomSheetView>
  </BottomSheetModal>
);
