import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";

// --- HOOK INTO GLOBAL STATE ---
import { useUnreadMessages } from "../context/UnreadMessagesContext";
import styles from "../styles/ExploreScreen.styles";
import { ThemedAlert } from "../components/ThemedAlert";

const ExploreScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  
  // --- GRAB GLOBAL UNREAD COUNT ---
  const { unreadCount } = useUnreadMessages();

  // --- ANIMATION VALUES ---
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const slideAnim1 = useRef(new Animated.Value(20)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const slideAnim2 = useRef(new Animated.Value(20)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const slideAnim3 = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const createAnim = (fade, slide) => {
      return Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]);
    };

    Animated.stagger(100, [
      createAnim(fadeAnim1, slideAnim1),
      createAnim(fadeAnim2, slideAnim2),
      createAnim(fadeAnim3, slideAnim3),
    ]).start();
  }, [fadeAnim1, fadeAnim2, fadeAnim3, slideAnim1, slideAnim2, slideAnim3]);

  const handleAction = useCallback(async (action, url = null) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Silently fail if device lacks haptics support
    }

    const parentNavigator = navigation.getParent?.();

    switch (action) {
      case "Mentorship":
        navigation.navigate("MentorshipScreen");
        break;
      case "MentorshipTracker":
        navigation.navigate("MentorshipTrackerScreen");
        break;
      case "Yearbook":
        navigation.navigate("ViewYearbook");
        break;
      case "Tracer":
        navigation.navigate("TracerMenu");
        break;
      case "ID":
        const scrollParams = { scrollToVirtualId: true, timestamp: Date.now() };
        (parentNavigator?.navigate ?? navigation.navigate)("HomeTab", scrollParams);
        break;
      case "Messages":
        (navigation.jumpTo ?? navigation.navigate)("Messages");
        break;
      case "Events":
        if (parentNavigator?.navigate) parentNavigator.navigate("EventsScreen");
        else navigation.navigate("Home", { screen: "EventsScreen" });
        break;
      case "Registrations":
        (parentNavigator?.navigate ?? navigation.navigate)("RegisteredEventsScreen");
        break;
      case "Drafts": {
        const rootNavigator = parentNavigator?.getParent?.() ?? parentNavigator;
        (rootNavigator?.navigate ?? navigation.navigate)("DraftsScreen");
        break;
      }
      case "Perks":
        navigation.navigate("Perks");
        break;
      case "Feed":
        (navigation.jumpTo ?? navigation.navigate)("Feed");
        break;
      case "Website":
        if (url) {
          Linking.canOpenURL(url)
            .then((supported) => (supported ? Linking.openURL(url) : null))
            .catch(() => ThemedAlert.alert("Error", "Could not open website."));
        }
        break;
      default:
        break;
    }
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="light"/>
      
      {/* --- HEADER --- */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Image
          source={require("../../assets/images/lumi-n-us-logo-landscape-2.png")}
          style={styles.headerLogo}
        />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* --- 1. HERO SECTION (Mentorship) --- */}
        <Animated.View style={{ opacity: fadeAnim1, transform: [{ translateY: slideAnim1 }] }}>
          <TouchableOpacity 
            style={styles.heroCard} 
            activeOpacity={0.9}
            onPress={() => handleAction("Mentorship")}
          >
            <View style={styles.heroTextContainer}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>NEW LAUNCH</Text>
              </View>
              <Text style={styles.heroTitle}>Alumni Mentorship</Text>
              <Text style={styles.heroDesc}>
                Connect, guide, and grow with fellow Bulldogs.
              </Text>
            </View>
            <View style={styles.heroImageContainer}>
              <Image source={require("../../assets/images/Mentorship_Icon.png")} style={styles.heroIcon} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* --- 2. QUICK ACCESS --- */}
        <Animated.View style={[{ opacity: fadeAnim2, transform: [{ translateY: slideAnim2 }] }, styles.quickToolsContainer]}>
          <Text style={styles.sectionHeader}>Quick Access</Text>
          <View style={styles.quickToolsRow}>
            {[
              { label: "Alumni ID", icon: "card-outline", action: "ID" },
              { label: "Tracer", icon: "navigate-outline", action: "Tracer" },
              { label: "Yearbook", icon: "book-outline", action: "Yearbook" },
              { 
                label: "Messages", 
                icon: "chatbubble-ellipses-outline", 
                action: "Messages", 
                badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount.toString()) : null 
              }, 
            ].map((tool, idx) => (
              <TouchableOpacity key={idx} style={styles.quickToolBtn} onPress={() => handleAction(tool.action)} activeOpacity={0.7}>
                <View>
                  <View style={styles.quickToolCircle}>
                    <Ionicons name={tool.icon} size={30} color="#FBD117" />
                  </View>
                  
                  {tool.badge && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{tool.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.quickToolLabel}>{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* --- 3. BENTO GRID --- */}
        <Animated.View style={[{ opacity: fadeAnim3, transform: [{ translateY: slideAnim3 }] }, styles.bentoContainer]}>
          <Text style={styles.sectionHeader}>Explore</Text>
          <View style={styles.bentoGrid}>
            
            <TouchableOpacity style={styles.bentoSquare} onPress={() => handleAction("Events")} activeOpacity={0.8}>
              <View style={styles.bentoIconBox}>
                <Image source={require("../../assets/images/view-uni-events-icon-in-blue-1.png")} style={styles.bentoIcon} />
              </View>
              <Text style={styles.bentoTitle}>University{"\n"}Events</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bentoSquare} onPress={() => handleAction("Perks")} activeOpacity={0.8}>
              <View style={styles.bentoIconBox}>
                <Image source={require("../../assets/images/view-perks-icon-in-blue-1.png")} style={styles.bentoIcon} />
              </View>
              <Text style={styles.bentoTitle}>Perks &{"\n"}Discounts</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bentoWide} onPress={() => handleAction("Feed")} activeOpacity={0.8}>
              <View style={styles.bentoWideContent}>
                <Text style={styles.bentoTitle}>Community Feed</Text>
                <Text style={styles.bentoSubtitle}>See what other alumni are up to</Text>
              </View>
              <View style={styles.bentoIconBox}>
                <Image source={require("../../assets/images/feed-icon-in-blue-1.png")} style={styles.bentoIcon} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bentoSquare} onPress={() => handleAction("Registrations")} activeOpacity={0.8}>
              <View style={styles.bentoIconBox}>
                <Image source={require("../../assets/images/registration-icon-in-blue-1.png")} style={styles.bentoIcon} />
              </View>
              <Text style={styles.bentoTitle}>Event{"\n"}Registrations</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bentoSquare} onPress={() => handleAction("Drafts")} activeOpacity={0.8}>
              <View style={styles.bentoIconBox}>
                <Ionicons name="document-text-outline" size={28} color="#FBD117" />
              </View>
              <Text style={styles.bentoTitle}>Post{"\n"}Drafts</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bentoSquareAccent} onPress={() => handleAction("Website", "https://nu.edu.ph")} activeOpacity={0.9}>
              <View style={styles.bentoIconBoxAccent}>
                <Image source={require("../../assets/images/nu_logo_blue.png")} style={styles.bentoIconWhite} />
              </View>
              <Text style={styles.bentoTitleAccent}>NU Lipa{"\n"}Website</Text>
              <Ionicons name="open-outline" size={18} color="#32418C" style={styles.bentoExternalIcon} />
            </TouchableOpacity>

            {/* NEW BENTO BOX FOR PROPOSAL TRACKER */}
            <TouchableOpacity style={styles.bentoWide} onPress={() => handleAction("MentorshipTracker")} activeOpacity={0.8}>
              <View style={styles.bentoWideContent}>
                <Text style={styles.bentoTitle}>Proposal Tracker</Text>
                <Text style={styles.bentoSubtitle}>View your drafts and event applications</Text>
              </View>
              <View style={styles.bentoIconBox}>
                <Ionicons name="telescope-outline" size={28} color="#FBD117" />
              </View>
            </TouchableOpacity>

          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
};

export default ExploreScreen;