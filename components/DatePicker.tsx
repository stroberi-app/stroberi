import React from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type DatePickerProps = {
  mode?: 'date' | 'time';
  date: Date;
  setDate: (date: Date) => void;
};

export const DatePicker = ({ mode = 'date', date, setDate }: DatePickerProps) => {
  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setDate(selectedDate || date);
  };

  return (
    <DateTimePicker
      themeVariant="dark"
      testID="dateTimePicker"
      value={date}
      mode={mode}
      is24Hour={true}
      onChange={onChange}
    />
  );
};
