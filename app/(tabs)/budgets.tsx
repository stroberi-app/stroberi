import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { PlusCircle } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';
import BudgetsList from '../../components/BudgetsList';
import { LinkButton } from '../../components/button/LinkButton';
import { BudgetFormSheet } from '../../components/sheet/BudgetFormSheet';
import type { BudgetModel } from '../../database/budget-model';
import type { CategoryModel } from '../../database/category-model';
import { parseBudgetInsightRoute } from '../../features/budget/insightRoute';

export default function BudgetsScreen() {
  const params = useLocalSearchParams<{
    openCreate?: string | string[];
    categoryId?: string | string[];
  }>();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const database = useDatabase();
  const budgetFormSheetRef = React.useRef<BottomSheetModal | null>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<BudgetModel | null>(null);
  const [initialCategories, setInitialCategories] = useState<CategoryModel[]>([]);
  const insightRoute = useMemo(
    () =>
      parseBudgetInsightRoute({
        openCreate: params.openCreate,
        categoryId: params.categoryId,
      }),
    [params.categoryId, params.openCreate]
  );

  useEffect(() => {
    if (!insightRoute) return;

    let cancelled = false;
    let presentationFrame: number | null = null;

    const openBudgetForm = async () => {
      const category = insightRoute.categoryId
        ? await database
            .get<CategoryModel>('categories')
            .find(insightRoute.categoryId)
            .catch(() => null)
        : null;

      if (cancelled) return;

      setBudgetToEdit(null);
      setInitialCategories(category ? [category] : []);
      presentationFrame = requestAnimationFrame(() => {
        if (cancelled) return;

        budgetFormSheetRef.current?.present();
        router.setParams({ openCreate: undefined, categoryId: undefined });
      });
    };

    openBudgetForm();

    return () => {
      cancelled = true;
      if (presentationFrame !== null) {
        cancelAnimationFrame(presentationFrame);
      }
    };
  }, [database, insightRoute, router]);

  const handleAddBudget = () => {
    setBudgetToEdit(null);
    setInitialCategories([]);
    budgetFormSheetRef.current?.present();
  };

  const handleEditBudget = (budget: BudgetModel) => {
    setInitialCategories([]);
    setBudgetToEdit(budget);
    budgetFormSheetRef.current?.present();
  };

  const handleSuccess = () => {
    setBudgetToEdit(null);
  };

  return (
    <>
      <View
        paddingTop={top || '$2'}
        flex={1}
        backgroundColor="$bgPrimary"
        paddingHorizontal="$2"
      >
        <View
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginBottom="$4"
        >
          <Text fontSize="$8" fontWeight="bold">
            Budgets
          </Text>
          <LinkButton backgroundColor="$green" onPress={handleAddBudget} spacing="small">
            <PlusCircle size={20} color="white" />
          </LinkButton>
        </View>

        <BudgetsList
          database={database}
          onAdd={handleAddBudget}
          onEdit={handleEditBudget}
        />
      </View>

      <BudgetFormSheet
        sheetRef={budgetFormSheetRef}
        budget={budgetToEdit}
        initialCategories={initialCategories}
        onSuccess={handleSuccess}
      />
    </>
  );
}
