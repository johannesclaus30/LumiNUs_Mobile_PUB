import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SmartTextInput from "../components/SmartTextInput";
import { Ionicons } from "@expo/vector-icons";
import { signInUser, getCurrentUser } from "../services/supabaseAuth";
import { getAlumniByEmail } from "../services/alumniQueries";
import supabase from "../services/supabase";
import styles from "../styles/LoginScreen.styles";
import { useUnreadMessages } from "../context/UnreadMessagesContext";

import { ThemedAlert } from "../components/ThemedAlert";

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_COOLDOWN_MS = 10 * 60 * 1000;
const LOGIN_ATTEMPTS_STORAGE_KEY = "@luminus_login_attempts";

const LoginScreen = ({ navigation }) => {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Privacy Agreement State
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const { refreshUnreadMessages } = useUnreadMessages();
  const cardReveal = useRef(new Animated.Value(0)).current;

  const getLoginAttemptRecord = async (normalizedEmail) => {
    const storedAttempts = await AsyncStorage.getItem(
      `${LOGIN_ATTEMPTS_STORAGE_KEY}:${normalizedEmail}`,
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
      console.warn("[LoginScreen] Invalid login attempt record:", error);
      return { failedAttempts: 0, cooldownUntil: 0 };
    }
  };

  const clearLoginAttemptRecord = async (normalizedEmail) => {
    await AsyncStorage.removeItem(
      `${LOGIN_ATTEMPTS_STORAGE_KEY}:${normalizedEmail}`,
    );
  };

  const recordFailedLoginAttempt = async (normalizedEmail) => {
    const record = await getLoginAttemptRecord(normalizedEmail);
    const failedAttempts = record.failedAttempts + 1;
    const cooldownUntil =
      failedAttempts >= LOGIN_ATTEMPT_LIMIT
        ? Date.now() + LOGIN_COOLDOWN_MS
        : 0;

    await AsyncStorage.setItem(
      `${LOGIN_ATTEMPTS_STORAGE_KEY}:${normalizedEmail}`,
      JSON.stringify({ failedAttempts, cooldownUntil }),
    );

    return { failedAttempts, cooldownUntil };
  };

  useEffect(() => {
    Animated.timing(cardReveal, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [cardReveal]);

    useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const normalizedEmail = String(user.email || "").trim().toLowerCase();
          const activeProfile = await getAlumniByEmail(normalizedEmail);

          if (activeProfile) {
            const accountStatus = Number(activeProfile.account_status);

            if (accountStatus === 2) {
              await supabase.auth.signOut();
              ThemedAlert.alert(
                "Account Disabled",
                "You previously disabled this account. Please contact the Alumni Office to restore your access.",
              );
              return;
            }

            if (accountStatus === 3) {
              await supabase.auth.signOut();
              ThemedAlert.alert(
                "Account Suspended",
                "This account has been banned for violating the terms of service. Access is permanently revoked.",
              );
              return;
            }
          }

          // 🔥 Fire-and-forget: mark user as active on every app open
          if (activeProfile?.id) {
            supabase
              .from("alumnis_base")
              .update({ last_active_at: new Date().toISOString() })
              .eq("id", activeProfile.id)
              .then(
                () => {},
                (bgError) =>
                  console.warn("[LoginScreen] last_active_at update failed:", bgError),
              );
          }

          if (user.needs_password_change) {
            navigation.replace("ChangePassword");
            return;
          }

        }
      } catch (error) {
        console.warn("[LoginScreen] No active session");
      }
    };

    restoreSession();
  }, [navigation]);

  // Submit the login form
  const handleLogin = async () => {
    if (!email || !password) {
      ThemedAlert.alert("Error", "Please fill in all fields");
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let loginAttemptRecord;
    try {
      loginAttemptRecord = await getLoginAttemptRecord(normalizedEmail);
    } catch (storageError) {
      console.error(
        "[LoginScreen] Could not check login attempt limit:",
        storageError,
      );
      ThemedAlert.alert(
        "Login Unavailable",
        "Unable to verify login availability. Please try again.",
      );
      return;
    }

    if (loginAttemptRecord.cooldownUntil > Date.now()) {
      const remainingMinutes = Math.ceil(
        (loginAttemptRecord.cooldownUntil - Date.now()) / 60000,
      );
      ThemedAlert.alert(
        "Too Many Attempts",
        `Too many failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
      );
      return;
    }

    if (loginAttemptRecord.cooldownUntil) {
      try {
        await clearLoginAttemptRecord(normalizedEmail);
      } catch (storageError) {
        console.error(
          "[LoginScreen] Could not clear expired login attempt record:",
          storageError,
        );
        ThemedAlert.alert(
          "Login Unavailable",
          "Unable to reset the login attempt timer. Please try again.",
        );
        return;
      }
    }

    // STRICT CHECK: Ensure privacy policy is accepted
    if (!privacyAccepted) {
      ThemedAlert.alert(
        "Action Required",
        "You must read and accept the Data Privacy Agreement before logging in."
      );
      return;
    }

    setLoading(true);

    let authenticationSucceeded = false;

    try {
      // Sign in with Supabase
      const { user } = await signInUser(normalizedEmail, password);

      if (!user) {
        throw new Error("Login failed: No user returned");
      }
      authenticationSucceeded = true;
      try {
        await clearLoginAttemptRecord(normalizedEmail);
      } catch (storageError) {
        console.error(
          "[LoginScreen] Could not clear successful login attempt record:",
          storageError,
        );
      }

      // Get alumni profile from Supabase
      const alumniProfile = await getAlumniByEmail(normalizedEmail);

      if (!alumniProfile?.id) {
        await supabase.auth.signOut();
        throw new Error(
          "Your account profile could not be loaded. Please contact the Alumni Office.",
        );
      }

      if (alumniProfile) {
        const accountStatus = Number(alumniProfile.account_status);

        if (accountStatus === 0) {
          await supabase.auth.signOut();
          navigation.replace("Restricted", {
            email: normalizedEmail,
            reason: "Your account has been restricted by the NU Lipa Alumni Affairs Office. Please contact them for assistance.",
          });
          return;
        }

        if (accountStatus === 2) {
          await supabase.auth.signOut();
          ThemedAlert.alert(
            "Account Disabled",
            "You previously disabled this account. Please contact the Alumni Office to restore your access.",
          );
          return;
        }

        if (accountStatus === 3) {
          await supabase.auth.signOut();
          ThemedAlert.alert(
            "Account Suspended",
            "This account has been banned for violating the terms of service. Access is permanently revoked.",
          );
          return;
        }
      }

      // These don't need to finish before we navigate to Home — run them
      // in the background instead of blocking the login flow on two more
      // network round trips.
      if (alumniProfile?.id) {
        supabase
          .from("alumnis_base")
          .update({
            is_online: true,
            last_login_at: new Date().toISOString(),
          })
          .eq("id", alumniProfile.id)
          .then(
            () => {},
            (bgError) =>
              console.warn("[LoginScreen] login stamp update failed:", bgError),
          );
      }

      refreshUnreadMessages().catch((bgError) =>
        console.warn("[LoginScreen] refreshUnreadMessages failed:", bgError),
      );

      if (alumniProfile) {
        ThemedAlert.alert(
          "Success!",
          `Welcome back, ${alumniProfile.first_name}!`,
        );
      } else {
        ThemedAlert.alert("Success!", "Logged in successfully!");
      }

      if (alumniProfile?.needs_password_change) {
        navigation.replace("ChangePassword");
        return;
      }

    } catch (error) {
      const errMsg = error?.message || "";
      if (!authenticationSucceeded) {
        try {
          const { failedAttempts } = await recordFailedLoginAttempt(
            normalizedEmail,
          );

          if (failedAttempts >= LOGIN_ATTEMPT_LIMIT) {
            ThemedAlert.alert(
              "Too Many Attempts",
              "You have reached the maximum of 5 failed login attempts. Please try again in 10 minutes.",
            );
            return;
          }
        } catch (storageError) {
          console.error(
            "[LoginScreen] Could not record failed login attempt:",
            storageError,
          );
        }
      }

      if (!errMsg.includes("Invalid login credentials")) {
        console.error("[LoginScreen] Login error:", error);
      }

      let friendlyMessage = "Failed to log in. Please check your credentials.";

      if (errMsg.includes("Invalid login credentials")) {
        friendlyMessage = "Invalid email or password.";
      } else if (errMsg.includes("Email not confirmed")) {
        friendlyMessage = "Please verify your email before logging in.";
      } else if (errMsg) {
        friendlyMessage = errMsg;
      }

      ThemedAlert.alert("Login Failed", friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxPress = () => {
    if (!hasReadPrivacy) {
      // Force them to open the modal first
      setPrivacyModalVisible(true);
    } else {
      // If they already read it, allow toggling
      setPrivacyAccepted(!privacyAccepted);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/unnamed.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="#31429B" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.cardContainer,
              {
                opacity: cardReveal,
                transform: [
                  {
                    translateY: cardReveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                  {
                    scale: cardReveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Logo */}
            <Image
              source={require("../../assets/images/lumi-n-us-logo-landscape-2.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* Email field */}
            <Text style={styles.label}>Email Address</Text>
            <SmartTextInput
              style={styles.input}
              placeholder="Enter Your Email Address"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            {/* Password field */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <SmartTextInput
                style={styles.passwordInput}
                placeholder="Enter Your Password"
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Login options */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberContainer}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={loading}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={14} color="#31429B" />}
                </View>
                <Text style={styles.optionText}>Remember Me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate("ForgetPassword")}
                disabled={loading}
              >
                <Text style={styles.optionText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Data Privacy Agreement Row */}
            <View style={styles.privacyRow}>
              <TouchableOpacity
                style={styles.privacyCheckboxContainer}
                onPress={handleCheckboxPress}
                disabled={loading}
              >
                <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
                  {privacyAccepted && <Ionicons name="checkmark" size={14} color="#31429B" />}
                </View>
              </TouchableOpacity>
              <Text style={styles.privacyText}>
                I have read and agree to the{" "}
                <Text
                  style={styles.privacyLink}
                  onPress={() => setPrivacyModalVisible(true)}
                >
                  Data Privacy Agreement
                </Text>
              </Text>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.button, !privacyAccepted && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#31429B" size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* DATA PRIVACY MODAL */}
      <Modal
        visible={privacyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Data Privacy Agreement</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalParagraph}>
                In compliance with the <Text style={styles.boldText}>Data Privacy Act of 2012 (Republic Act No. 10173)</Text>, the National University Lipa (NU Lipa) Alumni Affairs Office is committed to protecting your personal information.
              </Text>
              <Text style={styles.modalParagraph}>
                By tapping <Text style={styles.boldText}>Accept</Text>, you confirm that you have read this agreement and give your informed consent to the collection, use, processing, and storage of the information described below for the operation of LumiNUs. You may withdraw your consent by contacting the NU Lipa Alumni Affairs Office; however, some services, including login and alumni-network features, may no longer be available.
              </Text>
              <Text style={styles.modalSubheading}>Information We Collect:</Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>1. Account information: </Text>Your email address, authentication details, and account status are processed to create, secure, and maintain your account. Your password is handled by the authentication service and is not displayed to other users.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>2. Profile information: </Text>Information you provide, such as your name, program, year graduated, profile photo, contact details, employment history, and other alumni information, may be stored and displayed according to the app's features and your privacy settings.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>3. App activity: </Text>Connection requests, accepted connections, messages, event interactions, notifications, login activity, and technical information needed to keep the service reliable may be processed.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>4. Information you choose to provide: </Text>Please do not submit passwords, government identification numbers, financial information, health information, or other sensitive information unless the app specifically requests it through an approved university process.
              </Text>
              <Text style={styles.modalSubheading}>Rules & Regulations:</Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>5. Purpose limitation: </Text>Your data will be used for alumni directory and networking services, event management, account administration, security, service improvement, and official university communications related to these services.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>6. Access and permissions: </Text>LumiNUs will request only the device permissions needed for a feature you choose to use. For example, photo or media access may be requested when you select a profile photo, and notification access may be requested for alerts. You may deny optional permissions, but the related feature may not work. The app does not receive access to your contacts, camera, microphone, location, or files unless you grant an operating-system permission for a specific feature.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>7. Visibility and confidentiality: </Text>Information shared in alumni profiles, connections, messages, events, or other app features may be visible to their intended recipients. Do not post confidential, abusive, threatening, discriminatory, misleading, or unlawful content. Do not attempt to access another user's account or collect another user's data without permission.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>8. Sharing: </Text>Your information will not be sold. It may be shared with authorized NU Lipa personnel, service providers who support hosting, authentication, storage, notifications, or security, and government or law-enforcement authorities when required or permitted by law. Authorized recipients must handle the information only for legitimate purposes.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>9. Accuracy and account security: </Text>You agree to provide accurate, current information and to keep your login credentials confidential. Report suspected unauthorized access, incorrect profile information, or security concerns to the NU Lipa Alumni Affairs Office promptly.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>10. Prohibited conduct: </Text>Do not use LumiNUs for harassment, impersonation, spam, unauthorized advertising, scraping, malicious software, fraud, or any activity that violates university policies or applicable law. Access may be restricted, suspended, or removed after appropriate review.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>11. Your rights: </Text>Subject to applicable law and university procedures, you may request access to, correction of, portability of, or deletion of your personal information, and you may object to or restrict certain processing. Contact the NU Lipa Alumni Affairs Office to make a request or ask questions about your data.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>12. Retention and deletion: </Text>Information will be retained only for as long as reasonably necessary for the purposes above, legal obligations, dispute resolution, security, and legitimate university records. Account deletion does not necessarily remove information that must be retained by law or for documented institutional requirements.
              </Text>
              <Text style={styles.modalBullet}>
                <Text style={styles.boldText}>13. Security and updates: </Text>Reasonable administrative, technical, and physical safeguards will be used, but no online service can guarantee absolute security. This agreement may be updated when practices, features, or legal requirements change. Material changes will be communicated through the app or another appropriate channel.
              </Text>
              <Text style={styles.modalParagraph}>
                If you do not agree, tap <Text style={styles.boldText}>Cancel</Text>. You may not sign in to LumiNUs until the required agreement is accepted.
              </Text>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setPrivacyModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAcceptButton}
                onPress={() => {
                  setHasReadPrivacy(true);
                  setPrivacyAccepted(true);
                  setPrivacyModalVisible(false);
                }}
              >
                <Text style={styles.modalAcceptText}>I Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

export default LoginScreen;