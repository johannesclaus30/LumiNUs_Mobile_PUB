// SectionCompleteScreen.styles.js
import { StyleSheet } from "react-native";

const COLORS = {
  deepSpace: '#0A0E27',
  spaceNavy: '#0F1535',
  cardBg: '#161E4A',
  cardBgLight: '#1A2355',
  
  goldStar: '#FFD404',
  goldStarSoft: 'rgba(255,212,4,0.15)',
  goldStarBorder: 'rgba(255,212,4,0.25)',
  
  starlight: '#F0F2FF',
  nebulaBlue: '#3B82F6',
  nebulaGreen: '#10B981',
  nebulaPurple: '#7C3AED',
  
  white: '#FFFFFF',
  whiteAlpha05: 'rgba(255,255,255,0.05)',
  whiteAlpha08: 'rgba(255,255,255,0.08)',
  whiteAlpha10: 'rgba(255,255,255,0.10)',
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha20: 'rgba(255,255,255,0.20)',
  whiteAlpha40: 'rgba(255,255,255,0.40)',
  whiteAlpha50: 'rgba(255,255,255,0.50)',
  whiteAlpha60: 'rgba(255,255,255,0.60)',
  whiteAlpha70: 'rgba(255,255,255,0.70)',
  whiteAlpha80: 'rgba(255,255,255,0.80)',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',
};

const FONTS = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

const styles = StyleSheet.create({
  // ─────────────────────────────────────────────
  // LAYOUT
  // ─────────────────────────────────────────────
  safeArea: { flex: 1, backgroundColor: COLORS.deepSpace },
  container: { flex: 1, backgroundColor: COLORS.deepSpace },
  starsContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  confettiContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 32,
  },
  
  content: {
    flex: 1,
    justifyContent: 'center',
  },

  // ─────────────────────────────────────────────
  // HERO / RING
  // ─────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ringContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.goldStarSoft,
    opacity: 0.5,
  },
  ringBg: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 7,
    borderColor: COLORS.whiteAlpha08,
    position: 'absolute',
  },
  ringArc: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 7,
    borderColor: 'transparent',
    borderTopColor: COLORS.goldStar,
    borderRightColor: COLORS.goldStar,
    borderBottomColor: 'rgba(255,212,4,0.3)',
    position: 'absolute',
  },
  ringCenter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.spaceNavy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.goldStarBorder,
  },
  ringEmoji: { fontSize: 42 },

  // ─────────────────────────────────────────────
  // TITLES
  // ─────────────────────────────────────────────
  titleBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  congratsLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.goldStar,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 10,
  },
  congratsTitle: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    color: COLORS.starlight,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  congratsSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.whiteAlpha60,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  // ─────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.goldStar,
    marginBottom: 6,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.whiteAlpha50,
    textAlign: 'center',
    lineHeight: 14,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: COLORS.whiteAlpha10,
    alignSelf: 'center',
  },

  // ─────────────────────────────────────────────
  // SECTION HEADER
  // ─────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.whiteAlpha50,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.whiteAlpha10,
    marginLeft: 12,
  },

  // ─────────────────────────────────────────────
  // ACHIEVEMENTS
  // ─────────────────────────────────────────────
  achievementsContainer: {
    marginBottom: 20,
    gap: 10,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha10,
  },
  achievementEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.whiteAlpha05,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha08,
  },
  achievementEmoji: {
    fontSize: 22,
  },
  achievementInfo: { flex: 1 },
  achievementTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.starlight,
    marginBottom: 3,
  },
  achievementDescription: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.whiteAlpha50,
    lineHeight: 15,
  },

  // ─────────────────────────────────────────────
  // XP CARD
  // ─────────────────────────────────────────────
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.goldStarSoft,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.goldStarBorder,
  },
  xpIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,212,4,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  xpIcon: { fontSize: 20 },
  xpText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.whiteAlpha80,
    flex: 1,
    lineHeight: 20,
  },

  // ─────────────────────────────────────────────
  // BUTTONS
  // ─────────────────────────────────────────────
  buttonsContainer: { gap: 12 },
  shareProgressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.45)',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.goldStar,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: COLORS.goldStar,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#1A237E',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.whiteAlpha08,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.goldStarBorder,
  },
  secondaryButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.goldStar,
    letterSpacing: 0.3,
  },
});

export { COLORS, FONTS };
export default styles;