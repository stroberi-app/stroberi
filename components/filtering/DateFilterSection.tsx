import React from 'react';
import { View, Text } from 'tamagui';
import { XCircle } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import DateFilterOption from './DateFilterOption';
import { LinkButton } from '../button/LinkButton';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { DateFilters } from '../../app/(tabs)/transactions';

type DateFilterSectionProps = {
  dateFilter: string | null;
  setDateFilter: React.Dispatch<React.SetStateAction<DateFilters | null>>;
  fromDate: Date;
  toDate: Date;
  dateSheetRef: React.RefObject<BottomSheetModal>;
};

const DateFilterSection = ({
  dateFilter,
  setDateFilter,
  fromDate,
  toDate,
  dateSheetRef,
}: DateFilterSectionProps) => {
  const options = [
    { label: 'This Year', value: 'This Year' as const },
    { label: 'This Month', value: 'This Month' as const },
    {
      label:
        dateFilter === 'Custom'
          ? dayjs(fromDate).format('MMM DD, YYYY') + ' - ' + dayjs(toDate).format('MMM DD, YYYY')
          : 'Custom',
      value: 'Custom' as const,
      onPress: () => dateSheetRef.current?.present(),
    },
  ];

  return (
    <View paddingHorizontal={'$4'} paddingVertical={'$2'} mb={'$5'}>
      <View flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'} mb={'$4'}>
        <Text fontSize={'$6'} fontWeight={'bold'}>
          Filter by Date
        </Text>
        {dateFilter !== null && (
          <LinkButton onPress={() => setDateFilter(null)}>
            <XCircle size={18} color={'$brandPrimary'} />
          </LinkButton>
        )}
      </View>
      <View flexDirection={'row'} gap={'$3'} flexWrap={'wrap'}>
        {options.map(option => (
          <DateFilterOption
            key={option.value}
            label={option.label}
            isSelected={dateFilter === option.value}
            onPress={option.onPress || (() => setDateFilter(option.value))}
          />
        ))}
      </View>
    </View>
  );
};

export default DateFilterSection;