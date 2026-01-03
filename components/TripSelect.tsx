import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Plane, X } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';
import type { TripModel } from '../database/trip-model';
import { CustomBackdrop } from './CustomBackdrop';
import { LinkButton } from './button/LinkButton';
import { backgroundStyle, handleIndicatorStyle } from './sheet/constants';

type TripSelectProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  selectedTrip: TripModel | null;
  onSelect: (trip: TripModel | null) => void;
};

export const TripSelect = ({ sheetRef, selectedTrip, onSelect }: TripSelectProps) => {
  const database = useDatabase();
  const { bottom } = useSafeAreaInsets();
  const [trips, setTrips] = useState<TripModel[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadTrips = async () => {
      try {
        const allTrips = await database
          .get<TripModel>('trips')
          .query(Q.where('isArchived', false), Q.sortBy('startDate', Q.desc))
          .fetch();
        setTrips(allTrips);
      } catch (error) {
        console.error('Failed to load trips:', error);
      }
    };
    loadTrips();
  }, [database]);

  const filteredTrips = trips.filter((trip) =>
    trip.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (trip: TripModel | null) => {
    onSelect(trip);
    sheetRef.current?.close();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['60%']}
      enableDynamicSizing={false}
      enablePanDownToClose={true}
      handleIndicatorStyle={handleIndicatorStyle}
      backdropComponent={CustomBackdrop}
      backgroundStyle={backgroundStyle}
    >
      <BottomSheetView style={{ flex: 1, paddingBottom: bottom }}>
        <View paddingHorizontal="$4" paddingTop="$2" flex={1}>
          <View
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            marginBottom="$3"
          >
            <Text fontSize="$6" fontWeight="bold">
              Select Trip
            </Text>
            <LinkButton
              backgroundColor="$green"
              onPress={() => sheetRef.current?.close()}
            >
              <Text color="white">Done</Text>
            </LinkButton>
          </View>

          <BottomSheetTextInput
            placeholder="Search trips..."
            value={search}
            onChangeText={setSearch}
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

          <BottomSheetScrollView>
            <Pressable onPress={() => handleSelect(null)}>
              <View
                flexDirection="row"
                alignItems="center"
                padding="$3"
                backgroundColor={selectedTrip === null ? '$gray4' : 'transparent'}
                borderRadius="$3"
                marginBottom="$2"
                gap="$3"
              >
                <View
                  backgroundColor="$gray6"
                  borderRadius="$2"
                  width={40}
                  height={40}
                  justifyContent="center"
                  alignItems="center"
                >
                  <X size={20} color="$gray10" />
                </View>
                <Text fontSize="$4" color="$gray10">
                  No Trip
                </Text>
              </View>
            </Pressable>

            {filteredTrips.map((trip) => {
              const isSelected = selectedTrip?.id === trip.id;
              const isOngoing = !trip.endDate || dayjs(trip.endDate).isAfter(dayjs());

              return (
                <Pressable key={trip.id} onPress={() => handleSelect(trip)}>
                  <View
                    flexDirection="row"
                    alignItems="center"
                    padding="$3"
                    backgroundColor={isSelected ? '$gray4' : 'transparent'}
                    borderRadius="$3"
                    marginBottom="$2"
                    gap="$3"
                  >
                    <View
                      backgroundColor={isOngoing ? '$green' : '$gray6'}
                      borderRadius="$2"
                      width={40}
                      height={40}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text fontSize={20}>{trip.icon}</Text>
                    </View>
                    <View flex={1}>
                      <Text fontSize="$4" fontWeight="600" color="white">
                        {trip.name}
                      </Text>
                      <Text fontSize="$2" color="$gray10">
                        {dayjs(trip.startDate).format('MMM D, YYYY')}
                        {trip.endDate &&
                          ` - ${dayjs(trip.endDate).format('MMM D, YYYY')}`}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {filteredTrips.length === 0 && trips.length > 0 && (
              <Text color="$gray9" textAlign="center" marginTop="$4">
                No trips match your search
              </Text>
            )}

            {trips.length === 0 && (
              <View alignItems="center" marginTop="$4">
                <Plane size={32} color="$gray9" />
                <Text color="$gray9" textAlign="center" marginTop="$2">
                  No active trips
                </Text>
                <Text color="$gray9" textAlign="center" fontSize="$2">
                  Create a trip first to track expenses
                </Text>
              </View>
            )}
          </BottomSheetScrollView>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
