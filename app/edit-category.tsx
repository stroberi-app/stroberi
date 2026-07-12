import { useDatabase } from '@nozbe/watermelondb/hooks';
import { ArrowLeft, ChevronRight } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable } from 'react-native';
import EmojiPicker from 'rn-emoji-keyboard';
import { Input, ScrollView, Text, View } from 'tamagui';
import { LinkButton } from '../components/button/LinkButton';
import { backgroundStyle } from '../components/sheet/constants';
import {
  getAndroidCategoryIconPresets,
  shouldUseNativeCategoryIconPicker,
} from '../components/sheet/categoryIconPicker';
import type { CategoryModel } from '../database/category-model';
import { createCategory, updateCategory } from '../database/actions/categories';
import { spendingCategories } from '../data/emojis';
import useToast from '../hooks/useToast';

type EditCategoryParams = {
  categoryId?: string | string[];
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getRandomIcon = () =>
  spendingCategories[Math.floor(Math.random() * spendingCategories.length)] ?? '📦';

export default function EditCategoryScreen() {
  const database = useDatabase();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<EditCategoryParams>();
  const categoryId = firstParam(params.categoryId);
  const [category, setCategory] = useState<CategoryModel | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(getRandomIcon);
  const [isSaving, setIsSaving] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const useNativeIconPicker = shouldUseNativeCategoryIconPicker(Platform.OS);
  const androidIconPresets = getAndroidCategoryIconPresets();

  useEffect(() => {
    let isMounted = true;

    const loadCategory = async () => {
      if (!categoryId) {
        return;
      }

      const nextCategory = await database
        .get<CategoryModel>('categories')
        .find(categoryId)
        .catch(() => null);

      if (!isMounted || !nextCategory) {
        return;
      }

      setCategory(nextCategory);
      setName(nextCategory.name);
      setIcon(nextCategory.icon);
    };

    loadCategory();

    return () => {
      isMounted = false;
    };
  }, [categoryId, database]);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    Keyboard.dismiss();
    const trimmedName = name.trim();
    const trimmedIcon = icon.trim() || '📦';

    if (!trimmedName) {
      toast.show({
        title: 'Missing Name',
        message: 'Category name cannot be empty',
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    setIsSaving(true);

    try {
      const existingCategories = await database
        .get<CategoryModel>('categories')
        .query()
        .fetch();

      const duplicate = existingCategories.find(
        (item) =>
          item.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
          item.id !== category?.id
      );

      if (duplicate) {
        toast.show({
          title: 'Duplicate Category',
          message: 'A category with this name already exists',
          preset: 'error',
          haptic: 'error',
        });
        setIsSaving(false);
        return;
      }

      if (category?.id) {
        await updateCategory({ id: category.id, name: trimmedName, icon: trimmedIcon });
      } else {
        await createCategory({ name: trimmedName, icon: trimmedIcon });
      }

      setIsSaving(false);
      router.back();
    } catch (error) {
      setIsSaving(false);
      toast.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save category',
        preset: 'error',
        haptic: 'error',
      });
    }
  };

  return (
    <View flex={1} backgroundColor={backgroundStyle.backgroundColor}>
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3"
        paddingTop="$5"
        marginBottom="$5"
      >
        <LinkButton
          backgroundColor="transparent"
          paddingHorizontal="$2"
          color="gray"
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="gray" />
          Back
        </LinkButton>
        <Text color="white" fontSize="$6" fontWeight="700">
          {category ? 'Edit Category' : 'Create Category'}
        </Text>
        <LinkButton
          backgroundColor="$green"
          color="white"
          onPress={handleSave}
          opacity={isSaving ? 0.6 : 1}
          disabled={isSaving}
        >
          Save
        </LinkButton>
      </View>

      <View paddingHorizontal="$4" gap="$5">
        <View gap="$2">
          <Text color="gray" fontSize="$3">
            Name
          </Text>
          <View
            backgroundColor="$gray3"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$borderColor"
            paddingHorizontal="$4"
          >
            <Input
              backgroundColor="transparent"
              borderWidth={0}
              placeholder="Category name"
              value={name}
              onChangeText={setName}
              autoFocus={!categoryId}
            />
          </View>
        </View>

        <View gap="$2">
          <Text color="gray" fontSize="$3">
            Icon
          </Text>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setIsIconPickerOpen(true);
            }}
          >
            <View
              flexDirection="row"
              alignItems="center"
              gap="$3"
              backgroundColor="$gray3"
              borderRadius="$6"
              borderWidth={1}
              borderColor="$borderColor"
              paddingHorizontal="$4"
              paddingVertical="$3"
            >
              <View
                width={40}
                height={40}
                borderRadius={20}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$gray5"
              >
                <Text fontSize="$6">{icon || '📦'}</Text>
              </View>
              <Text flex={1} fontSize="$5" color="white">
                Tap to change
              </Text>
              <ChevronRight size={18} color="gray" />
            </View>
          </Pressable>

          {!useNativeIconPicker && isIconPickerOpen && (
            <ScrollView
              maxHeight={220}
              keyboardShouldPersistTaps="always"
              borderWidth={1}
              borderColor="$borderColor"
              borderRadius="$6"
              backgroundColor="$gray3"
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                padding: 8,
                gap: 6,
              }}
            >
              {androidIconPresets.map((presetIcon, index) => {
                const isSelected = presetIcon === icon;

                return (
                  <Pressable
                    key={`${presetIcon}-${index}`}
                    onPress={() => {
                      setIcon(presetIcon);
                      setIsIconPickerOpen(false);
                    }}
                    accessibilityLabel={`Use ${presetIcon} as category icon`}
                    accessibilityRole="button"
                  >
                    <View
                      width={42}
                      height={42}
                      borderRadius={21}
                      alignItems="center"
                      justifyContent="center"
                      borderWidth={1.5}
                      borderColor={isSelected ? '$green' : 'transparent'}
                      backgroundColor={isSelected ? '$gray5' : '$gray4'}
                    >
                      <Text fontSize="$7">{presetIcon}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {useNativeIconPicker && (
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
          onEmojiSelected={(emoji) => setIcon(emoji.emoji)}
          open={isIconPickerOpen}
          onClose={() => setIsIconPickerOpen(false)}
          theme={{
            search: {
              text: '#fff',
              placeholder: '#fff',
              icon: '#fff',
            },
            backdrop: '#16161888',
            knob: '#E54B4B',
            container: '#282829',
            header: '#fff',
            skinTonesContainer: '#252427',
            category: {
              icon: '#fff',
              iconActive: '#fff',
              container: '#252427',
              containerActive: '#E54B4B',
            },
          }}
        />
      )}
    </View>
  );
}
