import { Text, View, YStack } from 'tamagui';
import * as React from 'react';
import { CreateTransactionButtons } from './CreateTransactionButtons';

type CreateFirstTransactionSectionProps = React.ComponentProps<typeof YStack>;
export const CreateFirstTransactionSection = ({ ...rest }: CreateFirstTransactionSectionProps) => {
  return (
    <YStack alignItems="center" justifyContent="center" p="$4" {...rest}>
      <Text color="white" fontWeight="bold" fontSize="$7" mb="$2">
        Welcome to Stroberi 👋
      </Text>
      <Text color="white">Let's log your first transaction</Text>
      <View flexDirection="row" gap="$2" marginTop="$4" width="100%">
        <CreateTransactionButtons />
      </View>
    </YStack>
  );
};
