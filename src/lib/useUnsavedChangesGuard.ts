import { useNavigation } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert } from "react-native";

/**
 * Blocks leaving a form when `isDirty` is true, unless `allowLeave()` was
 * called (e.g. after a successful submit).
 */
export function useUnsavedChangesGuard(isDirty: boolean): () => void {
  const navigation = useNavigation();
  const allowLeaveRef = useRef(false);

  const allowLeave = () => {
    allowLeaveRef.current = true;
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowLeaveRef.current || !isDirty) return;

      event.preventDefault();
      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Leave without saving?",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              allowLeaveRef.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation, isDirty]);

  return allowLeave;
}
