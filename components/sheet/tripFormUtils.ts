import dayjs from 'dayjs';
import type { TripModel } from '../../database/trip-model';

export const TRIP_ICONS = [
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
] as const;

export type TripFormState = {
  currencyCode: string | null;
  endDate: Date | null;
  hasEndDate: boolean;
  icon: string;
  name: string;
  startDate: Date;
};

export const getDefaultTripFormState = (): TripFormState => ({
  name: '',
  icon: '✈️',
  currencyCode: null,
  startDate: new Date(),
  endDate: null,
  hasEndDate: false,
});

export const buildTripFormState = (trip: TripModel | null | undefined): TripFormState => {
  if (!trip) {
    return getDefaultTripFormState();
  }

  return {
    name: trip.name,
    icon: trip.icon,
    currencyCode: trip.currencyCode,
    startDate: trip.startDate,
    endDate: trip.endDate,
    hasEndDate: Boolean(trip.endDate),
  };
};

export const validateTripForm = ({
  endDate,
  hasEndDate,
  name,
  startDate,
}: {
  endDate: Date | null;
  hasEndDate: boolean;
  name: string;
  startDate: Date;
}) => {
  if (!name.trim()) {
    return 'Please enter a trip name';
  }

  if (hasEndDate && endDate && dayjs(endDate).isBefore(dayjs(startDate), 'day')) {
    return 'End date must be on or after the start date';
  }

  return null;
};

export const buildTripPayload = ({
  currencyCode,
  endDate,
  hasEndDate,
  icon,
  name,
  startDate,
}: TripFormState) => {
  return {
    name: name.trim(),
    icon,
    currencyCode,
    startDate,
    endDate: hasEndDate ? endDate : null,
  };
};

export const canMarkTripAsFinished = (trip: TripModel) => {
  return !trip.isArchived && (!trip.endDate || dayjs(trip.endDate).isAfter(dayjs()));
};
