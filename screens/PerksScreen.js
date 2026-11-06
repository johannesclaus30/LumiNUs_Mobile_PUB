import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { getPerks } from "../services/perkQueries";
import supabase from "../services/supabase";
import TopHeaderDark from "../components/TopHeaderDark";
import styles, { COLORS, SPACING, RADIUS } from "../styles/PerksScreen.styles";

// =============================================================
// HELPERS
// =============================================================
const formatValidUntil = (value) => {
  if (!value) return "No expiry";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
};

const isExpiringSoon = (value) => {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const in30 = new Date();
  in30.setDate(now.getDate() + 30);
  return d >= now && d <= in30;
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

const getPerkImageUri = (perk) => perk?.images?.[0]?.image_path ?? null;

// =============================================================
// PRESSABLE SCALE
// =============================================================
const PressableScale = ({ children, onPress, style, scaleTo = 0.96 }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 5,
    }).start();

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
};

// =============================================================
// IMAGE WITH FALLBACK
// =============================================================
const SafeImage = ({ uri, style, fallbackIcon = "pricetag-outline" }) => {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[style, styles.imgFallback]}>
        <Ionicons name={fallbackIcon} size={30} color="#FFFFFF" opacity={0.4} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
};

// =============================================================
// FEATURED CAROUSEL (rebuilt — no snapToInterval)
// =============================================================
const FeaturedCarousel = ({ perks, cardWidth, onPressPerk }) => {
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const isUserInteracting = useRef(false);
  const autoPlayTimer = useRef(null);

  // Width including side gap so next card peeks in
  const ITEM_SPACING = 12;
  const itemFullWidth = cardWidth + ITEM_SPACING;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  // Auto-play
  useEffect(() => {
    if (perks.length <= 1) return;

    const start = () => {
      stop();
      autoPlayTimer.current = setInterval(() => {
        if (isUserInteracting.current) return;
        setActiveIndex((prev) => {
          const next = (prev + 1) % perks.length;
          listRef.current?.scrollToOffset({
            offset: next * itemFullWidth,
            animated: true,
          });
          return next;
        });
      }, 4500);
    };

    const stop = () => {
      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
    };

    start();
    return stop;
  }, [perks.length, itemFullWidth]);

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * itemFullWidth,
      index * itemFullWidth,
      (index + 1) * itemFullWidth,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.94, 1, 0.94],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.75, 1, 0.75],
      extrapolate: "clamp",
    });

    const imageUri = getPerkImageUri(item);
    const days = daysUntil(item.valid_until);

    return (
      <Animated.View
        style={{
          width: itemFullWidth,
          paddingRight: ITEM_SPACING,
          transform: [{ scale }],
          opacity,
        }}
      >
        <PressableScale
          style={{ width: "100%" }}
          onPress={() => onPressPerk(item)}
        >
          <View style={styles.featureCard}>
            <SafeImage uri={imageUri} style={styles.featureImage} />

            <LinearGradient
              colors={[
                "transparent",
                "rgba(27, 36, 80, 0.35)",
                "rgba(27, 36, 80, 0.7)",
              ]}
              locations={[0, 0.6, 1]}
              style={styles.gridCardImageGradient}
              pointerEvents="none"
            />

            {/* Bottom gradient — matches EventsScreen: only the bottom 70%, 
                transparent at top → dark navy at bottom for title/meta text */}
            <LinearGradient
              colors={[
                "transparent",
                "rgba(27, 36, 80, 0.55)",
                "rgba(27, 36, 80, 0.97)",
              ]}
              locations={[0, 0.55, 1]}
              style={styles.featureOverlay}
              pointerEvents="none"
            />

            {/* Top row — FEATURED tag + days badge */}
            <View style={styles.featureTopRow}>
              <View style={styles.featureTag}>
                <Ionicons name="star" size={10} color={COLORS.navy} />
                <Text style={styles.featureTagText}>FEATURED</Text>
              </View>
              {days !== null && days >= 0 ? (
                <View style={styles.featureDaysBadge}>
                  <Text style={styles.featureDaysText}>
                    {days === 0 ? "Ends today" : `${days}d left`}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Bottom content */}
            <View style={styles.featureBottom}>
              <Text numberOfLines={2} style={styles.featureTitle}>
                {item.title}
              </Text>
              {item.description ? (
                <Text numberOfLines={1} style={styles.featureDesc}>
                  {item.description}
                </Text>
              ) : null}

              <View style={styles.featureMetaRow}>
                <View style={styles.featureMetaItem}>
                  <Ionicons name="calendar-outline" size={12} color="#E5E7EB" />
                  <Text style={styles.featureMetaText}>
                    {formatValidUntil(item.valid_until)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </PressableScale>
      </Animated.View>
    );
  };

  return (
    <View style={{ marginTop: 20 }}>
      <Animated.FlatList
        ref={listRef}
        data={perks}
        keyExtractor={(item) => `feat-${item.id}`}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={itemFullWidth}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: SPACING.screen }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onScrollBeginDrag={() => {
          isUserInteracting.current = true;
        }}
        onScrollEndDrag={() => {
          setTimeout(() => {
            isUserInteracting.current = false;
          }, 800);
        }}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={(_, index) => ({
          length: itemFullWidth,
          offset: itemFullWidth * index,
          index,
        })}
      />

      {/* Progress bar */}
      {perks.length > 1 ? (
        <View style={styles.progressRow}>
          {perks.map((p, i) => (
            <Pressable
              key={`bar-${p.id}`}
              onPress={() => {
                listRef.current?.scrollToOffset({
                  offset: i * itemFullWidth,
                  animated: true,
                });
                setActiveIndex(i);
              }}
              style={{ flex: 1 }}
            >
              <Animated.View
                style={[
                  styles.progressBar,
                  i === activeIndex && styles.progressBarActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

// =============================================================
// FILTER PILL (circle icon + label)
// =============================================================
const FilterPill = ({ icon, label, active, onPress }) => (
  <Pressable onPress={onPress} style={styles.filterPillWrap}>
    <View style={[styles.filterIconCircle, active && styles.filterIconActive]}>
      <Ionicons
        name={icon}
        size={18}
        color={active ? COLORS.navy : "#FFFFFF"}
      />
    </View>
    <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
      {label}
    </Text>
  </Pressable>
);

// =============================================================
// PERK CARD (grid)
// =============================================================
const PerkCard = ({ perk, width, onPress }) => {
  const imageUri = getPerkImageUri(perk);
  const expired = isExpired(perk.valid_until);
  const expiring = isExpiringSoon(perk.valid_until) && !expired;
  const days = daysUntil(perk.valid_until);

  return (
    <PressableScale style={{ width, marginBottom: 14 }} onPress={onPress}>
      <View style={[styles.gridCard, expired && { opacity: 0.68 }]}>
        <View style={styles.gridCardImageWrap}>
          <SafeImage uri={imageUri} style={styles.gridCardImage} />

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)"]}
            style={styles.gridCardImageGradient}
            pointerEvents="none"
          />

          {/* Top-right badge */}
          {expired ? (
            <View style={[styles.gridBadge, styles.gridBadgeExpired]}>
              <Text style={styles.gridBadgeTextLight}>EXPIRED</Text>
            </View>
          ) : expiring ? (
            <View style={[styles.gridBadge, styles.gridBadgeSoon]}>
              <Ionicons name="time" size={9} color={COLORS.navy} />
              <Text style={styles.gridBadgeTextDark}>
                {days != null && days <= 7 ? `${days}D` : "SOON"}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.gridCardBody}>
          <Text numberOfLines={2} style={styles.gridCardTitle}>
            {perk.title}
          </Text>
          <Text numberOfLines={2} style={styles.gridCardDesc}>
            {perk.description || "Tap to see details."}
          </Text>

          <View style={styles.gridCardFooter}>
            <Ionicons
              name="calendar-outline"
              size={11}
              color={COLORS.navySoft}
            />
            <Text numberOfLines={1} style={styles.gridCardFooterText}>
              {perk.valid_until ? formatValidUntil(perk.valid_until) : "No expiry"}
            </Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

// =============================================================
// MAIN SCREEN
// =============================================================
const PerksScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Grid layout
  const gridColumns = isTablet ? 3 : 2;
  const GRID_GAP = 14;
  const gridCardWidth = useMemo(() => {
    const totalGaps = GRID_GAP * (gridColumns - 1);
    const available = width - SPACING.screen * 2 - totalGaps;
    return Math.floor(available / gridColumns);
  }, [width, gridColumns]);

  // Featured card width (peek next card)
  const FEATURED_PEEK = 20;
  const featuredCardWidth = isTablet
    ? Math.min(width * 0.6, 520)
    : width - SPACING.screen * 2 - FEATURED_PEEK;

  // State
  const [perks, setPerks] = useState([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const seedRef = useRef(Date.now());

  // ------- Fetch -------
  const fetchPerks = useCallback(async () => {
    try {
      setErrorMessage("");
      const data = await getPerks();
      setPerks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load perks:", err);
      setErrorMessage("Unable to load perks right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPerks();
    }, [fetchPerks])
  );

  useEffect(() => {
    // Unique channel name per mount so Strict Mode / quick remounts
    // never reuse a channel that's still in the middle of subscribing.
    const channelName = `public:perks-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "perks" },
        () => {
          fetchPerks();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[PerksScreen] realtime channel error");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPerks]);

  // ------- Filtering -------
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = perks;

    if (normalizedQuery) {
      list = list.filter((p) =>
        [p.title, p.description]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(normalizedQuery))
      );
    }

    if (activeFilter === "active") {
      list = list.filter((p) => !isExpired(p.valid_until));
    } else if (activeFilter === "latest") {
      list = [...list].sort(
        (a, b) =>
          new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)
      );
    } else if (activeFilter === "expiring") {
      list = list.filter(
        (p) => isExpiringSoon(p.valid_until) && !isExpired(p.valid_until)
      );
    }
    return list;
  }, [perks, normalizedQuery, activeFilter]);

  // ------- Featured -------
  const featured = useMemo(() => {
    const active = perks.filter((p) => !isExpired(p.valid_until));
    if (active.length === 0) return [];
    const seed = seedRef.current;
    return [...active]
      .map((perk, i) => {
        const hash =
          (seed + i * 2654435761) ^ (Number(perk.id) || i * 40503);
        return { perk, k: (hash * 9301 + 49297) % 233280 };
      })
      .sort((a, b) => a.k - b.k)
      .slice(0, Math.min(5, active.length))
      .map((x) => x.perk);
  }, [perks]);

  const showFeatured =
    featured.length > 0 && !normalizedQuery && activeFilter === "all";

  // ------- Grid -------
  const gridPerks = useMemo(() => {
    if (!showFeatured) return filtered;
    const featuredIds = new Set(featured.map((p) => p.id));
    return filtered.filter((p) => !featuredIds.has(p.id));
  }, [filtered, featured, showFeatured]);

  const sectionTitle = normalizedQuery
    ? "Search results"
    : activeFilter === "active"
    ? "Active perks"
    : activeFilter === "latest"
    ? "Recently added"
    : activeFilter === "expiring"
    ? "Expiring soon"
    : showFeatured
    ? "More for you"
    : "All perks";

  // ------- Render grid item -------
  const renderGridItem = useCallback(
    ({ item }) => (
      <PerkCard
        perk={item}
        width={gridCardWidth}
        onPress={() => navigation.navigate("ViewPerkScreen", { perk: item })}
      />
    ),
    [gridCardWidth, navigation]
  );

  // ------- Header -------
  const renderHeader = () => (
    <View>
      {/* ============= HERO ============= */}
      <LinearGradient
        colors={[COLORS.navy, COLORS.navyDark, COLORS.navyDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroGlowA} pointerEvents="none" />
        <View style={styles.heroGlowB} pointerEvents="none" />

        {/* Top row */}
        <View style={styles.heroTopRow}>
          <Pressable
            style={styles.heroIconBtn}
            onPress={() => navigation.goBack()}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>

          <View style={styles.heroTopRight}>
            <View style={styles.heroTag}>
              <Ionicons name="sparkles" size={11} color={COLORS.navy} />
              <Text style={styles.heroTagText}>NU ALUMNI</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.heroTitle}>Perks &{"\n"}Discounts</Text>
        <Text style={styles.heroSubtitle}>
          Exclusive deals for NU alumni, curated just for you.
        </Text>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.navySoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search perks, brands, deals…"
            placeholderTextColor={COLORS.placeholder}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons
                name="close-circle"
                size={18}
                color={COLORS.placeholder}
              />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ============= FILTERS ============= */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        <FilterPill
          icon="apps"
          label="All"
          active={activeFilter === "all"}
          onPress={() => setActiveFilter("all")}
        />
        <FilterPill
          icon="checkmark-circle"
          label="Active"
          active={activeFilter === "active"}
          onPress={() => setActiveFilter("active")}
        />
        <FilterPill
          icon="flash"
          label="New"
          active={activeFilter === "latest"}
          onPress={() => setActiveFilter("latest")}
        />
        <FilterPill
          icon="time"
          label="Expiring"
          active={activeFilter === "expiring"}
          onPress={() => setActiveFilter("expiring")}
        />
      </ScrollView>

      {/* ============= FEATURED ============= */}
      {showFeatured ? (
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <View style={styles.sectionBadge}>
              <Ionicons name="star" size={10} color={COLORS.gold} />
              <Text style={styles.sectionBadgeText}>PICKS</Text>
            </View>
          </View>

          <FeaturedCarousel
            perks={featured}
            cardWidth={featuredCardWidth}
            onPressPerk={(perk) =>
              navigation.navigate("ViewPerkScreen", { perk })
            }
          />
        </View>
      ) : null}

      {/* ============= SECTION HEADER ============= */}
      <View style={styles.sectionTitleRow2}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{gridPerks.length}</Text>
        </View>
      </View>
    </View>
  );

  // ------- Screen -------
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />     
      <TopHeaderDark />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.stateCenter}>
            <ActivityIndicator size="large" color={COLORS.navy} />
            <Text style={styles.loadingText}>Loading perks…</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateCenter}>
            <View style={styles.stateIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={32}
                color={COLORS.navy}
              />
            </View>
            <Text style={styles.stateTitle}>Couldn't load perks</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <PressableScale
              style={{ marginTop: 20 }}
              onPress={() => {
                setLoading(true);
                fetchPerks();
              }}
            >
              <LinearGradient
                colors={[COLORS.gold, "#F7C61B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.retryBtn}
              >
                <Ionicons name="refresh" size={16} color={COLORS.navy} />
                <Text style={styles.retryText}>Try again</Text>
              </LinearGradient>
            </PressableScale>
          </View>
        ) : (
          <FlatList
            data={gridPerks}
            renderItem={renderGridItem}
            keyExtractor={(item) => String(item.id)}
            numColumns={gridColumns}
            key={`grid-${gridColumns}`}
            columnWrapperStyle={gridColumns > 1 ? styles.gridRow : undefined}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPerks();
            }}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <View style={styles.stateCenter}>
                <View style={styles.stateIcon}>
                  <Ionicons
                    name="pricetags-outline"
                    size={32}
                    color={COLORS.navy}
                  />
                </View>
                <Text style={styles.stateTitle}>No perks found</Text>
                <Text style={styles.stateText}>
                  Try a different search or check back later.
                </Text>
              </View>
            }
            removeClippedSubviews={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default PerksScreen;