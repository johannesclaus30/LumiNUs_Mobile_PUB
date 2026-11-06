import { StyleSheet, Platform } from "react-native";

// =============================================================
// DESIGN TOKENS
// =============================================================
export const COLORS = {
  navy: "#32418C",
  navyDark: "#242F6B",
  navyDeep: "#1B2450",
  navySoft: "#5A68A8",
  gold: "#FBD117",
  goldDark: "#E0B70F",
  goldSoft: "#FFF3C4",
  bg: "#F4F5FA",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  border: "#EAECF3",
  text: "#111827",
  textMuted: "#4B5563",
  textSoft: "#6B7280",
  placeholder: "#9CA3AF",
  success: "#10B981",
  danger: "#D92D20",
};

export const SPACING = {
  screen: 20,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.navy },
  container: { flex: 1, backgroundColor: COLORS.bg },

  // ===========================================================
  // HERO
  // ===========================================================
  hero: {
    paddingHorizontal: SPACING.screen,
    paddingTop: Platform.OS === "ios" ? 28 : 28,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroGlowA: {
    position: "absolute",
    top: -100,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(251, 209, 23, 0.14)",
  },
  heroGlowB: {
    position: "absolute",
    bottom: -80,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTopRight: { flexDirection: "row", alignItems: "center" },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  heroTagText: {
    color: COLORS.navy,
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 1,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 38,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: "85%",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    height: 50,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
  },

  // ===========================================================
  // FILTERS (circle pills)
  // ===========================================================
  filtersRow: {
    paddingHorizontal: SPACING.screen,
    paddingTop: 18,
    paddingBottom: 6,
    gap: 14,
  },
  filterPillWrap: {
    alignItems: "center",
    width: 68,
  },
  filterIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  filterIconActive: {
    backgroundColor: COLORS.gold,
    borderColor: "#FFFFFF",
    shadowColor: COLORS.gold,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  filterLabel: {
    fontSize: 11,
    color: COLORS.navySoft,
    fontFamily: "Poppins_600SemiBold",
  },
  filterLabelActive: {
    color: COLORS.navy,
    fontFamily: "Poppins_700Bold",
  },

  // ===========================================================
  // SECTION TITLE
  // ===========================================================
  sectionWrap: {
    marginTop: 22,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.screen,
    marginBottom: 14,
  },
  sectionTitleRow2: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.screen,
    marginTop: 28,
    marginBottom: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 19,
    color: COLORS.navy,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.3,
  },
  sectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  sectionBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 1,
  },
  countPill: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    minWidth: 26,
    alignItems: "center",
  },
  countPillText: {
    color: COLORS.navy,
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  // ===========================================================
  // FEATURED CARD
  // ===========================================================
  featureCard: {
    width: "100%",
    height: 260,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.navyDeep,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  featureImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  featureOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "75%",       // ← only bottom 75%
  },
  featureTopGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 90,          // ← small strip at top for tag legibility
  },
  featureTopRow: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featureTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  featureTagText: {
    color: COLORS.navy,
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 1,
  },
  featureDaysBadge: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  featureDaysText: {
    color: COLORS.navy,
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
  },
  featureBottom: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
  },
  featureTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 27,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.3,
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  featureDesc: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginBottom: 10,
  },
  featureMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  featureMetaText: {
    color: "#E5E7EB",
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },

  // Progress bar
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: SPACING.screen,
    marginTop: 14,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(50,65,140,0.15)",
  },
  progressBarActive: {
    backgroundColor: COLORS.navy,
  },

  // ===========================================================
  // GRID CARD
  // ===========================================================
  listContent: {
    paddingBottom: 40,
  },
  gridRow: {
    paddingHorizontal: SPACING.screen,
    justifyContent: "space-between",
  },
  gridCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  gridCardImageWrap: {
    width: "100%",
    height: 140,
    backgroundColor: COLORS.navyDeep,
    position: "relative",
  },
  gridCardImage: {
    width: "100%",
    height: "100%",
  },
  gridCardImageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",  
  },
  gridBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  gridBadgeSoon: {
    backgroundColor: COLORS.gold,
  },
  gridBadgeExpired: {
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  gridBadgeTextDark: {
    color: COLORS.navy,
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.4,
  },
  gridBadgeTextLight: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.4,
  },
  gridCardBody: {
    padding: 12,
  },
  gridCardTitle: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: "Poppins_700Bold",
    lineHeight: 17,
    marginBottom: 4,
    minHeight: 34,
  },
  gridCardDesc: {
    fontSize: 11,
    color: COLORS.textSoft,
    fontFamily: "Poppins_400Regular",
    lineHeight: 15,
    marginBottom: 10,
    minHeight: 30,
  },
  gridCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  gridCardFooterText: {
    fontSize: 10,
    color: COLORS.navySoft,
    fontFamily: "Poppins_500Medium",
    flexShrink: 1,
  },

  // ===========================================================
  // IMAGE FALLBACK
  // ===========================================================
  imgFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.navyDeep,
  },

  // ===========================================================
  // STATE (LOADING / EMPTY / ERROR)
  // ===========================================================
  stateCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.navy,
    fontFamily: "Poppins_600SemiBold",
  },
  stateIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  stateTitle: {
    fontSize: 16,
    color: COLORS.navy,
    fontFamily: "Poppins_700Bold",
    marginBottom: 6,
  },
  stateText: {
    fontSize: 13,
    color: COLORS.textSoft,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
  },
  retryText: {
    color: COLORS.navy,
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.4,
  },
});

export default styles;