import React from "react";
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { responsiveHeight, responsiveWidth } from "../utils/responsive";
import { useHeaderStatusBar } from "../hooks/useHeaderStatusBar";

const TopHeaderDark = () => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  // 🔥 Header is NAVY → white status bar icons
  useHeaderStatusBar("light", "#1F2B67");

  const layout = {
    leftLogoWidth: responsiveWidth(width, 0.28, 110, isTablet ? 150 : 130),
    leftLogoHeight: responsiveHeight(height, 0.05, 40, 50),
    rightLogoWidth: responsiveWidth(width, 0.36, 135, isTablet ? 180 : 160),
    rightLogoHeight: responsiveHeight(height, 0.05, 40, 50),
    cardMinHeight: responsiveHeight(height, 0.08, 60, 80),
  };

  return (
    <View style={styles.transparentWrapper} pointerEvents="box-none">
      <StatusBar style="light" backgroundColor="#1F2B67" />
      <View style={[styles.darkContainer, { minHeight: layout.cardMinHeight }]}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/NU Lipa AAO Logo white.png")}
            style={[
              styles.leftLogo,
              { width: layout.leftLogoWidth, height: layout.leftLogoHeight },
            ]}
            resizeMode="contain"
          />

          <Image
            source={require("../../assets/images/LumiNUs Logo white.png")}
            style={[
              styles.rightLogo,
              { width: layout.rightLogoWidth, height: layout.rightLogoHeight },
            ]}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  transparentWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingBottom: 24,
    zIndex: 1000,
  },
  darkContainer: {
    backgroundColor: "#1F2B67",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: Platform.OS === "ios" ? 55 : 35,
    paddingBottom: 20,
    paddingHorizontal: 16,
    width: "100%",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
  },
  leftLogo: { marginRight: -2 },
  rightLogo: { marginLeft: -2 },
});

export default TopHeaderDark;