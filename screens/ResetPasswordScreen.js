import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import styles from "../styles/ResetPasswordScreen.styles";
import { ThemedAlert } from "../components/ThemedAlert";

const ResetPasswordScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 330);

  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const presetStudentNumber = route?.params?.student_id_number || "";
    if (presetStudentNumber) {
      setStudentIdNumber(presetStudentNumber);
    }
  }, [route?.params?.student_id_number]);

  // 🔥 IDENTICAL RULES ARRAY FOR THE UI
  const passwordRequirements = [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const handleResetPassword = async () => {
    const trimmedStudentNumber = studentIdNumber.trim();

    if (!trimmedStudentNumber || !password || !passwordConfirmation) {
      ThemedAlert.alert(
        "Missing fields",
        "Fill in all reset details before continuing.",
      );
      return;
    }

    if (password !== passwordConfirmation) {
      ThemedAlert.alert("Password mismatch", "The new passwords do not match.");
      return;
    }

    // 🔥 FULLY ENFORCED CRITERIA ON SUBMIT
    const isLengthValid = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!isLengthValid || !hasUpperCase || !hasNumber || !hasSpecialChar) {
      ThemedAlert.alert(
        "Weak Password",
        "Please ensure your new password meets all the security requirements listed below."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/alumni/reset-password", {
        student_id_number: trimmedStudentNumber,
        password,
        password_confirmation: passwordConfirmation,
      });

      ThemedAlert.alert(
        "Password Updated",
        response.data?.message ||
          "Your password has been updated successfully.",
      );
      navigation.goBack();
    } catch (error) {
      const serverData = error.response?.data;
      let friendly = "Failed to reset your password.";

      if (serverData?.errors) {
        const firstKey = Object.keys(serverData.errors)[0];
        friendly = serverData.errors[firstKey]?.[0] || friendly;
      } else if (serverData?.message) {
        friendly = serverData.message;
      } else if (error.message) {
        friendly = error.message;
      }

      ThemedAlert.alert("Reset Failed", friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.page}>
        <View style={[styles.content, { width: contentWidth }]}>
          <View style={styles.iconWrap}>
            <View style={styles.lockTop} />
            <View style={styles.lockBody}>
              <Text style={styles.lockMark}>?</Text>
            </View>
          </View>

          <Text style={styles.title}>Reset Password</Text>

          <Text style={styles.label}>Enter Your New Password</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="#A0A0A0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Confirm Your New Password</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="#A0A0A0"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Enter Your Student Number</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="#A0A0A0"
            value={studentIdNumber}
            onChangeText={setStudentIdNumber}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {/* 🔥 VISUAL REQUIREMENTS CHECKLIST */}
          <View style={{ marginTop: 15, marginBottom: 20 }}>
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "Save New Password"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;