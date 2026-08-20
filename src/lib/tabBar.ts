import { MIN_TAP_TARGET, spacing } from "@/theme";

/** Height of the floating chip row. */
export const TAB_BAR_HEIGHT = 48;

export const TAB_BAR_RADIUS = TAB_BAR_HEIGHT / 2;

/** Gap from the left/right screen edges. */
export const TAB_BAR_HORIZONTAL_INSET = 16;

/** Extra lift above the home indicator. */
export const TAB_BAR_FLOAT_GAP = 10;

export const SEARCH_CHIP_EXPANDED_WIDTH = 128;
export const SEARCH_CHIP_COLLAPSED_WIDTH = 48;
export const SEARCH_CHIP_HEIGHT = 48;
export const SEARCH_FIELD_HEIGHT = 48;
export const SEARCH_MORPH_MS = 300;
export const SEARCH_FOCUS_AT = 0.72;
export const TAB_CHIP_GAP = 8;
export const TAB_ICON_SIZE = 22;

export type MeasuredLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function floatingTabBarBottomOffset(safeBottom: number) {
  return safeBottom + TAB_BAR_FLOAT_GAP;
}

/** Scroll/list padding so content can clear the floating chips. */
export function floatingTabBarScrollPadding(safeBottom: number) {
  return TAB_BAR_HEIGHT + floatingTabBarBottomOffset(safeBottom) + spacing.lg;
}

/** Destination frame for the Search screen input (must match app/(tabs)/search.tsx). */
export function searchFieldTargetLayout(
  windowWidth: number,
  topInset: number,
): MeasuredLayout {
  const x = spacing.lg + MIN_TAP_TARGET + spacing.xs;
  return {
    x,
    y: topInset + spacing.sm,
    width: Math.max(0, windowWidth - x - spacing.lg),
    height: SEARCH_FIELD_HEIGHT,
  };
}

export function fallbackSearchChipLayout(
  windowWidth: number,
  windowHeight: number,
  bottomInset: number,
  chipWidth = SEARCH_CHIP_EXPANDED_WIDTH,
): MeasuredLayout {
  const bottom = floatingTabBarBottomOffset(bottomInset);
  return {
    x: (windowWidth - chipWidth) / 2,
    y:
      windowHeight -
      bottom -
      TAB_BAR_HEIGHT +
      (TAB_BAR_HEIGHT - SEARCH_CHIP_HEIGHT) / 2,
    width: chipWidth,
    height: SEARCH_CHIP_HEIGHT,
  };
}
