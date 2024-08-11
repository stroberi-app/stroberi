import { styled } from 'tamagui';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

export const StyledScrollView = styled(KeyboardAwareScrollView, {
  backgroundColor: '$bgPrimary',
  paddingHorizontal: '$2',
  paddingTop: '$4',
});
