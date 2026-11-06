import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated as RNAnimated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";
import HomeHeader from "../components/HomeHeader";
import AvatarInitials from "../components/AvatarInitials";
import styles from "../styles/ProfileViewScreen.styles";
import { getAlumniProfile } from "../services/alumniQueries";
import { sortWorkExperiences } from "../utils/workExperience";
import {
  getUserPosts,
  getPostById,
  getPostComments,
  addComment,
  addReaction,
  removeReaction,
  createRepost,
  updateComment,
  deleteComment,
} from "../services/postQueries";
import {
  getFollowers,
  getFollowing,
  rejectFollowRequest,
  sendFollowRequest,
  unfollowUser,
} from "../services/connectionQueries";
import { getCurrentUser } from "../services/supabaseAuth";
import { ThemedAlert } from "../components/ThemedAlert";
import { getAvatarUri } from "../utils/imageUtils";
import supabase from "../services/supabase";
import { sendPushNotification } from "../services/NotificationSender";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";

// ==============================================
// HELPERS
// ==============================================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const VIEWER_IMAGE_WIDTH = SCREEN_WIDTH * 0.92;
const VIEWER_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.72;
const MENTION_PATTERN = /(@[a-zA-Z0-9_.-]+)/g;
const SWIPE_DISMISS_THRESHOLD = 100;
const POSTS_PAGE_SIZE = 10;

const REPORT_REASONS = [
  "Spam or Fraud",
  "Nudity or Sexual Content",
  "Hate Speech or Symbols",
  "Violence or Dangerous Organizations",
  "Bullying or Harassment",
  "Sale of Illegal or Regulated Goods",
  "Intellectual Property Violation",
  "False Information",
  "Other",
];

const hasValidProfilePhoto = (rawPhoto) =>
  rawPhoto &&
  typeof rawPhoto === "string" &&
  rawPhoto.trim() !== "" &&
  !rawPhoto.includes("undefined") &&
  !rawPhoto.includes("null");

const getRelativeTimeLabel = (dateValue) => {
  if (!dateValue) return "";
  const normalizedValue =
    typeof dateValue === "string"
      ? dateValue.includes("T")
        ? dateValue
        : dateValue.replace(" ", "T")
      : dateValue;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "";
  const elapsedMs = Date.now() - date.getTime();
  const elapsedSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedSeconds < 60) return "Just now";
  if (elapsedDays >= 7) return `${Math.floor(elapsedDays / 7)}w`;
  if (elapsedDays >= 1) return `${elapsedDays}d`;
  if (elapsedHours >= 1) return `${elapsedHours}h`;
  if (elapsedMinutes >= 1) return `${elapsedMinutes}m`;
  return "Just now";
};

const getFeedItemDateValue = (item) =>
  item?.created_at ?? item?.date_posted ?? item?.posted_at ?? item?.published_at ?? null;

const extractMentionQuery = (value) => {
  const match = String(value ?? "").match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);
  return match
    ? {
        query: match[2] ?? "",
        mentionStart: String(value ?? "").length - (match[2] ?? "").length - 1,
        mentionEnd: String(value ?? "").length,
      }
    : null;
};

const toMentionHandle = (f, l) =>
  `${f ?? ""}_${l ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "alumni";

const GALAXY_STARS = [
  { top: "8%", left: "10%", width: 3, height: 3, opacity: 0.7 },
  { top: "18%", left: "25%", width: 2, height: 2, opacity: 0.5 },
  { top: "28%", left: "50%", width: 3, height: 3, opacity: 0.7 },
  { top: "35%", left: "48%", width: 6, height: 6, opacity: 1, shadowRadius: 10 },
  { top: "42%", left: "80%", width: 3, height: 3, opacity: 0.8 },
  { top: "52%", left: "15%", width: 3, height: 3, opacity: 0.8 },
  { top: "65%", left: "70%", width: 2, height: 2, opacity: 0.5 },
  { top: "75%", left: "18%", width: 2, height: 2, opacity: 0.5 },
  { top: "85%", left: "10%", width: 4, height: 4, opacity: 0.8 },
  { top: "90%", left: "50%", width: 1, height: 1, opacity: 0.5 },
  { top: "20%", left: "80%", width: 14, height: 14, opacity: 0.2, backgroundColor: "#FFD404", shadowRadius: 20 },
  { top: "75%", right: "75%", width: 18, height: 18, opacity: 0.15, backgroundColor: "#9333EA", shadowRadius: 25 },
];

// ==============================================
// OPTIMIZED IMAGE
// ==============================================
const getOptimizedImageUrl = (path, width = 720, height = null) => {
  if (!path) return null;
  const imagePath = String(path);
  const transformImageUrl = (url) => {
    const base = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    const params = [`width=${width}&quality=75`];
    if (height) params.push(`height=${height}`);
    return base.concat(url.includes("?") ? "&" : "?", params.join("&"));
  };
  if (imagePath.startsWith("http")) {
    return imagePath.includes("/storage/v1/object/public/") ? transformImageUrl(imagePath) : imagePath;
  }
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const bucket = "luminus_assets";
  const params = [`width=${width}&quality=75`];
  if (height) params.push(`height=${height}`);
  return `${baseUrl}/storage/v1/render/image/public/${bucket}/${imagePath}?${params.join("&")}`;
};

const getRawImageUrl = (path) => {
  if (!path) return null;
  const imagePath = String(path);
  if (imagePath.startsWith("http")) {
    return imagePath
      .replace("/storage/v1/render/image/public/", "/storage/v1/object/public/")
      .split("?")[0];
  }
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const bucket = "luminus_assets";
  const cleanPath = imagePath.replace(/^\/+/, "");
  return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
};

const OptimizedImage = ({ uri, style, resizeMode = "cover", thumbnail = false, cache = "disk", raw = false }) => {
  const [imageUri, setImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uri) {
      setImageUri(null);
      setIsLoading(false);
      return;
    }
    if (raw) setImageUri(getRawImageUrl(uri));
    else if (thumbnail) setImageUri(getOptimizedImageUrl(uri, 320, 320));
    else setImageUri(getOptimizedImageUrl(uri, 720));
    setIsLoading(false);
  }, [uri, thumbnail, raw]);

  if (!imageUri || isLoading) return <View style={[style, { backgroundColor: "#F3F4F6" }]} />;

  return (
    <ExpoImage
      source={{ uri: imageUri }}
      style={style}
      contentFit={resizeMode === "cover" ? "cover" : "contain"}
      cachePolicy={cache}
      transition={200}
    />
  );
};

// ==============================================
// VIDEO COMPONENTS
// ==============================================
const ZoomableVideo = ({ uri, style, posterUri }) => {
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("statusChange", (status) => {
      if (status.status === "error") setError("Failed to load video");
      if (status.status === "readyToPlay") {
        setIsReady(true);
        try { player.play(); } catch (e) {}
      }
    });
    if (player.status === "readyToPlay") {
      setIsReady(true);
      try { player.play(); } catch (e) {}
    }
    return () => sub.remove();
  }, [player]);

  if (error) {
    return (
      <View style={[style, { backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center" }]}>
        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        <Text style={{ color: "#94A3B8", marginTop: 8, fontSize: 12 }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <VideoView style={{ width: "100%", height: "100%" }} player={player} contentFit="contain" nativeControls={true} />
      {!isReady && posterUri && (
        <View style={StyleSheet.absoluteFillObject}>
          <ExpoImage source={{ uri: posterUri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
          <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        </View>
      )}
    </View>
  );
};

const PostFeedVideo = ({ uri, style, onLayoutRatio, posterUri, isActive, onTap }) => {
  const [videoFit, setVideoFit] = useState("cover");
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const player = useVideoPlayer(isActive ? uri : null, (p) => {
    if (p) {
      p.loop = true;
      p.muted = true;
    }
  });

  useEffect(() => {
    if (player) player.muted = isMuted;
  }, [isMuted, player]);

  const onLayoutRatioRef = useRef(onLayoutRatio);
  useEffect(() => {
    onLayoutRatioRef.current = onLayoutRatio;
  }, [onLayoutRatio]);

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("statusChange", (status) => {
      if (status.status === "error") {
        setError("Failed to load video");
        return;
      }
      if (status.status === "readyToPlay") {
        setIsReady(true);
        const size = player.naturalSize;
        if (size?.width > 0 && size?.height > 0) {
          if (onLayoutRatioRef.current) onLayoutRatioRef.current(size.width, size.height);
          setVideoFit(size.width > size.height ? "contain" : "cover");
        }
      }
    });
    if (player.status === "readyToPlay") setIsReady(true);
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (!player || !isReady) return;
    if (isActive) {
      try { player.play(); } catch (e) {}
    } else {
      try { player.pause(); } catch (e) {}
    }
  }, [isActive, isReady, player]);

  if (error) {
    return (
      <View style={[style, { backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center" }]}>
        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        <Text style={{ color: "#94A3B8", marginTop: 8, fontSize: 12 }}>{error}</Text>
      </View>
    );
  }

  return (
    <Pressable style={style} onPress={onTap} activeOpacity={1}>
      {player ? (
        <VideoView
          style={{ width: "100%", height: "100%" }}
          player={player}
          contentFit={videoFit}
          nativeControls={false}
        />
      ) : null}
      {(!isReady || !player) && posterUri && (
        <View style={StyleSheet.absoluteFillObject}>
          <ExpoImage source={{ uri: posterUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.15)" }]}>
            <Ionicons name="play-circle" size={48} color="#FFFFFF" />
          </View>
        </View>
      )}
      {isReady && isMuted && (
        <View style={{ position: "absolute", bottom: 12, right: 12, backgroundColor: "rgba(0,0,0,0.6)", padding: 6, borderRadius: 20 }}>
          <Ionicons name="volume-mute" size={16} color="#FFFFFF" />
        </View>
      )}
    </Pressable>
  );
};

// ==============================================
// EXPANDABLE CAPTION
// ==============================================
const ExpandableCaption = React.memo(({ caption, captionStyle, onMentionPress, renderMentions }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const hasOverflow = lineCount > 3;

  return (
    <View style={styles.captionBlock}>
      <View style={styles.captionMeasureWrap} pointerEvents="none">
        <Text
          style={[captionStyle, styles.captionMeasureText]}
          onTextLayout={(e) => {
            const lines = e.nativeEvent.lines?.length ?? 0;
            if (lines !== lineCount) setLineCount(lines);
          }}
        >
          {caption}
        </Text>
      </View>
      <Text style={captionStyle} numberOfLines={isExpanded ? undefined : 3}>
        {renderMentions(caption, captionStyle, onMentionPress)}
      </Text>
      {hasOverflow && (
        <Pressable onPress={() => setIsExpanded((v) => !v)} style={styles.readMoreButton}>
          <Text style={styles.readMoreText}>{isExpanded ? "Show less" : "Read more"}</Text>
        </Pressable>
      )}
    </View>
  );
});

// ==============================================
// ZOOMABLE VIEWER
// ==============================================
const ZoomableViewer = ({
  images = [],
  initialIndex = 0,
  visible,
  post = null,
  viewerAuthorName = "",
  postAvatarUri = "",
  rawAuthorPhoto = null,
  timeLabel = "",
  postVisibilityLabel = "Public",
  reactionCount = 0,
  commentCount = 0,
  repostCount = 0,
  isReacted = false,
  isReposted = false,
  onRequestClose,
  onAuthorPress,
  onReactionPress,
  onCommentPress,
  onRepostPress,
  onMenuPress,
}) => {
  const pagerRef = useRef(null);
  const resolvedImages = images.filter((img) => Boolean(img?.uri));
  if (!visible || resolvedImages.length === 0) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onRequestClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      <View style={styles.viewerBackdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onRequestClose} />
        <View style={styles.viewerContent}>
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.viewerPager}
            contentContainerStyle={styles.viewerScrollContent}
          >
            {resolvedImages.map((img, i) => (
              <View key={img?.uri ?? i} style={styles.viewerScrollItem}>
                <View style={styles.viewerImageCard}>
                  <View style={styles.viewerImagePressable}>
                    {img.isVideo ? (
                      <ZoomableVideo
                        uri={img.videoUri || img.uri}
                        style={[styles.viewerImage, { width: VIEWER_IMAGE_WIDTH, height: VIEWER_IMAGE_HEIGHT }]}
                        posterUri={img.posterUri || img.thumbnailUri || null}
                      />
                    ) : (
                      <OptimizedImage
                        uri={img.uri}
                        style={[styles.viewerImage, { width: VIEWER_IMAGE_WIDTH, height: VIEWER_IMAGE_HEIGHT }]}
                        resizeMode="contain"
                        thumbnail={false}
                        raw={true}
                      />
                    )}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          {post && (
            <View style={styles.viewerFooter} pointerEvents="box-none">
              <View style={styles.viewerAuthorCard}>
                <Pressable onPress={onAuthorPress} style={styles.viewerAuthorPressable} hitSlop={8}>
                  {hasValidProfilePhoto(rawAuthorPhoto) && postAvatarUri ? (
                    <OptimizedImage uri={postAvatarUri} style={styles.viewerAuthorAvatar} thumbnail={true} />
                  ) : (
                    <AvatarInitials name={viewerAuthorName} size={36} style={styles.viewerAuthorAvatar} backgroundColor="#31429B" />
                  )}
                </Pressable>
                <View style={styles.viewerAuthorTextWrap}>
                  <Pressable onPress={onAuthorPress} hitSlop={8}>
                    <Text style={styles.viewerAuthorName}>{viewerAuthorName}</Text>
                  </Pressable>
                  <View style={styles.viewerAuthorMetaRow}>
                    <Text style={styles.viewerAuthorMeta}>{timeLabel}</Text>
                    <Text style={styles.viewerAuthorMetaSeparator}>•</Text>
                    <Ionicons name="earth-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.viewerAuthorMeta}>{postVisibilityLabel}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.viewerActionsRow}>
                <Pressable style={styles.viewerActionButton} onPress={onReactionPress}>
                  <Ionicons name={isReacted ? "heart" : "heart-outline"} size={18} color={isReacted ? "#EF4444" : "#FFFFFF"} />
                  <Text style={styles.viewerActionLabel}>Like</Text>
                </Pressable>
                <Pressable style={styles.viewerActionButton} onPress={onCommentPress}>
                  <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.viewerActionLabel}>Comment</Text>
                </Pressable>
                <Pressable style={styles.viewerActionButton} onPress={onRepostPress}>
                  <Ionicons name="repeat" size={18} color={isReposted ? "#15803D" : "#FFFFFF"} />
                  <Text style={styles.viewerActionLabel}>Repost</Text>
                </Pressable>
              </View>
              <View style={styles.viewerCountsRow}>
                <Text style={styles.viewerCountText}>{reactionCount} reactions</Text>
                <Text style={styles.viewerCountText}>{commentCount} comments</Text>
                <Text style={styles.viewerCountText}>{repostCount} reposts</Text>
              </View>
            </View>
          )}
          <View style={styles.viewerTopBar} pointerEvents="box-none">
            <Pressable style={styles.viewerTopButton} onPress={onRequestClose} hitSlop={10}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.viewerTopButton} onPress={onMenuPress} hitSlop={10}>
              <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==============================================
// MAIN SCREEN
// ==============================================
const ProfileViewScreen = ({ navigation, route }) => {
  const userId = route?.params?.userId;
  const { currentUserProfile } = useCurrentUserProfile();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const layout = { avatarSize: isTablet ? 140 : 120 };

  // ---------- Profile state ----------
  const [userData, setUserData] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resolvedConnectionsCount, setResolvedConnectionsCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userSkillsRaw, setUserSkillsRaw] = useState([]);

  // ---------- Pagination ----------
  const [isFetchingMorePosts, setIsFetchingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const postsPageRef = useRef(0);
  const postsLoadingInFlightRef = useRef(false);

  // ---------- Post interaction state ----------
  const [activeVideoPostId, setActiveVideoPostId] = useState(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [postImageRatios, setPostImageRatios] = useState({});
  const [reactionPulsePostId, setReactionPulsePostId] = useState(null);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerPost, setViewerPost] = useState(null);
  const [skillsModalVisible, setSkillsModalVisible] = useState(false);

  const [commentsVisible, setCommentsVisible] = useState(false);
  const [commentKeyboardHeight, setCommentKeyboardHeight] = useState(0);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentInputHeight, setCommentInputHeight] = useState(46);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [expandedCommentParents, setExpandedCommentParents] = useState({});

  const [repostComposerVisible, setRepostComposerVisible] = useState(false);
  const [activeRepostPost, setActiveRepostPost] = useState(null);
  const [repostCaptionDraft, setRepostCaptionDraft] = useState("");
  const [repostMentionContextVisible, setRepostMentionContextVisible] = useState(null);

  const [commentActionsVisible, setCommentActionsVisible] = useState(false);
  const [activeCommentActionComment, setActiveCommentActionComment] = useState(null);
  const [isCommentActionSaving, setIsCommentActionSaving] = useState(false);

  const [postActionsVisible, setPostActionsVisible] = useState(false);
  const [activePostActionPost, setActivePostActionPost] = useState(null);
  const [isPostActionSaving, setIsPostActionSaving] = useState(false);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState({ id: null, type: null });
  const [themedAlertState, setThemedAlertState] = useState({ visible: false, title: "", message: "", actions: [] });

  const [connections, setConnections] = useState([]);

  // ---------- Refs ----------
  const reactionPulseScale = useRef(new RNAnimated.Value(1)).current;
  const postActionsTranslateY = useRef(new RNAnimated.Value(0)).current;
  const repostComposerTranslateY = useRef(new RNAnimated.Value(0)).current;
  const commentsTranslateY = useRef(new RNAnimated.Value(0)).current;
  const postMediaTapTimeoutRef = useRef(null);
  const postMediaTapStateRef = useRef({ postKey: null, imageIndex: null });
  const commentsScrollViewRef = useRef(null);
  const postActionsSwipeStartRef = useRef(0);
  const repostComposerSwipeStartRef = useRef(0);
  const commentsSwipeStartRef = useRef(0);
  const isClosingRef = useRef(false);

  // ---------- Focus / app state ----------
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => setIsScreenFocused(true));
    const blurUnsub = navigation.addListener("blur", () => setIsScreenFocused(false));
    return () => {
      unsubscribe();
      blurUnsub();
    };
  }, [navigation]);

  // ---------- Keyboard ----------
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => setCommentKeyboardHeight(event.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setCommentKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 500,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    let bestVideo = null;
    let bestRatio = 0;
    for (const v of viewableItems) {
      const hasVideo = v.item.images?.some((img) => img.is_video || img.media_type === "video");
      if (!hasVideo) continue;
      const ratio = v.itemVisiblePercentRatio ?? v.percentVisible ?? 0;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestVideo = v.item;
      }
    }
    setActiveVideoPostId(bestVideo?.id ?? null);
  }).current;

const userSkills = useMemo(() => {
  // Primary source: dedicated alumni_skills query
  if (userSkillsRaw.length > 0) {
    return userSkillsRaw
      .map((s) => (typeof s === "string" ? s : s?.skill_name))
      .filter(Boolean);
  }
  // Fallback: in case getAlumniProfile returns a joined skills array
  if (Array.isArray(userData?.skills) && userData.skills.length > 0) {
    return userData.skills
      .map((s) =>
        typeof s === "string" ? s : s?.skill_name || s?.name || s?.skill || ""
      )
      .filter(Boolean);
  }
  return [];
}, [userSkillsRaw, userData]);

  const profileName = useMemo(() => {
    if (!userData) return "Alumni";
    return [userData.last_name, userData.first_name]
      .filter(Boolean)
      .join(", ")
      .replace(/, ([^,]+)$/, ", $1");
  }, [userData]);

  const profileImageUri = useMemo(() => getAvatarUri(profileName, userData?.alumni_photo), [profileName, userData]);
  const hasValidMainAvatar = hasValidProfilePhoto(userData?.alumni_photo);

  const postsCount = useMemo(
    () => profilePosts.filter((post) => (post?.feed_type ?? "post") !== "repost").length,
    [profilePosts]
  );

  const profileSummary = useMemo(
    () => ({
      classTag: userData?.year_graduated
        ? `Class of ${String(userData.year_graduated).match(/\d{4}/)?.[0] ?? String(userData.year_graduated).slice(0, 4)}`
        : "Alumni",
      sectionTag: userData?.program || "No Program Specified",
      connectionsCount: Number.isFinite(Number(userData?.connections_count))
        ? Number(userData.connections_count)
        : resolvedConnectionsCount,
      connectionStatus: userData?.connection_status || "none",
      postsCount,
      biographyText: userData?.alumni_bio || "",
    }),
    [postsCount, resolvedConnectionsCount, userData]
  );

  const isConnected = profileSummary.connectionStatus === "connected";
  const isPendingConnection = profileSummary.connectionStatus === "pending";
  const isConnectionActionDisabled = followLoading;

  const workExperiences = useMemo(() => {
    if (Array.isArray(userData?.work_experiences) && userData.work_experiences.length > 0) {
      return sortWorkExperiences(userData.work_experiences);
    }
    return [];
  }, [userData]);

  const mentionDirectory = useMemo(
    () =>
      (connections || []).map((c) => {
        const name = `${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim() || "Alumni";
        return {
          id: c?.id,
          name,
          handle: toMentionHandle(c?.first_name, c?.last_name),
          avatar: getAvatarUri(name, c?.alumni_photo),
          rawPhoto: c?.alumni_photo,
        };
      }),
    [connections]
  );

  const repostMentionContext = useMemo(() => extractMentionQuery(repostCaptionDraft), [repostCaptionDraft]);
  const commentMentionContext = useMemo(() => extractMentionQuery(commentDraft), [commentDraft]);

  const repostMentionSuggestions = useMemo(
    () =>
      repostMentionContext
        ? mentionDirectory
            .filter(
              (item) =>
                !repostMentionContext.query.toLowerCase() ||
                item.name.toLowerCase().includes(repostMentionContext.query.toLowerCase()) ||
                item.handle.includes(repostMentionContext.query.toLowerCase())
            )
            .slice(0, 5)
        : [],
    [mentionDirectory, repostMentionContext]
  );

  const commentMentionSuggestions = useMemo(
    () =>
      commentMentionContext
        ? mentionDirectory
            .filter(
              (item) =>
                !commentMentionContext.query.toLowerCase() ||
                item.name.toLowerCase().includes(commentMentionContext.query.toLowerCase()) ||
                item.handle.includes(commentMentionContext.query.toLowerCase())
            )
            .slice(0, 5)
        : [],
    [commentMentionContext, mentionDirectory]
  );

  // ---------- Themed alert ----------
  const closeThemedAlert = useCallback(() => setThemedAlertState((c) => ({ ...c, visible: false })), []);
  const showThemedAlert = useCallback(
    ({ title, message, actions }) =>
      setThemedAlertState({ visible: true, title, message, actions: actions?.length ? actions : [{ text: "OK" }] }),
    []
  );
  const handleThemedAlertAction = (action) => {
    closeThemedAlert();
    if (typeof action?.onPress === "function") action.onPress();
  };

  // ---------- Helpers ----------
  const resolveActiveAlumniId = useCallback(async () => {
    if (currentUserId) return currentUserId;
    const u = await getCurrentUser().catch(() => null);
    return u?.id ?? null;
  }, [currentUserId]);

  const canManagePost = useCallback(
    (post) =>
      Boolean(
        post?.feed_type === "post" &&
          (post?.is_owner ||
            post?.can_manage ||
            String((post?.alumni ?? post?.author ?? {})?.id) === String(currentUserId))
      ),
    [currentUserId]
  );

  const canManageComment = useCallback(
    (c) => Boolean(currentUserId && String((c?.alumni ?? c?.author ?? {})?.id) === String(currentUserId)),
    [currentUserId]
  );

  const getPostVisibilityLabel = (post) =>
    post?.is_draft
      ? "Draft"
      : { private: "Private", friends: "Friends" }[String(post?.visibility ?? "").toLowerCase()] || "Public";

// ---------- Load skills ----------
const fetchSkills = useCallback(async () => {
  if (!userId) {
    setUserSkillsRaw([]);
    return;
  }
  try {
    const { data, error } = await supabase
      .from("alumni_skills")
      .select("id, skill_name, created_at")
      .eq("alumni_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching skills:", error);
      setUserSkillsRaw([]);
      return;
    }
    console.log("Fetched skills for", userId, "=>", data);
    setUserSkillsRaw(data ?? []);
  } catch (e) {
    console.error("Error fetching skills:", e);
    setUserSkillsRaw([]);
  }
}, [userId]);

  // ---------- Load profile ----------
  const loadProfile = async ({ showLoading = true } = {}) => {
    if (!userId) {
      setErrorMessage("Missing profile information.");
      setProfileLoading(false);
      setPostsLoading(false);
      return;
    }
    try {
      if (showLoading) {
        setProfileLoading(true);
        setPostsLoading(true);
      }
      setErrorMessage("");

      const currentUser = await getCurrentUser().catch(() => null);
      setCurrentUserId(currentUser?.id ?? null);

      const profile = await getAlumniProfile(userId, currentUser?.id ?? null);
      setUserData(profile ?? null);
      setProfileLoading(false);

      const [followingRows, followerRows] = await Promise.all([
        getFollowing(userId).catch(() => []),
        getFollowers(userId).catch(() => []),
      ]);

      const connectionIds = new Set();
      (followingRows || []).forEach((row) => {
        if (row?.followed?.id) connectionIds.add(row.followed.id);
      });
      (followerRows || []).forEach((row) => {
        if (row?.follower?.id) connectionIds.add(row.follower.id);
      });
      setResolvedConnectionsCount(connectionIds.size);

      // Fetch first page of posts
      postsPageRef.current = 0;
      setHasMorePosts(true);
      
      const firstPage = await getUserPosts(
        userId,
        POSTS_PAGE_SIZE,
        0,
        currentUser?.id ?? null   // ⬅️ ADD THIS
      ).catch(() => []);

      setProfilePosts(Array.isArray(firstPage) ? firstPage : []);
      postsPageRef.current = 1;
      setHasMorePosts((firstPage?.length ?? 0) === POSTS_PAGE_SIZE);
    } catch (fetchError) {
      setErrorMessage("Unable to load this profile right now.");
    } finally {
      setProfileLoading(false);
      setPostsLoading(false);
    }
  };

useEffect(() => {
  loadProfile();
}, [userId]);

useEffect(() => {
  fetchSkills();
}, [fetchSkills]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProfile({ showLoading: false });
    setIsRefreshing(false);
  };

  // ---------- Load more ----------
  const handleLoadMore = useCallback(async () => {
    if (postsLoadingInFlightRef.current || !hasMorePosts || !userId) return;
    postsLoadingInFlightRef.current = true;
    setIsFetchingMorePosts(true);
    try {

      // LOAD MORE
      const nextPage = await getUserPosts(
        userId,
        POSTS_PAGE_SIZE,
        postsPageRef.current * POSTS_PAGE_SIZE,
        currentUserId ?? null   // ⬅️ ADD THIS
      ).catch(() => []);

      const merged = Array.isArray(nextPage) ? nextPage : [];
      setProfilePosts((curr) => {
        const seen = new Set(curr.map((p) => p.id));
        return [...curr, ...merged.filter((p) => !seen.has(p.id))];
      });
      postsPageRef.current += 1;
      setHasMorePosts(merged.length === POSTS_PAGE_SIZE);
    } catch (e) {
      setHasMorePosts(false);
    } finally {
      postsPageRef.current = postsPageRef.current;
      postsLoadingInFlightRef.current = false;
      setIsFetchingMorePosts(false);
    }
  }, [hasMorePosts, userId, currentUserId]);

  // ---------- Connection actions ----------
  const openConversation = () => {
    if (!isConnected) {
      ThemedAlert.alert("Message unavailable", "You can only message alumni after you are connected with them.");
      return;
    }
    navigation.navigate("ConvoScreen", { contactId: userId, contactName: profileName, contactAvatar: profileImageUri });
  };

  const handleAddConnection = async () => {
    if (!userId || followLoading) return;
    try {
      setFollowLoading(true);
      const currentUser = await getCurrentUser().catch(() => null);
      if (!currentUser?.id) {
        ThemedAlert.alert("Connection failed", "Please sign in again to send a connection request.");
        return;
      }
      const followRequest = await sendFollowRequest(currentUser.id, userId);
      setUserData((current) => (current ? { ...current, connection_status: "pending" } : current));

      const senderName = currentUserProfile?.first_name || "Someone";
      const { data: targetUser } = await supabase
        .from("alumnis_base")
        .select("push_token")
        .eq("id", userId)
        .single();

      if (targetUser?.push_token) {
        await sendPushNotification(
          [targetUser.push_token],
          "New Connection Request 🤝",
          `${senderName} wants to connect with you!`,
          {
            type: "connection_request",
            senderId: currentUser.id,
            connectionId: followRequest?.id ?? null,
          },
        );
      }

      ThemedAlert.alert("Connection updated", "Connection request sent.");
    } catch (followError) {
      ThemedAlert.alert("Connection failed", "Unable to add this connection right now.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCancelPendingRequestConfirmed = async () => {
    if (!userId || followLoading || !isPendingConnection) return;
    try {
      setFollowLoading(true);
      const currentUser = await getCurrentUser().catch(() => null);
      if (!currentUser?.id) return;
      await rejectFollowRequest(currentUser.id, userId);
      setUserData((current) => (current ? { ...current, connection_status: "none" } : current));
      ThemedAlert.alert("Request cancelled", "Connection request cancelled.");
    } catch (cancelError) {
      ThemedAlert.alert("Cancel request failed", "Unable to cancel this request right now.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRemoveConnectionConfirmed = async () => {
    if (!userId || followLoading || !isConnected) return;
    try {
      setFollowLoading(true);
      const currentUser = await getCurrentUser().catch(() => null);
      if (!currentUser?.id) return;
      await unfollowUser(currentUser.id, userId);
      setUserData((current) => {
        if (!current) return current;
        return {
          ...current,
          connection_status: "none",
          connections_count: Math.max(0, Number(current.connections_count ?? 0) - 1),
        };
      });
      ThemedAlert.alert("Connection removed", "Connection removed successfully.");
    } catch (removeError) {
      ThemedAlert.alert("Remove connection failed", "Unable to remove this connection right now.");
    } finally {
      setFollowLoading(false);
    }
  };

  const confirmRemoveConnection = () => {
    ThemedAlert.alert("Remove connection", `Are you sure you want to remove the connection with ${profileName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => handleRemoveConnectionConfirmed() },
    ]);
  };

  const confirmCancelPendingRequest = () => {
    ThemedAlert.alert("Cancel connection request", `Do you want to cancel your connection request to ${profileName}?`, [
      { text: "Keep Pending", style: "cancel" },
      { text: "Cancel Request", style: "destructive", onPress: () => handleCancelPendingRequestConfirmed() },
    ]);
  };

  // ---------- Post interactions ----------
  const playReactionPulse = useCallback(
    (postId) => {
      setReactionPulsePostId(postId);
      reactionPulseScale.stopAnimation();
      reactionPulseScale.setValue(0.94);
      RNAnimated.sequence([
        RNAnimated.timing(reactionPulseScale, { toValue: 1.08, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        RNAnimated.spring(reactionPulseScale, { toValue: 1, tension: 140, friction: 14, useNativeDriver: true }),
      ]).start(() => setReactionPulsePostId((c) => (c === postId ? null : c)));
    },
    [reactionPulseScale]
  );

  const handlePostReaction = useCallback(
    async (post) => {
      playReactionPulse(post.id);
      const nextReaction = post.my_reaction ? null : "like";
      const postId = post.id;

      setProfilePosts((curr) =>
        curr.map((p) =>
          p.id === postId
            ? {
                ...p,
                my_reaction: nextReaction,
                reaction_count: Math.max(0, (p.reaction_count ?? 0) + (nextReaction ? 1 : -1)),
              }
            : p
        )
      );
      setViewerPost((curr) =>
        curr && curr.id === postId
          ? {
              ...curr,
              my_reaction: nextReaction,
              reaction_count: Math.max(0, (curr.reaction_count ?? 0) + (nextReaction ? 1 : -1)),
            }
          : curr
      );

      try {
        const alumniId = await resolveActiveAlumniId();
        if (!alumniId) throw new Error("No alumni profile");
        if (nextReaction) await addReaction(postId, alumniId, "like", null);
        else await removeReaction(postId, alumniId, "like", null);
        const refreshed = await getPostById(postId, alumniId).catch(() => null);
        if (refreshed) {
          setProfilePosts((curr) =>
            curr.map((p) =>
              p.id === postId
                ? { ...p, reaction_count: refreshed.reactions_count ?? p.reaction_count, my_reaction: nextReaction }
                : p
            )
          );
        }
      } catch (e) {
        setProfilePosts((curr) =>
          curr.map((p) =>
            p.id === postId ? { ...p, my_reaction: post.my_reaction ?? null, reaction_count: post.reaction_count ?? 0 } : p
          )
        );
      }
    },
    [playReactionPulse, resolveActiveAlumniId]
  );

  const handlePostRepost = useCallback(
    async (post, caption = "") => {
      const nextRepostState = !post.my_repost;
      setProfilePosts((curr) =>
        curr.map((p) =>
          p.id === post.id
            ? { ...p, my_repost: nextRepostState, repost_count: Math.max(0, (p.repost_count ?? 0) + (nextRepostState ? 1 : -1)) }
            : p
        )
      );

      try {
        const alumniId = await resolveActiveAlumniId();
        if (!alumniId) throw new Error("No alumni profile");
        if (nextRepostState) await createRepost(post.id, alumniId, caption);
        else await supabase.from("reposts").delete().eq("post_id", post.id).eq("alumni_id", alumniId);
        const refreshed = await getPostById(post.id, alumniId).catch(() => null);
        if (refreshed) {
          setProfilePosts((curr) =>
            curr.map((p) =>
              p.id === post.id
                ? { ...p, repost_count: refreshed.reposts_count ?? p.repost_count, my_repost: nextRepostState }
                : p
            )
          );
        }
        return true;
      } catch (e) {
        setProfilePosts((curr) =>
          curr.map((p) =>
            p.id === post.id ? { ...p, my_repost: post.my_repost ?? false, repost_count: post.repost_count ?? 0 } : p
          )
        );
        showThemedAlert({ title: "Repost", message: "Unable to repost right now. Please try again." });
        return false;
      }
    },
    [resolveActiveAlumniId, showThemedAlert]
  );

  const openRepostComposer = useCallback(
    (post) => {
      if (post?.my_repost) {
        showThemedAlert({
          title: "Remove repost?",
          message: "This will remove your repost from the feed.",
          actions: [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: () => handlePostRepost(post) },
          ],
        });
        return;
      }
      setActiveRepostPost(post);
      setRepostCaptionDraft("");
      setRepostComposerVisible(true);
    },
    [showThemedAlert, handlePostRepost]
  );

  const closeRepostComposer = () => {
    setRepostComposerVisible(false);
    setActiveRepostPost(null);
    setRepostCaptionDraft("");
  };

  const submitRepostWithCaption = () => {
    if (activeRepostPost) {
      const post = activeRepostPost;
      const caption = repostCaptionDraft.trim();
      closeRepostComposer();
      handlePostRepost(post, caption);
    }
  };

  // ---------- Post media (open viewer) ----------
  const openImageViewer = (post, postImages, imageIndex) => {
    setViewerPost(post);
    setViewerImages(
      postImages.map((img) => {
        const isVideo = img?.is_video === true || img?.media_type === "video";
        if (isVideo) {
          const videoPath = img?.video_path || img?.image_path;
          const videoUri = videoPath
            ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/luminus_assets/${String(videoPath).replace(/^\/+/, "")}`
            : null;
          const thumbPath = img?.thumbnail_path || img?.thumbnail || img?.poster_path;
          const posterUri = thumbPath
            ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/luminus_assets/${String(thumbPath).replace(/^\/+/, "")}`
            : null;
          return { uri: posterUri || videoUri, videoUri, posterUri, isVideo: true };
        }
        const raw = img?.image_url ?? img?.image_path ?? "";
        if (!raw) return { uri: null, isVideo: false };
        const fullUri = /^https?:\/\//i.test(raw)
          ? raw
          : `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/luminus_assets/${String(raw).replace(/^\/+/, "")}`;
        return { uri: fullUri, isVideo: false };
      })
    );
    setViewerIndex(imageIndex);
    setViewerVisible(true);
  };

  const closeImageViewer = () => {
    setViewerVisible(false);
    setViewerPost(null);
  };

  const handlePostMediaTap = useCallback(
    (post, postImages, imageIndex) => {
      const postKey = post.id;
      const sameTapTarget =
        postMediaTapStateRef.current.postKey === postKey && postMediaTapStateRef.current.imageIndex === imageIndex;

      if (postMediaTapTimeoutRef.current) {
        clearTimeout(postMediaTapTimeoutRef.current);
        postMediaTapTimeoutRef.current = null;
      }

      if (sameTapTarget) {
        postMediaTapStateRef.current = { postKey: null, imageIndex: null };
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!post.my_reaction) handlePostReaction(post);
        playReactionPulse(post.id);
        return;
      }

      postMediaTapStateRef.current = { postKey, imageIndex };
      postMediaTapTimeoutRef.current = setTimeout(() => {
        postMediaTapTimeoutRef.current = null;
        postMediaTapStateRef.current = { postKey: null, imageIndex: null };
        openImageViewer(post, postImages, imageIndex);
      }, 200);
    },
    [handlePostReaction, playReactionPulse]
  );

  useEffect(
    () => () => {
      if (postMediaTapTimeoutRef.current) {
        clearTimeout(postMediaTapTimeoutRef.current);
        postMediaTapTimeoutRef.current = null;
      }
    },
    []
  );

  // ---------- Comments ----------
  const handlePostComment = useCallback(
    (post) => {
      isClosingRef.current = false;
      setActiveCommentPost(post);
      setReplyingToComment(null);
      setCommentDraft("");
      setComments([]);
      setCommentsError("");
      setExpandedCommentParents({});
      commentsTranslateY.setValue(SCREEN_HEIGHT);
      setCommentsVisible(true);
      requestAnimationFrame(() => {
        RNAnimated.timing(commentsTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      });
    },
    [commentsTranslateY]
  );

  const handleReplyToComment = useCallback((c) => {
    setReplyingToComment(c);
    setEditingComment(null);
  }, []);

  const closeCommentsModal = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    RNAnimated.timing(commentsTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setCommentsVisible(false);
      setActiveCommentPost(null);
      setReplyingToComment(null);
      setEditingComment(null);
      setCommentDraft("");
      setCommentInputHeight(48);
      setExpandedCommentParents({});
      commentsSwipeStartRef.current = 0;
      setTimeout(() => {
        isClosingRef.current = false;
      }, 120);
    });
  };

  const handleCommentInputContentSizeChange = (e) =>
    setCommentInputHeight(Math.max(48, Math.min(e?.nativeEvent?.contentSize?.height ?? 48, 100)));

  const handleSubmitComment = () => {
    const trimmedComment = commentDraft.trim();
    if (!trimmedComment || !activeCommentPost) return;
    const targetPostId = activeCommentPost.id;

    if (editingComment?.id) {
      const prevText = editingComment.comment ?? editingComment.body ?? editingComment.text ?? "";
      setComments((curr) => curr.map((c) => (c.id === editingComment.id ? { ...c, comment: trimmedComment } : c)));
      setEditingComment(null);
      setReplyingToComment(null);
      setCommentDraft("");
      setCommentInputHeight(48);
      updateComment(editingComment.id, trimmedComment)
        .then((saved) => {
          if (saved) setComments((curr) => curr.map((c) => (c.id === saved.id ? saved : c)));
        })
        .catch((e) => {
          setComments((curr) =>
            curr.map((c) => (c.id === editingComment.id ? { ...c, comment: prevText } : c))
          );
          showThemedAlert({ title: "Comments", message: "Unable to update your comment right now." });
        });
      return;
    }

    const pendingId = `temp-${Date.now()}`;
    const pendingComment = {
      id: pendingId,
      comment: trimmedComment,
      parent_id: replyingToComment?.id ?? null,
      created_at: new Date().toISOString(),
      is_pending: true,
      alumni: { id: currentUserId, first_name: userData?.first_name, last_name: userData?.last_name, alumni_photo: userData?.alumni_photo },
    };
    setComments((curr) => [pendingComment, ...curr]);
    setProfilePosts((curr) =>
      curr.map((p) => (p.id === targetPostId ? { ...p, comment_count: (p.comment_count ?? 0) + 1 } : p))
    );
    setReplyingToComment(null);
    setEditingComment(null);
    setCommentDraft("");
    setCommentInputHeight(48);

    resolveActiveAlumniId()
      .then((alumniId) => addComment(targetPostId, alumniId, trimmedComment, pendingComment.parent_id, null))
      .then((saved) => {
        if (saved) {
          setComments((curr) => curr.map((c) => (c.id === pendingId ? saved : c)));
          setProfilePosts((curr) =>
            curr.map((p) => (p.id === targetPostId ? { ...p, comment_count: saved.comment_count ?? p.comment_count ?? 0 } : p))
          );
        }
      })
      .catch((e) => {
        setComments((curr) => curr.filter((c) => c.id !== pendingId));
        setProfilePosts((curr) =>
          curr.map((p) =>
            p.id === targetPostId ? { ...p, comment_count: Math.max(0, (p.comment_count ?? 1) - 1) } : p
          )
        );
        showThemedAlert({ title: "Comments", message: "Unable to post your comment right now." });
      });
  };

  useEffect(() => {
    if (!commentsVisible || !activeCommentPost) return;
    let isMounted = true;
    const fetchComments = async () => {
      try {
        setCommentsLoading(true);
        setCommentsError("");
        const res = await getPostComments(activeCommentPost.id, 20, null);
        if (isMounted) setComments(res ?? []);
      } catch (e) {
        if (isMounted) setCommentsError("Unable to load comments right now.");
      } finally {
        if (isMounted) setCommentsLoading(false);
      }
    };
    fetchComments();
    return () => {
      isMounted = false;
    };
  }, [activeCommentPost, commentsVisible]);

  const toggleCommentReplies = (id) => setExpandedCommentParents((curr) => ({ ...curr, [id]: !curr[id] }));

  const commentTree = useMemo(() => {
    const repliesByParentId = new Map();
    const topLevelComments = [];
    comments.forEach((c) => {
      if (c?.parent_id) {
        const reps = repliesByParentId.get(c.parent_id) ?? [];
        reps.push(c);
        repliesByParentId.set(c.parent_id, reps);
      } else topLevelComments.push(c);
    });
    const buildChildren = (p) => (repliesByParentId.get(p.id) ?? []).map((c) => ({ comment: c, replies: buildChildren(c) }));
    return topLevelComments.map((c) => ({ comment: c, replies: buildChildren(c) }));
  }, [comments]);

  const renderCommentNode = (thread, depth = 0, parentComment = null) => {
    const { comment, replies } = thread;
    const isExpanded = Boolean(expandedCommentParents[comment.id]);
    const canManageThisComment = canManageComment(comment);
    const authorName =
      depth > 0
        ? comment?.alumni?.first_name ?? "Alumni"
        : [comment?.alumni?.first_name, comment?.alumni?.last_name].filter(Boolean).join(" ").trim() || "Alumni";

    return (
      <View key={`comment-${String(comment?.id ?? `${depth}-${parentComment?.id ?? "root"}`)}`} style={styles.commentThread}>
        <View style={[styles.commentItem, depth > 0 ? styles.commentItemReply : null]}>
          {hasValidProfilePhoto(comment?.alumni?.alumni_photo) ? (
            <ExpoImage
              source={{ uri: getAvatarUri(authorName, comment?.alumni?.alumni_photo) }}
              style={styles.commentAvatar}
              contentFit="cover"
            />
          ) : (
            <AvatarInitials name={authorName} size={32} style={styles.commentAvatar} backgroundColor="#31429B" />
          )}
          <View style={styles.commentContentColumn}>
            <View style={styles.commentReplyHeaderRow}>
              <Text style={styles.commentAuthorName}>{authorName}</Text>
              {depth > 0 && parentComment && (
                <Text style={styles.commentReplyingToHandle} numberOfLines={1}>
                  ▸ {parentComment?.alumni?.first_name ?? "Alumni"}
                </Text>
              )}
            </View>
            <Text style={styles.commentText}>{comment.comment ?? comment.body ?? comment.text ?? ""}</Text>
            <View style={styles.commentMetaRow}>
              <Text style={styles.commentTimestamp}>{getRelativeTimeLabel(comment.created_at)}</Text>
              <Pressable style={styles.commentReplyButton} onPress={() => handleReplyToComment(comment)}>
                <Text style={styles.commentReplyButtonText}>Reply</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.commentActionColumn}>
            <Pressable style={styles.commentActionButton} onPress={() => openCommentActions(comment)} hitSlop={8}>
              <Ionicons name="ellipsis-vertical" size={14} color={canManageThisComment ? "#31429B" : "#94A3B8"} />
            </Pressable>
          </View>
        </View>
        {depth === 0 && replies.length > 0 && !isExpanded && (
          <Pressable style={styles.viewRepliesRow} onPress={() => toggleCommentReplies(comment.id)}>
            <View style={styles.viewRepliesLine} />
            <Text style={styles.viewRepliesText}>View {replies.length} replies</Text>
            <Ionicons name="chevron-down" size={13} color="#94A3B8" />
          </Pressable>
        )}
        {replies.length > 0 && (depth === 0 ? isExpanded : true) && (
          <View style={depth === 0 ? styles.commentRepliesList : styles.commentNestedRepliesList}>
            {replies.map((r) => renderCommentNode(r, depth + 1, comment))}
            {depth === 0 && (
              <Pressable style={styles.hideRepliesRow} onPress={() => toggleCommentReplies(comment.id)}>
                <View style={styles.viewRepliesLine} />
                <Text style={styles.hideRepliesText}>Hide replies</Text>
                <Ionicons name="chevron-up" size={13} color="#31429B" />
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  // ---------- Comment actions ----------
  const openCommentActions = useCallback((comment) => {
    setActiveCommentActionComment(comment);
    setCommentActionsVisible(true);
  }, []);

  const closeCommentActions = useCallback(() => {
    if (!isCommentActionSaving) {
      setCommentActionsVisible(false);
      setActiveCommentActionComment(null);
    }
  }, [isCommentActionSaving]);

  const handleEditComment = useCallback(() => {
    if (!activeCommentActionComment?.id) return;
    setCommentActionsVisible(false);
    setEditingComment(activeCommentActionComment);
    setReplyingToComment(null);
    setCommentDraft(activeCommentActionComment.comment ?? "");
    commentsTranslateY.setValue(SCREEN_HEIGHT);
    setCommentsVisible(true);
  }, [activeCommentActionComment, commentsTranslateY]);

  const handleDeleteCommentAction = useCallback(() => {
    if (!activeCommentActionComment?.id) return;
    showThemedAlert({
      title: "Delete comment?",
      message: "This action cannot be undone.",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsCommentActionSaving(true);
              await deleteComment(activeCommentActionComment.id);
              setComments((curr) => curr.filter((c) => c.id !== activeCommentActionComment.id));
              setProfilePosts((curr) =>
                curr.map((p) =>
                  p.id === activeCommentPost?.id ? { ...p, comment_count: Math.max(0, (p.comment_count ?? 1) - 1) } : p
                )
              );
              closeCommentActions();
            } catch (error) {
              showThemedAlert({ title: "Delete failed", message: "Unable to delete the comment right now." });
            } finally {
              setIsCommentActionSaving(false);
            }
          },
        },
      ],
    });
  }, [activeCommentActionComment, activeCommentPost?.id, closeCommentActions, showThemedAlert]);

  // ---------- Post actions ----------
  const openPostActions = useCallback((post) => {
    setActivePostActionPost(post);
    setPostActionsVisible(true);
  }, []);

  const closePostActions = useCallback(() => {
    if (!isPostActionSaving) {
      setPostActionsVisible(false);
      setActivePostActionPost(null);
    }
  }, [isPostActionSaving]);

  const openPostReportModal = useCallback(() => {
    if (!activePostActionPost?.id) return;
    setReportTarget({ id: activePostActionPost.id, type: "post" });
    setPostActionsVisible(false);
    setTimeout(() => setReportModalVisible(true), 350);
  }, [activePostActionPost]);

  const submitReport = useCallback(
    async (reason) => {
      if (!reportTarget.id) return;
      setReportModalVisible(false);
      try {
        const currentUserId_ = currentUserId || (await resolveActiveAlumniId());
        if (!currentUserId_) throw new Error("User not authenticated");
        await supabase.from("post_reports").insert([{ post_id: reportTarget.id, reporter_id: currentUserId_, reason }]);
        setProfilePosts((curr) => curr.filter((p) => p.id !== reportTarget.id));
        showThemedAlert({ title: "Reported", message: "Thanks — we removed this post from your view." });
      } catch (e) {
        showThemedAlert({ title: "Reported", message: "You already reported this item, or an error occurred." });
      }
    },
    [reportTarget, currentUserId, resolveActiveAlumniId, showThemedAlert]
  );

  // ---------- Mention press ----------
  const handleCaptionMentionPress = useCallback(
    (mentionText) => {
      const mentionHandle = String(mentionText ?? "").replace(/^@/, "").toLowerCase();
      if (!mentionHandle) return;
      const matched = mentionDirectory.find((item) => item.handle === mentionHandle);
      if (!matched?.id) {
        showThemedAlert({ title: "Mention unavailable", message: `No profile found for @${mentionHandle}.` });
        return;
      }
      navigation.navigate(matched.id === currentUserId ? "Profile" : "ProfileView", { userId: matched.id });
    },
    [mentionDirectory, currentUserId, navigation, showThemedAlert]
  );

  const renderCaptionWithMentions = (caption, captionStyle) => {
    if (!caption) return null;
    return String(caption ?? "")
      .split(MENTION_PATTERN)
      .map((seg, idx) => {
        const isMention = MENTION_PATTERN.test(seg);
        MENTION_PATTERN.lastIndex = 0;
        return isMention ? (
          <Text
            key={`mention-${idx}-${seg}`}
            style={[captionStyle, styles.captionMention]}
            onPress={() => handleCaptionMentionPress(seg)}
          >
            {seg}
          </Text>
        ) : (
          <Text key={`caption-${idx}`}>{seg}</Text>
        );
      });
  };

  // ---------- Image layout ----------
  const renderPostImageUri = useCallback((image) => {
    const isVideo = image?.is_video === true || image?.media_type === "video";
    if (isVideo) {
      const thumbnailPath = image?.thumbnail_path || image?.thumbnail || image?.poster_path;
      if (thumbnailPath) {
        const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const cleanPath = String(thumbnailPath).replace(/^\/+/, "");
        return `${baseUrl}/storage/v1/object/public/luminus_assets/${cleanPath}`;
      }
      const videoPath = image?.video_path || image?.image_path || image?.image_url;
      if (videoPath) {
        const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const cleanPath = String(videoPath).replace(/^\/+/, "");
        return `${baseUrl}/storage/v1/object/public/luminus_assets/${cleanPath}`;
      }
      return null;
    }
    const raw = image?.image_url ?? image?.image_path ?? "";
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const cleanPath = String(raw).replace(/^\/+/, "");
    return `${baseUrl}/storage/v1/object/public/luminus_assets/${cleanPath}`;
  }, []);

  const getPostImageKey = (postId, image, imageIndex) => image.id ?? `${postId}-${imageIndex}`;
  const updatePostImageRatio = useCallback((k, w, h) => {
    if (w && h) {
      const r = w / h;
      setPostImageRatios((c) => (c[k] === r ? c : { ...c, [k]: r }));
    }
  }, []);

  const renderPressableImage = useCallback(
    (post, postImages, image, imageIndex, imageStyle, isActiveVideo) => {
      const videoUri = image?.video_path
        ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/luminus_assets/${image.video_path}`
        : renderPostImageUri(image);
      const thumbnailUri = renderPostImageUri(image);
      const isVideo = image?.is_video === true || image?.media_type === "video";

      if (isVideo && !videoUri) {
        return (
          <View style={[styles.postMediaImage, imageStyle, { backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center" }]}>
            <Ionicons name="videocam-off" size={40} color="#6B7280" />
            <Text style={{ color: "#6B7280", marginTop: 8, fontSize: 12 }}>Video unavailable</Text>
          </View>
        );
      }

      return (
        <>
          {isVideo ? (
            <PostFeedVideo
              uri={videoUri}
              style={[styles.postMediaImage, imageStyle]}
              onLayoutRatio={(w, h) => updatePostImageRatio(getPostImageKey(post?.id, image, imageIndex), w, h)}
              posterUri={thumbnailUri}
              isActive={isActiveVideo}
              onTap={() => handlePostMediaTap(post, postImages, imageIndex)}
            />
          ) : (
            <Pressable style={styles.postImagePressable} onPress={() => handlePostMediaTap(post, postImages, imageIndex)}>
              <OptimizedImage
                uri={renderPostImageUri(image)}
                style={[styles.postMediaImage, imageStyle]}
                resizeMode="cover"
                thumbnail={true}
              />
            </Pressable>
          )}
        </>
      );
    },
    [renderPostImageUri, handlePostMediaTap, updatePostImageRatio]
  );

  const renderPostImageLayout = (post, postId, postImages, isActiveVideo) => {
    if (postImages.length === 1)
      return (
        <View style={[styles.postSingleImageWrap, { aspectRatio: postImageRatios[getPostImageKey(postId, postImages[0], 0)] ?? 1.2 }]}>
          {renderPressableImage(post, postImages, postImages[0], 0, styles.postSingleImage, isActiveVideo)}
        </View>
      );
    if (postImages.length === 2)
      return (
        <View style={styles.postTwoGrid}>
          <View style={[styles.postTwoPrimaryTile, { aspectRatio: postImageRatios[getPostImageKey(postId, postImages[0], 0)] ?? 1.05 }]}>
            {renderPressableImage(post, postImages, postImages[0], 0, styles.postCollageImage, isActiveVideo)}
          </View>
          <View style={[styles.postTwoSecondaryTile, { aspectRatio: postImageRatios[getPostImageKey(postId, postImages[1], 1)] ?? 0.95 }]}>
            {renderPressableImage(post, postImages, postImages[1], 1, styles.postCollageImage, isActiveVideo)}
          </View>
        </View>
      );
    if (postImages.length === 3)
      return (
        <View style={styles.postThreeCollage}>
          <View style={styles.postThreeLeftTile}>
            {renderPressableImage(post, postImages, postImages[0], 0, styles.postCollageImage, isActiveVideo)}
          </View>
          <View style={styles.postThreeRightColumn}>
            <View style={styles.postThreeRightTile}>
              {renderPressableImage(post, postImages, postImages[1], 1, styles.postCollageImage, isActiveVideo)}
            </View>
            <View style={styles.postThreeRightTile}>
              {renderPressableImage(post, postImages, postImages[2], 2, styles.postCollageImage, isActiveVideo)}
            </View>
          </View>
        </View>
      );
    if (postImages.length === 4)
      return (
        <View style={styles.postFourGrid}>
          {postImages.slice(0, 4).map((image, idx) => (
            <View key={getPostImageKey(postId, image, idx)} style={styles.postFourGridTile}>
              {renderPressableImage(post, postImages, image, idx, styles.postCollageImage, isActiveVideo)}
            </View>
          ))}
        </View>
      );
    const remainingCount = Math.max(postImages.length - 4, 0);
    return (
      <View style={styles.postFivePlusGrid}>
        {postImages.slice(0, 4).map((image, idx) => (
          <View key={getPostImageKey(postId, image, idx)} style={styles.postFivePlusTile}>
            {renderPressableImage(post, postImages, image, idx, styles.postCollageImage, isActiveVideo)}
            {idx === 3 && remainingCount > 0 && (
              <Pressable style={styles.postImageOverlay} onPress={() => openImageViewer(post, postImages, idx)}>
                <Text style={styles.postImageOverlayText}>+{remainingCount}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    );
  };

  // ---------- Render post card ----------
  const renderPostCard = (item) => {
    const originalAuthor = item.feed_type === "repost" ? item.original_post?.alumni : null;
    const displayAuthor = originalAuthor || item.alumni;
    const postAuthorName =
      [displayAuthor?.first_name, displayAuthor?.last_name].filter(Boolean).join(" ").trim() || "Alumni";
    const reposterName =
      [item?.alumni?.first_name, item?.alumni?.last_name].filter(Boolean).join(" ").trim() || "Alumni";
    const avatarUri = getAvatarUri(postAuthorName, displayAuthor?.alumni_photo);
    const hasValidAvatar = hasValidProfilePhoto(displayAuthor?.alumni_photo);
    const isActiveVideo = isScreenFocused;

    return (
      <View key={item.feed_id ?? item.id} style={styles.postCard}>
        <View style={styles.postHeader}>
          <Pressable
            onPress={() =>
              navigation.navigate(displayAuthor?.id === currentUserId ? "Profile" : "ProfileView", { userId: displayAuthor?.id })
            }
          >
            {hasValidAvatar && avatarUri ? (
              <OptimizedImage uri={avatarUri} style={styles.postAvatar} thumbnail={true} />
            ) : (
              <AvatarInitials name={postAuthorName} size={40} style={styles.postAvatar} backgroundColor="#31429B" />
            )}
          </Pressable>
          <View style={styles.postHeaderTextWrap}>
            <Pressable
              onPress={() =>
                navigation.navigate(item.alumni?.id === currentUserId ? "Profile" : "ProfileView", { userId: item.alumni?.id })
              }
            >
              <Text style={styles.postAuthorName} numberOfLines={1}>
                {postAuthorName}
              </Text>
            </Pressable>
            <Text style={styles.postMeta}>
              {item.feed_type === "repost" ? `Reposted by ${reposterName} • ` : ""}
              {getRelativeTimeLabel(getFeedItemDateValue(item))}
              {" • "}
              <Ionicons name="globe-outline" size={10} color="#6B7280" /> Public
            </Text>
          </View>
          <Pressable style={styles.postMenuButton} onPress={() => openPostActions(item)} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#1F2937" />
          </Pressable>
        </View>

        <ExpandableCaption
          caption={item.caption}
          captionStyle={styles.postCaption}
          onMentionPress={handleCaptionMentionPress}
          renderMentions={renderCaptionWithMentions}
        />

        {item.images && item.images.length > 0 ? renderPostImageLayout(item, item.id, item.images, isActiveVideo) : null}

        <View style={styles.postReactionRow}>
          <Pressable style={styles.postActionButton} onPress={() => handlePostReaction(item)}>
            <RNAnimated.View style={reactionPulsePostId === item.id ? { transform: [{ scale: reactionPulseScale }] } : undefined}>
              <Ionicons
                name={item.my_reaction ? "heart" : "heart-outline"}
                size={22}
                color={item.my_reaction ? "#EF4444" : "#31429B"}
              />
            </RNAnimated.View>
            <Text style={styles.postActionCount}>{item.reaction_count ?? 0}</Text>
          </Pressable>
          <Pressable style={styles.postActionButton} onPress={() => handlePostComment(item)}>
            <Ionicons name="chatbubble-outline" size={20} color="#31429B" />
            <Text style={styles.postActionCount}>{item.comment_count ?? 0}</Text>
          </Pressable>
          <Pressable style={styles.postActionButton} onPress={() => openRepostComposer(item)}>
            <Ionicons name="repeat" size={22} color={item.my_repost ? "#15803D" : "#31429B"} />
            <Text style={styles.postActionCount}>{item.repost_count ?? 0}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // ---------- Main render ----------
  return (
    <View style={styles.container}>
      <HomeHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#31429B" />}
      >
        {profileLoading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color="#31429B" />
          </View>
        ) : errorMessage ? (
          <View style={styles.stateWrap}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.backActionButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backActionButtonText}>Go Back</Text>
            </Pressable>
          </View>
        ) : (
          <>
          {/* WHITE HERO SECTION */}
          <View style={styles.heroSection}>
            <View style={styles.heroBackRow}>
              <Pressable style={styles.backIconBtn} onPress={() => navigation.goBack()} hitSlop={10}>
                <Ionicons name="arrow-back" size={24} color="#31429B" />
              </Pressable>
            </View>

            <View style={styles.heroRow}>
              {hasValidMainAvatar && profileImageUri ? (
                <Image
                  source={{ uri: profileImageUri }}
                  style={[
                    styles.avatar,
                    { width: layout.avatarSize, height: layout.avatarSize, borderRadius: layout.avatarSize / 2 },
                  ]}
                />
              ) : (
                <AvatarInitials
                  name={profileName}
                  size={layout.avatarSize}
                  style={styles.avatar}
                  backgroundColor="#31429B"
                />
              )}

              <View style={styles.heroCopy}>
                <Text style={styles.name}>{profileName}</Text>

                <View style={styles.tagPill}>
                  <Ionicons name="school" size={12} color="#31429B" />
                  <Text style={styles.tagText}>
                    {profileSummary.classTag} | {profileSummary.sectionTag}
                  </Text>
                </View>

                <View style={styles.statsRow}>
                  <Text style={styles.statText}>
                    <Text style={styles.statNumber}>{profileSummary.connectionsCount}</Text> Connections
                  </Text>
                  <Text style={styles.statText}>
                    <Text style={styles.statNumber}>{profileSummary.postsCount}</Text> Posts
                  </Text>
                </View>
              </View>
            </View>

            {/* ✅ Connection buttons on their own row, BELOW the avatar+name row */}
            <View style={styles.connectionActionsRow}>
              {isConnected ? (
                <>
                  <TouchableOpacity style={styles.messageButton} onPress={openConversation} activeOpacity={0.85}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.disconnectButton} onPress={confirmRemoveConnection} activeOpacity={0.85}>
                    <Ionicons name="person-remove-outline" size={15} color="#B42318" />
                    <Text style={styles.disconnectButtonText}>Remove</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.connectButton,
                    isPendingConnection && styles.pendingButton,
                    isConnectionActionDisabled && styles.disabledButton,
                  ]}
                  onPress={isPendingConnection ? confirmCancelPendingRequest : handleAddConnection}
                  disabled={isConnectionActionDisabled}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={isPendingConnection ? "time-outline" : "person-add-outline"}
                    size={16}
                    color="#FFD404"
                  />
                  <Text style={styles.connectButtonText}>
                    {followLoading ? "Processing..." : isPendingConnection ? "Pending" : "Connect"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

            {/* DARK GALAXY SECTION */}
            <LinearGradient
              colors={["#32418C", "#283471", "#1E2757", "#151C3E"]}
              locations={[0, 0.35, 0.7, 1]}
              style={styles.darkSection}
            >
              {GALAXY_STARS.map((star, index) => (
                <View key={`profile-star-${index}`} style={[styles.star, star]} />
              ))}

              {/* Biography */}
              <View style={styles.darkSectionHeaderRow}>
                <Text style={styles.sectionHeadingYellow}>Biography</Text>
              </View>
              <Text style={styles.biographyText}>
                {profileSummary.biographyText ||
                  "This alumnus hasn't added a biography yet."}
              </Text>

              {/* Work Experience */}
              <View style={styles.darkSectionHeaderRow}>
                <Text style={styles.sectionHeadingYellow}>Work Experience</Text>
              </View>
              {workExperiences.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.workScrollContent}
                >
                  {workExperiences.map((emp, index) => {
                    const jobTitle = emp.title || emp.job_title || "Position not specified";
                    const company = emp.subtitle || emp.company_name || emp.company || "";
                    const period =
                      emp.period ||
                      (emp.start_date
                        ? `${emp.start_date} - ${emp.end_date || "Present"}`
                        : "");
                    const description = emp.description || "";

                    return (
                      <View key={emp.id ?? index} style={styles.workCard}>
                        <Ionicons
                          name="briefcase"
                          size={28}
                          color="#31429B"
                          style={styles.workBriefcase}
                        />
                        <Text style={styles.workTitle}>{jobTitle}</Text>
                        {company ? <Text style={styles.workSubtitle}>{company}</Text> : null}
                        {period ? <Text style={styles.workPeriod}>{period}</Text> : null}
                        {description ? (
                          <Text style={styles.workDescription}>{description}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptySkillsCard}>
                  <Ionicons name="briefcase-outline" size={28} color="#FBD117" />
                  <Text style={styles.emptySkillsTitle}>No work experience yet</Text>
                  <Text style={styles.emptySkillsSubtitle}>
                    This alumnus hasn't added any work experience.
                  </Text>
                </View>
              )}

              {/* Skills */}
              <View style={styles.darkSectionHeaderRow}>
                <Text style={styles.sectionHeadingYellow}>Skills</Text>
              </View>

              {userSkills.length === 0 ? (
                <View style={styles.emptySkillsCard}>
                  <Ionicons name="sparkles-outline" size={28} color="#FBD117" />
                  <Text style={styles.emptySkillsTitle}>No skills added yet</Text>
                  <Text style={styles.emptySkillsSubtitle}>
                    This alumnus hasn't added any skills to their profile.
                  </Text>
                </View>
              ) : (
                <View style={styles.skillsGrid}>
                  {userSkills.slice(0, 6).map((skill, i) => (
                    <View key={i} style={styles.skillPill}>
                      <Ionicons name="star" size={12} color="#FBD117" />
                      <Text style={styles.skillText} numberOfLines={1} ellipsizeMode="tail">
                        {skill}
                      </Text>
                    </View>
                  ))}

                  {userSkills.length > 6 && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.skillPill,
                        styles.skillPillMore,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => setSkillsModalVisible(true)}
                    >
                      <Text style={styles.skillTextMore}>
                        +{userSkills.length - 6} more
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </LinearGradient>

            {/* POSTS SECTION */}
            <View style={styles.postsSection}>
              <View style={styles.postsHeaderRow}>
                <Text style={styles.sectionHeadingBlack}>Posts</Text>
              </View>

              {postsLoading ? (
                <View style={styles.stateWrap}>
                  <ActivityIndicator size="small" color="#31429B" />
                </View>
              ) : profilePosts.length === 0 ? (
                <Text style={styles.emptyPostsText}>No posts yet.</Text>
              ) : (
                <>
                  {profilePosts.map((post) => renderPostCard(post))}

                  {hasMorePosts && (
                    <TouchableOpacity
                      style={{
                        alignSelf: "center",
                        backgroundColor: "#31429B",
                        borderRadius: 20,
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        marginTop: 8,
                        marginBottom: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onPress={handleLoadMore}
                      disabled={isFetchingMorePosts}
                    >
                      {isFetchingMorePosts ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
                          <Text style={{ color: "#FFFFFF", fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>
                            Load more posts
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ============================================================
          MODALS
      ============================================================ */}

      {/* FULLSCREEN IMAGE VIEWER */}
      {viewerVisible && (
        <ZoomableViewer
          images={viewerImages}
          initialIndex={viewerIndex}
          visible={viewerVisible}
          post={viewerPost}
          viewerAuthorName={viewerPost ? [viewerPost.alumni?.first_name, viewerPost.alumni?.last_name].filter(Boolean).join(" ").trim() || "Alumni" : ""}
          postAvatarUri={viewerPost ? getAvatarUri("", viewerPost.alumni?.alumni_photo) : ""}
          rawAuthorPhoto={viewerPost?.alumni?.alumni_photo}
          timeLabel={viewerPost ? getRelativeTimeLabel(getFeedItemDateValue(viewerPost)) : ""}
          postVisibilityLabel={viewerPost ? getPostVisibilityLabel(viewerPost) : "Public"}
          reactionCount={viewerPost?.reaction_count ?? 0}
          commentCount={viewerPost?.comment_count ?? 0}
          repostCount={viewerPost?.repost_count ?? 0}
          isReacted={Boolean(viewerPost?.my_reaction)}
          isReposted={Boolean(viewerPost?.my_repost)}
          onRequestClose={closeImageViewer}
          onAuthorPress={() => {
            if (viewerPost?.alumni?.id) {
              navigation.navigate(viewerPost.alumni.id === currentUserId ? "Profile" : "ProfileView", {
                userId: viewerPost.alumni.id,
              });
            }
          }}
          onReactionPress={() => (viewerPost ? handlePostReaction(viewerPost) : null)}
          onCommentPress={() => (viewerPost ? handlePostComment(viewerPost) : null)}
          onRepostPress={() => (viewerPost ? openRepostComposer(viewerPost) : null)}
          onMenuPress={() => {
            closeImageViewer();
            if (viewerPost) setTimeout(() => openPostActions(viewerPost), 350);
          }}
        />
      )}

      {/* POST ACTIONS MODAL */}
      {postActionsVisible && (
        <Modal transparent visible={postActionsVisible} animationType="slide" statusBarTranslucent onRequestClose={closePostActions}>
          <View style={styles.postActionsBackdrop}>
            <SafeAreaView style={styles.postActionsSafeArea} edges={["bottom"]}>
              <View style={styles.postActionsCard}>
                <View style={{ height: 4, width: 40, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginTop: 8, marginBottom: 4 }} />
                <View style={styles.postActionsHeader}>
                  <Text style={styles.postActionsTitle}>Post Options</Text>
                  <Pressable style={styles.postActionsCloseButton} onPress={closePostActions} hitSlop={8}>
                    <Ionicons name="close" size={20} color="#31429B" />
                  </Pressable>
                </View>
                <Text style={styles.postActionsSubtitle}>Actions for this post</Text>
                <View style={styles.postActionsRow}>
                  <Pressable style={styles.postActionChoiceButton} onPress={openPostReportModal}>
                    <Ionicons name="flag-outline" size={16} color="#31429B" />
                    <Text style={styles.postActionChoiceText}>Report</Text>
                  </Pressable>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {/* COMMENT ACTIONS MODAL */}
      {commentActionsVisible && (
        <Modal transparent visible={commentActionsVisible} animationType="slide" statusBarTranslucent onRequestClose={closeCommentActions}>
          <View style={styles.postActionsBackdrop}>
            <SafeAreaView style={styles.postActionsSafeArea} edges={["bottom"]}>
              <View style={styles.postActionsCard}>
                <View style={{ height: 4, width: 40, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginTop: 8, marginBottom: 4 }} />
                <View style={styles.postActionsHeader}>
                  <Text style={styles.postActionsTitle}>
                    {canManageComment(activeCommentActionComment) ? "Manage Comment" : "Comment Options"}
                  </Text>
                  <Pressable style={styles.postActionsCloseButton} onPress={closeCommentActions} hitSlop={8}>
                    <Ionicons name="close" size={20} color="#31429B" />
                  </Pressable>
                </View>
                {canManageComment(activeCommentActionComment) ? (
                  <>
                    <Text style={styles.postActionsSubtitle}>Edit or delete your comment.</Text>
                    <View style={styles.postActionsRow}>
                      <Pressable style={styles.postActionChoiceButton} onPress={handleEditComment} disabled={isCommentActionSaving}>
                        <Ionicons name="create-outline" size={16} color="#31429B" />
                        <Text style={styles.postActionChoiceText}>Edit</Text>
                      </Pressable>
                      <Pressable style={styles.postActionChoiceButton} onPress={handleDeleteCommentAction} disabled={isCommentActionSaving}>
                        <Ionicons name="trash-outline" size={16} color="#B42318" />
                        <Text style={styles.postActionChoiceText}>Delete</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.postActionsSubtitle}>Actions for this comment</Text>
                    <View style={styles.postActionsRow}>
                      <Pressable style={styles.postActionChoiceButton}>
                        <Ionicons name="flag-outline" size={16} color="#31429B" />
                        <Text style={styles.postActionChoiceText}>Report</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {/* REPOST COMPOSER */}
      {repostComposerVisible && (
        <Modal transparent visible={repostComposerVisible} animationType="slide" onRequestClose={closeRepostComposer}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.repostModalBackdrop}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={closeRepostComposer} />
              <SafeAreaView style={styles.repostModalSafeArea} edges={["bottom"]}>
                <View style={styles.repostModalCard}>
                  <View style={{ height: 4, width: 40, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginTop: 8, marginBottom: 8 }} />
                  <Text style={styles.repostModalTitle}>Repost with your caption</Text>
                  <Text style={styles.repostModalSubtitle} numberOfLines={1}>
                    {activeRepostPost
                      ? `Reposting ${[activeRepostPost.alumni?.first_name, activeRepostPost.alumni?.last_name].filter(Boolean).join(" ").trim()}'s post`
                      : "Add context to your repost"}
                  </Text>
                  <TextInput
                    value={repostCaptionDraft}
                    onChangeText={setRepostCaptionDraft}
                    placeholder="Share your thoughts..."
                    placeholderTextColor="#8A94A6"
                    style={styles.repostCaptionInput}
                    multiline
                    textAlignVertical="top"
                  />
                  {repostMentionContext && repostMentionSuggestions.length > 0 && (
                    <View style={styles.mentionPanel}>
                      {repostMentionSuggestions.map((item) => (
                        <Pressable
                          key={`repost-mention-${String(item.id ?? item.name)}`}
                          style={styles.mentionItem}
                          onPress={() => {
                            if (repostMentionContext) {
                              setRepostCaptionDraft(
                                (curr) =>
                                  `${String(curr ?? "").slice(0, repostMentionContext.mentionStart)}@${item.handle} ${String(
                                    curr ?? ""
                                  ).slice(repostMentionContext.mentionEnd)}`
                              );
                            }
                          }}
                        >
                          <Text style={styles.mentionName} numberOfLines={1}>
                            @{item.handle}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <View style={styles.repostModalActionsRow}>
                    <Pressable style={styles.repostCancelButton} onPress={closeRepostComposer}>
                      <Text style={styles.repostCancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={styles.repostSubmitButton} onPress={submitRepostWithCaption}>
                      <Text style={styles.repostSubmitButtonText}>Repost</Text>
                    </Pressable>
                  </View>
                </View>
              </SafeAreaView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* THEMED ALERT */}
      {themedAlertState.visible && (
        <Modal transparent visible={themedAlertState.visible} animationType="fade" onRequestClose={closeThemedAlert}>
          <View style={styles.themedAlertBackdrop}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeThemedAlert} />
            <View style={styles.themedAlertCard}>
              <Pressable style={styles.themedAlertCloseButton} onPress={closeThemedAlert}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
              <Text style={styles.themedAlertTitle}>{themedAlertState.title}</Text>
              <Text style={styles.themedAlertMessage}>{themedAlertState.message}</Text>
              <View style={styles.themedAlertActionsRow}>
                {themedAlertState.actions.map((action, actionIndex) => {
                  const isDestructive = action?.style === "destructive";
                  const isCancel = action?.style === "cancel";
                  return (
                    <Pressable
                      key={`${action.text}-${actionIndex}`}
                      style={[
                        styles.themedAlertButton,
                        isDestructive ? styles.themedAlertButtonDestructive : null,
                        isCancel ? styles.themedAlertButtonNeutral : null,
                      ]}
                      onPress={() => handleThemedAlertAction(action)}
                    >
                      <Text
                        style={[
                          styles.themedAlertButtonText,
                          isDestructive ? styles.themedAlertButtonTextDestructive : null,
                          isCancel ? styles.themedAlertButtonTextNeutral : null,
                        ]}
                      >
                        {action.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* COMMENTS MODAL */}
      {commentsVisible && (
        <Modal transparent visible={commentsVisible} animationType="none" onRequestClose={closeCommentsModal}>
          <View style={styles.commentsModalBackdrop}>
            <RNAnimated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: "rgba(0, 0, 0, 0.4)",
                  opacity: commentsTranslateY.interpolate({ inputRange: [0, 300], outputRange: [1, 0], extrapolate: "clamp" }),
                },
              ]}
            >
              <Pressable style={StyleSheet.absoluteFillObject} onPress={closeCommentsModal} />
            </RNAnimated.View>
            <RNAnimated.View
              style={[
                styles.commentsSheet,
                {
                  transform: [{ translateY: commentsTranslateY }],
                  paddingBottom: commentKeyboardHeight > 0 ? commentKeyboardHeight + 8 : 0,
                },
              ]}
            >
              <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
                <View style={{ height: 5, width: 40, backgroundColor: "#D1D5DB", borderRadius: 3, alignSelf: "center", marginTop: 8, marginBottom: 12 }} />
                <View style={styles.commentsHeaderRow}>
                  <Text style={styles.commentsTitle}>
                    {activeCommentPost?.comment_count ?? comments.length} comments
                  </Text>
                  <Pressable style={styles.commentsCloseButton} onPress={closeCommentsModal}>
                    <Ionicons name="close" size={24} color="#1C1C1E" />
                  </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <ScrollView
                    ref={commentsScrollViewRef}
                    style={[styles.commentsList, styles.commentsBody]}
                    contentContainerStyle={[styles.commentsListContent, { flexGrow: 1, paddingBottom: 20 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {commentsLoading ? (
                      <View style={styles.commentsEmptyState}>
                        <ActivityIndicator size="small" color="#31429B" />
                        <Text style={styles.commentsEmptyText}>Loading comments...</Text>
                      </View>
                    ) : commentsError ? (
                      <View style={styles.commentsEmptyState}>
                        <Ionicons name="alert-circle-outline" size={26} color="#B42318" />
                        <Text style={styles.commentsEmptyText}>{commentsError}</Text>
                      </View>
                    ) : comments.length === 0 ? (
                      <View style={styles.commentsEmptyState}>
                        <Ionicons name="chatbubble-ellipses-outline" size={26} color="#94A3B8" />
                        <Text style={styles.commentsEmptyText}>No comments yet.</Text>
                      </View>
                    ) : (
                      commentTree.map((thread) => renderCommentNode(thread))
                    )}
                  </ScrollView>

                  <View>
                    <View style={styles.commentComposerSafeArea}>
                      <View style={styles.commentComposer}>
                        <View style={styles.commentComposerContent}>
                          {editingComment && (
                            <View style={styles.commentReplyContext}>
                              <Text style={styles.commentReplyContextText} numberOfLines={1}>Editing comment</Text>
                              <Pressable
                                style={styles.commentReplyContextCancel}
                                onPress={() => {
                                  setEditingComment(null);
                                  setCommentDraft("");
                                }}
                              >
                                <Ionicons name="close" size={14} color="#31429B" />
                              </Pressable>
                            </View>
                          )}
                          {replyingToComment && (
                            <View style={styles.commentReplyContext}>
                              <Text style={styles.commentReplyContextText} numberOfLines={1}>
                                Replying to {replyingToComment?.alumni?.first_name ?? "Alumni"}
                              </Text>
                              <Pressable style={styles.commentReplyContextCancel} onPress={() => setReplyingToComment(null)}>
                                <Ionicons name="close" size={14} color="#31429B" />
                              </Pressable>
                            </View>
                          )}
                          <View style={styles.commentInputWrap}>
                            <TextInput
                              value={commentDraft}
                              onChangeText={setCommentDraft}
                              onContentSizeChange={handleCommentInputContentSizeChange}
                              placeholder={
                                editingComment ? "Edit your comment..." : replyingToComment ? "Write a reply..." : "Write a comment..."
                              }
                              placeholderTextColor="#94A3B8"
                              style={[styles.commentInput, { height: commentInputHeight }]}
                              multiline
                              scrollEnabled={false}
                              textAlignVertical="center"
                            />
                            <Pressable
                              style={[styles.commentSendButtonInside, !commentDraft.trim() ? styles.commentSendButtonDisabled : null]}
                              onPress={handleSubmitComment}
                              disabled={!commentDraft.trim()}
                            >
                              <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                            </Pressable>
                          </View>
                          {commentMentionContext && commentMentionSuggestions.length > 0 && (
                            <View style={styles.commentMentionPanel}>
                              {commentMentionSuggestions.map((item) => (
                                <Pressable
                                  key={`comment-mention-${String(item.id ?? item.name)}`}
                                  style={styles.mentionItem}
                                  onPress={() => {
                                    if (commentMentionContext) {
                                      setCommentDraft(
                                        (curr) =>
                                          `${String(curr ?? "").slice(0, commentMentionContext.mentionStart)}@${item.handle} ${String(
                                            curr ?? ""
                                          ).slice(commentMentionContext.mentionEnd)}`
                                      );
                                    }
                                  }}
                                >
                                  <Text style={styles.mentionName} numberOfLines={1}>
                                    @{item.handle}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </SafeAreaView>
            </RNAnimated.View>
          </View>
        </Modal>
      )}

      {/* SKILLS MODAL */}
{skillsModalVisible && (
  <Modal
    transparent
    visible={skillsModalVisible}
    animationType="slide"
    statusBarTranslucent
    onRequestClose={() => setSkillsModalVisible(false)}
  >
    <View style={styles.postActionsBackdrop}>
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={() => setSkillsModalVisible(false)}
      />
      <SafeAreaView style={styles.postActionsSafeArea} edges={["bottom"]}>
        <View style={styles.skillsModalCard}>
          <View
            style={{
              height: 4,
              width: 40,
              backgroundColor: "#D1D5DB",
              borderRadius: 2,
              alignSelf: "center",
              marginTop: 8,
              marginBottom: 8,
            }}
          />

          <View style={styles.skillsModalHeader}>
            <Text style={styles.skillsModalTitle}>Skills</Text>
            <Pressable
              style={styles.postActionsCloseButton}
              onPress={() => setSkillsModalVisible(false)}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color="#31429B" />
            </Pressable>
          </View>

          <Text style={styles.skillsModalSubtitle}>
            {userSkills.length} {userSkills.length === 1 ? "skill" : "skills"} listed
          </Text>

          <ScrollView
            style={{ maxHeight: SCREEN_HEIGHT * 0.6, marginTop: 12 }}
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.skillsModalGrid}>
              {userSkills.map((skill, i) => (
                <View key={`all-skill-${i}`} style={styles.skillsModalPill}>
                  <Ionicons name="star" size={12} color="#31429B" />
                  <Text style={styles.skillsModalPillText} numberOfLines={2}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  </Modal>
)}

      {/* REPORT MODAL */}
      {reportModalVisible && (
        <Modal transparent visible={reportModalVisible} animationType="slide" statusBarTranslucent onRequestClose={() => setReportModalVisible(false)}>
          <View style={styles.postActionsBackdrop}>
            <SafeAreaView style={styles.postActionsSafeArea} edges={["bottom"]}>
              <View style={styles.postActionsCard}>
                <View style={{ height: 4, width: 40, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginTop: 8, marginBottom: 4 }} />
                <View style={styles.postActionsHeader}>
                  <Text style={styles.postActionsTitle}>Report Content</Text>
                  <Pressable style={styles.postActionsCloseButton} onPress={() => setReportModalVisible(false)} hitSlop={8}>
                    <Ionicons name="close" size={20} color="#31429B" />
                  </Pressable>
                </View>
                <Text style={{ color: "#64748B", fontSize: 14, paddingHorizontal: 24, marginBottom: 8 }}>
                  Why are you reporting this? Your report is anonymous.
                </Text>
                <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.5, marginTop: 10 }}>
                  {REPORT_REASONS.map((reason, index) => (
                    <Pressable
                      key={index}
                      style={({ pressed }) => [
                        {
                          paddingVertical: 14,
                          paddingHorizontal: 24,
                          borderBottomWidth: 1,
                          borderBottomColor: "#F3F4F6",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        },
                        pressed && { backgroundColor: "#F9FAFB" },
                      ]}
                      onPress={() => submitReport(reason)}
                    >
                      <Text style={{ fontSize: 15, color: "#1F2937", fontWeight: "500" }}>{reason}</Text>
                      <Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.3)" />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default ProfileViewScreen;