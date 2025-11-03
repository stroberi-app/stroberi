import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Calendar, TrendingUp } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Text, View, YGroup } from 'tamagui';
import type { BudgetModel, BudgetPeriod } from '../../database/budget-model';
import { createBudget, updateBudget } from '../../database/helpers';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import useToast from '../../hooks/useToast';
import '../../lib/date';
import { formatBudgetPeriod } from '../../lib/budgetUtils';
import { Button } from '../button/Button';
import { LinkButton } from '../button/LinkButton';
import { CreateExpenseItem } from '../CreateExpenseItem';
import { CurrencyInput } from '../CurrencyInput';
import { CustomBackdrop } from '../CustomBackdrop';
import { CheckboxWithLabel } from '../checkbox/CheckBoxWithLabel';
import { DatePicker } from '../DatePicker';
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

const getStartOfPeriod = (period: BudgetPeriod): Date => {
  if (period === 'weekly') {
    return dayjs().startOf('week').toDate();
  }
  if (period === 'monthly') {
    return dayjs().startOf('month').toDate();
  }
  if (period === 'yearly') {
    return dayjs().startOf('year').toDate();
  }
  return dayjs().toDate();
};

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
  const { defaultCurrency } = useDefaultCurrency();
  const toast = useToast();
  const { bottom } = useSafeAreaInsets();
  const periodPickerRef = useRef<BottomSheetModal>(null);
  const thresholdPickerRef = useRef<BottomSheetModal>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [rollover, setRollover] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(90);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (budget) {
      setName(budget.name || '');
      setAmount(budget.amount.toString());
      setPeriod(budget.period);
      setStartDate(budget.startDate);
      setRollover(budget.rollover);
      setAlertThreshold(budget.alertThreshold);
    } else {
      setName('');
      setAmount('');
      const defaultPeriod: BudgetPeriod = 'monthly';
      setPeriod(defaultPeriod);
      setStartDate(getStartOfPeriod(defaultPeriod));
      setRollover(false);
      setAlertThreshold(90);
    }
  }, [budget]);

  const resetForm = () => {
    setName('');
    setAmount('');
    const defaultPeriod: BudgetPeriod = 'monthly';
    setPeriod(defaultPeriod);
    setStartDate(getStartOfPeriod(defaultPeriod));
    setRollover(false);
    setAlertThreshold(90);
  };

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
      const payload = {
        name: name.trim() || `${formatBudgetPeriod(period)} Budget`,
        amount: amountValue,
        period,
        startDate,
        rollover,
        alertThreshold,
      };

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
            <Button
              backgroundColor="$green"
              paddingHorizontal="$4"
              paddingVertical="$2"
              onPress={handleSubmit}
              disabled={isSaving}
              opacity={isSaving ? 0.6 : 1}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
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
              </YGroup>

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
                        setStartDate(getStartOfPeriod(option.value));
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
    </>
  );
};
