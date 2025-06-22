import { Check } from '@tamagui/lucide-icons';
import { Text, View } from 'tamagui';

type ListItemProps = {
  name: string;
  extra: string;
  selected?: boolean;
};

export const ListItem = ({ name, extra, selected }: ListItemProps) => {
  return (
    <View
      backgroundColor="transparent"
      flexDirection="row"
      paddingVertical="$3"
      paddingHorizontal="$4"
      gap="$4"
      borderWidth="$0.5"
      borderColor="$borderColor"
      borderRadius="$0"
    >
      <View flexDirection="column">
        <Text fontSize="$5" fontWeight="bold">
          {name}
        </Text>
      </View>
      <View marginLeft="auto" alignItems="flex-end" flexDirection="row" gap="$3">
        {selected && <Check size={20} />}
        <Text fontSize="$5">{extra}</Text>
      </View>
    </View>
  );
};
