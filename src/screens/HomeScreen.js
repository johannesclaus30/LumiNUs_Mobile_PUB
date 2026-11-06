import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  Image as RNImage,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ImageBackground,
  Linking,
  Animated,
  Pressable,
  RefreshControl,
  useWindowDimensions,
  Alert,
  Easing,
  Platform,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { CommonActions, useFocusEffect, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../services/supabase";
import { getCurrentUser, signOutUser } from "../services/supabaseAuth";
import { getAllEvents } from "../services/eventQueries";
import { getAvatarUri } from "../utils/imageUtils";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";
import HomeHeader from "../components/HomeHeader";
import { responsiveHeight, responsiveWidth } from "../utils/responsive";
import styles from "../styles/HomeScreen.styles";
import { getDismissedNotifications } from "../services/utilityQueries";
import { registerForPushNotificationsAsync, saveTokenToSupabase } from "../services/notificationService";

// --- NEW IMPORTS FOR CHECKPOINT ---
import CheckpointModal from "../components/checkpoint/CheckpointModal";
import { checkCheckpointStatus } from "../services/checkpointQueries";

// ==============================================
// 1. FAST STATIC STARFIELD (Memoized to prevent scroll re-renders)
// ==============================================
const StarField = memo(() => {
  const stars = useMemo(() => [
    { key: "s1", top: "5%", left: "8%", size: 2, opacity: 0.3 },
    { key: "s2", top: "12%", right: "12%", size: 1, opacity: 0.4 },
    { key: "s3", top: "25%", left: "22%", size: 2, opacity: 0.2 },
    { key: "s4", top: "38%", right: "35%", size: 1, opacity: 0.5 },
    { key: "s5", top: "45%", left: "5%", size: 2, opacity: 0.3 },
    { key: "s6", top: "60%", right: "8%", size: 1, opacity: 0.4 },
    { key: "s7", top: "75%", left: "18%", size: 2, opacity: 0.2 },
    { key: "s8", top: "88%", right: "25%", size: 1, opacity: 0.5 },
    { key: "s9", top: "18%", left: "35%", size: 3, opacity: 0.7 },
    { key: "s10", top: "40%", left: "55%", size: 4, opacity: 0.8 },
    { key: "s11", top: "65%", left: "30%", size: 3, opacity: 0.7 },
    { key: "s12", top: "85%", left: "65%", size: 4, opacity: 0.8 },
    { key: "s13", top: "15%", left: "15%", size: 4, opacity: 0.9 },
    { key: "s14", top: "35%", right: "18%", size: 5, opacity: 1.0 },
    { key: "s15", top: "75%", left: "45%", size: 5, opacity: 1.0 },
  ], []);

  return (
    <>
      {stars.map((s) => (
        <View
          key={s.key}
          style={[
            styles.star,
            {
              top: s.top,
              left: s.left,
              right: s.right,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
            },
          ]}
        />
      ))}
    </>
  );
});

// ==============================================
// 2. IMAGE URL HELPER
// ==============================================
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return `${baseUrl}/storage/v1/object/public/alumni/${path}`;
};

// ==============================================
// MODULE-LEVEL CACHE (Persists across tab switches)
// ==============================================
let cachedUserData = null;
let lastUserFetchTime = 0;
let cachedEventsData = [];
let lastEventFetchTime = 0;
let cachedNotifCount = 0;
let lastNotifFetchTime = 0;

// ==============================================
// MAIN COMPONENT
// ==============================================
const HomeScreen = ({ navigation }) => {
  const route = useRoute();
  const { currentUserProfile } = useCurrentUserProfile();
  const { width, height } = useWindowDimensions();
  const isCompactWidth = width < 375;
  const isTablet = width >= 768;

  const layout = useMemo(() => ({
    horizontalPadding: isTablet ? 32 : isCompactWidth ? 16 : 20,
    menuWidth: Math.min(width * 0.85, 360),
    notifWidth: Math.min(width * 0.88, 360),
    heroCardWidth: width - (isTablet ? 64 : isCompactWidth ? 32 : 40),
    promoCardWidth: responsiveWidth(width, 0.6, 220, isTablet ? 300 : 250),
    promoCardHeight: responsiveHeight(height, 0.28, 220, 260),
  }), [width, height, isCompactWidth, isTablet]);

  const [userData, setUserData] = useState(cachedUserData);
  const [notificationCount, setNotificationCount] = useState(cachedNotifCount);
  const [featuredEvents, setFeaturedEvents] = useState(cachedEventsData);
  const [isLoadingFeaturedEvents, setIsLoadingFeaturedEvents] = useState(false);
  const [isRefreshingHome, setIsRefreshingHome] = useState(false);
  const [isIdFlipped, setIsIdFlipped] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // --- NEW STATES FOR CHECKPOINT ---
  const [isCheckpointVisible, setIsCheckpointVisible] = useState(false);
  const [checkpointType, setCheckpointType] = useState(null);
  const [checkpointData, setCheckpointData] = useState(null);       // <-- ADDED
  const [isCheckpointCompleted, setIsCheckpointCompleted] = useState(false); // <-- ADDED
  const [checkpointHasShsRecord, setCheckpointHasShsRecord] = useState(false);
  const checkpointPulse = useRef(new Animated.Value(0)).current;

  const flipAnimation = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const menuTranslateX = useRef(new Animated.Value(-Math.min(width * 0.92, 360))).current;
  const rocketFloatAnim = useRef(new Animated.Value(0)).current;
  const curveSize = Math.min(width * 2.2, 850);

  // ==============================================
  // LIGHTWEIGHT NOTIFICATION COUNT CHECK
  // ==============================================
  const fetchNotifications = useCallback(async () => {
    const now = Date.now();
    if (now - lastNotifFetchTime < 3 * 60 * 1000) return;

    try {
      const currentProfile = currentUserProfile ?? await getCurrentUser().catch(() => null);
      const currentUserId = currentProfile?.id ?? null;
      if (!currentUserId) return;

      const [dismissedKeys, userPostsRes] = await Promise.all([
        getDismissedNotifications(currentUserId).catch(() => []),
        supabase.from("posts").select("id").eq("alumni_id", currentUserId).order("created_at", { ascending: false }).limit(25),
      ]);

      const dismissedSet = new Set((dismissedKeys || []).map(String));
      const postIds = (userPostsRes.data || []).map((p) => p.id);

      const [commentsResult, reactionsResult, announcementsResult, connectionsResult, perksResult] = await Promise.all([
        postIds.length > 0
          ? supabase.from("comments").select("id", { count: "exact", head: true }).in("post_id", postIds).neq("alumni_id", currentUserId)
          : Promise.resolve({ count: 0 }),
        postIds.length > 0
          ? supabase.from("reactions").select("id", { count: "exact", head: true }).in("post_id", postIds).neq("alumni_id", currentUserId)
          : Promise.resolve({ count: 0 }),
        supabase.from("announcements").select("id", { count: "exact", head: true }).lte("scheduled_at", new Date().toISOString()),
        supabase.from("connections").select("id", { count: "exact", head: true }).eq("connection_id", currentUserId).eq("status", "pending"),
        supabase.from("perks").select("id", { count: "exact", head: true }).eq("status", 1).gte("valid_until", new Date().toISOString().split("T")[0]),
      ]);

      const rawTotal = (commentsResult.count || 0) + (reactionsResult.count || 0) +
        (announcementsResult.count || 0) + (connectionsResult.count || 0) + (perksResult.count || 0);

      const netCount = Math.max(0, rawTotal - dismissedSet.size);
      setNotificationCount(netCount);
      cachedNotifCount = netCount;
      lastNotifFetchTime = now;
    } catch (err) {
      console.warn("[HomeScreen] Notification count check skipped:", err?.message || err);
    }
  }, [currentUserProfile]);

  // ==============================================
  // CHECKPOINT LOGIC
  // ==============================================
  const checkAndShowCheckpoint = async (userId, shouldOpen = true) => {
    try {
      const status = await checkCheckpointStatus(userId);
      
      // We now store the data and completion status so we can open the modal anytime
      setCheckpointData(status.existingData);
      setIsCheckpointCompleted(status.isCompleted);
      setCheckpointHasShsRecord(status.hasShsRecord);
      if (status.alumniType) {
        setCheckpointType(status.alumniType);
      }

      if (shouldOpen && status.shouldShow && status.alumniType) {
        setIsCheckpointVisible(true);
      }
    } catch (err) {
      console.warn("Checkpoint check failed:", err);
    }
  };

  const checkpointNeedsAttention = Boolean(checkpointType && !isCheckpointCompleted);

  useEffect(() => {
    if (!checkpointNeedsAttention) {
      checkpointPulse.stopAnimation();
      checkpointPulse.setValue(0);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(checkpointPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(checkpointPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [checkpointNeedsAttention, checkpointPulse]);

  // ==============================================
  // USER PROFILE LOADER
  // ==============================================
  const fetchUserData = useCallback(async () => {
    const now = Date.now();
    if (cachedUserData && (now - lastUserFetchTime < 5 * 60 * 1000)) {
      setUserData(cachedUserData);
      checkAndShowCheckpoint(cachedUserData.id); // <-- Added
      return;
    }

    try {
      const alumniData = await getCurrentUser();
      if (alumniData) {
        setUserData(alumniData);
        cachedUserData = alumniData;
        lastUserFetchTime = now;
        checkAndShowCheckpoint(alumniData.id); // <-- Added
      }
    } catch (error) {
      console.warn("[HomeScreen] User load error:", error?.message || error);
    }
  }, []);

  // ==============================================
  // FEATURED EVENTS LOADER
  // ==============================================
  const fetchFeaturedEvents = useCallback(async () => {
    const now = Date.now();
    if (cachedEventsData.length > 0 && (now - lastEventFetchTime < 2 * 60 * 1000)) {
      setFeaturedEvents(cachedEventsData);
      return;
    }

    try {
      setIsLoadingFeaturedEvents(true);
      const events = await getAllEvents(5, 0);
      const filtered = Array.isArray(events) ? events.slice(0, 5) : [];
      setFeaturedEvents(filtered);
      cachedEventsData = filtered;
      lastEventFetchTime = now;
    } catch (err) {
      console.warn("[HomeScreen] Events load error:", err?.message || err);
    } finally {
      setIsLoadingFeaturedEvents(false);
    }
  }, []);

  // ==============================================
  // PULL-TO-REFRESH
  // ==============================================
  const refreshHomeContent = useCallback(async () => {
    setIsRefreshingHome(true);
    lastUserFetchTime = 0;
    lastEventFetchTime = 0;
    lastNotifFetchTime = 0;

    await Promise.allSettled([fetchUserData(), fetchFeaturedEvents(), fetchNotifications()]);
    setIsRefreshingHome(false);
  }, [fetchUserData, fetchFeaturedEvents, fetchNotifications]);

  // ==============================================
  // STAGGERED FOCUS HOOK
  // ==============================================
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      fetchUserData();
      const timer = setTimeout(() => {
        if (!isMounted) return;
        fetchFeaturedEvents();
        fetchNotifications();
      }, 400);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }, [fetchUserData, fetchFeaturedEvents, fetchNotifications])
  );

  // ==============================================
  // PUSH NOTIFICATION SETUP
  // ==============================================
  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) saveTokenToSupabase(token);
    });
  }, []);

  // ==============================================
  // ROCKET ANIMATION
  // ==============================================
  useEffect(() => {
    const rocketAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(rocketFloatAnim, {
          toValue: -12,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rocketFloatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    rocketAnim.start();
    return () => rocketAnim.stop();
  }, [rocketFloatAnim]);

  // ==============================================
  // NAVIGATION HANDLERS
  // ==============================================
  const openNotifications = () => navigation.navigate("NotificationsScreen");
  const openTracerScreen = () => navigation.navigate("Explore", { screen: "TracerMenu" });

  const closeMenu = () => {
    Animated.timing(menuTranslateX, {
      toValue: -layout.menuWidth,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setIsMenuVisible(false));
  };

  const openMenu = () => {
    setIsMenuVisible(true);
    Animated.timing(menuTranslateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const signOut = async () => {
    closeMenu();
    try {
      await signOutUser();
    } catch {
      Alert.alert("Sign Out Failed", "Check your connection and try again.");
      return;
    }
    const parent = navigation.getParent?.();
    const root = parent?.getParent?.() ?? parent;
    const dispatcher = root?.dispatch ?? navigation.dispatch;
    dispatcher(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
  };

  const toggleIdCard = () => {
    const nextVal = isIdFlipped ? 0 : 1;
    Animated.spring(flipAnimation, {
      toValue: nextVal,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start(() => setIsIdFlipped(!isIdFlipped));
  };

  const frontRotateY = flipAnimation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotateY = flipAnimation.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const frontOpacity = flipAnimation.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = flipAnimation.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });

  const activeUserData = currentUserProfile ?? userData;
  const graduationYear = userData?.year_graduated ? String(userData.year_graduated).slice(0, 4) : "N/A";

  const headerAvatarUri = useMemo(() => {
    const name = `${activeUserData?.first_name ?? ""} ${activeUserData?.last_name ?? ""}`.trim() || "Alumni";
    return getImageUrl(getAvatarUri(name, activeUserData?.alumni_photo));
  }, [activeUserData]);

  const idPhotoUri = useMemo(() => {
    const name = `${userData?.first_name ?? ""} ${userData?.last_name ?? ""}`.trim() || "Alumni";
    return getImageUrl(getAvatarUri(name, userData?.card_photo));
  }, [userData]);

  const serviceItems = useMemo(() => [
    // REMOVED THE TEST TRACER BUTTON HERE
    { key: "events", label: "Events", icon: require("../../assets/images/view-events-icon.png"), onPress: () => navigation.navigate("Home", { screen: "EventsScreen" }) },
    { key: "perks", label: "Perks", icon: require("../../assets/images/view-perks-icon-in-blue-1.png"), onPress: () => navigation.navigate("Explore", { screen: "Perks" }) },
    { key: "mentorship", label: "Mentorship", icon: require("../../assets/images/Mentorship_Icon.png"), onPress: () => navigation.navigate("MentorshipScreen") },
    { key: "yearbook", label: "Yearbook", icon: require("../../assets/images/view-yearbook-icon.png"), onPress: () => navigation.navigate("ViewYearbook") },
    { key: "website", label: "NU Website", icon: require("../../assets/images/nulogo.png"), onPress: () => Linking.openURL("https://www.nu.edu.ph/") },
    { key: "nuquest", label: "NUQuest", icon: require("../../assets/images/NUQuest_Logo.png"), onPress: () => Linking.openURL("https://onlineapp.nu-lipa.edu.ph/quest/home.php") },
  ], [navigation]);

  const menuItems = useMemo(() => [
    { key: "account-settings", title: "Account Settings", subtitle: "Manage Your Information", icon: "person-outline", onPress: () => { closeMenu(); navigation.navigate("AccountSettings"); } },
    { key: "connections", title: "My Connections", subtitle: "View Your Connections", icon: "people-outline", onPress: () => { closeMenu(); navigation.navigate("ConnectionsScreen"); } },
    { key: "registrations", title: "My Registrations", subtitle: "View Your Event Registrations", icon: "reader-outline", onPress: () => { closeMenu(); navigation.navigate("RegisteredEventsScreen"); } },
    { key: "masters", title: "Get your Master's Degree", subtitle: "Continue studying your chosen field", icon: "book-outline", onPress: () => { closeMenu(); Linking.openURL("https://onlineapp.nu-lipa.edu.ph/portal/services.php"); } },
    { key: "explore", title: "Explore the App", subtitle: "Take a Tour of the App!", icon: "search-outline", onPress: () => { closeMenu(); navigation.navigate("Explore"); } },
  ], [navigation]);

  return (
    <View style={styles.safeAreaTop}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <HomeHeader />
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mainScrollContent}
          removeClippedSubviews={Platform.OS === "android"}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingHome}
              onRefresh={refreshHomeContent}
              tintColor="#31429B"
              colors={["#31429B"]}
            />
          }
        >
          
                    <View style={styles.homeContentShell}>
            <View style={styles.greetingRow}>
              <View style={styles.profileInfo}>
                <TouchableOpacity style={styles.avatarRingTouchable} activeOpacity={0.85} onPress={openMenu}>
                  {headerAvatarUri ? (
                    <Image source={{ uri: headerAvatarUri }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                  ) : (
                    <Image source={require("../../assets/icons/luminus_load_img.jpg")} style={styles.avatar} contentFit="cover" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={openMenu} style={styles.profileTextWrap}>
                  <Text style={styles.greetingIntro}>Good Day!</Text>
                  <Text style={styles.greetingName} numberOfLines={1}>
                    {activeUserData ? `${activeUserData.first_name}` : "Alumni"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* RIGHT SIDE ACTIONS (Checkpoint + Bell) */}
              <View style={styles.headerRightActions}>
                {/* NEW CHECKPOINT BUTTON */}
                <Animated.View
                  style={checkpointNeedsAttention && {
                    transform: [{
                      scale: checkpointPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.08],
                      }),
                    }],
                  }}
                >
                <TouchableOpacity 
                  style={styles.headerActionIcon} 
                  onPress={() => {
                    setCheckpointType(activeUserData?.alumni_type || 'college'); 
                    setIsCheckpointVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={checkpointNeedsAttention ? "clipboard" : "clipboard-outline"}
                    size={24}
                    color={checkpointNeedsAttention ? "#F59E0B" : "#31429B"}
                  />
                  {checkpointNeedsAttention && (
                    <Animated.View
                      style={[
                        styles.checkpointDot,
                        {
                          transform: [{
                            scale: checkpointPulse.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.35],
                            }),
                          }],
                        },
                      ]}
                    />
                  )}
                </TouchableOpacity>
                </Animated.View>

                {/* EXISTING BELL ICON */}
                <TouchableOpacity style={styles.bellIcon} onPress={openNotifications} activeOpacity={0.85}>
                  <View style={styles.bellIconInner}>
                    <Ionicons name="notifications-outline" size={26} color="#31429B" />
                    {notificationCount > 0 && (
                      <View style={styles.notificationBadge}>
                        <Text style={styles.notificationBadgeText}>
                          {notificationCount > 99 ? "99+" : notificationCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* ID Section */}
            <View style={styles.idSection}>
              <Pressable onPress={toggleIdCard}>
                <View style={styles.idCardPerspective}>
                  <Animated.View
                    style={[
                      styles.idCardFace,
                      styles.idCardFrontFace,
                      { opacity: frontOpacity, transform: [{ perspective: 1000 }, { rotateY: frontRotateY }] },
                    ]}
                  >
                    <ImageBackground
                      source={require("../../assets/images/blankid_front_1.png")}
                      style={styles.idBackground}
                      imageStyle={styles.idBackgroundImage}
                      resizeMode="contain"
                    >
                      {idPhotoUri ? (
                        <Image source={{ uri: idPhotoUri }} style={styles.idPhoto} contentFit="cover" cachePolicy="memory-disk" />
                      ) : (
                        <Image source={require("../../assets/icons/luminus_load_img.jpg")} style={styles.idPhoto} contentFit="cover" />
                      )}

                      <View style={styles.idCardContent}>
                        <Text style={styles.idName}>
                          {userData ? `${userData.first_name}\n${userData.last_name}`.toUpperCase() : " "}
                        </Text>
                        <Text style={styles.idCourse}>{userData?.program ? userData.program.toUpperCase() : " "}</Text>
                        <Text style={styles.idClass}>Class of {graduationYear}</Text>
                      </View>
                    </ImageBackground>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.idCardFace,
                      styles.idCardBackFace,
                      { opacity: backOpacity, transform: [{ perspective: 1000 }, { rotateY: backRotateY }] },
                    ]}
                  >
                    <RNImage source={require("../../assets/images/blankid_back_1.png")} style={styles.idBackImage} resizeMode="contain" />
                  </Animated.View>
                </View>
              </Pressable>

              <View style={styles.accountIdRow}>
                <Text style={styles.accountIdLabel}>Account ID: </Text>
                <Text style={styles.accountIdValue}>{userData?.student_id_number ?? userData?.student_id ?? "N/A"}</Text>
              </View>
            </View>

            {/* Services Grid */}
            <View style={styles.servicesSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Services</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Explore")} activeOpacity={0.8} style={styles.sectionHeaderAction}>
                  <Text style={styles.sectionHeaderActionText}>View All</Text>
                  <Ionicons name="arrow-forward" size={17} color="#31429B" />
                </TouchableOpacity>
              </View>

              <View style={styles.servicesGrid}>
                {serviceItems.map((item) => (
                  <TouchableOpacity key={item.key} style={styles.serviceTile} activeOpacity={0.86} onPress={item.onPress}>
                    <View style={styles.serviceIconCircle}>
                      <RNImage source={item.icon} style={{ width: 44, height: 44 }} resizeMode="contain" />
                    </View>
                    <Text style={styles.serviceLabel} numberOfLines={2}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Background Curve */}
          <View style={styles.curveContainer}>
            <View style={[styles.curveShape, { width: curveSize, height: curveSize, borderRadius: curveSize / 2 }]} />
          </View>

          {/* News & Events Section */}
          <View style={styles.newsSection}>
            <Text style={styles.newsTitle}>WHAT'S <Text style={styles.newsTitleEmphasis}>NEW?</Text></Text>

            {/* 櫨 FAST CAROUSEL: Converted to Virtualized FlatList using expo-image */}
            {isLoadingFeaturedEvents ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScrollContent}>
                <View style={[styles.promoLoadingCard, { width: layout.promoCardWidth, height: layout.promoCardHeight }]}>
                  <ActivityIndicator size="small" color="#F2C919" />
                  <Text style={styles.promoLoadingText}>Loading events...</Text>
                </View>
              </ScrollView>
            ) : featuredEvents.length > 0 ? (
              <FlatList
                horizontal
                data={featuredEvents}
                keyExtractor={(event) => `featured-event-${event?.id ?? event?.title}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredScrollContent}
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                windowSize={3}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={({ item: event }) => {
                  const imageUrl = event?.cover_image_url ? getImageUrl(event.cover_image_url) : null;
                  return (
                    <Pressable
                      style={({ pressed }) => [
                        styles.featuredEventCard,
                        { width: layout.promoCardWidth },
                        pressed && styles.featuredEventCardPressed,
                      ]}
                      onPress={() => {
                        const parent = navigation.getParent?.() ?? navigation;
                        parent.navigate("ViewEventsScreen", { event });
                      }}
                    >
                      {imageUrl ? (
                        <Image 
                          source={{ uri: imageUrl }} 
                          style={styles.featuredEventImage} 
                          contentFit="cover" 
                          cachePolicy="memory-disk" 
                          transition={200} 
                        />
                      ) : (
                        <Image source={require("../../assets/icons/luminus_load_img.jpg")} style={styles.featuredEventImage} contentFit="cover" />
                      )}
                    </Pressable>
                  );
                }}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScrollContent}>
                <View style={[styles.promoEmptyCard, { width: layout.promoCardWidth, height: layout.promoCardHeight }]}>
                  <Text style={styles.promoEyebrow}>NO EVENTS YET</Text>
                  <Text style={styles.promoTitleMain}>Check back soon for the latest posted events.</Text>
                </View>
              </ScrollView>
            )}

            {/* Galaxy Section */}
            <View style={styles.explorerSection}>
              <LinearGradient colors={["#32418C", "#1A237E", "#05071A"]} locations={[0, 0.4, 1]} style={styles.galaxyGradient}>
                <StarField />

                <View style={styles.galaxyImagesContainer}>
                  <RNImage source={require("../../assets/images/AlumniExp_img.png")} style={styles.alumniExpImage} resizeMode="contain" />
                  <Animated.Image
                    source={require("../../assets/images/rocket_img.png")}
                    style={[styles.rocketImage, { transform: [{ translateY: rocketFloatAnim }] }]}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.feedbackSectionGalaxy}>
                  <Text style={styles.feedbackTitleGalaxy}>Why Your Feedback Matters?</Text>

                  <View style={styles.feedbackItemGalaxy}>
                    <Text style={styles.feedbackEmoji}>💡</Text>
                    <Text style={styles.feedbackTextGalaxy}>
                      <Text style={styles.feedbackTextBoldGalaxy}>Help future Bulldogs: </Text>
                      Your feedback shapes NU LIPA's programs and curriculum
                    </Text>
                  </View>

                  <View style={styles.feedbackItemGalaxy}>
                    <Text style={styles.feedbackEmoji}>💼</Text>
                    <Text style={styles.feedbackTextGalaxy}>
                      <Text style={styles.feedbackTextBoldGalaxy}>Unlock opportunities: </Text>
                      Get priority access to the Alumni Job Board & career events
                    </Text>
                  </View>

                  <View style={styles.feedbackItemGalaxy}>
                    <Text style={styles.feedbackEmoji}>🤝</Text>
                    <Text style={styles.feedbackTextGalaxy}>
                      <Text style={styles.feedbackTextBoldGalaxy}>Stay connected: </Text>
                      Help us build a stronger alumni network for referrals & mentorships
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.exploreButtonGalaxy} activeOpacity={0.9} onPress={openTracerScreen}>
                  <Text style={styles.exploreButtonTextGalaxy}>Launch Tracer</Text>
                  <Ionicons name="rocket" size={20} color="#1A237E" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </ScrollView>

        {/* Side Menu Drawer */}
        <Modal transparent visible={isMenuVisible} animationType="none" onRequestClose={closeMenu}>
          <View style={styles.sideMenuRoot}>
            <Pressable style={styles.sideMenuOverlay} onPress={closeMenu} />
            <Animated.View style={[styles.sideMenuContainer, { width: layout.menuWidth, transform: [{ translateX: menuTranslateX }] }]}>
              <View style={styles.sideMenuHeader}>
                <Text style={styles.sideMenuTitle}>Menu</Text>
                <TouchableOpacity onPress={closeMenu}><Ionicons name="close" size={32} color="#F2C919" /></TouchableOpacity>
              </View>
              <View style={styles.sideMenuAccent} />
              <View style={styles.sideMenuBody}>
                {menuItems.map((item) => (
                  <TouchableOpacity key={item.key} style={styles.menuItem} activeOpacity={0.8} onPress={item.onPress}>
                    <View style={styles.menuIconCircle}><Ionicons name={item.icon} size={22} color="#FFFFFF" /></View>
                    <View style={styles.menuTextWrap}>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      <Text style={styles.menuItemSub}>{item.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.sideMenuFooter}>
                <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                  <Text style={styles.signOutButtonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>

      {checkpointType && (
        <CheckpointModal
          key={`checkpoint-${isCheckpointVisible}`} // <-- ADD THIS LINE
          visible={isCheckpointVisible}
          onClose={async () => {
            setIsCheckpointVisible(false);
            await checkAndShowCheckpoint(activeUserData?.id, false);
          }}
          userId={activeUserData?.id}
          alumniType={checkpointType}
          userData={activeUserData} 
          existingData={checkpointData}   
          isCompleted={isCheckpointCompleted}
          hasShsRecord={checkpointHasShsRecord} 
        />
      )}

    </View>
  );
};

export default HomeScreen;