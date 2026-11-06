import { StyleSheet } from "react-native";

export default StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#32418c" 
  },
  container: { 
    flex: 1, 
    backgroundColor: "#F8FAFC" 
  },
  bottomSpacer: {
    backgroundColor: "#FFFFFF", // ← White for the bottom
    height: 20, // Adjust as needed
  },

headerWrapper: {
  backgroundColor: "#32418c", // ← Keep blue
  borderBottomLeftRadius: 32,
  borderBottomRightRadius: 32,
  marginBottom: 4,
  zIndex: 10,
},
header: { 
  flexDirection: "row", 
  justifyContent: "space-between", 
  alignItems: "center", 
  paddingHorizontal: 24, 
  paddingTop: 24,
  paddingBottom: 24,
  backgroundColor: "#32418c", // ← Keep blue
  borderBottomLeftRadius: 32,
  borderBottomRightRadius: 32,
  shadowColor: "transparent",
  elevation: 0,
},
  headerTitle: { 
    fontSize: 22, // Bumped up slightly
    fontFamily: "Poppins_700Bold", 
    color: "#ffffff", 
    flex: 1, 
    textAlign: "center" 
  },
  backButton: { 
    padding: 4 
  },
  markReadButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12, 
    backgroundColor: "#EFF2FF", 
    borderWidth: 1, 
    borderColor: "transparent" 
  },
  markReadText: { 
    fontSize: 13, 
    fontFamily: "Poppins_600SemiBold", 
    color: "#31429B" 
  },
  markReadDisabled: { 
    backgroundColor: "transparent" 
  },
  markReadTextDisabled: { 
    color: "#9CA3AF" 
  },

  // FILTER CHIPS (Pushed lower, styled to pop)
  filterWrapper: { 
    backgroundColor: "transparent", // Transparent so the header shadow stands out
    paddingTop: 24, // Pushes the tabs lower and away from the header
    paddingBottom: 12, 
  },
  filterContainer: { 
    paddingHorizontal: 20, 
    gap: 10 
  },
  filterChip: { 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 24, 
    backgroundColor: "#FFFFFF", 
    borderWidth: 1, 
    borderColor: "#E2E8F0", 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  filterChipActive: { 
    backgroundColor: "#31429B", // Solid blue for the active tab
    borderColor: "#31429B" 
  },
  filterChipText: { 
    fontSize: 14, 
    fontFamily: "Poppins_500Medium", 
    color: "#64748B" 
  },
  filterChipTextActive: { 
    color: "#FFFFFF", // White text for the active tab
    fontFamily: "Poppins_600SemiBold" 
  },

  // LIST & CARDS
  listContent: { 
    padding: 16, 
    paddingBottom: 100 
  },
  cardUnread: { 
    flexDirection: "row", 
    backgroundColor: "#FFFFFF", 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 2 
  },
  unreadDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: "#31429B", 
    position: "absolute", 
    top: 18, 
    left: 10 
  },
  avatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: "#E2E8F0", 
    marginLeft: 8 
  },
  textContainer: { 
    flex: 1, 
    marginLeft: 14, 
    justifyContent: "center" 
  },
  messageText: { 
    fontSize: 14, 
    fontFamily: "Poppins_400Regular", 
    color: "#4B5563", 
    lineHeight: 22 
  },
  nameText: { 
    fontFamily: "Poppins_600SemiBold", 
    color: "#1F2937" 
  },
  timeText: { 
    fontSize: 12, 
    color: "#9CA3AF", 
    fontFamily: "Poppins_500Medium" 
  },

  // CONNECTION REQUEST BUTTONS
  actionButtonsRow: { 
    flexDirection: "row", 
    marginTop: 12, 
    gap: 12 
  },
  acceptButton: { 
    flex: 1, 
    backgroundColor: "#31429B", 
    paddingVertical: 10, 
    borderRadius: 12, 
    alignItems: "center" 
  },
  acceptButtonText: { 
    color: "#FFFFFF", 
    fontSize: 13, 
    fontFamily: "Poppins_600SemiBold" 
  },
  deleteButton: { 
    flex: 1, 
    backgroundColor: "#F1F5F9", 
    paddingVertical: 10, 
    borderRadius: 12, 
    alignItems: "center" 
  },
  deleteButtonText: { 
    color: "#64748B", 
    fontSize: 13, 
    fontFamily: "Poppins_600SemiBold" 
  },

  // EMPTY STATE
  emptyState: { 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 80, 
    paddingHorizontal: 32 
  },
  emptyIconWrap: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: "#EFF2FF", 
    alignItems: "center", 
    justifyContent: "center", 
    marginBottom: 20 
  },
  emptyTitle: { 
    fontSize: 20, 
    fontFamily: "Poppins_700Bold", 
    color: "#1F2937", 
    marginBottom: 8 
  },
  emptySub: { 
    fontSize: 15, 
    fontFamily: "Poppins_400Regular", 
    color: "#64748B", 
    textAlign: "center" 
  },

  // SKELETON
  skeletonCard: { 
    flexDirection: "row", 
    backgroundColor: "#FFFFFF", 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    elevation: 1,
  },
  skeletonAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: "#F1F5F9",
    marginLeft: 8
  },
  skeletonTextWrap: { 
    flex: 1, 
    marginLeft: 14, 
    justifyContent: "center", 
    gap: 10 
  },
  skeletonLineShort: { 
    width: "40%", 
    height: 14, 
    backgroundColor: "#F1F5F9", 
    borderRadius: 6 
  },
  skeletonLineLong: { 
    width: "80%", 
    height: 14, 
    backgroundColor: "#F1F5F9", 
    borderRadius: 6 
  },

  // MODAL
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(15, 23, 42, 0.6)", 
    justifyContent: "center", 
    padding: 24 
  },
  modalCard: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 24, 
    padding: 24, 
    alignItems: "center" 
  },
  modalTitle: { 
    fontSize: 18, 
    fontFamily: "Poppins_700Bold", 
    marginBottom: 20, 
    color: "#1F2937" 
  },
  modalCloseButton: { 
    paddingVertical: 12, 
    paddingHorizontal: 32, 
    backgroundColor: "#F1F5F9", 
    borderRadius: 12 
  },
  modalCloseText: { 
    fontFamily: "Poppins_600SemiBold", 
    color: "#475569" 
  },
});