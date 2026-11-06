import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated as RNAnimated, Dimensions, Easing, Modal,
  Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  View, Platform, KeyboardAvoidingView, Keyboard, DeviceEventEmitter, AppState
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';

import HomeHeader from '../components/HomeHeader';
import AvatarInitials from '../components/AvatarInitials';
import styles from '../styles/UserFeedScreen.styles';
import { getCurrentUser } from '../services/supabaseAuth';
import { getAlumniByEmail } from '../services/alumniQueries';
import { getAvatarUri } from '../utils/imageUtils';
import { useCurrentUserProfile } from '../context/CurrentUserProfileContext';
import {
  getFeedPosts, getPostById, getPostComments, addComment, addReaction,
  removeReaction, createRepost, deletePost, updateComment, deleteComment, updatePost,
} from '../services/postQueries';
import supabase from '../services/supabase';
import { sortFeedPosts } from '../utils/feedAlgorithm';

const NU_LIPA_AAO_ICON = require('../../assets/images/nu-lipa-logo-portrait-white-version-21.png');
const NU_LIPA_AAO_NAME = 'NU Lipa Alumni Affairs';

// ==============================================
// OPTIMIZED IMAGE COMPONENT
// ==============================================
const getOptimizedImageUrl = (path, width = 720, height = null) => {
  if (!path) return null;
  const imagePath = String(path);
  const transformImageUrl = (url) => {
    const base = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const params = [`width=${width}&quality=75`];
    if (height) params.push(`height=${height}`);
    return base.concat(url.includes('?') ? '&' : '?', params.join('&'));
  };

  if (imagePath.startsWith('http')) {
    return imagePath.includes('/storage/v1/object/public/')
      ? transformImageUrl(imagePath)
      : imagePath;
  }

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const bucket = 'luminus_assets';

  const params = [`width=${width}&quality=75`];
  if (height) params.push(`height=${height}`);
  return `${baseUrl}/storage/v1/render/image/public/${bucket}/${imagePath}?${params.join('&')}`;
};

const getRawImageUrl = (path) => {
  if (!path) return null;
  const imagePath = String(path);

  if (imagePath.startsWith('http')) {
    return imagePath
      .replace('/storage/v1/render/image/public/', '/storage/v1/object/public/')
      .split('?')[0]; 
  }

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const bucket = 'luminus_assets';
  const cleanPath = imagePath.replace(/^\/+/, '');
  return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
};

const OptimizedImage = ({ uri, style, resizeMode = 'cover', thumbnail = false, cache = 'disk', raw = false }) => {
  const [imageUri, setImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uri) {
      setImageUri(null);
      setIsLoading(false);
      return;
    }
    if (raw) {
      setImageUri(getRawImageUrl(uri));
    } else if (thumbnail) {
      setImageUri(getOptimizedImageUrl(uri, 320, 320));
    } else {
      setImageUri(getOptimizedImageUrl(uri, 720));
    }
    setIsLoading(false);
  }, [uri, thumbnail, raw]);

  if (!imageUri || isLoading) {
    return <View style={[style, { backgroundColor: '#F3F4F6' }]} />;
  }

  return (
    <Image
      source={{ uri: imageUri }}
      style={style}
      contentFit={resizeMode === 'cover' ? 'cover' : 'contain'}
      cachePolicy={cache}
      transition={200}
    />
  );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIEWER_IMAGE_WIDTH = SCREEN_WIDTH * 0.92;
const VIEWER_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.72;
const MENTION_PATTERN = /(@[a-zA-Z0-9_.-]+)/g;
const SWIPE_DISMISS_THRESHOLD = 100;
const FEED_PAGE_SIZE = 10; 

const REPORT_REASONS = ['Spam or Fraud', 'Nudity or Sexual Content', 'Hate Speech or Symbols', 'Violence or Dangerous Organizations', 'Bullying or Harassment', 'Sale of Illegal or Regulated Goods', 'Intellectual Property Violation', 'False Information', 'Other'];

const isVideoUri = (uri) => {
  if (!uri) return false;
  const lowerUri = String(uri).toLowerCase();
  return lowerUri.includes('.mp4') || lowerUri.includes('.mov') || lowerUri.includes('.webm') || lowerUri.includes('.mkv');
};

const hasValidProfilePhoto = (rawPhoto) => rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() !== '' && !rawPhoto.includes('undefined') && !rawPhoto.includes('null');

const getRelativeTimeLabel = (dateValue) => {
  if (!dateValue) return '';
  const normalizedValue = typeof dateValue === 'string' ? (dateValue.includes('T') ? dateValue : dateValue.replace(' ', 'T')) : dateValue;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return '';
  const elapsedSeconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedSeconds < 60) return 'Just now';
  if (elapsedDays >= 7) return `${Math.floor(elapsedDays / 7)}w`;
  if (elapsedDays >= 1) return `${elapsedDays}d`;
  if (elapsedHours >= 1) return `${elapsedHours}h`;
  if (elapsedMinutes >= 1) return `${elapsedMinutes}m`;
  return 'Just now';
};

const getFeedItemDateValue = (item) => item?.created_at ?? item?.date_posted ?? item?.posted_at ?? item?.published_at ?? null;

const isVisibleFeedItem = (item) => {
  if (item?.feed_type !== 'announcement') return true; 
  if (Number(item?.status) !== 1) return false;
  const scheduledTime = item?.scheduled_at || item?.date_posted;
  if (scheduledTime && new Date(scheduledTime).getTime() > Date.now()) {
    return false;
  }
  return true;
};

const extractMentionQuery = (value) => { const match = String(value ?? '').match(/(^|\s)@([a-zA-Z0-9_.-]*)$/); return match ? { query: match[2] ?? '', mentionStart: String(value ?? '').length - (match[2] ?? '').length - 1, mentionEnd: String(value ?? '').length } : null; };
const toMentionHandle = (f, l) => `${f ?? ''}_${l ?? ''}`.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/g, '').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'alumni';

const resolveFeedInteractionTarget = (post) => {
  if (!post) return { feedType: 'post', postId: null, announcementId: null, originalPostId: null };
  if (post.feed_type === 'announcement') {
    return { feedType: 'announcement', postId: null, announcementId: post.id ?? null, originalPostId: null };
  }
  if (post.feed_type === 'repost') {
    const targetPostId = post.original_post?.id ?? post.original_post_id ?? post.post_id ?? post.id ?? null;
    return { feedType: 'repost', postId: targetPostId, announcementId: null, originalPostId: targetPostId };
  }
  return { feedType: 'post', postId: post.id ?? null, announcementId: null, originalPostId: post.id ?? null };
};

const getFeedItemKeyValue = (item) => (item?.feed_id ? item.feed_id : `${item?.feed_type ?? 'post'}-${item?.id ?? 'unknown'}`);
const mergeFeedItems = (currentItems, nextItems) => {
  const merged = Array.isArray(currentItems) ? [...currentItems] : [];
  const seenKeys = new Set(merged.map(getFeedItemKeyValue));
  (Array.isArray(nextItems) ? nextItems : []).forEach((item) => { const key = getFeedItemKeyValue(item); if (seenKeys.has(key)) return; seenKeys.add(key); merged.push(item); });
  return merged;
};

const ZoomableVideo = ({ uri, style, posterUri }) => {
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false; 
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('statusChange', (status) => {
      if (status.status === 'error') setError('Failed to load video');
      if (status.status === 'readyToPlay') {
        setIsReady(true);
        try { player.play(); } catch (e) {}   
      }
    });
    if (player.status === 'readyToPlay') {
      setIsReady(true);
      try { player.play(); } catch (e) {}
    }
    return () => sub.remove();
  }, [player]);

  if (error) {
    return (
      <View style={[style, { backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        <Text style={{ color: '#94A3B8', marginTop: 8, fontSize: 12 }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <VideoView
        style={{ width: '100%', height: '100%' }}
        player={player}
        contentFit="contain"
        nativeControls={true}
      />

      {!isReady && posterUri && (
        <View style={StyleSheet.absoluteFillObject}>
          <Image source={{ uri: posterUri }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
          <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        </View>
      )}
    </View>
  );
};

const PostFeedVideo = ({ uri, style, onLayoutRatio, posterUri, isActive, onTap }) => {
  const [videoFit, setVideoFit] = useState('cover');
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);

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

    const sub = player.addListener('statusChange', (status) => {
      if (status.status === 'error') {
        setError('Failed to load video');
        return;
      }
      if (status.status === 'readyToPlay') {
        setIsReady(true);
        const size = player.naturalSize;
        if (size?.width > 0 && size?.height > 0) {
          if (onLayoutRatioRef.current) onLayoutRatioRef.current(size.width, size.height);
          setVideoFit(size.width > size.height ? 'contain' : 'cover');
        }
      }
    });

    if (player.status === 'readyToPlay') setIsReady(true);
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

  const handleTap = (e) => {
    e.stopPropagation();
    if (onTap) onTap();
  };

  if (error) {
    return (
      <View style={[style, { backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        <Text style={{ color: '#94A3B8', marginTop: 8, fontSize: 12 }}>{error}</Text>
      </View>
    );
  }

  return (
    <Pressable style={style} onPress={onTap} activeOpacity={1}>
      {player ? (
        <VideoView
          style={{ width: '100%', height: '100%' }}
          player={player}
          contentFit={videoFit}
          nativeControls={false}
          onFirstFrameRender={() => setHasRendered(true)}
        />
      ) : null}

      {(!isReady || !player) && posterUri && (
        <View style={StyleSheet.absoluteFillObject}>
          <Image source={{ uri: posterUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' }]}>
            <Ionicons name="play-circle" size={48} color="#FFFFFF" />
          </View>
        </View>
      )}

      {isReady && isMuted && (
        <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20 }}>
          <Ionicons name="volume-mute" size={16} color="#FFFFFF" />
        </View>
      )}
    </Pressable>
  );
};

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
          <Text style={styles.readMoreText}>{isExpanded ? 'Show less' : 'Read more'}</Text>
        </Pressable>
      )}
    </View>
  );
});

const ZoomableViewer = ({ images=[], initialIndex=0, visible, post=null, viewerAuthorName='', postAvatarUri='', rawAuthorPhoto=null, timeLabel='', postVisibilityLabel='Public', reactionCount=0, commentCount=0, repostCount=0, isReacted=false, isReposted=false, onRequestClose, onAuthorPress, onReactionPress, onCommentPress, onRepostPress }) => {
  const pagerRef = useRef(null);
  const resolvedImages = images.filter((img) => Boolean(img?.uri));
  if (!visible || resolvedImages.length === 0) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onRequestClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      <View style={styles.viewerBackdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onRequestClose} />
        <View style={styles.viewerContent}>
          <ScrollView ref={pagerRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.viewerPager} contentContainerStyle={styles.viewerScrollContent}>
            
            {resolvedImages.map((img, i) => (
              <View key={img?.uri ?? i} style={styles.viewerScrollItem}>
                <View style={styles.viewerImageCard}>
                  <View style={styles.viewerImagePressable}>
                    {img.isVideo ? 
                      <ZoomableVideo
                        uri={img.videoUri || img.uri}     
                        style={[styles.viewerImage, { width: VIEWER_IMAGE_WIDTH, height: VIEWER_IMAGE_HEIGHT }]}
                        posterUri={img.posterUri || img.thumbnailUri || null}
                      /> :
                      <OptimizedImage
                        uri={img.uri}
                        style={[styles.viewerImage, { width: VIEWER_IMAGE_WIDTH, height: VIEWER_IMAGE_HEIGHT }]}
                        resizeMode="contain"
                        thumbnail={false}
                        raw={true}
                      />
                    }
                  </View>
                </View>
              </View>
            ))}

          </ScrollView>
          {post && (
            <View style={styles.viewerFooter} pointerEvents="box-none">
              <View style={styles.viewerAuthorCard}>
                <Pressable onPress={onAuthorPress} style={styles.viewerAuthorPressable} hitSlop={8}>
                  {hasValidProfilePhoto(rawAuthorPhoto) && postAvatarUri ? 
                    <OptimizedImage uri={postAvatarUri} style={styles.viewerAuthorAvatar} thumbnail={true} /> : 
                    <AvatarInitials name={viewerAuthorName} size={36} style={styles.viewerAuthorAvatar} backgroundColor="#31429B" />
                  }
                </Pressable>
                <View style={styles.viewerAuthorTextWrap}>
                  <Pressable onPress={onAuthorPress} hitSlop={8}><Text style={styles.viewerAuthorName}>{viewerAuthorName}</Text></Pressable>
                  <View style={styles.viewerAuthorMetaRow}>
                    <Text style={styles.viewerAuthorMeta}>{timeLabel}</Text><Text style={styles.viewerAuthorMetaSeparator}>•</Text>
                    <Ionicons name="earth-outline" size={12} color="#FFFFFF" /><Text style={styles.viewerAuthorMeta}>{postVisibilityLabel}</Text>
                  </View>
                </View>
              </View>
              {post.feed_type !== 'announcement' && (
                <>
                  <View style={styles.viewerActionsRow}>
                    <Pressable style={styles.viewerActionButton} onPress={onReactionPress}><Ionicons name={isReacted ? 'heart' : 'heart-outline'} size={18} color={isReacted ? '#EF4444' : '#FFFFFF'} /><Text style={styles.viewerActionLabel}>Like</Text></Pressable>
                    <Pressable style={styles.viewerActionButton} onPress={onCommentPress}><Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" /><Text style={styles.viewerActionLabel}>Comment</Text></Pressable>
                    <Pressable style={styles.viewerActionButton} onPress={onRepostPress}><Ionicons name="repeat" size={18} color={isReposted ? '#15803D' : '#FFFFFF'} /><Text style={styles.viewerActionLabel}>Repost</Text></Pressable>
                  </View>
                  <View style={styles.viewerCountsRow}><Text style={styles.viewerCountText}>{reactionCount} reactions</Text><Text style={styles.viewerCountText}>{commentCount} comments</Text><Text style={styles.viewerCountText}>{repostCount} reposts</Text></View>
                </>
              )}
            </View>
          )}
          <View style={styles.viewerTopBar} pointerEvents="box-none">
            <Pressable style={styles.viewerTopButton} onPress={onRequestClose} hitSlop={10}><Ionicons name="close" size={26} color="#FFFFFF" /></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==============================================
// MAIN USERFEEDSCREEN
// ==============================================
const UserFeedScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { currentUserProfile } = useCurrentUserProfile();
  
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);
  const [isFetchingMorePosts, setIsFetchingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [feedSortMode, setFeedSortMode] = useState('relevant');
  const [feedRefreshNonce, setFeedRefreshNonce] = useState(0);
  const [connections, setConnections] = useState([]);
  const [postImageRatios, setPostImageRatios] = useState({});
  const [reactionPulsePostId, setReactionPulsePostId] = useState(null);

  const [activeVideoPostId, setActiveVideoPostId] = useState(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerPost, setViewerPost] = useState(null);
  
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [commentKeyboardHeight, setCommentKeyboardHeight] = useState(0);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentInputHeight, setCommentInputHeight] = useState(46);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  
  const [commentActionsVisible, setCommentActionsVisible] = useState(false);
  const [activeCommentActionComment, setActiveCommentActionComment] = useState(null);
  const [isCommentActionSaving, setIsCommentActionSaving] = useState(false);
  const [expandedCommentParents, setExpandedCommentParents] = useState({});
  
  const [repostComposerVisible, setRepostComposerVisible] = useState(false);
  const [activeRepostPost, setActiveRepostPost] = useState(null);
  const [repostCaptionDraft, setRepostCaptionDraft] = useState('');
  
  const [postActionsVisible, setPostActionsVisible] = useState(false);
  const [activePostActionPost, setActivePostActionPost] = useState(null);
  const [isPostActionSaving, setIsPostActionSaving] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState({ id: null, type: null });
  const [themedAlertState, setThemedAlertState] = useState({ visible: false, title: '', message: '', actions: [] });

  const [cachedPosts, setCachedPosts] = useState([]);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  const reactionPulseScale = useRef(new RNAnimated.Value(1)).current;
  const postActionsTranslateY = useRef(new RNAnimated.Value(0)).current;
  const repostComposerTranslateY = useRef(new RNAnimated.Value(0)).current;
  const commentsTranslateY = useRef(new RNAnimated.Value(0)).current;
  const flatListRef = useRef(null);
  const postMediaTapTimeoutRef = useRef(null);
  const postMediaTapStateRef = useRef({ postKey: null, imageIndex: null });
  const commentsScrollViewRef = useRef(null);
  
  const postActionsSwipeStartRef = useRef(0);
  const repostComposerSwipeStartRef = useRef(0);
  const commentsSwipeStartRef = useRef(0);
  
  const isClosingRef = useRef(false);
  const feedPageRef = useRef(0);
  const feedLoadInFlightRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setIsScreenFocused(nextAppState === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setCommentKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setCommentKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 500, 
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
  let foundVideo = null;
  for (const v of viewableItems) {
    if (!v.isViewable) continue;
    const hasVideo = v.item.images?.some((img) => img.is_video || img.media_type === 'video');
    if (hasVideo) {
      foundVideo = v.item;
      break;
    }
  }
  setActiveVideoPostId(foundVideo?.id ?? null);
}).current;

  const renderPostAuthorName = useCallback((post) => {
    if (post?.feed_type === 'announcement') return NU_LIPA_AAO_NAME;
    const author = post?.alumni ?? post?.author ?? {};
    return [author?.first_name, author?.middle_name, author?.last_name].filter(Boolean).join(' ').trim() || 'Alumni';
  }, []);

  const renderPostAvatarUri = useCallback((post) => {
    if (post?.feed_type === 'announcement') return null;
    const author = post?.alumni ?? post?.author ?? {};
    return getAvatarUri(renderPostAuthorName(post), author?.alumni_photo);
  }, [renderPostAuthorName]);

  const renderCommentAuthorName = useCallback((comment) => {
    return [comment?.alumni?.first_name, comment?.alumni?.middle_name, comment?.alumni?.last_name].filter(Boolean).join(' ').trim() || 'Alumni';
  }, []);

  const renderCommentAvatarUri = useCallback((comment) => {
    return getAvatarUri(renderCommentAuthorName(comment), comment?.alumni?.alumni_photo);
  }, [renderCommentAuthorName]);

  useEffect(() => { if (postActionsVisible) postActionsTranslateY.setValue(0); }, [postActionsVisible, postActionsTranslateY]);
  useEffect(() => { if (repostComposerVisible) repostComposerTranslateY.setValue(0); }, [repostComposerVisible, repostComposerTranslateY]);
  useEffect(() => { if (commentsVisible) RNAnimated.spring(commentsTranslateY, { toValue: 0, tension: 65, friction: 12, useNativeDriver: false }).start(); }, [commentsVisible, commentsTranslateY]);

  const applyRubberBandingOffset = (distance) => distance <= SWIPE_DISMISS_THRESHOLD ? distance : SWIPE_DISMISS_THRESHOLD + (distance - SWIPE_DISMISS_THRESHOLD) * 0.3;

  const handlePostActionsSwipe = (evt) => {
    const distance = evt.nativeEvent.pageY - (postActionsSwipeStartRef.current || (postActionsSwipeStartRef.current = evt.nativeEvent.pageY));
    postActionsTranslateY.setValue(applyRubberBandingOffset(distance));
    if (distance > SWIPE_DISMISS_THRESHOLD) { closePostActions(); postActionsSwipeStartRef.current = 0; }
  };

  const handleRepostComposerSwipe = (evt) => {
    const distance = evt.nativeEvent.pageY - (repostComposerSwipeStartRef.current || (repostComposerSwipeStartRef.current = evt.nativeEvent.pageY));
    repostComposerTranslateY.setValue(applyRubberBandingOffset(distance));
    if (distance > SWIPE_DISMISS_THRESHOLD) { closeRepostComposer(); repostComposerSwipeStartRef.current = 0; }
  };

  const handleCommentsSwipe = (evt) => {
    const distance = evt.nativeEvent.pageY - (commentsSwipeStartRef.current || (commentsSwipeStartRef.current = evt.nativeEvent.pageY));
    commentsTranslateY.setValue(distance > 0 ? distance * 0.6 : distance);
  };
  
  const resetSwipeRefs = () => {
    postActionsSwipeStartRef.current = repostComposerSwipeStartRef.current = commentsSwipeStartRef.current = 0;
    RNAnimated.spring(postActionsTranslateY, { toValue: 0, useNativeDriver: false }).start();
    RNAnimated.spring(repostComposerTranslateY, { toValue: 0, useNativeDriver: false }).start();
    RNAnimated.spring(commentsTranslateY, { toValue: 0, useNativeDriver: false, tension: 40, friction: 8 }).start();
  };

  const repostMentionContext = useMemo(() => extractMentionQuery(repostCaptionDraft), [repostCaptionDraft]);
  const commentMentionContext = useMemo(() => extractMentionQuery(commentDraft), [commentDraft]);

  const mentionDirectory = useMemo(() => connections.map((c) => {
    const name = `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'Alumni';
    return { id: c?.id, name, handle: toMentionHandle(c?.first_name, c?.last_name), avatar: getAvatarUri(name, c?.alumni_photo), rawPhoto: c?.alumni_photo };
  }), [connections]);

  const repostMentionSuggestions = useMemo(() => repostMentionContext ? mentionDirectory.filter((item) => !repostMentionContext.query.toLowerCase() || item.name.toLowerCase().includes(repostMentionContext.query.toLowerCase()) || item.handle.includes(repostMentionContext.query.toLowerCase())).slice(0, 5) : [], [mentionDirectory, repostMentionContext]);
  const commentMentionSuggestions = useMemo(() => commentMentionContext ? mentionDirectory.filter((item) => !commentMentionContext.query.toLowerCase() || item.name.toLowerCase().includes(commentMentionContext.query.toLowerCase()) || item.handle.includes(commentMentionContext.query.toLowerCase())).slice(0, 5) : [], [commentMentionContext, mentionDirectory]);

  const closeThemedAlert = useCallback(() => setThemedAlertState((c) => ({ ...c, visible: false })), []);
  const showThemedAlert = useCallback(({ title, message, actions }) => setThemedAlertState({ visible: true, title, message, actions: actions?.length ? actions : [{ text: 'OK' }] }), []);
  const handleThemedAlertAction = (action) => { closeThemedAlert(); if (typeof action?.onPress === 'function') action.onPress(); };

  const openGlobalSearch = useCallback(() => navigation.navigate('GlobalSearch'), [navigation]);
  const openCreatePost = useCallback(() => navigation.navigate('CreatePostScreen'), [navigation]);

  const displayedPosts = useMemo(() => sortFeedPosts(posts.filter(isVisibleFeedItem), feedSortMode, feedRefreshNonce, connections, userData), [feedRefreshNonce, feedSortMode, posts, connections, userData]);

  const targetPostId = route?.params?.postId;
  const targetAnnouncementId = route?.params?.announcementId;

  useEffect(() => {
    if (isLoadingPosts || displayedPosts.length === 0) return;
    let targetIndex = -1;
    if (targetPostId) targetIndex = displayedPosts.findIndex(p => String(p.id) === String(targetPostId) && p.feed_type !== 'announcement');
    else if (targetAnnouncementId) targetIndex = displayedPosts.findIndex(p => String(p.id) === String(targetAnnouncementId) && p.feed_type === 'announcement');
    if (targetIndex !== -1) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: targetIndex, animated: true, viewPosition: 0.2 });
      }, 500);
    }
  }, [displayedPosts, targetPostId, targetAnnouncementId, isLoadingPosts]);

  const handleScrollToIndexFailed = (info) => setTimeout(() => flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.2 }), 500);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supaUser = await getCurrentUser();
        if (!supaUser?.email) return;
        const profile = await getAlumniByEmail(supaUser.email).catch(() => null);
        setUserData(profile ?? null);
        try {
          const { getFollowing } = await import('../services/connectionQueries');
          const following = await getFollowing(profile?.id).catch(() => []);
          setConnections(Array.isArray(following) ? following.map((f) => f.followed ?? f) : []);
        } catch (e) { setConnections([]); }
      } catch (error) { setConnections([]); }
    };
    fetchProfile();
  }, []);

  const fetchPosts = useCallback(async ({ showLoadingState = false, reset = false } = {}) => {
    if (feedLoadInFlightRef.current || (!reset && !hasMorePosts)) return;
    const now = Date.now();
    if (!reset && feedPageRef.current === 0 && cachedPosts.length > 0 && (now - lastFetchTime < 2 * 60 * 1000)) {
      setPosts(cachedPosts.filter(isVisibleFeedItem)); setIsLoadingPosts(false); return;
    }
    const pageToLoad = reset ? 0 : feedPageRef.current;
    feedLoadInFlightRef.current = true;
    if (showLoadingState) setIsRefreshingPosts(true); 
    else if (reset) setIsLoadingPosts(posts.length === 0); 
    else setIsFetchingMorePosts(true);

    try {
      setFeedError('');
      let currentUserId = userData?.id ?? currentUserProfile?.id ?? null;
      if (!currentUserId) {
        const supaUser = await getCurrentUser();
        if (supaUser?.email) currentUserId = (await getAlumniByEmail(supaUser.email).catch(() => null))?.id ?? null;
      }
      
      const rawPosts = await getFeedPosts(currentUserId, FEED_PAGE_SIZE, pageToLoad * FEED_PAGE_SIZE).catch(() => []);
      
      let rawAnnouncements = [];
      if (pageToLoad === 0) {
        const { data } = await supabase
          .from('announcements')
          .select('*, admin:admin_id(id, admin_first_name, admin_last_name, photo), images_announcements(id, image_path)')
          .eq('status', 1)
          .order('date_posted', { ascending: false })
          .limit(15);
        rawAnnouncements = data || [];
      }

      const mappedAnnouncements = rawAnnouncements.map(ann => ({
        id: ann.id,
        feed_id: `announcement-${ann.id}`,
        feed_type: 'announcement',
        announcement_title: ann.title,
        announcement_description: ann.announcement_description,
        date_posted: ann.date_posted,
        scheduled_at: ann.scheduled_at,
        created_at: ann.scheduled_at || ann.date_posted || ann.created_at,
        status: ann.status, 
        images: (ann.images_announcements || []).map(img => {
          const isVid = isVideoUri(img.image_path);
          return {
            id: img.id,
            image_path: img.image_path,
            is_video: isVid,
            media_type: isVid ? 'video' : 'image'
          };
        }),
        alumni: {
          id: ann.admin?.id,
          first_name: "NU Lipa Alumni Affairs",
          last_name: "Office",
          alumni_photo: ann.admin?.photo
        },
        is_owner: false,
        can_manage: false,
        reaction_count: 0,
        comment_count: 0,
        repost_count: 0
      }));

      const mappedPosts = (rawPosts || []).map((post) => {
        const images = Array.isArray(post.images) && post.images.length > 0 ? post.images.map((img) => {
              const isVideo = img?.is_video === true || img?.media_type === 'video';
              let thumbnail = null;
              if (isVideo) thumbnail = img?.thumbnail_path || img?.thumbnail || img?.poster_path || img?.video_thumbnail;
              return { ...img, image_url: img.image_path ?? img.image_url ?? img.uri ?? null, is_video: isVideo, thumbnail_path: thumbnail, thumbnail: thumbnail };
            }) : [];
        const author = post.alumnis ?? post.alumni ?? post.author ?? {};
        const isOwned = Boolean(currentUserId && author?.id && String(author.id) === String(currentUserId));
        return { ...post, images, alumni: author, is_owner: isOwned, can_manage: isOwned };
      });
      
      const combinedFeed = mergeFeedItems([], [...mappedAnnouncements, ...mappedPosts]);
      
      setPosts((curr) => (reset ? combinedFeed : mergeFeedItems(curr, combinedFeed)));
      if (reset) { 
        setCachedPosts(combinedFeed); 
        setLastFetchTime(now); 
      }
      
      feedPageRef.current = pageToLoad + 1;
      setHasMorePosts(mappedPosts.length === FEED_PAGE_SIZE);
    } catch (error) { 
      setFeedError('Unable to load posts right now.'); 
    } finally {
      feedLoadInFlightRef.current = false; 
      setIsLoadingPosts(false); 
      setIsRefreshingPosts(false); 
      setIsFetchingMorePosts(false);
    }
  }, [currentUserProfile?.id, hasMorePosts, posts.length, userData?.id, cachedPosts, lastFetchTime]);

    useFocusEffect(
    useCallback(() => {
      if (posts.length === 0) {
        feedPageRef.current = 0;
        setHasMorePosts(true);
        fetchPosts({ reset: true });
        return;
      }

      let cancelled = false;
      const refreshMyReactions = async () => {
        try {
          const currentUserId = userData?.id ?? currentUserProfile?.id ?? null;
          if (!currentUserId) return;

          const postIds = posts
            .filter((p) => p.feed_type !== "announcement")
            .map((p) => p.id)
            .filter(Boolean);

          if (postIds.length === 0) return;

          const [reactionsRes, repostsRes] = await Promise.all([
            supabase
              .from("reactions")
              .select("post_id, reaction")
              .eq("alumni_id", currentUserId)
              .in("post_id", postIds),
            supabase
              .from("reposts")
              .select("post_id")
              .eq("alumni_id", currentUserId)
              .in("post_id", postIds),
          ]);

          if (cancelled) return;

          const reactionByPostId = new Map(
            (reactionsRes.data || []).map((r) => [String(r.post_id), r.reaction ?? "like"])
          );
          const repostPostIdSet = new Set(
            (repostsRes.data || []).map((r) => String(r.post_id))
          );

          setPosts((curr) =>
            curr.map((p) => {
              if (p.feed_type === "announcement") return p;
              return {
                ...p,
                my_reaction: reactionByPostId.get(String(p.id)) ?? null,
                my_repost: repostPostIdSet.has(String(p.id)),
              };
            })
          );
        } catch (e) {
          console.warn("[feed] refresh reactions failed:", e?.message);
        }
      };

      refreshMyReactions();
      return () => { cancelled = true; };
    }, [fetchPosts, posts.length, userData?.id, currentUserProfile?.id])
  );

  const handleRefreshPosts = useCallback(() => {
    if (feedLoadInFlightRef.current) return;
    setCachedPosts([]);
    setLastFetchTime(0);
    setFeedRefreshNonce((c) => c + 1);
    feedPageRef.current = 0;
    setHasMorePosts(true);
    void fetchPosts({ showLoadingState: true, reset: true });
  }, [fetchPosts]);
  useEffect(() => { const sub = DeviceEventEmitter.addListener("REFRESH_FEED", handleRefreshPosts); return () => sub.remove(); }, [handleRefreshPosts]);
  const handleLoadMorePosts = useCallback(() => { if (!isLoadingPosts && !isRefreshingPosts && !isFetchingMorePosts && hasMorePosts) fetchPosts({ reset: false }); }, [fetchPosts, hasMorePosts, isFetchingMorePosts, isLoadingPosts, isRefreshingPosts]);

  const handleDownloadImage = useCallback(async (uri) => {
    if (!uri) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { showThemedAlert({ title: 'Permission Denied', message: 'We need permission to save images to your device.' }); return; }
      const fileUri = `${FileSystem.documentDirectory}${uri.split('/').pop().split('?')[0] || `luminus_image_${Date.now()}.jpg`}`;
      await FileSystem.downloadAsync(uri, fileUri);
      await MediaLibrary.saveToLibraryAsync(fileUri);
      showThemedAlert({ title: 'Downloaded', message: 'Image successfully saved to your gallery.' });
    } catch (error) { showThemedAlert({ title: 'Error', message: 'Failed to download the image.' }); }
  }, [showThemedAlert]);

  const handleReportFromViewer = useCallback(() => { if (!viewerPost?.id) return; setReportTarget({ id: viewerPost.id, type: 'post' }); closeImageViewer(); setTimeout(() => setReportModalVisible(true), 350); }, [viewerPost]);

  const getPostVisibilityLabel = (post) => post?.is_draft ? 'Draft' : ({ private: 'Private', friends: 'Friends' }[String(post?.visibility ?? '').toLowerCase()] || 'Public');
  const resolveActiveAlumniId = useCallback(async () => (userData?.id || (await getAlumniByEmail((await getCurrentUser())?.email).catch(() => null))?.id) ?? null, [userData?.id]);  
  const canManagePost = useCallback((post) => Boolean(post?.feed_type === 'post' && (post?.is_owner || post?.can_manage || String((post?.alumni ?? post?.author ?? post?.alumnis ?? {})?.id) === String(userData?.id))), [userData?.id]);
  const canManageComment = useCallback((c) => Boolean(userData?.id && String((c?.alumni ?? c?.author ?? c?.alumnis ?? {})?.id) === String(userData?.id)), [userData?.id]);

  const openPostActions = useCallback((post) => { setActivePostActionPost(post); setPostActionsVisible(true); }, []);
  const openCommentActions = useCallback((comment) => { setActiveCommentActionComment(comment); setCommentActionsVisible(true); }, []);
  const closePostActions = useCallback(() => { if (!isPostActionSaving) { setPostActionsVisible(false); setActivePostActionPost(null); } }, [isPostActionSaving]);
  const closeCommentActions = useCallback(() => { if (!isCommentActionSaving) { setCommentActionsVisible(false); setActiveCommentActionComment(null); } }, [isCommentActionSaving]);

  const openPostReportModal = useCallback(() => { if (!activePostActionPost?.id) return; setReportTarget({ id: activePostActionPost.id, type: 'post' }); setPostActionsVisible(false); setTimeout(() => setReportModalVisible(true), 350); }, [activePostActionPost]);
  const openCommentReportModal = useCallback(() => { if (!activeCommentActionComment?.id) return; setReportTarget({ id: activeCommentActionComment.id, type: 'comment' }); setCommentActionsVisible(false); setTimeout(() => setReportModalVisible(true), 350); }, [activeCommentActionComment]);

  const submitReport = useCallback(async (reason) => {
    if (!reportTarget.id) return;
    setReportModalVisible(false);
    try {
      const currentUserId = userData?.id || await resolveActiveAlumniId();
      if (!currentUserId) throw new Error("User not authenticated");
      if (reportTarget.type === 'post') {
        await supabase.from('post_reports').insert([{ post_id: reportTarget.id, reporter_id: currentUserId, reason }]);
        // 🔥 THE FRONTEND FIX: Immediately rip the post and any reposts of it out of the UI
        setPosts((curr) => curr.filter((p) => p.id !== reportTarget.id && p.original_post_id !== reportTarget.id));
      } else {
        await supabase.from('comment_reports').insert([{ comment_id: reportTarget.id, reporter_id: currentUserId, reason }]);
        const { count } = await supabase.from('comment_reports').select('*', { count: 'exact', head: true }).eq('comment_id', reportTarget.id);
        if (count >= 10) {
          await supabase.from('comments').update({ moderation_status: 'under_review' }).eq('id', reportTarget.id);
          setComments((curr) => curr.filter((c) => c.id !== reportTarget.id));
          setPosts((curr) => curr.map((p) => p.id === activeCommentPost?.id ? { ...p, comment_count: Math.max(0, (p.comment_count ?? 1) - 1) } : p));
        }
      }
      showThemedAlert({ title: 'Reported', message: reportTarget.type === 'post' ? 'Thanks — we removed this post from your feed.' : 'Thanks — your report has been submitted.' });
    } catch (e) { showThemedAlert({ title: 'Reported', message: 'You already reported this item, or an error occurred.' }); }
  }, [reportTarget, userData?.id, resolveActiveAlumniId, showThemedAlert, activeCommentPost?.id]);

  const handleMuteAuthor = useCallback(async () => {
    if (!activePostActionPost?.alumni?.id) return;
    setPostActionsVisible(false);
    try {
      const currentUserId = userData?.id || await resolveActiveAlumniId();
      if (currentUserId) await supabase.from('muted_users').insert([{ user_id: currentUserId, muted_user_id: activePostActionPost.alumni.id }]);
      setPosts((curr) => curr.filter((p) => p.alumni?.id !== activePostActionPost.alumni.id));
      showThemedAlert({ title: 'Muted', message: "You won't see posts from this user anymore." });
    } catch (e) { showThemedAlert({ title: 'Error', message: 'Could not mute the user.' }); }
  }, [activePostActionPost, userData?.id, resolveActiveAlumniId, showThemedAlert]);

  const handleHidePost = useCallback(async () => {
    if (!activePostActionPost?.id) return;
    setPostActionsVisible(false);
    try {
      const currentUserId = userData?.id || await resolveActiveAlumniId();
      if (currentUserId) await supabase.from('hidden_posts').insert([{ user_id: currentUserId, post_id: activePostActionPost.id }]);
    } catch (e) {}
    setPosts((curr) => curr.filter((p) => p.id !== activePostActionPost.id && p.original_post_id !== activePostActionPost.id));
    showThemedAlert({ title: 'Hidden', message: 'This post has been hidden from your feed.' });
  }, [activePostActionPost, userData?.id, resolveActiveAlumniId, showThemedAlert]);

  const handleEditComment = useCallback(() => {
    if (!activeCommentActionComment?.id) return;
    setCommentActionsVisible(false); setEditingComment(activeCommentActionComment); setReplyingToComment(null);
    setCommentDraft(activeCommentActionComment.comment ?? activeCommentActionComment.body ?? activeCommentActionComment.text ?? '');
    commentsTranslateY.setValue(SCREEN_HEIGHT); setCommentsVisible(true);
  }, [activeCommentActionComment, commentsTranslateY]);

  const handleDeleteCommentAction = useCallback(() => {
    if (!activeCommentActionComment?.id) return;
    showThemedAlert({
      title: 'Delete comment?', message: 'This action cannot be undone.',
      actions: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              setIsCommentActionSaving(true);
              await deleteComment(activeCommentActionComment.id);
              setComments((curr) => curr.filter((c) => c.id !== activeCommentActionComment.id));
              setPosts((curr) => curr.map((p) => p.id === activeCommentPost?.id ? { ...p, comment_count: Math.max(0, (p.comment_count ?? 1) - 1) } : p));
              closeCommentActions();
            } catch (error) { showThemedAlert({ title: 'Delete failed', message: 'Unable to delete the comment right now.' }); } finally { setIsCommentActionSaving(false); }
          }
        },
      ],
    });
  }, [activeCommentActionComment, activeCommentPost?.id, closeCommentActions, showThemedAlert]);

  const syncPostInFeed = useCallback((updated) => {
    if (!updated?.id) return;
    const patch = { caption: updated.caption, visibility: updated.visibility, is_draft: updated.is_draft, images: Array.isArray(updated.images) && updated.images.length > 0 ? updated.images : undefined };
    setPosts((curr) => curr.map((p) => p.feed_type === 'post' && p.id === updated.id ? { ...p, ...patch, images: patch.images ?? p.images } : p));
    setViewerPost((curr) => curr && curr.feed_type === 'post' && curr.id === updated.id ? { ...curr, ...patch, images: patch.images ?? curr.images } : curr);
  }, []);

  const removePostFromFeed = useCallback((postId) => {
    setPosts((curr) => curr.filter((p) => !(p.feed_type === 'post' && p.id === postId)));
    setViewerPost((curr) => (curr && curr.feed_type === 'post' && curr.id === postId ? null : curr));
    if (viewerPost?.feed_type === 'post' && viewerPost?.id === postId) { setViewerVisible(false); setViewerImages([]); setViewerIndex(0); }
  }, [viewerPost]);

  const updateActivePost = useCallback(async (payload, successTitle, successMessage) => {
    if (!activePostActionPost?.id || isPostActionSaving) return;
    try {
      setIsPostActionSaving(true);
      const updated = await updatePost(activePostActionPost.id, payload).catch((e) => { throw e; });
      syncPostInFeed(updated ?? { ...activePostActionPost, ...payload });
      setPostActionsVisible(false); setActivePostActionPost(null);
      showThemedAlert({ title: successTitle, message: successMessage });
    } catch (error) { showThemedAlert({ title: 'Update failed', message: 'Unable to update the post right now.' }); } finally { setIsPostActionSaving(false); }
  }, [activePostActionPost, isPostActionSaving, syncPostInFeed, showThemedAlert]);

  const handleEditActivePost = () => { if (activePostActionPost) { setPostActionsVisible(false); setActivePostActionPost(null); navigation.navigate('CreatePostScreen', { post: activePostActionPost }); } };
  const handleToggleActivePostDraft = () => { if (activePostActionPost) updateActivePost({ is_draft: !activePostActionPost.is_draft }, activePostActionPost.is_draft ? 'Post published' : 'Draft saved', activePostActionPost.is_draft ? 'Your post is visible again.' : 'Your post was saved as a draft.'); };
  const handleChangeActivePostVisibility = (visibility) => updateActivePost({ visibility }, 'Visibility updated', `This post is now visible to ${getPostVisibilityLabel({ visibility })}.`);
  
  const handleDeleteActivePost = () => {
    if (!activePostActionPost) return;
    showThemedAlert({
      title: 'Delete post?', message: 'This action cannot be undone.',
      actions: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            const postId = activePostActionPost.id;
            try {
              setPostActionsVisible(false); setActivePostActionPost(null); setIsDeletingPost(true);
              await deletePost(postId); removePostFromFeed(postId);
              showThemedAlert({ title: 'Post deleted', message: 'Your post has been removed.' });
            } catch (error) { showThemedAlert({ title: 'Delete failed', message: 'Unable to delete the post right now.' }); } finally { setIsDeletingPost(false); }
          }
        },
      ],
    });
  };

  const getFeedItemKey = (post) => getFeedItemKeyValue(post);

  const handleCaptionMentionPress = useCallback((mentionText) => {
    const mentionHandle = String(mentionText ?? '').replace(/^@/, '').toLowerCase();
    if (!mentionHandle) return;
    const matchedConnection = mentionDirectory.find((item) => item.handle === mentionHandle);
    if (!matchedConnection?.id) { showThemedAlert({ title: 'Mention unavailable', message: `No profile found for @${mentionHandle}.` }); return; }
    navigation.navigate(matchedConnection.id === userData?.id ? 'Profile' : 'ProfileView', { userId: matchedConnection.id });
  }, [mentionDirectory, userData?.id, navigation, showThemedAlert]);

  const renderCaptionWithMentions = (caption, captionStyle) => {
    if (!caption) return null;
    return String(caption ?? '').split(MENTION_PATTERN).map((seg, idx) => {
      const isMention = MENTION_PATTERN.test(seg);
      MENTION_PATTERN.lastIndex = 0;
      return isMention ? (
        <Text key={`mention-${idx}-${seg}`} style={[captionStyle, styles.captionMention]} onPress={() => handleCaptionMentionPress(seg)}>
          {seg}
        </Text>
      ) : (
        <Text key={`caption-${idx}`}>{seg}</Text>
      );
    });
  };

  const renderPostImageUri = useCallback((image) => {
    const isVideo = image?.is_video === true || image?.media_type === 'video';
    if (isVideo) {
      const thumbnailPath = image?.thumbnail_path || image?.thumbnail || image?.poster_path;
      if (thumbnailPath) {
        const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const bucket = 'luminus_assets';
        const cleanPath = String(thumbnailPath).replace(/^\/+/, '');
        return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
      }
      const videoPath = image?.video_path || image?.image_path || image?.image_url;
      if (videoPath) {
        const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const bucket = 'luminus_assets';
        const cleanPath = String(videoPath).replace(/^\/+/, '');
        return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
      }
      return null;
    }
    const raw = image?.image_url ?? image?.image_path ?? image?.media_path ?? '';
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const bucket = 'luminus_assets';
    const cleanPath = String(raw).replace(/^\/+/, '');
    return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
  }, []);

  const getPostImageKey = (postId, image, imageIndex) => image.id ?? `${postId}-${imageIndex}`;
  const updatePostImageRatio = useCallback((k, w, h) => { if (w && h) { const r = w / h; setPostImageRatios((c) => c[k] === r ? c : { ...c, [k]: r }); } }, []);

  const renderPressableImage = useCallback((post, postImages, image, imageIndex, imageStyle, isActiveVideo) => {
    const videoUri = image?.video_path 
      ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/luminus_assets/${image.video_path}`
      : renderPostImageUri(image);
    
    const thumbnailUri = renderPostImageUri(image);
    const isVideo = image?.is_video === true || image?.media_type === 'video';
    
    if (isVideo && !videoUri) {
      return (
        <View style={[styles.postMediaImage, imageStyle, { backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="videocam-off" size={40} color="#6B7280" />
          <Text style={{ color: '#6B7280', marginTop: 8, fontSize: 12 }}>Video unavailable</Text>
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
  }, [renderPostImageUri, handlePostMediaTap, updatePostImageRatio]);

  const renderPostImageLayout = (post, postId, postImages, isActiveVideo) => {
    if (postImages.length === 1) return (<View style={[styles.postSingleImageWrap, { aspectRatio: postImageRatios[getPostImageKey(postId, postImages[0], 0)] ?? 1.2 }]}>{renderPressableImage(post, postImages, postImages[0], 0, styles.postSingleImage, isActiveVideo)}</View>);
    if (postImages.length === 2) return (<View style={styles.postTwoGrid}><View style={[styles.postTwoPrimaryTile, { aspectRatio: postImageRatios[getPostImageKey(postId, postImages[0], 0)] ?? 1.05 }]}>{renderPressableImage(post, postImages, postImages[0], 0, styles.postCollageImage, isActiveVideo)}</View><View style={[styles.postTwoSecondaryTile, { aspectRatio: postImageRatios[getPostImageKey(postId, postImages[1], 1)] ?? 0.95 }]}>{renderPressableImage(post, postImages, postImages[1], 1, styles.postCollageImage, isActiveVideo)}</View></View>);
    if (postImages.length === 3) return (<View style={styles.postThreeCollage}><View style={styles.postThreeLeftTile}>{renderPressableImage(post, postImages, postImages[0], 0, styles.postCollageImage, isActiveVideo)}</View><View style={styles.postThreeRightColumn}><View style={styles.postThreeRightTile}>{renderPressableImage(post, postImages, postImages[1], 1, styles.postCollageImage, isActiveVideo)}</View><View style={styles.postThreeRightTile}>{renderPressableImage(post, postImages, postImages[2], 2, styles.postCollageImage, isActiveVideo)}</View></View></View>);
    if (postImages.length === 4) return (<View style={styles.postFourGrid}>{postImages.slice(0, 4).map((image, idx) => (<View key={getPostImageKey(postId, image, idx)} style={styles.postFourGridTile}>{renderPressableImage(post, postImages, image, idx, styles.postCollageImage, isActiveVideo)}</View>))}</View>);
    const remainingCount = Math.max(postImages.length - 4, 0);
    return (
      <View style={styles.postFivePlusGrid}>
        {postImages.slice(0, 4).map((image, idx) => (
          <View key={getPostImageKey(postId, image, idx)} style={styles.postFivePlusTile}>
            {renderPressableImage(post, postImages, image, idx, styles.postCollageImage, isActiveVideo)}
            {idx === 3 && renderOverlayCount(remainingCount, () => openImageViewer(post, postImages, idx))}
          </View>
        ))}
      </View>
    );
  };

  const renderOverlayCount = (remainingCount, onPress) => remainingCount <= 0 ? null : <Pressable style={styles.postImageOverlay} onPress={onPress}><Text style={styles.postImageOverlayText}>+{remainingCount}</Text></Pressable>;

  const openImageViewer = (post, postImages, imageIndex) => {
    setViewerPost(post);
    setViewerImages(postImages.map((img) => {
      const isVideo = img?.is_video === true || img?.media_type === 'video';
      
      if (isVideo) {
        const videoPath = img?.video_path || img?.image_path;
        const videoUri = videoPath
          ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/luminus_assets/${String(videoPath).replace(/^\/+/, '')}`
          : null;
        
        const thumbPath = img?.thumbnail_path || img?.thumbnail || img?.poster_path;
        const posterUri = thumbPath
          ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/luminus_assets/${String(thumbPath).replace(/^\/+/, '')}`
          : null;
        
        return { uri: posterUri || videoUri, videoUri, posterUri, isVideo: true };
      }
      
      return {
        uri: renderPostImageUri(img),
        isVideo: false,
      };
    }));
    setViewerIndex(imageIndex);
    setViewerVisible(true);
  };

  const closeImageViewer = () => { setViewerVisible(false); setViewerPost(null); };

  const handlePostComment = useCallback((post) => {
    isClosingRef.current = false; setActiveCommentPost(post); setReplyingToComment(null); setCommentDraft(''); setComments([]); setCommentsError(''); setExpandedCommentParents({});
    commentsTranslateY.setValue(SCREEN_HEIGHT); setCommentsVisible(true);
  }, [commentsTranslateY]);

  const handleReplyToComment = useCallback((c) => { setReplyingToComment(c); setEditingComment(null); }, []);

  const closeCommentsModal = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    RNAnimated.timing(commentsTranslateY, { toValue: SCREEN_HEIGHT, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(() => {
      setCommentsVisible(false); setActiveCommentPost(null); setReplyingToComment(null); setEditingComment(null); setCommentDraft(''); setCommentInputHeight(48); setExpandedCommentParents({}); commentsSwipeStartRef.current = 0;
      setTimeout(() => { isClosingRef.current = false; }, 120);
    });
  };

  const handleCommentInputContentSizeChange = (e) => setCommentInputHeight(Math.max(48, Math.min(e?.nativeEvent?.contentSize?.height ?? 48, 100)));

  const handleSubmitComment = () => {
    const trimmedComment = commentDraft.trim();
    if (!trimmedComment || !activeCommentPost) return;
    const isAnnouncement = activeCommentPost.feed_type === 'announcement';
    const targetPostId = isAnnouncement ? null : resolveFeedInteractionTarget(activeCommentPost).postId;
    const targetAnnouncementId = isAnnouncement ? activeCommentPost.id : null;

    if (editingComment?.id) {
      const prevText = editingComment.comment ?? editingComment.body ?? editingComment.text ?? '';
      setComments((curr) => curr.map((c) => (c.id === editingComment.id ? { ...c, comment: trimmedComment } : c)));
      setEditingComment(null); setReplyingToComment(null); setCommentDraft(''); setCommentInputHeight(48);
      updateComment(editingComment.id, trimmedComment).then((saved) => { if (saved) setComments((curr) => curr.map((c) => (c.id === saved.id ? saved : c))); }).catch((e) => { setComments((curr) => curr.map((c) => (c.id === editingComment.id ? { ...c, comment: prevText } : c))); showThemedAlert({ title: 'Comments', message: 'Unable to update your comment right now.' }); });
      return;
    }

    const pendingId = `temp-${Date.now()}`;
    const pendingComment = { id: pendingId, comment: trimmedComment, parent_id: replyingToComment?.id ?? null, created_at: new Date().toISOString(), is_pending: true, alumni: { id: userData?.id, first_name: userData?.first_name, last_name: userData?.last_name, alumni_photo: userData?.alumni_photo } };
    setComments((curr) => [pendingComment, ...curr]);
    
    setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(targetPostId) ? { ...p, comment_count: (p.comment_count ?? 0) + 1 } : p));
    setViewerPost((curr) => curr && String(resolveFeedInteractionTarget(curr).postId) === String(targetPostId) ? { ...curr, comment_count: (curr.comment_count ?? 0) + 1 } : curr);
    
    setReplyingToComment(null); setEditingComment(null); setCommentDraft(''); setCommentInputHeight(48);

    resolveActiveAlumniId().then((alumniId) => addComment(targetPostId, alumniId, trimmedComment, pendingComment.parent_id, targetAnnouncementId)).then((saved) => {
      if (saved) { 
        setComments((curr) => curr.map((c) => (c.id === pendingId ? saved : c))); 
        setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(targetPostId) ? { ...p, comment_count: saved.comment_count ?? p.comment_count ?? 0 } : p)); 
      }
    }).catch((e) => {
      setComments((curr) => curr.filter((c) => c.id !== pendingId));
      setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(targetPostId) ? { ...p, comment_count: Math.max(0, (p.comment_count ?? 1) - 1) } : p));
      showThemedAlert({ title: 'Comments', message: 'Unable to post your comment right now.' });
    });
  };

   useEffect(() => {
    if (!commentsVisible || !activeCommentPost) return;
    let isMounted = true;
    const fetchComments = async () => {
      try {
        setCommentsLoading(true); 
        setCommentsError('');
        const res = await getPostComments(
          activeCommentPost?.feed_type === 'announcement' ? null : resolveFeedInteractionTarget(activeCommentPost).postId, 
          20, 
          activeCommentPost?.feed_type === 'announcement' ? activeCommentPost.id : null
        );
        if (isMounted) setComments(res ?? []);
      } catch (e) { 
        if (isMounted) setCommentsError('Unable to load comments right now.'); 
      } finally { 
        if (isMounted) setCommentsLoading(false); 
      }
    };
    fetchComments();
    return () => { isMounted = false; };
  }, [activeCommentPost, commentsVisible]);

  const toggleCommentReplies = (id) => setExpandedCommentParents((curr) => ({ ...curr, [id]: !curr[id] }));

  const commentTree = useMemo(() => {
    const repliesByParentId = new Map();
    const topLevelComments = [];
    comments.forEach((c) => { if (c?.parent_id) { const reps = repliesByParentId.get(c.parent_id) ?? []; reps.push(c); repliesByParentId.set(c.parent_id, reps); } else topLevelComments.push(c); });
    const buildChildren = (p) => (repliesByParentId.get(p.id) ?? []).map((c) => ({ comment: c, replies: buildChildren(c) }));
    return topLevelComments.map((c) => ({ comment: c, replies: buildChildren(c) }));
  }, [comments]);

  const renderCommentNode = (thread, depth = 0, parentComment = null) => {
    const { comment, replies } = thread;
    const isExpanded = Boolean(expandedCommentParents[comment.id]);
    const likeCount = comment?.like_count ?? comment?.reaction_count ?? comment?.likes_count ?? null;
    const canManageThisComment = canManageComment(comment);
    const authorName = depth > 0 ? comment?.alumni?.first_name ?? 'Alumni' : renderCommentAuthorName(comment);

    return (
      <View key={`comment-${String(comment?.id ?? `${depth}-${parentComment?.id ?? 'root'}`)}`} style={styles.commentThread}>
        <View style={[styles.commentItem, depth > 0 ? styles.commentItemReply : null]}>
          {hasValidProfilePhoto(comment?.alumni?.alumni_photo) && renderCommentAvatarUri(comment) ? ( <Image source={{ uri: renderCommentAvatarUri(comment) }} style={styles.commentAvatar} contentFit="cover" /> ) : ( <AvatarInitials name={authorName} size={32} style={styles.commentAvatar} backgroundColor="#31429B" /> )}
          <View style={styles.commentContentColumn}>
            <View style={styles.commentReplyHeaderRow}>
              <Text style={styles.commentAuthorName}>{authorName}</Text>
              {depth > 0 && parentComment && <Text style={styles.commentReplyingToHandle} numberOfLines={1}>▸ {parentComment?.alumni?.first_name ?? 'Alumni'}</Text>}
            </View>
            <Text style={styles.commentText}>{comment.comment ?? comment.body ?? comment.text ?? ''}</Text>
            <View style={styles.commentMetaRow}>
              <Text style={styles.commentTimestamp}>{getRelativeTimeLabel(comment.created_at)}</Text>
              <Pressable style={styles.commentReplyButton} onPress={() => handleReplyToComment(comment)}><Text style={styles.commentReplyButtonText}>Reply</Text></Pressable>
            </View>
          </View>
          <View style={styles.commentActionColumn}>
            <Pressable style={styles.commentActionButton} onPress={() => openCommentActions(comment)} hitSlop={8}><Ionicons name="ellipsis-vertical" size={14} color={canManageThisComment ? '#31429B' : '#94A3B8'} /></Pressable>
            {likeCount !== null && (<><Ionicons name="heart-outline" size={14} color="#94A3B8" /><Text style={styles.commentLikeCount}>{likeCount}</Text></>)}
          </View>
        </View>
        {depth === 0 && replies.length > 0 && !isExpanded && (<Pressable style={styles.viewRepliesRow} onPress={() => toggleCommentReplies(comment.id)}><View style={styles.viewRepliesLine} /><Text style={styles.viewRepliesText}>View {replies.length} replies</Text><Ionicons name="chevron-down" size={13} color="#94A3B8" /></Pressable>)}
        {replies.length > 0 && (depth === 0 ? isExpanded : true) && (
          <View style={depth === 0 ? styles.commentRepliesList : styles.commentNestedRepliesList}>
            {replies.map((r) => renderCommentNode(r, depth + 1, comment))}
            {depth === 0 && (<Pressable style={styles.hideRepliesRow} onPress={() => toggleCommentReplies(comment.id)}><View style={styles.viewRepliesLine} /><Text style={styles.hideRepliesText}>Hide replies</Text><Ionicons name="chevron-up" size={13} color="#31429B" /></Pressable>)}
          </View>
        )}
      </View>
    );
  };

  const playReactionPulse = useCallback((postId) => {
    setReactionPulsePostId(postId);
    reactionPulseScale.stopAnimation();
    reactionPulseScale.setValue(0.94);
    RNAnimated.sequence([
      RNAnimated.timing(reactionPulseScale, { toValue: 1.08, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      RNAnimated.spring(reactionPulseScale, { toValue: 1, tension: 140, friction: 14, useNativeDriver: true }),
    ]).start(() => setReactionPulsePostId((c) => (c === postId ? null : c)));
  }, [reactionPulseScale]);

  const handlePostReaction = useCallback(async (post) => {
    playReactionPulse(post.id);
    const target = resolveFeedInteractionTarget(post);
    const nextReaction = post.my_reaction ? null : 'like';

    setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, my_reaction: nextReaction, reaction_count: Math.max(0, (p.reaction_count ?? 0) + (nextReaction ? 1 : -1)) } : p));
    setViewerPost((curr) => curr && String(resolveFeedInteractionTarget(curr).postId) === String(target.postId) ? { ...curr, my_reaction: nextReaction, reaction_count: Math.max(0, (curr.reaction_count ?? 0) + (nextReaction ? 1 : -1)) } : curr);

    try {
      const alumniId = await resolveActiveAlumniId();
      if (!alumniId) throw new Error('No alumni profile');
      if (nextReaction) await addReaction(target.postId, alumniId, 'like', target.announcementId);
      else await removeReaction(target.postId, alumniId, 'like', target.announcementId);
      if (target.postId) {
        const refreshed = await getPostById(target.postId, alumniId).catch(() => null);
        if (refreshed) setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, reaction_count: refreshed.reactions_count ?? p.reaction_count, my_reaction: nextReaction } : p));
      }
    } catch (e) {
      setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, my_reaction: post.my_reaction ?? null, reaction_count: post.reaction_count ?? 0 } : p));
    }
  }, [playReactionPulse, resolveActiveAlumniId]);


  const handlePostRepost = useCallback(async (post, caption = '') => {
    const target = resolveFeedInteractionTarget(post);
    if (!target.postId) {
      showThemedAlert({ title: 'Repost failed', message: 'Unable to identify the original post.' });
      return false;
    }
    
    const nextRepostState = !post.my_repost;
    setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, my_repost: nextRepostState, repost_count: Math.max(0, (p.repost_count ?? 0) + (nextRepostState ? 1 : -1)) } : p));

    try {
      const alumniId = await resolveActiveAlumniId();
      if (!alumniId) throw new Error('No alumni profile');
      if (nextRepostState) await createRepost(target.postId, alumniId, caption);
      else await supabase.from('reposts').delete().eq('post_id', target.postId).eq('alumni_id', alumniId);
      const refreshed = await getPostById(target.postId, alumniId).catch(() => null);
      if (refreshed) setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, repost_count: refreshed.reposts_count ?? p.repost_count, my_repost: nextRepostState } : p));
      return true;
    } catch (e) {
      setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, my_repost: post.my_repost ?? false, repost_count: post.repost_count ?? 0 } : p));
      showThemedAlert({ title: 'Repost', message: 'Unable to repost right now. Please try again.' });
      return false;
    }
  }, [resolveActiveAlumniId, showThemedAlert]);

  const openRepostComposer = useCallback((post) => {
    if (post?.my_repost) {
      showThemedAlert({
        title: 'Remove repost?',
        message: 'This will remove your repost from the feed.',
        actions: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => handlePostRepost(post) },
        ],
      });
      return;
    }
    setActiveRepostPost(post);
    setRepostCaptionDraft('');
    setRepostComposerVisible(true);
  }, [showThemedAlert, handlePostRepost]);

  const handlePostMediaTap = useCallback((post, postImages, imageIndex) => {
    const postKey = getFeedItemKey(post);
    const sameTapTarget =
      postMediaTapStateRef.current.postKey === postKey &&
      postMediaTapStateRef.current.imageIndex === imageIndex;

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
  }, [handlePostReaction]);

  useEffect(() => () => { if (postMediaTapTimeoutRef.current) { clearTimeout(postMediaTapTimeoutRef.current); postMediaTapTimeoutRef.current = null; } }, []);

  const closeRepostComposer = () => { setRepostComposerVisible(false); setActiveRepostPost(null); setRepostCaptionDraft(''); };
  const submitRepostWithCaption = () => { if (activeRepostPost) { closeRepostComposer(); handlePostRepost(activeRepostPost, repostCaptionDraft.trim()); } };
  
  const handleRepostMentionPick = (handle) => { if (repostMentionContext) setRepostCaptionDraft((curr) => `${String(curr ?? '').slice(0, repostMentionContext.mentionStart)}@${handle} ${String(curr ?? '').slice(repostMentionContext.mentionEnd)}`); };
  const handleCommentMentionPick = (handle) => { if (commentMentionContext) setCommentDraft((curr) => `${String(curr ?? '').slice(0, commentMentionContext.mentionStart)}@${handle} ${String(curr ?? '').slice(commentMentionContext.mentionEnd)}`); };

  // ==============================================
  // 🎨 NEW REPOST HEADER DESIGN
  // ==============================================
  const renderRepostHeader = useCallback((post) => {
    if (post.feed_type === 'announcement') return null;

    let reposterNames = [];
    let isYou = false;

    if (Array.isArray(post.reposters)) {
      post.reposters.forEach((r) => {
        if (String(r.id) === String(userData?.id)) {
          isYou = true;
        } else {
          const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
          if (name) reposterNames.push(name);
        }
      });
    }

    if (post.my_repost) isYou = true;
    if (isYou) reposterNames.unshift('You'); 
    if (reposterNames.length === 0 && post.feed_type === 'repost') reposterNames.push('Someone');
    if (reposterNames.length === 0) return null;

    let uniqueNames = [...new Set(reposterNames)];
    let boldText = '';
    let labelText = '';

    if (uniqueNames.length === 1) {
      boldText = uniqueNames[0];
      labelText = ' reposted';
    } else if (uniqueNames.length === 2) {
      boldText = `${uniqueNames[0]} and ${uniqueNames[1]}`;
      labelText = ' reposted';
    } else {
      boldText = `${uniqueNames[0]}, ${uniqueNames[1]}`;
      labelText = ` and ${uniqueNames.length - 2} others reposted`;
    }

    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 14, 
        backgroundColor: isYou ? '#F0FDF4' : '#F8FAFC', 
        alignSelf: 'flex-start', 
        paddingRight: 14, 
        paddingLeft: 6, 
        paddingVertical: 5, 
        borderRadius: 20, 
        borderWidth: 1, 
        borderColor: isYou ? '#BBF7D0' : '#F1F5F9' 
      }}>
        <View style={{ 
          backgroundColor: isYou ? '#DCFCE7' : '#E2E8F0', 
          width: 24, 
          height: 24, 
          borderRadius: 12, 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginRight: 8 
        }}>
          <Ionicons name="repeat" size={14} color={isYou ? "#15803D" : "#475569"} />
        </View>
        <Text style={{ fontSize: 12, color: '#64748B', fontFamily: 'Poppins_500Medium' }} numberOfLines={1}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#334155' }}>{boldText}</Text>{labelText}
        </Text>
      </View>
    );
  }, [userData?.id]);

  const renderPostItem = useCallback(({ item }) => {
    const isAnnouncement = item.feed_type === 'announcement';
    const postAuthorName = renderPostAuthorName(item);
    const avatarUri = renderPostAvatarUri(item);
    const rawPhoto = item.alumni?.alumni_photo;
    const isActiveVideo = isScreenFocused && activeVideoPostId === item.id;
    
    return (
      <View style={styles.postCard}>
        {renderRepostHeader(item)}
        
        <View style={styles.postHeader}>
          <Pressable
            disabled={isAnnouncement}
            onPress={() => navigation.navigate(item.alumni?.id === userData?.id ? 'Profile' : 'ProfileView', { userId: item.alumni?.id })}
          >
            {isAnnouncement ?
              <Image source={NU_LIPA_AAO_ICON} style={styles.postAvatar} contentFit="cover" /> :
              hasValidProfilePhoto(rawPhoto) && avatarUri ? 
              <OptimizedImage uri={avatarUri} style={styles.postAvatar} thumbnail={true} /> : 
              <AvatarInitials name={postAuthorName} size={40} style={styles.postAvatar} backgroundColor="#31429B" />
            }
          </Pressable>
          <View style={styles.postHeaderTextWrap}>
            <Pressable disabled={isAnnouncement} onPress={() => navigation.navigate(item.alumni?.id === userData?.id ? 'Profile' : 'ProfileView', { userId: item.alumni?.id })}>
              <Text style={styles.postAuthorName} numberOfLines={1}>{postAuthorName}</Text>
            </Pressable>
            <Text style={styles.postMeta}>
              {getRelativeTimeLabel(getFeedItemDateValue(item))}
              {!isAnnouncement && (
                <>
                  {' • '}
                  <Ionicons name="globe-outline" size={10} color="#6B7280" /> Public
                </>
              )}
            </Text>
          </View>
          
            {!isAnnouncement && (
            <Pressable style={styles.postMenuButton} onPress={() => openPostActions(item)} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#1F2937" />
            </Pressable>
          )}

        </View>

        {isAnnouncement ? (
          <>
            {item.announcement_title ? <Text style={styles.announcementTitle}>{item.announcement_title}</Text> : null}
            <ExpandableCaption
              caption={item.announcement_description}
              captionStyle={styles.postCaption}
              onMentionPress={handleCaptionMentionPress}
              renderMentions={renderCaptionWithMentions}
            />
          </>
        ) : (
          <ExpandableCaption
            caption={item.caption}
            captionStyle={styles.postCaption}
            onMentionPress={handleCaptionMentionPress}
            renderMentions={renderCaptionWithMentions}
          />
        )}

        {item.images && item.images.length > 0 ? renderPostImageLayout(item, item.id, item.images, isActiveVideo) : null}

        {item.tracer_progress ? (
          <Pressable
            style={styles.tracerAnswerButton}
            onPress={() => navigation.navigate("TracerMenu")}
          >
            <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
            <Text style={styles.tracerAnswerButtonText}>Answer the Tracer</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {!isAnnouncement && (
        <View style={styles.postReactionRow}>
          <Pressable style={styles.postActionButton} onPress={() => handlePostReaction(item)}>
            <RNAnimated.View style={reactionPulsePostId === item.id ? { transform: [{ scale: reactionPulseScale }] } : undefined}>
              <Ionicons name={item.my_reaction ? 'heart' : 'heart-outline'} size={22} color={item.my_reaction ? '#EF4444' : '#31429B'} />
            </RNAnimated.View>
            <Text style={styles.postActionCount}>{item.reaction_count ?? 0}</Text>
          </Pressable>
          <Pressable style={styles.postActionButton} onPress={() => handlePostComment(item)}>
            <Ionicons name="chatbubble-outline" size={20} color="#31429B" />
            <Text style={styles.postActionCount}>{item.comment_count ?? 0}</Text>
          </Pressable>
          <Pressable style={styles.postActionButton} onPress={() => openRepostComposer(item)}>
            <Ionicons name="repeat" size={22} color={item.my_repost ? '#15803D' : '#31429B'} />
            <Text style={styles.postActionCount}>{item.repost_count ?? 0}</Text>
          </Pressable>
        </View>
      )}
        
      </View>
    );
}, [
  navigation,
  userData,
  reactionPulseScale,
  reactionPulsePostId,
  activeVideoPostId,
  isScreenFocused,
  connections,
  handlePostReaction,
  handlePostComment,
  openRepostComposer,
  openPostActions,
  renderPostAuthorName,
  renderPostAvatarUri,
  renderPostImageLayout,
  renderRepostHeader,
  handleCaptionMentionPress,
  renderCaptionWithMentions,
]);

  const renderSkeleton = () => (
    <View style={{ padding: 16, backgroundColor: '#FFFFFF', marginBottom: 12, borderRadius: 16, marginHorizontal: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' }} />
        <View style={{ marginLeft: 12 }}>
          <View style={{ width: 120, height: 14, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 6 }} />
          <View style={{ width: 80, height: 12, backgroundColor: '#E5E7EB', borderRadius: 4 }} />
        </View>
      </View>
      <View style={{ width: '100%', height: 14, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 6 }} />
      <View style={{ width: '80%', height: 14, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 12 }} />
      <View style={{ width: '100%', height: 200, backgroundColor: '#E5E7EB', borderRadius: 12 }} />
    </View>
  );

  return (
    <View style={[styles.container, { flex: 1, backgroundColor: '#F8FAFC' }]}>
      <View
        style={{
          zIndex: 10,
          backgroundColor: '#F8FAFC',
        }}
      >
        <HomeHeader />
      </View>

      <RNAnimated.FlatList
        ref={flatListRef}
        data={displayedPosts}
        keyExtractor={getFeedItemKey}
        renderItem={renderPostItem}
        extraData={reactionPulsePostId}
        contentContainerStyle={{ paddingTop: 0, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshingPosts} onRefresh={handleRefreshPosts} tintColor="#31429B" colors={['#31429B']} />}
        onEndReached={handleLoadMorePosts}
        onEndReachedThreshold={0.5}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListHeaderComponent={
          <View style={styles.searchContainer}>
            <Pressable style={styles.searchBar} onPress={openGlobalSearch}>
              <Ionicons name="search-outline" size={20} color="#888888" style={styles.searchIcon} />
              <Text style={styles.searchPlaceholderText}>Search</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isLoadingPosts ? (
            <View style={{ marginTop: 10 }}>{renderSkeleton()}{renderSkeleton()}{renderSkeleton()}</View>
          ) : feedError ? (
            <View style={styles.feedStateCard}><Ionicons name="alert-circle-outline" size={22} color="#B42318" /><Text style={styles.feedStateText}>{feedError}</Text></View>
          ) : (
            <View style={styles.feedStateCard}><Ionicons name="chatbubble-ellipses-outline" size={22} color="#8A94A6" /><Text style={styles.feedStateText}>No posts yet.</Text></View>
          )
        }
        ListFooterComponent={
          isFetchingMorePosts ? (
            <View style={styles.feedStateCard}>
              <ActivityIndicator size="small" color="#31429B" />
              <Text style={styles.feedStateText}>Loading more posts...</Text>
            </View>
          ) : hasMorePosts ? (
            <Pressable
              style={{
                alignSelf: 'center',
                backgroundColor: '#31429B',
                borderRadius: 20,
                paddingHorizontal: 24,
                paddingVertical: 12,
                marginTop: 8,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
              onPress={handleLoadMorePosts}
              disabled={isLoadingPosts || isRefreshingPosts}
            >
              <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: 'Poppins_600SemiBold' }}>
                Load more posts
              </Text>
            </Pressable>
          ) : (
            <View style={styles.emptySpace} />
          )
        }
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
      />

      <Pressable 
        style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: '#31429B', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 5 }} 
        onPress={openCreatePost}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>

      {viewerVisible && (<ZoomableViewer images={viewerImages} initialIndex={viewerIndex} visible={viewerVisible} post={viewerPost} viewerAuthorName={viewerPost ? renderPostAuthorName(viewerPost) : ''} postAvatarUri={viewerPost ? renderPostAvatarUri(viewerPost) : ''} rawAuthorPhoto={viewerPost?.alumni?.alumni_photo ?? viewerPost?.author?.alumni_photo} timeLabel={viewerPost ? getRelativeTimeLabel(getFeedItemDateValue(viewerPost)) : ''} postVisibilityLabel={viewerPost ? getPostVisibilityLabel(viewerPost) : 'Public'} reactionCount={viewerPost?.reaction_count ?? 0} commentCount={viewerPost?.comment_count ?? 0} repostCount={viewerPost?.repost_count ?? 0} isReacted={Boolean(viewerPost?.my_reaction)} isReposted={Boolean(viewerPost?.my_repost)} onRequestClose={closeImageViewer} onAuthorPress={() => { if (viewerPost?.alumni?.id) navigation.navigate(viewerPost.alumni.id === userData?.id ? 'Profile' : 'ProfileView', { userId: viewerPost.alumni.id }); }} onReactionPress={() => (viewerPost ? handlePostReaction(viewerPost) : null)} onCommentPress={() => (viewerPost ? handlePostComment(viewerPost) : null)} onRepostPress={() => (viewerPost ? openRepostComposer(viewerPost) : null)} onMenuPress={() => { if (canManagePost(viewerPost)) { openPostActions(viewerPost); return; } showThemedAlert({ title: 'Image options', message: 'What would you like to do?', actions: [{ text: 'Download Image', onPress: () => handleDownloadImage(viewerImages[viewerIndex]?.uri) }, { text: 'Report Post', style: 'destructive', onPress: handleReportFromViewer }] }); }} />)}

      {postActionsVisible && (<Modal transparent visible={postActionsVisible} animationType="slide" statusBarTranslucent={true} onRequestClose={closePostActions}><View style={styles.postActionsBackdrop}><SafeAreaView style={styles.postActionsSafeArea} edges={['bottom']}><RNAnimated.View style={[styles.postActionsCard, { transform: [{ translateY: postActionsTranslateY }] }]} onTouchMove={handlePostActionsSwipe} onTouchEnd={resetSwipeRefs}><View style={{ height: 4, width: 40, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 }} /><View style={styles.postActionsHeader}><Text style={styles.postActionsTitle}>{canManagePost(activePostActionPost) ? 'Manage Your Post' : 'Post Options'}</Text><Pressable style={styles.postActionsCloseButton} onPress={closePostActions} hitSlop={8} disabled={isPostActionSaving}><Ionicons name="close" size={20} color="#31429B" /></Pressable></View>{canManagePost(activePostActionPost) ? (<><Text style={styles.postActionsSubtitle}>{getPostVisibilityLabel(activePostActionPost)}. Edit the post, save it as a draft, change who can view it, or delete it.</Text><View style={styles.postActionsRow}><Pressable style={styles.postActionChoiceButton} onPress={handleEditActivePost} disabled={isPostActionSaving}><Ionicons name="create-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Edit</Text></Pressable><Pressable style={styles.postActionChoiceButton} onPress={handleToggleActivePostDraft} disabled={isPostActionSaving}><Ionicons name={activePostActionPost?.is_draft ? 'cloud-upload-outline' : 'bookmark-outline'} size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>{activePostActionPost?.is_draft ? 'Publish' : 'Draft'}</Text></Pressable></View><Text style={styles.postActionsLabel}>Who can view this post?</Text><View style={styles.postVisibilityChoicesRow}>{['public', 'friends', 'private'].map((vis) => (<Pressable key={vis} style={[styles.postVisibilityChoice, (activePostActionPost?.visibility ?? 'public') === vis && styles.postVisibilityChoiceSelected]} onPress={() => handleChangeActivePostVisibility(vis)} disabled={isPostActionSaving}><Text style={styles.postVisibilityChoiceText}>{getPostVisibilityLabel({ visibility: vis })}</Text></Pressable>))}</View><Pressable style={styles.postDeleteButton} onPress={handleDeleteActivePost} disabled={isPostActionSaving}><Ionicons name="trash-outline" size={16} color="#B42318" /><Text style={styles.postDeleteButtonText}>Delete Post</Text></Pressable></>) : (<><Text style={styles.postActionsSubtitle}>Actions for this post</Text><View style={styles.postActionsRow}><Pressable style={styles.postActionChoiceButton} onPress={openPostReportModal}><Ionicons name="flag-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Report</Text></Pressable><Pressable style={styles.postActionChoiceButton} onPress={handleHidePost}><Ionicons name="eye-off-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Hide post</Text></Pressable></View><View style={styles.postActionsRow}><Pressable style={styles.postActionChoiceButton} onPress={handleMuteAuthor}><Ionicons name="volume-mute-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Mute user</Text></Pressable></View></>)}</RNAnimated.View></SafeAreaView></View></Modal>)}

      {commentActionsVisible && (<Modal transparent visible={commentActionsVisible} animationType="slide" statusBarTranslucent={true} onRequestClose={closeCommentActions}><View style={styles.postActionsBackdrop}><SafeAreaView style={styles.postActionsSafeArea} edges={['bottom']}><View style={styles.postActionsCard}><View style={{ height: 4, width: 40, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 }} /><View style={styles.postActionsHeader}><Text style={styles.postActionsTitle}>{canManageComment(activeCommentActionComment) ? 'Manage Comment' : 'Comment Options'}</Text><Pressable style={styles.postActionsCloseButton} onPress={closeCommentActions} hitSlop={8} disabled={isCommentActionSaving}><Ionicons name="close" size={20} color="#31429B" /></Pressable></View>{canManageComment(activeCommentActionComment) ? (<><Text style={styles.postActionsSubtitle}>Edit or delete your comment.</Text><View style={styles.postActionsRow}><Pressable style={styles.postActionChoiceButton} onPress={handleEditComment} disabled={isCommentActionSaving}><Ionicons name="create-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Edit</Text></Pressable><Pressable style={styles.postActionChoiceButton} onPress={handleDeleteCommentAction} disabled={isCommentActionSaving}><Ionicons name="trash-outline" size={16} color="#B42318" /><Text style={styles.postActionChoiceText}>Delete</Text></Pressable></View></>) : (<><Text style={styles.postActionsSubtitle}>Actions for this comment</Text><View style={styles.postActionsRow}><Pressable style={styles.postActionChoiceButton} onPress={openCommentReportModal}><Ionicons name="flag-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Report</Text></Pressable></View></>)}</View></SafeAreaView></View></Modal>)}

      {isDeletingPost && (<Modal visible={isDeletingPost} transparent animationType="fade" statusBarTranslucent><View style={styles.deleteLoadingBackdrop}><View style={styles.deleteLoadingCard}><ActivityIndicator size="large" color="#31429B" /><Text style={styles.deleteLoadingTitle}>Deleting post</Text><Text style={styles.deleteLoadingText}>Please wait while the post is removed.</Text></View></View></Modal>)}

      {repostComposerVisible && (<Modal transparent visible={repostComposerVisible} animationType="slide" onRequestClose={closeRepostComposer}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.repostModalBackdrop}><Pressable style={StyleSheet.absoluteFillObject} onPress={closeRepostComposer} /><SafeAreaView style={styles.repostModalSafeArea} edges={['bottom']}><RNAnimated.View style={[styles.repostModalCard, { transform: [{ translateY: repostComposerTranslateY }] }]} onTouchMove={handleRepostComposerSwipe} onTouchEnd={resetSwipeRefs}><View style={{ height: 4, width: 40, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 8 }} /><Text style={styles.repostModalTitle}>Repost with your caption</Text><Text style={styles.repostModalSubtitle} numberOfLines={1}>{activeRepostPost ? `Reposting ${renderPostAuthorName(activeRepostPost)}'s post` : 'Add context to your repost'}</Text><TextInput value={repostCaptionDraft} onChangeText={setRepostCaptionDraft} placeholder="Share your thoughts..." placeholderTextColor="#8A94A6" style={styles.repostCaptionInput} multiline textAlignVertical="top" />{repostMentionContext && repostMentionSuggestions.length > 0 && (<View style={styles.mentionPanel}>{repostMentionSuggestions.map((item) => (<Pressable key={`repost-mention-${String(item.id ?? item.name)}`} style={styles.mentionItem} onPress={() => handleRepostMentionPick(item.handle)}>{hasValidProfilePhoto(item.rawPhoto) && item.avatar ? (<Image source={{ uri: item.avatar }} style={styles.mentionAvatar} contentFit="cover" />) : (<AvatarInitials name={item.name} size={24} style={styles.mentionAvatar} backgroundColor="#31429B" />)}<Text style={styles.mentionName} numberOfLines={1}>@{item.handle}</Text></Pressable>))}</View>)}<View style={styles.repostModalActionsRow}><Pressable style={styles.repostCancelButton} onPress={closeRepostComposer}><Text style={styles.repostCancelButtonText}>Cancel</Text></Pressable><Pressable style={styles.repostSubmitButton} onPress={submitRepostWithCaption}><Text style={styles.repostSubmitButtonText}>Repost</Text></Pressable></View></RNAnimated.View></SafeAreaView></View></KeyboardAvoidingView></Modal>)}

      {themedAlertState.visible && (<Modal transparent visible={themedAlertState.visible} animationType="fade" onRequestClose={closeThemedAlert}><View style={styles.themedAlertBackdrop}><Pressable style={StyleSheet.absoluteFillObject} onPress={closeThemedAlert} /><View style={styles.themedAlertCard}><Pressable style={styles.themedAlertCloseButton} onPress={closeThemedAlert}><Ionicons name="close" size={22} color="#6B7280" /></Pressable><Text style={styles.themedAlertTitle}>{themedAlertState.title}</Text><Text style={styles.themedAlertMessage}>{themedAlertState.message}</Text><View style={styles.themedAlertActionsRow}>{themedAlertState.actions.map((action, actionIndex) => { const isDestructive = action?.style === 'destructive'; const isCancel = action?.style === 'cancel'; return (<Pressable key={`${action.text}-${actionIndex}`} style={[styles.themedAlertButton, isDestructive ? styles.themedAlertButtonDestructive : null, isCancel ? styles.themedAlertButtonNeutral : null]} onPress={() => handleThemedAlertAction(action)}><Text style={[styles.themedAlertButtonText, isDestructive ? styles.themedAlertButtonTextDestructive : null, isCancel ? styles.themedAlertButtonTextNeutral : null]}>{action.text}</Text></Pressable>); })}</View></View></View></Modal>)}

      {commentsVisible && (
        <Modal transparent visible={commentsVisible} animationType="none" onRequestClose={closeCommentsModal}>
          <View style={styles.commentsModalBackdrop}>
            <RNAnimated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.4)', opacity: commentsTranslateY.interpolate({ inputRange: [0, 300], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={closeCommentsModal} />
            </RNAnimated.View>
            <RNAnimated.View
              style={[styles.commentsSheet, { transform: [{ translateY: commentsTranslateY }], paddingBottom: commentKeyboardHeight > 0 ? commentKeyboardHeight + 8 : 0 }]}
              onTouchMove={handleCommentsSwipe}
              onTouchEnd={() => {
                if (isClosingRef.current) return;
                commentsTranslateY.stopAnimation((val) => {
                  if (val > 150) closeCommentsModal();
                  else RNAnimated.spring(commentsTranslateY, { toValue: 0, useNativeDriver: false, tension: 65, friction: 12 }).start();
                });
                commentsSwipeStartRef.current = 0;
              }}
            >
              <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={{ height: 5, width: 40, backgroundColor: '#D1D5DB', borderRadius: 3, alignSelf: 'center', marginTop: 8, marginBottom: 12 }} />
                <View style={styles.commentsHeaderRow}>
                  <Text style={styles.commentsTitle}>{activeCommentPost?.comment_count ?? comments.length} comments</Text>
                  <Pressable style={styles.commentsCloseButton} onPress={closeCommentsModal}><Ionicons name="close" size={24} color="#1C1C1E" /></Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <ScrollView ref={commentsScrollViewRef} style={[styles.commentsList, styles.commentsBody]} contentContainerStyle={[styles.commentsListContent, { flexGrow: 1, paddingBottom: 20 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" onContentSizeChange={() => commentsScrollViewRef.current?.scrollToEnd({ animated: true })}>
                    {commentsLoading ? (
                      <View style={styles.commentsEmptyState}><ActivityIndicator size="small" color="#31429B" /><Text style={styles.commentsEmptyText}>Loading comments...</Text></View>
                    ) : commentsError ? (
                      <View style={styles.commentsEmptyState}><Ionicons name="alert-circle-outline" size={26} color="#B42318" /><Text style={styles.commentsEmptyText}>{commentsError}</Text></View>
                    ) : comments.length === 0 ? (
                      <View style={styles.commentsEmptyState}><Ionicons name="chatbubble-ellipses-outline" size={26} color="#94A3B8" /><Text style={styles.commentsEmptyText}>No comments loaded yet.</Text></View>
                    ) : commentTree.map((thread) => renderCommentNode(thread))}
                  </ScrollView>
                  <View>
                    <View style={styles.commentComposerSafeArea}>
                      <View style={styles.commentComposer}>
                        <View style={styles.commentComposerContent}>
                          {editingComment && (
                            <View style={styles.commentReplyContext}>
                              <Text style={styles.commentReplyContextText} numberOfLines={1}>Editing comment</Text>
                              <Pressable style={styles.commentReplyContextCancel} onPress={() => { setEditingComment(null); setCommentDraft(''); }}><Ionicons name="close" size={14} color="#31429B" /></Pressable>
                            </View>
                          )}
                          {replyingToComment && (
                            <View style={styles.commentReplyContext}>
                              <Text style={styles.commentReplyContextText} numberOfLines={1}>Replying to {renderCommentAuthorName(replyingToComment)}</Text>
                              <Pressable style={styles.commentReplyContextCancel} onPress={() => setReplyingToComment(null)}><Ionicons name="close" size={14} color="#31429B" /></Pressable>
                            </View>
                          )}
                          <View style={styles.commentInputWrap}>
                            <TextInput value={commentDraft} onChangeText={setCommentDraft} onContentSizeChange={handleCommentInputContentSizeChange} placeholder={editingComment ? 'Edit your comment...' : replyingToComment ? 'Write a reply...' : 'Write a comment...'} placeholderTextColor="#94A3B8" style={[styles.commentInput, { height: commentInputHeight }]} multiline scrollEnabled={false} textAlignVertical="center" />
                            <Pressable style={[styles.commentSendButtonInside, !commentDraft.trim() ? styles.commentSendButtonDisabled : null]} onPress={handleSubmitComment} disabled={!commentDraft.trim()}><Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} /></Pressable>
                          </View>
                          {commentMentionContext && commentMentionSuggestions.length > 0 && (
                            <View style={styles.commentMentionPanel}>
                              {commentMentionSuggestions.map((item) => (
                                <Pressable key={`comment-mention-${String(item.id ?? item.name)}`} style={styles.mentionItem} onPress={() => handleCommentMentionPick(item.handle)}>
                                  {hasValidProfilePhoto(item.rawPhoto) && item.avatar ? <Image source={{ uri: item.avatar }} style={styles.mentionAvatar} contentFit="cover" /> : <AvatarInitials name={item.name} size={24} style={styles.mentionAvatar} backgroundColor="#31429B" />}
                                  <Text style={styles.mentionName} numberOfLines={1}>@{item.handle}</Text>
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

      {reportModalVisible && (<Modal transparent visible={reportModalVisible} animationType="slide" statusBarTranslucent={true} onRequestClose={() => setReportModalVisible(false)}><View style={styles.postActionsBackdrop}><SafeAreaView style={styles.postActionsSafeArea} edges={['bottom']}><View style={styles.postActionsCard}><View style={{ height: 4, width: 40, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 }} /><View style={styles.postActionsHeader}><Text style={styles.postActionsTitle}>Report Content</Text><Pressable style={styles.postActionsCloseButton} onPress={() => setReportModalVisible(false)} hitSlop={8}><Ionicons name="close" size={20} color="#31429B" /></Pressable></View><Text style={{ color: '#64748B', fontSize: 14, paddingHorizontal: 24, marginBottom: 8 }}>Why are you reporting this? Your report is anonymous.</Text><ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.5, marginTop: 10 }}>{REPORT_REASONS.map((reason, index) => (<Pressable key={index} style={({ pressed }) => [{ paddingVertical: 14, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, pressed && { backgroundColor: '#F9FAFB' }]} onPress={() => submitReport(reason)}><Text style={{ fontSize: 15, color: '#1F2937', fontWeight: '500' }}>{reason}</Text><Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.3)" /></Pressable>))}</ScrollView></View></SafeAreaView></View></Modal>)}
    </View>
  );
};

export default UserFeedScreen;