/**
 * Uni Deals design tokens.
 *
 * Mirrors the Material palette defined in the web app's `tailwind.config.js`
 * so both clients stay visually identical.
 */

export const colors = {
  primary: "#29695b",
  primaryDim: "#1a5c4f",
  primaryContainer: "#afefdd",
  onPrimary: "#defff4",
  onPrimaryContainer: "#195c4e",
  onPrimaryFixed: "#00483c",

  secondary: "#605f5f",
  secondaryContainer: "#e5e2e1",
  onSecondary: "#fbf8f8",
  onSecondaryContainer: "#525151",

  tertiary: "#5f5f5f",
  tertiaryContainer: "#f5f3f3",

  background: "#fcf9f8",
  onBackground: "#323233",

  surface: "#fcf9f8",
  surfaceBright: "#fcf9f8",
  surfaceDim: "#dbdad9",
  surfaceVariant: "#e4e2e2",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f6f3f2",
  surfaceContainer: "#f0eded",
  surfaceContainerHigh: "#eae8e7",
  surfaceContainerHighest: "#e4e2e2",
  onSurface: "#323233",
  onSurfaceVariant: "#5f5f5f",
  inverseSurface: "#0e0e0e",
  inverseOnSurface: "#9e9c9c",

  outline: "#7b7b7a",
  outlineVariant: "#b2b2b1",

  error: "#9f403d",
  errorContainer: "#fe8983",
  onError: "#fff7f6",
  onErrorContainer: "#752121",

  warning: "#d4a017",
  info: "#0284c7",
  infoContainer: "#dbeafe",
  onInfo: "#ffffff",
  onInfoContainer: "#1d4ed8",
  white: "#ffffff",
} as const;

export type ColorToken = keyof typeof colors;

/** Gradient used by the web app's `.emerald-gradient` utility. */
export const gradient = {
  emerald: [colors.primary, colors.primaryContainer] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * The web app uses a compact radius scale (`rounded-full` maps to 0.75rem).
 * Mobile targets are larger, so the scale is nudged up slightly.
 */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  headline: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.onBackground,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onBackground,
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.onSurfaceVariant,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  caption: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: colors.onSurfaceVariant,
  },
} as const;

/** Minimum tap target enforced across the web app's interactive elements. */
export const MIN_TAP_TARGET = 44;
