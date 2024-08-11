import React, { useRef, useState } from 'react';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { BottomSheetView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './constants';
import { Input, Text, View } from 'tamagui';
import { LinkButton } from '../button/LinkButton';
import { PlusCircle } from '@tamagui/lucide-icons';
import { CategoriesList } from '../CategoriesList';
import { CreateCategorySheet } from './CreateCategorySheet';
import { CategoryModel } from '../../database/category-model';
import { CustomBackdrop } from '../CustomBackdrop';

type ManageCategoriesSheetProps = {
  selectedCategory?: CategoryModel | null;
  setSelectedCategory?: (category: CategoryModel) => void;
  interactive?: boolean;
  sheetRef: React.RefObject<BottomSheetModal>;
};

export const ManageCategoriesSheet = ({
  selectedCategory,
  setSelectedCategory,
  sheetRef,
}: ManageCategoriesSheetProps) => {
  const [search, setSearch] = useState('');
  const ref = useRef<BottomSheetModal | null>(null);
  const database = useDatabase();
  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        $modal={false}
        stackBehavior={'push'}
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
            flexDirection={'row'}
            alignItems={'center'}
            paddingHorizontal={'$3'}
            width={'100%'}
            justifyContent={'space-between'}
            marginBottom={'$2'}>
            <Text color={'white'} fontSize={'$6'}>
              Categories
            </Text>
            <LinkButton
              alignSelf={'center'}
              color={'white'}
              backgroundColor={'$green'}
              onPress={() => ref.current?.present()}>
              <PlusCircle size={18} color={'white'} />
            </LinkButton>
          </View>
          <View padding={'$2'}>
            <Input
              placeholder="Search categories"
              value={search}
              onChangeText={setSearch}
              gap={'$4'}
              width={'100%'}
            />
          </View>
          <CategoriesList
            search={search}
            database={database}
            onSelect={setSelectedCategory}
            selectedCategory={selectedCategory}
          />
        </BottomSheetView>
      </BottomSheetModal>
      <CreateCategorySheet sheetRef={ref} />
    </>
  );
};
