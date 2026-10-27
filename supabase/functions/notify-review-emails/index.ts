/**
 * Emails admins when a manual student ID or brand application is waiting,
 * and emails plus pushes the applicant when that review is decided.
 *
 * Invoked only by Supabase Database Webhooks using the service-role JWT.
 * Clients must not call this function. Push stays on the existing
 * `deals-events` Android channel so a store build does not need a new one.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const ANDROID_CHANNEL_ID = "deals-events";
const TRANSACTIONAL_FROM = "Uni Deals <support@updates.unideals.co>";
const REPLY_TO = "unideals.lk@gmail.com";
const DEFAULT_TEAM_INBOX = "unideals.lk@gmail.com";
const MAIL_FOOTER = `<p style="color:#64748b;font-size:13px;line-height:1.5;margin:24px 0 0;">This inbox is not monitored. Email <a href="mailto:unideals.lk@gmail.com">unideals.lk@gmail.com</a> or use Contact in the Uni Deals app if you need to reach us.</p>`;

interface WebhookPayload {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
}

interface ExpoTicket {
  status?: string;
  details?: { error?: string };
}

interface PushTokenRow {
  expo_push_token: string | null;
}

type SupabaseAdmin = ReturnType<typeof createClient>;

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
    const padded = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4;
    const withPad =
      pad === 2 ? `${padded}==` : pad === 3 ? `${padded}=` : padded;
    const payload = JSON.parse(atob(withPad)) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function enteredStatus(
  type: string | undefined,
  record: Record<string, unknown> | null | undefined,
  oldRecord: Record<string, unknown> | null | undefined,
  status: string,
): boolean {
  if (asString(record?.status).toLowerCase() !== status) return false;
  if (type === "INSERT") return true;
  if (type !== "UPDATE" || !oldRecord) return false;
  return asString(oldRecord.status).toLowerCase() !== status;
}

function letter(title: string, paragraphs: string[]): string {
  const body = paragraphs
    .map(
      (paragraph) =>
        `<p style="color:#475569;line-height:1.5;">${paragraph}</p>`,
    )
    .join("");
  return `<div style="font-family:sans-serif;max-width:500px;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
    <h2 style="color:#0f172a;margin-top:0;">${title}</h2>
    ${body}
    <p style="color:#64748b;font-size:14px;margin-bottom:0;">Best regards,<br/><strong>The Uni Deals Team</strong></p>
    ${MAIL_FOOTER}
  </div>`;
}

async function sendEmail(
  resendKey: string,
  input: { to: string; subject: string; html: string },
): Promise<string | null> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: TRANSACTIONAL_FROM,
      reply_to: REPLY_TO,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });
  if (response.ok) return null;
  const detail = await response.text();
  console.error("Resend rejected the message:", detail);
  return "Could not send the email.";
}

async function accountOf(
  supabase: SupabaseAdmin,
  userId: string,
  fallbackEmail = "",
): Promise<{ email: string; name: string } | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    console.error("Could not load account:", error.message);
  }
  const email = asString(data?.user?.email) || fallbackEmail.trim();
  if (!email) return null;
  const metadata = data?.user?.user_metadata as
    | { full_name?: unknown }
    | undefined;
  const name = asString(metadata?.full_name) || "there";
  return { email, name };
}

async function sendUserPush(
  supabase: SupabaseAdmin,
  userId: string,
  title: string,
  body: string,
  data: { type: "verification" | "brand_application" },
): Promise<{ sent: number; error: string | null }> {
  const { data: rows, error } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", userId);

  if (error) {
    console.error("Could not load push tokens:", error.message);
    return { sent: 0, error: error.message };
  }

  const tokens = [
    ...new Set(
      ((rows ?? []) as PushTokenRow[])
        .map((row) => asString(row.expo_push_token))
        .filter((token) => token.length > 0),
    ),
  ];
  if (tokens.length === 0) return { sent: 0, error: null };

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      tokens.map((to) => ({
        to,
        title,
        body: clip(body, 160),
        sound: "default" as const,
        channelId: ANDROID_CHANNEL_ID,
        data,
      })),
    ),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Expo push failed:", detail);
    return { sent: 0, error: "Expo push failed" };
  }

  const payload = (await response.json()) as { data?: ExpoTicket[] };
  const deadTokens: string[] = [];
  let sent = 0;
  (payload.data ?? []).forEach((ticket, index) => {
    if (ticket.status === "ok") {
      sent += 1;
      return;
    }
    if (ticket.details?.error === "DeviceNotRegistered") {
      const token = tokens[index];
      if (token) deadTokens.push(token);
    }
  });

  if (deadTokens.length > 0) {
    await supabase.from("push_tokens").delete().in("expo_push_token", deadTokens);
  }

  return { sent, error: null };
}

async function emailAndPush(
  supabase: SupabaseAdmin,
  resendKey: string,
  input: {
    userId: string;
    fallbackEmail?: string;
    subject: string;
    html: (name: string) => string;
    pushTitle: string;
    pushBody: string;
    pushType: "verification" | "brand_application";
  },
): Promise<Response> {
  const account = await accountOf(
    supabase,
    input.userId,
    input.fallbackEmail ?? "",
  );
  if (!account) {
    return jsonResponse({ ok: true, skipped: true, reason: "no_email" });
  }

  const emailError = await sendEmail(resendKey, {
    to: account.email,
    subject: input.subject,
    html: input.html(account.name),
  });
  if (emailError) {
    return jsonResponse({ error: emailError }, 502);
  }

  const push = await sendUserPush(
    supabase,
    input.userId,
    input.pushTitle,
    input.pushBody,
    { type: input.pushType },
  );
  return jsonResponse({
    ok: true,
    emailed: true,
    pushSent: push.sent,
    ...(push.error ? { pushError: push.error } : {}),
  });
}

async function handleVerification(
  supabase: SupabaseAdmin,
  resendKey: string,
  teamInbox: string,
  payload: WebhookPayload,
): Promise<Response> {
  const record = payload.record;
  if (!record) {
    return jsonResponse({ ok: true, skipped: true, reason: "missing_record" });
  }

  const method = asString(record.method).toLowerCase();
  const userId = asString(record.user_id);
  const reason =
    asString(record.reject_reason) || "Your verification was not approved.";

  if (
    method === "manual" &&
    enteredStatus(payload.type, record, payload.old_record, "pending")
  ) {
    const institution = asString(record.institution_name) || "Not provided";
    const institutionType = asString(record.institution_type) || "manual";
    const studentId = asString(record.student_id_number) || "Not provided";
    const contact = asString(record.contact_email) || "Not provided";
    const emailError = await sendEmail(resendKey, {
      to: teamInbox,
      subject: "New student ID waiting for review",
      html: letter("A student ID needs review", [
        "A manual student verification is waiting in the admin queue.",
        `<strong>Institution:</strong> ${escapeHtml(institution)} (${escapeHtml(institutionType)})<br/><strong>Student ID:</strong> ${escapeHtml(studentId)}<br/><strong>Contact:</strong> ${escapeHtml(contact)}`,
        "Open Admin → Verifications in the Uni Deals app or website to approve or reject it.",
      ]),
    });
    if (emailError) return jsonResponse({ error: emailError }, 502);
    return jsonResponse({ ok: true, emailed: "admin" });
  }

  if (
    payload.type === "UPDATE" &&
    payload.old_record &&
    method === "manual" &&
    asString(payload.old_record.status).toLowerCase() !== "approved" &&
    asString(record.status).toLowerCase() === "approved" &&
    userId
  ) {
    return emailAndPush(supabase, resendKey, {
      userId,
      fallbackEmail: asString(record.contact_email),
      subject: "Your Uni Deals student ID is verified",
      html: (name) =>
        letter(`Hi ${escapeHtml(name)},`, [
          "Your student ID was approved. Your Student Pass, online promo codes, and in-store tickets are unlocked for 12 months.",
          "Open Profile in the Uni Deals app or website if the pass has not refreshed yet.",
        ]),
      pushTitle: "Student ID verified",
      pushBody:
        "Your Student Pass, promo codes, and in-store tickets are now unlocked.",
      pushType: "verification",
    });
  }

  if (
    payload.type === "UPDATE" &&
    payload.old_record &&
    asString(payload.old_record.status).toLowerCase() !== "rejected" &&
    asString(record.status).toLowerCase() === "rejected" &&
    userId
  ) {
    return emailAndPush(supabase, resendKey, {
      userId,
      fallbackEmail: asString(record.contact_email),
      subject: "Your Uni Deals verification was not approved",
      html: (name) =>
        letter(`Hi ${escapeHtml(name)},`, [
          "We reviewed your student verification request and could not approve it this time.",
          `<strong>Reason:</strong> ${escapeHtml(reason)}`,
          "Open Profile in the Uni Deals app or website, then submit a new request with a clear photo of the front and back of your student ID.",
        ]),
      pushTitle: "Verification update",
      pushBody:
        reason ||
        "Your student ID request needs an update. Tap to review and resubmit.",
      pushType: "verification",
    });
  }

  return jsonResponse({ ok: true, skipped: true, reason: "not_a_review_event" });
}

async function handleBrand(
  supabase: SupabaseAdmin,
  resendKey: string,
  teamInbox: string,
  payload: WebhookPayload,
): Promise<Response> {
  const record = payload.record;
  if (!record) {
    return jsonResponse({ ok: true, skipped: true, reason: "missing_record" });
  }

  const brandName = asString(record.name) || "A brand";
  const applicantId = asString(record.applicant_user_id);
  const reason = asString(record.rejection_reason);

  if (enteredStatus(payload.type, record, payload.old_record, "pending")) {
    const details = [
      detail("Brand", brandName),
      detail("Category", asString(record.category)),
      detail("Contact", asString(record.contact_name)),
      detail("Phone", asString(record.contact_phone)),
      detail("Website", asString(record.website_url)),
      detail("Instagram", asString(record.instagram_handle)),
      detail("TikTok", asString(record.tiktok_handle)),
    ].filter((line) => line.length > 0);
    const emailError = await sendEmail(resendKey, {
      to: teamInbox,
      subject: `New brand application: ${clip(brandName, 80)}`,
      html: letter("A brand application needs review", [
        details.join("<br/>"),
        "Open Admin → Brand applications in the Uni Deals app or website to approve or reject it.",
      ]),
    });
    if (emailError) return jsonResponse({ error: emailError }, 502);
    return jsonResponse({ ok: true, emailed: "admin" });
  }

  const decided =
    payload.type === "UPDATE" &&
    payload.old_record &&
    asString(payload.old_record.status).toLowerCase() === "pending" &&
    applicantId;

  if (decided && asString(record.status).toLowerCase() === "approved") {
    return emailAndPush(supabase, resendKey, {
      userId: applicantId,
      subject: `${clip(brandName, 80)} is approved on Uni Deals`,
      html: (name) =>
        letter(`Hi ${escapeHtml(name)},`, [
          `<strong>${escapeHtml(brandName)}</strong> is approved. This account is now a partner and can publish offers.`,
          "Sign out and back in if the partner tools are not open yet.",
        ]),
      pushTitle: "Brand application approved",
      pushBody: `${brandName} is approved on Uni Deals. Open the app to access Partner tools.`,
      pushType: "brand_application",
    });
  }

  if (decided && asString(record.status).toLowerCase() === "rejected") {
    return emailAndPush(supabase, resendKey, {
      userId: applicantId,
      subject: `Update on your ${clip(brandName, 60)} application`,
      html: (name) =>
        letter(`Hi ${escapeHtml(name)},`, [
          `We could not approve <strong>${escapeHtml(brandName)}</strong> this time.`,
          reason
            ? `<strong>Reason:</strong> ${escapeHtml(reason)}`
            : "No extra reason was provided.",
          "Open Profile → Become a partner in the Uni Deals app or website, update the details, and submit again.",
        ]),
      pushTitle: "Brand application update",
      pushBody:
        reason ||
        "Your brand application was not approved. Tap to review and update.",
      pushType: "brand_application",
    });
  }

  return jsonResponse({ ok: true, skipped: true, reason: "not_a_review_event" });
}

function detail(label: string, value: string): string {
  if (!value) return "";
  return `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`;
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

  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!resendKey || !supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Missing Supabase or Resend env" }, 500);
  }

  const teamInbox = Deno.env.get("ADMIN_NOTIFY_EMAIL")?.trim() || DEFAULT_TEAM_INBOX;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const table = asString(payload.table);

  if (table === "manual_verifications") {
    return handleVerification(supabase, resendKey, teamInbox, payload);
  }
  if (table === "brands") {
    return handleBrand(supabase, resendKey, teamInbox, payload);
  }

  return jsonResponse({ ok: true, skipped: true, reason: "unsupported_table" });
});
