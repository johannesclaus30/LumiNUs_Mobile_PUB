import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
  Keyboard,
  TextInput,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../services/supabase";
import styles from "../styles/ForgetPasswordScreen.styles";
import { ThemedAlert } from "../components/ThemedAlert";

const RESET_ATTEMPT_LIMIT = 5;
const RESET_COOLDOWN_MS = 10 * 60 * 1000;
const RESET_ATTEMPTS_STORAGE_KEY = "@luminus_password_reset_attempts";

const ForgetPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 400);

  const contentReveal = useRef(new Animated.Value(0)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const scrollViewRef = useRef(null);
  const emailRef = useRef(null);

  const getResetAttemptRecord = async (normalizedEmail) => {
    const storedAttempts = await AsyncStorage.getItem(
      `${RESET_ATTEMPTS_STORAGE_KEY}:${normalizedEmail}`,
    );

    if (!storedAttempts) {
      return { failedAttempts: 0, cooldownUntil: 0 };
    }

    try {
      const record = JSON.parse(storedAttempts);
      return {
        failedAttempts: Number(record.failedAttempts) || 0,
        cooldownUntil: Number(record.cooldownUntil) || 0,
      };
    } catch (error) {
      console.warn(
        "[ForgetPasswordScreen] Invalid reset attempt record:",
        error,
      );
      return { failedAttempts: 0, cooldownUntil: 0 };
    }
  };

  const clearResetAttemptRecord = async (normalizedEmail) => {
    await AsyncStorage.removeItem(
      `${RESET_ATTEMPTS_STORAGE_KEY}:${normalizedEmail}`,
    );
  };

  const recordFailedResetAttempt = async (normalizedEmail) => {
    const record = await getResetAttemptRecord(normalizedEmail);
    const failedAttempts = record.failedAttempts + 1;
    const cooldownUntil =
      failedAttempts >= RESET_ATTEMPT_LIMIT
        ? Date.now() + RESET_COOLDOWN_MS
        : 0;

    await AsyncStorage.setItem(
      `${RESET_ATTEMPTS_STORAGE_KEY}:${normalizedEmail}`,
      JSON.stringify({ failedAttempts, cooldownUntil }),
    );

    return { failedAttempts };
  };

  useEffect(() => {
    Animated.timing(contentReveal, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(iconFloat, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [contentReveal, iconFloat]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToInput = (inputRef) => {
    if (!inputRef.current || !scrollViewRef.current) return;
    const node = findNodeHandle(inputRef.current);
    if (!node) return;
    scrollViewRef.current.scrollResponderScrollNativeHandleToKeyboard(
      node,
      120,
      true
    );
  };

  const handleFocus = () => {
    setIsFocused(true);
    setTimeout(() => scrollToInput(emailRef), 250);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleSendEmail = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      ThemedAlert.alert(
        "Missing Email",
        "Enter your personal email address first."
      );
      return;
    }

    const normalizedEmail = trimmedEmail.toLowerCase();
    let resetAttemptRecord;
    try {
      resetAttemptRecord = await getResetAttemptRecord(normalizedEmail);
    } catch (storageError) {
      console.error(
        "[ForgetPasswordScreen] Could not check reset attempt limit:",
        storageError,
      );
      ThemedAlert.alert(
        "Reset Unavailable",
        "Unable to verify reset availability. Please try again.",
      );
      return;
    }

    if (resetAttemptRecord.cooldownUntil > Date.now()) {
      const remainingMinutes = Math.ceil(
        (resetAttemptRecord.cooldownUntil - Date.now()) / 60000,
      );
      ThemedAlert.alert(
        "Too Many Attempts",
        `Too many failed reset attempts. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
      );
      return;
    }

    if (resetAttemptRecord.cooldownUntil) {
      try {
        await clearResetAttemptRecord(normalizedEmail);
      } catch (storageError) {
        console.error(
          "[ForgetPasswordScreen] Could not clear expired reset attempt record:",
          storageError,
        );
        ThemedAlert.alert(
          "Reset Unavailable",
          "Unable to reset the attempt timer. Please try again.",
        );
        return;
      }
    }

    setLoading(true);
    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(normalizedEmail);
      if (error) throw error;
      try {
        await clearResetAttemptRecord(normalizedEmail);
      } catch (storageError) {
        console.error(
          "[ForgetPasswordScreen] Could not clear successful reset attempt record:",
          storageError,
        );
      }
      ThemedAlert.alert(
        "Code Sent",
        "Check your email for your 8-digit reset code."
      );
      navigation.navigate("VerifyResetOtp", { email: trimmedEmail });
    } catch (error) {
      try {
        const { failedAttempts } = await recordFailedResetAttempt(
          normalizedEmail,
        );

        if (failedAttempts >= RESET_ATTEMPT_LIMIT) {
          ThemedAlert.alert(
            "Too Many Attempts",
            "You have reached the maximum of 5 failed reset attempts. Please try again in 10 minutes.",
          );
          return;
        }
      } catch (storageError) {
        console.error(
          "[ForgetPasswordScreen] Could not record failed reset attempt:",
          storageError,
        );
      }

      ThemedAlert.alert(
        "Reset Failed",
        error.message || "Unable to send the reset email."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const iconTranslateY = iconFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#32418C" />

      <LinearGradient
        colors={["#32418C", "#3F4FA8", "#32418C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.absoluteFill}
      >
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.decorCircle3} />
        <View style={styles.decorCircle4} />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          style={styles.keyboardView}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scrollContent,
              keyboardVisible && styles.scrollContentKeyboard,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            <Animated.View
              style={[
                styles.card,
                { width: contentWidth },
                {
                  opacity: contentReveal,
                  transform: [
                    {
                      translateY: contentReveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.iconContainer,
                  { transform: [{ translateY: iconTranslateY }] },
                ]}
              >
                <LinearGradient
                  colors={["#32418C", "#4A5DB8"]}
                  style={styles.iconGradient}
                >
                  <Ionicons name="lock-closed" size={36} color="#fbd117" />
                </LinearGradient>
                <View style={styles.iconBadge}>
                  <Ionicons name="help" size={16} color="#32418C" />
                </View>
              </Animated.View>

              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                No worries! Enter your email and we'll send you an 8-digit code
                to reset your password.
              </Text>

              <View style={styles.form}>
                <Text style={styles.label}>Email Address</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    isFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor="#A0A6C0"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    underlineColorAndroid="transparent"
                  />
                </View>

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    activeOpacity={0.9}
                    onPress={handleSendEmail}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={["#32418C", "#4A5DB8"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? "Sending..." : "Send Code"}
                      </Text>
                      {!loading && (
                        <Ionicons
                          name="arrow-forward"
                          size={20}
                          color="#fbd117"
                          style={styles.buttonIcon}
                        />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity
                  style={styles.backToLogin}
                  onPress={() => navigation.navigate("Login")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={16} color="#fbd117" />
                  <Text style={styles.backToLoginText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.footer,
                {
                  opacity: contentReveal,
                  transform: [
                    {
                      translateY: contentReveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="rgba(255,255,255,0.75)"
              />
              <Text style={styles.footerText}>
                Your information is securely encrypted
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default ForgetPasswordScreen;