import {
  BottomSheetModalProvider,
  type BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { useActionSheet } from '@expo/react-native-action-sheet';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  LayoutGrid,
  Plane,
  User,
} from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import {
  InteractionManager,
  Keyboard,
  Platform,
  StyleSheet,
  View as RNView,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { Input, Text, TextArea, View, YGroup } from 'tamagui';
import { LinkButton } from '../components/button/LinkButton';
import { CreateExpenseItem } from '../components/CreateExpenseItem';
import { CurrencyInput } from '../components/CurrencyInput';
import { CurrencySelect } from '../components/CurrencySelect';
import { DatePicker } from '../components/DatePicker';
import { StyledScrollView } from '../components/StyledScrollView';
import { ManageCategoriesSheet } from '../components/sheet/ManageCategoriesSheet';
import { TripSelect } from '../components/TripSelect';
import type { CategoryModel } from '../database/category-model';
import { database } from '../database/index';
import {
  createTransaction,
  getActiveTrips,
  updateTransaction,
} from '../database/helpers';
import type { TransactionModel } from '../database/transaction-model';
import type { TripModel } from '../database/trip-model';
import { MissingCurrencyRateError } from '../lib/currencyConversion';
import { useDefaultCurrency } from '../hooks/useDefaultCurrency';
import { useTripsEnabled } from '../hooks/useTripsEnabled';
import useToast from '../hooks/useToast';

const IOSModalOverlayContainer = ({ children }: { children?: ReactNode }) => (
  <FullWindowOverlay>
    <RNView style={StyleSheet.absoluteFill}>{children}</RNView>
  </FullWindowOverlay>
);

const modalContainerComponent = Platform.OS === 'ios' ? IOSModalOverlayContainer : undefined;

function CreateTransaction() {
  const bottomSheetRef = useRef<BottomSheetModal | null>(null);
  const manageCategoriesSheetRef = useRef<BottomSheetModal | null>(null);
  const tripSelectSheetRef = useRef<BottomSheetModal | null>(null);
  const params = useLocalSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { showActionSheetWithOptions } = useActionSheet();

  const transactionType = params.transactionType as 'expense' | 'income' | undefined;
  const transactionId =
    typeof params.transactionId === 'string' ? params.transactionId : null;
  const legacyTransaction = params.transaction
    ? (JSON.parse(params.transaction as string) as TransactionModel)
    : null;
  const legacyCategory = params.category
    ? (JSON.parse(params.category as string) as CategoryModel)
    : null;

  const { defaultCurrency, isDefaultCurrencyLoaded } = useDefaultCurrency();
  const { tripsEnabled } = useTripsEnabled();

  const [transaction, setTransaction] = useState<TransactionModel | null>(
    legacyTransaction ?? null
  );
  const [selectedCategory, setSelectedCategory] = useState<CategoryModel | null>(
    legacyCategory ?? null
  );
  const [selectedTrip, setSelectedTrip] = useState<TripModel | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState(
    transaction?.currencyCode ?? 'USD'
  );
  const [amount, setAmount] = useState(
    `${transactionType ? (transactionType === 'expense' ? '-' : '') : ''}${transaction?.amount ?? ''}`
  );
  const [note, setNote] = useState(transaction?.note ?? '');
  const [merchantName, setMerchantName] = useState(transaction?.merchant ?? '');
  const [date, setDate] = useState(
    legacyTransaction?.date ? new Date(legacyTransaction.date) : new Date()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [amountValidationError, setAmountValidationError] = useState<string | null>(null);

  const presentSheet = (sheetRef: RefObject<BottomSheetModal | null>) => {
    Keyboard.dismiss();
    InteractionManager.runAfterInteractions(() => {
      sheetRef.current?.present();
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadTransactionById = async () => {
      if (!transactionId) {
        return;
      }

      try {
        const transactionRecord = await database
          .get<TransactionModel>('transactions')
          .find(transactionId);
        const categoryRecord = await transactionRecord.category?.fetch();
        const tripRecord = transactionRecord.tripId
          ? await database.get<TripModel>('trips').find(transactionRecord.tripId)
          : null;

        if (!isMounted) {
          return;
        }

        setTransaction(transactionRecord);
        setSelectedCategory(categoryRecord ?? null);
        setSelectedTrip(tripRecord);
        setSelectedCurrency(transactionRecord.currencyCode);
        setAmount(transactionRecord.amount.toString());
        setNote(transactionRecord.note ?? '');
        setMerchantName(transactionRecord.merchant ?? '');
        setDate(new Date(transactionRecord.date));
      } catch (error) {
        console.error('Failed to load transaction details:', error);
      }
    };

    loadTransactionById();

    return () => {
      isMounted = false;
    };
  }, [transactionId]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (amountValidationError) {
      setAmountValidationError(null);
    }
  };

  const handleSubmit = async (allowMissingRate = false) => {
    if (isSaving) {
      return;
    }

    if (!defaultCurrency) {
      toast.show({
        title: 'Error',
        message: 'Default currency not set',
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    const amountValue = Number(amount);
    if (amountValidationError) {
      toast.show({
        title: 'Invalid Amount',
        message: amountValidationError,
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    if (!amount || !Number.isFinite(amountValue) || amountValue === 0) {
      toast.show({
        title: 'Invalid Amount',
        message: 'Please enter a valid amount',
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        merchant: merchantName,
        amount: amountValue,
        categoryId: selectedCategory?.id ?? null,
        date,
        currencyCode: selectedCurrency,
        note,
        baseCurrency: defaultCurrency,
        tripId: selectedTrip?.id ?? null,
        allowMissingRate,
      };

      const savedTransaction = transaction
        ? await updateTransaction({
            id: transaction.id,
            ...payload,
          })
        : await createTransaction(payload);

      if (savedTransaction.conversionStatus === 'stale') {
        toast.show({
          title: 'Rate Warning',
          message:
            'Saved using a stale exchange rate. Update your connection to refresh rates.',
          preset: 'custom',
          haptic: 'warning',
        });
      }

      setIsSaving(false);
      router.back();
    } catch (error) {
      if (error instanceof MissingCurrencyRateError && !allowMissingRate) {
        setIsSaving(false);
        showActionSheetWithOptions(
          {
            title: 'Exchange Rate Unavailable',
            message:
              'No live conversion rate is available right now. Save anyway using 1:1 and mark this transaction for later review?',
            options: ['Save Anyway', 'Cancel'],
            cancelButtonIndex: 1,
          },
          (buttonIndex) => {
            if (buttonIndex === 0) {
              handleSubmit(true);
            }
          }
        );
        return;
      }

      setIsSaving(false);
      toast.show({
        title: 'Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to save transaction. Please try again.',
        preset: 'error',
        haptic: 'error',
      });
    }
  };

  const handleTripSelect = (trip: TripModel | null) => {
    setSelectedTrip(trip);
    // Auto-select trip's preferred currency if available
    if (trip?.currencyCode) {
      setSelectedCurrency(trip.currencyCode);
    }
  };

  // Auto-populate with active trip when creating a new transaction
  useEffect(() => {
    const loadActiveTrip = async () => {
      // Only for new transactions (not editing) and if trips are enabled
      if (!transaction && !transactionId && tripsEnabled) {
        try {
          const activeTrips = await getActiveTrips();
          // Find most recent active trip (not archived, end date null or in future)
          const now = Date.now();
          const currentTrip = activeTrips.find(
            (t) => !t.isArchived && (!t.endDate || t.endDate.getTime() >= now)
          );
          if (currentTrip) {
            setSelectedTrip(currentTrip);
            if (currentTrip.currencyCode) {
              setSelectedCurrency(currentTrip.currencyCode);
            }
          }
        } catch (error) {
          console.error('Failed to load active trip:', error);
        }
      }
    };
    loadActiveTrip();
  }, [transaction, transactionId, tripsEnabled]);

  useEffect(() => {
    !transaction?.currencyCode && defaultCurrency && setSelectedCurrency(defaultCurrency);
  }, [defaultCurrency, transaction?.currencyCode]);

  useEffect(() => {
    if (isDefaultCurrencyLoaded && !defaultCurrency) {
      bottomSheetRef.current?.present();
    }
  }, [defaultCurrency, isDefaultCurrencyLoaded]);

  return (
    <BottomSheetModalProvider>
      <StyledScrollView keyboardShouldPersistTaps="always">
        <View flexDirection="row" justifyContent="space-between" alignItems="center">
          <LinkButton
            backgroundColor="transparent"
            paddingHorizontal="$2"
            color="gray"
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <ArrowLeft size={20} color="gray" />
            Back
          </LinkButton>
          <LinkButton
            color="white"
            backgroundColor="$green"
            onPress={() => handleSubmit(false)}
            disabled={isSaving || !defaultCurrency}
            opacity={isSaving || !defaultCurrency ? 0.6 : 1}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </LinkButton>
        </View>
        {!defaultCurrency && (
          <View
            mt="$3"
            mb="$1"
            padding="$2"
            borderRadius="$3"
            backgroundColor="$gray3"
            borderColor="$yellow"
            borderWidth={1}
          >
            <Text color="$yellow" fontSize="$2">
              Set your default currency to continue.
            </Text>
          </View>
        )}
        <View mt="$8">
          <CurrencyInput
            onCurrencySelect={() => {
              presentSheet(bottomSheetRef);
            }}
            selectedCurrency={selectedCurrency}
            value={amount}
            onChangeText={handleAmountChange}
            focusOnMount={!transaction}
            onValidationError={setAmountValidationError}
          />
        </View>

        <YGroup bordered mt="$4">
          <CreateExpenseItem IconComponent={Calendar} label="Date">
            <DatePicker mode="date" date={date} setDate={setDate} />
          </CreateExpenseItem>
          <CreateExpenseItem IconComponent={Clock} label="Time">
            <DatePicker mode="time" date={date} setDate={setDate} />
          </CreateExpenseItem>
          <CreateExpenseItem IconComponent={User} label="Merchant/Payee">
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
                presentSheet(manageCategoriesSheetRef);
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
          {tripsEnabled && (
            <CreateExpenseItem IconComponent={Plane} label="Trip">
              <LinkButton
                color="white"
                onPress={() => {
                  presentSheet(tripSelectSheetRef);
                }}
              >
                {selectedTrip ? (
                  <View flexDirection="row" alignItems="center" gap="$2">
                    <Text>{selectedTrip.icon}</Text>
                    <Text>{selectedTrip.name}</Text>
                    <ChevronRight color="white" size={18} />
                  </View>
                ) : (
                  <View flexDirection="row" alignItems="center" gap="$2">
                    <Text>No Trip</Text>
                    <ChevronRight color="white" size={18} />
                  </View>
                )}
              </LinkButton>
            </CreateExpenseItem>
          )}
        </YGroup>
        <View mt="$4">
          <TextArea
            placeholder="Enter a note"
            size="$5"
            value={note}
            onChangeText={setNote}
          />
        </View>
      </StyledScrollView>
      <CurrencySelect
        sheetRef={bottomSheetRef}
        containerComponent={modalContainerComponent}
        onSelect={(currency) => {
          setSelectedCurrency(currency.code);
          bottomSheetRef.current?.close();
        }}
        selectedCurrency={selectedCurrency}
      />
      <ManageCategoriesSheet
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sheetRef={manageCategoriesSheetRef}
        containerComponent={modalContainerComponent}
      />
      <TripSelect
        sheetRef={tripSelectSheetRef}
        selectedTrip={selectedTrip}
        onSelect={handleTripSelect}
        containerComponent={modalContainerComponent}
      />
    </BottomSheetModalProvider>
  );
}

export default CreateTransaction;
