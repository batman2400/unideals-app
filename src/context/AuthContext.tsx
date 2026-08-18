/**
 * AuthContext
 *
 * Single source of truth for session + role on mobile. It merges the two
 * pieces the web app keeps apart — the session bootstrap in `App.jsx` and the
 * role resolution in `src/lib/useRole.js` — into one provider.
 *
 * Role resolution follows the web app exactly:
 *   1. `get_user_role()` RPC is authoritative.
 *   2. `public.user_roles` is read for `is_verified`, and acts as the fallback
 *      role source when the RPC fails.
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

import { supabase, toErrorMessage } from "@/lib/supabase";
import { getPasswordResetRedirectUrl } from "@/lib/authDeepLink";
import { signInWithGoogle as startGoogleSignIn } from "@/lib/googleAuth";
import { isUserRole, type UserMetadata, type UserRole } from "@/types/database";

interface UserRoleLookup {
  role: UserRole | null;
  is_verified: boolean | null;
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
  /** Resolved application role. `null` until the first resolution completes. */
  role: UserRole | null;
  /** `true` while the initial session + role resolution is in flight. */
  isLoading: boolean;
  /** Mirrors `user_roles.is_verified` — student verification status. */
  isVerified: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const resolvedForUserIdRef = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const channelUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

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
    const readRole = async (
      userId: string,
    ): Promise<{ role: UserRole; isVerified: boolean }> => {
      const [rpcResponse, rowResponse] = await Promise.all([
        supabase.rpc("get_user_role"),
        supabase
          .from("user_roles")
          .select("role, is_verified")
          .eq("user_id", userId)
          .maybeSingle<UserRoleLookup>(),
      ]);

      const rpcRole = isUserRole(rpcResponse.data) ? rpcResponse.data : null;
      const rowRole = isUserRole(rowResponse.data?.role)
        ? rowResponse.data.role
        : null;

      if (rpcResponse.error && rowResponse.error) {
        throw rpcResponse.error;
      }

      const resolvedRole = rpcRole ?? rowRole;
      if (resolvedRole) {
        return {
          role: resolvedRole,
          isVerified: rowResponse.data?.is_verified === true,
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
        isVerified: rowResponse.data?.is_verified === true,
      };
    };

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
            void resolve(null, true);
          },
        )
        .subscribe();

      channelUserIdRef.current = userId;
    };

    const resolve = async (
      sessionOverride: Session | null,
      isBackgroundRefresh: boolean,
    ): Promise<void> => {
      if (!active) return;

      try {
        setError(null);

        let nextSession = sessionOverride;

        if (!nextSession) {
          const { data, error: sessionError } =
            await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          nextSession = data.session;
        }

        if (!active) return;

        const nextUserId = nextSession?.user?.id ?? null;
        const sessionChanged = resolvedForUserIdRef.current !== nextUserId;

        // Hold the splash until this session's role is known — including
        // re-login after a previous user already resolved once.
        if (!isBackgroundRefresh && sessionChanged) {
          setIsLoading(true);
        }

        setSession(nextSession);

        const nextUser = nextSession?.user ?? null;
        attachRoleChannel(nextUser?.id ?? null);

        if (!nextUser) {
          setRole(null);
          setIsVerified(false);
          resolvedForUserIdRef.current = null;
          return;
        }

        if (sessionChanged) {
          setRole(null);
          setIsVerified(false);
        }

        const resolved = await readRole(nextUser.id);
        if (!active) return;

        setRole(resolved.role);
        setIsVerified(resolved.isVerified);
        resolvedForUserIdRef.current = nextUser.id;
      } catch (caught) {
        if (!active) return;
        // Keep the last known role on transient failures so the UI does not
        // bounce a signed-in partner back to the student experience.
        setError(toErrorMessage(caught, "Failed to load user role."));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void resolve(null, false);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession: Session | null) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        } else if (event === "SIGNED_OUT") {
          setIsPasswordRecovery(false);
        }

        const isBackground =
          event === "TOKEN_REFRESHED" || event === "USER_UPDATED";
        void resolve(nextSession, isBackground);
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
      detachRoleChannel();
    };
  }, [refreshKey]);

  const refreshRole = useCallback(() => {
    setRefreshKey((previous) => previous + 1);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
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
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
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

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    return startGoogleSignIn();
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const { error: signOutError } = await supabase.auth.signOut();
    setIsPasswordRecovery(false);

    return {
      error: signOutError
        ? toErrorMessage(signOutError, "Unable to sign out.")
        : null,
    };
  }, []);

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
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const user = session?.user ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      role,
      isLoading,
      isVerified,
      isAuthenticated: user !== null,
      isPasswordRecovery,
      error,
      metadata: (user?.user_metadata ?? {}) as UserMetadata,
      signIn,
      signUp,
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
      isPasswordRecovery,
      error,
      signIn,
      signUp,
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
