import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const cardWidth = (width - 48) / 2;


const NU_BLUE = "#32418C";
const NU_BLUE_DARK = "#192257";

const NU_GOLD = "#FBD117";
const INK = "#0F172A";
const MUTED = "#64748B";
const SURFACE = "#F7F8FC";
const HAIRLINE = "#E7EAF3";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: NU_BLUE,
  },
  container: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  headerSpacer: {
    height: 108,
    backgroundColor: NU_BLUE_DARK,
  },

  /* ---------- Loading ---------- */
  loadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    backgroundColor: SURFACE,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  skeletonCard: {
    minHeight: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: HAIRLINE,
    padding: 16,
    alignItems: "center",
  },
  skeletonAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEF1FA",
    marginBottom: 16,
  },
  skeletonLine: {
    width: "70%",
    height: 10,
    borderRadius: 4,
    backgroundColor: "#EEF1FA",
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: "50%",
    marginBottom: 22,
  },
  skeletonButton: {
    width: "100%",
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EEF1FA",
    marginTop: "auto",
  },

  /* ---------- Hero ---------- */
  hero: {
    backgroundColor: NU_BLUE_DARK,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 2,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 18,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: NU_GOLD,
    letterSpacing: 2.4,
    marginBottom: 7,
  },
  heroTitle: {
    fontSize: 25,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 31,
    marginBottom: 5,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#C7CFE8",
    lineHeight: 18,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: NU_GOLD,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-6deg" }],
  },
  /* ---------- Control card (search + filters) ---------- */
  controlCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: -18,
    borderRadius: 18,
    paddingTop: 10,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: HAIRLINE,
    shadowColor: "#0B1436",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FC",
    marginHorizontal: 12,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F6",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: INK,
    paddingVertical: 0,
  },
  searchHint: {
    marginTop: 5,
    marginHorizontal: 16,
    color: "#94A3B8",
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 3,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: HAIRLINE,
  },
  filterChipActive: {
    backgroundColor: NU_GOLD,
    borderColor: NU_GOLD,
  },
  filterChipText: {
    color: MUTED,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  filterChipTextActive: {
    color: NU_BLUE,
    fontFamily: "Poppins_600SemiBold",
  },

  /* ---------- Content ---------- */
  contentArea: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 48,
  },
  resultsRow: {
    marginBottom: 14,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: MUTED,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: INK,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: MUTED,
  },
  sectionBadge: {
    backgroundColor: "#E9ECF8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: NU_BLUE,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  /* ---------- Card ---------- */
  cardWrapper: {
    width: cardWidth,
    marginBottom: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: HAIRLINE,
    padding: 14,
    paddingTop: 16,
    shadowColor: "#0B1436",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    minHeight: 226,
    justifyContent: "space-between",
  },
  cardTop: {
    alignItems: "center",
    width: "100%",
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: NU_BLUE,
  },
  avatarDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: NU_GOLD,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  cardName: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: INK,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 4,
    minHeight: 38,
  },
  cardMeta: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: MUTED,
    textAlign: "center",
    marginBottom: 10,
  },

  /* ---------- Mutual ---------- */
  mutualRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#F5F6FA",
    marginBottom: 10,
    maxWidth: "100%",
  },
  mutualAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  mutualText: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    color: "#475569",
    marginLeft: 6,
  },

  /* ---------- Card actions ---------- */
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: NU_BLUE,
    marginTop: 4,
  },
  actionButtonPending: {
    backgroundColor: "#EEF1FA",
  },
  actionButtonSending: {
    backgroundColor: "#4A5899",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.2,
  },
  actionButtonTextPending: {
    color: NU_BLUE,
  },

  /* ---------- Show all ---------- */
  showAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: HAIRLINE,
  },
  showAllText: {
    color: NU_BLUE,
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },

  /* ---------- Empty ---------- */
  emptyState: {
    paddingHorizontal: 32,
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E9ECF8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: INK,
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyBody: {
    color: MUTED,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCta: {
    backgroundColor: NU_BLUE,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyCtaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  /* ---------- Toast ---------- */
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: NU_BLUE,
    flexDirection: "row",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#0B1436",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    borderWidth: 1,
    borderColor: "#3E4DA3",
  },
  toastIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: NU_GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    flex: 1,
    marginLeft: 10,
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
});

export default styles;