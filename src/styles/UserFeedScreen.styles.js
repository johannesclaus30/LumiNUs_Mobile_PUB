import { Dimensions, StyleSheet, Platform } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F9", // Slightly cooler, premium light grey
  },
  content: {
    paddingBottom: 24,
  },
  
  // --- SEARCH BAR ---
  searchContainer: {
    paddingHorizontal: 16,
    // Provide clearance for the absolutely positioned HomeHeader
    paddingTop: Platform.OS === "ios" ? 140 : 120, 
    paddingBottom: 20,
    backgroundColor: "#F4F5F9",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999, // Perfect pill shape
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)", // Crisp micro-border
    paddingHorizontal: 18,
    height: 50,
    shadowColor: "#1C1C1E",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
    opacity: 0.7, // Soften the icon slightly
  },
  searchPlaceholderText: {
    fontSize: 16,
    color: "#94A3B8", // Sleeker placeholder slate
    fontFamily: "Poppins_400Regular",
  },

  // --- CREATE POST BUTTON ---
  createPostButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999, // Perfect pill shape
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 16,
    height: 54,
    marginTop: 8, 
    marginBottom: 12, 
    shadowColor: "#1C1C1E",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  createPostIcon: {
    marginRight: 8,
  },
  createPostText: {
    fontSize: 16, // Slightly scaled down for elegance
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
  },

  // --- REPOST WRAPPER ---
  repostWrapper: {
    backgroundColor: "#FBE27F", // Softer, more premium warm gold
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingTop: 16,
    shadowColor: "#D9A900",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  repostBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  repostBannerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
  },
  repostBannerText: {
    fontSize: 14,
    color: "#574000", // Darkened for better contrast against gold
    fontFamily: "Poppins_500Medium", // Bumped weight slightly for legibility
    flexShrink: 1,
  },
  repostBannerName: {
    fontFamily: "Poppins_700Bold",
    color: "#3F2D00",
  },
  repostInnerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginHorizontal: 2, // Slight indent to show the gold wrapper framing it
    marginBottom: 2,
  },

  // --- POST CARD ---
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24, // Smoother, larger radius
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)", // Micro-border
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#1C1C1E",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center", // Centered for better visual balance
    marginBottom: 14,
  },
  postAvatar: {
    width: 48, // Slightly larger
    height: 48,
    borderRadius: 24,
    backgroundColor: "#31429B",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB", // Prevents white avatars from vanishing
  },
  announcementAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  postHeaderTextWrap: {
    flex: 1,
    paddingRight: 8,
    justifyContent: "center",
  },
  postAuthorName: {
    fontSize: 16,
    color: "#111827",
    fontFamily: "Poppins_700Bold",
    marginBottom: 2,
    letterSpacing: -0.3, // Modern typography touch
  },
  postMeta: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_500Medium",
  },
  postMenuButton: {
    width: 32,
    height: 32,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  postCaption: {
    fontSize: 15,
    lineHeight: 24, // Increased line height for better readability
    color: "#334155", // Softer black
    fontFamily: "Poppins_400Regular",
    marginBottom: 14,
  },
  captionMention: {
    fontFamily: "Poppins_600SemiBold",
    color: "#31429B",
    backgroundColor: "#EEF2FF", // Subtle highlight background
    overflow: 'hidden',
    borderRadius: 4,
  },
  captionBlock: {
    marginBottom: 12,
  },
  captionMeasureWrap: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
    zIndex: -1,
  },
  captionMeasureText: {
    position: "relative",
  },
  readMoreButton: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  readMoreText: {
    fontSize: 14,
    color: "#31429B",
    fontFamily: "Poppins_600SemiBold",
  },
  announcementTitle: {
    fontSize: 17,
    lineHeight: 24,
    color: "#0F172A",
    fontFamily: "Poppins_700Bold",
    marginBottom: 8,
  },
  repostContextRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 12,
  },
  repostContextText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#475569",
    fontFamily: "Poppins_400Regular",
  },
  repostContextName: {
    fontFamily: "Poppins_700Bold",
    color: "#047857", // Deeper green for contrast
  },

  // --- POST IMAGES ---
  postSingleImageWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)", // Subtle frame
  },
  postSingleImage: {
    width: "100%",
    height: "100%",
  },
  postTwoGrid: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  postTwoPrimaryTile: { flex: 1.15, borderRadius: 12, overflow: "hidden", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  postTwoSecondaryTile: { flex: 0.85, borderRadius: 12, overflow: "hidden", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  postThreeCollage: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  postThreeLeftTile: { flex: 1.45, borderRadius: 12, overflow: "hidden", backgroundColor: "#F8FAFC", aspectRatio: 0.92, borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  postThreeRightColumn: { flex: 0.9, gap: 8, alignSelf: "stretch", justifyContent: "space-between" },
  postThreeRightTile: { flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#F8FAFC", aspectRatio: 1, borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  postFourGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  postFourGridTile: { width: "48.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  postFivePlusGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  postFivePlusTile: { width: "48.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  postCollageImage: { width: "100%", height: "100%", backgroundColor: "#F8FAFC" },
  postImagePressable: { width: "100%", height: "100%" },
  postMediaImage: { width: "100%", height: "100%", backgroundColor: "#F8FAFC" },
  postImageOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)", alignItems: "center", justifyContent: "center", // Slightly darker overlay
  },
  postImageOverlayText: {
    fontSize: 28, color: "#FFFFFF", fontFamily: "Poppins_700Bold",
  },

  // --- POST ACTIONS (FOOTER) ---
  postReactionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9", // Added subtle divider line for actions
    gap: 20, // Slightly spaced out more
  },
  postActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8, // Gives them a subtle touch target area
  },
  tracerAnswerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#31429B",
  },
  tracerAnswerButtonText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  postActionCount: {
    fontSize: 14,
    color: "#475569", // Subtler than primary blue for unselected state
    fontFamily: "Poppins_600SemiBold",
  },

  // --- LOADING / EMPTY STATES ---
  feedStateCard: {
    backgroundColor: "#FFFFFF", // Upgraded to white card
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
    shadowColor: "#1C1C1E",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  feedStateText: {
    fontSize: 15,
    color: "#64748B",
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
  },
  emptySpace: {
    flex: 1,
    minHeight: 120,
  },

  // --- MODALS / VIEWER / ETC ---
  viewerBackdrop: { flex: 1, backgroundColor: "#0F172A", alignItems: "stretch", justifyContent: "flex-start" }, // Deeper slate background
  viewerContent: { flex: 1, backgroundColor: "#0F172A", position: "relative" },
  viewerPager: { flex: 1 },
  viewerScrollContent: { flexGrow: 1 },
  viewerScrollItem: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: "center", justifyContent: "center" },
  viewerImageCard: { width: "100%", height: "100%", overflow: "hidden", backgroundColor: "#0F172A" },
  viewerImagePressable: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  viewerImage: { backgroundColor: "transparent", alignSelf: "center" },
  viewerTopBar: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: 48, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewerTopButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" }, // Visible hit area
  viewerFooter: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32, backgroundColor: "rgba(0, 0, 0, 0.85)" }, // Darker gradient base
  viewerAuthorCard: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  viewerAuthorPressable: { marginRight: 12 },
  viewerAuthorAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#1F2937", borderWidth: 2, borderColor: "#3B82F6" },
  viewerAuthorTextWrap: { flex: 1 },
  viewerAuthorName: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#F8FAFC" },
  viewerAuthorMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  viewerAuthorMeta: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#94A3B8" },
  viewerAuthorMetaSeparator: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#64748B" },
  viewerActionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 12, paddingBottom: 10 },
  viewerActionButton: { alignItems: "center", justifyContent: "center", gap: 8, minWidth: 72 },
  viewerActionLabel: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#F8FAFC" },
  viewerCountsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 },
  viewerCountText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#94A3B8" },
  
  repostModalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.65)", justifyContent: "flex-end" },
  repostModalSafeArea: { flex: 1, justifyContent: "flex-end" },
  repostModalCard: { width: "100%", height: "88%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  repostModalTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#0F172A" },
  repostModalSubtitle: { marginTop: 4, fontSize: 13, fontFamily: "Poppins_500Medium", color: "#64748B", marginBottom: 16 },
  repostCaptionInput: { minHeight: 120, maxHeight: 220, borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#0F172A", fontFamily: "Poppins_400Regular" },
  
  mentionPanel: { marginHorizontal: 12, marginTop: 8, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingVertical: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  commentMentionPanel: { marginHorizontal: 12, marginTop: 8, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingVertical: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  mentionItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  mentionAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: "#E5E7EB" },
  mentionName: { flex: 1, color: "#0F172A", fontSize: 14, fontFamily: "Poppins_600SemiBold" },
  
  repostModalActionsRow: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12 },
  repostCancelButton: { minWidth: 90, height: 44, borderRadius: 999, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  repostCancelButtonText: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#475569" },
  repostSubmitButton: { minWidth: 100, height: 44, borderRadius: 999, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#31429B" },
  repostSubmitButtonText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#FFFFFF" },
  
  themedAlertBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.65)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  themedAlertCard: { width: "100%", maxWidth: 390, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
  themedAlertTitle: { fontSize: 19, fontFamily: "Poppins_700Bold", color: "#0F172A" },
  themedAlertMessage: { marginTop: 8, fontSize: 15, fontFamily: "Poppins_400Regular", color: "#475569", lineHeight: 22 },
  themedAlertActionsRow: { marginTop: 24, flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  themedAlertButton: { minWidth: 90, height: 42, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#31429B", alignItems: "center", justifyContent: "center" },
  themedAlertButtonNeutral: { backgroundColor: "#F1F5F9" },
  themedAlertButtonDestructive: { backgroundColor: "#FEF2F2" },
  themedAlertButtonText: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#FFFFFF" },
  themedAlertButtonTextNeutral: { color: "#475569" },
  themedAlertButtonTextDestructive: { color: "#DC2626" },
  themedAlertCloseButton: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 4 },

  postActionsBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.65)", alignItems: "stretch", justifyContent: "flex-end", paddingHorizontal: 0 },
  postActionsSafeArea: { flex: 1, justifyContent: "flex-end", alignItems: "stretch" },
  
  deleteLoadingBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.65)", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  deleteLoadingCard: { width: "100%", maxWidth: 320, backgroundColor: "#FFFFFF", borderRadius: 24, paddingVertical: 28, paddingHorizontal: 24, alignItems: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
  deleteLoadingTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0F172A", marginTop: 16 },
  deleteLoadingText: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#64748B", textAlign: "center", marginTop: 8 },
  
  postActionsCard: { width: "100%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 16, paddingBottom: 24, paddingHorizontal: 16, borderWidth: 0 },
  postActionsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  postActionsTitle: { fontSize: 19, fontFamily: "Poppins_700Bold", color: "#0F172A" },
  postActionsCloseButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  postActionsSubtitle: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#64748B", marginBottom: 18 },
  postActionsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  postActionChoiceButton: { flex: 1, minHeight: 48, borderRadius: 16, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  postActionChoiceText: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#31429B" },
  postActionsLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#475569", marginBottom: 10 },
  
  postVisibilityChoicesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  postVisibilityChoice: { borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  postVisibilityChoiceSelected: { borderColor: "#31429B", backgroundColor: "#EEF2FF" },
  postVisibilityChoiceText: { color: "#31429B", fontSize: 13, fontFamily: "Poppins_600SemiBold" },
  
  postDeleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", paddingVertical: 12 },
  postDeleteButtonText: { color: "#DC2626", fontSize: 14, fontFamily: "Poppins_600SemiBold" },

  // --- SLEEK NEW COMMENTS MODAL ---
  commentsModalBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)", justifyContent: "flex-end" },
  commentsSheet: { 
    backgroundColor: "#FFFFFF", 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    paddingHorizontal: 16, 
    paddingTop: 8, 
    paddingBottom: 24, 
    height: "94%",
    position: 'relative',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  // Added drag handle indicator
  commentsDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 12,
  },
  commentsHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 44, marginBottom: 16, position: "relative" },
  commentsTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0F172A" },
  commentsCloseButton: { position: "absolute", right: 0, top: 4, width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  
  commentsEmptyState: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 20, marginBottom: 16 },
  commentsEmptyText: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#94A3B8", textAlign: "center" },
  
  commentsBody: { flex: 1, minHeight: 0 },
  commentsList: { flex: 1, minHeight: 0 },
  commentsListContent: { paddingBottom: 16 }, 
  
  commentItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 20 },
  commentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  commentContentColumn: { flex: 1, alignSelf: "stretch", minWidth: 0 },
  commentAuthorName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0F172A", marginBottom: 2 },
  commentText: { fontSize: 14, lineHeight: 22, fontFamily: "Poppins_400Regular", color: "#334155" },
  commentMetaRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 14 },
  commentTimestamp: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  commentReplyButton: { paddingHorizontal: 0, paddingVertical: 0 },
  commentReplyButtonText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#64748B" },
  
  commentThread: { marginBottom: 8 },
  commentItemReply: { marginLeft: 50 },
  
  viewRepliesRow: { marginTop: 0, marginLeft: 50, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  viewRepliesLine: { width: 32, height: 1.5, backgroundColor: "#E2E8F0" },
  viewRepliesText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#31429B" },
  commentRepliesList: { marginTop: 0, paddingLeft: 0 },
  commentNestedRepliesList: { marginTop: 0, paddingLeft: 0 },
  hideRepliesRow: { marginTop: 8, marginLeft: 50, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  hideRepliesText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#31429B" },
  
  commentReplyHeaderRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  commentReplyingToHandle: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#94A3B8" },
  
  commentActionColumn: { alignItems: "center", justifyContent: "flex-start", minWidth: 42, paddingTop: 2 },
  commentActionButton: { padding: 4, marginBottom: 2 },
  commentLikeCount: { marginTop: 2, fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#94A3B8" },
  
  // --- COMPOSER ---
  commentComposerSafeArea: { 
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9', // Softer border
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
  },
  commentComposer: { flexDirection: "row", alignItems: "flex-end", gap: 0, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 12 : 8 },
  commentComposerContent: { flex: 1 },
  
  commentReplyContext: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  commentReplyContextText: { flex: 1, fontSize: 13, fontFamily: "Poppins_500Medium", color: "#31429B" },
  commentReplyContextCancel: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E2E8F0" },
  
  commentInputWrap: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24, 
    minHeight: 50, 
    paddingLeft: 18, 
    paddingRight: 6, 
    paddingVertical: 6,
    marginBottom: 20
  },

  commentInput: { 
    flex: 1, 
    minHeight: 38, 
    maxHeight: 120, 
    fontSize: 15, 
    color: '#0F172A', 
    fontFamily: 'Poppins_400Regular', 
    marginRight: 10,
    paddingTop: Platform.OS === 'ios' ? 8 : 4, 
    paddingBottom: Platform.OS === 'ios' ? 8 : 4, 
  },

  commentSendButtonInside: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    backgroundColor: '#31429B', 
    alignItems: 'center', 
    justifyContent: "center", 
    marginRight: 2 
  },

  commentSendButtonDisabled: { 
    opacity: 0.3 
  },

  videoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -28 }, { translateY: -28 }], // Adjusted for slightly larger button
    zIndex: 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(15, 23, 42, 0.65)", // Premium dark translucent fill
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },

});

export default styles;