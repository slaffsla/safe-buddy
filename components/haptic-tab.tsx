import * as Haptics from "expo-haptics";
import { Pressable, type PressableProps } from "react-native";

export function HapticTab(props: PressableProps) {
  const handlePress = (e: any) => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Call the original onPress
    props.onPress?.(e);
  };

  return (
    <Pressable {...props} onPress={handlePress}>
      {props.children}
    </Pressable>
  );
}
