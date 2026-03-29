import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {
  Calendar,
  ChevronRight,
  LayoutGrid,
  RefreshCw,
  User,
} from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Text, View, YGroup } from 'tamagui';
import type { CategoryModel } from '../../database/category-model';
import {
  createRecurringTransaction,
  updateRecurringTransaction,
} from '../../database/actions/recurring-transactions';
import type {
  RecurringFrequency,
  RecurringTransactionModel,
} from '../../database/recurring-transaction-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import useToast from '../../hooks/useToast';
import { Button } from '../button/Button';
import { LinkButton } from '../button/LinkButton';
import { CreateExpenseItem } from '../CreateExpenseItem';
import { CurrencyInput } from '../CurrencyInput';
import { CurrencySelect } from '../CurrencySelect';
import { CustomBackdrop } from '../CustomBackdrop';
import { CheckboxWithLabel } from '../checkbox/CheckBoxWithLabel';
import { DatePicker } from '../DatePicker';
import {
  buildRecurringTransactionFormState,
  buildRecurringTransactionPayload,
  getDefaultRecurringTransactionFormState,
  getNextRecurringOccurrences,
  validateRecurringTransactionForm,
} from './recurringTransactionFormUtils';
import { backgroundStyle, handleIndicatorStyle } from './constants';
import { ManageCategoriesSheet } from './ManageCategoriesSheet';

const SNAP_POINTS = ['90%'];

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

type RecurringTransactionFormSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  recurring?: RecurringTransactionModel | null;
  onSuccess: () => void;
};

export const RecurringTransactionFormSheet = ({
  sheetRef,
  recurring,
  onSuccess,
}: RecurringTransactionFormSheetProps) => {
  const { defaultCurrency } = useDefaultCurrency();
  const toast = useToast();
  const { bottom } = useSafeAreaInsets();
  const manageCategoriesSheetRef = useRef<BottomSheetModal | null>(null);
  const currencySheetRef = useRef<BottomSheetModal | null>(null);
  const frequencySheetRef = useRef<BottomSheetModal | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<CategoryModel | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency ?? 'USD');
  const [amount, setAmount] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState(dayjs().add(1, 'year').toDate());
  const [isSaving, setIsSaving] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');

  const applyFormState = useCallback(
    (state: Awaited<ReturnType<typeof buildRecurringTransactionFormState>>) => {
      setMerchantName(state.merchantName);
      setAmount(state.amount);
      setTransactionType(state.transactionType);
      setSelectedCurrency(state.selectedCurrency);
      setFrequency(state.frequency);
      setStartDate(state.startDate);
      setHasEndDate(state.hasEndDate);
      setEndDate(state.endDate);
      setSelectedCategory(state.selectedCategory);
    },
    []
  );

  useEffect(() => {
    const loadState = async () => {
      const nextState = await buildRecurringTransactionFormState(
        recurring,
        defaultCurrency
      );
      applyFormState(nextState);
    };

    loadState();
  }, [applyFormState, defaultCurrency, recurring]);

  const resetForm = useCallback(() => {
    applyFormState(getDefaultRecurringTransactionFormState(defaultCurrency));
  }, [applyFormState, defaultCurrency]);

  const handleSubmit = async () => {
    if (isSaving) return;

    const validationMessage = validateRecurringTransactionForm({
      amount,
      hasEndDate,
      endDate,
      startDate,
    });
    if (validationMessage === 'Please enter a valid amount') {
      toast.show({
        title: 'Invalid Amount',
        message: validationMessage,
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    if (validationMessage) {
      toast.show({
        title: 'Invalid Date Range',
        message: validationMessage,
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildRecurringTransactionPayload({
        amount,
        category: selectedCategory,
        currencyCode: selectedCurrency,
        endDate,
        frequency,
        hasEndDate,
        merchantName,
        startDate,
        transactionType,
      });

      if (recurring) {
        await updateRecurringTransaction({
          id: recurring.id,
          ...payload,
        });
        toast.show({
          title: 'Recurring transaction updated',
          preset: 'done',
        });
      } else {
        await createRecurringTransaction(payload);
        toast.show({
          title: 'Recurring transaction created',
          preset: 'done',
        });
        resetForm();
      }

      setIsSaving(false);
      onSuccess();
    } catch (error) {
      setIsSaving(false);
      toast.show({
        title: 'Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to save recurring transaction. Please try again.',
        preset: 'error',
        haptic: 'error',
      });
    }
  };

  const frequencyLabel =
    FREQUENCY_OPTIONS.find((opt) => opt.value === frequency)?.label ?? 'Monthly';
  const nextOccurrences = useMemo(
    () =>
      getNextRecurringOccurrences({
        endDate,
        frequency,
        hasEndDate,
        startDate,
      }),
    [endDate, frequency, hasEndDate, startDate]
  );

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
        backdropComponent={CustomBackdrop}
        stackBehavior="push"
        handleIndicatorStyle={handleIndicatorStyle}
        backgroundStyle={backgroundStyle}
        enableDynamicSizing={false}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View mt="$4" mb="$3">
            <View
              flexDirection="row"
              backgroundColor="$bgSecondary"
              borderRadius="$4"
              padding="$1"
              gap="$1"
            >
              <View
                backgroundColor={
                  transactionType === 'expense' ? '$stroberi' : 'transparent'
                }
                borderRadius="$3"
                flex={1}
                onPress={() => setTransactionType('expense')}
                paddingVertical="$3"
                paddingHorizontal="$4"
                alignItems="center"
                pressStyle={{ opacity: 0.8 }}
              >
                <Text
                  fontSize="$4"
                  fontWeight="600"
                  color={transactionType === 'expense' ? 'white' : 'gray'}
                >
                  Expense
                </Text>
              </View>
              <View
                backgroundColor={transactionType === 'income' ? '$green' : 'transparent'}
                borderRadius="$3"
                flex={1}
                onPress={() => setTransactionType('income')}
                paddingVertical="$3"
                paddingHorizontal="$4"
                alignItems="center"
                pressStyle={{ opacity: 0.8 }}
              >
                <Text
                  fontSize="$4"
                  fontWeight="600"
                  color={transactionType === 'income' ? 'white' : 'gray'}
                >
                  Income
                </Text>
              </View>
            </View>
          </View>

          <View mt="$2">
            <CurrencyInput
              onCurrencySelect={() => {
                Keyboard.dismiss();
                currencySheetRef.current?.present();
              }}
              selectedCurrency={selectedCurrency}
              value={amount}
              onChangeText={setAmount}
              focusOnMount={!recurring}
            />
          </View>

          <YGroup bordered mt="$4">
            <CreateExpenseItem IconComponent={User} label="Merchant/Description">
              <Input
                placeholder="Enter merchant name"
                flex={1}
                fontSize="$2"
                value={merchantName}
                onChangeText={setMerchantName}
              />
            </CreateExpenseItem>
            <CreateExpenseItem IconComponent={LayoutGrid} label="Category">
              <LinkButton
                color="white"
                onPress={() => {
                  Keyboard.dismiss();
                  manageCategoriesSheetRef.current?.present();
                }}
              >
                {selectedCategory ? (
                  <View flexDirection="row" alignItems="center" gap="$2">
                    <Text>{selectedCategory.icon}</Text>
                    <Text>{selectedCategory.name} </Text>
                    <ChevronRight color="white" size={18} />
                  </View>
                ) : (
                  <View flexDirection="row" alignItems="center" gap="$2">
                    <Text>Uncategorized</Text>
                    <ChevronRight color="white" size={18} />
                  </View>
                )}
              </LinkButton>
            </CreateExpenseItem>
            <CreateExpenseItem IconComponent={RefreshCw} label="Frequency">
              <LinkButton
                color="white"
                onPress={() => {
                  Keyboard.dismiss();
                  frequencySheetRef.current?.present();
                }}
              >
                <View flexDirection="row" alignItems="center" gap="$2">
                  <Text>{frequencyLabel}</Text>
                  <ChevronRight color="white" size={18} />
                </View>
              </LinkButton>
            </CreateExpenseItem>
            <CreateExpenseItem IconComponent={Calendar} label="Start Date">
              <DatePicker mode="date" date={startDate} setDate={setStartDate} />
            </CreateExpenseItem>
          </YGroup>

          <View mt="$4" paddingHorizontal="$2">
            <CheckboxWithLabel
              name="hasEndDate"
              label="Set End Date"
              checked={hasEndDate}
              onCheckedChange={(checked) => setHasEndDate(checked === true)}
            />
          </View>

          {hasEndDate && (
            <YGroup bordered mt="$3">
              <CreateExpenseItem IconComponent={Calendar} label="End Date">
                <DatePicker mode="date" date={endDate} setDate={setEndDate} />
              </CreateExpenseItem>
            </YGroup>
          )}

          <View mt="$4" padding="$3" backgroundColor="$bgSecondary" borderRadius="$4">
            <Text fontSize="$4" fontWeight="bold" marginBottom="$2">
              Next {nextOccurrences.length} Occurrences:
            </Text>
            {nextOccurrences.map((date, index) => (
              <Text key={index} fontSize="$3" color="gray">
                {index + 1}. {dayjs(date).format('MMMM D, YYYY')}
              </Text>
            ))}
          </View>

          <View mt="$4" gap="$3">
            <Button
              backgroundColor="$green"
              onPress={handleSubmit}
              disabled={isSaving}
              opacity={isSaving ? 0.6 : 1}
            >
              {isSaving ? 'Saving...' : recurring ? 'Update' : 'Create'}
            </Button>
            <Button
              backgroundColor="gray"
              onPress={() => {
                sheetRef.current?.dismiss();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <CurrencySelect
        sheetRef={currencySheetRef}
        onSelect={(currency) => {
          setSelectedCurrency(currency.code);
          currencySheetRef.current?.close();
        }}
        selectedCurrency={selectedCurrency}
      />
      <ManageCategoriesSheet
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sheetRef={manageCategoriesSheetRef}
      />
      <BottomSheetModal
        ref={frequencySheetRef}
        snapPoints={['40%']}
        backdropComponent={CustomBackdrop}
        stackBehavior="push"
        handleIndicatorStyle={handleIndicatorStyle}
        backgroundStyle={backgroundStyle}
      >
        <BottomSheetView
          style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: bottom + 16 }}
        >
          <Text fontSize="$6" fontWeight="bold" marginBottom="$4" color="white">
            Select Frequency
          </Text>
          <View gap="$2" flexWrap="wrap" flexDirection="column">
            {FREQUENCY_OPTIONS.map((option) => (
              <LinkButton
                color="white"
                key={option.value}
                onPress={() => {
                  setFrequency(option.value);
                  frequencySheetRef.current?.dismiss();
                }}
                backgroundColor={
                  frequency === option.value ? '$bgSecondary' : 'transparent'
                }
              >
                {option.label}
              </LinkButton>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};
