import { supabase, toErrorMessage } from "@/lib/supabase";

async function messageFromFunctionError(error: unknown): Promise<string | null> {
  const context = (error as { context?: { json?: () => Promise<unknown> } })
    ?.context;
  if (context && typeof context.json === "function") {
    try {
      const body = (await context.json()) as { error?: string };
      if (body?.error) return String(body.error);
    } catch {
      /* ignore unreadable function payloads */
    }
  }
  return null;
}

/**
 * Deletes the signed-in caller's Auth user via the shared delete-account
 * Edge Function. The function never accepts a target user id.
 */
export async function deleteOwnAccount(): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (sessionError || !accessToken) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase.functions.invoke("delete-account", {
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {},
  });

  if (error) {
    const fromBody = await messageFromFunctionError(error);
    throw new Error(
      fromBody || toErrorMessage(error, "Could not delete your account. Please try again."),
    );
  }

  const payload = data as { success?: boolean; error?: string } | null;
  if (payload?.success === false) {
    throw new Error(
      payload.error || "Could not delete your account. Please try again.",
    );
  }
}
