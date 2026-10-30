/**
 * AuthContext
 *
 * Single source of truth for session + role on mobile. It merges the two
 * pieces the web app keeps apart — the session bootstrap in `App.jsx` and the
 * role resolution in `src/lib/useRole.js` — into one provider.
 *
 * Cold start only blocks the splash on the local session restore
 * (`onAuthStateChange` / `INITIAL_SESSION`). Last-known role is rehydrated
 * from disk so partner/admin routes do not flicker, then `get_user_role()`
 * and `user_roles` refresh in the background.
 *
 * Role resolution follows the web app exactly:
 *   1. `get_user_role()` RPC is authoritative.
 *   2. `public.user_roles` is read for `is_verified` / `verified_at`, and acts
 *      as the fallback role source when the RPC fails. Student verification
 *      is current for 12 months from `verified_at`.
 *   3. A realtime subscription on the caller's `user_roles` row keeps the role
 *      fresh when an admin promotes or verifies the account mid-session.
 */
import type {
  AuthChangeEvent,
  RealtimeChannel,
  Session,
  User,
} from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getOAuthRedirectUrl,
  getPasswordResetRedirectUrl,
} from "@/lib/authDeepLink";
import { signInWithApple as startAppleSignIn } from "@/lib/appleAuth";
import { signInWithGoogle as startGoogleSignIn } from "@/lib/googleAuth";
import {
  clearCachedUserRole,
  clearPasswordRecoveryUser,
  readCachedUserRole,
  readPasswordRecoveryUser,
  writeCachedUserRole,
  writePasswordRecoveryUser,
  type CachedUserRole,
} from "@/lib/roleCache";
import {
  isStudentVerificationCurrent,
  isStudentVerificationExpired,
  isStudentVerificationExpiringSoon,
  studentVerificationExpiresAt,
} from "@/lib/studentVerification";
import {
  registerStudentPushToken,
  subscribeToPushTokenRefresh,
  unregisterDevicePushToken,
} from "@/lib/pushNotifications";
import {
  abortInFlightRequests,
  clearPersistedSession,
  subscribeToAppResume,
  supabase,
  toErrorMessage,
} from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { isUserRole, type UserMetadata, type UserRole } from "@/types/database";

const PUSH_UNREGISTER_TIMEOUT_MS = 4_000;
const SIGN_OUT_TIMEOUT_MS = 8_000;
const SIGN_OUT_CLEANUP_TIMEOUT_MS = 6_000;

interface UserRoleLookup {
  role: UserRole | null;
  is_verified: boolean | null;
  verified_at?: string | null;
}

export interface SignUpDetails {
  fullName: string;
  username: string;
}

export interface AuthResult {
  error: string | null;
}

export interface AuthContextValue {
  /** Authenticated Supabase user, or `null` when signed out. */
  user: User | null;
  /** Active Supabase session, or `null` when signed out. */
  session: Session | null;
  /** Resolved application role. `null` until cache or network resolution. */
  role: UserRole | null;
  /**
   * `true` only while the initial session restore is in flight. Role may
   * still refresh in the background after this becomes `false`.
   */
  isLoading: boolean;
  /**
   * Student perks are unlocked only while verification is current.
   * Students must re-verify every 12 months.
   */
  isVerified: boolean;
  /** Last student verification approval (`user_roles.verified_at`). */
  verifiedAt: string | null;
  /** 12 months after `verifiedAt`, or `null` when never verified. */
  verificationExpiresAt: string | null;
  /** Previously verified student whose 12-month window has ended. */
  isVerificationExpired: boolean;
  /** Verified student within 30 days of the yearly renewal deadline. */
  isVerificationExpiringSoon: boolean;
  isAuthenticated: boolean;
  /**
   * `true` only after a password-recovery deep link / `PASSWORD_RECOVERY`
   * auth event. Used so the reset screen is not treated as the app home.
   */
  isPasswordRecovery: boolean;
  /** Last role-resolution error, surfaced for diagnostics. */
  error: string | null;
  /** Convenience view over `auth.users.user_metadata`. */
  metadata: UserMetadata;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    details: SignUpDetails,
  ) => Promise<AuthResult>;
  signInWithApple: () => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  /** Marks the session as a password-recovery flow (from deep link). */
  beginPasswordRecovery: () => void;
  clearPasswordRecovery: () => void;
  refreshRole: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_ROLE: UserRole = "student";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedForUserIdRef = useRef<string | null>(null);
  const sessionUserIdRef = useRef<string | null>(null);
  /**
   * Set when sign-out gives up on the network and clears the device itself.
   * A token refresh that was already in flight can otherwise finish afterwards
   * and sign the user back in.
   */
  const ignoreSessionRestoreRef = useRef(false);
  const roleRequestIdRef = useRef(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const channelUserIdRef = useRef<string | null>(null);
  const fetchRoleRef = useRef<(userId: string) => void>(() => {});

  useEffect(() => {
    let active = true;
    let memoryCache: CachedUserRole | null = null;
    let diskCacheSettled = false;

    const diskCachePromise = readCachedUserRole().then((value) => {
      if (!diskCacheSettled) {
        memoryCache = value;
        diskCacheSettled = true;
      }
      return memoryCache;
    });

    const detachRoleChannel = (): void => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      channelUserIdRef.current = null;
    };

    /**
     * Reads the role for `userId`, preferring the RPC and falling back to a
     * direct `user_roles` read. Always returns a verification flag.
     */
    const readRoleRow = async (
      userId: string,
      includeVerifiedAt: boolean,
    ) => {
      const { data: rows, error } = await supabase
        .from("user_roles")
        .select(includeVerifiedAt ? "role, is_verified, verified_at" : "role, is_verified")
        .eq("user_id", userId)
        .limit(1);
      const data = ((Array.isArray(rows) ? rows[0] : rows) ??
        null) as UserRoleLookup | null;
      return { data, error };
    };

    const readRole = async (
      userId: string,
    ): Promise<{ role: UserRole; isVerified: boolean; verifiedAt: string | null }> => {
      try {
        await supabase.rpc("expire_stale_student_verifications");
      } catch {
        // SQL may not be applied yet; client still enforces the 12-month window.
      }

      let [rpcResponse, rowResponse] = await Promise.all([
        supabase.rpc("get_user_role"),
        readRoleRow(userId, true),
      ]);

      if (
        rowResponse.error &&
        /verified_at/i.test(rowResponse.error.message ?? "")
      ) {
        rowResponse = await readRoleRow(userId, false);
      }

      const rpcRole = isUserRole(rpcResponse.data) ? rpcResponse.data : null;
      const rowRole = isUserRole(rowResponse.data?.role)
        ? rowResponse.data.role
        : null;

      if (rpcResponse.error && rowResponse.error) {
        throw rpcResponse.error;
      }

      const resolvedRole = rpcRole ?? rowRole ?? null;
      const verifiedAt =
        typeof rowResponse.data?.verified_at === "string"
          ? rowResponse.data.verified_at
          : null;
      const verifiedFlag = rowResponse.data?.is_verified === true;
      const currentlyVerified =
        resolvedRole === "student"
          ? isStudentVerificationCurrent(verifiedFlag, verifiedAt)
          : verifiedFlag;

      if (resolvedRole) {
        return {
          role: resolvedRole,
          isVerified: currentlyVerified,
          verifiedAt,
        };
      }

      // No role from either source. Default to student only when both queries
      // succeeded and the user has no row yet — never on a fetch error.
      if (rpcResponse.error || rowResponse.error) {
        throw (
          rpcResponse.error ??
          rowResponse.error ??
          new Error("Failed to load user role.")
        );
      }

      return {
        role: DEFAULT_ROLE,
        isVerified: currentlyVerified,
        verifiedAt,
      };
    };

    const hydrateRoleFromCache = (
      userId: string,
      cached: CachedUserRole | null,
    ): void => {
      if (cached && cached.userId === userId) {
        const currentlyVerified =
          cached.role === "student"
            ? isStudentVerificationCurrent(cached.isVerified, cached.verifiedAt)
            : cached.isVerified;
        setRole(cached.role);
        setIsVerified(currentlyVerified);
        setVerifiedAt(cached.verifiedAt);
        resolvedForUserIdRef.current = userId;
        return;
      }

      if (resolvedForUserIdRef.current !== userId) {
        setRole(null);
        setIsVerified(false);
        setVerifiedAt(null);
      }
    };

    const fetchRole = (userId: string): void => {
      const requestId = ++roleRequestIdRef.current;

      void (async () => {
        try {
          const resolved = await readRole(userId);
          if (!active || requestId !== roleRequestIdRef.current) return;
          if (sessionUserIdRef.current !== userId) return;

          setRole(resolved.role);
          setIsVerified(resolved.isVerified);
          setVerifiedAt(resolved.verifiedAt);
          resolvedForUserIdRef.current = userId;
          setError(null);

          memoryCache = {
            userId,
            role: resolved.role,
            isVerified: resolved.isVerified,
            verifiedAt: resolved.verifiedAt,
          };
          diskCacheSettled = true;
          void writeCachedUserRole(memoryCache);
        } catch (caught) {
          if (!active || requestId !== roleRequestIdRef.current) return;
          // Keep the last known role on transient failures so the UI does not
          // bounce a signed-in partner back to the student experience.
          setError(toErrorMessage(caught, "Failed to load user role."));
        }
      })();
    };

    fetchRoleRef.current = fetchRole;

    const attachRoleChannel = (userId: string | null): void => {
      if (!userId) {
        detachRoleChannel();
        return;
      }

      if (channelRef.current && channelUserIdRef.current === userId) {
        return;
      }

      detachRoleChannel();

      channelRef.current = supabase
        .channel(`user-role-sync-${userId}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_roles",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            fetchRole(userId);
          },
        )
        .subscribe();

      channelUserIdRef.current = userId;
    };

    const applySession = async (
      nextSession: Session | null,
      refreshRoleFromNetwork: boolean,
      forceRecovery: boolean,
    ): Promise<void> => {
      if (!active) return;

      if (ignoreSessionRestoreRef.current && nextSession) {
        clearPersistedSession();
        return;
      }
      if (!nextSession) {
        ignoreSessionRestoreRef.current = false;
      }

      const nextUserId = nextSession?.user?.id ?? null;
      sessionUserIdRef.current = nextUserId;
      setSession(nextSession);
      attachRoleChannel(nextUserId);

      if (!nextUserId) {
        roleRequestIdRef.current += 1;
        setRole(null);
        setIsVerified(false);
        setVerifiedAt(null);
        resolvedForUserIdRef.current = null;
        setError(null);
        setIsPasswordRecovery(false);
        memoryCache = null;
        diskCacheSettled = true;
        setIsLoading(false);
        void clearCachedUserRole();
        void clearPasswordRecoveryUser();
        return;
      }

      if (forceRecovery) {
        setIsPasswordRecovery(true);
        void writePasswordRecoveryUser(nextUserId);
      } else {
        const recoveryUserId = await readPasswordRecoveryUser();
        if (!active || sessionUserIdRef.current !== nextUserId) return;
        if (recoveryUserId === nextUserId) {
          setIsPasswordRecovery(true);
        }
      }

      if (resolvedForUserIdRef.current !== nextUserId) {
        if (!diskCacheSettled) {
          await diskCachePromise;
        }
        if (!active || sessionUserIdRef.current !== nextUserId) return;
        hydrateRoleFromCache(nextUserId, memoryCache);
      }

      setIsLoading(false);

      // Token refresh / user-updated should not refetch role unless this
      // user has not been resolved yet (cache miss on a TOKEN_REFRESHED-first
      // cold start).
      if (
        refreshRoleFromNetwork ||
        resolvedForUserIdRef.current !== nextUserId
      ) {
        fetchRole(nextUserId);
      }
    };

    void supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        if (!active) return;
        void applySession(currentSession, true, false);
      })
      .catch(() => {
        if (!active) return;
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession: Session | null) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        } else if (event === "SIGNED_OUT") {
          setIsPasswordRecovery(false);
        }

        const refreshRoleFromNetwork =
          event !== "TOKEN_REFRESHED" && event !== "USER_UPDATED";
        void applySession(
          nextSession,
          refreshRoleFromNetwork,
          event === "PASSWORD_RECOVERY",
        );
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
      detachRoleChannel();
    };
  }, []);

  const userId = session?.user?.id;

  useEffect(() => {
    if (isLoading || isPasswordRecovery || !userId) return;

    if (role === "student") {
      void registerStudentPushToken();
      return subscribeToPushTokenRefresh();
    }

    if (role === "partner" || role === "admin") {
      void unregisterDevicePushToken();
    }
  }, [isLoading, isPasswordRecovery, userId, role]);

  const refreshRole = useCallback(() => {
    const userId = sessionUserIdRef.current;
    if (userId) fetchRoleRef.current(userId);
  }, []);

  useEffect(() => subscribeToAppResume(refreshRole), [refreshRole]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      ignoreSessionRestoreRef.current = false;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      return {
        error: signInError
          ? toErrorMessage(signInError, "Unable to sign in.")
          : null,
      };
    },
    [],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      details: SignUpDetails,
    ): Promise<AuthResult> => {
      ignoreSessionRestoreRef.current = false;
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: getOAuthRedirectUrl(),
          data: {
            full_name: details.fullName.trim(),
            username: details.username.trim(),
          },
        },
      });

      return {
        error: signUpError
          ? toErrorMessage(signUpError, "Unable to create account.")
          : null,
      };
    },
    [],
  );

  const signInWithApple = useCallback(async (): Promise<AuthResult> => {
    ignoreSessionRestoreRef.current = false;
    return startAppleSignIn();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    ignoreSessionRestoreRef.current = false;
    return startGoogleSignIn();
  }, []);

  const dropLocalSession = useCallback(() => {
    ignoreSessionRestoreRef.current = true;
    sessionUserIdRef.current = null;
    roleRequestIdRef.current += 1;
    clearPersistedSession();
    setSession(null);
    setRole(null);
    setIsVerified(false);
    setVerifiedAt(null);
    setError(null);
    setIsPasswordRecovery(false);
    setIsLoading(false);
    void clearCachedUserRole();
    void clearPasswordRecoveryUser();
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    // Push removal needs the session. Cap it so a request stuck after the
    // app was backgrounded cannot hold the sign-out button on "Signing out…".
    await withTimeout(
      unregisterDevicePushToken(),
      PUSH_UNREGISTER_TIMEOUT_MS,
      "Push token removal timed out.",
    ).catch((error: unknown) => {
      console.warn("[auth] Push token removal skipped:", error);
      abortInFlightRequests();
    });

    const pending = supabase.auth.signOut();

    const settled = async (signOutError: { message?: string } | null): Promise<AuthResult> => {
      setIsPasswordRecovery(false);
      void clearPasswordRecoveryUser();
      if (!signOutError) return { error: null };

      const stillSignedIn = await withTimeout(
        supabase.auth.getSession(),
        2_000,
        "Session check timed out.",
      ).catch(() => null);
      if (!stillSignedIn) {
        dropLocalSession();
        return { error: null };
      }
      if (!stillSignedIn.data.session) return { error: null };

      return {
        error: toErrorMessage(signOutError, "Unable to sign out."),
      };
    };

    try {
      const { error: signOutError } = await withTimeout(
        pending,
        SIGN_OUT_TIMEOUT_MS,
        "Sign out timed out.",
      );
      return settled(signOutError);
    } catch (caught) {
      console.warn(
        "[auth] Sign out did not finish. Cancelling it and clearing the local session.",
        caught,
      );
      abortInFlightRequests();
      try {
        const { error: signOutError } = await withTimeout(
          pending,
          SIGN_OUT_CLEANUP_TIMEOUT_MS,
          "Sign out cleanup timed out.",
        );
        return settled(signOutError);
      } catch (cleanupError) {
        console.warn(
          "[auth] Local session cleared without a server response.",
          cleanupError,
        );
        abortInFlightRequests();
        dropLocalSession();
        return { error: null };
      }
    }
  }, [dropLocalSession]);

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: getPasswordResetRedirectUrl() },
      );

      return {
        error: resetError
          ? toErrorMessage(resetError, "Unable to send reset email.")
          : null,
      };
    },
    [],
  );

  const beginPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(true);
    const userId = sessionUserIdRef.current;
    if (userId) void writePasswordRecoveryUser(userId);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
    void clearPasswordRecoveryUser();
  }, []);

  const user = session?.user ?? null;
  const isStudent = role === "student";
  const verificationExpiresAt = isStudent
    ? (studentVerificationExpiresAt(verifiedAt)?.toISOString() ?? null)
    : null;
  const isVerificationExpired =
    isStudent && isStudentVerificationExpired(verifiedAt);
  const isVerificationExpiringSoon =
    isStudent && isStudentVerificationExpiringSoon(isVerified, verifiedAt);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      role,
      isLoading,
      isVerified,
      verifiedAt,
      verificationExpiresAt,
      isVerificationExpired,
      isVerificationExpiringSoon,
      isAuthenticated: user !== null,
      isPasswordRecovery,
      error,
      metadata: (user?.user_metadata ?? {}) as UserMetadata,
      signIn,
      signUp,
      signInWithApple,
      signInWithGoogle,
      signOut,
      resetPassword,
      beginPasswordRecovery,
      clearPasswordRecovery,
      refreshRole,
    }),
    [
      user,
      session,
      role,
      isLoading,
      isVerified,
      verifiedAt,
      verificationExpiresAt,
      isVerificationExpired,
      isVerificationExpiringSoon,
      isPasswordRecovery,
      error,
      signIn,
      signUp,
      signInWithApple,
      signInWithGoogle,
      signOut,
      resetPassword,
      beginPasswordRecovery,
      clearPasswordRecovery,
      refreshRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }

  return context;
}
