import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Alert,
  RefreshControl,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { getUserPosts } from "../services/postQueries";
import { getDismissedNotifications, dismissNotification } from "../services/utilityQueries";
import { acceptConnectionRequest, rejectConnectionRequest } from "../services/connectionQueries";
import { getAvatarUri } from "../utils/imageUtils";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";

// Import the consolidated styles
import styles from "../styles/NotificationsScreen.styles";

const FILTERS = ["All", "Social", "Updates", "Connections"];

export default function NotificationsScreen({ navigation }) {
  const { currentUserProfile } = useCurrentUserProfile();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);

  // Skeleton Animation Value
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [isLoading, pulseAnim]);

  const fetchNotifications = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const currentProfile = currentUserProfile ?? (await getCurrentUser().catch(() => null));
      const currentUserId = currentProfile?.id ?? null;
      if (!currentUserId) { setNotifications([]); return; }

      const dismissedNotificationKeys = await getDismissedNotifications(currentUserId).catch(() => []);
      const dismissedNotificationKeySet = new Set((dismissedNotificationKeys || []).map((key) => String(key)));

      const ownedPosts = await getUserPosts(currentUserId, 50, 0).catch(() => []);
      const ownedPostsById = new Map((ownedPosts || []).map((post) => [post.id, post]));
      const postIds = (ownedPosts || []).map((post) => post?.id).filter(Boolean);

      const todayDate = new Date().toISOString().split('T')[0];

      const [
        commentsResult, 
        reactionsResult, 
        repostsResult, 
        announcementsResult, 
        connectionsResult,
        perksResult,
        storedNotificationsResult
      ] = await Promise.all([
        postIds.length > 0 ? supabase.from("comments").select(`id, post_id, comment, created_at, alumni:alumni_id(id, first_name, last_name, alumni_photo)`).in("post_id", postIds).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
        postIds.length > 0 ? supabase.from("reactions").select(`id, post_id, reaction, created_at, alumni:alumni_id(id, first_name, last_name, alumni_photo)`).in("post_id", postIds).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
        postIds.length > 0 ? supabase.from("reposts").select(`id, post_id, caption, created_at, alumni:alumni_id(id, first_name, last_name, alumni_photo)`).in("post_id", postIds).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
        supabase.from("announcements").select(`id, title, announcement_description, date_posted, scheduled_at, admin:admin_id(id, admin_first_name, admin_last_name, photo)`).lte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: false }).limit(20),
        supabase.from("followers").select(`id, created_at, follower:follower_alumni_id(id, first_name, last_name, alumni_photo)`).eq("followed_alumni_id", currentUserId).eq("status", 0).order("created_at", { ascending: false }).limit(100),
        supabase.from("perks").select(`id, title, description, created_at, status, valid_until, admin:admin_id(id, admin_first_name, admin_last_name, photo)`).eq('status', 1).gte('valid_until', todayDate).order("created_at", { ascending: false }).limit(20),
        supabase.from("notifications").select("*").eq("alumni_id", currentUserId).order("created_at", { ascending: false }).limit(100)
      ]);

      const buildActor = (row) => row?.alumni ?? row?.alumnis ?? null;
      let rawFeed = [];

      const storedNotifications = storedNotificationsResult.data ?? [];
      const storedActorIds = storedNotifications
        .map((notification) => notification.actor_id ?? notification.data?.senderId ?? notification.data?.sender_id)
        .filter(Boolean);
      const { data: storedActors } = storedActorIds.length > 0
        ? await supabase.from("alumnis_base").select("id, first_name, last_name, alumni_photo").in("id", storedActorIds)
        : { data: [] };
      const storedActorById = new Map((storedActors ?? []).map((actor) => [String(actor.id), actor]));

      // Build a lookup of pending follower rows so we can attach db_id
      // to any connection_request notification we discover.
      // Key = `${followerId}:${followedId}` → followers.id
      const pendingFollowLookup = new Map();
      (connectionsResult.data ?? []).forEach((conn) => {
        const key = `${conn.follower_alumni_id}:${conn.followed_alumni_id}`;
        pendingFollowLookup.set(key, conn.id);
      });

      storedNotifications.forEach((notification) => {
        const data = notification.data ?? {};
        const type = ["connection_request"].includes(notification.type)
          ? "connection"
          : ["post_mention"].includes(notification.type)
            ? "mention"
            : notification.type ?? "general";

        const actorId = notification.actor_id ?? data.senderId ?? data.sender_id ?? null;
        const targetId = notification.target_id ?? data.postId ?? data.messageId ?? data.eventId ?? data.announcementId ?? data.perkId ?? null;

        // For connection notifications, resolve db_id from the followers table
        // by matching (follower_alumni_id = actorId, followed_alumni_id = currentUserId)
        let dbId = data.connectionId ?? data.connection_id ?? null;
        if (!dbId && type === "connection" && actorId) {
          const lookupKey = `${actorId}:${currentUserId}`;
          dbId = pendingFollowLookup.get(lookupKey) ?? null;
        }

        rawFeed.push({
          id: `notification-${notification.id}`,
          db_id: dbId,
          type,
          actor: storedActorById.get(String(actorId)) ?? { id: actorId },
          title: notification.title,
          message: notification.message,
          created_at: notification.created_at,
          target_id: targetId,
          data,
        });
      });

      (connectionsResult.data ?? []).forEach((conn) => {
        const actor = conn?.follower ?? buildActor(conn);
        if (actor?.id) rawFeed.push({ id: `connection-${conn.id}`, db_id: conn.id, type: "connection", actor, created_at: conn.created_at ?? null });
      });

      (commentsResult.data ?? []).forEach((comment) => {
        const actor = buildActor(comment);
        if (actor?.id && actor.id !== currentUserId) rawFeed.push({ id: `comment-${comment.id}`, type: "comment", actor, created_at: comment.created_at ?? null, target_id: comment.post_id });
      });

      (reactionsResult.data ?? []).forEach((reaction) => {
        const actor = buildActor(reaction);
        if (actor?.id && actor.id !== currentUserId) rawFeed.push({ id: `reaction-${reaction.id}`, type: "reaction", actor, created_at: reaction.created_at ?? null, target_id: reaction.post_id });
      });

      (repostsResult.data ?? []).forEach((repost) => {
        const actor = buildActor(repost);
        if (actor?.id && actor.id !== currentUserId) rawFeed.push({ id: `repost-${repost.id}`, type: "repost", actor, created_at: repost.created_at ?? null, target_id: repost.post_id });
      });

      (announcementsResult.data ?? []).forEach((announcement) => {
        rawFeed.push({ id: `announcement-${announcement.id}`, type: "announcement", actor: { id: announcement?.admin?.id ?? null, first_name: "NU Lipa Alumni Affairs", last_name: "Office", alumni_photo: announcement?.admin?.photo ?? null }, created_at: announcement.scheduled_at ?? announcement.date_posted ?? null, target_id: announcement.id });
      });

      (perksResult.data ?? []).forEach((perk) => {
        rawFeed.push({ id: `perk-${perk.id}`, type: "perk", perk_title: perk.title, actor: { id: perk?.admin?.id ?? null, first_name: "NU Lipa Alumni Affairs", last_name: "Office", alumni_photo: perk?.admin?.photo ?? null }, created_at: perk.created_at ?? null, target_id: perk.id });
      });

      // 1. Filter Dismissed
      // ============================================================
      // DEDUPE CONNECTION NOTIFICATIONS
      // ------------------------------------------------------------
      // If we have both a live followers-row notification AND a
      // stored notifications-table connection_request for the same
      // actor, keep only the live one (it has the correct db_id and
      // reflects the current state).
      // ============================================================
      const liveConnectionActors = new Set();
      rawFeed.forEach((item) => {
        if (item.type === "connection" && item.id.startsWith("connection-")) {
          liveConnectionActors.add(String(item.actor?.id));
        }
      });

      rawFeed = rawFeed.filter((item) => {
        // Drop stored connection notifications for actors we already
        // have a live followers row for
        if (item.type === "connection" && item.id.startsWith("notification-")) {
          return !liveConnectionActors.has(String(item.actor?.id));
        }
        return true;
      });

      // 1. Filter Dismissed
      rawFeed = rawFeed.filter((item) => !dismissedNotificationKeySet.has(String(item.id)));

      // 2. Grouping Logic for Reactions
      const groupedFeed = [];
      const reactionGroups = new Map();

      rawFeed.forEach(notif => {
        if (notif.type === 'reaction') {
          if (!reactionGroups.has(notif.target_id)) reactionGroups.set(notif.target_id, []);
          reactionGroups.get(notif.target_id).push(notif);
        } else {
          groupedFeed.push(notif);
        }
      });

      reactionGroups.forEach((reactions, target_id) => {
        reactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = reactions[0];
        if (reactions.length > 1) {
          groupedFeed.push({ ...latest, isGrouped: true, groupCount: reactions.length });
        } else {
          groupedFeed.push(latest);
        }
      });

      // 3. Sort by Date
      groupedFeed.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setNotifications(groupedFeed);
    } catch(err) {
      console.warn("Error fetching notifs: ", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUserProfile]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "All") return notifications;
    if (activeFilter === "Social") return notifications.filter(n => ["comment", "reaction", "repost", "mention", "message"].includes(n.type));
    if (activeFilter === "Updates") return notifications.filter(n => ["announcement", "perk"].includes(n.type));
    if (activeFilter === "Connections") return notifications.filter(n => n.type === "connection");
    return notifications;
  }, [notifications, activeFilter]);

  const triggerLayoutAnimation = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  };

  const handleDismiss = async (id) => {
    const currentProfile = currentUserProfile ?? (await getCurrentUser().catch(() => null));
    if (currentProfile?.id) {
      // For connection notifications, also dismiss the legacy
      // "notification-*" variant so older dismissal records stay in sync.
      const idsToDismiss = [id];
      if (typeof id === "string" && id.startsWith("connection-")) {
        idsToDismiss.push(id.replace("connection-", "notification-"));
      } else if (typeof id === "string" && id.startsWith("notification-")) {
        idsToDismiss.push(id.replace("notification-", "connection-"));
      }

      await Promise.all(
        idsToDismiss.map((dismissId) =>
          dismissNotification(currentProfile.id, dismissId).catch(() => {}),
        ),
      );
    }
    triggerLayoutAnimation();
    setNotifications((curr) => curr.filter((item) => item.id !== id));
  };

  const handleAcceptConnection = async (connectionId, notificationId) => {
    try {
      await acceptConnectionRequest(connectionId);
      handleDismiss(notificationId);
    } catch (err) { console.error(err); }
  };

  const handleRejectConnection = async (connectionId, notificationId) => {
    try {
      await rejectConnectionRequest(connectionId);
      handleDismiss(notificationId);
    } catch (err) { console.error(err); }
  };

  const handleMarkAllAsRead = async () => {
    if (filteredNotifications.length === 0) return;
    const currentProfile = currentUserProfile ?? (await getCurrentUser().catch(() => null));
    const idsToDismiss = filteredNotifications.map((n) => n.id);
    
    triggerLayoutAnimation();
    setNotifications((curr) => curr.filter(n => !idsToDismiss.includes(n.id)));

    if (currentProfile?.id) {
      Promise.all(idsToDismiss.map((id) => dismissNotification(currentProfile.id, id).catch(() => {})));
    }
  };

  const handleNotificationPress = async (item) => {
    if (item.type === "perk") {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("perks").select("status, valid_until").eq("id", item.target_id).single();
      if (error || !data || data.status !== 1 || data.valid_until < today) {
        Alert.alert("Perk Unavailable", "This perk has expired or is no longer available.");
        handleDismiss(item.id);
        return;
      }
      handleDismiss(item.id);
      navigation.navigate("ViewPerkScreen", { perkId: item.target_id });
      return;
    }

    handleDismiss(item.id);

    if (item.type === "connection") {
      if (item.actor?.id) navigation.navigate("ProfileView", { userId: item.actor.id });
    } else if (item.type === "announcement") {
      navigation.navigate("Home", { screen: "Feed", params: { announcementId: item.target_id } });
    } else if (["comment", "reaction", "repost", "mention"].includes(item.type)) {
      navigation.navigate("Home", { screen: "Feed", params: { postId: item.target_id } });
    } else if (item.type === "message") {
      navigation.navigate("ConvoScreen", { contactId: item.actor?.id });
    } else if (item.type === "event") {
      navigation.navigate("Home", { screen: "EventsScreen", params: { eventId: item.target_id } });
    } else {
      setSelectedNotif(item);
      setIsModalVisible(true);
    }
  };

  const formatNotificationTime = (value) => {
    if (!value) return "";
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return "";
    const elapsedMinutes = Math.max(1, Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60)));
    if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `${elapsedHours}h`;
    return `${Math.floor(elapsedHours / 24)}d`;
  };

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3, 4, 5].map((key) => (
        <Animated.View key={key} style={[styles.skeletonCard, { opacity: pulseAnim }]}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonTextWrap}>
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLineLong} />
          </View>
        </Animated.View>
      ))}
    </View>
  );

  const renderNotificationItem = ({ item }) => {
    const isAnnouncement = item.type === "announcement";
    const isPerk = item.type === "perk";
    const isUniversityEntity = isAnnouncement || isPerk;
    
    const name = `${item?.actor?.first_name ?? ""} ${item?.actor?.last_name ?? ""}`.trim() || "Someone";
    const time = formatNotificationTime(item.created_at);
    const avatarUri = isUniversityEntity 
      ? Image.resolveAssetSource(require("../../assets/images/nulogo.png")).uri
      : getAvatarUri(name, item?.actor?.alumni_photo);

    let actionText = "";
    if (isAnnouncement) actionText = "posted an announcement.";
    else if (isPerk) actionText = `posted a new perk: ${item.perk_title}`;
    else if (item.type === "comment") actionText = "commented on your post.";
    else if (item.type === "reaction") {
      actionText = item.isGrouped ? `and ${item.groupCount - 1} others liked your post.` : "liked your post.";
    }
    else if (item.type === "repost") actionText = "reposted your post.";
    else if (item.type === "connection") actionText = "sent you a connection request.";
    else if (item.type === "mention") actionText = "mentioned you.";
    else if (item.type === "message") actionText = "sent you a message.";
    else if (item.type === "event") actionText = "posted a new event.";
    else actionText = "sent a notification.";

    return (
      <TouchableOpacity 
        style={[styles.cardUnread]} 
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.unreadDot} />
        <Image 
          source={isUniversityEntity ? require("../../assets/images/nulogo.png") : { uri: avatarUri }} 
          style={styles.avatar} 
          resizeMode={isUniversityEntity ? "contain" : "cover"}
        />
        <View style={styles.textContainer}>
          <Text style={styles.messageText}>
            <Text style={styles.nameText}>{name}</Text>
            <Text>{` ${actionText} `}</Text>
            <Text style={styles.timeText}>{time}</Text>
          </Text>

          {item.type === "connection" && (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptConnection(item.db_id, item.id)}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleRejectConnection(item.db_id, item.id)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        
        {/* Header with shadow wrapper */}
        <View style={styles.headerWrapper}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="#FBD117" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
            <TouchableOpacity 
              style={[styles.markReadButton, filteredNotifications.length === 0 && styles.markReadDisabled]}
              onPress={handleMarkAllAsRead} 
              disabled={filteredNotifications.length === 0} 
              hitSlop={10}
            >
              <Text style={[styles.markReadText, filteredNotifications.length === 0 && styles.markReadTextDisabled]}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={FILTERS}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterContainer}
            renderItem={({ item }) => {
              const isActive = activeFilter === item;
              return (
                <TouchableOpacity 
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => { triggerLayoutAnimation(); setActiveFilter(item); }}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Content */}
        {isLoading ? (
          renderSkeleton()
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={renderNotificationItem}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchNotifications(true)} tintColor="#31429B" />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="checkmark-done-circle" size={56} color="#8AA0E8" />
                </View>
                <Text style={styles.emptyTitle}>You're all caught up!</Text>
                <Text style={styles.emptySub}>Check back later for new alerts.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Bottom spacer to keep bottom white */}
      <View style={styles.bottomSpacer} />

      {/* Fallback Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsModalVisible(false)} />
          {selectedNotif && (
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Notification Details</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}