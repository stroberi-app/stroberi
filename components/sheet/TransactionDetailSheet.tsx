import { useActionSheet } from '@expo/react-native-action-sheet';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { withObservables } from '@nozbe/watermelondb/react';
import { Pen, RefreshCw, Trash2 } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Observable } from 'rxjs';
import { Text, View, XStack } from 'tamagui';
import { deleteTransaction } from '../../database/actions/transactions';
import type { CategoryModel } from '../../database/category-model';
import type { TransactionModel } from '../../database/transaction-model';
import { DateFormats } from '../../lib/date';
import { formatCurrency } from '../../lib/format';
import type { TripModel } from '../../database/trip-model';
import { Button } from '../button/Button';
import { CustomBackdrop } from '../CustomBackdrop';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './constants';
import { getConversionStatusChip, shouldShowConversionBlock } from './transactionDetail';

export interface TransactionDetailSheetRef {
  present: (transaction: TransactionModel) => void;
  dismiss: () => void;
}

type DetailRowProps = {
  label: string;
  value: string;
};

const DetailRow = ({ label, value }: DetailRowProps) => (
  <XStack justifyContent="space-between" alignItems="flex-start" gap="$4">
    <Text fontSize="$3" color="$gray11">
      {label}
    </Text>
    <Text fontSize="$3" color="white" flexShrink={1} textAlign="right">
      {value}
    </Text>
  </XStack>
);

const Section = ({ children }: { children: React.ReactNode }) => (
  <View
    backgroundColor="$bgSecondary"
    borderRadius="$4"
    padding="$3"
    gap="$2"
    borderWidth={1}
    borderColor="$borderColor"
  >
    {children}
  </View>
);

type DetailContentProps = {
  transaction: TransactionModel;
  category?: CategoryModel | null;
  trip?: TripModel | null;
  onEdit: () => void;
  onDelete: () => void;
};

const DetailContent = ({
  transaction,
  category,
  trip,
  onEdit,
  onDelete,
}: DetailContentProps) => {
  const { bottom } = useSafeAreaInsets();

  const showConversion = shouldShowConversionBlock(
    transaction.currencyCode,
    transaction.baseCurrencyCode
  );
  const statusChip = showConversion
    ? getConversionStatusChip(transaction.conversionStatus)
    : null;
  const showDetails = Boolean(transaction.merchant) || Boolean(transaction.note);

  return (
    <BottomSheetScrollView
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: bottom + 24,
      }}
    >
      <View gap="$4">
        {/* Header */}
        <Section>
          <XStack alignItems="center" gap="$3">
            <Text fontSize="$7">{category?.icon ?? '📦'}</Text>
            <View flex={1}>
              <Text fontSize="$6" fontWeight="bold" color="white">
                {category?.name ?? 'Uncategorized'}
              </Text>
              <Text fontSize="$3" color="$gray11">
                {dayjs(transaction.date).format(DateFormats.FullMonthFullDayTime)}
              </Text>
            </View>
            <Text
              fontSize="$7"
              fontWeight="bold"
              color={transaction.amount > 0 ? '$greenLight' : '$stroberiLight'}
            >
              {formatCurrency(transaction.amount, transaction.currencyCode)}
            </Text>
          </XStack>
        </Section>

        {/* Details */}
        {showDetails && (
          <Section>
            {transaction.merchant && (
              <DetailRow label="Merchant" value={transaction.merchant} />
            )}
            {transaction.note && <DetailRow label="Note" value={transaction.note} />}
          </Section>
        )}

        {/* Currency conversion */}
        {showConversion && (
          <Section>
            <DetailRow
              label="Original amount"
              value={formatCurrency(transaction.amount, transaction.currencyCode)}
            />
            <DetailRow
              label="Base amount"
              value={formatCurrency(
                transaction.amountInBaseCurrency,
                transaction.baseCurrencyCode
              )}
            />
            <DetailRow label="Exchange rate" value={String(transaction.exchangeRate)} />
            {statusChip && (
              <XStack
                alignSelf="flex-start"
                backgroundColor={statusChip.tone === 'error' ? '$red2' : '$orange2'}
                borderColor={statusChip.tone === 'error' ? '$red8' : '$orange8'}
                borderWidth={1}
                borderRadius="$2"
                paddingHorizontal="$2"
                paddingVertical="$1"
              >
                <Text
                  fontSize="$2"
                  color={statusChip.tone === 'error' ? '$red10' : '$orange10'}
                >
                  {statusChip.label}
                </Text>
              </XStack>
            )}
          </Section>
        )}

        {/* Trip */}
        {trip && (
          <Section>
            <XStack alignItems="center" gap="$3">
              <Text fontSize="$5">{trip.icon}</Text>
              <Text fontSize="$4" color="white">
                {trip.name}
              </Text>
            </XStack>
          </Section>
        )}

        {/* Meta */}
        <Section>
          {transaction.recurringTransactionId && (
            <XStack alignItems="center" gap="$2">
              <RefreshCw size={14} color="$blue10" />
              <Text fontSize="$3" color="$blue10">
                Recurring transaction
              </Text>
            </XStack>
          )}
          <DetailRow
            label="Created"
            value={dayjs(transaction.createdAt).format(DateFormats.FullMonthFullDayTime)}
          />
          <DetailRow
            label="Updated"
            value={dayjs(transaction.updatedAt).format(DateFormats.FullMonthFullDayTime)}
          />
        </Section>

        {/* Actions */}
        <XStack gap="$3" mt="$2">
          <Button
            flex={1}
            backgroundColor="$gray4"
            onPress={onEdit}
            icon={<Pen size={16} />}
          >
            Edit
          </Button>
          <Button
            flex={1}
            backgroundColor="$stroberi"
            color="white"
            onPress={onDelete}
            icon={<Trash2 size={16} />}
          >
            Delete
          </Button>
        </XStack>
      </View>
    </BottomSheetScrollView>
  );
};

const ObservedDetailContent = withObservables<
  { transaction: TransactionModel },
  {
    transaction: Observable<TransactionModel>;
    category?: Observable<CategoryModel | null>;
    trip?: Observable<TripModel | null>;
  }
>(['transaction'], ({ transaction }) => ({
  transaction: transaction.observe(),
  category: transaction.category?.observe(),
  trip: transaction.trip?.observe(),
}))(DetailContent);

export const TransactionDetailSheet = forwardRef<TransactionDetailSheetRef>(
  (_props, ref) => {
    const sheetRef = useRef<BottomSheetModal>(null);
    const router = useRouter();
    const { showActionSheetWithOptions } = useActionSheet();
    const [transaction, setTransaction] = useState<TransactionModel | null>(null);

    useImperativeHandle(ref, () => ({
      present: (nextTransaction: TransactionModel) => {
        setTransaction(nextTransaction);
        sheetRef.current?.present();
      },
      dismiss: () => {
        sheetRef.current?.dismiss();
      },
    }));

    const onEdit = () => {
      if (!transaction) return;
      const transactionId = transaction.id;
      sheetRef.current?.dismiss();
      router.push({
        pathname: '/create-transaction',
        params: {
          transactionId,
        },
      });
    };

    const onDelete = () => {
      if (!transaction) return;
      const transactionId = transaction.id;
      showActionSheetWithOptions(
        {
          title: 'Are you sure you want to delete this transaction?',
          options: ['Delete', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            await deleteTransaction(transactionId);
            sheetRef.current?.dismiss();
          }
        }
      );
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        stackBehavior="push"
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        backdropComponent={CustomBackdrop}
        handleIndicatorStyle={handleIndicatorStyle}
        backgroundStyle={backgroundStyle}
        onDismiss={() => {
          setTransaction(null);
        }}
      >
        {transaction && (
          <ObservedDetailContent
            transaction={transaction}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </BottomSheetModal>
    );
  }
);
