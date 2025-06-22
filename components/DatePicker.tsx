import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform } from 'react-native';
import { Text, View } from 'tamagui';

type DatePickerProps = {
  mode?: 'date' | 'time';
  date: Date;
  setDate: (date: Date) => void;
};

export const DatePicker = ({ mode = 'date', date, setDate }: DatePickerProps) => {
  const [show, setShow] = React.useState(false);
  const onChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setDate(selectedDate || date);
    setShow(false);
  };

  const picker = (
    <DateTimePicker
      themeVariant="dark"
      testID="dateTimePicker"
      value={date}
      mode={mode}
      is24Hour={true}
      onChange={onChange}
    />
  );
  if (Platform.OS === 'ios') {
    return picker;
  } else {
    return (
      <>
        {show && picker}
        <View
          backgroundColor="$gray3"
          borderColor="$borderColor"
          borderWidth={2}
          borderRadius={8}
          padding="$2"
          onPress={() => setShow(true)}
        >
          <Text color="white">
            {mode === 'date' ? date.toLocaleDateString() : date.toLocaleTimeString()}
          </Text>
        </View>
      </>
    );
  }
};
