/**
 * Keeps the focused field above the keyboard.
 *
 * Built from React Native keyboard events and ScrollView, with no new native
 * module, so it can ship as an over-the-air update. Android edge-to-edge does
 * not shrink the window when the keyboard opens, so the extra space is the
 * keyboard height itself.
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type HostInstance,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FIELD_GAP = 24;

type ScrollResponder = {
  scrollResponderScrollNativeHandleToKeyboard?: (
    nodeHandle: number | HostInstance,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean,
  ) => void;
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
  getScrollResponder?: () => ScrollResponder | null | undefined;
};

const scrollListeners = new Set<() => void>();

/** Call when a field focuses and the keyboard is already open. */
export function requestKeyboardScroll(): void {
  requestAnimationFrame(() => {
    for (const listener of scrollListeners) listener();
  });
}

function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/** Extra padding that clears the keyboard, minus the home-indicator inset. */
export function useKeyboardInset(): number {
  const insets = useSafeAreaInsets();
  const height = useKeyboardHeight();
  return Math.max(0, height - insets.bottom);
}

export function withKeyboardPadding(
  style: StyleProp<ViewStyle> | undefined,
  extra: number,
): StyleProp<ViewStyle> {
  if (extra <= 0) return style;
  const flat = StyleSheet.flatten(style);
  const current = typeof flat?.paddingBottom === "number" ? flat.paddingBottom : 0;
  return [style, { paddingBottom: current + extra }];
}

function responderFrom(current: object | null): ScrollResponder | null {
  if (current == null) return null;
  const record = current as ScrollResponder;
  if (typeof record.scrollResponderScrollNativeHandleToKeyboard === "function") {
    return record;
  }
  const inner = record.getScrollResponder?.() ?? null;
  if (
    inner &&
    typeof inner.scrollResponderScrollNativeHandleToKeyboard === "function"
  ) {
    return inner;
  }
  return null;
}

function scrollFocusedField(current: object | null): void {
  const input = TextInput.State.currentlyFocusedInput();
  const responder = responderFrom(current);
  if (input == null || responder?.scrollResponderScrollNativeHandleToKeyboard == null) {
    return;
  }

  const scroll = (offset: number) => {
    responder.scrollResponderScrollNativeHandleToKeyboard?.(input, offset, true);
  };

  if (typeof responder.measureInWindow !== "function") {
    scroll(FIELD_GAP);
    return;
  }

  responder.measureInWindow((_x, y) => {
    const top = Number.isFinite(y) ? Math.max(0, y) : 0;
    scroll(top + FIELD_GAP);
  });
}

/**
 * Pads `ref`'s scroll view while the keyboard is open and scrolls the focused
 * field above it. Returns the extra bottom padding to add.
 */
export function useKeyboardScroll(ref: RefObject<unknown>): number {
  const inset = useKeyboardInset();

  useEffect(() => {
    const scroll = () => {
      if (inset <= 0) return;
      scrollFocusedField(ref.current as object | null);
    };
    scrollListeners.add(scroll);
    if (inset > 0) {
      const timer = setTimeout(scroll, Platform.OS === "ios" ? 60 : 80);
      return () => {
        clearTimeout(timer);
        scrollListeners.delete(scroll);
      };
    }
    return () => {
      scrollListeners.delete(scroll);
    };
  }, [inset, ref]);

  return inset;
}

type KeyboardFormScrollProps = ScrollViewProps & {
  children?: ReactNode;
};

export const KeyboardFormScroll = forwardRef<ScrollView, KeyboardFormScrollProps>(
  function KeyboardFormScroll(
    { style, contentContainerStyle, children, ...rest },
    ref,
  ) {
    const innerRef = useRef<ScrollView>(null);
    const keyboardInset = useKeyboardScroll(innerRef);

    useImperativeHandle(ref, () => innerRef.current as ScrollView);

    return (
      <ScrollView
        ref={innerRef}
        {...rest}
        style={[styles.fill, style]}
        keyboardShouldPersistTaps={rest.keyboardShouldPersistTaps ?? "handled"}
        keyboardDismissMode={rest.keyboardDismissMode ?? "on-drag"}
        contentContainerStyle={withKeyboardPadding(contentContainerStyle, keyboardInset)}
      >
        {children}
      </ScrollView>
    );
  },
);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
