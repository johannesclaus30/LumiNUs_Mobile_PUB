import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
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
import { WebView } from "react-native-webview";
import TopHeaderDark from "../components/TopHeaderDark";
import api from "../services/api";
import styles, { COLORS, SPACING, RADIUS } from "../styles/ViewEventsScreen.styles";
import { ThemedAlert } from "../components/ThemedAlert";

const EVENT_PLACEHOLDER_IMAGE = require("../../assets/images/luminus_cap_icon.png");

// =============================================================
// HELPERS
// =============================================================
const formatDateRange = (startDate, endDate) => {
  if (!startDate) return "Date to be announced";
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  if (Number.isNaN(start.getTime())) return "Date to be announced";

  const startLabel = start.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (!end || Number.isNaN(end.getTime()) || end.getTime() === start.getTime()) {
    return startLabel;
  }

  const endLabel = end.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
};

/** Tiny animated press-scale wrapper */
const PressableScale = ({ children, onPress, style, disabled }) => {
  const scale = React.useRef(new Animated.Value(1)).current;
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
const ViewEventsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const routeEvent = route?.params?.event ?? null;

  const [resolvedEvent, setResolvedEvent] = React.useState(routeEvent);
  const [registrations, setRegistrations] = React.useState([]);
  const [registrationsLoading, setRegistrationsLoading] = React.useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = React.useState(null);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = React.useState(0);
  const [galleryScale, setGalleryScale] = React.useState(1);
  const [galleryTranslate, setGalleryTranslate] = React.useState({ x: 0, y: 0 });

  const [mapLoadFailed, setMapLoadFailed] = React.useState(false);

  const pinchStartDistanceRef = React.useRef(0);
  const pinchStartScaleRef = React.useRef(1);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const galleryViewerScrollRef = React.useRef(null);

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Home", { screen: "EventsScreen" });
  };

  const event = resolvedEvent ?? routeEvent;
  const eventTitle = String(event?.title ?? "Event Details");
  const eventDescription = String(event?.description ?? "");
  const dateRange = formatDateRange(event?.start_date, event?.end_date);

  const platform = String(event?.platform ?? "Not set");
  const platformUrl = String(event?.platform_url ?? "").trim();
  const rawEventType = String(
    event?.event_type ??
      event?.eventType ??
      event?.type ??
      event?.event_category ??
      "",
  ).trim();

  const venueName = String(event?.venue?.name ?? "Venue not set");
  const venueAddress = event?.venue?.address ?? null;

  const payloadVenueLatitude = Number.parseFloat(
    event?.venue?.latitude ??
      event?.venue?.lat ??
      event?.venue_latitude ??
      event?.latitude ??
      event?.lat,
  );
  const payloadVenueLongitude = Number.parseFloat(
    event?.venue?.longitude ??
      event?.venue?.lng ??
      event?.venue_longitude ??
      event?.longitude ??
      event?.lng,
  );
  const hasPayloadVenueCoordinates =
    Number.isFinite(payloadVenueLatitude) &&
    Number.isFinite(payloadVenueLongitude);

  const venueSearchQuery = [venueName, venueAddress]
    .filter(
      (value) =>
        value &&
        !String(value).toLowerCase().includes("not available") &&
        !String(value).toLowerCase().includes("not set"),
    )
    .join(" ")
    .trim();

  const mapQuery = hasPayloadVenueCoordinates
    ? `${payloadVenueLatitude},${payloadVenueLongitude}`
    : venueSearchQuery;

  const hasVirtualElement = Boolean(platformUrl) || platform !== "Not set";
  const hasPhysicalElement = Boolean(mapQuery);

  const inferredEventType = rawEventType
    ? rawEventType
    : hasVirtualElement && hasPhysicalElement
      ? "hybrid"
      : hasVirtualElement
        ? "online"
        : hasPhysicalElement
          ? "in person"
          : "";

  const normalizedEventType = String(inferredEventType)
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();

  const isHybridEvent =
    normalizedEventType === "hybrid" ||
    (hasVirtualElement && hasPhysicalElement);
  const isOnlineEvent =
    ["online", "virtual"].includes(normalizedEventType) ||
    isHybridEvent ||
    hasVirtualElement;
  const isInPersonEvent =
    ["in person", "inperson", "physical", "onsite", "on site"].includes(
      normalizedEventType,
    ) ||
    isHybridEvent ||
    hasPhysicalElement;

  const eventImageUris = Array.isArray(event?.images)
    ? event.images
        .map(
          (image) =>
            image?.image_url ?? image?.image_path ?? image?.url ?? image?.path,
        )
        .filter(Boolean)
    : [];
  const eventImageUri =
    eventImageUris[0] ?? event?.cover_image_url ?? null;
  const galleryImageUris = eventImageUris.slice(1, 5);
  const viewerImageUris = eventImageUri
    ? [eventImageUri, ...galleryImageUris]
    : [];
  const galleryViewportWidth = Dimensions.get("window").width;

  const venueMapEmbedUri = mapQuery
    ? `<!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <style>
              html, body { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f1f5f9; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe
              src="https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed"
              allowfullscreen>
            </iframe>
          </body>
        </html>`
    : null;

  const venueExternalMapUri = mapQuery
    ? `https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`
    : null;

  const currentRegistration = registrations.find(
    (registration) => Number(registration?.event_id) === Number(event?.id),
  );
  const isAlreadyRegistered = Boolean(currentRegistration);
  const isRegistrationConfirmed =
    currentRegistration?.registration_confirmation === true ||
    currentRegistration?.registration_confirmation === 1 ||
    currentRegistration?.registration_confirmation === "true" ||
    currentRegistration?.registration_confirmation === "1";

  const isEventOver = useMemo(() => {
    if (!event?.start_date) return false;
    const now = new Date();
    const compareDate = new Date(event.end_date || event.start_date);
    compareDate.setHours(23, 59, 59, 999);
    return compareDate < now;
  }, [event?.start_date, event?.end_date]);

  // FULL EVENT LOGIC
  const isEventFull = useMemo(() => {
    const max = Number(event?.capacity ?? event?.max_slots ?? event?.max_attendees ?? event?.max_participants ?? event?.slots);
    if (!max || isNaN(max) || max <= 0) return false;
    const current = Number(event?.registered_count ?? event?.registrations_count ?? event?.attendees_count ?? event?.current_attendees ?? 0);
    return current >= max;
  }, [event]);

  const canRegister =
    !registrationsLoading && !isAlreadyRegistered && !isEventOver && !isEventFull;
  const canRemoveRegistration =
    !registrationsLoading &&
    isAlreadyRegistered &&
    !isRegistrationConfirmed &&
    !isEventOver;

  // ---- lifecycle ----
  React.useEffect(() => {
    setResolvedEvent(routeEvent);
  }, [routeEvent]);

  React.useEffect(() => {
    setMapLoadFailed(false);
  }, [mapQuery]);

  React.useEffect(() => {
    let isMounted = true;
    const hydrateEventDetails = async () => {
      if (!routeEvent?.id) return;
      try {
        const response = await api.get(`/events/${routeEvent.id}`);
        const hydratedEvent = response.data?.event ?? null;
        if (!hydratedEvent || !isMounted) return;
        setResolvedEvent((currentEvent) => ({
          ...(currentEvent ?? {}),
          ...hydratedEvent,
          venue: {
            ...(currentEvent?.venue ?? {}),
            ...(hydratedEvent?.venue ?? {}),
          },
          images:
            Array.isArray(hydratedEvent?.images) &&
            hydratedEvent.images.length > 0
              ? hydratedEvent.images
              : currentEvent?.images,
          cover_image_url:
            hydratedEvent?.cover_image_url ??
            currentEvent?.cover_image_url ??
            null,
        }));
      } catch (error) {
        console.error("Failed to hydrate event details:", error);
      }
    };
    hydrateEventDetails();
    return () => {
      isMounted = false;
    };
  }, [routeEvent]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchRegistrations = async () => {
      if (!event?.id) return;
      try {
        setRegistrationsLoading(true);
        const response = await api.get("/event-registrations");
        const userRegistrations = response.data?.registrations ?? [];
        if (isMounted) setRegistrations(userRegistrations);
      } catch (error) {
        console.error("Failed to load event registrations:", error);
      } finally {
        if (isMounted) setRegistrationsLoading(false);
      }
    };
    fetchRegistrations();
    return () => {
      isMounted = false;
    };
  }, [event?.id]);

  const refreshRegistrationState = async () => {
    if (!event?.id) return;
    try {
      setRegistrationsLoading(true);
      const response = await api.get("/event-registrations");
      setRegistrations(response.data?.registrations ?? []);
    } catch (error) {
      console.error("Failed to refresh event registrations:", error);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const handlePlatformPress = async () => {
    if (!platformUrl) return;
    try {
      const canOpen = await Linking.canOpenURL(platformUrl);
      if (canOpen) await Linking.openURL(platformUrl);
    } catch (error) {
      console.error("Failed to open platform URL:", error);
    }
  };

  const handleVenueMapPress = async () => {
    if (!venueExternalMapUri) return;
    try {
      const canOpen = await Linking.canOpenURL(venueExternalMapUri);
      if (canOpen) await Linking.openURL(venueExternalMapUri);
    } catch (error) {
      console.error("Failed to open map URL:", error);
    }
  };

  const handleRegisterPress = () => {
    if (!canRegister) return;
    navigation.navigate("EventRegistrationScreen", { event });
  };

  const handleRemoveRegistrationPress = () => {
    if (!event?.id || isRegistrationConfirmed) {
      if (isRegistrationConfirmed) {
        ThemedAlert.alert(
          "Registration confirmed",
          "This registration has been confirmed and can no longer be removed.",
          [{ text: "OK" }],
        );
      }
      return;
    }
    if (!canRemoveRegistration) return;
    ThemedAlert.alert(
      "Remove registration?",
      "This will delete your registration for this event.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/events/${event.id}/registrations`);
              await refreshRegistrationState();
              navigation.navigate("Home", { screen: "EventsScreen" });
            } catch (error) {
              const message =
                error.response?.data?.message ??
                "Unable to remove your registration right now.";
              ThemedAlert.alert("Removal failed", message, [{ text: "OK" }], {
                variant: "error",
              });
            }
          },
        },
      ],
      { variant: "error" },
    );
  };

  // ---- gallery ----
  const openGalleryImage = (imageIndex) => {
    if (!viewerImageUris[imageIndex]) return;
    setGalleryScale(1);
    setGalleryTranslate({ x: 0, y: 0 });
    setSelectedGalleryIndex(imageIndex);
    setSelectedGalleryImage(viewerImageUris[imageIndex]);
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

  const clampGalleryScale = (val) => Math.max(1, Math.min(4, val));

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

  const galleryPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (gestureState.numberActiveTouches >= 2) return true;
          return (
            galleryScale > 1 &&
            (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2)
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
        onPanResponderMove: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches ?? [];
          if (touches.length >= 2) {
            if (pinchStartDistanceRef.current === 0) {
              pinchStartDistanceRef.current = getTouchDistance(touches);
              pinchStartScaleRef.current = galleryScale;
              return;
            }
            const currentDistance = getTouchDistance(touches);
            const nextScale = clampGalleryScale(
              pinchStartScaleRef.current *
                (currentDistance / pinchStartDistanceRef.current),
            );
            setGalleryScale(nextScale);
            return;
          }
          if (galleryScale > 1) {
            setGalleryTranslate({
              x: dragStartRef.current.x + gestureState.dx,
              y: dragStartRef.current.y + gestureState.dy,
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
    [galleryScale, galleryTranslate],
  );

  // ---- render ----
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
              HERO (navy gradient block)
          ================================================== */}
          <LinearGradient
            colors={[COLORS.navy, COLORS.navyDark, COLORS.navyDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroSection}
          >
            <View style={styles.heroGlow} pointerEvents="none" />

            {/* Back button + type badge row */}
            <View style={styles.heroTopRow}>
              <Pressable
                onPress={handleBackPress}
                hitSlop={10}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>

              <View style={styles.heroBadgeRow}>
                {isHybridEvent ? (
                  <View style={[styles.typeBadge, styles.typeBadgeHybrid]}>
                    <Ionicons
                      name="git-merge-outline"
                      size={11}
                      color="#FFFFFF"
                    />
                    <Text style={styles.typeBadgeText}>HYBRID</Text>
                  </View>
                ) : isInPersonEvent ? (
                  <View style={[styles.typeBadge, styles.typeBadgeInPerson]}>
                    <Ionicons
                      name="location-outline"
                      size={11}
                      color="#FFFFFF"
                    />
                    <Text style={styles.typeBadgeText}>IN-PERSON</Text>
                  </View>
                ) : isOnlineEvent ? (
                  <View style={[styles.typeBadge, styles.typeBadgeOnline]}>
                    <Ionicons
                      name="globe-outline"
                      size={11}
                      color="#FFFFFF"
                    />
                    <Text style={styles.typeBadgeText}>ONLINE</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Title */}
            <Text style={styles.heroEyebrow}>EVENT DETAILS</Text>
            <Text style={styles.heroTitle}>{eventTitle}</Text>

            {/* Hero image with gradient bottom + shadow */}
            <PressableScale
              onPress={() => openGalleryImage(0)}
              disabled={!eventImageUri}
              style={{ width: "100%" }}
            >
              <View style={styles.heroImageShadow}>
                <View style={styles.heroImageClip}>
                  <Image
                    source={
                      eventImageUri
                        ? { uri: eventImageUri }
                        : EVENT_PLACEHOLDER_IMAGE
                    }
                    style={styles.heroImage}
                    resizeMode={eventImageUri ? "cover" : "contain"}
                  />
                  {eventImageUri ? (
                    <LinearGradient
                      colors={[
                        "transparent",
                        "rgba(27,36,80,0.35)",
                        "rgba(27,36,80,0.75)",
                      ]}
                      locations={[0, 0.6, 1]}
                      style={styles.heroImageOverlay}
                    />
                  ) : null}
                  {eventImageUri ? (
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
              DETAILS CARD (about + when & where + map)
          ================================================== */}
          <View style={styles.detailsCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabel}>About this event</Text>
            </View>
            <Text style={styles.descriptionText}>{eventDescription}</Text>

            {/* Date & Location sub-card */}
            <LinearGradient
              colors={[COLORS.navy, COLORS.navyDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dateLocationCard}
            >
              <Text style={styles.dateLocationTitle}>WHEN & WHERE</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={COLORS.gold}
                  />
                </View>
                <Text style={styles.infoText}>{dateRange}</Text>
              </View>

              {isOnlineEvent && platform !== "Not set" ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Ionicons
                      name="globe-outline"
                      size={16}
                      color={COLORS.gold}
                    />
                  </View>
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoText}>{platform}</Text>
                    {platformUrl ? (
                      <Pressable onPress={handlePlatformPress}>
                        <Text
                          style={styles.infoLinkText}
                          numberOfLines={1}
                        >
                          {platformUrl}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {isInPersonEvent && venueName !== "Venue not set" ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={COLORS.gold}
                    />
                  </View>
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoText}>{venueName}</Text>
                    {venueAddress ? (
                      <Text style={styles.infoSubText}>{venueAddress}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </LinearGradient>

            {/* Map — neatly nested in the same card, only for in-person / hybrid */}
            {isInPersonEvent && venueMapEmbedUri && !mapLoadFailed ? (
              <View style={styles.mapSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionAccent} />
                  <Text style={styles.sectionLabel}>Venue map</Text>
                </View>

                <Pressable
                  style={styles.mapContainer}
                  onPress={handleVenueMapPress}
                >
                  <WebView
                    source={{
                      html: venueMapEmbedUri,
                      baseUrl: "https://localhost",
                    }}
                    style={styles.mapWebView}
                    scrollEnabled={false}
                    javaScriptEnabled
                    domStorageEnabled
                    originWhitelist={["*"]}
                    mixedContentMode="always"
                    onError={() => setMapLoadFailed(true)}
                  />
                  <View style={styles.mapOverlayPill}>
                    <Ionicons
                      name="open-outline"
                      size={13}
                      color={COLORS.navy}
                    />
                    <Text style={styles.mapOverlayPillText}>
                      Open in Maps
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : isInPersonEvent ? (
              <View style={styles.mapSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionAccent} />
                  <Text style={styles.sectionLabel}>Venue map</Text>
                </View>
                <View style={styles.mapFallback}>
                  <Ionicons
                    name="map-outline"
                    size={26}
                    color={COLORS.navy}
                  />
                  <Text style={styles.mapFallbackText}>
                    Map information is not available for this venue.
                  </Text>
                  {venueExternalMapUri ? (
                    <Pressable onPress={handleVenueMapPress}>
                      <Text style={styles.mapFallbackLink}>
                        Open in Google Maps
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          {/* ==================================================
              CTA
          ================================================== */}
          <View style={styles.ctaSection}>
            {isEventOver ? (
              <View style={[styles.ctaButton, styles.ctaButtonDisabled]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color="#9CA3AF"
                />
                <Text style={styles.ctaDisabledText}>Event has ended</Text>
              </View>
            ) : isAlreadyRegistered && isRegistrationConfirmed ? (
              <View style={[styles.ctaButton, styles.ctaButtonDisabled]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#9CA3AF"
                />
                <Text style={styles.ctaDisabledText}>
                  Registration Confirmed
                </Text>
              </View>
            ) : isAlreadyRegistered ? (
              <PressableScale
                onPress={handleRemoveRegistrationPress}
                disabled={registrationsLoading}
              >
                <View style={[styles.ctaButton, styles.ctaButtonDanger]}>
                  {registrationsLoading ? (
                    <ActivityIndicator color="#D92D20" />
                  ) : (
                    <>
                      <Ionicons
                        name="close-circle-outline"
                        size={16}
                        color="#D92D20"
                      />
                      <Text style={styles.ctaDangerText}>
                        Remove Registration
                      </Text>
                    </>
                  )}
                </View>
              </PressableScale>
            ) : isEventFull ? (
              <View style={[styles.ctaButton, styles.ctaButtonDisabled]}>
                <Ionicons
                  name="people-circle-outline"
                  size={18}
                  color="#9CA3AF"
                />
                <Text style={styles.ctaDisabledText}>Registration Full</Text>
              </View>
            ) : (
              <PressableScale
                onPress={handleRegisterPress}
                disabled={!canRegister}
              >
                <LinearGradient
                  colors={[COLORS.gold, "#F7C61B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaButton}
                >
                  {registrationsLoading ? (
                    <ActivityIndicator color={COLORS.navy} />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={COLORS.navy}
                      />
                      <Text style={styles.ctaPrimaryText}>
                        Pre-Register Now
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </PressableScale>
            )}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView
        edges={["bottom"]}
        style={{ backgroundColor: COLORS.navy }}
      />

      {/* ==================================================
          GALLERY MODAL
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
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x /
                    event.nativeEvent.layoutMeasurement.width,
                );
                setSelectedGalleryIndex(nextIndex);
                setSelectedGalleryImage(viewerImageUris[nextIndex] ?? null);
                setGalleryScale(1);
                setGalleryTranslate({ x: 0, y: 0 });
              }}
            >
              {viewerImageUris.map((imageUri, index) => (
                <View
                  key={`${imageUri}-${index}`}
                  style={[
                    styles.galleryModalStage,
                    { width: galleryViewportWidth },
                  ]}
                  {...galleryPanResponder.panHandlers}
                >
                  <Animated.Image
                    source={{ uri: imageUri }}
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

export default ViewEventsScreen;