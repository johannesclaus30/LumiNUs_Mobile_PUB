import React from "react";
import { StatusBar } from "react-native";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "../styles/ViewYearbookScreen.styles";

const ViewYearbookScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar 
        barStyle="dark-content"  // ← Changed to dark-content
        backgroundColor="#ffffff" 
        translucent={false}
      />
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.titleStrip}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={28} color="#31429B" />
            </Pressable>
            <Text style={styles.title}>Virtual Yearbook</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.comingSoonContainer}>
            <View style={styles.comingSoonCard}>
              <View style={styles.comingSoonIconWrap}>
                <Ionicons name="book-outline" size={80} color="#31429B" />
              </View>
              <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
              <Text style={styles.comingSoonSubtitle}>
                The Virtual Yearbook feature is currently under development.
              </Text>
              <Text style={styles.comingSoonDescription}>
                We're working hard to bring you a digital yearbook where you can 
                relive your favorite memories, browse through class photos, and 
                celebrate your journey at NU Lipa.
              </Text>
              <View style={styles.comingSoonProgress}>
                <View style={styles.progressBar}>
                  <View style={styles.progressFill} />
                </View>
                <Text style={styles.progressText}>In development</Text>
              </View>
            </View>
          </View>

          <View style={styles.footerSpacer} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ViewYearbookScreen;