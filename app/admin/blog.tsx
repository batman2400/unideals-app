import { Image } from "expo-image";
import { FileText, Plus, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { useAdminBlog } from "@/lib/useAdminBlog";
import { colors, radius, spacing } from "@/theme";
import type { BlogPost } from "@/types/database";
import { slugifyTitle } from "@/types/database";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PostCard({
  post,
  acting,
  onToggle,
  onDelete,
}: {
  post: BlogPost;
  acting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          {post.coverImageUrl ? (
            <Image
              source={{ uri: post.coverImageUrl }}
              style={styles.thumbImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <FileText color={colors.onSurfaceVariant} size={20} />
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {post.title}
          </Text>
          <Text style={styles.slug} numberOfLines={1}>
            /{post.slug}
          </Text>
          <Text style={styles.date}>{formatDate(post.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={acting}
          onPress={onToggle}
          style={({ pressed }) => [
            styles.statusBtn,
            post.isPublished ? styles.publishedBtn : styles.draftBtn,
            (pressed || acting) && styles.pressed,
          ]}
        >
          {acting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.statusLabel,
                post.isPublished ? styles.publishedLabel : styles.draftLabel,
              ]}
            >
              {post.isPublished ? "Published" : "Draft"}
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={acting}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteBtn,
            (pressed || acting) && styles.pressed,
          ]}
        >
          <Trash2 color={colors.error} size={16} />
          <Text style={styles.deleteLabel}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminBlogScreen() {
  const insets = useSafeAreaInsets();
  const {
    posts,
    isLoading,
    isRefreshing,
    actingId,
    submitting,
    error,
    refresh,
    togglePublish,
    deletePost,
    createPost,
  } = useAdminBlog();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const canSave = useMemo(
    () => title.trim().length > 0 && slug.trim().length > 0 && content.trim().length > 0,
    [title, slug, content],
  );

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setExcerpt("");
    setCoverImageUrl("");
    setContent("");
    setIsPublished(false);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugifyTitle(value));
    }
  };

  const onSave = () => {
    if (!canSave) {
      Alert.alert("Missing fields", "Title, slug, and content are required.");
      return;
    }
    void (async () => {
      const createError = await createPost({
        title,
        slug,
        excerpt,
        content,
        coverImageUrl,
        isPublished,
      });
      if (!createError) {
        setModalOpen(false);
        resetForm();
      }
    })();
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              <Text style={styles.subtitle}>
                Create and publish articles for the Uni Deals blog.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={openCreate}
                style={({ pressed }) => [
                  styles.newBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Plus color={colors.onPrimary} size={18} />
                <Text style={styles.newBtnLabel}>New</Text>
              </Pressable>
            </View>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyBody}>
                No posts found. Create your first article!
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            acting={actingId === item.id}
            onToggle={() => {
              if (!item.isPublished) {
                Alert.alert(
                  "Publish article?",
                  `"${item.title}" will be visible to everyone.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Publish",
                      onPress: () => {
                        void togglePublish(item);
                      },
                    },
                  ],
                );
                return;
              }
              void togglePublish(item);
            }}
            onDelete={() => {
              Alert.alert(
                "Delete article?",
                "This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      void deletePost(item.id);
                    },
                  },
                ],
              );
            }}
          />
        )}
      />

      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={[styles.modalRoot, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Article</Text>
            <Pressable onPress={() => setModalOpen(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[
              styles.modalBody,
              { paddingBottom: insets.bottom + spacing.xxl },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <FormField
              label="Title"
              value={title}
              onChangeText={onTitleChange}
              placeholder="E.g. Top 10 Student Discounts"
            />
            <FormField
              label="URL Slug"
              value={slug}
              onChangeText={(value) => {
                setSlugTouched(true);
                setSlug(slugifyTitle(value));
              }}
              autoCapitalize="none"
              placeholder="top-10-student-discounts"
              hint="Auto-generated from title; editable."
            />
            <FormField
              label="Short Excerpt"
              value={excerpt}
              onChangeText={setExcerpt}
              placeholder="Brief summary for the blog card..."
            />
            <FormField
              label="Cover Image URL"
              value={coverImageUrl}
              onChangeText={setCoverImageUrl}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://example.com/image.jpg"
            />
            <FormField
              label="Article Content"
              value={content}
              onChangeText={setContent}
              multiline
              placeholder="Write your article content here..."
              hint="Markdown supported."
            />
            <View style={styles.publishRow}>
              <Text style={styles.publishLabel}>Publish Immediately</Text>
              <Switch
                value={isPublished}
                onValueChange={setIsPublished}
                trackColor={{
                  false: colors.surfaceContainerHigh,
                  true: colors.primaryContainer,
                }}
                thumbColor={isPublished ? colors.primary : colors.outlineVariant}
              />
            </View>
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setModalOpen(false)}
                style={styles.modalBtn}
              />
              <Button
                label="Save Article"
                loading={submitting}
                disabled={!canSave}
                onPress={onSave}
                style={styles.modalBtn}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerBlock: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  subtitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  newBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  newBtnLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.errorContainer,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onErrorContainer,
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
  },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    gap: spacing.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainerLow,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onBackground,
  },
  slug: {
    fontSize: 12,
    fontFamily: "monospace",
    color: colors.onSurfaceVariant,
  },
  date: {
    fontSize: 12,
    color: colors.outline,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statusBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  publishedBtn: {
    backgroundColor: colors.primaryContainer,
  },
  draftBtn: {
    backgroundColor: "#fef3c7",
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  publishedLabel: {
    color: colors.onPrimaryContainer,
  },
  draftLabel: {
    color: "#b45309",
  },
  deleteBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  deleteLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.error,
  },
  pressed: {
    opacity: 0.75,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBackground,
  },
  modalClose: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  publishRow: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  publishLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onBackground,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});
