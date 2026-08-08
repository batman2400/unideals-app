import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ConfigMissingScreen } from "@/components/ConfigMissingScreen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { handleAuthDeepLink } from "@/lib/authDeepLink";
import { isSupabaseConfigured } from "@/lib/supabase";
import { colors } from "@/theme";

void SplashScreen.preventAutoHideAsync();

const AUTH_GROUP = "(auth)";

function NavigationGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const processUrl = async (url: string | null) => {
      const result = await handleAuthDeepLink(url);
      if (!result.handled) return;

      if (result.error) {
        router.replace({
          pathname: "/reset-password",
          params: { error: result.error },
        } as Href);
        return;
      }

      if (result.type === "recovery") {
        router.replace("/reset-password" as Href);
      }
    };

    void Linking.getInitialURL().then((url) => void processUrl(url));
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void processUrl(url);
    });

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (isLoading) return;

    void SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === AUTH_GROUP;
    const onResetPassword = (segments as string[]).includes("reset-password");

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login" as Href);
    } else if (isAuthenticated && inAuthGroup && !onResetPassword) {
      router.replace("/" as Href);
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
      <Stack.Screen name="(auth)" />
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
      <Stack.Screen name="+not-found" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  if (!isSupabaseConfigured) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ConfigMissingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <NavigationGuard />
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
