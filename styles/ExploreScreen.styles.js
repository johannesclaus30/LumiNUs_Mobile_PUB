import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#32418C", // The requested NU Blue
  },

  // --- MINIMALIST HEADER ---
  header: {
    backgroundColor: "#32418C",
    paddingBottom: 24, 
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerLogo: {
    width: 160,
    height: 48,
    resizeMode: "contain",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // --- 🔥 FIXED HERO CARD (Mentorship) 🔥 ---
  heroCard: {
    backgroundColor: "#FBD117", // BOLD SOLID GOLD
    borderRadius: 24,
    padding: 20, 
    marginBottom: 36,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)", 
  },
  heroTextContainer: {
    flex: 1, 
    flexShrink: 1, 
    paddingRight: 12,
  },
  heroBadge: {
    backgroundColor: "#32418C", 
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  heroBadgeText: {
    color: "#ffffff",
    fontSize: 9, 
    fontFamily: "Poppins_800ExtraBold",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 18, 
    fontFamily: "Poppins_800ExtraBold", 
    color: "#32418C", 
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  heroDesc: {
    fontSize: 12, 
    fontFamily: "Poppins_500Medium",
    color: "#32418C",
    opacity: 0.85,
    lineHeight: 16,
  },
  heroImageContainer: {
    width: 60, 
    height: 60,
    backgroundColor: "#FFFFFF", 
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#32418C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  heroIcon: {
    width: 32, 
    height: 32,
    resizeMode: "contain",
  },

  // --- SECTION HEADERS ---
  sectionHeader: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#FBD117",
    marginBottom: 16,
    paddingLeft: 4,
  },

  // --- QUICK TOOLS ROW ---
  quickToolsContainer: {
    marginBottom: 36,
  },
  quickToolsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickToolBtn: {
    alignItems: "center",
    width: "22%", 
  },
  quickToolCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.15)", 
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  quickToolIcon: {
    width: 32,
    height: 32,
    resizeMode: "contain",
    tintColor: "#FBD117", 
  },
  quickToolLabel: {
    fontSize: 11.8,
    fontFamily: "Poppins_600SemiBold", 
    color: "#ffffff",
    textAlign: "center",
  },

  // --- 🔥 NEW NOTIFICATION BADGES 🔥 ---
  badgeContainer: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FF3B30", // Classic high-visibility Red
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#32418C", // Matches the app background to "cut out" the circle
    elevation: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
  },

  // --- BENTO GRID ---
  bentoContainer: {
    marginBottom: 20,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  bentoSquare: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.15)", 
    borderRadius: 24,
    padding: 18,
    height: 150,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  bentoWide: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)", 
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  bentoWideContent: {
    flex: 1,
    paddingRight: 16,
  },
  bentoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  bentoIcon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  bentoTitle: {
    fontSize: 14, 
    fontFamily: "Poppins_700Bold", 
    color: "#ffffff",
    lineHeight: 20,
  },
  bentoSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#ffffff",
    marginTop: 4,
  },

  // --- AGGRESSIVE GOLD BENTO CARD (For NU Website) ---
  bentoSquareAccent: {
    width: "48%",
    backgroundColor: "#FBD117", 
    borderRadius: 24,
    padding: 18,
    height: 150,
    justifyContent: "space-between",
  },
  bentoIconBoxAccent: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(50, 65, 140, 0.15)", 
    justifyContent: "center",
    alignItems: "center",
  },
  bentoIconWhite: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  bentoTitleAccent: {
    fontSize: 14, 
    fontFamily: "Poppins_700Bold",
    color: "#32418C", 
    lineHeight: 20,
  },
  bentoExternalIcon: {
    position: "absolute",
    top: 18,
    right: 18,
    opacity: 0.8,
  },
});

export default styles;