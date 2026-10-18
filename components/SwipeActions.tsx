import { Pen, Trash2 } from '@tamagui/lucide-icons-2';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { View } from 'tamagui';

type SwipeActionsProps = {
  drag: SharedValue<number>;
  /** What the actions act on, for screen readers, e.g. "transaction". */
  itemLabel: string;
  onEdit: () => void;
  onDelete: () => void;
};

const actionStyle: PressableProps['style'] = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
};

/** Edit/delete buttons revealed by swiping a `ReanimatedSwipeable` row left. */
export const SwipeActions = ({
  drag,
  itemLabel,
  onEdit,
  onDelete,
}: SwipeActionsProps) => {
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 100 }],
    flexDirection: 'row',
  }));

  const closeAfter = (action: () => void) => () => {
    action();
    drag.value = withTiming(0, { duration: 200 });
  };

  return (
    <Animated.View style={styleAnimation}>
      <View backgroundColor="gray" width={50}>
        <Pressable
          style={actionStyle}
          onPress={closeAfter(onEdit)}
          accessibilityLabel={`Edit ${itemLabel}`}
          accessibilityRole="button"
        >
          <Pen height={24} width={24} />
        </Pressable>
      </View>
      <View backgroundColor="$stroberiLight" width={50}>
        <Pressable
          style={actionStyle}
          onPress={closeAfter(onDelete)}
          accessibilityLabel={`Delete ${itemLabel}`}
          accessibilityRole="button"
        >
          <Trash2 height={20} width={20} />
        </Pressable>
      </View>
    </Animated.View>
  );
};
