import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    marginTop: 5,
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 20 : 10,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    color: "#2C313A",
    fontFamily: "Poppins_700Bold", // Fixed
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  toLabel: {
    fontSize: 16,
    color: "#585858",
    fontFamily: "Poppins_400Regular", // Fixed
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#585858",
    fontFamily: "Poppins_400Regular", // Fixed
    paddingVertical: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#E8E8E8",
    marginHorizontal: 20,
  },
  createGroupButton: {
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#31429B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createGroupButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold", // Fixed
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#585858",
    fontFamily: "Poppins_500Medium", // Fixed - was "Poppins_Medium"
    marginTop: 20,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#32418c",
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  nameText: {
    fontSize: 16,
    color: "#4A4A4A",
    fontFamily: "Poppins_600SemiBold",
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: '#EAF0FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  adminBadgeText: {
    fontSize: 10,
    color: '#31429B',
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
  },
  adminIconContainer: {
    marginLeft: 8,
  },
  footer: {
    backgroundColor: "#31429B",
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  footerLogo: {
    width: 160,
    height: 50,
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  emptyText: {
    fontSize: 14,
    color: "#888888",
    fontFamily: "Poppins_400Regular", // Fixed
    textAlign: "center",
    marginTop: 20,
  },
  groupModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 24, 48, 0.58)",
  },
  groupModalContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  groupModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  groupModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  groupModalTitle: {
    fontSize: 18,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold", // Fixed
  },
  groupModalLabel: {
    fontSize: 13,
    color: "#4A4A4A",
    fontFamily: "Poppins_600SemiBold", // Fixed
    marginBottom: 8,
    marginTop: 6,
  },
  groupModalHint: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Poppins_400Regular", // Fixed
    marginBottom: 10,
  },
  groupNameInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontFamily: "Poppins_400Regular", // Fixed
    color: "#1C1C1E",
    marginBottom: 8,
  },
  groupMemberList: {
    maxHeight: 320,
  },
  groupMemberListContent: {
    paddingBottom: 8,
  },
  groupMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  groupMemberRowSelected: {
    backgroundColor: "#EAF0FF",
    borderWidth: 1,
    borderColor: "#B9C8FF",
  },
  groupMemberAvatar: {
    marginRight: 12,
  },
  groupMemberInfo: {
    flex: 1,
    flexDirection: 'column',
  },
  groupMemberName: {
    flex: 1,
    fontSize: 15,
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold", // Fixed
  },
  groupMemberRole: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },
  groupMemberCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  groupMemberCheckSelected: {
    backgroundColor: "#31429B",
    borderColor: "#31429B",
  },
  groupCreateButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#31429B",
    alignItems: "center",
    justifyContent: "center",
  },
  groupCreateButtonDisabled: {
    opacity: 0.7,
  },
  groupCreateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins_700Bold", // Fixed
  },
  avatarFallback: {
    backgroundColor: "#31429B",
    justifyContent: "center",
    alignItems: "center",
    overflow: 'hidden',
  },
  avatarFallbackText: {
    color: "#FBD117",
    fontFamily: "Poppins_700Bold",
    textAlign: "center", // ← Add this to center text horizontally
    includeFontPadding: false, // ← Helps with vertical centering on iOS
    textAlignVertical: "center", // ← For Android vertical centering
  },
  avatarImage: {
    backgroundColor: "#E2E8F0",
  },
});

export default styles;