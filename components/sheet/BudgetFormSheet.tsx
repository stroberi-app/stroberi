import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Calendar, FolderOpen, TrendingUp, X } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, ScrollView, Text, View, XStack, YGroup } from 'tamagui';
import type { BudgetModel, BudgetPeriod } from '../../database/budget-model';
import type { CategoryModel } from '../../database/category-model';
import { createBudget, updateBudget } from '../../database/actions/budgets';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import useToast from '../../hooks/useToast';
import '../../lib/date';
import { formatBudgetPeriod } from '../../lib/budgetUtils';
import { formatCurrency } from '../../lib/format';
import { BudgetProgress } from '../BudgetProgress';
import { LinkButton } from '../button/LinkButton';
import { CreateExpenseItem } from '../CreateExpenseItem';
import { CurrencyInput } from '../CurrencyInput';
import { CustomBackdrop } from '../CustomBackdrop';
import { CheckboxWithLabel } from '../checkbox/CheckBoxWithLabel';
import { DatePicker } from '../DatePicker';
import { BudgetOptionPickerSheet } from './budget/BudgetOptionPickerSheet';
import { useBudgetPreview } from '../../features/budget/useBudgetPreview';
import { registerCategorySelectionHandler } from '../../lib/categorySelectionBridge';
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

type BudgetFormSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  budget?: BudgetModel | null;
  initialCategories?: CategoryModel[];
  onSuccess: () => void;
};

export const BudgetFormSheet = ({
  sheetRef,
  budget,
  initialCategories,
  onSuccess,
}: BudgetFormSheetProps) => {
  const database = useDatabase();
  const router = useRouter();
  const { defaultCurrency } = useDefaultCurrency();
  const toast = useToast();
  const { bottom } = useSafeAreaInsets();
  const periodPickerRef = useRef<BottomSheetModal>(null);
  const thresholdPickerRef = useRef<BottomSheetModal>(null);
  const categorySelectionIdRef = useRef(`budget-${Date.now()}-${Math.random()}`);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [rollover, setRollover] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(90);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CategoryModel[]>([]);

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
      const nextState = await buildBudgetFormState(budget, initialCategories);
      applyFormState(nextState);
    };

    loadBudgetData();
  }, [applyFormState, budget, initialCategories]);

  useEffect(
    () =>
      registerCategorySelectionHandler(categorySelectionIdRef.current, (categories) => {
        if (Array.isArray(categories)) {
          setSelectedCategories(categories);
        }
      }),
    []
  );

  const selectedCategoryIds = useMemo(
    () => selectedCategories.map((category) => category.id).sort(),
    [selectedCategories]
  );

  const parsedAmount = useMemo(() => parseBudgetAmount(amount), [amount]);

  const { budgetPreview, previewColor, previewTitle, previewMessage } = useBudgetPreview({
    database,
    period,
    startDate,
    rollover,
    selectedCategoryIds,
    parsedAmount,
    alertThreshold,
    currency: defaultCurrency ?? 'USD',
  });

  const resetForm = () => {
    const nextState = getDefaultBudgetFormState();
    applyFormState(nextState);
  };

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
        <BottomSheetView style={{ flex: 1 }}>
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

          <BottomSheetScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: bottom + 16 }}
            keyboardShouldPersistTaps="handled"
          >
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

              <YGroup borderWidth={1} borderColor="$borderColor" marginTop="$4">
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
                      router.push({
                        pathname: '/select-category',
                        params: {
                          mode: 'multi',
                          selectionId: categorySelectionIdRef.current,
                          selectedCategoryIds: selectedCategories
                            .map((category) => category.id)
                            .join(','),
                        },
                      });
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

      <BudgetOptionPickerSheet
        sheetRef={periodPickerRef}
        title="Select Period"
        options={PERIOD_OPTIONS}
        selectedValue={period}
        onSelect={(value) => {
          setPeriod(value);
          if (!budget) {
            setStartDate(getStartOfBudgetPeriod(value));
          }
          periodPickerRef.current?.close();
        }}
      />

      <BudgetOptionPickerSheet
        sheetRef={thresholdPickerRef}
        title="Select Threshold"
        options={THRESHOLD_OPTIONS}
        selectedValue={alertThreshold}
        onSelect={(value) => {
          setAlertThreshold(value);
          thresholdPickerRef.current?.close();
        }}
      />

    </>
  );
};
