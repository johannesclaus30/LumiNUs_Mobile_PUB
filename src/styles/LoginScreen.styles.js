import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: "#E5B80B",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  cardContainer: {
    backgroundColor: "#31429B",
    width: "88%",
    maxWidth: 420,
    borderRadius: 26,
    padding: 28,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
  },
  logo: {
    width: "100%",
    height: 69,
    marginBottom: 28,
  },
  label: {
    color: "#F9FAFB",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DDF0",
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginBottom: 20,
    color: "#333",
    minHeight: 50,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DDF0",
    marginBottom: 15,
    minHeight: 50,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333",
  },
  eyeIcon: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20, // Reduced from 30 to make room for privacy
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#F2C919",
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#F2C919",
  },
  optionText: {
    color: "#F9FAFB",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },

  // --- PRIVACY ROW ---
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
    paddingRight: 10,
  },
  privacyCheckboxContainer: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  privacyText: {
    color: "#F9FAFB",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    marginLeft: 2,
    flex: 1,
    lineHeight: 18,
  },
  privacyLink: {
    color: "#F2C919",
    fontFamily: "Poppins-Bold",
    textDecorationLine: "underline",
  },

  // --- BUTTONS ---
  button: {
    backgroundColor: "#F2C919",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 25,
    minHeight: 50,
    shadowColor: "#1F2A64",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#31429B",
    fontSize: 18,
    fontFamily: "Poppins-Bold",
  },

  // --- MODAL ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    color: "#31429B",
    fontFamily: "Poppins-Bold",
    marginBottom: 16,
    textAlign: "center",
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalParagraph: {
    fontSize: 13,
    color: "#333",
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
    marginBottom: 12,
  },
  modalSubheading: {
    fontSize: 14,
    color: "#1C1C1E",
    fontFamily: "Poppins-Bold",
    marginTop: 8,
    marginBottom: 8,
  },
  modalBullet: {
    fontSize: 13,
    color: "#333",
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
    marginBottom: 10,
  },
  boldText: {
    fontFamily: "Poppins-Bold",
    color: "#1C1C1E",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modalCancelText: {
    color: "#64748B",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  modalAcceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#31429B",
    alignItems: "center",
  },
  modalAcceptText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
});

export default styles;