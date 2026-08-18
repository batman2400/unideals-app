/**
 * useAdminBrands — brands CRUD for the admin portal.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { uploadBrandLogo, type UploadBrandLogoInput } from "@/lib/brandLogoUpload";
import { supabase, toErrorMessage } from "@/lib/supabase";
import type { Brand, BrandRow } from "@/types/database";
import { mapBrand } from "@/types/database";

export { BRAND_CATEGORIES, type BrandCategory } from "@/lib/brandForm";

export interface BrandInput {
  name: string;
  category: string;
  description: string;
  websiteUrl: string;
  instagramHandle: string;
  tiktokHandle: string;
  logo?: Omit<UploadBrandLogoInput, "brandName"> | null;
  existingLogoUrl?: string | null;
}

export interface UseAdminBrandsResult {
  brands: Brand[];
  isLoading: boolean;
  isRefreshing: boolean;
  saving: boolean;
  error: string | null;
  message: string | null;
  refresh: () => Promise<void>;
  createBrand: (input: BrandInput) => Promise<string | null>;
  updateBrand: (id: string, input: BrandInput) => Promise<string | null>;
  deleteBrand: (id: string) => Promise<string | null>;
}

export function useAdminBrands(): UseAdminBrandsResult {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(async (isRefresh: boolean): Promise<void> => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("brands")
      .select("*")
      .order("name", { ascending: true });

    if (!activeRef.current) return;

    if (fetchError) {
      setError(toErrorMessage(fetchError, "Could not load brands."));
      setBrands([]);
    } else {
      setBrands(((data ?? []) as BrandRow[]).map(mapBrand));
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void load(false);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const createBrand = useCallback(
    async (input: BrandInput): Promise<string | null> => {
      if (!input.name.trim()) {
        const msg = "Brand name is required.";
        setError(msg);
        return msg;
      }

      setSaving(true);
      setError(null);

      try {
        let logoUrl: string | null = null;
        if (input.logo) {
          const uploaded = await uploadBrandLogo({
            ...input.logo,
            brandName: input.name,
          });
          logoUrl = uploaded.publicUrl;
        }

        const { error: insertError } = await supabase.from("brands").insert([
          {
            name: input.name.trim(),
            category: input.category || null,
            description: input.description.trim() || null,
            website_url: input.websiteUrl.trim() || null,
            instagram_handle: input.instagramHandle.trim() || null,
            tiktok_handle: input.tiktokHandle.trim() || null,
            logo_url: logoUrl,
          },
        ]);

        if (!activeRef.current) return null;

        if (insertError) {
          const msg = toErrorMessage(insertError, "Failed to create brand.");
          setError(msg);
          setSaving(false);
          return msg;
        }

        setMessage(`Brand "${input.name.trim()}" created.`);
        setSaving(false);
        await load(true);
        return null;
      } catch (err) {
        if (!activeRef.current) return null;
        const msg =
          err instanceof Error ? err.message : "Failed to create brand.";
        setError(msg);
        setSaving(false);
        return msg;
      }
    },
    [load],
  );

  const updateBrand = useCallback(
    async (id: string, input: BrandInput): Promise<string | null> => {
      if (!input.name.trim()) {
        const msg = "Brand name is required.";
        setError(msg);
        return msg;
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

        const { error: updateError } = await supabase
          .from("brands")
          .update({
            name: input.name.trim(),
            category: input.category || null,
            description: input.description.trim() || null,
            website_url: input.websiteUrl.trim() || null,
            instagram_handle: input.instagramHandle.trim() || null,
            tiktok_handle: input.tiktokHandle.trim() || null,
            logo_url: logoUrl,
          })
          .eq("id", id);

        if (!activeRef.current) return null;

        if (updateError) {
          const msg = toErrorMessage(updateError, "Failed to update brand.");
          setError(msg);
          setSaving(false);
          return msg;
        }

        setMessage(`Brand "${input.name.trim()}" updated.`);
        setSaving(false);
        await load(true);
        return null;
      } catch (err) {
        if (!activeRef.current) return null;
        const msg =
          err instanceof Error ? err.message : "Failed to update brand.";
        setError(msg);
        setSaving(false);
        return msg;
      }
    },
    [load],
  );

  const deleteBrand = useCallback(
    async (id: string): Promise<string | null> => {
      setSaving(true);
      setError(null);
      const { error: deleteError } = await supabase
        .from("brands")
        .delete()
        .eq("id", id);

      if (!activeRef.current) return null;
      setSaving(false);

      if (deleteError) {
        const msg = toErrorMessage(deleteError, "Failed to delete brand.");
        setError(msg);
        return msg;
      }

      setMessage("Brand deleted.");
      await load(true);
      return null;
    },
    [load],
  );

  return {
    brands,
    isLoading,
    isRefreshing,
    saving,
    error,
    message,
    refresh: () => load(true),
    createBrand,
    updateBrand,
    deleteBrand,
  };
}
