import { StyleSheet, Platform } from "react-native";

// =============================================================
// DESIGN TOKENS (shared with ViewEventsScreen)
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
  pill: 999,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 40,
    backgroundColor: COLORS.bg,
  },

  // ===========================================================
  // HERO
  // ===========================================================
  heroSection: {
    paddingHorizontal: SPACING.screen,
    paddingTop: Platform.OS === "ios" ? 120 : 100,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -60,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(251, 209, 23, 0.10)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.8,
  },
  heroEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    letterSpacing: 2.4,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.2,
    marginBottom: SPACING.lg,
  },

  // ---- hero image ----
  heroImageShadow: {
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.navyDeep,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroImageClip: {
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 300,
    backgroundColor: COLORS.navyDeep,
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroPlaceholderText: {
    marginTop: 8,
    color: "#9CA3AF",
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  heroImageBadgeText: {
    color: COLORS.navy,
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
  },

  // ===========================================================
  // SECTION HEADERS
  // ===========================================================
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
    marginRight: 10,
  },
  sectionLabel: {
    fontSize: 15,
    color: COLORS.navy,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.2,
  },
  sectionCountPill: {
    marginLeft: 8,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionCountPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
  },

  // ===========================================================
  // GALLERY
  // ===========================================================
  attachmentsSection: {
    paddingHorizontal: SPACING.screen,
    marginTop: SPACING.xl,
  },
  galleryScroll: {
    gap: 12,
    paddingRight: 4,
  },
  galleryImageWrap: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    backgroundColor: COLORS.navyDeep,
  },
  galleryImage: {
    width: 130,
    height: 130,
    backgroundColor: COLORS.navyDeep,
  },

  // ===========================================================
  // DETAILS CARD
  // ===========================================================
  detailsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.screen,
    marginTop: SPACING.xl,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg + 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  descriptionText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    marginBottom: SPACING.lg,
  },

  // ---- Validity navy sub-card ----
  validityCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  validityTitle: {
    color: COLORS.gold,
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(251, 209, 23, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextCol: { flex: 1 },
  infoText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    flexShrink: 1,
  },
  infoSubText: {
    color: "#C7CDE4",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },
  urgentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  urgentText: {
    color: "#FFD404",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },

  // ===========================================================
  // CTA
  // ===========================================================
  ctaSection: {
    paddingHorizontal: SPACING.screen,
    marginTop: SPACING.xl,
  },
  ctaButton: {
    height: 56,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaPrimaryText: {
    color: COLORS.navy,
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.4,
  },
  ctaButtonDisabled: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: COLORS.surfaceMuted,
  },
  ctaDisabledText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    marginLeft: 8,
  },
  ctaHint: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.textSoft,
    fontFamily: "Poppins_400Regular",
    marginTop: 10,
    paddingHorizontal: 16,
  },

  // ===========================================================
  // GALLERY MODAL
  // ===========================================================
  galleryModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 15, 33, 0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryModalContent: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0B0F21",
    overflow: "hidden",
  },
  galleryModalTopBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 44,
    left: 16,
    right: 16,
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  galleryCounterPill: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  galleryCounterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.6,
  },
  galleryModalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryModalStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryModalScroll: { flex: 1 },
  galleryModalScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryModalImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#0B0F21",
  },
});

export default styles;