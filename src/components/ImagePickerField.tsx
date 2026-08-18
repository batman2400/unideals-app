import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus } from "lucide-react-native";
import { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/theme";

const DEFAULT_ASPECT: [number, number] = [16, 9];

export interface PickedImage {
  uri: string;
  mimeType: string | null;
  fileSize: number | null;
}

interface ImagePickerFieldProps {
  label: string;
  value: PickedImage | null;
  previewUrl?: string | null;
  onChange: (next: PickedImage | null) => void;
  hint?: string;
  aspect?: [number, number];
  frameHeight?: number;
  shape?: "rect" | "circle";
  allowClear?: boolean;
}

export function ImagePickerField({
  label,
  value,
  previewUrl,
  onChange,
  hint = "JPG, PNG, or WEBP · max 5MB",
  aspect = DEFAULT_ASPECT,
  frameHeight = 160,
  shape = "rect",
  allowClear = true,
}: ImagePickerFieldProps) {
  const displayUri = value?.uri ?? previewUrl ?? null;
  const isCircle = shape === "circle";

  const pick = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to upload an image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize != null && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert("Image too large", "Please choose an image under 5MB.");
      return;
    }

    onChange({
      uri: asset.uri,
      mimeType: asset.mimeType ?? null,
      fileSize: asset.fileSize ?? null,
    });
  }, [aspect, onChange]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void pick()}
        style={({ pressed }) => [
          styles.frame,
          { height: frameHeight },
          isCircle && styles.frameCircle,
          isCircle && { width: frameHeight },
          pressed && styles.pressed,
        ]}
      >
        {displayUri ? (
          <Image source={{ uri: displayUri }} style={styles.preview} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <ImagePlus color={colors.onSurfaceVariant} size={28} />
            <Text style={styles.placeholderTitle}>Tap to upload</Text>
            <Text style={styles.placeholderHint}>{hint}</Text>
          </View>
        )}
      </Pressable>
      {displayUri && allowClear ? (
        <Pressable onPress={() => onChange(null)}>
          <Text style={styles.clear}>Remove image</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  frame: {
    height: 160,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.outlineVariant,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainerLow,
  },
  frameCircle: {
    alignSelf: "center",
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: 0.9,
  },
  preview: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  placeholderHint: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
  clear: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});
