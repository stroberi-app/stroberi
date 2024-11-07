import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { createCategory } from '../../database/helpers';
import { CustomBackdrop } from '../CustomBackdrop';
import { Input, Text, View } from 'tamagui';
import { spendingCategories } from '../../data/emojis';
import { Button } from '../button/Button';
import { PlusCircle } from '@tamagui/lucide-icons';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './constants';

type CreateCategorySheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
};

export const CreateCategorySheet = ({ sheetRef }: CreateCategorySheetProps) => {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const { bottom } = useSafeAreaInsets();

  const handleCreate = () => {
    createCategory({ name, icon: selectedIcon }).then(() => {
      sheetRef.current?.close();
    });
  };
  return (
    <BottomSheetModal
      ref={sheetRef}
      enableContentPanningGesture={false}
      snapPoints={snapPoints}
      stackBehavior="push"
      enableDynamicSizing={false}
      enablePanDownToClose={true}
      animateOnMount={true}
      backdropComponent={CustomBackdrop}
      handleIndicatorStyle={handleIndicatorStyle}
      backgroundStyle={backgroundStyle}>
      <BottomSheetScrollView>
        <View padding={'$2'} gap={'$2'}>
          <Text ml={'$2'}>Enter Category Name</Text>
          <Input
            placeholder="Enter name"
            value={name}
            onChangeText={setName}
            gap={'$4'}
            width={'100%'}
          />
          <Text mt={'$2'} ml={'$2'}>
            Select Category Icon
          </Text>
          <View flexDirection={'row'} flexWrap={'wrap'} gap={'$4'} p={'$2'}>
            {spendingCategories.map((icon, index) => (
              <Button
                key={index}
                width={'auto'}
                onPress={() => setSelectedIcon(icon)}
                borderColor={icon === selectedIcon ? '$green' : undefined}>
                <Text>{icon}</Text>
              </Button>
            ))}
          </View>
        </View>
      </BottomSheetScrollView>
      <View padding={'$4'} gap={'$2'} mb={bottom}>
        <Button backgroundColor={'$green'} mt={'auto'} onPress={() => handleCreate()}>
          Create <PlusCircle size={18} color={'white'} />
        </Button>
      </View>
    </BottomSheetModal>
  );
};
