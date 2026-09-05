import * as Linking from "expo-linking";
import { Stack, useRouter, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

import { ConfigMissingScreen } from "@/components/ConfigMissingScreen";
import { SearchMorph } from "@/components/SearchMorph";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { TabBarMotionProvider } from "@/context/TabBarMotionContext";
import { applyExpoUpdateIfAvailable } from "@/lib/applyExpoUpdate";
import { handleAuthDeepLink } from "@/lib/authDeepLink";
import {
  consumeInitialPushTarget,
  subscribeToPushResponses,
  type PushTarget,
} from "@/lib/pushNotifications";
import { qrPayloadKind } from "@/lib/routeParams";
import { isSupabaseConfigured } from "@/lib/supabase";
import { colors } from "@/theme";

void SplashScreen.preventAutoHideAsync();
void applyExpoUpdateIfAvailable();

/** Avoid re-processing the launch URL on Fast Refresh / guard remounts. */
let didConsumeInitialAuthUrl = false;

function NavigationGuard() {
  const {
    beginPasswordRecovery,
    isAuthenticated,
    isLoading,
    isPasswordRecovery,
    role,
  } = useAuth();
  const router = useRouter();

  const stackHeader = {
    headerShown: true as const,
    headerTintColor: colors.primary,
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: false,
  };

  useEffect(() => {
    const processUrl = async (url: string | null) => {
      // Ticket / student-pass URLs are QR payloads, not auth or app pages.
      if (qrPayloadKind(url)) return;

      const result = await handleAuthDeepLink(url);
      if (!result.handled) return;

      if (result.error) {
        if (result.isRecovery) {
          router.replace({
            pathname: "/reset-password",
            params: { error: result.error },
          } as Href);
        } else {
          router.replace({
            pathname: "/login",
            params: { error: result.error },
          } as Href);
        }
        return;
      }

      if (result.isRecovery || result.type === "recovery") {
        beginPasswordRecovery();
        router.replace("/reset-password" as Href);
      }
    };

    if (!didConsumeInitialAuthUrl) {
      didConsumeInitialAuthUrl = true;
      void Linking.getInitialURL().then((url) => void processUrl(url));
    }

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void processUrl(url);
    });

    return () => subscription.remove();
  }, [beginPasswordRecovery, router]);

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  // Safety fallback so splash screen never hangs permanently
  useEffect(() => {
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Recovery emails may omit `type=` but still emit PASSWORD_RECOVERY.
  useEffect(() => {
    if (isLoading || !isPasswordRecovery) return;
    router.replace("/reset-password" as Href);
  }, [isLoading, isPasswordRecovery, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || isPasswordRecovery) return;

    const openTarget = (target: PushTarget) => {
      if (target.type === "deal") {
        router.push(`/deal/${target.id}` as Href);
      } else {
        router.push(`/event/${target.id}` as Href);
      }
    };

    const initial = consumeInitialPushTarget();
    if (initial) openTarget(initial);

    return subscribeToPushResponses(openTarget);
  }, [isAuthenticated, isLoading, isPasswordRecovery, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
      {/* Login must be first available when signed out — not reset-password. */}
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && !isPasswordRecovery}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="deal/[id]"
          options={{
            headerShown: true,
            title: "Deal",
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="brand/[slug]"
          options={{
            headerShown: true,
            title: "Brand",
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="event/[id]"
          options={{
            headerShown: true,
            title: "Event",
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="create-event"
          options={{
            presentation: "modal",
            ...stackHeader,
            title: "Submit Event",
          }}
        />
        <Stack.Screen
          name="saved"
          options={{ ...stackHeader, title: "Saved Deals" }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{ ...stackHeader, title: "Edit Profile" }}
        />
        <Stack.Screen
          name="help"
          options={{ ...stackHeader, title: "Help & Support" }}
        />
        <Stack.Screen
          name="contact"
          options={{ ...stackHeader, title: "Contact" }}
        />
        <Stack.Screen
          name="terms"
          options={{ ...stackHeader, title: "Terms of Service" }}
        />
        <Stack.Screen
          name="privacy"
          options={{ ...stackHeader, title: "Privacy Policy" }}
        />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && !isPasswordRecovery && role === "partner"}>
        <Stack.Screen name="partner/dashboard" />
        <Stack.Screen
          name="partner/deals"
          options={{ ...stackHeader, title: "My Deals" }}
        />
        <Stack.Screen
          name="partner/finished-deals"
          options={{ ...stackHeader, title: "Finished Deals" }}
        />
        <Stack.Screen
          name="partner/scanner"
          options={{ ...stackHeader, title: "Scanner" }}
        />
        <Stack.Screen
          name="partner/analytics"
          options={{ ...stackHeader, title: "Analytics" }}
        />
        <Stack.Screen
          name="partner/brand"
          options={{ ...stackHeader, title: "Brand Profile" }}
        />
        <Stack.Screen
          name="create-deal"
          options={{
            presentation: "modal",
            ...stackHeader,
            title: "Create Deal",
          }}
        />
        <Stack.Screen
          name="edit-deal/[id]"
          options={{
            presentation: "modal",
            ...stackHeader,
            title: "Edit Deal",
          }}
        />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && !isPasswordRecovery && role === "admin"}>
        <Stack.Screen name="admin/dashboard" />
        <Stack.Screen
          name="admin/verifications"
          options={{ ...stackHeader, title: "Verifications" }}
        />
        <Stack.Screen
          name="admin/pending-events"
          options={{ ...stackHeader, title: "Pending Events" }}
        />
        <Stack.Screen
          name="admin/inquiries"
          options={{ ...stackHeader, title: "Inquiries" }}
        />
        <Stack.Screen
          name="admin/deals"
          options={{ ...stackHeader, title: "All Deals" }}
        />
        <Stack.Screen
          name="admin/finished-deals"
          options={{ ...stackHeader, title: "Finished Deals" }}
        />
        <Stack.Screen
          name="admin/events"
          options={{ ...stackHeader, title: "All Events" }}
        />
        <Stack.Screen
          name="admin/finished-events"
          options={{ ...stackHeader, title: "Finished Events" }}
        />
        <Stack.Screen
          name="admin/blog"
          options={{ ...stackHeader, title: "Blog Manager" }}
        />
        <Stack.Screen
          name="admin/users"
          options={{ ...stackHeader, title: "Users" }}
        />
        <Stack.Screen
          name="admin/brands"
          options={{ ...stackHeader, title: "Brands" }}
        />
        <Stack.Screen
          name="admin/analytics"
          options={{ ...stackHeader, title: "Analytics" }}
        />
      </Stack.Protected>

      {/* After auth/tabs so it is never the Stack fallback on reload/logout. */}
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="+not-found" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  if (!isSupabaseConfigured) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style="dark" />
        <ConfigMissingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <AuthProvider>
          <TabBarMotionProvider>
            <StatusBar style="dark" />
            <View style={styles.root}>
              <NavigationGuard />
              <SearchMorph />
            </View>
          </TabBarMotionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
