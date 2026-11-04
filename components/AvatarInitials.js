// components/AvatarInitials.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const AvatarInitials = ({ name, uri, size = 44, style }) => {
  // If there's a valid URI, show nothing (the parent should handle image display)
  if (uri && typeof uri === "string" && uri.trim() !== "" && !uri.includes("undefined") && !uri.includes("null")) {
    return null;
  }

  // Get initials from name
  const getInitials = (fullName) => {
    if (!fullName || typeof fullName !== "string") return "?";
    
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length === 0) return "?";
    if (parts.length === 1) {
      // Single name: return first letter
      return parts[0].charAt(0).toUpperCase();
    }
    
    // Multiple names: return first letter of first name + first letter of last name
    const firstInitial = parts[0].charAt(0).toUpperCase();
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    
    return `${firstInitial}${lastInitial}`;
  };

  const initials = getInitials(name);
  
  // Calculate font size based on avatar size
  const fontSize = size * 0.42;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: fontSize,
            lineHeight: fontSize * 1.2, // ← Add lineHeight for vertical centering
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#32418c",
    alignItems: "center",
    justifyContent: "center",
    // ✅ Add these for perfect centering
    display: "flex",
  },
  text: {
    color: "#fbd117",
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    textAlign: "center",
    // ✅ Ensure text is centered
    includeFontPadding: false, // ← Remove extra padding on Android
    textAlignVertical: "center", // ← For Android vertical centering
  },
});

export default AvatarInitials;