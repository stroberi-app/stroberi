import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { createCategory, updateCategory } from '../../database/helpers';
import { CustomBackdrop } from '../CustomBackdrop';
import { Text, useTheme, View } from 'tamagui';
import { spendingCategories } from '../../data/emojis';
import { Button } from '../button/Button';
import { PlusCircle } from '@tamagui/lucide-icons';
import { backgroundStyle, handleIndicatorStyle } from './constants';
import EmojiPicker from 'rn-emoji-keyboard';
import { OnEmojiSelected } from 'rn-emoji-keyboard/lib/typescript/contexts/KeyboardContext';
import { BottomSheetTextInput } from './BottomSheetTextInput';
import { Keyboard } from 'react-native';
import { CategoryModel } from '../../database/category-model';

type CreateCategorySheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  category?: CategoryModel | null;
  onClose: () => void;
};

export const ManageCategoryItemSheet = ({
  sheetRef,
  category,
  onClose,
}: CreateCategorySheetProps) => {
  const { stroberi } = useTheme();
  const stroberiColor = stroberi?.get();
  const [name, setName] = useState(category?.name || '');
  const [selectedIcon, setSelectedIcon] = useState(category?.icon || getRandomIcon());
  const { bottom } = useSafeAreaInsets();
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSelectedIcon(category.icon);
    } else {
      setSelectedIcon(getRandomIcon());
      setName('');
    }
  }, [category]);

  const handlePick: OnEmojiSelected = emoji => {
    setSelectedIcon(emoji.emoji);
    setIsOpen(false);
  };

  const handleSave = () => {
    Keyboard.dismiss();
    if (category && category.id) {
      updateCategory({ id: category.id, name, icon: selectedIcon }).then(() => {
        sheetRef.current?.dismiss();
      });
    } else {
      createCategory({ name, icon: selectedIcon }).then(() => {
        sheetRef.current?.dismiss();
        setName('');
        setSelectedIcon(getRandomIcon());
      });
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableContentPanningGesture={false}
      stackBehavior="push"
      enableDynamicSizing={true}
      enablePanDownToClose={true}
      animateOnMount={true}
      onDismiss={onClose}
      enableDismissOnClose={true}
      backdropComponent={CustomBackdrop}
      handleIndicatorStyle={handleIndicatorStyle}
      backgroundStyle={backgroundStyle}>
      <BottomSheetView>
        <View padding="$2" gap="$2">
          <Text ml="$2">Category Name & Icon</Text>
          <View flexDirection="row" gap="$3">
            <BottomSheetTextInput
              placeholder="Enter name"
              value={name}
              onChangeText={setName}
              flex={1}
            />
            <Button
              backgroundColor="$black3"
              borderWidth={0.5}
              borderColor="$borderColor"
              width="auto"
              onPress={() => {
                Keyboard.dismiss();
                setIsOpen(true);
              }}>
              <Text width={30} textAlign="center">
                {selectedIcon}
              </Text>
            </Button>
            <EmojiPicker
              enableCategoryChangeAnimation
              enableCategoryChangeGesture
              enableSearchAnimation
              enableSearchBar
              categoryOrder={[
                'food_drink',
                'activities',
                'symbols',
                'animals_nature',
                'objects',
                'flags',
                'smileys_emotion',
              ]}
              onEmojiSelected={handlePick}
              open={isOpen}
              onClose={() => setIsOpen(false)}
              theme={{
                search: {
                  text: '#fff',
                  placeholder: '#fff',
                  icon: '#fff',
                },
                backdrop: '#16161888',
                knob: stroberiColor,
                container: '#282829',
                header: '#fff',
                skinTonesContainer: '#252427',
                category: {
                  icon: '#fff',
                  iconActive: '#fff',
                  container: '#252427',
                  containerActive: stroberiColor,
                },
              }}
            />
          </View>
        </View>
        <View padding="$4" gap="$2" mb={bottom} mt="auto">
          <Button backgroundColor="$green" onPress={() => handleSave()}>
            {category ? 'Update' : 'Create'} {!category && <PlusCircle size={18} color="white" />}
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const getRandomIcon = () => {
  return spendingCategories[Math.floor(Math.random() * spendingCategories.length)];
};
