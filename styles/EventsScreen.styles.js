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
  pill: 999,
};

// =============================================================
// STYLES
// =============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === "ios" ? 130 : 110,
  },

  // ===========================================================
  // HERO
  // ===========================================================
  hero: {
    marginHorizontal: SPACING.screen,
    marginTop: 20,
    borderRadius: RADIUS.xl + 8,
    paddingHorizontal: SPACING.lg + 2,
    paddingTop: SPACING.lg + 4,
    paddingBottom: SPACING.lg + 2,
    overflow: "hidden",
  },
  heroGlow1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(251, 209, 23, 0.14)",
  },
  heroGlow2: {
    position: "absolute",
    bottom: -80,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.lg,
  },
  heroEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    letterSpacing: 2.2,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 6,
    opacity: 0.92,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.2,
  },
  heroStatPill: {
    backgroundColor: "rgba(251, 209, 23, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(251, 209, 23, 0.35)",
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 72,
  },
  heroStatNumber: {
    color: COLORS.gold,
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    lineHeight: 22,
  },
  heroStatLabel: {
    color: "#E5E7EB",
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    marginTop: 2,
    letterSpacing: 0.4,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
  },

  quickActionsRow: {
    flexDirection: "row",
    marginTop: SPACING.lg,
    gap: 10,
  },
  quickAction: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: RADIUS.md + 2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(251, 209, 23, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.2,
  },
  quickActionBadge: {
    position: "absolute",
    top: 6,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  quickActionBadgeText: {
    color: COLORS.navy,
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
  },

  // ===========================================================
  // INLINE CALENDAR
  // ===========================================================
  calendarSheet: {
    marginHorizontal: SPACING.screen,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  calendarNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthLabel: {
    fontSize: 15,
    color: COLORS.navy,
    fontFamily: "Poppins_600SemiBold",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: COLORS.textSoft,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.6,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: SPACING.md,
  },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBubbleToday: {
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  dayBubbleHasEvent: {
    backgroundColor: "#EEF1FA",
  },
  dayBubbleSelected: {
    backgroundColor: COLORS.navy,
  },
  dayText: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: "Poppins_400Regular",
  },
  dayTextToday: {
    color: COLORS.navy,
    fontFamily: "Poppins_700Bold",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  dayDot: {
    position: "absolute",
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.navy,
  },

  selectedDayPanel: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  selectedDayHeading: {
    fontSize: 12,
    color: COLORS.navy,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 8,
  },
  selectedDayEmpty: {
    fontSize: 12,
    color: COLORS.textSoft,
    fontFamily: "Poppins_400Regular",
  },
  selectedDayItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  selectedDayTimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginRight: 10,
  },
  selectedDayItemText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: "Poppins_500Medium",
    marginRight: 8,
  },

  // ===========================================================
  // SECTIONS
  // ===========================================================
  section: {
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.screen,
    marginBottom: SPACING.md,
  },
  sectionEyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.goldDark,
    fontFamily: "Poppins_700Bold",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    color: COLORS.navy,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.1,
  },
  sectionLink: {
    fontSize: 13,
    color: COLORS.navy,
    fontFamily: "Poppins_600SemiBold",
    textDecorationLine: "underline",
  },

  // ===========================================================
  // CAROUSEL
  // ===========================================================
// OUTER — carries the shadow, must NOT clip
carouselCardShadow: {
  borderRadius: RADIUS.xl,
  backgroundColor: COLORS.navyDeep, // ensures Android shadow has a base color
  // iOS shadow
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  // Android shadow
  elevation: 6,
},
// INNER — clips the image to rounded corners
carouselCardInner: {
  borderRadius: RADIUS.xl,
  overflow: "hidden",
  backgroundColor: COLORS.navyDeep,
},
  carouselImageWrap: {
    position: "relative",
    width: "100%",
    height: 200,
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.navyDeep,
  },
  carouselImageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",  // ← gradient covers only the bottom 70%
  },
  dateBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 44,
  },
  dateBadgeDay: {
    color: COLORS.navy,
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    lineHeight: 18,
  },
  dateBadgeMonth: {
    color: COLORS.goldDark,
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 1,
  },
  carouselRegisteredPill: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  carouselRegisteredText: {
    color: COLORS.navy,
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.6,
  },
  carouselTextBlock: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  carouselTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold",
    marginBottom: 4,
  },
  carouselMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  carouselMetaText: {
    color: "#E5E7EB",
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    flexShrink: 1,
  },

  // ===========================================================
  // FILTER CHIPS
  // ===========================================================
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: SPACING.screen,
    gap: 8,
    marginBottom: SPACING.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.navySoft,
    fontFamily: "Poppins_600SemiBold",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },

  // ===========================================================
  // LIST ROW
  // ===========================================================
  listWrap: {
    paddingHorizontal: SPACING.screen,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  listDateCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    marginRight: 10,
    minWidth: 42,
  },
  listDateDay: {
    fontSize: 18,
    color: COLORS.navy,
    fontFamily: "Poppins_700Bold",
    lineHeight: 20,
  },
  listDateMonth: {
    fontSize: 9,
    color: COLORS.goldDark,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 1,
    marginTop: 2,
  },
  listThumb: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.navyDeep,
    marginRight: 12,
  },
  listTextCol: {
    flex: 1,
    marginRight: 8,
  },
  listTitle: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: "Poppins_700Bold",
    lineHeight: 17,
    marginBottom: 4,
  },
  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  listMetaText: {
    fontSize: 11,
    color: COLORS.navySoft,
    fontFamily: "Poppins_500Medium",
    flexShrink: 1,
  },
  listRegisteredTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.goldSoft,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    marginTop: 4,
    gap: 3,
  },
  listRegisteredText: {
    color: COLORS.navy,
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.4,
  },

  viewMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.navy,
    marginTop: SPACING.md,
    gap: 8,
  },
  viewMoreText: {
    fontSize: 13,
    color: COLORS.navy,
    fontFamily: "Poppins_600SemiBold",
  },

  // ===========================================================
  // COMING SOON STRIP
  // ===========================================================
  comingSoonStrip: {
    marginHorizontal: SPACING.screen,
    marginTop: SPACING.xl,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    overflow: "hidden",
  },
  comingSoonHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  comingSoonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  comingSoonTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
  comingSoonSubtitle: {
    color: "#C7CDE4",
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },

  // ===========================================================
  // LOADING / EMPTY
  // ===========================================================
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  loadingWrapSmall: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  loadingTextDark: {
    marginTop: 8,
    color: COLORS.navy,
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    color: COLORS.navy,
    fontFamily: "Poppins_700Bold",
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 12,
    color: COLORS.textSoft,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  inlineEmpty: {
    paddingHorizontal: SPACING.screen,
    paddingVertical: 20,
    alignItems: "center",
  },
  inlineEmptyText: {
    fontSize: 13,
    color: COLORS.textSoft,
    fontFamily: "Poppins_400Regular",
  },

  // ===========================================================
  // BOTTOM SHEET (shared)
  // ===========================================================
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACING.lg,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  sheetEyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.goldDark,
    fontFamily: "Poppins_700Bold",
    marginBottom: 3,
  },
  sheetTitle: {
    fontSize: 20,
    color: COLORS.navy,
    fontFamily: "Poppins_700Bold",
  },
  sheetSubtitle: {
    fontSize: 12,
    color: COLORS.textSoft,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 12,
  },
  sheetEmptyImage: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  sheetEmptyTitle: {
    fontSize: 16,
    color: COLORS.navy,
    fontFamily: "Poppins_700Bold",
    marginBottom: 6,
  },
  sheetEmptyBody: {
    fontSize: 13,
    color: COLORS.textSoft,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    maxWidth: 280,
  },
});

export default styles;