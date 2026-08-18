import { useRouter, type Href } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dimensions } from "react-native";
import {
  Easing,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  SEARCH_MORPH_MS,
  fallbackSearchChipLayout,
  type MeasuredLayout,
} from "@/lib/tabBar";

export type SearchScope = "all" | "deals" | "events";

type OpenSearchOptions = {
  scope?: SearchScope;
};

type TabBarMotionContextValue = {
  collapsed: SharedValue<number>;
  collapseTarget: SharedValue<number>;
  lastScrollY: SharedValue<number>;
  morphProgress: SharedValue<number>;
  chipHidden: SharedValue<number>;
  searchFieldVisibleSv: SharedValue<number>;
  chipX: SharedValue<number>;
  chipY: SharedValue<number>;
  chipW: SharedValue<number>;
  chipH: SharedValue<number>;
  searchFieldVisible: boolean;
  openSearch: (layout?: MeasuredLayout | null, options?: OpenSearchOptions) => void;
  closeSearch: (onFinished: () => void) => void;
};

const TabBarMotionContext = createContext<TabBarMotionContextValue | null>(
  null,
);

const morphEasing = Easing.bezier(0.22, 1, 0.36, 1);

export function TabBarMotionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const closingRef = useRef(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collapsed = useSharedValue(0);
  const collapseTarget = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const morphProgress = useSharedValue(0);
  const chipHidden = useSharedValue(0);
  const searchFieldVisibleSv = useSharedValue(0);
  const chipX = useSharedValue(0);
  const chipY = useSharedValue(0);
  const chipW = useSharedValue(52);
  const chipH = useSharedValue(44);

  const [searchFieldVisible, setSearchFieldVisible] = useState(false);

  const openSearch = useCallback(
    (layout?: MeasuredLayout | null, options?: OpenSearchOptions) => {
      if (closingRef.current) return;
      if (chipHidden.value === 1 && morphProgress.value > 0.05) return;

      const window = Dimensions.get("window");
      const chip =
        layout && layout.width > 10
          ? layout
          : fallbackSearchChipLayout(
              window.width,
              window.height,
              insets.bottom,
            );

      chipX.value = chip.x;
      chipY.value = chip.y;
      chipW.value = chip.width;
      chipH.value = chip.height;
      searchFieldVisibleSv.value = 0;
      setSearchFieldVisible(false);
      chipHidden.value = 1;
      morphProgress.value = 0;
      morphProgress.value = withTiming(
        1,
        { duration: SEARCH_MORPH_MS, easing: morphEasing },
        (finished) => {
          if (finished) {
            searchFieldVisibleSv.value = 1;
          }
        },
      );
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      openTimerRef.current = setTimeout(() => {
        setSearchFieldVisible(true);
        openTimerRef.current = null;
      }, SEARCH_MORPH_MS);

      if (options?.scope && options.scope !== "all") {
        router.push({
          pathname: "/search",
          params: { scope: options.scope },
        } as Href);
      } else {
        router.push("/search" as Href);
      }
    },
    [
      chipH,
      chipHidden,
      chipW,
      chipX,
      chipY,
      insets.bottom,
      morphProgress,
      router,
      searchFieldVisibleSv,
    ],
  );

  const closeSearch = useCallback(
    (onFinished: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
      searchFieldVisibleSv.value = 0;
      setSearchFieldVisible(false);

      const finish = () => {
        chipHidden.value = 0;
        closingRef.current = false;
        onFinished();
      };

      requestAnimationFrame(() => {
        morphProgress.value = withTiming(
          0,
          { duration: SEARCH_MORPH_MS, easing: morphEasing },
          (finished) => {
            if (finished) {
              chipHidden.value = 0;
            }
          },
        );
        setTimeout(finish, SEARCH_MORPH_MS);
      });
    },
    [chipHidden, morphProgress, searchFieldVisibleSv],
  );

  const value = useMemo(
    () => ({
      collapsed,
      collapseTarget,
      lastScrollY,
      morphProgress,
      chipHidden,
      searchFieldVisibleSv,
      chipX,
      chipY,
      chipW,
      chipH,
      searchFieldVisible,
      openSearch,
      closeSearch,
    }),
    [
      chipH,
      chipHidden,
      chipW,
      chipX,
      chipY,
      closeSearch,
      collapseTarget,
      collapsed,
      lastScrollY,
      morphProgress,
      openSearch,
      searchFieldVisible,
      searchFieldVisibleSv,
    ],
  );

  return (
    <TabBarMotionContext.Provider value={value}>
      {children}
    </TabBarMotionContext.Provider>
  );
}

export function useTabBarMotion() {
  const value = useContext(TabBarMotionContext);
  if (!value) {
    throw new Error("useTabBarMotion must be used within TabBarMotionProvider");
  }
  return value;
}

export function useTabBarCollapseScrollHandler() {
  const { collapsed, collapseTarget, lastScrollY } = useTabBarMotion();

  return useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const dy = y - lastScrollY.value;
      lastScrollY.value = y;

      if (y < 8) {
        if (collapseTarget.value !== 0) {
          collapseTarget.value = 0;
          collapsed.value = withTiming(0, { duration: 220 });
        }
        return;
      }

      if (dy > 6 && collapseTarget.value === 0) {
        collapseTarget.value = 1;
        collapsed.value = withTiming(1, { duration: 220 });
      } else if (dy < -6 && collapseTarget.value === 1) {
        collapseTarget.value = 0;
        collapsed.value = withTiming(0, { duration: 220 });
      }
    },
  });
}
