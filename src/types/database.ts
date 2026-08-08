/**
 * Types for the Uni Deals Supabase schema.
 *
 * These mirror the tables and RPC signatures defined in the SQL migrations at
 * the root of the web repository (`supabase_schema.sql`,
 * `supabase_partner_access.sql`, `supabase_portal_redesign.sql`,
 * `supabase_deal_auto_launch.sql`, `supabase_student_verification.sql`).
 */

export type UserRole = "student" | "partner" | "admin";

export const USER_ROLES: readonly UserRole[] = ["student", "partner", "admin"];

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" && USER_ROLES.includes(value as UserRole)
  );
}

/** `public.deals.type` */
export type DealType = "Online" | "In-Store";

/** `public.deals.status` */
export type DealStatus = "pending" | "approved" | "rejected";

/** Row shape of `public.user_roles`. */
export interface UserRoleRow {
  user_id: string;
  role: UserRole;
  user_email: string | null;
  is_verified: boolean;
  university_email: string | null;
  created_at: string;
}

/**
 * Row returned by the `get_public_deals()` / `get_public_deal_by_id()` RPCs.
 *
 * List RPC omits `redemption_code`. Detail RPC returns it only for verified
 * students, admins, and owning partners — otherwise null.
 */
export interface PublicDealRow {
  id: number;
  title: string;
  brand: string;
  discount: string;
  type: DealType;
  category: string;
  image_url: string | null;
  description: string | null;
  redemption_code?: string | null;
  store_url: string | null;
  created_at: string;
}

/** Camel-cased deal used across the mobile UI. */
export interface Deal {
  id: number;
  title: string;
  brand: string;
  discount: string;
  type: DealType;
  category: string;
  imageUrl: string | null;
  description: string | null;
  redemptionCode: string | null;
  storeUrl: string | null;
  createdAt: string;
}

export function mapDeal(row: PublicDealRow): Deal {
  return {
    id: row.id,
    title: row.title,
    brand: row.brand,
    discount: row.discount,
    type: row.type,
    category: row.category,
    imageUrl: row.image_url,
    description: row.description,
    redemptionCode: row.redemption_code ?? null,
    storeUrl: row.store_url,
    createdAt: row.created_at,
  };
}

export type OnlineCodeEventType = "reveal" | "copy" | "click_through";

export interface VerificationRpcResult {
  success?: boolean;
  message?: string;
  error?: string;
}

/** Row returned by the `generate_instore_ticket()` RPC. */
export interface InstoreTicketRow {
  ticket_id: number;
  ticket_code: string;
  deal_id: number;
  deal_title: string;
  deal_brand: string;
  deal_discount: string;
  expires_at: string;
  already_active: boolean;
}

/** Outcomes reported by `validate_instore_ticket()`. */
export type ScanResult =
  | "valid"
  | "already_redeemed"
  | "expired"
  | "not_found"
  | "wrong_brand"
  | "not_approved"
  | "invalid";

/** Row returned by the `validate_instore_ticket()` RPC. */
export interface ValidateTicketRow {
  event_id: number | null;
  result: ScanResult;
  message: string;
  deal_id: number | null;
  deal_title: string | null;
  deal_brand: string | null;
  deal_discount: string | null;
  deal_status: DealStatus | null;
  ticket_id: number | null;
  confirmed_redemption_id: number | null;
}

/** `manual_verifications.institution_type` */
export type InstitutionType = "school" | "university";

/**
 * Profile fields the web app stores on `auth.users.user_metadata`.
 * There is no `public.profiles` table.
 */
export interface UserMetadata {
  full_name?: string;
  username?: string;
  avatar_url?: string;
  student_type?: InstitutionType;
  institution?: string;
  department?: string;
  batch?: string;
  grade?: string;
  pref_deal_alerts?: boolean;
  pref_event_reminders?: boolean;
}

/** QR payload format written by the web app's in-store ticket QR code. */
export const TICKET_URI_PREFIX = "unideals://ticket/";

/** QR payload identifying a student pass holder. */
export const STUDENT_PASS_URI_PREFIX = "unideals://student/";
