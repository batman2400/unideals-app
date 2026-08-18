/**
 * Loads and updates the signed-in partner's brand row(s).
 * Port of the web Profile.jsx partner brand editor.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { isDuplicateBrandName, validateBrandProfile } from "@/lib/brandForm";
import { uploadBrandLogo, type UploadBrandLogoInput } from "@/lib/brandLogoUpload";
import { supabase, toErrorMessage } from "@/lib/supabase";
import type { Brand, BrandRow } from "@/types/database";
import { mapBrand } from "@/types/database";

const BRAND_SELECT = `
  id,
  name,
  category,
  description,
  website_url,
  instagram_handle,
  tiktok_handle,
  logo_url,
  location
`;

export interface PartnerBrandProfileInput {
  name: string;
  category: string;
  description: string;
  websiteUrl: string;
  instagramHandle: string;
  tiktokHandle: string;
  location: string;
  logo?: Omit<UploadBrandLogoInput, "brandName"> | null;
  existingLogoUrl?: string | null;
}

export interface UsePartnerBrandProfileResult {
  brands: Brand[];
  isLoading: boolean;
  isRefreshing: boolean;
  saving: boolean;
  error: string | null;
  unlinkedName: string | null;
  refresh: () => Promise<void>;
  updateBrand: (
    id: string,
    input: PartnerBrandProfileInput,
  ) => Promise<string | null>;
}

interface PartnerProfileJoinRow {
  brand_id: string | null;
  brand_name: string | null;
  brands: BrandRow | BrandRow[] | null;
}

function unwrapBrand(
  brands: BrandRow | BrandRow[] | null | undefined,
): BrandRow | null {
  if (!brands) return null;
  return Array.isArray(brands) ? (brands[0] ?? null) : brands;
}

export function usePartnerBrandProfile(
  userId: string | undefined | null,
): UsePartnerBrandProfileResult {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [unlinkedName, setUnlinkedName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      if (!userId) {
        setBrands([]);
        setUnlinkedName(null);
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("partner_profiles")
        .select(
          `
          brand_id,
          brand_name,
          brands (${BRAND_SELECT})
        `,
        )
        .eq("user_id", userId);

      if (!activeRef.current) return;

      if (fetchError) {
        setError(
          toErrorMessage(
            fetchError,
            "Couldn't load your brand profile. Check your connection and refresh.",
          ),
        );
        setBrands([]);
        setUnlinkedName(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const rows = (data ?? []) as PartnerProfileJoinRow[];
      const mapped: Brand[] = [];
      let fallbackName: string | null = null;

      for (const row of rows) {
        const joined = unwrapBrand(row.brands);
        if (joined?.id) {
          mapped.push(mapBrand(joined));
          continue;
        }
        if (!fallbackName && row.brand_name?.trim()) {
          fallbackName = row.brand_name.trim();
        }
      }

      setBrands(mapped);
      setUnlinkedName(mapped.length === 0 ? fallbackName : null);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [userId],
  );

  useEffect(() => {
    activeRef.current = true;
    void load(false);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const updateBrand = useCallback(
    async (
      id: string,
      input: PartnerBrandProfileInput,
    ): Promise<string | null> => {
      const validationError = validateBrandProfile(input);
      if (validationError) {
        setError(validationError);
        return validationError;
      }

      setSaving(true);
      setError(null);

      try {
        let logoUrl = input.existingLogoUrl ?? null;
        if (input.logo) {
          const uploaded = await uploadBrandLogo({
            ...input.logo,
            brandName: input.name,
          });
          logoUrl = uploaded.publicUrl;
        }

        const { data, error: updateError } = await supabase
          .from("brands")
          .update({
            name: input.name.trim(),
            category: input.category.trim() || null,
            description: input.description.trim() || null,
            website_url: input.websiteUrl.trim() || null,
            instagram_handle: input.instagramHandle.trim() || null,
            tiktok_handle: input.tiktokHandle.trim() || null,
            location: input.location.trim() || null,
            logo_url: logoUrl,
          })
          .eq("id", id)
          .select(BRAND_SELECT);

        if (!activeRef.current) return null;

        if (updateError) {
          const msg = isDuplicateBrandName(updateError)
            ? "That brand name is already taken. Please choose another."
            : toErrorMessage(updateError, "Failed to save brand profile.");
          setError(msg);
          setSaving(false);
          return msg;
        }

        // An empty result with no error means row-level security rejected the
        // write, which PostgREST reports as a successful no-op.
        if (!data || data.length === 0) {
          const msg =
            "You don't have permission to edit this brand, or it no longer exists.";
          setError(msg);
          setSaving(false);
          return msg;
        }

        const updated = mapBrand(data[0] as BrandRow);
        setBrands((prev) =>
          prev.map((brand) => (brand.id === id ? updated : brand)),
        );
        setSaving(false);
        return null;
      } catch (caught) {
        if (!activeRef.current) return null;
        const msg = isDuplicateBrandName(caught)
          ? "That brand name is already taken. Please choose another."
          : toErrorMessage(caught, "Failed to save brand profile.");
        setError(msg);
        setSaving(false);
        return msg;
      }
    },
    [],
  );

  return {
    brands,
    isLoading,
    isRefreshing,
    saving,
    error,
    unlinkedName,
    refresh: () => load(true),
    updateBrand,
  };
}
