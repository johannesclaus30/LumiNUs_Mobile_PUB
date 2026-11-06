import { Dimensions, StyleSheet } from "react-native";
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveSpacing,
  responsiveWidth,
} from "../utils/responsive";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  titleStrip: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: responsiveSpacing(SCREEN_WIDTH, 18, 14, 24),
    paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 12, 10, 18),
  },
  title: {
    fontSize: responsiveFontSize(SCREEN_WIDTH, 20, 18, 24),
    color: "#31429B",
    lineHeight: responsiveFontSize(SCREEN_WIDTH, 23, 20, 28),
    textAlign: "center",
    flex: 1,
    fontFamily: "Poppins_800ExtraBold",
  },
  backButton: {
    width: responsiveWidth(SCREEN_WIDTH, 0.11, 40, 48),
    height: responsiveWidth(SCREEN_WIDTH, 0.11, 40, 48),
    borderRadius: responsiveWidth(SCREEN_WIDTH, 0.055, 20, 24),
    backgroundColor: "#F2C919",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#31429B",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  backButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  content: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsiveSpacing(SCREEN_WIDTH, 24, 16, 32),
    paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 20, 16, 30),
  },
  comingSoonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: responsiveSpacing(SCREEN_WIDTH, 32, 24, 40),
    alignItems: "center",
    shadowColor: "#31429B",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxWidth: 400,
    width: "100%",
  },
  comingSoonIconWrap: {
    width: responsiveWidth(SCREEN_WIDTH, 0.32, 100, 130),
    height: responsiveWidth(SCREEN_WIDTH, 0.32, 100, 130),
    borderRadius: responsiveWidth(SCREEN_WIDTH, 0.16, 50, 65),
    backgroundColor: "rgba(49, 66, 155, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsiveSpacing(SCREEN_HEIGHT, 20, 16, 28),
  },
  comingSoonTitle: {
    fontSize: responsiveFontSize(SCREEN_WIDTH, 28, 24, 34),
    color: "#31429B",
    marginBottom: responsiveSpacing(SCREEN_HEIGHT, 8, 6, 12),
    fontFamily: "Poppins_900Black",
  },
  comingSoonSubtitle: {
    fontSize: responsiveFontSize(SCREEN_WIDTH, 16, 14, 18),
    fontWeight: "600",
    color: "#4B5563",
    textAlign: "center",
    marginBottom: responsiveSpacing(SCREEN_HEIGHT, 12, 10, 16),
    fontFamily: "Poppins_600SemiBold",
  },
  comingSoonDescription: {
    fontSize: responsiveFontSize(SCREEN_WIDTH, 14, 12, 16),
    color: "#6B7280",
    textAlign: "center",
    lineHeight: responsiveFontSize(SCREEN_WIDTH, 20, 18, 24),
    marginBottom: responsiveSpacing(SCREEN_HEIGHT, 20, 16, 24),
    fontFamily: "Poppins_400Regular",
  },
  comingSoonProgress: {
    width: "100%",
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: responsiveHeight(SCREEN_HEIGHT, 0.01, 6, 10),
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    width: "35%",
    height: "100%",
    backgroundColor: "#F2C919",
    borderRadius: 4,
  },
  progressText: {
    marginTop: responsiveSpacing(SCREEN_HEIGHT, 8, 6, 10),
    fontSize: responsiveFontSize(SCREEN_WIDTH, 12, 10, 14),
    color: "#9CA3AF",
    fontWeight: "500",
    fontFamily: "Poppins_500Medium",
  },
  footerSpacer: {
    height: responsiveSpacing(SCREEN_HEIGHT, 10, 8, 16),
  },
});

export default styles;