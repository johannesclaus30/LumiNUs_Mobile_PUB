import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import TopHeaderDark from "../components/TopHeaderDark";
import AvatarInitials from "../components/AvatarInitials";
import styles from "../styles/GlobalSearchScreen.styles";
import { getCurrentUser } from "../services/supabaseAuth";
import {
  getFollowers,
  getFollowing,
  getSentPendingRequests,
  sendFollowRequest,
} from "../services/connectionQueries";
import { getAllAlumni, getAlumniByEmail } from "../services/alumniQueries";
import { getAvatarUri } from "../utils/imageUtils";
import { ThemedAlert } from "../components/ThemedAlert";
import supabase from "../services/supabase";

const NU_BLUE = "#32418C";
const NU_BLUE_DARK = "#192257";   // ← add this
const NU_GOLD = "#FBD117";

const resolveAvatar = (path) => {
  if (
    !path ||
    typeof path !== "string" ||
    !path.trim() ||
    path.includes("undefined") ||
    path.includes("null")
  )
    return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage
    .from("luminus_assets")
    .getPublicUrl(path.replace(/^\/+/, ""));
  return data?.publicUrl || null;
};

/* === Pressable with spring scale =================================== */
const TapScale = ({ children, style, onPress, disabled, scaleTo = 0.96, ...rest }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  return (
    <Pressable
      onPressIn={() => !disabled && animate(scaleTo)}
      onPressOut={() => animate(1)}
      onPress={onPress}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

/* === Staggered card entrance ======================================= */
const Reveal = ({ children, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, delay]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>
  );
};

/* === Mutual connections badge ====================================== */
const MutualConnections = ({ targetUserId, connectedIds, alumni }) => {
  const [mutualIds, setMutualIds] = useState([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("connections")
        .select("follower_id, followed_id")
        .eq("status", "accepted")
        .or(`follower_id.eq.${targetUserId},followed_id.eq.${targetUserId}`);
      if (!active) return;
      const ids = (data || [])
        .map((row) =>
          row.follower_id === targetUserId ? row.followed_id : row.follower_id
        )
        .filter((id) => connectedIds.has(id));
      setMutualIds(ids);
    };
    if (targetUserId && connectedIds.size) load().catch(() => setMutualIds([]));
    return () => {
      active = false;
    };
  }, [targetUserId, connectedIds]);
  if (!mutualIds.length) return null;
  const profile = mutualIds.map((id) => alumni.find((i) => i.id === id)).find(Boolean);
  const name = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : "...";
  const avatar = profile ? getAvatarUri(name, resolveAvatar(profile.alumni_photo)) : null;
  const remaining = mutualIds.length - 1;
  return (
    <View style={styles.mutualRow}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.mutualAvatar} />
      ) : (
        <AvatarInitials
          name={name}
          size={16}
          style={styles.mutualAvatar}
          backgroundColor={NU_BLUE}
        />
      )}
      <Text style={styles.mutualText} numberOfLines={1}>
        {profile?.first_name || "Alumni"}
        {remaining ? ` +${remaining}` : ""} mutual
      </Text>
    </View>
  );
};

const GlobalSearchScreen = ({ navigation, route }) => {
  const initialQuery = route?.params?.query ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentAlumni, setCurrentAlumni] = useState(null);
  const [allAlumni, setAllAlumni] = useState([]);
  const [connectedIds, setConnectedIds] = useState(new Set());
  const [pendingIds, setPendingIds] = useState(new Set());
  const [sendingIds, setSendingIds] = useState(new Set());
  const [expanded, setExpanded] = useState({ batch: false, program: false, others: false });
  const skeletonOpacity = useRef(new Animated.Value(0.4)).current;
  const toastTimer = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 0.9,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [skeletonOpacity]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const loadSearchData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const user = await getCurrentUser();
      if (!user?.id && !user?.email) throw new Error("No active session found.");
      const alumni = user.id
        ? { id: user.id, email: user.email }
        : await getAlumniByEmail(user.email);
      if (!alumni?.id) throw new Error("Unable to resolve your alumni profile.");
      const profile = await getAlumniByEmail(alumni.email).catch(() => alumni);
      const [rows, following, followers, outgoing] = await Promise.all([
        getAllAlumni(500).catch(() => []),
        getFollowing(alumni.id).catch(() => []),
        getFollowers(alumni.id).catch(() => []),
        getSentPendingRequests(alumni.id).catch(() => []),
      ]);
      setCurrentAlumni(profile);
      setAllAlumni(Array.isArray(rows) ? rows : []);
      setConnectedIds(
        new Set(
          [
            ...(following || []).map((row) => row?.followed?.id),
            ...(followers || []).map((row) => row?.follower?.id),
          ].filter(Boolean)
        )
      );
      setPendingIds(
        new Set((outgoing || []).map((row) => row?.followed?.id).filter(Boolean))
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to load alumni right now.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadSearchData();
  }, [loadSearchData]);
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSearchData();
    } finally {
      setRefreshing(false);
    }
  }, [loadSearchData]);

  const requestConnection = async (item) => {
    if (!currentAlumni?.id || !item?.id) return;
    setSendingIds((ids) => new Set(ids).add(item.id));
    try {
      await sendFollowRequest(currentAlumni.id, item.id);
      setPendingIds((ids) => new Set(ids).add(item.id));
      setSuccessMessage(`Request sent to ${item.first_name || "Alumni"}`);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      ThemedAlert.alert("Error", "Unable to send connection request right now.");
    } finally {
      setSendingIds((ids) => {
        const next = new Set(ids);
        next.delete(item.id);
        return next;
      });
    }
  };

  const groups = useMemo(() => {
    const tokens = debouncedQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const year = currentAlumni?.year_graduated
      ? String(currentAlumni.year_graduated).slice(0, 4)
      : null;
    const program = currentAlumni?.program
      ? String(currentAlumni.program).trim().toLowerCase()
      : null;
    const result = { batch: [], program: [], others: [] };
    allAlumni
      .filter((item) => {
        if (!item?.id || item.id === currentAlumni?.id || connectedIds.has(item.id))
          return false;
        const text = `${item.first_name || ""} ${item.last_name || ""} ${
          item.program || ""
        } ${item.year_graduated || ""}`.toLowerCase();
        return tokens.every((token) => text.includes(token));
      })
      .forEach((item) => {
        if (year && String(item.year_graduated || "").slice(0, 4) === year)
          result.batch.push(item);
        else if (
          program &&
          String(item.program || "").trim().toLowerCase() === program
        )
          result.program.push(item);
        else result.others.push(item);
      });
    return result;
  }, [allAlumni, currentAlumni, connectedIds, debouncedQuery]);

  const visibleGroups = {
    batch: activeFilter === "program" ? [] : groups.batch,
    program: activeFilter === "batch" ? [] : groups.program,
    others: activeFilter === "all" ? groups.others : [],
  };

  const totalResults =
    visibleGroups.batch.length + visibleGroups.program.length + visibleGroups.others.length;

  /* === Single card ================================================ */
  const renderCard = (item, index = 0) => {
    const name = `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Alumni";
    const parts = name.split(" ");
    const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    const avatar = getAvatarUri(name, resolveAvatar(item.alumni_photo));
    const pending = pendingIds.has(item.id);
    const sending = sendingIds.has(item.id);

    return (
      <Reveal key={item.id} delay={Math.min(index * 60, 320)}>
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            <TapScale
              style={styles.cardTop}
              onPress={() => navigation.navigate("ProfileView", { userId: item.id })}
              accessibilityRole="button"
              accessibilityLabel={`View profile of ${name}`}
            >
              <View style={styles.avatarWrap}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <AvatarInitials
                    name={name}
                    size={64}
                    style={styles.avatar}
                    backgroundColor={NU_BLUE}
                  />
                )}
                <View style={styles.avatarDot} />
              </View>

              <Text style={styles.cardName} numberOfLines={2}>
                {first}
                {last ? `\n${last}` : ""}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {item.program || "Alumni"}
                {item.year_graduated
                  ? ` · ${String(item.year_graduated).slice(0, 4)}`
                  : ""}
              </Text>

              <MutualConnections
                targetUserId={item.id}
                connectedIds={connectedIds}
                alumni={allAlumni}
              />
            </TapScale>

            <TapScale
              style={[
                styles.actionButton,
                pending && styles.actionButtonPending,
                sending && styles.actionButtonSending,
              ]}
              onPress={() => requestConnection(item)}
              disabled={pending || sending}
              accessibilityRole="button"
              accessibilityLabel={`${pending ? "Requested" : "Connect"} with ${name}`}
              accessibilityState={{ disabled: pending || sending }}
            >
              <Ionicons
                name={pending ? "checkmark" : sending ? "sync" : "add"}
                size={14}
                color={pending ? NU_BLUE : "#FFFFFF"}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  pending && styles.actionButtonTextPending,
                ]}
              >
                {pending ? "Requested" : sending ? "Sending…" : "Connect"}
              </Text>
            </TapScale>
          </View>
        </View>
      </Reveal>
    );
  };

  /* === Section ==================================================== */
  const renderSection = (title, subtitle, data, key) => {
    if (!data.length) return null;
    const isExpanded = expanded[key];
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{data.length}</Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          {(isExpanded ? data : data.slice(0, 4)).map((it, i) => renderCard(it, i))}
        </View>

        {data.length > 4 && (
          <TapScale
            style={styles.showAllButton}
            onPress={() =>
              setExpanded((current) => ({ ...current, [key]: !current[key] }))
            }
            accessibilityRole="button"
            accessibilityLabel={`${isExpanded ? "Show less" : "Show all"} ${title}`}
            accessibilityState={{ expanded: isExpanded }}
          >
            <Text style={styles.showAllText}>
              {isExpanded ? "Show less" : `View all ${data.length}`}
            </Text>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={NU_BLUE}
              style={{ marginLeft: 6 }}
            />
          </TapScale>
        )}
      </View>
    );
  };

  const filterOptions = [
    { key: "all", label: "All", icon: "grid-outline" },
    { key: "batch", label: "Batch", icon: "people-outline" },
    { key: "program", label: "Program", icon: "school-outline" },
  ];

  /* === Loading ==================================================== */
  if (loading)
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar style="light" backgroundColor={NU_BLUE_DARK} />
        <TopHeaderDark />
        <View style={styles.headerSpacer} />
        <View style={styles.loadingWrap}>
          <View style={styles.skeletonGrid}>
            {[0, 1, 2, 3].map((index) => (
              <Animated.View
                key={index}
                style={[styles.cardWrapper, styles.skeletonCard, { opacity: skeletonOpacity }]}
              >
                <View style={styles.skeletonAvatar} />
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
                <View style={styles.skeletonButton} />
              </Animated.View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );

  /* === Main ======================================================= */
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" backgroundColor={NU_BLUE_DARK} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshData}
            colors={[NU_BLUE]}
            tintColor={NU_BLUE}
          />
        }
      >
        <TopHeaderDark />
        <View style={styles.headerSpacer} />

        {/* ---------- HERO ---------- */}
        <View style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>ALUMNI DIRECTORY</Text>
              <Text style={styles.heroTitle}>Find your people.</Text>
              <Text style={styles.heroSubtitle}>
                Connect with {allAlumni.length > 0 ? allAlumni.length : "your"} fellow alumni.
              </Text>
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name="people-outline" size={28} color={NU_BLUE} />
            </View>
          </View>
        </View>

        {/* ---------- SEARCH + FILTERS ---------- */}
        <View style={styles.controlCard}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={NU_BLUE} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, program, or year"
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search alumni"
              accessibilityHint="Type a name, program, or graduation year"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => {
                  setQuery("");
                  setDebouncedQuery("");
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
              </Pressable>
            )}
          </View>
          <Text style={styles.searchHint}>Search by name, program, or graduation year</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filterOptions.map((filter) => {
              const active = activeFilter === filter.key;
              return (
                <TapScale
                  key={filter.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveFilter(filter.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${filter.label}`}
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={filter.icon}
                    size={13}
                    color={active ? NU_BLUE : "#64748B"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TapScale>
              );
            })}
          </ScrollView>
        </View>

        {/* ---------- CONTENT ---------- */}
        <View style={styles.contentArea}>
          {errorMessage ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cloud-offline-outline" size={30} color={NU_BLUE} />
              </View>
              <Text style={styles.emptyTitle}>Couldn't load alumni</Text>
              <Text style={styles.emptyBody}>{errorMessage}</Text>
              <TapScale style={styles.emptyCta} onPress={refreshData}>
                <Text style={styles.emptyCtaText}>Try again</Text>
              </TapScale>
            </View>
          ) : totalResults === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search-outline" size={30} color={NU_BLUE} />
              </View>
              <Text style={styles.emptyTitle}>No alumni found</Text>
              <Text style={styles.emptyBody}>
                {debouncedQuery
                  ? "Nothing matches that search. Try a different name, program, or year."
                  : "There's no one to show here yet — check back soon."}
              </Text>
              {debouncedQuery && (
                <TapScale
                  style={styles.emptyCta}
                  onPress={() => {
                    setQuery("");
                    setDebouncedQuery("");
                  }}
                >
                  <Text style={styles.emptyCtaText}>Clear search</Text>
                </TapScale>
              )}
            </View>
          ) : (
            <>
              <View style={styles.resultsRow}>
                <Text style={styles.resultsText}>
                  {totalResults} {totalResults === 1 ? "alumnus" : "alumni"} found
                </Text>
              </View>
              {renderSection(
                "Your batch",
                "Graduated the same year",
                visibleGroups.batch,
                "batch"
              )}
              {renderSection(
                "Your program",
                "Studied the same field",
                visibleGroups.program,
                "program"
              )}
              {renderSection(
                "People you may know",
                "More alumni to explore",
                visibleGroups.others,
                "others"
              )}
            </>
          )}
        </View>
      </ScrollView>

      {successMessage && (
        <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <View style={styles.toastIcon}>
            <Ionicons name="checkmark" size={14} color={NU_BLUE} />
          </View>
          <Text style={styles.toastText}>{successMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default GlobalSearchScreen;