import { useRouter, type Href } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Dimensions, Keyboard } from "react-native";
import {
  Easing,
  runOnJS,
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

export type SearchScope = "all" | "deals" | "events" | "brands";

type OpenSearchOptions = {
  scope?: SearchScope;
};

type TabBarMotionContextValue = {
  collapsed: SharedValue<number>;
  collapseTarget: SharedValue<number>;
  lastScrollY: SharedValue<number>;
  morphProgress: SharedValue<number>;
  chipX: SharedValue<number>;
  chipY: SharedValue<number>;
  chipW: SharedValue<number>;
  chipH: SharedValue<number>;
  searchFieldVisible: boolean;
  lastTabRef: MutableRefObject<string>;
  cacheChipLayout: (layout: MeasuredLayout) => void;
  openSearch: (layout?: MeasuredLayout | null, options?: OpenSearchOptions) => void;
  closeSearchMorph: () => void;
  leaveSearch: (tabName?: string) => void;
};

const TabBarMotionContext = createContext<TabBarMotionContextValue | null>(
  null,
);

const morphEasing = Easing.bezier(0.22, 1, 0.36, 1);

function tabHref(name: string): Href {
  if (name === "index") return "/" as Href;
  return `/${name}` as Href;
}

function isUsableLayout(layout?: MeasuredLayout | null): layout is MeasuredLayout {
  return !!layout && layout.width > 10 && layout.height > 10;
}

export function TabBarMotionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lastTabRef = useRef("index");
  const chipLayoutRef = useRef<MeasuredLayout | null>(null);

  const collapsed = useSharedValue(0);
  const collapseTarget = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const morphProgress = useSharedValue(0);
  const chipX = useSharedValue(0);
  const chipY = useSharedValue(0);
  const chipW = useSharedValue(128);
  const chipH = useSharedValue(48);

  const [searchFieldVisible, setSearchFieldVisible] = useState(false);
  const motionGenRef = useRef(0);
  const searchOpenRef = useRef(false);

  const writeChipFrame = useCallback(
    (layout: MeasuredLayout) => {
      chipX.value = layout.x;
      chipY.value = layout.y;
      chipW.value = layout.width;
      chipH.value = layout.height;
    },
    [chipH, chipW, chipX, chipY],
  );

  const resolveChipFrame = useCallback(
    (layout?: MeasuredLayout | null): MeasuredLayout => {
      if (isUsableLayout(layout)) return layout;
      if (isUsableLayout(chipLayoutRef.current)) return chipLayoutRef.current;
      const window = Dimensions.get("window");
      return fallbackSearchChipLayout(
        window.width,
        window.height,
        insets.bottom,
      );
    },
    [insets.bottom],
  );

  const cacheChipLayout = useCallback(
    (layout: MeasuredLayout) => {
      if (!isUsableLayout(layout)) return;
      chipLayoutRef.current = layout;
      if (morphProgress.value < 0.01) {
        writeChipFrame(layout);
      }
    },
    [morphProgress, writeChipFrame],
  );

  const finishOpen = useCallback((gen: number) => {
    if (motionGenRef.current !== gen) return;
    setSearchFieldVisible(true);
  }, []);

  const closeSearchMorph = useCallback(() => {
    if (!searchOpenRef.current) return;
    searchOpenRef.current = false;
    motionGenRef.current += 1;
    Keyboard.dismiss();
    writeChipFrame(resolveChipFrame(chipLayoutRef.current));
    setSearchFieldVisible(false);
    morphProgress.value = withTiming(0, {
      duration: SEARCH_MORPH_MS,
      easing: morphEasing,
    });
  }, [morphProgress, resolveChipFrame, writeChipFrame]);

  const openSearch = useCallback(
    (layout?: MeasuredLayout | null, options?: OpenSearchOptions) => {
      if (searchOpenRef.current && morphProgress.value > 0.98) return;

      const gen = ++motionGenRef.current;
      searchOpenRef.current = true;
      writeChipFrame(resolveChipFrame(layout));
      setSearchFieldVisible(false);
      morphProgress.value = withTiming(
        1,
        { duration: SEARCH_MORPH_MS, easing: morphEasing },
        (finished) => {
          if (!finished) return;
          runOnJS(finishOpen)(gen);
        },
      );

      if (options?.scope && options.scope !== "all") {
        router.navigate({
          pathname: "/search",
          params: { scope: options.scope },
        } as Href);
      } else {
        router.navigate({
          pathname: "/search",
          params: { scope: "all" },
        } as Href);
      }
    },
    [
      finishOpen,
      morphProgress,
      resolveChipFrame,
      router,
      writeChipFrame,
    ],
  );

  const leaveSearch = useCallback(
    (tabName?: string) => {
      const target = tabName || lastTabRef.current || "index";
      closeSearchMorph();
      router.navigate(tabHref(target));
    },
    [closeSearchMorph, router],
  );

  const value = useMemo(
    () => ({
      collapsed,
      collapseTarget,
      lastScrollY,
      morphProgress,
      chipX,
      chipY,
      chipW,
      chipH,
      searchFieldVisible,
      lastTabRef,
      cacheChipLayout,
      openSearch,
      closeSearchMorph,
      leaveSearch,
    }),
    [
      cacheChipLayout,
      chipH,
      chipW,
      chipX,
      chipY,
      closeSearchMorph,
      collapseTarget,
      collapsed,
      lastScrollY,
      leaveSearch,
      morphProgress,
      openSearch,
      searchFieldVisible,
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
