import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { PlusCircle } from '@tamagui/lucide-icons';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';
import { LinkButton } from '../../components/button/LinkButton';
import { TripFormSheet } from '../../components/sheet/TripFormSheet';
import TripsList from '../../components/TripsList';
import type { TripModel } from '../../database/trip-model';

export default function TripsScreen() {
  const { top } = useSafeAreaInsets();
  const database = useDatabase();
  const tripFormSheetRef = useRef<BottomSheetModal | null>(null);
  const [tripToEdit, setTripToEdit] = useState<TripModel | null>(null);

  const handleAddTrip = () => {
    setTripToEdit(null);
    tripFormSheetRef.current?.present();
  };

  const handleEditTrip = (trip: TripModel) => {
    setTripToEdit(trip);
    tripFormSheetRef.current?.present();
  };

  const handlePressTrip = (trip: TripModel) => {
    // For now, pressing a trip opens the edit sheet
    // In the future, this could navigate to trip details
    handleEditTrip(trip);
  };

  const handleSuccess = () => {
    setTripToEdit(null);
  };

  return (
    <>
      <View
        paddingTop={top || '$2'}
        flex={1}
        backgroundColor="$bgPrimary"
        paddingHorizontal="$2"
      >
        <View
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginBottom="$4"
        >
          <Text fontSize="$8" fontWeight="bold">
            Trips
          </Text>
          <LinkButton backgroundColor="$green" onPress={handleAddTrip} size="small">
            <PlusCircle size={20} color="white" />
          </LinkButton>
        </View>

        <TripsList
          database={database}
          onAdd={handleAddTrip}
          onEdit={handleEditTrip}
          onPress={handlePressTrip}
        />
      </View>

      <TripFormSheet
        sheetRef={tripFormSheetRef}
        trip={tripToEdit}
        onSuccess={handleSuccess}
      />
    </>
  );
}
