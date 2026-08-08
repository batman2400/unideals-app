import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BadgeCheck,
  CheckCircle2,
  Store,
  Ticket,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { supabase, toErrorMessage } from "@/lib/supabase";
import { useDeal } from "@/lib/useDeals";
import { colors, radius, spacing } from "@/theme";
import {
  TICKET_URI_PREFIX,
  type InstoreTicketRow,
  type OnlineCodeEventType,
} from "@/types/database";

const TICKET_DURATION_MINUTES = 10;

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isVerified, role } = useAuth();

  const accessKey = [
    isAuthenticated ? "auth" : "anon",
    role ?? "student",
    isVerified ? "verified" : "unverified",
  ].join(":");

  const { deal, isLoading, error } = useDeal(id, accessKey);

  const isPrivilegedRole = role === "admin" || role === "partner";
  const canRevealRedemption =
    isPrivilegedRole || (isAuthenticated && isVerified);
  const showVerificationWall = !canRevealRedemption;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !deal) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Deal not found</Text>
        <Text style={styles.errorBody}>
          {error ?? "This deal may have expired or been removed."}
        </Text>
        <Button label="Back to deals" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {deal.imageUrl ? (
        <Image
          source={{ uri: deal.imageUrl }}
          style={styles.hero}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.hero, styles.heroFallback]}>
          <Ticket color={colors.primary} size={40} />
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.brand}>{deal.brand}</Text>
        <Text style={styles.title}>{deal.title}</Text>
        <Text style={styles.discount}>{deal.discount}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.chip}>{deal.type}</Text>
          {deal.category ? (
            <Text style={styles.chipMuted}>{deal.category}</Text>
          ) : null}
        </View>
        {deal.description ? (
          <Text style={styles.description}>{deal.description}</Text>
        ) : null}

        {showVerificationWall ? (
          <VerificationWall
            isAuthenticated={isAuthenticated}
            onVerify={() => router.push("/profile")}
            onSignIn={() => router.replace("/login")}
          />
        ) : deal.type === "In-Store" ? (
          <InStoreRedemption dealId={deal.id} />
        ) : (
          <OnlineRedemption
            dealId={deal.id}
            code={deal.redemptionCode}
            storeUrl={deal.storeUrl}
          />
        )}
      </View>
    </ScrollView>
  );
}

function VerificationWall({
  isAuthenticated,
  onVerify,
  onSignIn,
}: {
  isAuthenticated: boolean;
  onVerify: () => void;
  onSignIn: () => void;
}) {
  return (
    <View style={styles.wall}>
      <BadgeCheck color={colors.onPrimaryContainer} size={22} />
      <Text style={styles.wallTitle}>Verification required</Text>
      <Text style={styles.wallBody}>
        Verify your student status to reveal online codes and generate in-store
        tickets.
      </Text>
      <Button
        label={isAuthenticated ? "Go to verification" : "Sign in to continue"}
        onPress={isAuthenticated ? onVerify : onSignIn}
      />
    </View>
  );
}

function OnlineRedemption({
  dealId,
  code,
  storeUrl,
}: {
  dealId: number;
  code: string | null;
  storeUrl: string | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const logEvent = useCallback(async (eventType: OnlineCodeEventType) => {
    await supabase.rpc("log_online_code_event", {
      target_deal_id: dealId,
      target_event_type: eventType,
    });
  }, [dealId]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    void logEvent("reveal");
  }, [logEvent]);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    void logEvent("copy");
    setTimeout(() => setCopied(false), 2000);
  }, [code, logEvent]);

  const handleStore = useCallback(async () => {
    if (!storeUrl) return;
    void logEvent("click_through");
    await Linking.openURL(storeUrl);
  }, [storeUrl, logEvent]);

  if (!code) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelBody}>
          No promo code is available for this deal yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Online code</Text>
      {!revealed ? (
        <Button label="Reveal promo code" onPress={handleReveal} />
      ) : (
        <>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{code}</Text>
          </View>
          <View style={styles.row}>
            <Button
              label={copied ? "Copied" : "Copy code"}
              variant="secondary"
              onPress={() => void handleCopy()}
              style={styles.flexBtn}
            />
            {storeUrl ? (
              <Button
                label="Go to store"
                variant="ghost"
                onPress={() => void handleStore()}
                style={styles.flexBtn}
              />
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

function InStoreRedemption({ dealId }: { dealId: number }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [alreadyActive, setAlreadyActive] = useState(false);
  const [alreadyRedeemed, setAlreadyRedeemed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const activeRef = useRef(true);

  const totalSeconds = TICKET_DURATION_MINUTES * 60;

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setAlreadyRedeemed(false);

    const { data, error: rpcError } = await supabase.rpc(
      "generate_instore_ticket",
      {
        target_deal_id: dealId,
        ticket_duration_minutes: TICKET_DURATION_MINUTES,
      },
    );

    if (!activeRef.current) return;

    if (rpcError) {
      setError(toErrorMessage(rpcError, "Could not generate ticket."));
      setIsGenerating(false);
      return;
    }

    const row = (data as InstoreTicketRow[] | null)?.[0];
    if (!row) {
      setError("Unexpected response from server.");
      setIsGenerating(false);
      return;
    }

    setTicketCode(row.ticket_code);
    setExpiresAt(new Date(row.expires_at));
    setAlreadyActive(row.already_active);
    setIsGenerating(false);
  }, [dealId]);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!expiresAt || alreadyRedeemed) return;

    const tick = () => {
      const left = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(left);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, alreadyRedeemed]);

  useEffect(() => {
    if (!ticketCode) return;

    const channel = supabase
      .channel(`ticket-${ticketCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "student_redemption_tickets",
          filter: `ticket_code=eq.${ticketCode}`,
        },
        (payload) => {
          const next = payload.new as { redeemed_at?: string | null };
          if (next?.redeemed_at) {
            setAlreadyRedeemed(true);
            setSecondsLeft(0);
          }
        },
      )
      .subscribe();

    const pollId = setInterval(() => {
      void (async () => {
        const { data } = await supabase
          .from("student_redemption_tickets")
          .select("redeemed_at")
          .eq("ticket_code", ticketCode)
          .maybeSingle();

        if (data?.redeemed_at) {
          setAlreadyRedeemed(true);
          setSecondsLeft(0);
        }
      })();
    }, 3000);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [ticketCode]);

  const expired = Boolean(ticketCode && !alreadyRedeemed && secondsLeft <= 0);
  const progress = useMemo(() => {
    if (!ticketCode || alreadyRedeemed) return 0;
    return Math.min(1, secondsLeft / totalSeconds);
  }, [ticketCode, alreadyRedeemed, secondsLeft, totalSeconds]);

  const qrValue = ticketCode ? `${TICKET_URI_PREFIX}${ticketCode}` : "";

  if (alreadyRedeemed) {
    return (
      <View style={[styles.panel, styles.panelSuccess]}>
        <CheckCircle2 color={colors.onPrimaryContainer} size={22} />
        <Text style={styles.panelSuccessTitle}>Redeemed successfully</Text>
        <Text style={styles.panelBody}>
          The partner has scanned your ticket. Enjoy the deal.
        </Text>
      </View>
    );
  }

  if (!ticketCode) {
    return (
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Store color={colors.primary} size={18} />
          <Text style={styles.panelTitle}>In-store ticket</Text>
        </View>
        <Text style={styles.panelBody}>
          Generate a live QR code to show at the register. Tickets expire in{" "}
          {TICKET_DURATION_MINUTES} minutes.
        </Text>
        {error ? <Text style={styles.errorInline}>{error}</Text> : null}
        <Button
          label="Generate ticket"
          loading={isGenerating}
          onPress={() => void generate()}
        />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>
        {expired
          ? "Ticket expired"
          : alreadyActive
            ? "Active ticket"
            : "Live ticket"}
      </Text>

      <View style={styles.qrWrap}>
        <QRCode
          value={qrValue}
          size={180}
          color={expired ? colors.outline : colors.primary}
          backgroundColor={colors.white}
          ecl="H"
        />
      </View>

      <Text style={styles.ticketCode}>{ticketCode}</Text>

      {!expired ? (
        <>
          <Text style={styles.countdown}>
            {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, "0")} remaining
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </>
      ) : (
        <Button
          label="Generate new ticket"
          onPress={() => {
            setTicketCode(null);
            setExpiresAt(null);
            void generate();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  hero: {
    width: "100%",
    height: 220,
    backgroundColor: colors.surfaceContainer,
  },
  heroFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  brand: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.onBackground,
  },
  discount: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chip: {
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: "700",
    color: colors.onPrimary,
    backgroundColor: colors.primary,
  },
  chipMuted: {
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainer,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.onSurfaceVariant,
  },
  wall: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
  },
  wallTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  wallBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onPrimaryContainer,
  },
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  panelSuccess: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.primaryContainer,
  },
  panelSuccessTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onBackground,
  },
  panelBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  codeBox: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
  },
  codeText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 2,
    color: colors.primary,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flexBtn: {
    flex: 1,
  },
  qrWrap: {
    alignSelf: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  ticketCode: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
    color: colors.onBackground,
  },
  countdown: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBackground,
  },
  errorBody: {
    fontSize: 14,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  errorInline: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
});
