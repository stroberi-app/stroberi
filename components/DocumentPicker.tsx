import { PlusCircle } from '@tamagui/lucide-icons';
import * as DocumentPickerLib from 'expo-document-picker';
import { Text, View } from 'tamagui';

export const DocumentPicker = () => {
  return (
    <View
      onTouchStart={() => DocumentPickerLib.getDocumentAsync()}
      mt="$4"
      alignItems="center"
      justifyContent="center"
      gap="$4"
      flexDirection="row"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$4"
      backgroundColor="$gray1"
      padding="$4"
    >
      <PlusCircle />
      <Text>Add Attachments</Text>
    </View>
  );
};
