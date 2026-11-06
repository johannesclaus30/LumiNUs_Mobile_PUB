import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import TopHeaderDark from "../components/TopHeaderDark";
import styles, {
  COLORS,
  SPACING,
  RADIUS,
} from "../styles/ViewPerkScreen.styles";

// =============================================================
// HELPERS
// =============================================================
const formatValidUntil = (value) => {
  if (!value) return "No expiry date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
};

const isExpired = (value) => {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d < new Date();
};

const daysUntil = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const getPerkImageUris = (perk) =>
  Array.isArray(perk?.images)
    ? perk.images.map((i) => i?.image_path).filter(Boolean)
    : [];

// =============================================================
// PRESSABLE SCALE
// =============================================================
const PressableScale = ({ children, onPress, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
    }).start();
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

// =============================================================
// SCREEN
// =============================================================
const ViewPerkScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const perk = route?.params?.perk ?? {};

  const imageUris = useMemo(() => getPerkImageUris(perk), [perk]);
  const heroImageUri = imageUris[0] ?? null;
  const galleryImageUris = imageUris.slice(1);
  const viewerImageUris = heroImageUri ? [heroImageUri, ...galleryImageUris] : [];

  const expired = isExpired(perk.valid_until);
  const days = daysUntil(perk.valid_until);
  const expiringSoon = !expired && days !== null && days <= 30;

  // ---- gallery viewer ----
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
  const [galleryScale, setGalleryScale] = useState(1);
  const [galleryTranslate, setGalleryTranslate] = useState({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const galleryViewerScrollRef = useRef(null);
  const galleryViewportWidth = Dimensions.get("window").width;

  const handleBackPress = () => {
    if (navigation.canGoBack()) return navigation.goBack();
    navigation.navigate("Home", { screen: "PerksScreen" });
  };

  const openGalleryImage = (index) => {
    if (!viewerImageUris[index]) return;
    setGalleryScale(1);
    setGalleryTranslate({ x: 0, y: 0 });
    setSelectedGalleryIndex(index);
    setSelectedGalleryImage(viewerImageUris[index]);
  };

  const closeGalleryImage = () => {
    setGalleryScale(1);
    setGalleryTranslate({ x: 0, y: 0 });
    setSelectedGalleryIndex(0);
    setSelectedGalleryImage(null);
  };

  const getTouchDistance = (touches) => {
    if (!touches || touches.length < 2) return 0;
    const dx = touches[1].pageX - touches[0].pageX;
    const dy = touches[1].pageY - touches[0].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const clampGalleryScale = (v) => Math.max(1, Math.min(4, v));

  React.useEffect(() => {
    if (!selectedGalleryImage) return;
    requestAnimationFrame(() => {
      galleryViewerScrollRef.current?.scrollTo({
        x: selectedGalleryIndex * galleryViewportWidth,
        y: 0,
        animated: false,
      });
    });
  }, [selectedGalleryImage, selectedGalleryIndex, galleryViewportWidth]);

  const galleryPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          if (g.numberActiveTouches >= 2) return true;
          return (
            galleryScale > 1 &&
            (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2)
          );
        },
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches ?? [];
          if (touches.length >= 2) {
            pinchStartDistanceRef.current = getTouchDistance(touches);
            pinchStartScaleRef.current = galleryScale;
          }
          dragStartRef.current = { ...galleryTranslate };
        },
        onPanResponderMove: (evt, g) => {
          const touches = evt.nativeEvent.touches ?? [];
          if (touches.length >= 2) {
            if (pinchStartDistanceRef.current === 0) {
              pinchStartDistanceRef.current = getTouchDistance(touches);
              pinchStartScaleRef.current = galleryScale;
              return;
            }
            const currentDistance = getTouchDistance(touches);
            const next = clampGalleryScale(
              pinchStartScaleRef.current *
                (currentDistance / pinchStartDistanceRef.current)
            );
            setGalleryScale(next);
            return;
          }
          if (galleryScale > 1) {
            setGalleryTranslate({
              x: dragStartRef.current.x + g.dx,
              y: dragStartRef.current.y + g.dy,
            });
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {
          if (galleryScale <= 1.02) {
            setGalleryScale(1);
            setGalleryTranslate({ x: 0, y: 0 });
          }
          pinchStartDistanceRef.current = 0;
          pinchStartScaleRef.current = 1;
        },
        onPanResponderTerminate: () => {
          if (galleryScale <= 1.02) {
            setGalleryScale(1);
            setGalleryTranslate({ x: 0, y: 0 });
          }
          pinchStartDistanceRef.current = 0;
          pinchStartScaleRef.current = 1;
        },
      }),
    [galleryScale, galleryTranslate]
  );

  // ---- badge helpers ----
  const statusBadge = expired
    ? { label: "EXPIRED", bg: "rgba(107,114,128,0.9)", icon: "close-circle" }
    : expiringSoon
    ? { label: `${days}D LEFT`, bg: "rgba(217,45,32,0.9)", icon: "time" }
    : { label: "ACTIVE", bg: "rgba(16,185,129,0.9)", icon: "checkmark-circle" };

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopHeaderDark />

        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ==================================================
              HERO
          ================================================== */}
          <LinearGradient
            colors={[COLORS.navy, COLORS.navyDark, COLORS.navyDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroSection}
          >
            <View style={styles.heroGlow} pointerEvents="none" />

            {/* Top row: back + status badge */}
            <View style={styles.heroTopRow}>
              <Pressable
                onPress={handleBackPress}
                hitSlop={10}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>

              <View style={styles.statusBadgeRow}>
                <View
                  style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}
                >
                  <Ionicons name={statusBadge.icon} size={11} color="#FFFFFF" />
                  <Text style={styles.statusBadgeText}>{statusBadge.label}</Text>
                </View>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.heroEyebrow}>PERK DETAILS</Text>
            <Text style={styles.heroTitle} numberOfLines={3}>
              {perk.title || "Untitled perk"}
            </Text>

            {/* Hero image */}
            <PressableScale
              onPress={() => openGalleryImage(0)}
              disabled={!heroImageUri}
              style={{ width: "100%" }}
            >
              <View style={styles.heroImageShadow}>
                <View style={styles.heroImageClip}>
                  {heroImageUri ? (
                    <Image
                      source={{ uri: heroImageUri }}
                      style={styles.heroImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.heroImage, styles.heroPlaceholder]}>
                      <Ionicons
                        name="pricetag-outline"
                        size={44}
                        color="#9CA3AF"
                      />
                      <Text style={styles.heroPlaceholderText}>
                        No image available
                      </Text>
                    </View>
                  )}
                  {heroImageUri ? (
                    <>
                      <LinearGradient
                        colors={[
                          "transparent",
                          "rgba(27,36,80,0.35)",
                          "rgba(27,36,80,0.75)",
                        ]}
                        locations={[0, 0.6, 1]}
                        style={styles.heroImageOverlay}
                      />
                      <View style={styles.heroImageBadge}>
                        <Ionicons
                          name="expand-outline"
                          size={12}
                          color={COLORS.navy}
                        />
                        <Text style={styles.heroImageBadgeText}>
                          Tap to enlarge
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>
              </View>
            </PressableScale>
          </LinearGradient>

          {/* ==================================================
              GALLERY
          ================================================== */}
          {galleryImageUris.length > 0 ? (
            <View style={styles.attachmentsSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionLabel}>Gallery</Text>
                <View style={styles.sectionCountPill}>
                  <Text style={styles.sectionCountPillText}>
                    {galleryImageUris.length}
                  </Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryScroll}
              >
                {galleryImageUris.map((uri, index) => (
                  <PressableScale
                    key={`${uri}-${index}`}
                    onPress={() => openGalleryImage(index + 1)}
                  >
                    <View style={styles.galleryImageWrap}>
                      <Image
                        source={{ uri }}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                    </View>
                  </PressableScale>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* ==================================================
              DETAILS CARD
          ================================================== */}
          <View style={styles.detailsCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabel}>About this perk</Text>
            </View>
            <Text style={styles.descriptionText}>
              {perk.description || "No description available."}
            </Text>

            {/* Validity navy sub-card */}
            <LinearGradient
              colors={[COLORS.navy, COLORS.navyDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.validityCard}
            >
              <Text style={styles.validityTitle}>VALIDITY</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={COLORS.gold}
                  />
                </View>
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoText}>
                    {formatValidUntil(perk.valid_until)}
                  </Text>
                  {days !== null ? (
                    <Text style={styles.infoSubText}>
                      {expired
                        ? `Expired ${Math.abs(days)} day${
                            Math.abs(days) === 1 ? "" : "s"
                          } ago`
                        : days === 0
                        ? "Ends today"
                        : `${days} day${days === 1 ? "" : "s"} remaining`}
                    </Text>
                  ) : null}
                </View>
              </View>

              {expiringSoon ? (
                <View style={styles.urgentRow}>
                  <Ionicons name="alert-circle" size={14} color="#FFD404" />
                  <Text style={styles.urgentText}>
                    Hurry — this perk is expiring soon!
                  </Text>
                </View>
              ) : null}
            </LinearGradient>
          </View>

          {/* ==================================================
              CTA
          ================================================== */}
          <View style={styles.ctaSection}>
            {expired ? (
              <View style={[styles.ctaButton, styles.ctaButtonDisabled]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color="#9CA3AF"
                />
                <Text style={styles.ctaDisabledText}>This perk has expired</Text>
              </View>
            ) : (
              <PressableScale onPress={() => {}}>
                <LinearGradient
                  colors={[COLORS.gold, "#F7C61B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaButton}
                >
                  <Ionicons
                    name="pricetag"
                    size={18}
                    color={COLORS.navy}
                  />
                  <Text style={styles.ctaPrimaryText}>Claim this perk</Text>
                </LinearGradient>
              </PressableScale>
            )}

            <Text style={styles.ctaHint}>
              Show this screen at the partner store to redeem.
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: COLORS.navy }} />

      {/* ==================================================
          FULLSCREEN GALLERY MODAL
      ================================================== */}
      <Modal
        visible={Boolean(selectedGalleryImage)}
        transparent
        animationType="fade"
        onRequestClose={closeGalleryImage}
      >
        <View style={styles.galleryModalBackdrop}>
          <View style={styles.galleryModalContent}>
            <View style={styles.galleryModalTopBar}>
              <View style={styles.galleryCounterPill}>
                <Text style={styles.galleryCounterText}>
                  {selectedGalleryIndex + 1} / {viewerImageUris.length}
                </Text>
              </View>
              <Pressable
                style={styles.galleryModalCloseButton}
                onPress={closeGalleryImage}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView
              ref={galleryViewerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.galleryModalScroll}
              contentContainerStyle={styles.galleryModalScrollContent}
              onMomentumScrollEnd={(e) => {
                const nextIndex = Math.round(
                  e.nativeEvent.contentOffset.x /
                    e.nativeEvent.layoutMeasurement.width
                );
                setSelectedGalleryIndex(nextIndex);
                setSelectedGalleryImage(viewerImageUris[nextIndex] ?? null);
                setGalleryScale(1);
                setGalleryTranslate({ x: 0, y: 0 });
              }}
            >
              {viewerImageUris.map((uri, index) => (
                <View
                  key={`${uri}-${index}`}
                  style={[
                    styles.galleryModalStage,
                    { width: galleryViewportWidth },
                  ]}
                  {...galleryPanResponder.panHandlers}
                >
                  <Animated.Image
                    source={{ uri }}
                    style={[
                      styles.galleryModalImage,
                      {
                        transform: [
                          { translateX: galleryTranslate.x },
                          { translateY: galleryTranslate.y },
                          { scale: galleryScale },
                        ],
                      },
                    ]}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ViewPerkScreen;