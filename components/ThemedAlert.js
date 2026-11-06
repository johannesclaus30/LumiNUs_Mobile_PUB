import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(24, 35, 91, 0.62)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  alertBox: {
    backgroundColor: "#F8FAFF",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "#D8E0FF",
    shadowColor: "#32418C",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },

  // ====== TOP ACCENT BAR ======
  accentBar: {
    height: 8,
    width: "100%",
    borderRadius: 4,
    alignSelf: "center",
    backgroundColor: "#FBD117",
    marginBottom: 18,
  },

  // ====== TITLE ======
  title: {
    fontSize: 21,
    color: "#31429B",
    textAlign: "center",
    fontFamily: "Poppins_700Bold",
    marginBottom: 8,
  },

  // ====== MESSAGE ======
  message: {
    fontSize: 14,
    color: "#52607A",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    paddingHorizontal: 4,
    marginBottom: 20,
  },

  // ====== DIVIDER ======
  divider: {
    height: 1,
    backgroundColor: "#E3E9F7",
    marginBottom: 14,
  },

  // ====== BUTTON CONTAINER ======
  buttonContainer: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
  },

  // ====== BUTTONS ======
  button: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#32418C",
  },
  accentButton: {
    backgroundColor: "#FBD117",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  destructiveButton: {
    backgroundColor: "#EF4444",
  },

  // ====== BUTTON TEXT ======
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
  },
  primaryText: {
    color: "#FFFFFF",
  },
  accentText: {
    color: "#1F2937",
  },
  cancelText: {
    color: "#6B7280",
  },
  destructiveText: {
    color: "#FFFFFF",
  },

  // ====== SINGLE BUTTON (Full Width) ======
  singleButton: {
    width: "100%",
  },
});

// ==================== LISTENER SYSTEM ====================
let listeners = [];
const alertState = { queue: [], current: null };

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

// ==================== MAIN COMPONENT ====================
const ThemedAlertComponent = () => {
  const [visible, setVisible] = useState(false);
  const [alert, setAlert] = useState(null);
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const updateUI = () => {
      if (alertState.current) {
        setAlert(alertState.current);
        setVisible(true);
        scaleAnim.setValue(0.92);
        fadeAnim.setValue(0);
        translateAnim.setValue(12);

        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateAnim, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }
    };

    listeners.push(updateUI);
    return () => {
      listeners = listeners.filter((l) => l !== updateUI);
    };
  }, [fadeAnim, scaleAnim, translateAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 12,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      alertState.current = null;
      if (alertState.queue.length > 0) {
        alertState.current = alertState.queue.shift();
        notifyListeners();
      }
    });
  };

  if (!alert) return null;

  const defaultButtons = [{ text: "OK", style: "default" }];
  const buttonsToUse =
    alert.buttons && alert.buttons.length > 0 ? alert.buttons : defaultButtons;

  const isSingleButton = buttonsToUse.length === 1;

  const getButtonStyle = (button) => {
    const baseStyle = [styles.button];
    if (isSingleButton) {
      baseStyle.push(styles.singleButton);
    }
    if (button.style === "cancel") return [...baseStyle, styles.cancelButton];
    if (button.style === "destructive")
      return [...baseStyle, styles.destructiveButton];
    if (button.style === "default" && isSingleButton)
      return [...baseStyle, styles.primaryButton];
    return [
      ...baseStyle,
      button.color === "accent" ? styles.accentButton : styles.primaryButton,
    ];
  };

  const getButtonTextStyle = (button) => {
    const baseStyle = styles.buttonText;
    if (button.style === "cancel")
      return [baseStyle, styles.cancelText];
    if (button.style === "destructive")
      return [baseStyle, styles.destructiveText];
    if (button.style === "default" && isSingleButton)
      return [baseStyle, styles.primaryText];
    return [
      baseStyle,
      button.color === "accent" ? styles.accentText : styles.primaryText,
    ];
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.alertBox,
            {
              transform: [{ scale: scaleAnim }, { translateY: translateAnim }],
            },
          ]}
        >
          {/* ===== GOLD ACCENT BAR ===== */}
          <View style={styles.accentBar} />

          {/* ===== TITLE ===== */}
          {alert.title ? (
            <Text style={styles.title}>{alert.title}</Text>
          ) : null}

          {/* ===== MESSAGE ===== */}
          {alert.message ? (
            <Text style={styles.message}>{alert.message}</Text>
          ) : null}

          {/* ===== DIVIDER ===== */}
          <View style={styles.divider} />

          {/* ===== BUTTONS ===== */}
          <View style={styles.buttonContainer}>
            {buttonsToUse.map((button, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  getButtonStyle(button),
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => {
                  if (button.onPress) button.onPress();
                  handleDismiss();
                }}
              >
                <Text style={getButtonTextStyle(button)}>
                  {button.text || "OK"}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ==================== EXPORTED API ====================
export const ThemedAlert = {
  alert: (title, message, buttons) => {
    const newAlert = { title, message, buttons };
    if (alertState.current) {
      alertState.queue.push(newAlert);
    } else {
      alertState.current = newAlert;
      notifyListeners();
    }
  },

  success: (title, message, buttons) => {
    ThemedAlert.alert(title || "Success", message, buttons);
  },
  error: (title, message, buttons) => {
    ThemedAlert.alert(title || "Error", message, buttons);
  },
  warning: (title, message, buttons) => {
    ThemedAlert.alert(title || "Warning", message, buttons);
  },
  info: (title, message, buttons) => {
    ThemedAlert.alert(title || "Info", message, buttons);
  },

  confirm: (title, message, onConfirm, onCancel) => {
    ThemedAlert.alert(title || "Confirm", message, [
      { text: "Cancel", style: "cancel", onPress: onCancel },
      { text: "Confirm", style: "default", onPress: onConfirm },
    ]);
  },
};

export default ThemedAlertComponent;