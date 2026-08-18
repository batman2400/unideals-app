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
 * Timing / coming-soon fields come from `supabase_coming_soon.sql`.
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
  start_time?: string | null;
  end_time?: string | null;
  show_start_date?: boolean | null;
  show_end_date?: boolean | null;
  is_coming_soon?: boolean | null;
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
  startTime: string | null;
  endTime: string | null;
  showStartDate: boolean;
  showEndDate: boolean;
  isComingSoon: boolean;
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
    startTime: row.start_time ?? null,
    endTime: row.end_time ?? null,
    showStartDate: row.show_start_date === true,
    showEndDate: row.show_end_date === true,
    isComingSoon:
      row.is_coming_soon === true ||
      (row.start_time != null &&
        !Number.isNaN(new Date(row.start_time).getTime()) &&
        new Date(row.start_time).getTime() > Date.now()),
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
  name?: string;
  username?: string;
  avatar_url?: string;
  picture?: string;
  student_type?: InstitutionType;
  institution?: string;
  department?: string;
  batch?: string;
  grade?: string;
  pref_deal_alerts?: boolean;
  pref_event_reminders?: boolean;
}

/** Row shape of `public.saved_deals`. */
export interface SavedDealRow {
  user_id: string;
  deal_id: number;
  created_at: string;
}

/** QR payload format written by the web app's in-store ticket QR code. */
export const TICKET_URI_PREFIX = "unideals://ticket/";

/** QR payload identifying a student pass holder. */
export const STUDENT_PASS_URI_PREFIX = "unideals://student/";

/** `public.events.status` */
export type EventStatus = "pending" | "approved" | "rejected";

/** `public.events.category` */
export type EventCategory =
  | "social"
  | "academic"
  | "sports"
  | "entertainment"
  | "other";

/** `public.events.target_audience` */
export type EventAudience =
  | "all_students"
  | "university_only"
  | "high_school_only";

/** Row shape of `public.events`. */
export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  organizer_id: string | null;
  start_time: string;
  end_time: string | null;
  location_name: string | null;
  category: string | null;
  cover_image_url: string | null;
  rsvp_count: number | null;
  created_at: string;
  target_audience: string | null;
  external_registration_url: string | null;
  university_name: string | null;
  club_name: string | null;
  status: EventStatus;
  publish_at: string;
  rejection_reason?: string | null;
}

/** Camel-cased event used across the mobile UI. */
export interface CampusEvent {
  id: string;
  title: string;
  description: string | null;
  organizerId: string | null;
  startTime: string;
  endTime: string | null;
  locationName: string | null;
  category: string | null;
  coverImageUrl: string | null;
  rsvpCount: number;
  createdAt: string;
  targetAudience: string | null;
  externalRegistrationUrl: string | null;
  universityName: string | null;
  clubName: string | null;
  status: EventStatus;
  publishAt: string;
  rejectionReason: string | null;
}

export function mapEvent(row: EventRow): CampusEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    organizerId: row.organizer_id,
    startTime: row.start_time,
    endTime: row.end_time,
    locationName: row.location_name,
    category: row.category,
    coverImageUrl: row.cover_image_url,
    rsvpCount: row.rsvp_count ?? 0,
    createdAt: row.created_at,
    targetAudience: row.target_audience,
    externalRegistrationUrl: row.external_registration_url,
    universityName: row.university_name,
    clubName: row.club_name,
    status: row.status,
    publishAt: row.publish_at,
    rejectionReason: row.rejection_reason ?? null,
  };
}

export const OFFICIAL_DEAL_CATEGORIES = [
  "Fashion",
  "Food & Drink",
  "Tech & Mobile",
  "Beauty & Care",
  "Learning",
  "Travel & Auto",
  "Health & Fitness",
  "Household",
  "Finance",
  "Events & Tickets",
] as const;

export const EVENT_CATEGORY_OPTIONS: readonly {
  value: EventCategory;
  label: string;
}[] = [
  { value: "social", label: "Social & Networking" },
  { value: "academic", label: "Academic & Career" },
  { value: "sports", label: "Sports & Wellness" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
];

export const EVENT_AUDIENCE_OPTIONS: readonly {
  value: EventAudience;
  label: string;
}[] = [
  { value: "all_students", label: "All Students" },
  { value: "university_only", label: "University Only" },
  { value: "high_school_only", label: "High School Only" },
];

/** Offer types used by partner create/edit deal forms. */
export type DealOfferType =
  | "percentage_off"
  | "flat_amount_off"
  | "bogo"
  | "free_trial"
  | "free_item"
  | "custom";

/** Row shape of `public.brands`. */
export interface BrandRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  logo_url: string | null;
  location?: string | null;
  created_at?: string;
}

export interface Brand {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  logoUrl: string | null;
  location: string | null;
}

export function mapBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    websiteUrl: row.website_url,
    instagramHandle: row.instagram_handle,
    tiktokHandle: row.tiktok_handle,
    logoUrl: row.logo_url,
    location: row.location ?? null,
  };
}

/** Row shape of `public.partner_profiles`. */
export interface PartnerProfileRow {
  user_id: string;
  brand_id: string | null;
  brand_name: string | null;
  created_at?: string;
}

/**
 * Partner-owned deal row from a direct `deals` select (not the public RPC).
 * `status` is a string because the portal also treats legacy `"active"` /
 * `"expired"` values alongside the schema's pending/approved/rejected.
 */
export interface PartnerDealRow {
  id: number;
  title: string;
  brand: string;
  discount: string;
  type: DealType;
  category: string;
  image_url: string | null;
  status: string;
  redemption_code: string | null;
  created_at: string;
  start_time: string | null;
  end_time: string | null;
}

/** Camel-cased partner deal used in the Partner Portal. */
export interface PartnerDeal {
  id: number;
  title: string;
  brand: string;
  discount: string;
  type: DealType;
  category: string;
  imageUrl: string | null;
  status: string;
  redemptionCode: string | null;
  createdAt: string;
  startTime: string | null;
  endTime: string | null;
}

export function mapPartnerDeal(row: PartnerDealRow): PartnerDeal {
  return {
    id: row.id,
    title: row.title,
    brand: row.brand,
    discount: row.discount,
    type: row.type,
    category: row.category,
    imageUrl: row.image_url,
    status: row.status,
    redemptionCode: row.redemption_code,
    createdAt: row.created_at,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

/** Row returned by `get_partner_deal_stats(target_partner_id)`. */
export interface PartnerDealStatsRow {
  deal_id: number;
  deal_title: string;
  deal_type: DealType | string;
  deal_status: string;
  start_time: string | null;
  end_time: string | null;
  total_reveals: number;
  total_copies: number;
  total_click_throughs: number;
  total_tickets_generated: number;
  total_tickets_redeemed: number;
  total_scans: number;
  confirmed_redemptions: number;
}

/** Camel-cased partner deal stats for the Analytics screen. */
export interface PartnerDealStats {
  dealId: number;
  dealTitle: string;
  dealType: DealType | string;
  dealStatus: string;
  startTime: string | null;
  endTime: string | null;
  totalReveals: number;
  totalCopies: number;
  totalClickThroughs: number;
  totalTicketsGenerated: number;
  totalTicketsRedeemed: number;
  totalScans: number;
  confirmedRedemptions: number;
}

export function mapPartnerDealStats(row: PartnerDealStatsRow): PartnerDealStats {
  return {
    dealId: Number(row.deal_id),
    dealTitle: row.deal_title,
    dealType: row.deal_type,
    dealStatus: row.deal_status,
    startTime: row.start_time,
    endTime: row.end_time,
    totalReveals: Number(row.total_reveals ?? 0),
    totalCopies: Number(row.total_copies ?? 0),
    totalClickThroughs: Number(row.total_click_throughs ?? 0),
    totalTicketsGenerated: Number(row.total_tickets_generated ?? 0),
    totalTicketsRedeemed: Number(row.total_tickets_redeemed ?? 0),
    totalScans: Number(row.total_scans ?? 0),
    confirmedRedemptions: Number(row.confirmed_redemptions ?? 0),
  };
}

/** `redemption_events` row joined to `deals(title)` for admin overview. */
export interface AdminRecentScanRow {
  id: number;
  brand: string | null;
  scanned_code: string | null;
  scan_result: string;
  scan_method: string | null;
  created_at: string;
  deals: { title: string | null } | { title: string | null }[] | null;
}

export interface AdminRecentScan {
  id: number;
  brand: string | null;
  scannedCode: string | null;
  scanResult: string;
  scanMethod: string | null;
  createdAt: string;
  dealTitle: string | null;
}

export function mapAdminRecentScan(row: AdminRecentScanRow): AdminRecentScan {
  const deal = Array.isArray(row.deals) ? row.deals[0] : row.deals;
  return {
    id: Number(row.id),
    brand: row.brand,
    scannedCode: row.scanned_code,
    scanResult: row.scan_result,
    scanMethod: row.scan_method,
    createdAt: row.created_at,
    dealTitle: deal?.title ?? null,
  };
}

/** `manual_verifications` row for admin moderation. */
export type ManualVerificationMethod = "email_otp" | "manual";
export type ManualVerificationStatus =
  | "pending"
  | "awaiting_confirmation"
  | "approved"
  | "rejected";

export interface ManualVerificationRow {
  id: string | number;
  user_id: string | null;
  institution_type: InstitutionType | string;
  institution_name: string;
  course_details: string | null;
  student_id_number: string | null;
  contact_email: string | null;
  proof_image_url: string | null;
  proof_image_back_url?: string | null;
  method?: ManualVerificationMethod | string | null;
  reject_reason?: string | null;
  status: ManualVerificationStatus | string;
  created_at: string;
}

export interface ManualVerification {
  id: string;
  userId: string | null;
  institutionType: string;
  institutionName: string;
  courseDetails: string | null;
  studentIdNumber: string | null;
  contactEmail: string | null;
  proofImageUrl: string | null;
  proofImageBackUrl: string | null;
  method: string;
  rejectReason: string | null;
  status: string;
  createdAt: string;
}

export function mapManualVerification(
  row: ManualVerificationRow,
): ManualVerification {
  return {
    id: String(row.id),
    userId: row.user_id,
    institutionType: row.institution_type,
    institutionName: row.institution_name,
    courseDetails: row.course_details,
    studentIdNumber: row.student_id_number,
    contactEmail: row.contact_email,
    proofImageUrl: row.proof_image_url,
    proofImageBackUrl: row.proof_image_back_url ?? null,
    method: row.method ?? "manual",
    rejectReason: row.reject_reason ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** Row from `admin_list_all_deals`, plus timing fields merged client-side. */
export interface AdminDealRow {
  id: number;
  title: string;
  brand: string;
  discount: string;
  type: string;
  category: string | null;
  image_url: string | null;
  status: string;
  redemption_code: string | null;
  store_url: string | null;
  partner_id: string | null;
  expires_at: string | null;
  max_reveals: number | null;
  created_at: string;
  total_reveals: number | string | null;
  total_copies: number | string | null;
  total_click_throughs: number | string | null;
  total_tickets_generated: number | string | null;
  total_tickets_redeemed: number | string | null;
  total_count?: number | string | null;
  start_time?: string | null;
  end_time?: string | null;
  db_status?: string | null;
}

export type AdminDealLifecycle =
  | "active"
  | "scheduled"
  | "expired"
  | "paused"
  | "pending"
  | "other";

export interface AdminDeal {
  id: number;
  title: string;
  brand: string;
  discount: string;
  type: string;
  category: string | null;
  imageUrl: string | null;
  status: string;
  dbStatus: string;
  startTime: string | null;
  endTime: string | null;
  totalReveals: number;
  totalTicketsGenerated: number;
  totalTicketsRedeemed: number;
}

export function mapAdminDeal(row: AdminDealRow): AdminDeal {
  const dbStatus = row.db_status ?? row.status;
  return {
    id: Number(row.id),
    title: row.title,
    brand: row.brand,
    discount: row.discount,
    type: row.type,
    category: row.category,
    imageUrl: row.image_url,
    status: row.status,
    dbStatus,
    startTime: row.start_time ?? null,
    endTime: row.end_time ?? null,
    totalReveals: Number(row.total_reveals ?? 0),
    totalTicketsGenerated: Number(row.total_tickets_generated ?? 0),
    totalTicketsRedeemed: Number(row.total_tickets_redeemed ?? 0),
  };
}

export function getAdminDealLifecycle(
  deal: Pick<AdminDeal, "dbStatus" | "startTime" | "endTime">,
  now = new Date(),
): AdminDealLifecycle {
  const start = deal.startTime ? new Date(deal.startTime) : new Date(0);
  const end = deal.endTime ? new Date(deal.endTime) : null;
  const st = deal.dbStatus;

  if (st === "paused") return "paused";
  if (st === "pending") return "pending";

  if (st === "active" || st === "approved") {
    if (start > now) return "scheduled";
    if (end && end < now) return "expired";
    return "active";
  }

  if (end && end < now) return "expired";
  return "other";
}

/** Row from `list_users_with_roles`. */
export interface AdminUserRow {
  user_id: string;
  email: string;
  role: string;
  is_verified: boolean | null;
  brand_name: string | null;
  created_at: string;
  total_count?: number | string | null;
}

export interface AdminUser {
  userId: string;
  email: string;
  role: UserRole | string;
  isVerified: boolean;
  brandName: string | null;
  createdAt: string;
}

export function mapAdminUser(row: AdminUserRow): AdminUser {
  return {
    userId: row.user_id,
    email: row.email,
    role: row.role,
    isVerified: Boolean(row.is_verified),
    brandName: row.brand_name,
    createdAt: row.created_at,
  };
}

/** `inquiries` table row. */
export type InquiryStatus = "new" | "read" | "archived";

export interface InquiryRow {
  id: string | number;
  name: string;
  email: string;
  message: string;
  inquiry_type: string;
  brand_name: string | null;
  status: InquiryStatus | string;
  created_at: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  inquiryType: string;
  brandName: string | null;
  status: string;
  createdAt: string;
}

export function mapInquiry(row: InquiryRow): Inquiry {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    message: row.message,
    inquiryType: row.inquiry_type,
    brandName: row.brand_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** `posts` table row. */
export interface PostRow {
  id: string | number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  is_published: boolean;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  createdAt: string;
}

export function mapPost(row: PostRow): BlogPost {
  return {
    id: String(row.id),
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    coverImageUrl: row.cover_image_url,
    isPublished: Boolean(row.is_published),
    createdAt: row.created_at,
  };
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
