import * as SplashScreen from "expo-splash-screen";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Linking, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { inspectAppUpdate } from "@/lib/appUpdate";
import { colors, spacing } from "@/theme";

const SplashReleaseContext = createContext(true);

/** True once the launch update check has finished and the app may leave the splash screen. */
export function useSplashReleased(): boolean {
  return useContext(SplashReleaseContext);
}

type GateStatus = "pending" | "ready" | "store";

const SPLASH_HOLD_MS = 8000;

/**
 * Opens the app on the installed store build. When that build is older than
 * `min_store_version`, the student is sent to the store instead.
 */
export function AppUpdateGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GateStatus>("pending");
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const running = useRef(false);

  const inspect = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    try {
      const decision = await inspectAppUpdate();

      if (decision.kind === "store") {
        setStoreUrl(decision.url);
        setStatus("store");
        return;
      }

      setStatus("ready");
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    void inspect();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void inspect();
    });

    return () => subscription.remove();
  }, [inspect]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus((current) => (current === "pending" ? "ready" : current));
    }, SPLASH_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === "store") {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  if (status === "store" && storeUrl) {
    return <StoreUpdateScreen url={storeUrl} />;
  }

  return (
    <SplashReleaseContext.Provider value={status === "ready"}>
      {children}
    </SplashReleaseContext.Provider>
  );
}

function StoreUpdateScreen({ url }: { url: string }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Update Uni Deals</Text>
      <Text style={styles.body}>
        This version of the app is no longer supported. Install the latest
        version from the store to keep using Uni Deals.
      </Text>
      <Button label="Update" onPress={() => void Linking.openURL(url)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onBackground,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
});
