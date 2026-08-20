/**
 * Sends Expo pushes to every student device when a deal is published or an
 * event is approved. Invoked only by Supabase Database Webhooks using the
 * service-role JWT — clients must not call this function.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_CHUNK_SIZE = 100;
const ANDROID_CHANNEL_ID = "deals-events";

interface WebhookPayload {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound: "default";
  channelId: string;
  data: { type: "deal" | "event"; id: string };
}

interface ExpoTicket {
  status?: string;
  message?: string;
  details?: { error?: string };
}

interface PushTokenRow {
  expo_push_token: string | null;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jwtRole(authHeader: string | null): string | null {
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const payloadPart = token.split(".")[1];
  if (!payloadPart) return null;
  try {
    const padded = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const pad = padded.length % 4;
    const withPad =
      pad === 2 ? `${padded}==` : pad === 3 ? `${padded}=` : padded;
    const json = atob(withPad);
    const payload = JSON.parse(json) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function isNewlyApproved(
  type: string | undefined,
  record: Record<string, unknown> | null | undefined,
  oldRecord: Record<string, unknown> | null | undefined,
): boolean {
  if (asString(record?.status).toLowerCase() !== "approved") return false;
  if (type === "INSERT") return true;
  if (type === "UPDATE") {
    return asString(oldRecord?.status).toLowerCase() !== "approved";
  }
  return false;
}

function buildMessage(
  table: string | undefined,
  record: Record<string, unknown>,
): ExpoMessage | null {
  const id = asString(record.id);
  if (!id) return null;

  if (table === "deals") {
    const brand = asString(record.brand);
    const discount = asString(record.discount);
    const title = asString(record.title) || "New student offer";
    const lead = [brand, discount].filter(Boolean).join(" · ");
    return {
      to: "",
      title: "New deal",
      body: lead ? `${lead} — ${title}` : title,
      sound: "default",
      channelId: ANDROID_CHANNEL_ID,
      data: { type: "deal", id },
    };
  }

  if (table === "events") {
    const title = asString(record.title) || "A new campus event";
    return {
      to: "",
      title: "New event",
      body: title,
      sound: "default",
      channelId: ANDROID_CHANNEL_ID,
      data: { type: "event", id },
    };
  }

  return null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (jwtRole(req.headers.get("Authorization")) !== "service_role") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (!isNewlyApproved(payload.type, payload.record, payload.old_record)) {
    return jsonResponse({ ok: true, skipped: true, reason: "not_newly_approved" });
  }

  const record = payload.record;
  if (!record) {
    return jsonResponse({ ok: true, skipped: true, reason: "missing_record" });
  }

  const template = buildMessage(payload.table, record);
  if (!template) {
    return jsonResponse({ ok: true, skipped: true, reason: "unsupported_table" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Missing Supabase env" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: tokenRows, error: tokenError } = await supabase.rpc(
    "list_student_push_tokens",
  );

  if (tokenError) {
    return jsonResponse({ error: tokenError.message }, 500);
  }

  const tokens = [
    ...new Set(
      (tokenRows ?? []).flatMap((row) => {
        if (typeof row === "string" && row.length > 0) return [row];
        if (row && typeof row === "object") {
          const token = (row as PushTokenRow).expo_push_token ?? "";
          return token.length > 0 ? [token] : [];
        }
        return [];
      }),
    ),
  ];

  if (tokens.length === 0) {
    return jsonResponse({ ok: true, sent: 0 });
  }

  const messages: ExpoMessage[] = tokens.map((to) => ({ ...template, to }));
  const deadTokens: string[] = [];
  let sent = 0;

  for (const group of chunk(messages, EXPO_CHUNK_SIZE)) {
    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(group),
    });

    if (!expoResponse.ok) {
      const detail = await expoResponse.text();
      return jsonResponse(
        { error: "Expo push failed", status: expoResponse.status, detail },
        502,
      );
    }

    const body = (await expoResponse.json()) as { data?: ExpoTicket[] };
    const tickets = body.data ?? [];
    tickets.forEach((ticket, index) => {
      if (ticket.status === "ok") {
        sent += 1;
        return;
      }
      if (ticket.details?.error === "DeviceNotRegistered") {
        const token = group[index]?.to;
        if (token) deadTokens.push(token);
      }
    });
  }

  if (deadTokens.length > 0) {
    await supabase.from("push_tokens").delete().in("expo_push_token", deadTokens);
  }

  return jsonResponse({ ok: true, sent, pruned: deadTokens.length });
});
