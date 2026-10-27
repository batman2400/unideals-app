import * as AppleAuthentication from "expo-apple-authentication";
import { StyleSheet } from "react-native";

import { MIN_TAP_TARGET, radius } from "@/theme";

interface AppleSignInButtonProps {
  onPress: () => void;
}

/** Apple's official button. It must stay at least as prominent as Google. */
export function AppleSignInButton({ onPress }: AppleSignInButtonProps) {
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={radius.lg}
      style={styles.button}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: MIN_TAP_TARGET,
  },
});
