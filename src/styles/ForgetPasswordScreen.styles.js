import { StyleSheet } from "react-native";

const POPPINS = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semiBold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  extraBold: "Poppins_800ExtraBold",
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#32418C",
  },

  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },

  // ===== Decorative circles (full-screen gradient) =====
  decorCircle1: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(0,0,0,0.18)",
    top: -80,
    right: -80,
  },
  decorCircle2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(0,0,0,0.12)",
    top: 120,
    left: -70,
  },
  decorCircle3: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,0,0,0.10)",
    bottom: 80,
    right: -30,
  },
  decorCircle4: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(0,0,0,0.08)",
    bottom: -30,
    left: 60,
  },

  // ===== Safe area + keyboard =====
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // ===== Center content vertically + horizontally (default — keyboard closed) =====
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    minHeight: "100%",
  },

  // When keyboard is up: align to top + add room so we can scroll
  scrollContentKeyboard: {
    justifyContent: "flex-start",
    paddingTop: 24,
    paddingBottom: 260,
  },

  // ===== Card =====
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },

  // ===== Floating icon =====
  iconContainer: {
    position: "absolute",
    top: -44,
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#32418C",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  iconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fbd117",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  // ===== Text =====
  title: {
    fontFamily: POPPINS.extraBold,
    fontSize: 26,
    lineHeight: 32,
    color: "#32418C",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: POPPINS.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 4,
  },

  // ===== Form =====
  form: {
    width: "100%",
  },
  label: {
    fontFamily: POPPINS.semiBold,
    fontSize: 13,
    color: "#374151",
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.2,
  },

  // Single minimalist input — the input IS the box
  inputWrapper: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5EAFB",
    backgroundColor: "#F4F6FC",
    marginBottom: 22,
    height: 56,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  
  input: {
    flex: 1,
    fontFamily: POPPINS.medium,
    fontSize: 15,
    color: "#1F2937",
    paddingVertical: 0,
    height: "100%",
  },

  // ===== Button =====
  button: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#32418C",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontFamily: POPPINS.bold,
    color: "#fbd117",
    fontSize: 16,
    letterSpacing: 0.4,
  },
  buttonIcon: {
    marginLeft: 8,
  },

  // ===== Back link =====
  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backToLoginText: {
    fontFamily: POPPINS.semiBold,
    color: "#32418C",
    fontSize: 14,
    marginLeft: 2,
  },

  // ===== Footer =====
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  footerText: {
    fontFamily: POPPINS.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginLeft: 6,
  },
});

export default styles;