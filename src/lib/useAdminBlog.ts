/**
 * useAdminBlog — port of web AdminBlog.jsx data layer.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase, toErrorMessage } from "@/lib/supabase";
import type { BlogPost, PostRow } from "@/types/database";
import { mapPost } from "@/types/database";

export interface BlogPostInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  isPublished: boolean;
}

export interface UseAdminBlogResult {
  posts: BlogPost[];
  isLoading: boolean;
  isRefreshing: boolean;
  actingId: string | null;
  submitting: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  togglePublish: (post: BlogPost) => Promise<string | null>;
  deletePost: (id: string) => Promise<string | null>;
  createPost: (input: BlogPostInput) => Promise<string | null>;
}

export function useAdminBlog(): UseAdminBlogResult {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);

  const load = useCallback(async (isRefresh: boolean): Promise<void> => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!activeRef.current) return;

    if (fetchError) {
      setError(toErrorMessage(fetchError, "Failed to load blog posts."));
      setPosts([]);
    } else {
      setPosts(((data ?? []) as PostRow[]).map(mapPost));
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

  const togglePublish = useCallback(
    async (post: BlogPost): Promise<string | null> => {
      const next = !post.isPublished;
      setActingId(post.id);
      setError(null);
      const { error: updateError } = await supabase
        .from("posts")
        .update({ is_published: next })
        .eq("id", post.id);

      if (!activeRef.current) return null;
      setActingId(null);

      if (updateError) {
        const msg = toErrorMessage(
          updateError,
          "Failed to update publish status.",
        );
        setError(msg);
        return msg;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, isPublished: next } : p,
        ),
      );
      return null;
    },
    [],
  );

  const deletePost = useCallback(async (id: string): Promise<string | null> => {
    setActingId(id);
    setError(null);
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (!activeRef.current) return null;
    setActingId(null);

    if (deleteError) {
      const msg = toErrorMessage(deleteError, "Failed to delete post.");
      setError(msg);
      return msg;
    }

    setPosts((prev) => prev.filter((p) => p.id !== id));
    return null;
  }, []);

  const createPost = useCallback(
    async (input: BlogPostInput): Promise<string | null> => {
      setSubmitting(true);
      setError(null);
      const { data, error: insertError } = await supabase
        .from("posts")
        .insert([
          {
            title: input.title.trim(),
            slug: input.slug.trim(),
            excerpt: input.excerpt.trim() || null,
            content: input.content.trim(),
            cover_image_url: input.coverImageUrl.trim() || null,
            is_published: input.isPublished,
          },
        ])
        .select()
        .single();

      if (!activeRef.current) return null;
      setSubmitting(false);

      if (insertError) {
        const msg = toErrorMessage(
          insertError,
          "Failed to create post. Ensure the slug is unique.",
        );
        setError(msg);
        return msg;
      }

      setPosts((prev) => [mapPost(data as PostRow), ...prev]);
      return null;
    },
    [],
  );

  return {
    posts,
    isLoading,
    isRefreshing,
    actingId,
    submitting,
    error,
    refresh: () => load(true),
    togglePublish,
    deletePost,
    createPost,
  };
}
