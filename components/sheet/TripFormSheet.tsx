import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Calendar, DollarSign, Smile } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Text, View, YGroup } from 'tamagui';
import type { TripModel } from '../../database/trip-model';
import {
  createTrip,
  updateTrip,
  deleteTrip,
  toggleTripArchive,
} from '../../database/helpers';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import useToast from '../../hooks/useToast';
import { LinkButton } from '../button/LinkButton';
import { CreateExpenseItem } from '../CreateExpenseItem';
import { CurrencySelect } from '../CurrencySelect';
import { CustomBackdrop } from '../CustomBackdrop';
import { DatePicker } from '../DatePicker';
import { backgroundStyle, handleIndicatorStyle } from './constants';

const SNAP_POINTS = ['80%'];

const TRIP_ICONS = [
  '✈️',
  '🏖️',
  '🏔️',
  '🌴',
  '🗼',
  '🏯',
  '🎡',
  '🚗',
  '🚢',
  '🏕️',
  '🎿',
  '🏝️',
  '🌍',
  '🗽',
  '🎭',
  '🎪',
  '🏨',
  '🛫',
  '🚂',
  '⛺',
  '🎒',
  '🧳',
  '🗺️',
  '🌅',
];

type TripFormSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  trip?: TripModel | null;
  onSuccess: () => void;
};

export const TripFormSheet = ({ sheetRef, trip, onSuccess }: TripFormSheetProps) => {
  const toast = useToast();
  const { bottom } = useSafeAreaInsets();
  const { defaultCurrency } = useDefaultCurrency();
  const iconPickerRef = useRef<BottomSheetModal>(null);
  const currencySheetRef = useRef<BottomSheetModal>(null);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✈️');
  const [currencyCode, setCurrencyCode] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (trip) {
      setName(trip.name);
      setIcon(trip.icon);
      setCurrencyCode(trip.currencyCode);
      setStartDate(trip.startDate);
      setEndDate(trip.endDate);
      setHasEndDate(!!trip.endDate);
    } else {
      resetForm();
    }
  }, [trip]);

  const resetForm = () => {
    setName('');
    setIcon('✈️');
    setCurrencyCode(null);
    setStartDate(new Date());
    setEndDate(null);
    setHasEndDate(false);
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    if (!name.trim()) {
      toast.show({
        title: 'Missing Name',
        message: 'Please enter a trip name',
        preset: 'error',
        haptic: 'error',
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: name.trim(),
        icon,
        currencyCode,
        startDate,
        endDate: hasEndDate ? endDate : null,
      };

      if (trip) {
        await updateTrip({
          id: trip.id,
          ...payload,
        });
        toast.show({
          title: 'Success',
          message: 'Trip updated successfully',
          preset: 'done',
          haptic: 'success',
        });
      } else {
        await createTrip(payload);
        toast.show({
          title: 'Success',
          message: 'Trip created successfully',
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
        message: error instanceof Error ? error.message : 'Failed to save trip',
        preset: 'error',
        haptic: 'error',
      });
    }
  };

  const handleDelete = async () => {
    if (!trip || isSaving) return;

    setIsSaving(true);
    try {
      await deleteTrip(trip.id);
      toast.show({
        title: 'Deleted',
        message: 'Trip deleted successfully',
        preset: 'done',
        haptic: 'success',
      });
      setIsSaving(false);
      sheetRef.current?.close();
      onSuccess();
      resetForm();
    } catch (error) {
      setIsSaving(false);
      toast.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete trip',
        preset: 'error',
        haptic: 'error',
      });
    }
  };

  const handleArchive = async () => {
    if (!trip || isSaving) return;

    setIsSaving(true);
    try {
      await toggleTripArchive(trip.id);
      const archiveMessage = trip.isArchived ? 'unarchived' : 'archived';
      toast.show({
        title: trip.isArchived ? 'Unarchived' : 'Archived',
        message: `Trip ${archiveMessage} successfully`,
        preset: 'done',
        haptic: 'success',
      });
      setIsSaving(false);
      sheetRef.current?.close();
      onSuccess();
    } catch (error) {
      setIsSaving(false);
      toast.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to archive trip',
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
              {trip ? 'Edit Trip' : 'Create Trip'}
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
                  Trip Name
                </Text>
                <Input
                  placeholder="e.g., Paris Vacation 2024"
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
                <CreateExpenseItem IconComponent={Smile} label="Icon">
                  <LinkButton
                    color="white"
                    onPress={() => {
                      Keyboard.dismiss();
                      iconPickerRef.current?.present();
                    }}
                    disabled={isSaving}
                  >
                    <Text fontSize="$6">{icon}</Text>
                  </LinkButton>
                </CreateExpenseItem>

                <CreateExpenseItem IconComponent={DollarSign} label="Currency">
                  <LinkButton
                    color="white"
                    onPress={() => {
                      Keyboard.dismiss();
                      currencySheetRef.current?.present();
                    }}
                    disabled={isSaving}
                  >
                    <Text>{currencyCode || defaultCurrency || 'Select'}</Text>
                  </LinkButton>
                </CreateExpenseItem>

                <CreateExpenseItem IconComponent={Calendar} label="Start Date">
                  <DatePicker mode="date" date={startDate} setDate={setStartDate} />
                </CreateExpenseItem>

                <CreateExpenseItem IconComponent={Calendar} label="End Date">
                  {hasEndDate ? (
                    <View flexDirection="row" alignItems="center" gap="$2">
                      <DatePicker
                        mode="date"
                        date={endDate || new Date()}
                        setDate={setEndDate}
                      />
                      <LinkButton
                        backgroundColor="$gray4"
                        paddingHorizontal="$2"
                        paddingVertical="$1"
                        onPress={() => {
                          setHasEndDate(false);
                          setEndDate(null);
                        }}
                      >
                        <Text fontSize="$2" color="$gray10">
                          Clear
                        </Text>
                      </LinkButton>
                    </View>
                  ) : (
                    <LinkButton
                      color="$gray10"
                      onPress={() => {
                        setHasEndDate(true);
                        setEndDate(dayjs().add(7, 'day').toDate());
                      }}
                    >
                      <Text>Set End Date</Text>
                    </LinkButton>
                  )}
                </CreateExpenseItem>
              </YGroup>

              {trip && (
                <View marginTop="$6" gap="$3">
                  {/* Show Mark as Finished only for active trips */}
                  {!trip.isArchived &&
                    (!trip.endDate || dayjs(trip.endDate).isAfter(dayjs())) && (
                      <LinkButton
                        backgroundColor="$green"
                        width="100%"
                        justifyContent="center"
                        onPress={async () => {
                          if (isSaving) return;
                          setIsSaving(true);
                          try {
                            await updateTrip({
                              id: trip.id,
                              name: trip.name,
                              icon: trip.icon,
                              startDate: trip.startDate,
                              endDate: new Date(),
                            });
                            toast.show({
                              title: 'Trip Finished',
                              message: 'Trip marked as finished',
                              preset: 'done',
                              haptic: 'success',
                            });
                            setIsSaving(false);
                            sheetRef.current?.close();
                            onSuccess();
                          } catch (error) {
                            setIsSaving(false);
                            toast.show({
                              title: 'Error',
                              message:
                                error instanceof Error
                                  ? error.message
                                  : 'Failed to finish trip',
                              preset: 'error',
                              haptic: 'error',
                            });
                          }
                        }}
                        disabled={isSaving}
                      >
                        <Text color="white">✓ Mark as Finished</Text>
                      </LinkButton>
                    )}

                  <LinkButton
                    backgroundColor="$gray4"
                    width="100%"
                    justifyContent="center"
                    onPress={handleArchive}
                    disabled={isSaving}
                  >
                    <Text color="white">
                      {trip.isArchived ? 'Unarchive Trip' : 'Archive Trip'}
                    </Text>
                  </LinkButton>

                  <LinkButton
                    backgroundColor="$stroberi"
                    width="100%"
                    justifyContent="center"
                    onPress={handleDelete}
                    disabled={isSaving}
                  >
                    <Text color="white">Delete Trip</Text>
                  </LinkButton>
                </View>
              )}
            </View>
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={iconPickerRef}
        snapPoints={['50%']}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        handleIndicatorStyle={handleIndicatorStyle}
        backdropComponent={CustomBackdrop}
        backgroundStyle={backgroundStyle}
        stackBehavior="push"
      >
        <BottomSheetView>
          <View paddingHorizontal="$4" paddingVertical="$2">
            <Text fontSize="$6" fontWeight="bold" marginBottom="$4">
              Choose Icon
            </Text>
            <View flexDirection="row" flexWrap="wrap" gap="$2" justifyContent="center">
              {TRIP_ICONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    setIcon(emoji);
                    iconPickerRef.current?.close();
                  }}
                >
                  <View
                    backgroundColor={icon === emoji ? '$green' : '$gray4'}
                    width={56}
                    height={56}
                    borderRadius="$3"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text fontSize={28}>{emoji}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      <CurrencySelect
        sheetRef={currencySheetRef}
        onSelect={(currency) => {
          setCurrencyCode(currency.code);
          currencySheetRef.current?.close();
        }}
        selectedCurrency={currencyCode || defaultCurrency || 'USD'}
      />
    </>
  );
};
