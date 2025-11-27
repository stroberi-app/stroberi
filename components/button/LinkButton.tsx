import { Button, styled } from 'tamagui';

export const LinkButton = styled(Button, {
  alignSelf: 'flex-start',
  backgroundColor: '$gray',
  color: '$stroberi',
  borderRadius: '$10',
  flexDirection: 'row',
  gap: '$2',
  height: 36,
  fontSize: '$5',
  variants: {
    size: {
      regular: {
        paddingVertical: '$0',
        paddingHorizontal: '$4',
      },
      small: {
        paddingVertical: '$0',
        paddingHorizontal: '$2',
      },
    },
  },

  defaultVariants: {
    size: 'regular',
  },
});
