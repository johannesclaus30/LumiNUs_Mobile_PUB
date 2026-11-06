import { useCallback } from "react";
import { Platform, StatusBar as RNStatusBar } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Applies the status bar style whenever the screen using this header is focused.
 *
 * @param {"light" | "dark"} style   - "light" = white icons, "dark" = black icons
 * @param {string} backgroundColor   - Android-only status bar background color
 */
export const useHeaderStatusBar = (style, backgroundColor) => {
  useFocusEffect(
    useCallback(() => {
      const barStyle = style === "light" ? "light-content" : "dark-content";

      RNStatusBar.setBarStyle(barStyle, true);

      if (Platform.OS === "android" && backgroundColor) {
        RNStatusBar.setBackgroundColor(backgroundColor, true);
      }
    }, [style, backgroundColor])
  );
};