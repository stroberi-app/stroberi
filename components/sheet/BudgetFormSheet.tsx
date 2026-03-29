import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Calendar, FolderOpen, TrendingUp, X } from '@tamagui/lucide-icons';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { combineLatest } from 'rxjs';
import { Input, ScrollView, Text, View, XStack, YGroup } from 'tamagui';
import type { BudgetModel, BudgetPeriod } from '../../database/budget-model';
import type { CategoryModel } from '../../database/category-model';
import { createBudget, updateBudget } from '../../database/actions/budgets';
import type { TransactionModel } from '../../database/transaction-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import useToast from '../../hooks/useToast';
import '../../lib/date';
import {
  calculateBudgetPeriodDates,
  formatBudgetPeriod,
  getBudgetProgressColor,
} from '../../lib/budgetUtils';
import { formatCurrency } from '../../lib/format';
import { BudgetProgress } from '../BudgetProgress';
import { LinkButton } from '../button/LinkButton';
import { CategoriesList } from '../CategoriesList';
import { CreateExpenseItem } from '../CreateExpenseItem';
import { CurrencyInput } from '../CurrencyInput';
import { CustomBackdrop } from '../CustomBackdrop';
import { CheckboxWithLabel } from '../checkbox/CheckBoxWithLabel';
import { DatePicker } from '../DatePicker';
import {
  buildBudgetFormState,
  buildBudgetPayload,
  getDefaultBudgetFormState,
  getStartOfBudgetPeriod,
  parseBudgetAmount,
} from './budgetFormUtils';
import { backgroundStyle, handleIndicatorStyle } from './constants';

const SNAP_POINTS = ['90%'];

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const THRESHOLD_OPTIONS = [
  { value: 75, label: '75%' },
  { value: 80, label: '80%' },
  { value: 90, label: '90%' },
  { value: 95, label: '95%' },
];

const sumTransactions = (transactions: TransactionModel[]) =>
  transactions.reduce((sum, tx) => sum + Math.abs(tx.amountInBaseCurrency), 0);

type BudgetFormSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  budget?: BudgetModel | null;
  onSuccess: () => void;
};

export const BudgetFormSheet = ({
  sheetRef,
  budget,
  onSuccess,
}: BudgetFormSheetProps) => {
  const database = useDatabase();
  const { defaultCurrency } = useDefaultCurrency();
  const toast = useToast();
  const { bottom } = useSafeAreaInsets();
  const periodPickerRef = useRef<BottomSheetModal>(null);
  const thresholdPickerRef = useRef<BottomSheetModal>(null);
  const categoryPickerRef = useRef<BottomSheetModal>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [rollover, setRollover] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(90);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CategoryModel[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [currentSpent, setCurrentSpent] = useState(0);
  const [previousSpent, setPreviousSpent] = useState(0);

  const applyFormState = useCallback(
    (state: Awaited<ReturnType<typeof buildBudgetFormState>>) => {
      setName(state.name);
      setAmount(state.amount);
      setPeriod(state.period);
      setStartDate(state.startDate);
      setRollover(state.rollover);
      setAlertThreshold(state.alertThreshold);
      setSelectedCategories(state.selectedCategories);
    },
    []
  );

  useEffect(() => {
    const loadBudgetData = async () => {
      const nextState = await buildBudgetFormState(budget);
      applyFormState(nextState);
    };

    loadBudgetData();
  }, [applyFormState, budget]);

  const selectedCategoryIds = useMemo(
    () => selectedCategories.map((category) => category.id).sort(),
    [selectedCategories]
  );

  useEffect(() => {
    const periodDates = calculateBudgetPeriodDates({ period, startDate });
    const previousPeriodDates = calculateBudgetPeriodDates({ period, startDate }, -1);

    const buildConditions = (start: Date, end: Date) => {
      const conditions = [
        Q.where('date', Q.gte(start.getTime())),
        Q.where('date', Q.lte(end.getTime())),
        Q.where('amountInBaseCurrency', Q.lt(0)),
      ];

      if (selectedCategoryIds.length > 0) {
        conditions.push(Q.where('categoryId', Q.oneOf(selectedCategoryIds)));
      }

      return conditions;
    };

    const currentTransactionsObservable = database
      .get<TransactionModel>('transactions')
      .query(...buildConditions(periodDates.start, periodDates.end))
      .observeWithColumns(['amountInBaseCurrency', 'categoryId', 'date']);

    if (!rollover) {
      const subscription = currentTransactionsObservable.subscribe((transactions) => {
        setCurrentSpent(sumTransactions(transactions));
        setPreviousSpent(0);
      });

      return () => subscription.unsubscribe();
    }

    const previousTransactionsObservable = database
      .get<TransactionModel>('transactions')
      .query(...buildConditions(previousPeriodDates.start, previousPeriodDates.end))
      .observeWithColumns(['amountInBaseCurrency', 'categoryId', 'date']);

    const subscription = combineLatest([
      currentTransactionsObservable,
      previousTransactionsObservable,
    ]).subscribe(([transactions, previousTransactions]) => {
      setCurrentSpent(sumTransactions(transactions));
      setPreviousSpent(sumTransactions(previousTransactions));
    });

    return () => subscription.unsubscribe();
  }, [database, period, rollover, selectedCategoryIds, startDate]);

  const parsedAmount = useMemo(() => parseBudgetAmount(amount), [amount]);

  const budgetPreview = useMemo(() => {
    if (!parsedAmount) {
      return null;
    }

    const rolloverAmount = rollover ? Math.max(0, parsedAmount - previousSpent) : 0;
    const budgetLimit = parsedAmount + rolloverAmount;
    const percentage = budgetLimit > 0 ? (currentSpent / budgetLimit) * 100 : 0;
    const remaining = budgetLimit - currentSpent;
    const status =
      percentage >= 100
        ? ('exceeded' as const)
        : percentage >= alertThreshold
          ? ('warning' as const)
          : ('ok' as const);

    return {
      spent: currentSpent,
      remaining,
      percentage,
      budgetLimit,
      rolloverAmount,
      status,
    };
  }, [alertThreshold, currentSpent, parsedAmount, previousSpent, rollover]);

  const previewColor = budgetPreview
    ? getBudgetProgressColor(budgetPreview.percentage, alertThreshold)
    : '$gray8';

  const previewTitle = budgetPreview
    ? budgetPreview.status === 'exceeded'
      ? 'Budget exceeded'
      : budgetPreview.status === 'warning'
        ? 'Approaching limit'
        : 'On track'
    : 'Enter an amount';

  const previewMessage = budgetPreview
    ? budgetPreview.status === 'exceeded'
      ? `${formatCurrency(budgetPreview.spent - budgetPreview.budgetLimit, defaultCurrency ?? 'USD')} over the current limit.`
      : budgetPreview.status === 'warning'
        ? `Current spending is close to the ${alertThreshold}% warning threshold.`
        : `${formatCurrency(budgetPreview.remaining, defaultCurrency ?? 'USD')} still available in this period.`
    : 'Add a valid budget amount to see the live status preview.';

  const resetForm = () => {
    const nextState = getDefaultBudgetFormState();
    applyFormState(nextState);
    setCategorySearch('');
  };

  const handleCategorySelect = useCallback((category: CategoryModel) => {
    setSelectedCategories((prev) => {
      const isSelected = prev.some((c) => c.id === category.id);
      if (isSelected) {
        return prev.filter((c) => c.id !== category.id);
      }
      return [...prev, category];
    });
  }, []);

  const handleRemoveCategory = useCallback((categoryId: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c.id !== categoryId));
  }, []);

  const handleSubmit = async () => {
    if (isSaving) return;

    const amountValue = Number(amount);
    if (!amount || !Number.isFinite(amountValue) || amountValue <= 0) {
      toast.show({
        title: 'Invalid Amount',
        message: 'Please enter a valid budget amount',
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildBudgetPayload({
        name,
        amount: amountValue,
        period,
        startDate,
        rollover,
        alertThreshold,
        selectedCategories,
      });

      if (budget) {
        await updateBudget({
          id: budget.id,
          ...payload,
        });
        toast.show({
          title: 'Success',
          message: 'Budget updated successfully',
          preset: 'done',
          haptic: 'success',
        });
      } else {
        await createBudget(payload);
        toast.show({
          title: 'Success',
          message: 'Budget created successfully',
          preset: 'done',
          haptic: 'success',
        });
      }

      setIsSaving(false);
      sheetRef.current?.close();
      onSuccess();
      resetForm();
    } catch (error) {
      setIsSaving(false);
      toast.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save budget',
        preset: 'error',
        haptic: 'error',
      });
    }
  };

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        handleIndicatorStyle={handleIndicatorStyle}
        backdropComponent={CustomBackdrop}
        backgroundStyle={backgroundStyle}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={{ paddingBottom: bottom }}>
          <View
            flexDirection="row"
            alignItems="center"
            paddingHorizontal="$3"
            paddingVertical="$2"
            justifyContent="space-between"
          >
            <Text color="white" fontSize="$6" fontWeight="bold">
              {budget ? 'Edit Budget' : 'Create Budget'}
            </Text>
            <LinkButton
              backgroundColor="$green"
              color="white"
              onPress={handleSubmit}
              disabled={isSaving}
              opacity={isSaving ? 0.6 : 1}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </LinkButton>
          </View>

          <BottomSheetScrollView keyboardShouldPersistTaps="handled">
            <View paddingHorizontal="$3" paddingBottom="$4">
              <View marginTop="$4">
                <Text fontSize="$3" color="$gray10" marginBottom="$2">
                  Budget Amount
                </Text>
                <CurrencyInput
                  value={amount}
                  onChangeText={setAmount}
                  selectedCurrency={defaultCurrency ?? 'USD'}
                  focusOnMount={!budget}
                  onCurrencySelect={() => {}}
                />
              </View>

              <View
                marginTop="$4"
                backgroundColor="$gray3"
                borderWidth={1}
                borderColor="$gray5"
                borderRadius="$4"
                padding="$3"
              >
                <View
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  marginBottom="$2"
                  gap="$2"
                >
                  <Text fontSize="$4" fontWeight="bold">
                    Live Status
                  </Text>
                  <Text color={previewColor} fontSize="$2" fontWeight="600">
                    {previewTitle}
                  </Text>
                </View>
                <Text fontSize="$2" color="$gray10">
                  {previewMessage}
                </Text>

                {budgetPreview && (
                  <>
                    <BudgetProgress
                      marginTop="$3"
                      spent={budgetPreview.spent}
                      budget={budgetPreview.budgetLimit}
                      percentage={budgetPreview.percentage}
                      currency={defaultCurrency ?? 'USD'}
                      color={previewColor}
                    />

                    {rollover && budgetPreview.rolloverAmount > 0 && (
                      <Text fontSize="$2" color="$gray10" marginTop="$2">
                        Includes{' '}
                        {formatCurrency(
                          budgetPreview.rolloverAmount,
                          defaultCurrency ?? 'USD'
                        )}{' '}
                        carried over from the previous {period.slice(0, -2)}.
                      </Text>
                    )}
                  </>
                )}
              </View>

              <View marginTop="$4">
                <Text fontSize="$3" color="$gray10" marginBottom="$2">
                  Budget Name (Optional)
                </Text>
                <Input
                  placeholder={`e.g., ${formatBudgetPeriod(period)} Groceries`}
                  value={name}
                  onChangeText={setName}
                  fontSize="$4"
                  backgroundColor="$gray5"
                  borderWidth={1}
                  borderColor="$borderColor"
                  borderRadius="$4"
                  paddingHorizontal="$3"
                  paddingVertical="$3"
                />
              </View>

              <YGroup bordered marginTop="$4">
                <CreateExpenseItem IconComponent={TrendingUp} label="Period">
                  <LinkButton
                    color="white"
                    onPress={() => {
                      Keyboard.dismiss();
                      periodPickerRef.current?.present();
                    }}
                    disabled={isSaving}
                  >
                    <Text>{formatBudgetPeriod(period)}</Text>
                  </LinkButton>
                </CreateExpenseItem>

                <CreateExpenseItem IconComponent={Calendar} label="Start Date">
                  <DatePicker mode="date" date={startDate} setDate={setStartDate} />
                </CreateExpenseItem>

                <CreateExpenseItem IconComponent={FolderOpen} label="Categories">
                  <LinkButton
                    color="white"
                    onPress={() => {
                      Keyboard.dismiss();
                      categoryPickerRef.current?.present();
                    }}
                    disabled={isSaving}
                  >
                    <Text>
                      {selectedCategories.length === 0
                        ? 'All Categories'
                        : `${selectedCategories.length} selected`}
                    </Text>
                  </LinkButton>
                </CreateExpenseItem>
              </YGroup>

              {selectedCategories.length > 0 && (
                <View marginTop="$3">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <XStack gap="$2" flexWrap="wrap">
                      {selectedCategories.map((category) => (
                        <View
                          key={category.id}
                          flexDirection="row"
                          alignItems="center"
                          backgroundColor="$gray4"
                          paddingHorizontal="$3"
                          paddingVertical="$2"
                          borderRadius="$4"
                          gap="$2"
                        >
                          <Text fontSize="$3">{category.icon}</Text>
                          <Text fontSize="$3" color="white">
                            {category.name}
                          </Text>
                          <Pressable onPress={() => handleRemoveCategory(category.id)}>
                            <X size={14} color="$gray10" />
                          </Pressable>
                        </View>
                      ))}
                    </XStack>
                  </ScrollView>
                </View>
              )}

              <View marginTop="$4">
                <CheckboxWithLabel
                  label="Rollover unused budget"
                  name="rollover"
                  checked={rollover}
                  onCheckedChange={(checked) => {
                    if (typeof checked === 'boolean') {
                      setRollover(checked);
                    }
                  }}
                  disabled={isSaving}
                />
                <Text fontSize="$2" color="$gray9" marginLeft="$8" marginTop="$1">
                  Carry over remaining budget to next period
                </Text>
              </View>

              <View marginTop="$4">
                <View
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Text fontSize="$4" fontWeight="bold">
                    Alert Threshold
                  </Text>
                  <LinkButton
                    color="white"
                    backgroundColor="$gray4"
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    onPress={() => {
                      Keyboard.dismiss();
                      thresholdPickerRef.current?.present();
                    }}
                    disabled={isSaving}
                  >
                    <Text>{alertThreshold}%</Text>
                  </LinkButton>
                </View>
                <Text fontSize="$2" color="$gray9" marginTop="$1">
                  Show warning when spending reaches this percentage
                </Text>
              </View>
            </View>
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={periodPickerRef}
        snapPoints={['40%']}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        handleIndicatorStyle={handleIndicatorStyle}
        backdropComponent={CustomBackdrop}
        backgroundStyle={backgroundStyle}
        stackBehavior="push"
      >
        <BottomSheetView>
          <View paddingHorizontal="$4" paddingVertical="$2">
            <Text fontSize="$6" fontWeight="bold" marginBottom="$3">
              Select Period
            </Text>
            <YGroup gap="$2">
              {PERIOD_OPTIONS.map((option) => (
                <YGroup.Item key={option.value}>
                  <LinkButton
                    width="100%"
                    justifyContent="flex-start"
                    backgroundColor={period === option.value ? '$gray4' : 'transparent'}
                    onPress={() => {
                      setPeriod(option.value);
                      if (!budget) {
                        setStartDate(getStartOfBudgetPeriod(option.value));
                      }
                      periodPickerRef.current?.close();
                    }}
                  >
                    <Text fontSize="$4">{option.label}</Text>
                  </LinkButton>
                </YGroup.Item>
              ))}
            </YGroup>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={thresholdPickerRef}
        snapPoints={['40%']}
        enableDynamicSizing={false}
        stackBehavior="push"
        enablePanDownToClose={true}
        handleIndicatorStyle={handleIndicatorStyle}
        backdropComponent={CustomBackdrop}
        backgroundStyle={backgroundStyle}
      >
        <BottomSheetView>
          <View paddingHorizontal="$4" paddingVertical="$2">
            <Text fontSize="$6" fontWeight="bold" marginBottom="$3">
              Select Threshold
            </Text>
            <YGroup gap="$2">
              {THRESHOLD_OPTIONS.map((option) => (
                <YGroup.Item key={option.value}>
                  <LinkButton
                    width="100%"
                    justifyContent="flex-start"
                    backgroundColor={
                      alertThreshold === option.value ? '$gray4' : 'transparent'
                    }
                    onPress={() => {
                      setAlertThreshold(option.value);
                      thresholdPickerRef.current?.close();
                    }}
                  >
                    <Text fontSize="$4">{option.label}</Text>
                  </LinkButton>
                </YGroup.Item>
              ))}
            </YGroup>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={categoryPickerRef}
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
              <LinkButton
                backgroundColor="$green"
                onPress={() => categoryPickerRef.current?.close()}
              >
                <Text color="white">Done</Text>
              </LinkButton>
            </View>
            <Text fontSize="$2" color="$gray9" marginBottom="$3">
              Leave empty to track all expenses
            </Text>
            <BottomSheetTextInput
              placeholder="Search categories..."
              value={categorySearch}
              onChangeText={setCategorySearch}
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
              search={categorySearch}
              onSelect={handleCategorySelect}
              selectedCategories={selectedCategories}
              preventClose
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};
