import { StyleSheet, Platform, Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    // Add top padding to clear the absolute HomeHeader
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
  },

  // --- WHITE HERO SECTION ---
  heroSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    backgroundColor: "#31429B", 
    marginRight: 20,
    borderWidth: 2,
    borderColor: "#F1F5F9",
  },
  heroCopy: {
    flex: 1,
  },
  name: {
    fontSize: 26,         
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    lineHeight: 30,
    marginBottom: 8,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFD404",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 10,
  },
  tagText: {
    marginLeft: 6,
    fontSize: 10,
    color: "#31429B",
    fontFamily: "Poppins_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  statText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
  },
  statNumber: {
    fontSize: 14,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editProfileButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#94A3B8",
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  editProfileText: {
    fontSize: 13,
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#31429B",
    alignItems: "center",
    justifyContent: "center",
  },

  // --- ABOUT ME ---
  aboutSection: {
    marginTop: 20,
  },
  sectionHeadingBlack: {
    fontSize: 20,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
  },
  aboutItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  aboutIcon: {
    width: 24,
    textAlign: "center",
  },
  aboutText: {
    fontSize: 15,
    color: "#333333",
    fontFamily: "Poppins_500Medium",
    marginLeft: 8,
    flex: 1,
  },

  // --- 🔥 GALAXY SECTION STYLES 🔥 ---
  darkSection: {
    width: "100%",
    paddingTop: 32,
    paddingBottom: 40,
    overflow: "hidden", // Keep stars contained inside the section
  },
  star: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 50,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  darkSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 20, // Insets the header items
    zIndex: 2, // Keep content above stars
  },
  sectionHeadingYellow: {
    fontSize: 20,
    color: "#FFD404",
    fontFamily: "Poppins_700Bold",
  },
  outlineEditPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 4,
  },
  outlineEditText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontFamily: "Poppins_500Medium",
  },
  biographyText: {
    fontSize: 14,
    lineHeight: 24,
    color: "#FFFFFF",
    fontFamily: "Poppins_400Regular",
    marginBottom: 32,
    paddingHorizontal: 20, // Insets the bio text
    zIndex: 2, // Keep content above stars
  },

  // --- WORK EXPERIENCE CARDS ---
  workScrollContent: {
    gap: 16,
    paddingBottom: 32,
    paddingHorizontal: 20, // Padded inside the scroll view so cards peek out naturally
  },
  workCard: {
    width: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    zIndex: 2,
  },
  workMenuIcon: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  workBriefcase: {
    marginBottom: 12,
  },
  workTitle: {
    fontSize: 18,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },
  workSubtitle: {
    fontSize: 12,
    color: "#1C1C1E",
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  workPeriod: {
    fontSize: 12,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 12,
  },
  workDescription: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },

  // --- SKILLS GRID ---
  skillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
    paddingHorizontal: 20, // Insets the skills
    zIndex: 2,
  },
  skillPill: {
    flexDirection: "row",        // 👈 Ensures icon + text are side by side
    alignItems: "center",        // 👈 Vertically centers the star with text
    gap: 5,                      // 👈 Space between star and text
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(251,209,23,0.25)",
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    maxWidth: "100%",            // 👈 Prevents overflow
    flexShrink: 1,               // 👈 Allows pill to shrink if needed
  },
  skillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    flexShrink: 1,               // 👈 Allows text to shrink instead of wrapping awkwardly
  },
  viewAllButton: {
    alignSelf: "center",
    backgroundColor: "#FFD404",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 2,
  },
  viewAllText: {
    color: "#1F2B67",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },

  // --- POSTS SECTION ---
  postsSection: {
    backgroundColor: "#F5F6FA",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  postsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  postsHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  draftsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3C4",
    borderWidth: 1,
    borderColor: "#FBD117",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  draftsPillText: {
    fontSize: 12,
    color: "#31429B",
    fontFamily: "Poppins_600SemiBold",
  },
  createPostPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#94A3B8",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  createPostPillText: {
    fontSize: 12,
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
  },

  // --- POST STYLING (PORTED FROM FEED) ---
  repostWrapper: {
    backgroundColor: "#FFD404",
    borderRadius: 20,
    marginBottom: 16,
    paddingTop: 14,
  },
  repostBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  repostBannerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: "#E5E7EB",
  },
  repostBannerText: {
    fontSize: 14,
    color: "#1F2937",
    fontFamily: "Poppins_400Regular",
  },
  repostBannerName: {
    fontFamily: "Poppins_700Bold",
  },
  repostInnerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E7EB",
    marginRight: 12,
  },
  postHeaderTextWrap: {
    flex: 1,
    paddingRight: 8,
    justifyContent: "center",
  },
  postAuthorName: {
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    marginBottom: 2,
  },
  postMeta: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Poppins_400Regular",
  },
  postMenuButton: {
    width: 28,
    height: 28,
    alignItems: "flex-end",
  },
  postCaption: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1C1C1E",
    fontFamily: "Poppins_400Regular",
    marginBottom: 12,
  },
  postSingleImageWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    width: "100%",
  },
  postTwoGrid: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  postTwoPrimaryTile: { flex: 1.15, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6" },
  postTwoSecondaryTile: { flex: 0.85, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6" },
  postThreeCollage: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  postThreeLeftTile: { flex: 1.45, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6", aspectRatio: 0.92 },
  postThreeRightColumn: { flex: 0.9, gap: 8, alignSelf: "stretch", justifyContent: "space-between" },
  postThreeRightTile: { flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6", aspectRatio: 1 },
  postFourGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  postFourGridTile: { width: "48.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6" },
  postFivePlusGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  postFivePlusTile: { width: "48.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6" },
  postCollageImage: { width: "100%", height: "100%", backgroundColor: "#F3F4F6" },
  postImageOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20, 25, 42, 0.45)", alignItems: "center", justifyContent: "center" },
  postImageOverlayText: { fontSize: 28, color: "#F9FAFB", fontFamily: "Poppins_700Bold" },
  postReactionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 16, 
  },
  postActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postActionCount: {
    fontSize: 14,
    color: "#31429B",
    fontFamily: "Poppins_500Medium",
  },
  emptyPostsText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    marginTop: 20,
  },

  // --- MODALS ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHelperText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    marginBottom: 20,
  },
  bioInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: "#1C1C1E",
    fontFamily: "Poppins_400Regular",
    minHeight: 120,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
  modalActionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 100,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#F1F5F9",
  },
  modalCancelButtonText: {
    color: "#475569",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  modalSaveButton: {
    backgroundColor: "#31429B",
  },
  modalSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },

    // ============================================
  // POST-STYLE ADDITIONS (same as ProfileViewScreen)
  // ============================================
  postSingleImage: { width: "100%", height: "100%" },
  postImagePressable: { width: "100%", height: "100%" },
  postMediaImage: { width: "100%", height: "100%", backgroundColor: "#F3F4F6" },
  captionBlock: { marginBottom: 12 },
  captionMeasureWrap: { position: "absolute", opacity: 0, left: 0, right: 0, zIndex: -1 },
  captionMeasureText: { position: "relative" },
  captionMention: { fontFamily: "Poppins_700Bold", color: "#31429B" },
  readMoreButton: { alignSelf: "flex-start", marginTop: 4 },
  readMoreText: { fontSize: 14, color: "#31429B", fontFamily: "Poppins_600SemiBold" },

  // Comments
  commentThread: { marginBottom: 4 },
  commentItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  commentItemReply: { marginLeft: 48 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9" },
  commentContentColumn: { flex: 1, alignSelf: "stretch", minWidth: 0 },
  commentReplyHeaderRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  commentAuthorName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#1C1C1E", marginBottom: 2 },
  commentReplyingToHandle: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  commentText: { fontSize: 14, lineHeight: 20, fontFamily: "Poppins_400Regular", color: "#333333" },
  commentMetaRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 12 },
  commentTimestamp: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  commentReplyButton: { paddingHorizontal: 0, paddingVertical: 0 },
  commentReplyButtonText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#94A3B8" },
  commentActionColumn: { alignItems: "center", justifyContent: "center", minWidth: 42, paddingTop: 0 },
  commentActionButton: { padding: 4, marginBottom: 2 },
  viewRepliesRow: { marginTop: 0, marginLeft: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  viewRepliesLine: { width: 28, height: 1, backgroundColor: "#E2E8F0" },
  viewRepliesText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#31429B" },
  hideRepliesRow: { marginTop: 6, marginLeft: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  hideRepliesText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#31429B" },
  commentRepliesList: { marginTop: 0, paddingLeft: 0 },
  commentNestedRepliesList: { marginTop: 0, paddingLeft: 0 },

  // Comments modal
  commentsModalBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)", justifyContent: "flex-end" },
  commentsSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, height: "94%", position: "relative" },
  commentsHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 40, marginBottom: 16, position: "relative" },
  commentsTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#1C1C1E" },
  commentsCloseButton: { position: "absolute", right: 0, top: 4, width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  commentsList: { flex: 1, minHeight: 0 },
  commentsBody: { flex: 1, minHeight: 0 },
  commentsListContent: { paddingBottom: 8 },
  commentsEmptyState: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 18, marginBottom: 16 },
  commentsEmptyText: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#94A3B8", textAlign: "center" },

  // Comment composer
  commentComposerSafeArea: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  commentComposer: { flexDirection: "row", alignItems: "flex-end", gap: 0, paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 12 : 8 },
  commentComposerContent: { flex: 1 },
  commentReplyContext: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: "#F1F5F9" },
  commentReplyContextText: { flex: 1, fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#31429B" },
  commentReplyContextCancel: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  commentInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 24, minHeight: 48, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, marginBottom: 20 },
  commentInput: { flex: 1, minHeight: 36, maxHeight: 100, fontSize: 15, color: "#1C1C1E", fontFamily: "Poppins_400Regular", marginRight: 8, paddingTop: Platform.OS === "ios" ? 8 : 4, paddingBottom: Platform.OS === "ios" ? 8 : 4 },
  commentSendButtonInside: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#31429B", alignItems: "center", justifyContent: "center", marginRight: 4 },
  commentSendButtonDisabled: { opacity: 0.4 },
  commentMentionPanel: { marginHorizontal: 12, marginTop: 4, borderRadius: 14, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D9E2FF", paddingVertical: 6, overflow: "hidden" },

  // Repost composer
  repostModalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.58)", justifyContent: "flex-end" },
  repostModalSafeArea: { flex: 1, justifyContent: "flex-end" },
  repostModalCard: { width: "100%", height: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#F9FAFB", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24 },
  repostModalTitle: { fontSize: 18, fontWeight: "900", color: "#24346F" },
  repostModalSubtitle: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 12 },
  repostCaptionInput: { minHeight: 118, maxHeight: 220, borderRadius: 14, borderWidth: 1, borderColor: "#D9DDE8", backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#24346F" },
  repostModalActionsRow: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10 },
  repostCancelButton: { minWidth: 88, height: 40, borderRadius: 999, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#E2E8F0" },
  repostCancelButtonText: { fontSize: 13, fontWeight: "800", color: "#334155" },
  repostSubmitButton: { minWidth: 98, height: 40, borderRadius: 999, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#31429B" },
  repostSubmitButtonText: { fontSize: 13, fontWeight: "900", color: "#F9FAFB" },

  // Mention panel
  mentionPanel: { marginHorizontal: 12, marginTop: 4, borderRadius: 14, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D9E2FF", paddingVertical: 6, overflow: "hidden" },
  mentionItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 },
  mentionAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8, backgroundColor: "#E5E7EB" },
  mentionName: { flex: 1, color: "#24346F", fontSize: 13, fontWeight: "700" },

  // Themed alert
  themedAlertBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.58)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  themedAlertCard: { width: "100%", maxWidth: 390, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#DCE3F5" },
  themedAlertTitle: { fontSize: 18, fontWeight: "900", color: "#24346F" },
  themedAlertMessage: { marginTop: 6, fontSize: 14, fontWeight: "600", color: "#475569" },
  themedAlertActionsRow: { marginTop: 16, flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  themedAlertButton: { minWidth: 88, height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#31429B", alignItems: "center", justifyContent: "center" },
  themedAlertButtonNeutral: { backgroundColor: "#E2E8F0" },
  themedAlertButtonDestructive: { backgroundColor: "#FEE2E2" },
  themedAlertButtonText: { fontSize: 13, fontWeight: "900", color: "#F9FAFB" },
  themedAlertButtonTextNeutral: { color: "#334155" },
  themedAlertButtonTextDestructive: { color: "#B42318" },
  themedAlertCloseButton: { position: "absolute", top: 12, right: 12, zIndex: 10, padding: 4 },

  // Post actions / report
  postActionsBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.58)", alignItems: "stretch", justifyContent: "flex-end" },
  postActionsSafeArea: { flex: 1, justifyContent: "flex-end", alignItems: "stretch" },
  postActionsCard: { width: "100%", backgroundColor: "#F9FAFB", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 18, paddingHorizontal: 12 },
  postActionsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  postActionsTitle: { fontSize: 18, fontWeight: "900", color: "#24346F" },
  postActionsCloseButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF2FF" },
  postActionsSubtitle: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 14 },
  postActionsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  postActionChoiceButton: { flex: 1, minHeight: 44, borderRadius: 999, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#EEF2FF" },
  postActionChoiceText: { fontSize: 13, fontWeight: "800", color: "#31429B" },
  postActionsLabel: { fontSize: 12, fontWeight: "800", color: "#475569", marginBottom: 8 },
  postVisibilityChoicesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  postVisibilityChoice: { borderWidth: 1, borderColor: "#D9E2FF", backgroundColor: "#F8FAFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  postVisibilityChoiceSelected: { borderColor: "#AFC0F7", backgroundColor: "#EAF0FF" },
  postVisibilityChoiceText: { color: "#31429B", fontSize: 12, fontWeight: "800" },
  postDeleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", paddingVertical: 10 },
  postDeleteButtonText: { color: "#B42318", fontSize: 13, fontWeight: "800" },

  // Viewer
  viewerBackdrop: { flex: 1, backgroundColor: "#1F2937", alignItems: "stretch", justifyContent: "flex-start" },
  viewerContent: { flex: 1, backgroundColor: "#1F2937", position: "relative" },
  viewerPager: { flex: 1 },
  viewerScrollContent: { flexGrow: 1 },
  viewerScrollItem: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: "center", justifyContent: "center" },
  viewerImageCard: { width: "100%", height: "100%", overflow: "hidden", backgroundColor: "#1F2937" },
  viewerImagePressable: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  viewerImage: { backgroundColor: "transparent", alignSelf: "center" },
  viewerTopBar: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: 48, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewerTopButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  viewerFooter: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 20, backgroundColor: "rgba(0, 0, 0, 0.70)" },
  viewerAuthorCard: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  viewerAuthorPressable: { marginRight: 12 },
  viewerAuthorAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#1F2937", borderWidth: 2, borderColor: "#2F80ED" },
  viewerAuthorTextWrap: { flex: 1 },
  viewerAuthorName: { fontSize: 20, fontWeight: "500", color: "#F9FAFB" },
  viewerAuthorMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  viewerAuthorMeta: { fontSize: 12, fontWeight: "600", color: "rgba(255, 255, 255, 0.82)" },
  viewerAuthorMetaSeparator: { fontSize: 11, fontWeight: "800", color: "rgba(255, 255, 255, 0.70)" },
  viewerActionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 8, paddingBottom: 10 },
  viewerActionButton: { alignItems: "center", justifyContent: "center", gap: 6, minWidth: 72 },
  viewerActionLabel: { fontSize: 13, fontWeight: "600", color: "#F9FAFB" },
  viewerCountsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 2 },
  viewerCountText: { fontSize: 11, fontWeight: "700", color: "rgba(255, 255, 255, 0.70)" },


  /* ============ EMPTY SKILLS CARD ============ */
emptySkillsCard: {
  backgroundColor: "rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: 20,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(251,209,23,0.2)",
  marginBottom: 8,
},
emptySkillsTitle: {
  color: "#FFFFFF",
  fontSize: 14,
  fontFamily: "Poppins_700Bold",
  marginTop: 10,
  marginBottom: 4,
},
emptySkillsSubtitle: {
  color: "rgba(255,255,255,0.6)",
  fontSize: 12,
  fontFamily: "Poppins_400Regular",
  textAlign: "center",
  lineHeight: 18,
  marginBottom: 16,
},
emptySkillsButton: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: "#FBD117",
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 20,
},
emptySkillsButtonText: {
  color: "#31429B",
  fontSize: 12,
  fontFamily: "Poppins_700Bold",
},

/* ============ SKILL PILL ENHANCEMENTS ============ */
skillPillMore: {
  backgroundColor: "rgba(251,209,23,0.15)",
  borderColor: "rgba(251,209,23,0.4)",
},
skillTextMore: {
  color: "#FBD117",
  fontSize: 12,
  fontFamily: "Poppins_700Bold",
},

/* ============ VIEW ALL / MANAGE BUTTON ============ */
viewAllButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  marginTop: 12,
  paddingVertical: 10,
},
viewAllText: {
  color: "#FBD117",
  fontSize: 12,
  fontFamily: "Poppins_600SemiBold",
},

});

export default styles;

// This is the UserProfileScreen.styles.js file, which contains the styles for the UserProfileScreen component. It defines various style objects for different sections of the screen, including the hero section, about section, galaxy section, work experience cards, skills grid, posts section, and modals. Each style object specifies properties such as background color, padding, font size, font family, and layout properties to achieve the desired visual appearance of the user profile screen.
