import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  useWindowDimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import HomeHeader from "../components/HomeHeader";
import { withTimeout } from "../utils/withTimeout";
import { getCurrentUser } from "../services/supabaseAuth";
import {
  getAllEvents,
  getUserEventRegistrations,
} from "../services/eventQueries";
import styles, { COLORS, SPACING } from "../styles/EventsScreen.styles";

const EVENT_PLACEHOLDER_IMAGE = require("../../assets/images/luminus_cap_icon.png");
const INITIAL_EVENT_LIMIT = 40;
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// =============================================================
// HELPERS
// =============================================================
const formatDateRange = (startDate, endDate) => {
  if (!startDate) return "Date to be announced";
  const s = new Date(startDate);
  if (Number.isNaN(s.getTime())) return "Date to be announced";
  const e = endDate ? new Date(endDate) : null;

  const startLabel = s.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (!e || Number.isNaN(e.getTime()) || e.getTime() === s.getTime()) {
    return startLabel;
  }

  // Same year? Compact.
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return `${startLabel} – ${e.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
};

const formatDayBadge = (dateStr) => {
  if (!dateStr) return { day: "--", month: "---" };
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { day: "--", month: "---" };
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
  };
};

const getLocation = (event) =>
  event?.venue?.name || event?.platform || "NU Lipa";

const isUpcoming = (event) => {
  const ref = event?.end_date || event?.start_date;
  if (!ref) return true;
  const d = new Date(ref);
  if (Number.isNaN(d.getTime())) return true;
  // include events that end today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
};

const isComingSoon = (event) => {
  if (!event?.start_date) return false;
  const start = new Date(event.start_date);
  if (Number.isNaN(start.getTime())) return false;
  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() + 1);
  return start >= threshold;
};

const getMonthDays = (year, monthIndex) => {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const lead = first.getDay();
  const total = last.getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const doesEventOccurOnDate = (event, target) => {
  if (!event?.start_date || !target) return false;
  const s = new Date(event.start_date);
  if (Number.isNaN(s.getTime())) return false;
  const e = event.end_date ? new Date(event.end_date) : s;
  const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const end = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return t >= start && t <= end;
};

// CAPACITY HELPER
const isEventFull = (e) => {
  const max = Number(e?.capacity ?? e?.max_slots ?? e?.max_attendees ?? e?.max_participants ?? e?.slots);
  if (!max || isNaN(max) || max <= 0) return false;
  const current = Number(e?.registered_count ?? e?.registrations_count ?? e?.attendees_count ?? e?.current_attendees ?? 0);
  return current >= max;
};

// =============================================================
// SMALL REUSABLE COMPONENTS
// =============================================================

/** Press-scale wrapper for interactive cards */
const PressableScale = ({ children, onPress, style }) => {
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
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
};

/** Filter chip row */
const FilterChips = ({ active, onChange, options }) => (
  <View style={styles.chipsRow}>
    {options.map((opt) => {
      const isActive = active === opt.key;
      return (
        <TouchableOpacity
          key={opt.key}
          activeOpacity={0.85}
          onPress={() => onChange(opt.key)}
          style={[styles.chip, isActive && styles.chipActive]}
        >
          {opt.icon ? (
            <Ionicons
              name={opt.icon}
              size={13}
              color={isActive ? COLORS.gold : COLORS.navySoft}
              style={{ marginRight: 6 }}
            />
          ) : null}
          <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/** Horizontal carousel card */
const CarouselCard = ({ event, onPress, isRegistered, width }) => {
  const imageSource = event.cover_image_url
    ? { uri: event.cover_image_url }
    : EVENT_PLACEHOLDER_IMAGE;
  const badge = formatDayBadge(event.start_date);

  return (
    <PressableScale onPress={() => onPress(event)} style={{ width }}>
      {/* OUTER: holds the shadow, no clipping */}
      <View style={styles.carouselCardShadow}>
        {/* INNER: clips the image to the rounded corners */}
        <View style={styles.carouselCardInner}>
          <View style={styles.carouselImageWrap}>
            <Image
              source={imageSource}
              style={styles.carouselImage}
              resizeMode={event.cover_image_url ? "cover" : "contain"}
            />
            <LinearGradient
              colors={[
                "transparent",
                "rgba(27, 36, 80, 0.55)",
                "rgba(27, 36, 80, 0.95)",
              ]}
              locations={[0, 0.55, 1]}
              style={styles.carouselImageOverlay}
            />
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeDay}>{badge.day}</Text>
              <Text style={styles.dateBadgeMonth}>{badge.month}</Text>
            </View>
            
            {isRegistered ? (
              <View style={styles.carouselRegisteredPill}>
                <Ionicons name="checkmark-circle" size={11} color={COLORS.navy} />
                <Text style={styles.carouselRegisteredText}>GOING</Text>
              </View>
            ) : isEventFull(event) ? (
              <View style={[styles.carouselRegisteredPill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Ionicons name="people-circle" size={11} color="#DC2626" />
                <Text style={[styles.carouselRegisteredText, { color: '#DC2626' }]}>FULL</Text>
              </View>
            ) : null}

            <View style={styles.carouselTextBlock}>
              <Text numberOfLines={2} style={styles.carouselTitle}>
                {event.title}
              </Text>
              <View style={styles.carouselMetaRow}>
                <Ionicons name="location-outline" size={12} color="#E5E7EB" />
                <Text numberOfLines={1} style={styles.carouselMetaText}>
                  {getLocation(event)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

/** Compact list row */
const EventListRow = ({ event, onPress, isRegistered }) => {
  const imageSource = event.cover_image_url
    ? { uri: event.cover_image_url }
    : EVENT_PLACEHOLDER_IMAGE;
  const badge = formatDayBadge(event.start_date);

  return (
    <PressableScale onPress={() => onPress(event)}>
      <View style={styles.listRow}>
        <View style={styles.listDateCol}>
          <Text style={styles.listDateDay}>{badge.day}</Text>
          <Text style={styles.listDateMonth}>{badge.month}</Text>
        </View>
        <Image
          source={imageSource}
          style={styles.listThumb}
          resizeMode={event.cover_image_url ? "cover" : "contain"}
        />
        <View style={styles.listTextCol}>
          <Text numberOfLines={2} style={styles.listTitle}>
            {event.title}
          </Text>
          <View style={styles.listMetaRow}>
            <Ionicons
              name="calendar-outline"
              size={11}
              color={COLORS.navySoft}
            />
            <Text numberOfLines={1} style={styles.listMetaText}>
              {formatDateRange(event.start_date, event.end_date)}
            </Text>
          </View>
          <View style={styles.listMetaRow}>
            <Ionicons
              name="location-outline"
              size={11}
              color={COLORS.navySoft}
            />
            <Text numberOfLines={1} style={styles.listMetaText}>
              {getLocation(event)}
            </Text>
          </View>
          
          {isRegistered ? (
            <View style={styles.listRegisteredTag}>
              <Ionicons name="checkmark-circle" size={10} color={COLORS.navy} />
              <Text style={styles.listRegisteredText}>REGISTERED</Text>
            </View>
          ) : isEventFull(event) ? (
            <View style={[styles.listRegisteredTag, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Ionicons name="people-circle" size={10} color="#DC2626" />
              <Text style={[styles.listRegisteredText, { color: '#DC2626' }]}>FULL</Text>
            </View>
          ) : null}

        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.navySoft} />
      </View>
    </PressableScale>
  );
};

// =============================================================
// MAIN SCREEN
// =============================================================
const EventsScreen = ({ navigation }) => {
  const { width: screenWidth } = useWindowDimensions();

  // ---- data ----
  const [events, setEvents] = React.useState([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [eventsError, setEventsError] = React.useState("");

  const [registeredEvents, setRegisteredEvents] = React.useState([]);
  const [registeredEventsLoading, setRegisteredEventsLoading] =
    React.useState(false);
  const [registeredEventsError, setRegisteredEventsError] = React.useState("");

  // ---- ui ----
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState(null);
  const [registrationsOpen, setRegistrationsOpen] = React.useState(false);
  const [viewAllOpen, setViewAllOpen] = React.useState(false);
  const [viewAllMode, setViewAllMode] = React.useState("featured"); // 'featured' | 'comingSoon'

  const isMountedRef = React.useRef(true);
  const calendarAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ---- derived ----
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchesQuery = React.useCallback(
    (event) => {
      if (!normalizedQuery) return true;
      return [
        event.title,
        event.description,
        event.venue?.name,
        event.platform,
      ].some((v) => String(v ?? "").toLowerCase().includes(normalizedQuery));
    },
    [normalizedQuery],
  );

  const upcomingEvents = React.useMemo(
    () => events.filter((e) => isUpcoming(e) && matchesQuery(e)),
    [events, matchesQuery],
  );

  const featuredEvents = React.useMemo(
    () => upcomingEvents.slice(0, 8),
    [upcomingEvents],
  );

  const comingSoonEvents = React.useMemo(
    () =>
      events
        .filter((e) => isComingSoon(e) && matchesQuery(e))
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
    [events, matchesQuery],
  );

  const filteredListEvents = React.useMemo(() => {
    if (activeFilter === "coming") return comingSoonEvents;
    if (activeFilter === "thisWeek") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const in7 = new Date(now);
      in7.setDate(now.getDate() + 7);
      return upcomingEvents.filter((e) => {
        const d = new Date(e.start_date);
        return !Number.isNaN(d.getTime()) && d >= now && d <= in7;
      });
    }
    return upcomingEvents;
  }, [activeFilter, upcomingEvents, comingSoonEvents]);

  const viewAllItems =
    viewAllMode === "comingSoon" ? comingSoonEvents : upcomingEvents;
  const viewAllTitle =
    viewAllMode === "comingSoon" ? "Coming Soon" : "All Events";

  const registeredIds = React.useMemo(
    () => new Set(registeredEvents.map((r) => Number(r.event?.id))),
    [registeredEvents],
  );
  const isRegistered = (e) => registeredIds.has(Number(e.id));

  // ---- calendar ----
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const monthDays = React.useMemo(
    () => getMonthDays(year, month),
    [year, month],
  );

  const selectedDateObj = selectedDay
    ? new Date(year, month, selectedDay)
    : null;

  const selectedDayEvents = React.useMemo(() => {
    if (!selectedDateObj) return [];
    return events
      .filter((e) => doesEventOccurOnDate(e, selectedDateObj))
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  }, [events, selectedDateObj]);

  const eventsOnDay = React.useCallback(
    (day) => {
      if (!day) return 0;
      const target = new Date(year, month, day);
      return events.filter((e) => doesEventOccurOnDate(e, target)).length;
    },
    [events, year, month],
  );

  const toggleCalendar = () => {
    const to = calendarOpen ? 0 : 1;
    setCalendarOpen((prev) => !prev);
    Animated.timing(calendarAnim, {
      toValue: to,
      duration: 280,
      useNativeDriver: false,
    }).start();
  };

  // ---- fetch ----
  const eventsRequestRef = React.useRef(null);

  const fetchEvents = React.useCallback(
    async ({ refresh = false } = {}) => {
      if (
        eventsRequestRef.current &&
        !refresh &&
        Date.now() - eventsRequestRef.current.startedAt < 15000
      ) {
        return eventsRequestRef.current.promise;
      }

      let resolveRef;
      const promise = new Promise((res, rej) => {
        resolveRef = res;
      });

      eventsRequestRef.current = {
        promise,
        startedAt: Date.now(),
      };

      (async () => {
        try {
          if (refresh) setIsRefreshing(true);
          else setEventsLoading(true);
          setEventsError("");

          const fetched = await withTimeout(
            getAllEvents(INITIAL_EVENT_LIMIT, 0),
            12000,
            "getAllEvents",
          );

          if (!isMountedRef.current) return;
          setEvents(Array.isArray(fetched) ? fetched : []);
          resolveRef(fetched);
        } catch (err) {
          console.warn("[EventsScreen] fetchEvents failed:", err?.message);
          if (isMountedRef.current) {
            setEventsError("Unable to load events right now.");
          }
          resolveRef([]);
        } finally {
          if (isMountedRef.current) {
            setEventsLoading(false);
            setIsRefreshing(false);
          }
          if (eventsRequestRef.current?.promise === promise) {
            eventsRequestRef.current = null;
          }
        }
      })();

      return promise;
    },
    [],
  );

  const registrationsRequestRef = React.useRef(null);

const fetchRegistrations = React.useCallback(async () => {
  if (registrationsRequestRef.current) return; // dedupe

  registrationsRequestRef.current = true;
  try {
    setRegisteredEventsLoading(true);
    setRegisteredEventsError("");

    const user = await withTimeout(getCurrentUser(), 8000, "getCurrentUser");
    if (!user) {
      if (isMountedRef.current) setRegisteredEvents([]);
      return;
    }

    const regs = await withTimeout(
      getUserEventRegistrations(user.id),
      12000,
      "getUserEventRegistrations",
    );
    if (!isMountedRef.current) return;
    setRegisteredEvents(Array.isArray(regs) ? regs : []);
  } catch (err) {
    console.warn("[EventsScreen] fetchRegistrations failed:", err?.message);
    if (isMountedRef.current) {
      setRegisteredEventsError("Unable to load your registrations.");
    }
  } finally {
    registrationsRequestRef.current = null;
    if (isMountedRef.current) setRegisteredEventsLoading(false);
  }
}, []);

  const handleRefresh = React.useCallback(async () => {
    await Promise.all([fetchEvents({ refresh: true }), fetchRegistrations()]);
  }, [fetchEvents, fetchRegistrations]);

  React.useEffect(() => {
    fetchEvents().catch((e) =>
      console.warn("[EventsScreen] initial fetch failed:", e?.message),
    );
  }, [fetchEvents]);
  
  useFocusEffect(
    React.useCallback(() => {
      fetchRegistrations().catch((e) =>
        console.warn("[EventsScreen] focus fetch failed:", e?.message),
      );
      return () => {};
    }, [fetchRegistrations]),
  );

  // ---- navigation ----
  const openEvent = (event) => {
    if (!event?.id) return;
    const parent = navigation.getParent?.();
    const root = parent?.getParent?.();
    if (root?.navigate) {
      root.navigate("ViewEventsScreen", { event });
      return;
    }
    if (parent?.navigate) {
      parent.navigate("ViewEventsScreen", { event });
      return;
    }
    navigation.navigate("ViewEventsScreen", { event });
  };

  const openRegisteredEvent = (registration) => {
    const reg = registration?.event;
    const full = events.find((e) => Number(e?.id) === Number(reg?.id));
    const merged = reg
      ? {
          ...(full || reg),
          cover_image_url:
            full?.cover_image_url ??
            full?.images?.[0]?.image_path ??
            reg?.images?.[0]?.image_path ??
            null,
        }
      : null;
    if (!merged?.id) return;
    openEvent(merged);
  };

  // ---- render helpers ----
  const renderListEmpty = () => {
    if (eventsLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.navy} />
          <Text style={styles.loadingTextDark}>Loading events…</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconWrap}>
          <Ionicons
            name="calendar-clear-outline"
            size={32}
            color={COLORS.navy}
          />
        </View>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptyBody}>
          {eventsError || "Try a different filter or check back later."}
        </Text>
      </View>
    );
  };

  const carouselCardWidth = Math.min(screenWidth * 0.72, 300);
  const carouselGap = 14;

  return (
    <View style={styles.container}>
      <HomeHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
      >
        {/* ============================================================
            HERO — gradient + quick actions + search
        ============================================================ */}
        <LinearGradient
          colors={[COLORS.navy, COLORS.navyDark, COLORS.navyDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlow1} pointerEvents="none" />
          <View style={styles.heroGlow2} pointerEvents="none" />

          <View style={styles.heroTopRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.heroEyebrow}>NATIONAL UNIVERSITY LIPA</Text>
              <Text style={styles.heroTitle}>
                Discover{"\n"}what's happening
              </Text>
            </View>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatNumber}>{upcomingEvents.length}</Text>
              <Text style={styles.heroStatLabel}>upcoming</Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.navySoft} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search events, venues, topics…"
              placeholderTextColor={COLORS.placeholder}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={10}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={COLORS.placeholder}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Quick actions */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickAction}
              activeOpacity={0.85}
              onPress={toggleCalendar}
            >
              <View style={styles.quickActionIconWrap}>
                <Ionicons
                  name={calendarOpen ? "close" : "calendar-outline"}
                  size={18}
                  color={COLORS.gold}
                />
              </View>
              <Text style={styles.quickActionText}>
                {calendarOpen ? "Close" : "Calendar"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              activeOpacity={0.85}
              onPress={() => setRegistrationsOpen(true)}
            >
              <View style={styles.quickActionIconWrap}>
                <Ionicons
                  name="bookmark-outline"
                  size={18}
                  color={COLORS.gold}
                />
              </View>
              <Text style={styles.quickActionText}>My Events</Text>
              {registeredEvents.length > 0 ? (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>
                    {registeredEvents.length}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              activeOpacity={0.85}
              onPress={() =>
                setActiveFilter((f) => (f === "coming" ? "all" : "coming"))
              }
            >
              <View style={styles.quickActionIconWrap}>
                <Ionicons
                  name="sparkles-outline"
                  size={18}
                  color={COLORS.gold}
                />
              </View>
              <Text style={styles.quickActionText}>Soon</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ============================================================
            INLINE EXPANDABLE CALENDAR
        ============================================================ */}
        <Animated.View
          style={[
            styles.calendarSheet,
            {
              maxHeight: calendarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 700],
              }),
              opacity: calendarAnim,
              marginTop: calendarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 18],
              }),
              marginBottom: calendarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 18],
              }),
            },
          ]}
        >
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.calendarNavBtn}
              onPress={() => setCurrentDate(new Date(year, month - 1, 1))}
            >
              <Ionicons name="chevron-back" size={18} color={COLORS.navy} />
            </TouchableOpacity>
            <Text style={styles.calendarMonthLabel}>{monthLabel}</Text>
            <TouchableOpacity
              style={styles.calendarNavBtn}
              onPress={() => setCurrentDate(new Date(year, month + 1, 1))}
            >
              <Ionicons name="chevron-forward" size={18} color={COLORS.navy} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((d, i) => (
              <Text key={`${d}-${i}`} style={styles.weekLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {monthDays.map((day, index) => {
              const isToday =
                day &&
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === day;
              const count = day ? eventsOnDay(day) : 0;
              const has = count > 0;
              const isSelected = selectedDay === day && day;
              return (
                <View key={index} style={styles.dayCell}>
                  {day ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() =>
                        setSelectedDay(day === selectedDay ? null : day)
                      }
                      style={[
                        styles.dayBubble,
                        isToday && styles.dayBubbleToday,
                        has && styles.dayBubbleHasEvent,
                        isSelected && styles.dayBubbleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isToday && styles.dayTextToday,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                      {has && !isSelected ? <View style={styles.dayDot} /> : null}
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>

          {selectedDay ? (
            <View style={styles.selectedDayPanel}>
              <Text style={styles.selectedDayHeading}>
                {selectedDayEvents.length} event
                {selectedDayEvents.length === 1 ? "" : "s"} on{" "}
                {new Date(year, month, selectedDay).toLocaleDateString(
                  undefined,
                  { month: "long", day: "numeric" },
                )}
              </Text>
              {selectedDayEvents.length === 0 ? (
                <Text style={styles.selectedDayEmpty}>
                  Nothing scheduled.
                </Text>
              ) : (
                selectedDayEvents.slice(0, 3).map((e) => (
                  <TouchableOpacity
                    key={`sd-${e.id}`}
                    style={styles.selectedDayItem}
                    activeOpacity={0.85}
                    onPress={() => openEvent(e)}
                  >
                    <View style={styles.selectedDayTimeDot} />
                    <Text
                      numberOfLines={1}
                      style={styles.selectedDayItemText}
                    >
                      {e.title}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={COLORS.navy}
                    />
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : null}
        </Animated.View>

        {/* ============================================================
            FEATURED CAROUSEL
        ============================================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>HANDPICKED</Text>
              <Text style={styles.sectionTitle}>Featured Events</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setViewAllMode("featured");
                setViewAllOpen(true);
              }}
              hitSlop={8}
            >
              <Text style={styles.sectionLink}>See all</Text>
            </TouchableOpacity>
          </View>

          {eventsLoading ? (
            <View style={styles.loadingWrapSmall}>
              <ActivityIndicator color={COLORS.navy} />
            </View>
          ) : featuredEvents.length === 0 ? (
            <View style={styles.inlineEmpty}>
              <Text style={styles.inlineEmptyText}>
                No featured events yet.
              </Text>
            </View>
          ) : (
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: SPACING.screen,
                paddingTop: 8,
                paddingBottom: 22,
                gap: carouselGap,
              }}
              snapToInterval={carouselCardWidth + carouselGap}
              decelerationRate="fast"
            >
              {featuredEvents.map((item) => (
                <CarouselCard
                  key={`feat-${item.id}`}
                  event={item}
                  onPress={openEvent}
                  isRegistered={isRegistered(item)}
                  width={carouselCardWidth}
                />
              ))}
            </ScrollView>

          )}
        </View>

        {/* ============================================================
            FILTER + LIST
        ============================================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>BROWSE</Text>
              <Text style={styles.sectionTitle}>All Events</Text>
            </View>
          </View>

          <FilterChips
            active={activeFilter}
            onChange={setActiveFilter}
            options={[
              { key: "all", label: "All", icon: "apps-outline" },
              { key: "thisWeek", label: "This week", icon: "flash-outline" },
              {
                key: "coming",
                label: "Coming soon",
                icon: "sparkles-outline",
              },
            ]}
          />

          <View style={styles.listWrap}>
            {filteredListEvents.length === 0
              ? renderListEmpty()
              : filteredListEvents.slice(0, 10).map((event) => (
                  <EventListRow
                    key={`list-${event.id}`}
                    event={event}
                    onPress={openEvent}
                    isRegistered={isRegistered(event)}
                  />
                ))}

            {filteredListEvents.length > 10 ? (
              <TouchableOpacity
                style={styles.viewMoreBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setViewAllMode(
                    activeFilter === "coming" ? "comingSoon" : "featured",
                  );
                  setViewAllOpen(true);
                }}
              >
                <Text style={styles.viewMoreText}>
                  View all {filteredListEvents.length} events
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={COLORS.gold}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ============================================================
            COMING SOON STRIP
        ============================================================ */}
        {comingSoonEvents.length > 0 ? (
          <LinearGradient
            colors={[COLORS.navy, COLORS.navyDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.comingSoonStrip}
          >
            <View style={styles.comingSoonHeader}>
              <View style={styles.comingSoonIconWrap}>
                <Ionicons name="sparkles" size={16} color={COLORS.navy} />
              </View>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.comingSoonTitle}>
                  Coming Soon at NU Lipa
                </Text>
                <Text style={styles.comingSoonSubtitle}>
                  {comingSoonEvents.length} event
                  {comingSoonEvents.length === 1 ? "" : "s"} on the horizon
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setViewAllMode("comingSoon");
                  setViewAllOpen(true);
                }}
                hitSlop={10}
              >
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={COLORS.gold}
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================
          REGISTRATIONS BOTTOM SHEET
      ============================================================ */}
      <Modal
        transparent
        visible={registrationsOpen}
        animationType="slide"
        onRequestClose={() => setRegistrationsOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setRegistrationsOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>YOUR EVENTS</Text>
                <Text style={styles.sheetTitle}>Pre-Registered</Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setRegistrationsOpen(false)}
              >
                <Ionicons name="close" size={18} color={COLORS.navy} />
              </TouchableOpacity>
            </View>

            {registeredEventsLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={COLORS.navy} />
                <Text style={styles.loadingTextDark}>Loading…</Text>
              </View>
            ) : registeredEvents.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <Image
                  source={require("../../assets/icons/Group.png")}
                  style={styles.sheetEmptyImage}
                  resizeMode="contain"
                />
                <Text style={styles.sheetEmptyTitle}>
                  No registrations yet
                </Text>
                <Text style={styles.sheetEmptyBody}>
                  {registeredEventsError ||
                    "Events you pre-register for will appear here."}
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {registeredEvents.map((reg) => (
                  <EventListRow
                    key={`reg-${reg.id}`}
                    event={reg.event}
                    onPress={() => {
                      setRegistrationsOpen(false);
                      openRegisteredEvent(reg);
                    }}
                    isRegistered
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================
          VIEW ALL BOTTOM SHEET
      ============================================================ */}
      <Modal
        transparent
        visible={viewAllOpen}
        animationType="slide"
        onRequestClose={() => setViewAllOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setViewAllOpen(false)}
          />
          <View style={[styles.sheet, { maxHeight: "92%" }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>
                  {viewAllMode === "comingSoon"
                    ? "ON THE HORIZON"
                    : "ALL EVENTS"}
                </Text>
                <Text style={styles.sheetTitle}>{viewAllTitle}</Text>
                <Text style={styles.sheetSubtitle}>
                  {viewAllItems.length} event
                  {viewAllItems.length === 1 ? "" : "s"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setViewAllOpen(false)}
              >
                <Ionicons name="close" size={18} color={COLORS.navy} />
              </TouchableOpacity>
            </View>

            {viewAllItems.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons
                    name="calendar-clear-outline"
                    size={28}
                    color={COLORS.navy}
                  />
                </View>
                <Text style={styles.sheetEmptyTitle}>No events to show</Text>
                <Text style={styles.sheetEmptyBody}>
                  Check back soon for updates.
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 28 }}
              >
                {viewAllItems.map((event) => (
                  <EventListRow
                    key={`all-${event.id}`}
                    event={event}
                    onPress={(e) => {
                      setViewAllOpen(false);
                      openEvent(e);
                    }}
                    isRegistered={isRegistered(event)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default EventsScreen;