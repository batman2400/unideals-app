/**
 * usePartnerBrand
 *
 * Port of the web app's `src/lib/partnerBrand.js` `getPartnerBrand`.
 * Resolves the brand assigned to a partner via `partner_profiles` → `brands`.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase, toErrorMessage } from "@/lib/supabase";

export interface PartnerBrand {
  brandId: string | null;
  brandName: string | null;
  logoUrl: string | null;
  source: "brands_table" | "partner_profiles_legacy" | null;
}

export interface UsePartnerBrandResult extends PartnerBrand {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface BrandJoin {
  id: string;
  name: string;
  logo_url: string | null;
}

interface PartnerProfileJoinRow {
  brand_id: string | null;
  brand_name: string | null;
  brands: BrandJoin | BrandJoin[] | null;
}

function unwrapBrand(
  brands: BrandJoin | BrandJoin[] | null | undefined,
): BrandJoin | null {
  if (!brands) return null;
  return Array.isArray(brands) ? (brands[0] ?? null) : brands;
}

export const PARTNER_BRAND_REQUIRED_MESSAGE =
  "No brand is assigned to this partner account yet. Please contact an admin to be assigned a brand before creating deals.";

export async function getPartnerBrand(
  userId: string | undefined | null,
): Promise<PartnerBrand & { error: string | null }> {
  if (!userId) {
    return {
      brandId: null,
      brandName: null,
      logoUrl: null,
      source: null,
      error: "Partner account could not be resolved.",
    };
  }

  const { data, error } = await supabase
    .from("partner_profiles")
    .select(
      `
      brand_id,
      brand_name,
      brands (
        id,
        name,
        logo_url
      )
    `,
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      brandId: null,
      brandName: null,
      logoUrl: null,
      source: null,
      error: toErrorMessage(error, "Could not load partner brand."),
    };
  }

  const profile = data as PartnerProfileJoinRow | null;
  const brand = unwrapBrand(profile?.brands);

  if (brand?.id) {
    return {
      brandId: brand.id,
      brandName: brand.name,
      logoUrl: brand.logo_url,
      source: "brands_table",
      error: null,
    };
  }

  if (profile?.brand_name?.trim()) {
    return {
      brandId: null,
      brandName: profile.brand_name.trim(),
      logoUrl: null,
      source: "partner_profiles_legacy",
      error: null,
    };
  }

  return {
    brandId: null,
    brandName: null,
    logoUrl: null,
    source: null,
    error:
      "No brand is assigned to this partner account yet. Please contact an admin to be assigned a brand.",
  };
}

const EMPTY: PartnerBrand = {
  brandId: null,
  brandName: null,
  logoUrl: null,
  source: null,
};

export function usePartnerBrand(
  userId: string | undefined | null,
): UsePartnerBrandResult {
  const [brand, setBrand] = useState<PartnerBrand>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(async (): Promise<void> => {
    if (!userId) {
      setBrand(EMPTY);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await getPartnerBrand(userId);
    if (!activeRef.current) return;

    setBrand({
      brandId: result.brandId,
      brandName: result.brandName,
      logoUrl: result.logoUrl,
      source: result.source,
    });
    setError(result.error);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    activeRef.current = true;
    void load();
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  return {
    ...brand,
    isLoading,
    error,
    refresh: load,
  };
}
