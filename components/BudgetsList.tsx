import { Q, type Database } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { PlusCircle, Wallet } from '@tamagui/lucide-icons';
import type { Observable } from 'rxjs';
import { ScrollView, Text, View } from 'tamagui';
import type { BudgetModel } from '../database/budget-model';
import { BudgetItem } from './BudgetItem';
import { LinkButton } from './button/LinkButton';

type BudgetsListProps = {
  budgets: BudgetModel[];
  onAdd: () => void;
  onEdit: (budget: BudgetModel) => void;
};

const BudgetsList = ({ budgets, onAdd, onEdit }: BudgetsListProps) => {
  if (budgets.length === 0) {
    return (
      <View
        flex={1}
        justifyContent="center"
        alignItems="center"
        paddingHorizontal="$6"
        paddingVertical="$8"
      >
        <View
          backgroundColor="$gray3"
          borderRadius="$8"
          padding="$4"
          marginBottom="$4"
          width={80}
          height={80}
          justifyContent="center"
          alignItems="center"
        >
          <Wallet size={40} color="$gray10" />
        </View>

        <Text
          fontSize="$7"
          fontWeight="bold"
          color="white"
          marginBottom="$3"
          textAlign="center"
        >
          No Budgets Yet
        </Text>

        <Text
          fontSize="$4"
          color="$gray10"
          marginBottom="$2"
          textAlign="center"
          lineHeight={22}
        >
          Take control of your spending by setting budgets
        </Text>

        <Text
          fontSize="$3"
          color="$gray9"
          marginBottom="$6"
          textAlign="center"
          lineHeight={20}
        >
          Create weekly, monthly, or yearly budgets to track your expenses and stay on
          target
        </Text>

        <LinkButton
          backgroundColor="$green"
          paddingHorizontal="$6"
          paddingVertical="$3.5"
          borderRadius="$4"
          onPress={onAdd}
        >
          <PlusCircle size={20} color="white" />
          <Text color="white" fontWeight="bold" fontSize="$4">
            Create Your First Budget
          </Text>
        </LinkButton>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {budgets.map((budget) => (
        <BudgetItem key={budget.id} budget={budget} onEdit={onEdit} />
      ))}
      <View height={100} />
    </ScrollView>
  );
};

const enhance = withObservables<
  { database: Database; onAdd: () => void; onEdit: (budget: BudgetModel) => void },
  { budgets: Observable<BudgetModel[]> }
>(['database'], ({ database }) => ({
  budgets: database
    .get<BudgetModel>('budgets')
    .query(Q.sortBy('created_at', Q.desc))
    .observe(),
}));

export default enhance(BudgetsList);
