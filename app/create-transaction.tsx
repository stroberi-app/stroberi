import { Input, Paragraph, Text, TextArea, View, YGroup } from 'tamagui';
import { LinkButton } from '../components/button/LinkButton';
import { CurrencyInput } from '../components/CurrencyInput';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  LayoutGrid,
  MapPin,
  RefreshCw,
  User,
} from '@tamagui/lucide-icons';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import React, { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DatePicker } from '../components/DatePicker';
import { Switch } from '../components/Switch';
import { StyledScrollView } from '../components/StyledScrollView';
import { CreateExpenseItem } from '../components/CreateExpenseItem';
import { CategoryModel } from '../database/category-model';
import { createTransaction, updateTransaction } from '../database/helpers';
import { ManageCategoriesSheet } from '../components/sheet/ManageCategoriesSheet';
import { CurrencySelect } from '../components/CurrencySelect';
import { useDefaultCurrency } from '../hooks/useDefaultCurrency';
import { TransactionModel } from '../database/transaction-model';

function CreateTransaction() {
  const bottomSheetRef = useRef<BottomSheetModal | null>(null);
  const manageCategoriesSheetRef = useRef<BottomSheetModal | null>(null);
  const params = useLocalSearchParams();
  const router = useRouter();

  const transactionType = params.transactionType as 'expense' | 'income';
  const transaction: TransactionModel | null = params.transaction
    ? JSON.parse(params.transaction as string)
    : null;
  const category: CategoryModel | null = params.category
    ? JSON.parse(params.category as string)
    : null;

  const { defaultCurrency } = useDefaultCurrency();

  const [selectedCategory, setSelectedCategory] = useState<CategoryModel | null>(category ?? null);
  const [selectedCurrency, setSelectedCurrency] = useState(transaction?.currencyCode ?? 'USD');
  const [recurring, setRecurring] = useState(false);
  const [location, setLocation] = useState(false);
  const [amount, setAmount] = useState(
    `${transactionType ? (transactionType === 'expense' ? '-' : '') : ''}${transaction?.amount ?? ''}`
  );
  const [note, setNote] = useState(transaction?.note ?? '');
  const [merchantName, setMerchantName] = useState(transaction?.merchant ?? '');
  const [date, setDate] = useState(transaction?.date ? new Date(transaction.date) : new Date());

  const handleSubmit = async () => {
    const payload = {
      merchant: merchantName,
      amount: Number(amount),
      categoryId: selectedCategory?.id ?? null,
      date,
      currencyCode: selectedCurrency,
      note,
    };
    if (transaction) {
      updateTransaction({
        id: transaction.id,
        ...payload,
      }).then(() => {
        router.back();
      });
    } else {
      createTransaction(payload).then(() => {
        router.back();
      });
    }
  };

  useEffect(() => {
    !transaction?.currencyCode && defaultCurrency && setSelectedCurrency(defaultCurrency);
  }, [defaultCurrency, transaction?.currencyCode]);

  return (
    <BottomSheetModalProvider>
      <StyledScrollView>
        <View flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
          <LinkButton
            backgroundColor={'transparent'}
            paddingHorizontal={'$2'}
            color={'gray'}
            onPress={() => router.back()}>
            <ArrowLeft size={20} color={'gray'} />
            Back
          </LinkButton>
          <LinkButton color={'white'} backgroundColor={'$green'} onPress={handleSubmit}>
            Save
          </LinkButton>
        </View>
        <View mt={'$8'}>
          <CurrencyInput
            onCurrencySelect={() => bottomSheetRef.current?.present()}
            selectedCurrency={selectedCurrency}
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <YGroup bordered mt={'$4'}>
          <CreateExpenseItem IconComponent={Calendar} label={'Date'}>
            <DatePicker mode={'date'} date={date} setDate={setDate} />
          </CreateExpenseItem>
          <CreateExpenseItem IconComponent={Clock} label={'Time'}>
            <DatePicker mode={'time'} date={date} setDate={setDate} />
          </CreateExpenseItem>
          <CreateExpenseItem IconComponent={User} label={'Merchant/Payee'}>
            <Input
              placeholder={'Enter merchant name'}
              flex={1}
              fontSize={'$2'}
              value={merchantName}
              onChangeText={setMerchantName}
            />
          </CreateExpenseItem>
          <CreateExpenseItem IconComponent={LayoutGrid} label={'Category'}>
            <LinkButton
              color={'white'}
              onPress={() => {
                manageCategoriesSheetRef.current?.present();
              }}>
              {selectedCategory ? (
                <View flexDirection={'row'} alignItems={'center'} gap={'$2'}>
                  <Text>{selectedCategory.icon}</Text>
                  <Text>{selectedCategory.name} </Text>
                  <ChevronRight color={'white'} size={18} />
                </View>
              ) : (
                <View flexDirection={'row'} alignItems={'center'} gap={'$2'}>
                  <Text>Uncategorized</Text>
                  <ChevronRight color={'white'} size={18} />
                </View>
              )}
            </LinkButton>
          </CreateExpenseItem>
        </YGroup>
        <View mt={'$4'}>
          <TextArea placeholder={'Enter a note'} size={'$5'} value={note} onChangeText={setNote} />
        </View>
        {/*<DocumentPicker />*/}
        <YGroup bordered mt={'$4'}>
          <CreateExpenseItem
            IconComponent={RefreshCw}
            label={'Recurring'}
            bottom={
              recurring && (
                <View>
                  <Paragraph>Configure recurring</Paragraph>
                </View>
              )
            }>
            <Switch id={'recurring'} checked={recurring} onCheckedChange={setRecurring}>
              <Switch.Thumb animation="quicker" />
            </Switch>
          </CreateExpenseItem>
        </YGroup>
        <YGroup bordered mt={'$4'}>
          <CreateExpenseItem
            IconComponent={MapPin}
            label={'Location'}
            bottom={
              location && (
                <View>
                  <Paragraph>Configure location</Paragraph>
                </View>
              )
            }>
            <Switch id={'location'} checked={location} onCheckedChange={setLocation}>
              <Switch.Thumb animation="quicker" />
            </Switch>
          </CreateExpenseItem>
        </YGroup>
      </StyledScrollView>
      <CurrencySelect
        sheetRef={bottomSheetRef}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
      />
      <ManageCategoriesSheet
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sheetRef={manageCategoriesSheetRef}
      />
    </BottomSheetModalProvider>
  );
}

export default CreateTransaction;
