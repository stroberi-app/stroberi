import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { Plane, PlusCircle } from '@tamagui/lucide-icons';
import type { Observable } from 'rxjs';
import { ScrollView, Text, View } from 'tamagui';
import type { TripModel } from '../database/trip-model';
import { LinkButton } from './button/LinkButton';
import { TripItem } from './TripItem';

type TripsListProps = {
  trips: TripModel[];
  onAdd: () => void;
  onEdit: (trip: TripModel) => void;
  onPress: (trip: TripModel) => void;
};

const TripsList = ({ trips, onAdd, onEdit, onPress }: TripsListProps) => {
  if (trips.length === 0) {
    return (
      <View
        flex={1}
        justifyContent="center"
        alignItems="center"
        paddingHorizontal="$6"
        paddingVertical="$8"
      >
        <View
          backgroundColor="$gray3"
          borderRadius="$8"
          padding="$4"
          marginBottom="$4"
          width={80}
          height={80}
          justifyContent="center"
          alignItems="center"
        >
          <Plane size={40} color="$gray10" />
        </View>

        <Text
          fontSize="$7"
          fontWeight="bold"
          color="white"
          marginBottom="$3"
          textAlign="center"
        >
          No Trips Yet
        </Text>

        <Text
          fontSize="$4"
          color="$gray10"
          marginBottom="$2"
          textAlign="center"
          lineHeight={22}
        >
          Track your spending by trip
        </Text>

        <Text
          fontSize="$3"
          color="$gray9"
          marginBottom="$6"
          textAlign="center"
          lineHeight={20}
        >
          Create trips to organize and analyze your travel, vacation, or event expenses
        </Text>

        <LinkButton
          backgroundColor="$green"
          paddingHorizontal="$6"
          height="auto"
          paddingVertical="$3.5"
          borderRadius="$4"
          alignSelf="center"
          onPress={onAdd}
        >
          <PlusCircle size={20} color="white" />
          <Text color="white" fontWeight="bold" fontSize="$4">
            Create Your First Trip
          </Text>
        </LinkButton>
      </View>
    );
  }

  const activeTrips = trips.filter((t) => !t.isArchived);
  const archivedTrips = trips.filter((t) => t.isArchived);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {activeTrips.length > 0 && (
        <>
          {activeTrips.map((trip) => (
            <TripItem key={trip.id} trip={trip} onEdit={onEdit} onPress={onPress} />
          ))}
        </>
      )}

      {archivedTrips.length > 0 && (
        <>
          <Text fontSize="$3" color="$gray9" marginTop="$4" marginBottom="$2">
            Archived
          </Text>
          {archivedTrips.map((trip) => (
            <TripItem key={trip.id} trip={trip} onEdit={onEdit} onPress={onPress} />
          ))}
        </>
      )}

      <View height={100} />
    </ScrollView>
  );
};

const enhance = withObservables<
  {
    database: Database;
    onAdd: () => void;
    onEdit: (trip: TripModel) => void;
    onPress: (trip: TripModel) => void;
  },
  { trips: Observable<TripModel[]> }
>(['database'], ({ database }) => ({
  trips: database.get<TripModel>('trips').query(Q.sortBy('startDate', Q.desc)).observe(),
}));

export default enhance(TripsList);
