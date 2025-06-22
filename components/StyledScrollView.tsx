import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { styled } from 'tamagui';

export const StyledScrollView = styled(KeyboardAwareScrollView, {
  backgroundColor: '$bgPrimary',
  paddingHorizontal: '$2',
  paddingTop: '$4',
});
