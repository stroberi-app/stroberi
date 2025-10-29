import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

type BottomSheetTextAreaProps = {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  height?: number;
  size?: string;
};

const BottomSheetTextAreaComponent = ({
  placeholder,
  value,
  onChangeText,
  height = 100,
}: BottomSheetTextAreaProps) => {
  return (
    <BottomSheetTextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      multiline
      numberOfLines={4}
      style={[
        styles.textArea,
        {
          height,
        },
      ]}
      textAlignVertical="top"
    />
  );
};

const styles = StyleSheet.create({
  textArea: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#1a1a1a',
  },
});

export const BottomSheetTextArea = memo(BottomSheetTextAreaComponent);
