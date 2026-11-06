import React, { useState, useEffect } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  Modal,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOutUser } from "../services/supabaseAuth";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import { ThemedAlert } from "../components/ThemedAlert";
import styles from "../styles/SettingsScreen.styles";

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // --- MODAL STATES ---
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // --- NOTIFICATION STATES ---
  const [notifs, setNotifs] = useState({
    announcement: true,
    events: true,
    perks: true,
    feed: true,
    messages: true,
  });

  // LOAD NOTIFICATIONS FROM LOCAL STORAGE ON MOUNT
  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const storedNotifs = await AsyncStorage.getItem("@luminus_notif_prefs");
        if (storedNotifs) {
          setNotifs(JSON.parse(storedNotifs));
        }
      } catch (error) {
        console.warn("Failed to load notification preferences", error);
      }
    };
    loadNotifs();
  }, []);

  const toggleNotif = (key) => {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveNotifs = async () => {
    try {
      await AsyncStorage.setItem("@luminus_notif_prefs", JSON.stringify(notifs));
      ThemedAlert.alert("Success", "Notification preferences updated!");
      setShowNotifModal(false);
    } catch (error) {
      ThemedAlert.alert("Error", "Failed to save preferences.");
    }
  };

  // --- PASSWORD STATES ---
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // 🔥 IDENTICAL RULES ARRAY FOR THE UI
  const passwordRequirements = [
    { label: "At least 6 characters", met: passwords.new.length >= 6 },
    { label: "One uppercase letter", met: /[A-Z]/.test(passwords.new) },
    { label: "One number", met: /[0-9]/.test(passwords.new) },
    { label: "One special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(passwords.new) },
  ];

  const goTo = (screenName) => {
    navigation.navigate(screenName);
  };

  const handleContactUs = async () => {
    const email = "ccmaranan@nu-lipa.edu.ph";
    const subject = encodeURIComponent("LumiNUs Support");
    const body = encodeURIComponent("Hi LumiNUs team,\n\nI need help with:");
    const url = `mailto:${email}?subject=${subject}&body=${body}`;

    const openContactEmail = async () => {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      } catch (error) {}

      ThemedAlert.alert(
        "Email App Unavailable",
        `Please email ${email} for support.`,
        [{ text: "OK", color: "accent" }],
      );
    };

    ThemedAlert.alert(
      "Contact LumiNUs",
      `Need help? Send us an email at ${email}.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Email", color: "accent", onPress: openContactEmail },
      ],
    );
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    } catch (error) {
      ThemedAlert.alert("Logout failed", "Please try again.");
    }
  };

  const handleSavePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      ThemedAlert.alert("Error", "Please fill in your current password and new password.");
      return;
    }

    if (passwords.new !== passwords.confirm) {
      ThemedAlert.alert("Error", "Passwords do not match!");
      return;
    }

    // 🔥 FULLY ENFORCED CRITERIA ON SUBMIT
    const isLengthValid = passwords.new.length >= 6;
    const hasUpperCase = /[A-Z]/.test(passwords.new);
    const hasNumber = /[0-9]/.test(passwords.new);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwords.new);

    if (!isLengthValid || !hasUpperCase || !hasNumber || !hasSpecialChar) {
      ThemedAlert.alert(
        "Weak Password",
        "Please ensure your new password meets all the security requirements listed below."
      );
      return;
    }

    setSavingPassword(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const email = userData?.user?.email;
      if (!email) {
        throw new Error("Could not determine the signed-in account email.");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: passwords.current,
      });

      if (signInError) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (updateError) throw updateError;

      ThemedAlert.alert("Success", "Password updated successfully!");
      setShowPasswordModal(false);
      setPasswords({ current: "", new: "", confirm: "" });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      ThemedAlert.alert("Error", error.message || "Unable to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        
        {/* CUSTOM WHITE HEADER */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#32418C" />
            </Pressable>
            <Text style={styles.headerTitle}>Account Settings</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        >
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Account & Security</Text>
              <View style={styles.menuCard}>
                <MenuRow 
                  label="Edit Profile" 
                  icon="person-outline"
                  onPress={() => goTo("AccountSettings")} 
                  showBorder
                />
                <MenuRow 
                  label="Change Password" 
                  icon="lock-closed-outline" 
                  onPress={() => setShowPasswordModal(true)} 
                />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <View style={styles.menuCard}>
                <MenuRow 
                  label="Notification Settings" 
                  icon="notifications-outline" 
                  onPress={() => setShowNotifModal(true)} 
                />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Support</Text>
              <View style={styles.menuCard}>
                <MenuRow 
                  label="Contact Us" 
                  icon="help-circle-outline" 
                  onPress={handleContactUs} 
                  showBorder
                />
                <MenuRow 
                  label="Logout" 
                  icon="log-out-outline" 
                  onPress={handleLogout} 
                  textColor="#E74C3C"
                />
              </View>
            </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 0) }]}> 
          <Image
            source={require("../../assets/images/LumiNUs Logo white.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* --- NOTIFICATIONS MODAL --- */}
      <Modal visible={showNotifModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNotifModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowNotifModal(false)} hitSlop={12}>
              <Ionicons name="arrow-back" size={28} color="#31429B" />
            </Pressable>
            <Text style={styles.modalTitle}>Notifications</Text>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.notifCard}>
              <NotifToggle label="Announcement Notification" value={notifs.announcement} onValueChange={() => toggleNotif("announcement")} />
              <NotifToggle label="Events Notification" value={notifs.events} onValueChange={() => toggleNotif("events")} />
              <NotifToggle label="Perks & Discount Notification" value={notifs.perks} onValueChange={() => toggleNotif("perks")} />
              <NotifToggle label="Feed Notification" value={notifs.feed} onValueChange={() => toggleNotif("feed")} />
              <NotifToggle label="Messages Notification" value={notifs.messages} onValueChange={() => toggleNotif("messages")} isLast />
            </View>
          </View>

          <View style={[styles.modalBottomWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleSaveNotifs} activeOpacity={0.8}>
              <Text style={styles.modalPrimaryButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* --- CHANGE PASSWORD MODAL --- */}
      <Modal visible={showPasswordModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPasswordModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowPasswordModal(false)} hitSlop={12}>
              <Ionicons name="arrow-back" size={28} color="#31429B" />
            </Pressable>
            <Text style={styles.modalTitle}>Change Password</Text>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.inputBoxContainer}>
                <TextInput
                  style={styles.inputBox}
                  secureTextEntry={!showCurrentPassword}
                  value={passwords.current}
                  onChangeText={(val) => setPasswords((p) => ({ ...p, current: val }))}
                />
                <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIcon} hitSlop={10}>
                  <Ionicons name={showCurrentPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#1C1C1E" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputBoxContainer}>
                <TextInput
                  style={styles.inputBox}
                  secureTextEntry={!showNewPassword}
                  value={passwords.new}
                  onChangeText={(val) => setPasswords((p) => ({ ...p, new: val }))}
                />
                <Pressable onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon} hitSlop={10}>
                  <Ionicons name={showNewPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#1C1C1E" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.inputBoxContainer}>
                <TextInput
                  style={styles.inputBox}
                  secureTextEntry={!showConfirmPassword}
                  value={passwords.confirm}
                  onChangeText={(val) => setPasswords((p) => ({ ...p, confirm: val }))}
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon} hitSlop={10}>
                  <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#1C1C1E" />
                </Pressable>
              </View>
            </View>

            {/* 🔥 VISUAL REQUIREMENTS CHECKLIST */}
            <View style={{ marginTop: 10, marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#32418C", marginBottom: 8 }}>
                Password Requirements:
              </Text>
              {passwordRequirements.map((req, index) => (
                <View key={index} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Ionicons 
                    name={req.met ? "checkmark-circle" : "ellipse-outline"} 
                    size={14} 
                    color={req.met ? "#4CAF50" : "#A0A0A0"} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{ fontSize: 12, color: req.met ? "#4CAF50" : "#666666" }}>
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.modalBottomWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, savingPassword && styles.modalPrimaryButtonDisabled]}
              onPress={handleSavePassword}
              activeOpacity={0.8}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator color="#FFD404" />
              ) : (
                <Text style={styles.modalPrimaryButtonText}>Save New Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const MenuRow = ({ label, icon, onPress, showBorder, textColor }) => {
  return (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [
        {
          minHeight: 54,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 4,
          backgroundColor: pressed ? "rgba(50, 65, 140, 0.04)" : "transparent",
          borderBottomWidth: showBorder ? 1 : 0,
          borderBottomColor: "#E8EAFF",
        }
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        {icon ? (
          <Ionicons 
            name={icon} 
            size={20} 
            color={textColor || "#32418C"} 
            style={{ marginRight: 14 }} 
          />
        ) : (
          <View style={{ width: 20, marginRight: 14 }} />
        )}
        <Text 
          style={{
            fontSize: 15,
            fontFamily: "Poppins-Medium",
            color: textColor || "#1A1A2E",
            includeFontPadding: false,
            textAlignVertical: "center",
          }}
          allowFontScaling={false}
        >
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#A0AABF" />
    </Pressable>
  );
};

const NotifToggle = ({ label, value, onValueChange, isLast }) => {
  return (
    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: "#E8EAFF",
    }}>
      <Text 
        style={{
          fontSize: 15,
          fontFamily: "Poppins-Medium",
          color: "#1A1A2E",
          flex: 1,
          paddingRight: 10,
        }}
        allowFontScaling={false}
      >
        {label}
      </Text>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: "#E2E8F0", true: "#32418C" }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E2E8F0"
      />
    </View>
  );
};

export default SettingsScreen;