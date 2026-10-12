import { MIN_TAP_TARGET, spacing } from "@/theme";

/** Height of the floating chip row. */
export const TAB_BAR_HEIGHT = 48;

export const TAB_BAR_RADIUS = TAB_BAR_HEIGHT / 2;

/** Gap from the left/right screen edges (px-5 container padding). */
export const TAB_BAR_HORIZONTAL_INSET = 20;

/**
 * Extra pull-in past the screen edge. Curved glass does not report a side
 * safe-area inset in portrait, so the end chips (profile on the right) get
 * clipped unless the bar sits further in.
 */
export const TAB_BAR_CURVE_GUTTER = 8;

/** Extra lift above the home indicator. */
export const TAB_BAR_FLOAT_GAP = 10;

export const SEARCH_CHIP_EXPANDED_WIDTH = 112;
export const SEARCH_CHIP_COLLAPSED_WIDTH = 48;
export const SEARCH_CHIP_HEIGHT = 48;
export const SEARCH_FIELD_HEIGHT = 48;
export const SEARCH_MORPH_MS = 300;
export const SEARCH_FOCUS_AT = 0.72;
export const TAB_CHIP_GAP = 8;
export const TAB_ICON_SIZE = 22;

const SIDE_TAB_COUNT = 4;
const MIN_TAB_GAP = 4;
/** Narrowest search chip that still fits the icon and the "Search" label. */
const MIN_SEARCH_CHIP_WIDTH = 96;

export type FloatingTabBarLayout = {
  left: number;
  right: number;
  gap: number;
  searchWidth: number;
  pillWidth: number;
  pillHeight: number;
};

/** Side insets plus chip sizes that always fit inside the visible width. */
export function resolveFloatingTabBarLayout(
  windowWidth: number,
  safeLeft: number,
  safeRight: number,
): FloatingTabBarLayout {
  const left = Math.max(
    TAB_BAR_HORIZONTAL_INSET + TAB_BAR_CURVE_GUTTER,
    safeLeft + TAB_BAR_HORIZONTAL_INSET,
  );
  const right = Math.max(
    TAB_BAR_HORIZONTAL_INSET + TAB_BAR_CURVE_GUTTER,
    safeRight + TAB_BAR_HORIZONTAL_INSET,
  );
  // One spare pixel so a fractional row cannot clip the last chip on Android.
  const inner = Math.max(0, windowWidth - left - right - 1);

  const circleBudget =
    inner - SEARCH_CHIP_EXPANDED_WIDTH - TAB_BAR_HEIGHT * SIDE_TAB_COUNT;
  const gapForCircles = circleBudget / SIDE_TAB_COUNT;

  let gap = TAB_CHIP_GAP;
  let searchWidth = SEARCH_CHIP_EXPANDED_WIDTH;
  let pillWidth = TAB_BAR_HEIGHT;

  if (gapForCircles >= TAB_CHIP_GAP) {
    pillWidth =
      (inner - searchWidth - gap * SIDE_TAB_COUNT) / SIDE_TAB_COUNT;
  } else if (gapForCircles >= MIN_TAB_GAP) {
    gap = gapForCircles;
  } else {
    gap = MIN_TAB_GAP;
    const roomForSearch =
      inner - gap * SIDE_TAB_COUNT - TAB_BAR_HEIGHT * SIDE_TAB_COUNT;
    if (roomForSearch >= MIN_SEARCH_CHIP_WIDTH) {
      searchWidth = Math.min(SEARCH_CHIP_EXPANDED_WIDTH, roomForSearch);
    } else {
      searchWidth = MIN_SEARCH_CHIP_WIDTH;
      pillWidth = Math.max(
        0,
        (inner - searchWidth - gap * SIDE_TAB_COUNT) / SIDE_TAB_COUNT,
      );
    }
  }

  return {
    left,
    right,
    gap,
    searchWidth,
    pillWidth,
    pillHeight: Math.min(TAB_BAR_HEIGHT, pillWidth),
  };
}

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
