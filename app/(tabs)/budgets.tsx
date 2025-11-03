import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { PlusCircle } from '@tamagui/lucide-icons';
import * as React from 'react';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';
import BudgetsList from '../../components/BudgetsList';
import { LinkButton } from '../../components/button/LinkButton';
import { BudgetFormSheet } from '../../components/sheet/BudgetFormSheet';
import type { BudgetModel } from '../../database/budget-model';

export default function BudgetsScreen() {
  const { top } = useSafeAreaInsets();
  const database = useDatabase();
  const budgetFormSheetRef = React.useRef<BottomSheetModal | null>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<BudgetModel | null>(null);

  const handleAddBudget = () => {
    setBudgetToEdit(null);
    budgetFormSheetRef.current?.present();
  };

  const handleEditBudget = (budget: BudgetModel) => {
    setBudgetToEdit(budget);
    budgetFormSheetRef.current?.present();
  };

  const handleSuccess = () => {
    setBudgetToEdit(null);
  };

  return (
    <>
      <View
        style={{ paddingTop: top || 8 }}
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
          <LinkButton
            paddingHorizontal="$3"
            paddingVertical="$2"
            backgroundColor="$green"
            onPress={handleAddBudget}
          >
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
        onSuccess={handleSuccess}
      />
    </>
  );
}
