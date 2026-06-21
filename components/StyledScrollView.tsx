import type { ComponentProps } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { styled, useTheme } from 'tamagui';

// NOTE: KeyboardAwareScrollView renders a Reanimated.ScrollView under the hood,
// so any `style` we pass is processed by Reanimated. Passing a Tamagui theme
// *token* color (e.g. `backgroundColor: '$bgPrimary'`) lets an unresolved
// Variable object reach Reanimated, which fails with
// "[Reanimated] Invalid color value: [object Object]" — a no-op warning in
// Debug but a hard crash in Release builds (device only). We therefore keep
// spacing tokens on the styled component (numbers are safe) and inject the
// background as a fully-resolved color string via the `style` prop.
const BaseScrollView = styled(KeyboardAwareScrollView, {
  paddingHorizontal: '$2',
  paddingTop: '$4',
});

type StyledScrollViewProps = ComponentProps<typeof BaseScrollView>;

export const StyledScrollView = ({ style, ...props }: StyledScrollViewProps) => {
  const theme = useTheme();
  const backgroundColor = theme.bgPrimary?.val ?? 'black';

  return <BaseScrollView style={[{ backgroundColor }, style]} {...props} />;
};
