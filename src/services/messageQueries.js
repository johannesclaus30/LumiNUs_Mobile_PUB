import supabase from './supabase';
import { decryptMessage, encryptMessage } from '../utils/cryptoUtils';
import { sendPushNotification } from './NotificationSender';

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const signedUrlCache = new Map(); // key: "bucket::path" -> { url, expiresAt }

const getCachedSignedUrl = async (bucket, path, ttl = SIGNED_URL_TTL_SECONDS) => {
  const key = `${bucket}::${path}`;
  const now = Date.now();
  const cached = signedUrlCache.get(key);
  if (cached && cached.expiresAt > now + 60_000) return cached.url;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) return null;

  signedUrlCache.set(key, {
    url: data.signedUrl,
    expiresAt: now + ttl * 1000,
  });
  return data.signedUrl;
};

const sendPushNotificationWithRetry = async (tokens, title, body, data) => {
  try {
    await sendPushNotification(tokens, title, body, data);
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      await sendPushNotification(tokens, title, body, data);
    } catch (retryError) {
      console.error('[Notification] Retry also failed. Logging failure:', retryError?.message || retryError);
    }
  };
};

const toDecryptedMessage = (message) => {
  if (!message || typeof message !== 'object') return message;
  let content = message.content;
  try {
    content = decryptMessage(message.content);
  } catch (err) {
    console.warn('[crypto] decrypt failed for message', message.id, err?.message);
    content = '[Unable to decrypt]';
  }
  return { ...message, content };
};

const extractMentionHandles = (text) => {
  const pattern = /@([a-zA-Z0-9_.-]+)/g;
  const found = new Set();
  let match;
  const value = String(text ?? '');
  while ((match = pattern.exec(value)) !== null) {
    if (match[1]) found.add(match[1].toLowerCase());
  }
  return Array.from(found);
};

const resolveHandlesToAlumni = async (handles) => {
  const results = {};
  for (const handle of handles) {
    try {
      const parts = handle.split('_');
      const first = parts[0] ? `${parts[0]}%` : '%';
      const last = parts.length > 1 ? `${parts.slice(1).join(' ')}%` : '%';

      const { data, error } = await supabase
        .from('alumnis_base')
        .select('id, push_token, first_name, last_name')
        .ilike('first_name', first)
        .ilike('last_name', last)
        .limit(1)
        .maybeSingle();

      if (!error && data && data.id) {
        results[handle] = data;
      }
    } catch (err) {}
  }
  return results;
};

const normalizeOutgoingContent = (content) => {
  const value = String(content ?? '');
  if (!value) return '';
  if (value.startsWith('enc:') || value.startsWith('U2FsdGVkX1')) {
    return value;
  }
  try {
    const encrypted = encryptMessage(value);
    if (!encrypted || !encrypted.startsWith('enc:')) {
      console.error('[crypto] encryptMessage returned invalid output:', encrypted);
      return value;
    }
    return encrypted;
  } catch (err) {
    console.error('[crypto] encryptMessage threw:', err?.message);
    return value;
  }
};

const getUserProfile = async (userId, userType) => {
  try {
    if (!userId || !userType) return null;
    
    if (userType === 'alumni') {
      const { data } = await supabase
        .from('alumnis_base')
        .select('id, first_name, last_name, alumni_photo, email, program')
        .eq('id', userId)
        .maybeSingle();
      return data ? { ...data, user_type: 'alumni' } : null;
    } 
    
    if (userType === 'admin') {
      const { data } = await supabase
        .from('admins')
        .select('id, admin_first_name, admin_last_name, photo, admin_email, admin_role')
        .eq('id', userId)
        .maybeSingle();
      
      return data ? {
        id: data.id,
        first_name: data.admin_first_name,
        last_name: data.admin_last_name,
        alumni_photo: data.photo,
        email: data.admin_email,
        admin_role: data.admin_role,
        program: 'Admin Staff',
        user_type: 'admin'
      } : null;
    }
    return null;
  } catch (error) {
    return null;
  }
};

const getUserProfiles = async (userInfos) => {
  const profiles = new Map();
  if (!userInfos || userInfos.length === 0) return profiles;
  
  const alumniIds = [];
  const adminIds = [];
  
  userInfos.forEach(({ id, type }) => {
    if (type === 'admin') adminIds.push(id);
    else alumniIds.push(id);
  });
  
  try {
    if (alumniIds.length > 0) {
      const { data: alumni } = await supabase.from('alumnis_base').select('id, first_name, last_name, alumni_photo, email, program').in('id', alumniIds);
      (alumni || []).forEach(user => profiles.set(`alumni_${user.id}`, { ...user, user_type: 'alumni' }));
    }
    
    if (adminIds.length > 0) {
      const { data: admins } = await supabase.from('admins').select('id, admin_first_name, admin_last_name, photo, admin_email, admin_role').in('id', adminIds);
      (admins || []).forEach(user => {
        profiles.set(`admin_${user.id}`, {
          id: user.id, first_name: user.admin_first_name, last_name: user.admin_last_name, alumni_photo: user.photo, email: user.admin_email, admin_role: user.admin_role, program: 'Admin Staff', user_type: 'admin'
        });
      });
    }
    return profiles;
  } catch (error) {
    return profiles;
  }
};

const getSenderName = async (senderId, senderType) => {
  try {
    if (senderType === 'alumni') {
      const { data } = await supabase.from('alumnis_base').select('first_name, last_name').eq('id', senderId).maybeSingle();
      return data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : 'Someone';
    } else {
      const { data } = await supabase.from('admins').select('admin_first_name, admin_last_name').eq('id', senderId).maybeSingle();
      return data ? `${data.admin_first_name || ''} ${data.admin_last_name || ''}`.trim() : 'Admin Staff';
    }
  } catch {
    return 'Someone';
  }
};

export const getDirectMessages = async (userId1, userId2, limit = 50, offset = 0, receiverType = 'alumni') => {
  const { data: messagesData, error } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, sender_type, receiver_type, content, created_at, is_read, deleted_by')
    .or(
      `and(sender_id.eq.${userId1},receiver_id.eq.${userId2},receiver_type.eq.${receiverType}),` +
      `and(sender_id.eq.${userId2},receiver_id.eq.${userId1},sender_type.eq.${receiverType})`
    )
    .not('deleted_by', 'cs', `{${userId1}}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[DEBUG-QUERY] Supabase error:', error);
    return [];
  }

  // Find admin messages specifically to inspect
  const adminMsgs = messagesData.filter(m => m.sender_type === 'admin');
  console.log(`[DEBUG-QUERY] Fetched ${messagesData.length} messages, ${adminMsgs.length} from admin.`);

  if (adminMsgs.length > 0) {
    console.log('[DEBUG-QUERY] Sample raw admin row:', {
      id: adminMsgs[0].id,
      content: adminMsgs[0].content,
      type: typeof adminMsgs[0].content,
      len: adminMsgs[0].content?.length
    });
  }

  const messagesWithAttachments = await Promise.all(
    messagesData.map(async (msg) => {
      const decryptedMsg = toDecryptedMessage(msg);
      return decryptedMsg;
    })
  );

  return messagesWithAttachments;
};

export const sendDirectMessage = async (senderId, receiverId, content, attachments = [], senderType = 'alumni', receiverType = 'alumni') => {
  try {
    const encryptedContent = normalizeOutgoingContent(content);
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_id: senderId, receiver_id: receiverId, content: encryptedContent, is_read: false, sender_type: senderType, receiver_type: receiverType,
      }])
      .select().single();

    if (error) throw error;

    if (attachments.length > 0) {
      await Promise.all(attachments.map(att => uploadMessageAttachment(data.id, att, senderType, senderId, receiverType, receiverId)));
    }

    try {
      const handles = extractMentionHandles(content);
      if (handles.length > 0) {
        const resolved = await resolveHandlesToAlumni(handles);
        const notifyIds = [];
        Object.entries(resolved).forEach(([handle, alumni]) => {
          if (alumni && alumni.id && alumni.id !== senderId) notifyIds.push(alumni.id);
        });

        if (notifyIds.length > 0) {
          const { data: alumniRows } = await supabase.from('alumnis_base').select('push_token').in('id', notifyIds).not('push_token', 'is', null).eq('is_online', true);
          if (Array.isArray(alumniRows) && alumniRows.length > 0) {
            const tokens = alumniRows.map(r => r.push_token).filter(Boolean);
            if (tokens.length > 0) await sendPushNotificationWithRetry(tokens, 'Mentioned in chat', 'You were mentioned in a message.', { type: 'mention', messageId: data.id, senderId });
          }
        }
      }
    } catch (mentionErr) {}

    if (receiverType === 'alumni') {
      try {
        const { data: muteData } = await supabase.from('dm_settings').select('is_muted').eq('user_id', receiverId).eq('contact_id', senderId).maybeSingle();
        if (!muteData?.is_muted) {
          const { data: receiverRow } = await supabase.from('alumnis_base').select('push_token').eq('id', receiverId).eq('is_online', true).maybeSingle();
          if (receiverRow && receiverRow.push_token) {
            const senderName = await getSenderName(senderId, senderType);
            const pushData = { type: 'message', messageId: data.id, senderId };
            await sendPushNotificationWithRetry([receiverRow.push_token], 'New Message', `${senderName} sent you a message.`, pushData);
          }
        }
      } catch (notifErr) {}
    }
    return toDecryptedMessage(data);
  } catch (error) {
    throw error;
  }
};

export const markMessageAsRead = async (messageId) => {
  try {
    const { data, error } = await supabase.from('messages').update({ is_read: true }).eq('id', messageId).select().single();
    if (error) throw error;
    return data;
  } catch (error) { throw error; }
};

export const markMessagesAsRead = async (messageIds) => {
  if (!messageIds || messageIds.length === 0) return;
  try {
    const numericIds = messageIds.map(id => Number(id)).filter(id => !isNaN(id));
    const { error } = await supabase.from('messages').update({ is_read: true }).in('id', numericIds);
    if (error) throw error;
  } catch (error) { throw error; }
};

export const markDirectConversationAsRead = async (userId, contactId) => {
  if (!userId || !contactId) return;
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('sender_id', contactId)
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) throw error;
};

export const markGroupChatAsRead = async (groupChatId, alumniId, lastReadMessageId) => {
  try {
    const numericMessageId = Number(lastReadMessageId);
    const { data, error } = await supabase
      .from('group_chat_members')
      .update({ last_read_message_id: numericMessageId })
      .eq('group_chat_id', groupChatId)
      .eq('alumni_id', alumniId)
      .select('id, group_chat_id, alumni_id, last_read_message_id')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) { throw error; }
};

export const deleteMessage = async (messageId, userId) => {
  try {
    const { data: msg } = await supabase.from('messages').select('deleted_by').eq('id', messageId).single();
    const currentDeleted = msg?.deleted_by || [];
    if (!currentDeleted.includes(userId)) {
      const { error } = await supabase.from('messages').update({ deleted_by: [...currentDeleted, userId] }).eq('id', messageId);
      if (error) throw error;
    }
  } catch (error) { throw error; }
};

export const uploadMessageAttachment = async (
  messageId,
  attachmentUri,
  senderType = 'alumni',
  senderId,
  receiverType = 'alumni',
  receiverId
) => {
  try {
    const ext = attachmentUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
    const mimeMap = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
      heif: 'image/heic', mp4: 'video/mp4', mov: 'video/quicktime',
      pdf: 'application/pdf',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    const participants = [`${senderType}_${senderId}`, `${receiverType}_${receiverId}`].sort();
    const convoFolderName = `${participants[0]}_${participants[1]}`;
    const senderFolderName = `${senderType}_${senderId}`;
    const bucketPath = `convo/${convoFolderName}/${senderFolderName}/${messageId}-${Date.now()}.${ext}`;

    // 🔥 RN-safe: read the file as ArrayBuffer, upload raw bytes.
    // This bypasses Supabase's FormData code path entirely.
    const response = await fetch(attachmentUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('luminus_messages_attachments')
      .upload(bucketPath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase
      .from('messages_attachments')
      .insert([{
        message_id: messageId,
        attachment_type: 'image',
        attachment_path: bucketPath,
      }]);

    if (insertError) throw insertError;

    return bucketPath;
  } catch (error) {
    console.error('[uploadMessageAttachment] failed:', error?.message || error);
    throw error;
  }
};

export const getMessageAttachments = async (messageId) => {
  try {
    const { data, error } = await supabase
      .from('messages_attachments')
      .select('*')
      .eq('message_id', messageId);
    if (error) throw error;

    const resolved = await Promise.all(
      (data || []).map(async (att) => {
        const path = att.attachment_path;
        if (!path) return att;
        if (/^https?:\/\//i.test(path) || /^file:\/\//i.test(path)) return att;

        const cleanPath = String(path).replace(/^\/+/, '');
        const url = await getCachedSignedUrl('luminus_messages_attachments', cleanPath);
        if (url) return { ...att, attachment_path: url };

        const { data: pub } = supabase.storage
          .from('luminus_messages_attachments')
          .getPublicUrl(cleanPath);
        return { ...att, attachment_path: pub?.publicUrl || path };
      })
    );

    return resolved;
  } catch (error) {
    throw error;
  }
};

export const uploadGroupMessageAttachment = async (
  groupMessageId,
  attachmentUri,
  groupChatId,
  senderId
) => {
  try {
    const ext = attachmentUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
    const mimeMap = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
      heif: 'image/heic', mp4: 'video/mp4', mov: 'video/quicktime',
      pdf: 'application/pdf',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';
    const bucketPath = `convo/group_${groupChatId}/alumni_${senderId}/${groupMessageId}-${Date.now()}.${ext}`;

    // 🔥 RN-safe: read the file as ArrayBuffer, upload raw bytes.
    const response = await fetch(attachmentUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('luminus_messages_attachments')
      .upload(bucketPath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase
      .from('group_messages_attachments')
      .insert([{
        group_message_id: groupMessageId,
        attachment_type: 'image',
        attachment_path: bucketPath,
      }]);

    if (insertError) throw insertError;

    return bucketPath;
  } catch (error) {
    console.error('[uploadGroupMessageAttachment] failed:', error?.message || error);
    throw error;
  }
};

export const getGroupMessageAttachments = async (groupMessageId) => {
  try {
    const { data, error } = await supabase
      .from('group_messages_attachments')
      .select('*')
      .eq('group_message_id', groupMessageId);
    if (error) throw error;

    const resolved = await Promise.all(
      (data || []).map(async (att) => {
        const path = att.attachment_path;
        if (!path) return att;
        if (/^https?:\/\//i.test(path) || /^file:\/\//i.test(path)) return att;

        const cleanPath = String(path).replace(/^\/+/, '');
        const url = await getCachedSignedUrl('luminus_messages_attachments', cleanPath);
        if (url) return { ...att, attachment_path: url };

        const { data: pub } = supabase.storage
          .from('luminus_messages_attachments')
          .getPublicUrl(cleanPath);
        return { ...att, attachment_path: pub?.publicUrl || path };
      })
    );

    return resolved;
  } catch (error) {
    throw error;
  }
};

export const getConversations = async (userId, userType = 'alumni', offset = 0, limit = 50) => {
  try {
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, is_read, created_at, sender_type, receiver_type')
      .or(
        `and(sender_id.eq.${userId},sender_type.eq.${userType}),` +
        `and(receiver_id.eq.${userId},receiver_type.eq.${userType})`
      )
      .not('deleted_by', 'cs', `{${userId}}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!messagesData || messagesData.length === 0) return [];

    const conversationMap = new Map();

    messagesData.forEach(msg => {
      const isSender = msg.sender_id === userId;
      const partnerId = isSender ? msg.receiver_id : msg.sender_id;
      const partnerType = isSender ? msg.receiver_type : msg.sender_type;
      const partnerKey = `${partnerType}_${partnerId}`;
      
      if (!conversationMap.has(partnerKey)) {
        conversationMap.set(partnerKey, { partnerId, partnerType, messages: [], unreadCount: 0, latestTimestamp: null });
      }

      const conversation = conversationMap.get(partnerKey);
      conversation.messages.push(msg);
      if (!isSender && !msg.is_read) conversation.unreadCount++;

      const msgTime = new Date(msg.created_at).getTime();
      if (!conversation.latestTimestamp || msgTime > conversation.latestTimestamp) {
        conversation.latestTimestamp = msgTime;
      }
    });

    const userInfos = Array.from(conversationMap.values()).map(conv => ({ id: conv.partnerId, type: conv.partnerType || 'alumni' }));
    const userProfiles = await getUserProfiles(userInfos);

    let formattedConversations = Array.from(conversationMap.entries()).map(([key, conversation]) => {
      const partnerKey = `${conversation.partnerType}_${conversation.partnerId}`;
      const partner = userProfiles.get(partnerKey) || {};
      const latestMsg = conversation.messages[0];
      
      return {
        id: `${conversation.partnerType}_${conversation.partnerId}`,
        connection_id: conversation.partnerId,
        user_type: conversation.partnerType || 'alumni',
        first_name: partner.first_name || 'Unknown',
        last_name: partner.last_name || '',
        email: partner.email || '',
        alumni_photo: partner.alumni_photo || null,
        admin_role: partner.admin_role || null,
        program: partner.program || (conversation.partnerType === 'admin' ? 'Admin Staff' : ''),
        unread_count: conversation.unreadCount,
        latest_message: {
          id: latestMsg?.id, content: decryptMessage(latestMsg?.content || ''), created_at: latestMsg?.created_at, message: decryptMessage(latestMsg?.content || ''), text: decryptMessage(latestMsg?.content || ''),
        },
        last_message: decryptMessage(latestMsg?.content || ''),
        last_message_at: latestMsg?.created_at,
        updated_at: latestMsg?.created_at,
        created_at: latestMsg?.created_at,
      };
    });

    const contactIds = formattedConversations.map(c => c.connection_id);

    if (contactIds.length > 0) {
      const { data: dmSettings } = await supabase
        .from('dm_settings')
        .select('contact_id, is_archived, is_hidden')
        .eq('user_id', userId)
        .in('contact_id', contactIds);

      const hiddenOrArchivedIds = new Set((dmSettings || []).filter(s => s.is_archived === true || s.is_hidden === true).map(s => s.contact_id));
      formattedConversations = formattedConversations.filter(c => !hiddenOrArchivedIds.has(c.connection_id));
    }

    formattedConversations.sort((a, b) => {
      const aTime = new Date(a.latest_message?.created_at || 0).getTime();
      const bTime = new Date(b.latest_message?.created_at || 0).getTime();
      return bTime - aTime;
    });

    return formattedConversations.slice(offset, offset + limit);

  } catch (error) {
    console.error('[messages] Get conversations error:', error.message);
    return [];
  }
};

export const getUnreadMessageCount = async (userId) => {
  try {
    const { count: dmCount, error: dmError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .neq('sender_id', userId)
      .eq('is_read', false)
      .not('deleted_by', 'cs', `{${userId}}`);

    if (dmError) throw dmError;

    const { data: groupMemberships, error: gmError } = await supabase
      .from('group_chat_members')
      .select('group_chat_id, last_read_message_id')
      .eq('alumni_id', userId)
      .eq('ignored', false)
      .eq('archived', false);

    let groupUnreadCount = 0;

    if (!gmError && groupMemberships?.length > 0) {
      const groupQueries = groupMemberships.map((membership) => {
        let query = supabase
          .from('group_messages')
          .select('id', { count: 'exact', head: true })
          .eq('group_chat_id', membership.group_chat_id)
          .neq('sender_id', userId);

        if (membership.last_read_message_id) {
          query = query.gt('id', membership.last_read_message_id);
        }
        return query;
      });

      const groupResults = await Promise.all(groupQueries);
      groupUnreadCount = groupResults.reduce((acc, res) => acc + (res.count || 0), 0);
    }

    return (dmCount || 0) + groupUnreadCount;
  } catch (error) {
    return 0; 
  }
};

export const createGroupChat = async (createdBy, chatName, members = [], createdByType = 'alumni') => {
  try {
    const { data, error } = await supabase
      .from('group_chats')
      .insert([{ 
        name: chatName, 
        created_by: createdBy,
        created_by_type: createdByType // Track if creator is admin or alumni
      }])
      .select()
      .single();
    
    if (error) throw error;

    // ✅ Track seen compound keys to avoid duplicates
    const seenKeys = new Set();
    const membersToAdd = [];

    // ✅ Add creator
    const creatorKey = `${createdBy}_${createdByType}`;
    seenKeys.add(creatorKey);
    membersToAdd.push({ 
      group_chat_id: data.id, 
      alumni_id: createdBy, 
      role: 'admin', 
      member_type: createdByType
    });

    // ✅ Add other members with their user types
    members.forEach(member => {
      // Handle both object format and legacy ID format
      const memberId = member.id || member;
      const memberType = member.user_type || 'alumni';
      const key = `${memberId}_${memberType}`;
      
      // Skip duplicates
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      
      // Skip if it's the creator
      if (memberId === createdBy && memberType === createdByType) return;
      
      membersToAdd.push({ 
        group_chat_id: data.id, 
        alumni_id: memberId, 
        role: (memberType === 'admin') ? 'admin' : 'alumni',
        member_type: memberType // ✅ Use the actual user type!
      });
    });

    // ✅ Insert all members
    await supabase.from('group_chat_members').insert(membersToAdd);
    
    return data;
  } catch (error) { 
    console.error('Error in createGroupChat:', error);
    throw error; 
  }
};

/**
 * Get group chat details
 * 🔥 FIXED: Uses `created_by_type` to fetch the correct creator profile
 */
export const getGroupChat = async (groupChatId) => {
  try {
    const { data: groupData, error: groupError } = await supabase
      .from('group_chats')
      .select('*')
      .eq('id', groupChatId)
      .single();

    if (groupError) throw groupError;

    // Fetch all members
    const { data: memberLinks, error: memberError } = await supabase
      .from('group_chat_members')
      .select('id, role, alumni_id, member_type')
      .eq('group_chat_id', groupChatId);

    if (memberError) throw memberError;

    // Get all unique user IDs from members
    const allUserIds = memberLinks.map(m => m.alumni_id).filter(Boolean);
    
    // Fetch alumni data (they have student_id_number)
    const { data: alumniProfiles } = await supabase
      .from('alumnis_base')
      .select('id, first_name, last_name, email, alumni_photo, student_id_number')
      .in('id', allUserIds);
    
    // Fetch admin data (they don't have student_id_number)
    const { data: adminProfiles } = await supabase
      .from('admins')
      .select('id, admin_first_name, admin_last_name, admin_email, photo, admin_role')
      .in('id', allUserIds);

    // Create maps for quick lookup
    const alumniMap = new Map();
    (alumniProfiles || []).forEach(p => {
      alumniMap.set(String(p.id), {
        ...p,
        user_type: 'alumni',
        is_alumni: true,
        is_admin: false
      });
    });

    const adminMap = new Map();
    (adminProfiles || []).forEach(p => {
      adminMap.set(String(p.id), {
        id: p.id,
        first_name: p.admin_first_name,
        last_name: p.admin_last_name,
        email: p.admin_email,
        alumni_photo: p.photo,
        admin_role: p.admin_role,
        user_type: 'admin',
        student_id_number: null,
        is_alumni: false,
        is_admin: true
      });
    });

    // Build members with proper typing
    groupData.members = (memberLinks || []).map(link => {
      const userId = String(link.alumni_id);
      let profile = null;
      
      // 🔥 CRITICAL: Use member_type to determine which table to look in
      if (link.member_type === 'admin') {
        // This is an admin member - look in adminMap
        profile = adminMap.get(userId);
        if (profile) {
          profile.user_type = 'admin';
        }
      } else {
        // This is an alumni member - look in alumniMap
        profile = alumniMap.get(userId);
        if (profile) {
          profile.user_type = 'alumni';
        }
        
        // If not found in alumniMap, check adminMap as fallback
        if (!profile) {
          profile = adminMap.get(userId);
          if (profile) {
            profile.user_type = 'admin';
          }
        }
      }

      return {
        ...link,
        alumni: profile || null
      };
    });

    // 🔥 FIXED: Fetch the creator profile based on created_by_type
    const creatorId = String(groupData.created_by);
    const creatorType = groupData.created_by_type || 'alumni';
    
    let creatorProfile = null;
    
    if (creatorType === 'admin') {
      // Fetch admin creator
      const { data: adminProfile } = await supabase
        .from('admins')
        .select('id, admin_first_name, admin_last_name, photo, admin_role')
        .eq('id', creatorId)
        .single();
      
      if (adminProfile) {
        creatorProfile = {
          id: adminProfile.id,
          first_name: adminProfile.admin_first_name,
          last_name: adminProfile.admin_last_name,
          alumni_photo: adminProfile.photo,
          admin_role: adminProfile.admin_role,
          user_type: 'admin',
          is_admin: true,
          is_alumni: false
        };
      }
    } else {
      // Fetch alumni creator
      const { data: alumniProfile } = await supabase
        .from('alumnis_base')
        .select('id, first_name, last_name, alumni_photo, student_id_number')
        .eq('id', creatorId)
        .single();
      
      if (alumniProfile) {
        creatorProfile = {
          ...alumniProfile,
          user_type: 'alumni',
          is_admin: false,
          is_alumni: true
        };
      }
    }

    // Check if creator is in members list
    const creatorInMembers = groupData.members.some(
      m => String(m.alumni_id) === creatorId && m.member_type === creatorType
    );
    
    // If creator is not in members list, add them
    if (!creatorInMembers && creatorProfile) {
      groupData.members.push({
        id: null,
        alumni_id: parseInt(creatorId),
        role: 'admin',
        member_type: creatorType,
        alumni: creatorProfile
      });
    } else if (creatorInMembers) {
      // Creator is in members list, update their profile with the correct one
      groupData.members = groupData.members.map(m => {
        if (String(m.alumni_id) === creatorId && m.member_type === creatorType) {
          return {
            ...m,
            alumni: creatorProfile
          };
        }
        return m;
      });
    }

    return groupData;
  } catch (error) {
    console.error('Error in getGroupChat:', error);
    throw error;
  }
};

/**
 * Get group messages
 * 🔥 FIXED: Respects sender_type to pull the correct message avatars!
 */
export const getGroupMessages = async (groupChatId, userId, limit = 50, offset = 0) => {
  try {
    const { data: messagesData, error } = await supabase
      .from('group_messages')
      .select('*, sender_type')
      .eq('group_chat_id', groupChatId)
      .not('deleted_by', 'cs', `{${userId}}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!messagesData || messagesData.length === 0) return [];

    const alumniSenderIds = new Set();
    const adminSenderIds = new Set();
    
    messagesData.forEach(msg => { 
      if (msg.sender_id) {
         if (msg.sender_type === 'admin') adminSenderIds.add(msg.sender_id);
         else alumniSenderIds.add(msg.sender_id);
      }
    });

    const queries = [];
    if (alumniSenderIds.size > 0) queries.push(supabase.from('alumnis_base').select('id, first_name, last_name, alumni_photo').in('id', Array.from(alumniSenderIds)));
    else queries.push(Promise.resolve({ data: [] }));
    
    if (adminSenderIds.size > 0) queries.push(supabase.from('admins').select('id, admin_first_name, admin_last_name, photo').in('id', Array.from(adminSenderIds)));
    else queries.push(Promise.resolve({ data: [] }));

    const [{ data: alumniSenders }, { data: adminSenders }] = await Promise.all(queries);

    const senderMap = new Map();
    (alumniSenders || []).forEach(sender => senderMap.set(`alumni_${sender.id}`, { ...sender, user_type: 'alumni' }));
    (adminSenders || []).forEach(sender => senderMap.set(`admin_${sender.id}`, {
      id: sender.id,
      first_name: sender.admin_first_name,
      last_name: sender.admin_last_name,
      alumni_photo: sender.photo,
      user_type: 'admin'
    }));

    console.log("[getGroupMessages]", {
      alumniSenderIds: Array.from(alumniSenderIds),
      adminSenderIds: Array.from(adminSenderIds),
      senderMapKeys: Array.from(senderMap.keys()),
      messagesSample: messagesData.slice(0, 3).map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_type: m.sender_type,
      })),
    });

    const messagesWithAttachments = await Promise.all(
      messagesData.map(async (msg) => {
        const decryptedMsg = toDecryptedMessage(msg);
        const attachments = await getGroupMessageAttachments(msg.id).catch(() => []);
        const senderKey = `${msg.sender_type === 'admin' ? 'admin' : 'alumni'}_${msg.sender_id}`;
        return {
          ...decryptedMsg,
          sender: senderMap.get(senderKey) || null,
          attachments: attachments.length > 0 ? attachments : undefined,
        };
      })
    );

    return messagesWithAttachments.reverse();
  } catch (error) { return []; }
};

export const sendGroupMessage = async (groupChatId, senderId, content, attachments = []) => {
  try {
    const encryptedContent = normalizeOutgoingContent(content);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('group_messages')
      .insert([{ group_chat_id: groupChatId, sender_id: senderId, content: encryptedContent, reactions: {}, sender_type: 'alumni', created_at: now, updated_at: now, }])
      .select()
      .single();

    if (error) throw error;

    if (attachments.length > 0) {
      await Promise.all(
        attachments.map((att) => uploadGroupMessageAttachment(data.id, att, groupChatId, senderId))
      );
    }

    try {
      const handles = extractMentionHandles(content);
      if (handles.length > 0) {
        const resolved = await resolveHandlesToAlumni(handles);
        const notifyIds = [];
        Object.entries(resolved).forEach(([handle, alumni]) => {
          if (alumni && alumni.id && alumni.id !== senderId) notifyIds.push(alumni.id);
        });

        if (notifyIds.length > 0) {
          const { data: alumniRows } = await supabase.from('alumnis_base').select('push_token').in('id', notifyIds).not('push_token', 'is', null).eq('is_online', true);
          if (Array.isArray(alumniRows) && alumniRows.length > 0) {
            const tokens = alumniRows.map(r => r.push_token).filter(Boolean);
            if (tokens.length > 0) {
              await sendPushNotificationWithRetry(tokens, 'Mentioned in group chat', 'You were mentioned in a group message.', { type: 'group_mention', groupChatId, messageId: data.id });
            }
          }
        }
      }
    } catch (mentionErr) {}

    try {
      const { data: membersData } = await supabase.from('group_chat_members').select('alumni_id, muted').eq('group_chat_id', groupChatId);
      if (Array.isArray(membersData) && membersData.length > 0) {
        const memberIds = membersData.filter((m) => !m.muted && m.alumni_id && m.alumni_id !== senderId).map((m) => m.alumni_id);
        if (memberIds.length > 0) {
          const { data: alumniRows } = await supabase.from('alumnis_base').select('push_token').in('id', memberIds).not('push_token', 'is', null).eq('is_online', true);
          if (Array.isArray(alumniRows) && alumniRows.length > 0) {
            const tokens = alumniRows.map((row) => row.push_token).filter(Boolean);
            if (tokens.length > 0) {
              await sendPushNotificationWithRetry(tokens, 'New Group Message', 'You have a new group message.', { type: 'group_message', groupChatId, messageId: data.id });
            }
          }
        }
      }
    } catch (notifErr) {}

    const { data: senderData } = await supabase.from('alumnis_base').select('id, first_name, last_name, alumni_photo').eq('id', senderId).maybeSingle();
    return toDecryptedMessage({ ...data, sender: senderData ? { ...senderData, user_type: 'alumni' } : null });
  } catch (error) { throw error; }
};

export const updateGroupMessageReactions = async (groupMessageId, reactions) => {
  try {
    const { data, error } = await supabase.from('group_messages').update({ reactions }).eq('id', groupMessageId).select().single();
    if (error) throw error;
    return data;
  } catch (error) { throw error; }
};

export const deleteGroupMessage = async (groupMessageId, userId) => {
  try {
    const { data: msg } = await supabase.from('group_messages').select('deleted_by').eq('id', groupMessageId).single();
    const currentDeleted = msg?.deleted_by || [];
    if (!currentDeleted.includes(userId)) {
      const { error } = await supabase.from('group_messages').update({ deleted_by: [...currentDeleted, userId] }).eq('id', groupMessageId);
      if (error) throw error;
    }
  } catch (error) { throw error; }
};

export const addGroupMember = async (groupChatId, alumniId) => {
  try {
    const { data, error } = await supabase.from('group_chat_members').insert([{ group_chat_id: groupChatId, alumni_id: alumniId, role: 'alumni', member_type: 'alumni' }]).select().single();
    if (error) throw error;
    return data;
  } catch (error) { throw error; }
};

export const removeGroupMember = async (groupChatId, alumniId) => {
  try {
    const { error } = await supabase.from('group_chat_members').delete().eq('group_chat_id', groupChatId).eq('alumni_id', alumniId);
    if (error) throw error;
  } catch (error) { throw error; }
};

/**
 * Get user's group chats
 * 🔥 FIXED: Uses `student_id_number` to distinguish between Admins and Alumnis
 */
export const getUserGroupChats = async (alumniId) => {
  try {
    const { data: groupLinks, error } = await supabase
      .from('group_chat_members')
      .select('group_chat_id, last_read_message_id, role, ignored')
      .eq('alumni_id', alumniId)
      .eq('ignored', false);

    if (error) throw error;

    const groupIds = groupLinks?.map((link) => link.group_chat_id).filter(Boolean) || [];
    if (groupIds.length === 0) return [];

    const { data: groups } = await supabase
      .from('group_chats')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false });

    const membersByGroupId = new Map();
    const { data: allMemberLinks } = await supabase
      .from('group_chat_members')
      .select('group_chat_id, alumni_id, last_read_message_id, role, member_type')
      .in('group_chat_id', groupIds);

    if (allMemberLinks && allMemberLinks.length > 0) {
      const allUserIds = [...new Set(allMemberLinks.map(m => m.alumni_id).filter(Boolean))];
      
      // Fetch alumni (they have student_id_number)
      const { data: alumniProfiles } = await supabase
        .from('alumnis_base')
        .select('id, first_name, last_name, email, alumni_photo, student_id_number')
        .in('id', allUserIds);
      
      // Fetch admins (they don't have student_id_number)
      const { data: adminProfiles } = await supabase
        .from('admins')
        .select('id, admin_first_name, admin_last_name, admin_email, photo')
        .in('id', allUserIds);

      // Create maps
      const alumniMap = new Map();
      (alumniProfiles || []).forEach(p => {
        alumniMap.set(String(p.id), {
          ...p,
          user_type: 'alumni',
          is_alumni: true,
          is_admin: false
        });
      });

      const adminMap = new Map();
      (adminProfiles || []).forEach(p => {
        adminMap.set(String(p.id), {
          id: p.id,
          first_name: p.admin_first_name,
          last_name: p.admin_last_name,
          email: p.admin_email,
          alumni_photo: p.photo,
          user_type: 'admin',
          student_id_number: null,
          is_alumni: false,
          is_admin: true
        });
      });

      // Build unified profiles (alumni have priority if ID exists in both tables)
      const unifiedProfiles = [];
      
      // Alumni first (they have student_id_number)
      (alumniProfiles || []).forEach(p => {
        unifiedProfiles.push({
          ...p,
          user_type: 'alumni',
          is_alumni: true,
          is_admin: false
        });
      });

      // Admins that don't exist in alumni table
      (adminProfiles || []).forEach(p => {
        const key = String(p.id);
        if (!alumniMap.has(key)) {
          unifiedProfiles.push({
            id: p.id,
            first_name: p.admin_first_name,
            last_name: p.admin_last_name,
            email: p.admin_email,
            alumni_photo: p.photo,
            user_type: 'admin',
            student_id_number: null,
            is_alumni: false,
            is_admin: true
          });
        }
      });

      allMemberLinks.forEach(member => {
        if (!membersByGroupId.has(member.group_chat_id)) {
          membersByGroupId.set(member.group_chat_id, []);
        }
        
        const userId = String(member.alumni_id);
        let profile = unifiedProfiles.find(p => String(p.id) === userId);
        
        // Fallback: use member_type if profile not found
        if (!profile) {
          const isAdmin = member.member_type === 'admin';
          if (isAdmin) {
            profile = adminMap.get(userId);
          } else {
            profile = alumniMap.get(userId);
          }
        }

        membersByGroupId.get(member.group_chat_id).push({
          ...member,
          alumni: profile || null
        });
      });
    }

    // ... rest of the function remains the same ...
    const { data: messagesData } = await supabase
      .from('group_messages')
      .select('id, group_chat_id, sender_id, created_at, content')
      .in('group_chat_id', groupIds)
      .order('created_at', { ascending: true });

    const messagesByGroupId = new Map();
    (messagesData || []).forEach((message) => {
      const groupId = message?.group_chat_id;
      if (!groupId) return;
      if (!messagesByGroupId.has(groupId)) messagesByGroupId.set(groupId, []);
      messagesByGroupId.get(groupId).push(message);
    });

    return (groups || []).map((groupChat) => {
      const members = membersByGroupId.get(groupChat?.id) || [];
      const currentMember = members.find(
        (member) => String(member?.alumni_id) === String(alumniId)
      ) ?? null;
      
      const lastReadMessageId = Number(currentMember?.last_read_message_id ?? 0);
      const groupMessages = messagesByGroupId.get(groupChat?.id) ?? [];

      const unreadCount = groupMessages.filter((message) => {
        return Number(message?.sender_id) !== Number(alumniId) &&
          Number(message?.id) > lastReadMessageId;
      }).length;

      const latestGroupMessage = groupMessages.length > 0 ? groupMessages[groupMessages.length - 1] : null;
     
      return {
        ...groupChat,
        members, 
        latest_message: latestGroupMessage ? {
          id: latestGroupMessage.id,
          content: decryptMessage(latestGroupMessage.content || ''),
          created_at: latestGroupMessage.created_at,
          sender_id: latestGroupMessage.sender_id,
        } : null,
        unread_count: unreadCount,
      };
    });
  } catch (error) {
    console.error('Error in getUserGroupChats:', error);
    throw error;
  }
};

export const getOrCreateDMSettings = async (userId, contactId, contactType = 'alumni') => {
  try {
    const { data: existing, error: fetchError } = await supabase.from('dm_settings').select('*').eq('user_id', userId).eq('contact_id', contactId).maybeSingle();
    if (fetchError) throw fetchError;
    if (existing) return existing;

    const { data: created, error: insertError } = await supabase.from('dm_settings').insert({
      user_id: userId, contact_id: contactId, contact_type: contactType, is_archived: false, is_muted: false, is_hidden: false,
    }).select().single();

    if (insertError) throw insertError;
    return created;
  } catch (error) { throw error; }
};

export const updateDMSettings = async (userId, contactId, updates, contactType = 'alumni') => {
  try {
    await getOrCreateDMSettings(userId, contactId, contactType);
    const { data, error } = await supabase.from('dm_settings').update(updates).eq('user_id', userId).eq('contact_id', contactId).select().single();
    if (error) throw error;
    return data;
  } catch (error) { throw error; }
};

export const archiveConversation = async (userId, contactId, contactType = 'alumni') => updateDMSettings(userId, contactId, { is_archived: true, is_hidden: false }, contactType);
export const unarchiveConversation = async (userId, contactId, contactType = 'alumni') => updateDMSettings(userId, contactId, { is_archived: false, is_hidden: false }, contactType);
export const deleteConversation = async (userId, contactId, contactType = 'alumni') => updateDMSettings(userId, contactId, { is_hidden: true, is_archived: false }, contactType);
export const restoreConversation = async (userId, contactId, contactType = 'alumni') => updateDMSettings(userId, contactId, { is_hidden: false, is_archived: false }, contactType);

export const getArchivedConversations = async (userId) => {
  try {
    const { data, error } = await supabase.from('dm_settings').select(`id, contact_id, contact_type, is_archived, is_hidden, created_at`).eq('user_id', userId).eq('is_archived', true).eq('is_hidden', false).order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const contactIds = data.map(d => d.contact_id);

    const [{ data: alumniData }, { data: adminData }] = await Promise.all([
      supabase.from('alumnis_base').select('id, first_name, last_name, alumni_photo, email').in('id', contactIds),
      supabase.from('admins').select('id, admin_first_name, admin_last_name, photo, admin_email').in('id', contactIds)
    ]);

    const profileMap = new Map();
    (alumniData || []).forEach(a => profileMap.set(String(a.id), { first_name: a.first_name, last_name: a.last_name, photo: a.alumni_photo, email: a.email, inferred_type: 'alumni' }));
    (adminData || []).forEach(a => profileMap.set(String(a.id), { first_name: a.admin_first_name, last_name: a.admin_last_name, photo: a.photo, email: a.admin_email, inferred_type: 'admin' }));

    return data.map(dm => {
      const profile = profileMap.get(String(dm.contact_id)) || {};
      return {
        id: `dm_${dm.id}`, type: 'dm', contact_id: dm.contact_id, contact_type: profile.inferred_type || dm.contact_type || 'alumni', archivedAt: dm.created_at,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Alumni', photo: profile.photo || null, email: profile.email || '', dmSettingId: dm.id, first_name: profile.first_name, last_name: profile.last_name
      };
    });
  } catch (error) { return []; }
};

export const getDeletedConversations = async (userId) => {
  try {
    const { data, error } = await supabase.from('dm_settings').select(`id, contact_id, contact_type, is_hidden, created_at`).eq('user_id', userId).eq('is_hidden', true).order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const contactIds = data.map(d => d.contact_id);

    const [{ data: alumniData }, { data: adminData }] = await Promise.all([
      supabase.from('alumnis_base').select('id, first_name, last_name, alumni_photo, email').in('id', contactIds),
      supabase.from('admins').select('id, admin_first_name, admin_last_name, photo, admin_email').in('id', contactIds)
    ]);

    const profileMap = new Map();
    (alumniData || []).forEach(a => profileMap.set(String(a.id), { first_name: a.first_name, last_name: a.last_name, photo: a.alumni_photo, email: a.email, inferred_type: 'alumni' }));
    (adminData || []).forEach(a => profileMap.set(String(a.id), { first_name: a.admin_first_name, last_name: a.admin_last_name, photo: a.photo, email: a.admin_email, inferred_type: 'admin' }));

    return data.map(dm => {
      const profile = profileMap.get(String(dm.contact_id)) || {};
      return {
        id: `deleted_${dm.id}`, type: 'dm', contact_id: dm.contact_id, contact_type: profile.inferred_type || dm.contact_type || 'alumni', deletedAt: dm.created_at,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Alumni', photo: profile.photo || null, email: profile.email || '', dmSettingId: dm.id, first_name: profile.first_name, last_name: profile.last_name
      };
    });
  } catch (error) { return []; }
};

export const getArchivedGroupChats = async (alumniId) => {
  try {
    const { data, error } = await supabase.from('group_chat_members').select(`id, group_chat_id, alumni_id, archived, updated_at, group_chats:group_chat_id (id, name, avatar_url, updated_at)`).eq('alumni_id', alumniId).eq('archived', true).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(gm => {
      const group = gm.group_chats || {};
      return { id: `group_${gm.id}`, type: 'group', group_chat_id: gm.group_chat_id, archivedAt: gm.updated_at || group.updated_at, name: group.name || 'Group Chat', photo: group.avatar_url || null, memberId: gm.id, };
    });
  } catch (error) { return []; }
};

// This is messageQueries.js file