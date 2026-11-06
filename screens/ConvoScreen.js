import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  InteractionManager,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  LogBox,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import {
  getDirectMessages,
  getGroupMessages,
  sendDirectMessage,
  sendGroupMessage,
  markMessagesAsRead,
  markDirectConversationAsRead,
  markGroupChatAsRead,
  deleteMessage as deleteDirectMessage,
  deleteGroupMessage,
  updateGroupMessageReactions,
} from "../services/messageQueries";
import {
  subscribeToDirectMessages,
  subscribeToGroupMessages,
} from "../services/realtimeMessageService";
import { getAvatarUri } from "../utils/imageUtils";
import { decryptMessage } from "../utils/cryptoUtils";
import styles from "../styles/ConvoScreen.styles";
import ChatHeader from "../components/ChatHeader";
import MessageBubble from "../components/MessageBubble";
import MessageInputBar from "../components/MessageInputBar";
import { useUnreadMessages } from "../context/UnreadMessagesContext";
import { ThemedAlert } from "../components/ThemedAlert";

// 🔥 NEW IMPORTS FOR MEDIA VIEWING
import { useVideoPlayer, VideoView } from "expo-video";
import { WebView } from "react-native-webview";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "👏"];
const MESSAGE_LIMIT = 30;

const formatAdminRole = (role) => {
  if (!role) return "";
  return String(role)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

LogBox.ignoreLogs([
  "VirtualizedList: You have a large list that is slow to update",
]);

const toMentionHandle = (firstName, lastName) => {
  const normalizedHandle = `${firstName ?? ""}_${lastName ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9_.-]/g, " ")
    .replace(/ +/g, " ")
    .replace(/^ +|_+$/g, " ");
  return normalizedHandle || "alumni";
};

const extractMentionQuery = (value) => {
  const text = String(value ?? "");
  const match = text.match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);
  if (!match) return null;
  const query = match[2] ?? "";
  const mentionStart = text.length - query.length - 1;
  return { query, mentionStart, mentionEnd: text.length };
};

const formatMessageTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  
  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (sameDay) return `Today at ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate();

  if (isYesterday) return `Yesterday at ${timeStr}`;

  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  return `${dateStr} at ${timeStr}`;
};

const getMessageDate = (message) => {
  const rawValue = message?.created_at ?? message?.sent_at ?? message?.updated_at;
  if (!rawValue) return null;
  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sortMessagesDescending = (messageList) => {
  return [...(Array.isArray(messageList) ? messageList : [])].sort(
    (firstMessage, secondMessage) => {
      const firstDate = getMessageDate(firstMessage);
      const secondDate = getMessageDate(secondMessage);
      if (firstDate && secondDate) {
        const diff = secondDate.getTime() - firstDate.getTime();
        if (diff !== 0) return diff;
      } else if (firstDate && !secondDate) {
        return -1;
      } else if (!firstDate && secondDate) {
        return 1;
      }
      const firstId = String(firstMessage?.id ?? "");
      const secondId = String(secondMessage?.id ?? "");
      return secondId.localeCompare(firstId);
    },
  );
};

const getSignedStorageUrl = async (path) => {
  if (!path) return null;
  try {
    const cleanPath = String(path).replace(/^\/+/, "");
    if (cleanPath.length > 255) return null;
    
    const { data, error } = await supabase.storage
      .from('luminus_messages_attachments')
      .createSignedUrl(cleanPath, 60 * 60 * 24);
    
    if (!error && data?.signedUrl) return data.signedUrl;

    const { data: publicData } = supabase.storage
      .from('luminus_assets')
      .getPublicUrl(cleanPath);
      
    return publicData?.publicUrl || null;
  } catch {
    return null;
  }
};

const enrichMessagesWithAttachments = async (messagesBatch, isGroupChat) => {
  if (!messagesBatch || !Array.isArray(messagesBatch) || messagesBatch.length === 0) return [];
  
  try {
    const messageIds = messagesBatch.map((m) => m.id);
    const tableName = isGroupChat ? "group_messages_attachments" : "messages_attachments";
    const idColumn = isGroupChat ? "group_message_id" : "message_id";

    const { data: rawAttachments, error } = await supabase.from(tableName).select("*").in(idColumn, messageIds);
    if (error) throw error;

    const attachmentsMap = {};
    
    if (rawAttachments && rawAttachments.length > 0) {
      const resolvedAttachments = await Promise.all(
        rawAttachments.map(async (att) => {
          const path = att.attachment_path;
          if (!path || /^https?:\/\//i.test(path) || /^file:\/\//i.test(path)) return att;
          const signedUrl = await getSignedStorageUrl(path);
          return { ...att, attachment_path: signedUrl || path };
        })
      );

      resolvedAttachments.forEach((att) => {
        const parentId = isGroupChat ? att.group_message_id : att.message_id;
        if (!attachmentsMap[parentId]) attachmentsMap[parentId] = [];
        attachmentsMap[parentId].push(att);
      });
    }

    return messagesBatch.map((msg) => {
      if (msg.attachments?.length && msg.attachments[0].isLocal) return msg;
      const nextAtts = attachmentsMap[msg.id] || [];
      const prevAtts = msg.attachments || [];
      const same =
        nextAtts.length === prevAtts.length &&
        nextAtts.every((a, i) => a.attachment_path === prevAtts[i]?.attachment_path);
      if (same) return msg; 
      return { ...msg, attachments: nextAtts };
    });
  } catch (error) {
    console.error("Failed to enrich attachments:", error);
    return messagesBatch;
  }
};

// ==============================================
// 🔥 NEW: SECURE IN-APP MEDIA VIEWER
// ==============================================
const getAttachmentType = (path) => {
  if (!path) return 'unknown';
  const urlWithoutQuery = path.split('?')[0].toLowerCase();
  if (urlWithoutQuery.match(/\.(mp4|mov|webm|mkv|m4v)$/i)) return 'video';
  if (urlWithoutQuery.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|csv)$/i)) return 'file';
  return 'image';
};

const AttachmentViewerModal = ({ visible, attachment, onClose }) => {
  const type = attachment ? getAttachmentType(attachment.attachment_path) : null;
  const path = attachment?.attachment_path;

  // Use video player Hook, safely passes null if not a video
  const player = useVideoPlayer(type === 'video' ? path : null, (p) => {
    if (p) {
      p.loop = true;
      p.play();
    }
  });

  if (!visible || !attachment) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
        <SafeAreaView style={{ position: 'absolute', top: 0, width: '100%', zIndex: 10 }} edges={['top']}>
          <TouchableOpacity style={{ alignSelf: 'flex-end', padding: 20 }} onPress={onClose} hitSlop={15}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>

        {type === 'image' && (
          <Image source={{ uri: path }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
        )}

        {type === 'video' && (
          <View style={{ width: '100%', height: '80%' }}>
            <VideoView style={{ flex: 1 }} player={player} nativeControls contentFit="contain" />
          </View>
        )}

        {type === 'file' && (
          <View style={{ width: '90%', height: '80%', backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <WebView 
              source={{ uri: Platform.OS === 'android' ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(path)}` : path }} 
              style={{ flex: 1 }} 
              startInLoadingState
              renderLoading={() => <ActivityIndicator size="large" color="#31429B" style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -18 }} />}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};


export default function ConvoScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const { refreshUnreadMessages } = useUnreadMessages();
  const params = route?.params ?? {};
  const contactId = params.contactId ?? params.userId ?? params.id ?? params.contact?.id ?? null;
  const groupId = params.groupId ?? params.group?.id ?? null;
  const isGroup = Boolean(groupId && !contactId);
  const conversationName = params.contactName ?? params.userName ?? params.contact?.name ?? params.groupName ?? params.group?.name ?? "Chat";
  const conversationRole = params.contactRole ?? params.contact?.admin_role ?? null;
  const conversationAvatar = params.contactAvatar ?? params.userAvatarUri ?? params.contactPhoto ?? params.avatar ?? params.contact?.avatar ?? params.groupAvatar ?? params.group?.avatar ?? "";
  const conversationStatus = params.contactStatus ?? params.status ?? "";
 
const groupMembers = useMemo(() => {
  if (!isGroup) return [];
  
  const members = Array.isArray(params.groupMembers) ? params.groupMembers : 
                  Array.isArray(params.group?.members) ? params.group.members : [];
  
  return members.map((member, index) => {
    const profile = member?.alumni || member || {};
    const memberType = member?.member_type || profile?.user_type || 'alumni';
    
    let name = '';
    if (memberType === 'admin' || profile?.user_type === 'admin') {
      name = `${profile?.admin_first_name || profile?.first_name || ''} ${profile?.admin_last_name || profile?.last_name || ''}`.trim();
    } else {
      name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
    }
    name = name || (memberType === 'admin' ? 'Admin' : 'Alumni Member');
    
    let roleLabel = '';
    if (memberType === 'admin' || profile?.user_type === 'admin') {
      roleLabel = profile?.admin_role || 'Admin';
    } else if (member?.role === 'admin') {
      roleLabel = 'Group Admin';
    }
    
    return {
      id: member?.alumni_id || profile?.id || index,
      name: name,
      roleLabel: roleLabel,
      memberType: memberType,
      profile: profile,
      isGroupAdmin: member?.role === 'admin'
    };
  });
}, [isGroup, params.groupMembers, params.group]);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedAttachmentUri, setSelectedAttachmentUri] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [connections, setConnections] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [pageOffset, setPageOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // 🔥 NEW: Media Viewer States
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState(null);

  const userUpdatesChannelRef = useRef(null);
  const localTypingTimeoutRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingTimeoutsRef = useRef(new Map());
  const isLoadingMoreRef = useRef(false);
  const isLoadingRef = useRef(false);
  const hasConversation = Boolean(contactId || groupId);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (!isGroup && contactId) {
      const channel = supabase.channel(`user-updates-${contactId}`, {
        config: { private: true }
      });
      channel.subscribe();
      userUpdatesChannelRef.current = channel;
      return () => { supabase.removeChannel(channel); };
    }
  }, [isGroup, contactId]);

  const typingChannelKey = useMemo(() => {
    if (!hasConversation || !currentUserId) return null;
    if (isGroup) return `typing:group:${groupId}`;
    const participants = [currentUserId, contactId].filter((v) => v != null && v !== "").map((v) => String(v)).sort();
    if (participants.length !== 2) return null;
    return `typing:dm:${participants.join(":")}`;
  }, [contactId, currentUserId, groupId, hasConversation, isGroup]);

  const allowMentions = true;
  const headerSubtitle = useMemo(() => {
  if (isGroup) {
    if (!groupMembers || groupMembers.length === 0) return "Group chat";
    const memberNames = groupMembers
      .map((m) => {
        const nameWithRole = m.roleLabel ? `${m.name} (${m.roleLabel})` : m.name;
        return nameWithRole;
      })
      .filter(Boolean);
    if (memberNames.length <= 3) return memberNames.join(", ");
    return `${memberNames.slice(0, 3).join(", ")} and ${memberNames.length - 3} more`;
  }
  return conversationRole ? formatAdminRole(conversationRole) : conversationStatus || "Active now";
}, [conversationRole, conversationStatus, groupMembers, isGroup]);

  const mentionContext = useMemo(() => (allowMentions ? extractMentionQuery(draft) : null), [allowMentions, draft]);

  const mentionableUsers = useMemo(() => {
  const usersMap = new Map();
  if (isGroup) {
    if (Array.isArray(groupMembers)) {
      groupMembers.forEach((member) => {
        const profile = member?.profile || member?.alumni || member;
        if (profile?.id && String(profile.id) !== String(currentUserId)) {
          let firstName = profile?.first_name || profile?.admin_first_name || '';
          let lastName = profile?.last_name || profile?.admin_last_name || '';
          if (member?.memberType === 'admin' || profile?.user_type === 'admin') {
            firstName = profile?.admin_first_name || profile?.first_name || '';
            lastName = profile?.admin_last_name || profile?.last_name || '';
          }
          usersMap.set(profile.id, { ...profile, first_name: firstName, last_name: lastName });
        }
      });
    }
  } else {
    (connections || []).forEach((c) => {
      if (c?.id && String(c.id) !== String(currentUserId)) {
        usersMap.set(c.id, c);
      }
    });
  }
  return Array.from(usersMap.values());
}, [connections, groupMembers, isGroup, currentUserId]);

  const mentionSuggestions = useMemo(() => {
  if (!allowMentions || !mentionContext) return [];
  const query = mentionContext.query.toLowerCase();
  return (mentionableUsers || [])
    .map((user) => {
      const first = user?.first_name ?? "";
      const last = user?.last_name ?? "";
      const name = `${first} ${last}`.trim() || "Alumni";
      return {
        id: user?.id, name, handle: toMentionHandle(first, last),
        avatar: getAvatarUri(name, user?.alumni_photo),
      };
    })
    .filter((item) => {
      if (!query) return true;
      return item.name.toLowerCase().includes(query) || item.handle.includes(query);
    })
    .slice(0, 5);
}, [allowMentions, mentionableUsers, mentionContext]);

  const typingLabel = useMemo(() => {
  if (!typingUsers.length) return " ";
  const names = typingUsers
    .map((u) => {
      if (u?.user_type === 'admin' || u?.isAdmin) {
        return `${u?.admin_first_name || u?.first_name || ''} ${u?.admin_last_name || u?.last_name || ''}`.trim();
      }
      return `${u?.first_name || ''} ${u?.last_name || ''}`.trim();
    })
    .filter(Boolean);
    
  if (names.length === 0) return isGroup ? "Someone is typing..." : `${conversationName} is typing...`;
  if (isGroup) {
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return "Several people are typing...";
  }
  return `${names[0]} is typing...`;
}, [conversationName, isGroup, typingUsers]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const supaUser = await getCurrentUser();
      if (!supaUser) return;
      const resolvedId = supaUser.id || supaUser.alumni_id;
      setCurrentUserId(resolvedId);
      setCurrentUserProfile(supaUser);
      try {
        const { getFollowing } = await import("../services/connectionQueries");
        const following = await getFollowing(resolvedId).catch(() => []);
        setConnections(Array.isArray(following) ? following.map((f) => f.followed ?? f) : []);
      } catch { setConnections([]); }
    } catch (error) {
      console.error("Failed to load current user:", error);
      setConnections([]);
    }
  }, []);

  const updateTypingStatus = useCallback(async (isTyping) => {
    if (!hasConversation || !typingChannelRef.current || !currentUserId) return;
    if (!isTyping) {
      setTypingUsers((prev) => prev.filter((u) => String(u?.id ?? u?.alumni_id ?? "") !== String(currentUserId)));
    }
    try {
      await typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUserId, first_name: currentUserProfile?.first_name ?? " ",
          last_name: currentUserProfile?.last_name ?? " ", alumni_photo: currentUserProfile?.alumni_photo ?? null,
          isTyping: Boolean(isTyping), timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.warn("[Convo] Failed to broadcast typing status: ", error?.message || error);
    }
  }, [currentUserId, currentUserProfile, hasConversation]);

  const handleTextChange = useCallback((text) => {
    setDraft(text);
    updateTypingStatus(text.length > 0);
    if (userUpdatesChannelRef.current && currentUserId) {
      userUpdatesChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { senderId: currentUserId, isTyping: true }});
      if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
      localTypingTimeoutRef.current = setTimeout(() => {
        userUpdatesChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { senderId: currentUserId, isTyping: false }});
      }, 2000);
    }
  }, [currentUserId, updateTypingStatus]);

  const loadTypingStatus = useCallback(async () => { setTypingUsers([]); }, []);

  const handleMentionPick = useCallback((handle) => {
    if (!allowMentions || !mentionContext) return;
    setDraft((current) => {
      const safe = String(current ?? "");
      const prefix = safe.slice(0, mentionContext.mentionStart);
      const suffix = safe.slice(mentionContext.mentionEnd);
      return `${prefix}@${handle} ${suffix}`;
    });
  }, [allowMentions, mentionContext]);

  const handleMentionPress = useCallback(async (token) => {
    if (!allowMentions) return;
    const handle = String(token ?? "").replace(/^@/, "").toLowerCase();
    if (!handle) return;
    const matchedLocal = (mentionableUsers || []).find((u) => toMentionHandle(u?.first_name, u?.last_name) === handle);
    if (matchedLocal?.id) {
      const parent = navigation.getParent?.();
      (parent?.navigate ?? navigation.navigate)("ProfileView", { userId: matchedLocal.id });
    }
  }, [allowMentions, mentionableUsers, navigation]);

  const loadMessages = useCallback(async (silent = false) => {
    if (!hasConversation) {
      setMessages([]); setPageOffset(0); setHasMoreMessages(true); setIsLoading(false); return;
    }
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    if (!silent && messagesRef.current.length === 0) setIsLoading(true); else setIsRefreshing(true);

    try {
      let messageList = [];
      const receiverType = params.receiverType || 'alumni';
      if (isGroup) {
        messageList = await getGroupMessages(groupId, currentUserId, MESSAGE_LIMIT, 0).catch(() => []);
      } else {
        if (!currentUserId) { setMessages([]); setIsLoading(false); return; }
        messageList = await getDirectMessages(currentUserId, contactId, MESSAGE_LIMIT, 0, receiverType).catch(() => []);
      }
      messageList = await enrichMessagesWithAttachments(messageList, isGroup);
      const hasMore = messageList.length >= MESSAGE_LIMIT;
      setHasMoreMessages(hasMore); setPageOffset(0);
      const unique = Array.from(messageList.reduce((map, msg) => { map.set(String(msg.id), msg); return map; }, new Map()).values());
      setMessages(sortMessagesDescending(unique));
      setHasLoadedOnce(true);

      if (isGroup && currentUserId) {
        const latestId = Math.max(...messageList.map((m) => Number(m?.id ?? 0)).filter(Boolean));
        if (latestId > 0) {
          await markGroupChatAsRead(groupId, currentUserId, latestId).catch(() => {});
          await refreshUnreadMessages?.().catch(() => {});
        }
      } else if (!isGroup && currentUserId) {
        const unreadIds = messageList.filter((m) => String(m?.sender_id) === String(contactId) && String(m?.receiver_id) === String(currentUserId) && !m.is_read).map((m) => m.id).filter(Boolean);
        await markDirectConversationAsRead(currentUserId, contactId).catch(() => {});
        if (unreadIds.length > 0) {
          setMessages((prev) => prev.map((msg) => unreadIds.includes(msg.id) ? { ...msg, is_read: true } : msg));
        }
        await refreshUnreadMessages?.().catch(() => {});
      }
    } catch (error) {
      console.error("Failed to load conversation messages:", error);
      if (!silent) ThemedAlert.alert("Error", "Could not load messages.");
    } finally {
      setIsLoading(false); setIsRefreshing(false); isLoadingRef.current = false;
    }
  }, [contactId, currentUserId, groupId, hasConversation, isGroup, params.receiverType, refreshUnreadMessages]);

  useEffect(() => { loadCurrentUser(); }, [loadCurrentUser]);

  useEffect(() => {
    if (!hasConversation || !currentUserId) return;
    loadMessages(true);
  }, [contactId, currentUserId, groupId, hasConversation, isGroup, loadMessages]);

  useFocusEffect(useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => { loadMessages(true); loadTypingStatus(); });
    return () => { task?.cancel?.(); updateTypingStatus(false); };
  }, [loadMessages, loadTypingStatus, updateTypingStatus]));

  const loadMoreMessages = useCallback(async () => {
    if (isFetchingMore || !hasMoreMessages || isRefreshing || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    setIsFetchingMore(true);
    try {
      const nextOffset = pageOffset + MESSAGE_LIMIT;
      let newBatch = [];
      const receiverType = params.receiverType || 'alumni';
      if (isGroup) {
        newBatch = await getGroupMessages(groupId, currentUserId, MESSAGE_LIMIT, nextOffset).catch(() => []);
      } else {
        if (!currentUserId) return;
        newBatch = await getDirectMessages(currentUserId, contactId, MESSAGE_LIMIT, nextOffset, receiverType).catch(() => []);
      }
      newBatch = await enrichMessagesWithAttachments(newBatch, isGroup);
      if (newBatch.length < MESSAGE_LIMIT) setHasMoreMessages(false);
      if (newBatch.length > 0) {
        setMessages((prev) => {
          const map = new Map();
          prev.forEach((msg) => map.set(String(msg.id), msg));
          newBatch.forEach((msg) => map.set(String(msg.id), msg));
          return sortMessagesDescending(Array.from(map.values()));
        });
        setPageOffset(nextOffset);
      }
    } catch (error) { console.error("Failed to load more messages:", error); } finally {
      setIsFetchingMore(false); isLoadingMoreRef.current = false;
    }
  }, [contactId, currentUserId, groupId, hasMoreMessages, isFetchingMore, isGroup, isRefreshing, pageOffset, params.receiverType]);

  useEffect(() => {
    if (!hasConversation) return;
    let unsubscribe = () => {};

    const handleMessageEvent = (event, newMessage) => {
      if (!newMessage) return;
      const msgSenderType = newMessage.sender_type || 'alumni';
      const currUserType = currentUserProfile?.user_type || 'alumni';
      const isRelevant = isGroup || (String(newMessage.sender_id) === String(currentUserId) && String(newMessage.receiver_id) === String(contactId)) || (String(newMessage.sender_id) === String(contactId) && String(newMessage.receiver_id) === String(currentUserId));
      
      if (!isRelevant) return;

      if (event === "insert") {
        if (String(newMessage.sender_id) === String(currentUserId) && msgSenderType === currUserType) return;
        if (isGroup && currentUserId && newMessage.id) {
          markGroupChatAsRead(groupId, currentUserId, Number(newMessage.id)).catch(() => {});
          refreshUnreadMessages?.().catch(() => {});
        } else if (!isGroup && newMessage.id) {
          markMessagesAsRead([newMessage.id]).catch(() => {});
          refreshUnreadMessages?.().catch(() => {});
        }
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(newMessage.id))) return prev;
          return [{ ...newMessage, content: decryptMessage(newMessage.content), is_read: true }, ...prev];
        });
        
        (async () => {
          try {
            let senderProfile = null;
            if (msgSenderType === 'admin') {
              const { data: adminData } = await supabase.from('admins').select('id, admin_first_name, admin_last_name, photo').eq('id', newMessage.sender_id).maybeSingle();
              if (adminData) senderProfile = { id: adminData.id, first_name: adminData.admin_first_name, last_name: adminData.admin_last_name, alumni_photo: adminData.photo, user_type: 'admin' };
            } else {
              const { data: alumniData } = await supabase.from('alumnis_base').select('id, first_name, last_name, alumni_photo').eq('id', newMessage.sender_id).maybeSingle();
              if (alumniData) senderProfile = { ...alumniData, user_type: 'alumni' };
            }
            const tableName = isGroup ? "group_messages_attachments" : "messages_attachments";
            const idColumn = isGroup ? "group_message_id" : "message_id";
            let signedAtts = [];
            const { data: rawAtts } = await supabase.from(tableName).select("*").eq(idColumn, newMessage.id);
            if (rawAtts && rawAtts.length > 0) {
              signedAtts = await Promise.all(
                rawAtts.map(async (att) => {
                  const path = att.attachment_path;
                  if (!path || /^https?:\/\//i.test(path) || /^file:\/\//i.test(path)) return att;
                  const signedUrl = await getSignedStorageUrl(path);
                  return { ...att, attachment_path: signedUrl || path };
                })
              );
            }
            setMessages((prev) =>
              prev.map((m) => {
                if (String(m.id) !== String(newMessage.id)) return m;
                const nextAttachments = signedAtts?.length ? signedAtts : m.attachments;
                if (!senderProfile && nextAttachments === m.attachments) return m;
                return { ...m, sender: senderProfile ?? m.sender, attachments: nextAttachments };
              })
            );
          } catch {}
        })();
      } else if (event === "update") {
        setMessages((prev) =>
          prev.map((m) => (String(m.id) === String(newMessage.id) ? { ...m, ...newMessage } : m))
        );
      }
      else if (event === "delete") {
        setMessages((prev) => prev.filter((m) => String(m.id) !== String(newMessage.id)));
      }
    };

    if (isGroup) {
      unsubscribe = subscribeToGroupMessages(groupId, handleMessageEvent);
    } else if (currentUserId && contactId) {
      unsubscribe = subscribeToDirectMessages(currentUserId, contactId, handleMessageEvent);
    }
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [hasConversation, isGroup, contactId, groupId, currentUserId, currentUserProfile, refreshUnreadMessages]);

  useEffect(() => {
    if (!typingChannelKey || !currentUserId) {
      typingChannelRef.current = null;
      setTypingUsers([]);
      return () => {};
    }
    const channel = supabase.channel(typingChannelKey);
    const handleTyping = ({ payload }) => {
      const senderId = payload?.userId ?? payload?.user_id ?? null;
      if (!senderId || String(senderId) === String(currentUserId)) return;
      const user = { id: senderId, first_name: payload?.first_name ?? " ", last_name: payload?.last_name ?? " ", alumni_photo: payload?.alumni_photo ?? null, isTyping: Boolean(payload?.isTyping) };
      const key = String(senderId);
      if (typingTimeoutsRef.current.has(key)) { clearTimeout(typingTimeoutsRef.current.get(key)); typingTimeoutsRef.current.delete(key); }
      if (user.isTyping) {
        setTypingUsers((prev) => { const filtered = prev.filter((u) => String(u.id ?? u.alumni_id) !== key); return [...filtered, user]; });
        const timeout = setTimeout(() => { setTypingUsers((prev) => prev.filter((u) => String(u.id ?? u.alumni_id) !== key)); typingTimeoutsRef.current.delete(key); }, 2500);
        typingTimeoutsRef.current.set(key, timeout);
      } else {
        setTypingUsers((prev) => prev.filter((u) => String(u.id ?? u.alumni_id) !== key));
      }
    };
    channel.on("broadcast", { event: "typing" }, handleTyping).subscribe();
    typingChannelRef.current = channel;
    return () => {
      typingChannelRef.current = null;
      typingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      typingTimeoutsRef.current.clear();
      setTypingUsers([]);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, typingChannelKey]);

  const openMessageActions = useCallback((message) => { setActionMessage(message); setShowActions(true); }, []);
  const closeMessageActions = useCallback(() => { setShowActions(false); setActionMessage(null); }, []);

  // 🔥 NEW: Triggered when an attachment is tapped inside a MessageBubble
  const handleAttachmentPress = useCallback((attachmentData) => {
    const url = typeof attachmentData === 'string' ? attachmentData : attachmentData?.attachment_path;
    if (url) {
      setActiveAttachment({ attachment_path: url });
      setViewerVisible(true);
    }
  }, []);

  const closeAttachmentViewer = useCallback(() => {
    setViewerVisible(false);
    setActiveAttachment(null);
  }, []);

  const handleReact = useCallback(async (emoji) => {
    if (!actionMessage) return;
    try {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== actionMessage.id) return msg;
          const nextReactions = { ...(msg.reactions || {}) };
          nextReactions[emoji] = (nextReactions[emoji] || 0) + 1;
          (async () => {
            try {
              if (isGroup) { await updateGroupMessageReactions(actionMessage.id, nextReactions); } 
              else { await supabase.from("messages").update({ reactions: nextReactions }).eq("id", actionMessage.id); }
            } catch (err) { console.warn("Reaction persist error: ", err); }
          })();
          return { ...msg, reactions: nextReactions };
        }),
      );
    } catch (error) {
      console.error("Reaction failed: ", error);
      ThemedAlert.alert("Error", "Could not add reaction.");
    } finally {
      setShowReactionPicker(false); closeMessageActions();
    }
  }, [actionMessage, closeMessageActions, isGroup]);

  const handleReply = useCallback(() => {
    if (!actionMessage) return;
    setReplyTo({ ...actionMessage, sender_name: actionMessage?.sender_name ?? actionMessage?.sender?.name ?? conversationName, isOutgoing: Boolean(actionMessage?.localStatus) || (currentUserId != null && String(actionMessage?.sender_id ?? actionMessage?.user_id ?? "") === String(currentUserId)) });
    closeMessageActions();
  }, [actionMessage, closeMessageActions, conversationName, currentUserId]);

  const handleSwipeReply = useCallback((message) => {
    if (!message) return;
    setReplyTo({ ...message, sender_name: message?.sender_name ?? message?.sender?.name ?? conversationName, isOutgoing: Boolean(message?.localStatus) || (currentUserId != null && String(message?.sender_id ?? message?.user_id ?? "") === String(currentUserId)) });
  }, [conversationName, currentUserId]);

  const handleDeleteMessage = useCallback(async () => {
    if (!actionMessage || !currentUserId) return;
    try {
      if (isGroup) await deleteGroupMessage(actionMessage.id, currentUserId);
      else await deleteDirectMessage(actionMessage.id, currentUserId);
      setMessages((prev) => prev.filter((msg) => msg.id !== actionMessage.id));
    } catch (error) {
      console.error("Delete failed:", error);
      ThemedAlert.alert("Error", "Could not delete message.");
    } finally { closeMessageActions(); }
  }, [actionMessage, closeMessageActions, currentUserId, isGroup]);

  const handleAttach = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        ThemedAlert.alert("Permission required", "Please allow access to your photos to send an image.");
        return;
      }

      // 🔥 LOCKED STRICTLY TO IMAGES TO PREVENT VIDEO/FILE UPLOADING
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      let uri = result.assets[0].uri;

      if (!uri.startsWith("file://") && !uri.startsWith("content://")) {
        try {
          const FileSystem = await import("expo-file-system/legacy").catch(() =>
            import("expo-file-system")
          );
          const ext =
            result.assets[0].fileName?.split(".").pop()?.toLowerCase() ||
            uri.split(".").pop()?.toLowerCase() ||
            "jpg";
          const dest = `${FileSystem.cacheDirectory}upload-${Date.now()}.${ext}`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          uri = dest;
        } catch (e) {
          console.warn("[Attach] URI normalization failed, using original:", e?.message);
        }
      }

      setSelectedAttachmentUri(uri);
    } catch (error) {
      console.error("Image picker error: ", error);
      ThemedAlert.alert("Error", "Could not open image library.");
    }
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if ((!trimmed && !selectedAttachmentUri) || isSending || !hasConversation) return;
    
    setIsSending(true); setDraft("");
    const currentAttachmentUri = selectedAttachmentUri;
    setSelectedAttachmentUri(null); setReplyTo(null);
    updateTypingStatus(false);

    const receiverType = params.receiverType || 'alumni';
    const senderType = currentUserProfile?.user_type || 'alumni';
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const optimistic = {
      id: tempId,
      client_id: tempId,
      content: trimmed, reply_to: replyTo?.id ?? null, sender_id: currentUserId ?? "local-user",
      created_at: new Date().toISOString(), localStatus: "sending", sender_type: senderType, receiver_type: receiverType,
      attachments: currentAttachmentUri ? [{ attachment_path: currentAttachmentUri, isLocal: true }] : [],
    };
    
    setMessages((prev) => [optimistic, ...prev]);

    const attachmentsArray = currentAttachmentUri ? [currentAttachmentUri] : [];

    try {
      let sentMessage;
      if (isGroup) { sentMessage = await sendGroupMessage(groupId, currentUserId, trimmed, attachmentsArray); }
      else { sentMessage = await sendDirectMessage(currentUserId, contactId, trimmed, attachmentsArray, senderType, receiverType); }

      const tableName = isGroup ? "group_messages_attachments" : "messages_attachments";
      const idColumn = isGroup ? "group_message_id" : "message_id";

      const { data: rawAtts } = await supabase.from(tableName).select("*").eq(idColumn, sentMessage.id);

      if (rawAtts && rawAtts.length > 0) {
        const signedAtts = await Promise.all(
          rawAtts.map(async (att) => {
            const path = att.attachment_path;
            if (!path || /^https?:\/\//i.test(path) || /^file:\/\//i.test(path)) return att;
            const signedUrl = await getSignedStorageUrl(path);
            return { ...att, attachment_path: signedUrl || path };
          })
        );
        sentMessage.attachments = signedAtts;
      } else { sentMessage.attachments = []; }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId || String(m.id) === String(sentMessage.id)
            ? { ...sentMessage, client_id: tempId, localStatus: "sent" }
            : m
        )
      );

    } catch (error) {
      console.error("Send failed:", error);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, localStatus: "failed" } : m)));
      ThemedAlert.alert("Failed", "Message could not be sent.");
    } finally { setIsSending(false); }
  }, [contactId, currentUserId, currentUserProfile, draft, groupId, hasConversation, isGroup, isSending, replyTo, selectedAttachmentUri, updateTypingStatus, params.receiverType]);

  const getItemLayout = useCallback((_, index) => ({ length: 92, offset: 92 * index, index }), []);

  const renderMessageItem = useCallback(({ item }) => {
    const displayItem = { ...item };

    const isSystemMessage = displayItem?.is_system || displayItem?.sender_id === null || displayItem?.type === 'system' || displayItem?.content?.startsWith('[SYSTEM]');
    
    if (isSystemMessage) {
      const displayContent = displayItem?.content?.replace('[SYSTEM]', '')?.trim();
      return (
        <View style={{ alignItems: "center", marginVertical: 16, width: "100%", paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, color: "#64748B", fontFamily: "Poppins_400Regular", textAlign: "center" }}>{displayContent}</Text>
          </View>
        </View>
      );
    }

    const senderId = displayItem?.sender_id ?? displayItem?.user_id ?? displayItem?.sender?.id ?? null;
    const msgSenderType = displayItem?.sender_type ?? displayItem?.sender?.user_type ?? 'alumni';
    const currUserType = currentUserProfile?.user_type ?? 'alumni';

    const isOutgoing = Boolean(item?.localStatus) || (currentUserId != null && senderId != null && String(senderId) === String(currentUserId) && String(msgSenderType) === String(currUserType));

    const baseName = displayItem?.sender?.first_name
  ? `${displayItem.sender.first_name} ${displayItem.sender.last_name ?? ""}`.trim()
  : displayItem?.sender?.name
    ? displayItem.sender.name
    : displayItem?.sender_name
      ? displayItem.sender_name
      : (isGroup ? "Group member" : conversationName);
    const senderName = msgSenderType === 'admin' ? `${baseName} (Admin)` : baseName;
    const senderAvatar = getAvatarUri(senderName, displayItem?.sender?.alumni_photo ?? displayItem?.sender_avatar ?? (isGroup ? null : conversationAvatar));
    const currentDate = getMessageDate(displayItem);
    const messageTime = formatMessageTime(currentDate);

    return (
      <MessageBubble
        message={displayItem} 
        isOutgoing={isOutgoing} 
        isGroup={isGroup} 
        showAvatar={!isOutgoing} 
        senderAvatar={senderAvatar} 
        senderName={senderName}
        onLongPress={() => openMessageActions(displayItem)} 
        onSwipeReply={handleSwipeReply} 
        onMentionPress={handleMentionPress}
        onAttachmentPress={handleAttachmentPress} // 🔥 Passes tap up to our Viewer
        read={Boolean(displayItem?.is_read || displayItem?.read_at)} 
        messageTime={messageTime} 
        sendStatus={displayItem?.localStatus ?? null}
      />
    );
  }, [conversationAvatar, conversationName, currentUserId, currentUserProfile, handleMentionPress, handleSwipeReply, openMessageActions, handleAttachmentPress]);

const renderEmptyState = useCallback(() => {
  if (!hasLoadedOnce) return null;
  if (messages.length > 0) return null;

  return (
    <View style={styles.emptyConversationState}>
      <View style={styles.emptyConversationFlipped}>
        <Ionicons name="chatbubble-ellipses-outline" size={44} color="#8AA0E8" />
        <Text style={styles.emptyConversationTitle}>Start the conversation</Text>
        <Text style={styles.emptyConversationText}>
          Messages you send here will appear like an Instagram-style chat thread.
        </Text>
      </View>
    </View>
  );
}, [hasLoadedOnce, messages.length]);

  if (!hasConversation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
          <View style={styles.chatHeader}>
            <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color="#31429B" />
            </Pressable>
            <View style={styles.headerProfileWrap}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Conversation</Text>
                <Text style={styles.headerSubtitle}>Missing chat details</Text>
              </View>
            </View>
          </View>
          <View style={styles.loadingState}>
            <Text style={styles.emptyConversationTitle}>No conversation selected</Text>
            <Text style={styles.emptyConversationText}>Open this screen from a contact or message thread.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const keyboardBehavior = isKeyboardVisible ? (Platform.OS === "ios" ? "padding" : "height") : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "transparent" }} behavior={keyboardBehavior} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -10}>
        <View style={[styles.container, { flex: 1 }]}>
          <ChatHeader
            title={conversationName} subtitle={headerSubtitle} avatarUri={getAvatarUri(conversationName, conversationAvatar)}
            avatarName={isGroup ? (groupMembers.map((member) => member?.name).filter(Boolean).join(" ") || conversationName) : conversationName}
            onBackPress={() => navigation.goBack()} onProfilePress={() => {}} onCallPress={() => initiateCall("audio")} onVideoPress={() => initiateCall("video")}
            onInfoPress={() => {
            if (isGroup) {
              navigation.navigate("ChatDetailsScreen", { 
                group: { 
                  id: groupId, 
                  name: conversationName, 
                  avatar: getAvatarUri(conversationName, conversationAvatar),
                  members: groupMembers.map(m => ({
                    alumni_id: m.id,
                    alumni: m.profile,
                    member_type: m.memberType,
                    role: m.isGroupAdmin ? 'admin' : 'alumni'
                  })),
                  created_by: params?.group?.created_by || null,
                  created_by_type: params?.group?.created_by_type || 'alumni'
                } 
              });
              return;
            }
            navigation.navigate("ChatDetailsScreen", {
              contact: { 
                id: contactId, 
                name: conversationName, 
                first_name: params.contactFirstName ?? params.contact?.first_name ?? " ", 
                last_name: params.contactLastName ?? params.contact?.last_name ?? " ", 
                username: params.contactUsername ?? params.contact?.username ?? null, 
                avatar: conversationAvatar, 
                alumni_photo: params.contactPhoto ?? params.contact?.alumni_photo ?? null,
                user_type: params.receiverType ?? params.contact?.user_type ?? "alumni",
                admin_role: conversationRole
              },
            });
          }}
          />

          {isRefreshing && hasLoadedOnce && messages.length > 0 && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <ActivityIndicator size="small" color="#31429B" />
            </View>
          )}

          <FlatList
            ref={flatListRef} inverted={true} data={messages} renderItem={renderMessageItem}
            keyExtractor={(item, index) => String(item?.client_id ?? item?.id ?? `msg-${index}`)}
            initialNumToRender={10} maxToRenderPerBatch={6} updateCellsBatchingPeriod={50} windowSize={5} getItemLayout={getItemLayout} removeClippedSubviews
            contentContainerStyle={messages.length > 0 ? styles.messagesContent : [styles.messagesContent, { flexGrow: 1 }]}
            ListEmptyComponent={renderEmptyState} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}
            style={styles.chatBody} onEndReached={() => loadMoreMessages()} onEndReachedThreshold={0.5}
            ListFooterComponent={isFetchingMore ? (<ActivityIndicator size="small" color="#31429B" style={{ marginVertical: 12 }} />) : null}
          />

          <View style={{ backgroundColor: "#FFFFFF", paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 12) }}>
            <View style={styles.composerFooterWrap}>
              {mentionContext && mentionSuggestions.length > 0 ? (
                <View style={styles.mentionPanel}>
                  {mentionSuggestions.map((item, idx) => (
                    <Pressable key={`${item.id ?? item.name}-${idx}`} style={styles.mentionItem} onPress={() => handleMentionPick(item.handle)}>
                      <Image source={{ uri: item.avatar }} style={styles.mentionAvatar} />
                      <Text style={styles.mentionName} numberOfLines={1}>@{item.handle}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {typingLabel && typingLabel !== " " ? (
                <View style={styles.typingIndicatorRow}>
                  <View style={styles.typingBubble}>
                    <Text style={styles.typingText} numberOfLines={1}>{typingLabel}</Text>
                  </View>
                </View>
              ) : null}

              {selectedAttachmentUri ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row" }}>
                  <View style={{ position: "relative" }}>
                    <Image source={{ uri: selectedAttachmentUri }} style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: "#E5E7EB" }} />
                    <TouchableOpacity style={{ position: "absolute", top: -8, right: -8, backgroundColor: "#FFF", borderRadius: 12 }} onPress={() => setSelectedAttachmentUri(null)}>
                      <Ionicons name="close-circle" size={24} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <MessageInputBar
                value={draft}
                onChangeText={handleTextChange} 
                onSend={handleSend}
                onAttach={handleAttach}
                onEmoji={() => setDraft((prev) => `${prev} 😊`)}
                disabled={isSending}
                isReplying={Boolean(replyTo)}
                onCancelReply={() => setReplyTo(null)}
                replyTo={replyTo}
                hasAttachment={Boolean(selectedAttachmentUri)}
              />
            </View>
          </View>
        </View>

        <Modal visible={showActions} transparent animationType="fade" onRequestClose={closeMessageActions}>
          <View style={styles.reactionPickerOverlay}>
            <View style={styles.reactionPickerContent}>
              <Text style={styles.reactionPickerTitle}>Message actions</Text>
              <TouchableOpacity style={styles.reactionPickerEmoji} onPress={handleDeleteMessage}><Text style={styles.reactionPickerEmojiText}>Delete</Text></TouchableOpacity>
              <TouchableOpacity style={styles.reactionPickerClose} onPress={closeMessageActions}><Text style={styles.reactionPickerCloseText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showReactionPicker} transparent animationType="fade" onRequestClose={() => setShowReactionPicker(false)}>
          <View style={styles.reactionPickerOverlay}>
            <View style={styles.reactionPickerContent}>
              <Text style={styles.reactionPickerTitle}>React to message</Text>
              <View style={styles.reactionPickerRow}>
                {REACTIONS.map((emoji) => (
                  <TouchableOpacity key={emoji} style={styles.reactionPickerEmoji} onPress={() => handleReact(emoji)}><Text style={styles.reactionPickerEmojiText}>{emoji}</Text></TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.reactionPickerClose} onPress={() => setShowReactionPicker(false)}><Text style={styles.reactionPickerCloseText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 🔥 NEW: MEDIA VIEWER ATTACHED TO SCREEN BOTTOM */}
        <AttachmentViewerModal 
          visible={viewerVisible} 
          attachment={activeAttachment} 
          onClose={closeAttachmentViewer} 
        />

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}