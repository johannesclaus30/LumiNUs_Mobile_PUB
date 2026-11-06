import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#32418C",
  },

  /* ============ HERO HEADER ============ */
  header: {
    backgroundColor: "#32418C",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    color: "#FBD117",
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 2,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },

  /* ============ CONTENT ============ */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: "#F5F7FB",
    flexGrow: 1,
  },

  /* ============ SECTION CARD ============ */
  section: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#32418C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#32418C",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionNumberText: {
    color: "#FBD117",
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
  sectionTitle: {
    fontSize: 15,
    color: "#1E293B",
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.2,
    flex: 1,
  },

  /* ============ FORM FIELDS ============ */
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: "#475569",
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  labelOptional: {
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
    fontStyle: "italic",
  },
  charCount: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Poppins_500Medium",
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
    fontFamily: "Poppins_400Regular",
    backgroundColor: "#F8FAFC",
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    color: "#1E293B",
    fontFamily: "Poppins_400Regular",
    backgroundColor: "#F8FAFC",
    minHeight: 120,
  },

  /* ============ DROPDOWN TRIGGER ============ */
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#F8FAFC",
    minHeight: 48,
  },
  dropdownTriggerDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    fontFamily: "Poppins_400Regular",
    marginRight: 8,
  },
  dropdownTriggerPlaceholder: {
    color: "#94A3B8",
  },

  /* ============ DROPDOWN MODAL ============ */
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  dropdownContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "75%",
    paddingTop: 12,
  },
  dropdownHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  dropdownTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
    color: "#1E293B",
    letterSpacing: -0.2,
  },
  dropdownCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownSearchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#1E293B",
    padding: 0,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  dropdownItemActive: {
    backgroundColor: "#F0F4FF",
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },
  dropdownItemTextActive: {
    color: "#32418C",
    fontFamily: "Poppins_700Bold",
  },
  dropdownEmpty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  dropdownEmptyText: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: "Poppins_500Medium",
  },

  /* ============ SEGMENTED CONTROL ============ */
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#32418C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#94A3B8",
  },
  segmentTextActive: {
    color: "#32418C",
  },

  /* ============ CHIP SELECTOR ============ */
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#32418C",
    borderColor: "#32418C",
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },

  /* ============ LOCATION PREVIEW ============ */
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0F4FF",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#DCE3FA",
  },
  previewIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  previewLabel: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    color: "#32418C",
    letterSpacing: 1,
    marginBottom: 2,
  },
  previewValue: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#475569",
    lineHeight: 17,
  },

  /* ============ TOGGLE (Currently Working) ============ */
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    marginBottom: 20,
  },
  toggleLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#1E293B",
  },
  toggleHint: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
    marginTop: 1,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#CBD5E1",
    padding: 3,
    justifyContent: "center",
  },
  toggleTrackActive: {
    backgroundColor: "#32418C",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },

  /* ============ DATE ROWS ============ */
  dateGroupLabel: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    color: "#32418C",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },

  /* ============ REMINDER CARD ============ */
  reminderCard: {
    backgroundColor: "#32418C",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#32418C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  reminderTitle: {
    color: "#FBD117",
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  reminderText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    lineHeight: 19,
  },

  /* ============ ACTION BUTTONS ============ */
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  discardButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  discardButtonText: {
    color: "#64748B",
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.3,
  },
  saveButton: {
    flex: 1.5,
    backgroundColor: "#FBD117",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#FBD117",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonText: {
    color: "#32418C",
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.3,
  },
    /* ============ MODAL (For CustomDropdown) ============ */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#1E293B",
  },




});

export default styles;