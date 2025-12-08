import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useEffect, useState } from 'react';
import {
  getActiveTrip,
  getActiveTripId,
  setActiveTripId,
} from '../database/helpers';
import type { TripModel } from '../database/trip-model';

let activeTripListeners: Array<(tripId: string | null) => void> = [];

export const notifyActiveTripChanged = (tripId: string | null) => {
  activeTripListeners.forEach((listener) => listener(tripId));
};

export const useActiveTrip = () => {
  // Access database to keep hook aligned with Watermelon lifecycle; not used directly.
  useDatabase();
  const [activeTrip, setActiveTripState] = useState<TripModel | null>(null);
  const [isLoadingActiveTrip, setIsLoadingActiveTrip] = useState(true);

  const loadActiveTrip = async () => {
    setIsLoadingActiveTrip(true);
    try {
      const trip = await getActiveTrip();
      setActiveTripState(trip);
    } finally {
      setIsLoadingActiveTrip(false);
    }
  };

  useEffect(() => {
    loadActiveTrip();
    const listener = (tripId: string | null) => {
      if (!tripId) {
        setActiveTripState(null);
        return;
      }
      loadActiveTrip();
    };
    activeTripListeners.push(listener);
    return () => {
      activeTripListeners = activeTripListeners.filter((l) => l !== listener);
    };
  }, []);

  const setActiveTrip = async (tripId: string | null) => {
    await setActiveTripId(tripId);
    notifyActiveTripChanged(tripId);
    await loadActiveTrip();
  };

  const refreshActiveTrip = async () => {
    const tripId = await getActiveTripId();
    notifyActiveTripChanged(tripId);
  };

  return {
    activeTrip,
    setActiveTrip,
    refreshActiveTrip,
    isLoadingActiveTrip,
  };
};
