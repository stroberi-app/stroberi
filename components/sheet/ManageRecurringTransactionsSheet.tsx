import { useActionSheet } from '@expo/react-native-action-sheet';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { withObservables } from '@nozbe/watermelondb/react';
import { Pen, Plus, Trash2 } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Observable } from 'rxjs';
import { ScrollView, Text, View } from 'tamagui';
import type { CategoryModel } from '../../database/category-model';
import { deleteRecurringTransaction } from '../../database/helpers';
import type { RecurringTransactionModel } from '../../database/recurring-transaction-model';
import useToast from '../../hooks/useToast';
import { DateFormats } from '../../lib/date';
import { formatCurrency } from '../../lib/format';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { Switch } from '../Switch';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './constants';
import { RecurringTransactionFormSheet } from './RecurringTransactionFormSheet';

type RecurringItemProps = {
  recurring: RecurringTransactionModel;
  category?: CategoryModel | null;
  onEdit: (recurring: RecurringTransactionModel) => void;
};

const RecurringItem = withObservables<
  { recurring: RecurringTransactionModel },
  {
    recurring: Observable<RecurringTransactionModel>;
    category?: Observable<CategoryModel | null>;
  }
>(['recurring'], ({ recurring }) => {
  return {
    category: recurring.category?.observe(),
    recurring: recurring.observe(),
  };
})(({ recurring, category, onEdit }: RecurringItemProps) => {
  const { showActionSheetWithOptions } = useActionSheet();
  const toast = useToast();

  const onDelete = () => {
    showActionSheetWithOptions(
      {
        title: 'Are you sure you want to delete this recurring transaction?',
        options: ['Delete', 'Cancel'],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      async (buttonIndex) => {
        if (buttonIndex === 0) {
          try {
            await deleteRecurringTransaction(recurring.id);
            toast.show({
              title: 'Recurring transaction deleted',
              preset: 'done',
            });
          } catch {
            toast.show({
              title: 'Failed to delete recurring transaction',
              preset: 'error',
            });
          }
        }
      }
    );
  };

  const handleToggle = async (_checked: boolean) => {
    try {
      await recurring.toggle();
    } catch {
      toast.show({
        title: 'Failed to toggle recurring transaction',
        preset: 'error',
      });
    }
  };

  const frequencyLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };

  const renderRightAction = (_prog: SharedValue<number>, drag: SharedValue<number>) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 100 }],
        flexDirection: 'row',
      };
    });

    return (
      <Animated.View style={styleAnimation}>
        <View backgroundColor="gray" width={50}>
          <Pressable
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
            onPress={() => {
              onEdit(recurring);
              drag.value = withTiming(0, { duration: 200 });
            }}
            accessibilityLabel="Edit recurring transaction"
            accessibilityRole="button"
          >
            <Pen height={24} width={24} />
          </Pressable>
        </View>
        <View backgroundColor="$stroberiLight" width={50}>
          <Pressable
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
            onPress={() => {
              onDelete();
              drag.value = withTiming(0, { duration: 200 });
            }}
          >
            <Trash2 height={8} width={8} />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  return (
    <ReanimatedSwipeable
      key={recurring.id}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={renderRightAction}
    >
      <View
        flexDirection="row"
        alignItems="center"
        paddingVertical="$3"
        paddingHorizontal="$4"
        gap="$3"
        borderWidth="$0.5"
        borderColor="$borderColor"
      >
        <Text fontSize="$5">{category?.icon ?? '📦'}</Text>
        <View flex={1} flexDirection="column" justifyContent="center">
          <Text fontSize="$5" fontWeight="bold">
            {recurring.merchant || 'Untitled'}
          </Text>
          <Text fontSize="$2" color="gray">
            {frequencyLabels[recurring.frequency]} • Next:{' '}
            {dayjs(recurring.nextDueDate).format(DateFormats.FullMonthFullDay)}
          </Text>
          {recurring.endDate && (
            <Text fontSize="$2" color="gray">
              Until: {dayjs(recurring.endDate).format(DateFormats.FullMonthFullDay)}
            </Text>
          )}
        </View>
        <View alignItems="flex-end" gap="$2" justifyContent="center">
          <Text
            fontSize="$5"
            color={recurring.amount > 0 ? '$greenLight' : '$stroberiLight'}
            fontWeight="bold"
          >
            {formatCurrency(recurring.amount, recurring.currencyCode)}
          </Text>
          <View>
            <Switch checked={recurring.isActive} onCheckedChange={handleToggle}>
              <Switch.Thumb animation="bouncy" />
            </Switch>
          </View>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
});

type RecurringListProps = {
  recurringTransactions: RecurringTransactionModel[];
  onEdit: (recurring: RecurringTransactionModel) => void;
  onCreate: () => void;
  bottomInset: number;
};

const RecurringList = ({
  recurringTransactions,
  onEdit,
  onCreate,
  bottomInset,
}: RecurringListProps) => {
  const { height } = useWindowDimensions();
  return (
    <BottomSheetView>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 8 }}
        style={{ height: height - 260 }}
      >
        {recurringTransactions.length === 0 ? (
          <View paddingVertical="$8" alignItems="center" gap="$3">
            <Text fontSize="$6" color="gray">
              No recurring transactions
            </Text>
            <Text fontSize="$4" color="gray" textAlign="center" paddingHorizontal="$4">
              Set up recurring transactions to automatically track regular expenses and
              income
            </Text>
          </View>
        ) : (
          recurringTransactions.map((recurring) => (
            <RecurringItem key={recurring.id} recurring={recurring} onEdit={onEdit} />
          ))
        )}
      </ScrollView>
      <BottomSheetView
        style={{
          paddingHorizontal: 16,
          paddingBottom: bottomInset + 16,
          paddingTop: 16,
        }}
      >
        <Button
          backgroundColor="$green"
          onPress={onCreate}
          icon={<Plus size={20} color="white" />}
        >
          Add Recurring Transaction
        </Button>
      </BottomSheetView>
    </BottomSheetView>
  );
};

const EnhancedRecurringList = withObservables(
  ['database'],
  ({ database }: { database: Database }) => ({
    recurringTransactions: database.collections
      .get<RecurringTransactionModel>('recurring_transactions')
      .query(Q.sortBy('nextDueDate', Q.asc))
      .observe(),
  })
)(RecurringList);

type ManageRecurringTransactionsSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
};

export const ManageRecurringTransactionsSheet = ({
  sheetRef,
}: ManageRecurringTransactionsSheetProps) => {
  const database = useDatabase();
  const { bottom } = useSafeAreaInsets();
  const formSheetRef = useRef<BottomSheetModal>(null);
  const [editingRecurring, setEditingRecurring] =
    useState<RecurringTransactionModel | null>(null);

  const handleEdit = useCallback((recurring: RecurringTransactionModel) => {
    setEditingRecurring(recurring);
    formSheetRef.current?.present();
  }, []);

  const handleCreate = useCallback(() => {
    setEditingRecurring(null);
    formSheetRef.current?.present();
  }, []);

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={CustomBackdrop}
        stackBehavior="push"
        handleIndicatorStyle={handleIndicatorStyle}
        backgroundStyle={backgroundStyle}
        enableDynamicSizing={false}
      >
        <BottomSheetView
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          <Text fontSize="$7" fontWeight="bold" marginBottom="$3">
            Recurring Transactions
          </Text>
        </BottomSheetView>
        <EnhancedRecurringList
          database={database}
          onEdit={handleEdit}
          onCreate={handleCreate}
          bottomInset={bottom}
        />
      </BottomSheetModal>
      <RecurringTransactionFormSheet
        sheetRef={formSheetRef}
        recurring={editingRecurring}
        onSuccess={() => {
          formSheetRef.current?.dismiss();
          setEditingRecurring(null);
        }}
      />
    </>
  );
};
