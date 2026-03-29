import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { PlusCircle } from '@tamagui/lucide-icons';
import React, { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmojiPicker from 'rn-emoji-keyboard';
import type { OnEmojiSelected } from 'rn-emoji-keyboard/lib/typescript/contexts/KeyboardContext';
import { Text, useTheme, View } from 'tamagui';
import { spendingCategories } from '../../data/emojis';
import type { CategoryModel } from '../../database/category-model';
import { createCategory, updateCategory } from '../../database/actions/categories';
import useToast from '../../hooks/useToast';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { BottomSheetTextInput } from './BottomSheetTextInput';
import { backgroundStyle, handleIndicatorStyle } from './constants';

type CreateCategorySheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  category?: CategoryModel | null;
  onClose: () => void;
  containerComponent?: React.ComponentType<React.PropsWithChildren>;
};

export const ManageCategoryItemSheet = ({
  sheetRef,
  category,
  onClose,
  containerComponent,
}: CreateCategorySheetProps) => {
  const { stroberi } = useTheme();
  const stroberiColor = stroberi?.get() ?? 'black';
  const toast = useToast();
  const database = useDatabase();
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

  const handlePick: OnEmojiSelected = (emoji) => {
    setSelectedIcon(emoji.emoji);
    setIsOpen(false);
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.show({
        title: 'Missing Name',
        message: 'Category name cannot be empty',
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    const existingCategories = await database
      .get<CategoryModel>('categories')
      .query()
      .fetch();

    const existingDuplicate = existingCategories.find(
      (item) =>
        item.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        item.id !== category?.id
    );

    if (existingDuplicate) {
      toast.show({
        title: 'Duplicate Category',
        message: 'A category with this name already exists',
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    try {
      if (category?.id) {
        await updateCategory({ id: category.id, name: trimmedName, icon: selectedIcon });
        sheetRef.current?.dismiss();
      } else {
        await createCategory({ name: trimmedName, icon: selectedIcon });
        sheetRef.current?.dismiss();
        setName('');
        setSelectedIcon(getRandomIcon());
      }
    } catch (error) {
      toast.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save category',
        preset: 'error',
        haptic: 'error',
      });
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      containerComponent={containerComponent}
      enableContentPanningGesture={false}
      stackBehavior="push"
      enableDynamicSizing={true}
      enablePanDownToClose={true}
      animateOnMount={true}
      onDismiss={onClose}
      enableDismissOnClose={true}
      backdropComponent={CustomBackdrop}
      handleIndicatorStyle={handleIndicatorStyle}
      backgroundStyle={backgroundStyle}
    >
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
              }}
            >
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
            {category ? 'Update' : 'Create'}{' '}
            {!category && <PlusCircle size={18} color="white" />}
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const getRandomIcon = () => {
  return spendingCategories[Math.floor(Math.random() * spendingCategories.length)];
};
