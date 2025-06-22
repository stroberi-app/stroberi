import { Text, View, YGroup } from 'tamagui';

type InfoItemProps = {
  title: string;
  value: string;
  color?: string;
};
export const InfoItem = ({ title, value, color }: InfoItemProps) => {
  return (
    <YGroup.Item>
      <View gap="$1">
        <Text fontSize="$2">{title}</Text>
        <Text fontSize="$5" fontWeight="bold" color={color}>
          {value}
        </Text>
      </View>
    </YGroup.Item>
  );
};
