import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AvatarInitials from "./AvatarInitials";
import supabase from "../services/supabase"; 

const MENTION_PATTERN = /(@[a-zA-Z0-9_.-]+)/g;

const getAttachmentType = (path) => {
  if (!path) return 'unknown';
  const urlWithoutQuery = path.split('?')[0].toLowerCase();
  if (urlWithoutQuery.match(/\.(mp4|mov|webm|mkv|m4v)$/i)) return 'video';
  if (urlWithoutQuery.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|csv)$/i)) return 'file';
  return 'image';
};

const getRelativePath = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();
  
  if (/^https?:\/\//i.test(str)) {
    const assetIndex = str.indexOf('luminus_messages_attachments/');
    if (assetIndex !== -1) {
      const relativePath = str.substring(assetIndex + 'luminus_messages_attachments/'.length);
      const cleanPath = relativePath.split('?')[0];
      if (cleanPath.length > 255) return null;
      return cleanPath;
    }

    const oldAssetIndex = str.indexOf('luminus_assets/');
    if (oldAssetIndex !== -1) {
      const relativePath = str.substring(oldAssetIndex + 'luminus_assets/'.length);
      const cleanPath = relativePath.split('?')[0];
      if (cleanPath.length > 255) return null;
      return cleanPath;
    }

    return null;
  }
  
  if (str.length > 255) return null;
  return str;
};

const getSignedStorageUrl = async (path) => {
  if (!path) return null;
  if (/^file:\/\//i.test(path)) return path;

  try {
    const relativePath = getRelativePath(path);
    if (!relativePath && /^https?:\/\//i.test(path)) return path;
    
    const cleanPath = String(relativePath || path).replace(/^\/+/, "");
    if (cleanPath.length > 255) return null;
    
    const { data, error } = await supabase.storage
      .from('luminus_messages_attachments')
      .createSignedUrl(cleanPath, 60 * 60);
    
    if (error) return null;
    return data?.signedUrl || null;
  } catch (err) {
    return null;
  }
};

const renderMessageContentWithMentions = (
  content,
  isOutgoing,
  onMentionPress,
  messageId,
) => {
  const text = String(content ?? "");
  const segments = text.split(MENTION_PATTERN);

  return segments.map((segment, index) => {
    const isMention = MENTION_PATTERN.test(segment);
    MENTION_PATTERN.lastIndex = 0;

    if (!isMention) {
      return (
        <Text
          key={`${messageId}-segment-${index}`}
          style={[
            styles.messageText,
            isOutgoing ? styles.textOutgoing : styles.textIncoming,
          ]}
        >
          {segment}
        </Text>
      );
    }

    return (
      <Text
        key={`${messageId}-mention-${index}-${segment}`}
        style={[
          styles.messageText,
          styles.mentionText,
          isOutgoing ? styles.mentionTextOutgoing : styles.mentionTextIncoming,
        ]}
        onPress={() => onMentionPress?.(segment)}
      >
        {segment}
      </Text>
    );
  });
};

const MessageBubble = ({
  message,
  isOutgoing,
  isGroup,          
  showAvatar,
  senderAvatar,
  senderName,
  onLongPress,
  onSwipeReply,
  read,
  messageTime,
  sendStatus,
  onMentionPress,
  onAttachmentPress, // 🔥 Hooked into ConvoScreen's Secure Viewer
}) => {
  const hasReactions = Boolean(
    message?.reactions && Object.keys(message.reactions).length > 0,
  );
  const showSendingStatus = isOutgoing && sendStatus === "sending";
  const showFailedStatus = isOutgoing && sendStatus === "failed";
  
  const translateX = useRef(new Animated.Value(0)).current;
  const entranceProgress = useRef(new Animated.Value(0)).current;
  const swipeDirection = isOutgoing ? -1 : 1;

  const [signedAttachments, setSignedAttachments] = useState([]);

  useEffect(() => {
    let active = true;
    
    const resolveAttachments = async () => {
      const atts = Array.isArray(message?.attachments) ? message.attachments : 
                   message?.attachment ? [{ attachment_path: message.attachment }] : [];
                   
      if (atts.length === 0) {
        if (active) setSignedAttachments([]);
        return;
      }

      const authorizedUris = await Promise.all(
        atts.map(async (att) => {
          const rawUri = att?.attachment_path || att?.attachment || null;
          if (!rawUri) return null;
          
          let urlToUse = rawUri;
          if (!att.isLocal) {
             const signedUrl = await getSignedStorageUrl(rawUri);
             urlToUse = signedUrl || rawUri;
          }
          
          return {
             ...att,
             url: urlToUse,
             type: getAttachmentType(rawUri) 
          };
        })
      );
      
      if (active) setSignedAttachments(authorizedUris.filter(Boolean));
    };

    resolveAttachments();
    return () => { active = false; };
  }, [message?.attachments, message?.attachment]);

  useEffect(() => {
    entranceProgress.setValue(0);
    Animated.spring(entranceProgress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [entranceProgress, message?.id]);

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const horizontalDistance = Math.abs(gestureState.dx);
          return (
            horizontalDistance > 6 &&
            horizontalDistance > Math.abs(gestureState.dy)
          );
        },
        onPanResponderGrant: () => {
          translateX.setOffset(0);
          translateX.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          const limitedDx = Math.max(Math.min(gestureState.dx, 90), -90);
          translateX.setValue(limitedDx * 0.35);
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldReply = swipeDirection * gestureState.dx > 55;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();

          if (shouldReply) {
            onSwipeReply?.(message);
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    [message, onSwipeReply, swipeDirection, translateX],
  );

  return (
    <View
      style={[
        styles.messageRow,
        isOutgoing ? styles.rowOutgoing : styles.rowIncoming,
      ]}
    >
      {!isOutgoing ? (
        showAvatar ? (
          senderAvatar && typeof senderAvatar === "string" && senderAvatar.trim() !== "" ? (
            <Image source={{ uri: senderAvatar }} style={styles.avatarImage} />
          ) : (
            <AvatarInitials name={senderName} size={24} style={styles.avatar} />
          )
        ) : (
          <View style={styles.avatarSpacer} />
        )
      ) : null}

      <Animated.View
        {...swipeResponder.panHandlers}
        style={[
          styles.bubbleWrapper,
          isOutgoing
            ? styles.bubbleWrapperOutgoing
            : styles.bubbleWrapperIncoming,
          {
            opacity: entranceProgress,
            transform: [
              { translateX },
              {
                translateY: entranceProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
              {
                scale: entranceProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={onLongPress}
          style={[
            styles.bubble,
            isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming,
            hasReactions && styles.bubbleWithReaction,
          ]}
        >
          {!isOutgoing && isGroup && senderName ? (
            <Text style={styles.senderNameLabel}>{senderName}</Text>
          ) : null}

          {/* 🔥 DYNAMIC MEDIA RENDERING (IMAGE, VIDEO, PDF/DOCS) */}
          {signedAttachments.length > 0 ? (
            <View style={styles.attachmentsRow}>
              {signedAttachments.map((att, idx) => (
                <TouchableOpacity
                  key={`att-${String(message.id ?? "")}-${idx}`}
                  onPress={() => onAttachmentPress?.(att.url)}
                  activeOpacity={0.8}
                  style={styles.attachmentWrap}
                >
                  {att.type === 'image' && (
                    <Image source={{ uri: att.url }} style={styles.attachmentImage} />
                  )}
                  {att.type === 'video' && (
                    <View style={[styles.attachmentImage, { backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="play-circle" size={48} color="#FFFFFF" />
                      <Text style={{color: '#94A3B8', fontSize: 12, marginTop: 8}}>Video</Text>
                    </View>
                  )}
                  {att.type === 'file' && (
                    <View style={[styles.attachmentImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }]}>
                      <Ionicons name="document-text" size={48} color="#31429B" />
                      <Text style={{color: '#31429B', fontSize: 12, marginTop: 8, fontWeight: '600'}}>Document</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {message?.content ? (
            <Text>
              {renderMessageContentWithMentions(
                message.content,
                isOutgoing,
                onMentionPress,
                message.id,
              )}
            </Text>
          ) : null}
        </TouchableOpacity>

        {hasReactions ? (
          <View
            style={[
              styles.reactionBadge,
              isOutgoing
                ? styles.reactionBadgeOutgoing
                : styles.reactionBadgeIncoming,
            ]}
          >
            {Object.entries(message.reactions).map(([emoji, count]) => (
              <Text key={emoji} style={styles.reactionText}>
                {emoji} {count > 1 ? count : ""}
              </Text>
            ))}
          </View>
        ) : null}

        {(messageTime || showSendingStatus || showFailedStatus) && (
          <View
            style={[
              styles.messageMetaRow,
              isOutgoing
                ? styles.messageMetaRowOutgoing
                : styles.messageMetaRowIncoming,
            ]}
          >
            {showSendingStatus ? (
              <Text style={styles.messageTime}>Sending...</Text>
            ) : showFailedStatus ? (
              <Text style={styles.statusTextFailed}>Not sent</Text>
            ) : (
              <Text style={styles.messageTime}>
                {isOutgoing ? `sent ${messageTime}` : messageTime}
              </Text>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const areReactionsEqual = (firstReactions, secondReactions) => {
  if (firstReactions === secondReactions) return true;
  if (!firstReactions || !secondReactions) return false;
  const firstKeys = Object.keys(firstReactions);
  const secondKeys = Object.keys(secondReactions);
  if (firstKeys.length !== secondKeys.length) return false;
  return firstKeys.every((key) => firstReactions[key] === secondReactions[key]);
};

const areMessageBubblePropsEqual = (prevProps, nextProps) => {
  const prevMsg = prevProps.message ?? {};
  const nextMsg = nextProps.message ?? {};

  const prevAttLength = Array.isArray(prevMsg.attachments) ? prevMsg.attachments.length : 0;
  const nextAttLength = Array.isArray(nextMsg.attachments) ? nextMsg.attachments.length : 0;

  return (
    prevProps.isOutgoing === nextProps.isOutgoing &&
    prevProps.isGroup === nextProps.isGroup &&    
    prevProps.senderName === nextProps.senderName &&       
    prevProps.senderAvatar === nextProps.senderAvatar &&    
    prevProps.sendStatus === nextProps.sendStatus &&
    prevMsg.id === nextMsg.id &&
    prevMsg.content === nextMsg.content &&
    prevAttLength === nextAttLength &&
    prevMsg.localStatus === nextMsg.localStatus &&
    areReactionsEqual(prevMsg.reactions, nextMsg.reactions)
  );
};

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
    paddingHorizontal: 0,
  },
  rowOutgoing: {
    justifyContent: "flex-end",
  },
  rowIncoming: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 20, 
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 20,
    backgroundColor: "#E2E8F0",
  },
  avatarSpacer: {
    width: 48, 
  },
  bubbleWrapper: {
    position: "relative",
    maxWidth: "75%", 
    flexShrink: 1,
  },
  bubbleWrapperOutgoing: {
    alignItems: "flex-end",
  },
  bubbleWrapperIncoming: {
    alignItems: "flex-start",
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexShrink: 1,
    maxWidth: "100%",
  },
  bubbleOutgoing: {
    backgroundColor: "#31429B",
    alignSelf: "flex-end",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4, 
  },
  bubbleIncoming: {
    backgroundColor: "#E2E8F0", 
    alignSelf: "flex-start",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
  },
  bubbleWithReaction: {
    marginBottom: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },
  textOutgoing: {
    color: "#FFFFFF",
  },
  textIncoming: {
    color: "#1C1C1E",
  },
  mentionText: {
    fontFamily: "Poppins_600SemiBold",
  },
  mentionTextOutgoing: {
    color: "#F2C919",
  },
  mentionTextIncoming: {
    color: "#31429B",
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
    overflow: 'hidden',
  },
  attachmentsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  attachmentWrap: {
    marginRight: 8,
  },
  reactionBadge: {
    position: "absolute",
    bottom: 12, 
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  reactionBadgeOutgoing: {
    right: 12,
  },
  reactionBadgeIncoming: {
    left: 12,
  },
  reactionText: {
    fontSize: 12,
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  messageMetaRowOutgoing: {
    justifyContent: "flex-end",
    marginRight: 2, 
  },
  messageMetaRowIncoming: {
    justifyContent: "flex-start",
    marginLeft: 2,
  },
  messageTime: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
  },
  statusTextFailed: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
    fontFamily: "Poppins_600SemiBold",
  },
  senderNameLabel: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#31429B",
    marginBottom: 4,
  },
});

export default React.memo(MessageBubble, areMessageBubblePropsEqual);