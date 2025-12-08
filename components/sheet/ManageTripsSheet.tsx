import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { CalendarRange, MapPin, Plane, PlusCircle, XCircle } from '@tamagui/lucide-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, XStack, YGroup } from 'tamagui';
import { type TripModel } from '../../database/trip-model';
import { createTrip } from '../../database/helpers';
import { useActiveTrip } from '../../hooks/useActiveTrip';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { LinkButton } from '../button/LinkButton';
import { CurrencySelect } from '../CurrencySelect';
import { CustomBackdrop } from '../CustomBackdrop';
import { BottomSheetTextInput } from './BottomSheetTextInput';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './constants';

type ManageTripsSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  onSelectTrip?: (trip: TripModel | null) => void;
  allowClearSelection?: boolean;
};

export const ManageTripsSheet = ({
  sheetRef,
  onSelectTrip,
  allowClearSelection = false,
}: ManageTripsSheetProps) => {
  const database = useDatabase();
  const currencySheetRef = useRef<BottomSheetModal | null>(null);
  const { activeTrip, setActiveTrip, isLoadingActiveTrip } = useActiveTrip();
  const { defaultCurrency } = useDefaultCurrency();

  const [trips, setTrips] = useState<TripModel[]>([]);
  const [name, setName] = useState('');
  const [homeCurrency, setHomeCurrency] = useState(defaultCurrency ?? 'USD');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const query = database.get<TripModel>('trips').query(Q.sortBy('created_at', Q.desc));

    const subscription = query.observe().subscribe((results) => {
      setTrips(results);
    });

    return () => subscription.unsubscribe();
  }, [database]);

  useEffect(() => {
    if (defaultCurrency) {
      setHomeCurrency((prev) => prev || defaultCurrency);
    }
  }, [defaultCurrency]);

  const activeTripId = activeTrip?.id ?? null;

  const handleCreateTrip = async () => {
    if (!name.trim()) {
      return;
    }
    setIsSaving(true);
    try {
      const trip = await createTrip({
        name: name.trim(),
        homeCurrencyCode: homeCurrency,
      });
      setName('');
      setActiveTrip(trip.id);
      onSelectTrip?.(trip);
      sheetRef.current?.dismiss();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectTrip = async (trip: TripModel) => {
    await setActiveTrip(trip.id);
    onSelectTrip?.(trip);
    sheetRef.current?.dismiss();
  };

  const handleClearSelection = async () => {
    await setActiveTrip(null);
    onSelectTrip?.(null);
    sheetRef.current?.dismiss();
  };

  const hasTrips = useMemo(() => trips.length > 0, [trips]);

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        $modal={false}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        animateOnMount
        stackBehavior="push"
        handleIndicatorStyle={handleIndicatorStyle}
        backdropComponent={CustomBackdrop}
        backgroundStyle={backgroundStyle}
      >
        <BottomSheetScrollView>
          <View
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal="$3"
            paddingVertical="$2"
            gap="$2"
          >
            <View flex={1} gap="$1">
              <Text color="white" fontSize="$6" fontWeight="700">
                Travel Mode (Trips)
              </Text>
              <Text color="$gray9" fontSize="$3">
                Set an active trip to default currency and quick-add context.
              </Text>
            </View>
            {allowClearSelection && (
              <LinkButton
                backgroundColor="$gray5"
                size="small"
                onPress={handleClearSelection}
                disabled={!activeTripId && !onSelectTrip}
                opacity={!activeTripId && !onSelectTrip ? 0.5 : 1}
              >
                <XCircle size={16} color="white" />
                Clear
              </LinkButton>
            )}
          </View>

          <View paddingHorizontal="$3" marginBottom="$3" gap="$2">
            <BottomSheetTextInput
              placeholder="Trip name (e.g. Paris, Client Offsite)"
              value={name}
              onChangeText={setName}
              returnKeyType="done"
            />
            <XStack gap="$2" alignItems="center" justifyContent="space-between">
              <View flexDirection="row" gap="$2" alignItems="center">
                <MapPin size={16} color="white" />
                <Text color="$gray9" fontSize="$3">
                  Home currency
                </Text>
              </View>
              <LinkButton
                backgroundColor="$gray5"
                size="small"
                onPress={() => currencySheetRef.current?.present()}
              >
                {homeCurrency}
              </LinkButton>
            </XStack>
            <LinkButton
              backgroundColor="$green"
              disabled={isSaving || !name.trim()}
              opacity={isSaving || !name.trim() ? 0.6 : 1}
              onPress={handleCreateTrip}
            >
              <PlusCircle size={18} color="white" />
              {isSaving ? 'Saving...' : 'Create trip & set active'}
            </LinkButton>
          </View>

          <View paddingHorizontal="$3" marginBottom="$2">
            <Text color="white" fontSize="$5" fontWeight="600">
              Your trips
            </Text>
          </View>
          {hasTrips ? (
            <YGroup separator={<View height={1} backgroundColor="$gray6" />} marginBottom="$4">
              {trips.map((trip) => {
                const isActive = activeTripId === trip.id;
                return (
                  <YGroup.Item key={trip.id}>
                    <View padding="$3" gap="$2">
                      <XStack alignItems="center" justifyContent="space-between">
                        <View gap="$1">
                          <XStack alignItems="center" gap="$2">
                            <Plane size={16} color="white" />
                            <Text color="white" fontSize="$4" fontWeight="600">
                              {trip.name}
                            </Text>
                          </XStack>
                          <XStack gap="$2" alignItems="center">
                            <MapPin size={14} color="$gray9" />
                            <Text color="$gray9" fontSize="$3">
                              {trip.homeCurrencyCode}
                            </Text>
                          </XStack>
                        </View>
                        {isActive && !isLoadingActiveTrip && (
                          <View
                            backgroundColor="$green"
                            paddingVertical="$1"
                            paddingHorizontal="$2"
                            borderRadius="$2"
                          >
                            <Text color="white" fontSize="$2">
                              Active
                            </Text>
                          </View>
                        )}
                      </XStack>
                      <XStack gap="$2">
                        {!isActive && (
                          <LinkButton
                            backgroundColor="$gray5"
                            size="small"
                            onPress={() => handleSelectTrip(trip)}
                          >
                            Set active
                          </LinkButton>
                        )}
                        {onSelectTrip && (
                          <LinkButton
                            backgroundColor="$gray5"
                            size="small"
                            onPress={() => {
                              onSelectTrip(trip);
                              sheetRef.current?.dismiss();
                            }}
                          >
                            Use for transaction
                          </LinkButton>
                        )}
                      </XStack>
                    </View>
                  </YGroup.Item>
                );
              })}
            </YGroup>
          ) : (
            <View paddingHorizontal="$3" paddingBottom="$4">
              <Text color="$gray9" fontSize="$3">
                No trips yet. Create one to start travel mode.
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
      <CurrencySelect
        sheetRef={currencySheetRef}
        selectedCurrency={homeCurrency}
        onSelect={(currency) => {
          setHomeCurrency(currency.code);
          currencySheetRef.current?.close();
        }}
      />
    </>
  );
};
