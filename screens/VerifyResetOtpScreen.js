import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
  TextInput,
  Keyboard,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import SmartTextInput from "../components/SmartTextInput";
import { ThemedAlert } from "../components/ThemedAlert";
import styles from "../styles/VerifyResetOtpScreen.styles";

const VerifyResetOtpScreen = ({ route, navigation }) => {
  const { email } = route.params || {};

  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [focusedField, setFocusedField] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 400);

  const contentReveal = useRef(new Animated.Value(0)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const scrollViewRef = useRef(null);
  const otpRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

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

  // Track keyboard visibility to toggle layout adjustments
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

  // Scroll focused input above the keyboard
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

  const handleFocus = (fieldName, inputRef) => {
    setFocusedField(fieldName);
    setTimeout(() => scrollToInput(inputRef), 250);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  const handleVerifyAndReset = async () => {
    if (!email) {
      ThemedAlert.alert(
        "Session Error",
        "Email is missing. Please restart the password reset process."
      );
      navigation.goBack();
      return;
    }

    if (!otpCode || !newPassword || !confirmPassword) {
      ThemedAlert.alert(
        "Missing Fields",
        "Please fill in all fields to continue."
      );
      return;
    }

    if (newPassword.length < 6) {
      ThemedAlert.alert(
        "Weak Password",
        "Your new password must be at least 6 characters long."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      ThemedAlert.alert(
        "Mismatch",
        "Your new passwords do not match. Please try again."
      );
      return;
    }

    setLoading(true);

    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email,
        token: otpCode,
        type: "recovery",
      });

      if (otpError) throw otpError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      ThemedAlert.alert(
        "Success!",
        "Your password has been successfully reset. Please sign in with your new password."
      );
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.warn("[VerifyResetOtpScreen] SignOut Warning:", signOutErr);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      console.error("[VerifyResetOtpScreen] Reset Error:", error);
      ThemedAlert.alert(
        "Verification Failed",
        error.message || "Invalid or expired verification code."
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

  const focusStyle = (field) =>
    focusedField === field ? styles.inputFocused : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#32418C" />

      <LinearGradient
        colors={["#2A377A", "#32418C", "#3F4FA8"]}
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
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
                  <Ionicons
                    name="shield-checkmark"
                    size={36}
                    color="#fbd117"
                  />
                </LinearGradient>
                <View style={styles.iconBadge}>
                  <Ionicons name="key" size={14} color="#32418C" />
                </View>
              </Animated.View>

              <Text style={styles.title}>Secure Your Account</Text>
              <Text style={styles.subtitle}>
                Enter the 8-digit code sent to{"\n"}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              {/* OTP Code Field */}
              <Text style={styles.label}>Verification Code</Text>
              <SmartTextInput
                ref={otpRef}
                style={[styles.input, focusStyle("otp")]}
                placeholder="Enter 8-digit code"
                placeholderTextColor="#A0A6C0"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={8}
                editable={!loading}
                onFocus={() => handleFocus("otp", otpRef)}
                onBlur={handleBlur}
              />

              {/* New Password Field */}
              <Text style={styles.label}>New Password</Text>
              <View style={[styles.passwordField, focusStyle("newPassword")]}>
                <TextInput
                  ref={newPasswordRef}
                  style={styles.passwordInput}
                  placeholder="Enter new password"
                  placeholderTextColor="#A0A6C0"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => handleFocus("newPassword", newPasswordRef)}
                  onBlur={handleBlur}
                  underlineColorAndroid="transparent"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#8B93B8"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Field */}
              <Text style={styles.label}>Confirm New Password</Text>
              <View
                style={[styles.passwordField, focusStyle("confirmPassword")]}
              >
                <TextInput
                  ref={confirmPasswordRef}
                  style={styles.passwordInput}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#A0A6C0"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() =>
                    handleFocus("confirmPassword", confirmPasswordRef)
                  }
                  onBlur={handleBlur}
                  underlineColorAndroid="transparent"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="#8B93B8"
                  />
                </TouchableOpacity>
              </View>

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  activeOpacity={0.9}
                  onPress={handleVerifyAndReset}
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
                    {loading ? (
                      <ActivityIndicator color="#fbd117" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>
                          Verify & Update Password
                        </Text>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#fbd117"
                          style={styles.buttonIcon}
                        />
                      </>
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

export default VerifyResetOtpScreen;