import { Download, Info } from '@tamagui/lucide-icons';
import { Text, XStack, YStack } from 'tamagui';

export const ImportIntro = () => (
  <YStack gap={'$3'} mb={'$4'}>
    <XStack alignItems={'flex-start'} gap={'$3'} pr={'$3'}>
      <YStack mt={'$1'}>
        <Info size={18} color="$blue9" />
      </YStack>
      <YStack flex={1} gap={'$2'}>
        <Text fontSize={'$4'} fontWeight={'600'} color={'$gray12'}>
          Ready to import your transactions?
        </Text>
        <Text fontSize={'$3'} color={'$gray11'} lineHeight={'$1'}>
          Upload a CSV file with your transaction data. Make sure it includes columns for
          amount, date, and currency code. Merchant is optional.
        </Text>
      </YStack>
    </XStack>

    <XStack alignItems={'center'} gap={'$3'} mt={'$2'} pr={'$3'}>
      <Download size={16} color="$gray9" />
      <Text fontSize={'$3'} color={'$gray11'}>
        Don't have a CSV? Download our template with example data to get started.
      </Text>
    </XStack>
  </YStack>
);
