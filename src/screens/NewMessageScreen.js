import React, { useState, useEffect } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  StatusBar,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { createGroupChat } from "../services/messageQueries";
import { getAvatarUri } from "../utils/imageUtils"; 
import styles from "../styles/NewMessageScreen.styles";
import { useRoute } from "@react-navigation/native";

/**
 * Robust inline avatar component.
 * Attempts to load the user's actual profile photo. If it fails, or if 
 * they don't have one, it cleanly falls back to their initials.
 */
const UserAvatar = ({ name, photo, size = 50, style }) => {
  const [hasError, setHasError] = useState(false);
  const avatarUrl = getAvatarUri(name, photo);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  if (!avatarUrl || hasError) {
    return (
      <View 
        style={[
          styles.avatarFallback,
          style, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2, 
          }
        ]}
      >
        <Text style={[styles.avatarFallbackText, { fontSize: size * 0.4 }]}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <Image 
      source={{ uri: avatarUrl }} 
      style={[
        styles.avatarImage,
        style, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2, 
        }
      ]} 
      onError={() => setHasError(true)}
    />
  );
};

export default function NewMessageScreen({ navigation }) {
  const route = useRoute();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserType, setCurrentUserType] = useState('alumni');
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  // ✅ FIX: Store members as objects with id AND user_type
  const [selectedMembers, setSelectedMembers] = useState([]); // [{ id, user_type, displayName }]
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  useEffect(() => {
    const prefillMembers = route?.params?.prefillMembers;
    const prefillName = route?.params?.prefillName;
    
    if (prefillMembers && prefillMembers.length > 0) {
      // ✅ prefilled members should be objects with { id, user_type }
      setSelectedMembers(prefillMembers);
      setGroupName(prefillName || "");
      setIsGroupModalVisible(true);
    }
  }, [route?.params]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      const currentUser = await getCurrentUser().catch(() => null);
      const currentUserId = currentUser?.id;
      const currentUserType = currentUser?.user_type || 'alumni';
      setCurrentUserId(currentUserId ?? null);
      setCurrentUserType(currentUserType);

      // Fetch all alumni
      const { data: alumniData, error: alumniError } = await supabase
        .from("alumnis_base")
        .select("id, first_name, last_name, alumni_photo")
        .order("first_name", { ascending: true });

      if (alumniError) {
        console.error("Error fetching alumni:", alumniError);
      }

      // Fetch all admins
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("id, admin_first_name, admin_last_name, photo, admin_role")
        .order("admin_first_name", { ascending: true });

      if (adminError) {
        console.error("Error fetching admins:", adminError);
      }

      // Combine and normalize users
      const allUsers = [];

      // Add alumni (excluding current user if they're alumni)
      (alumniData || []).forEach(alumni => {
        if (!(currentUserType === 'alumni' && alumni.id === currentUserId)) {
          allUsers.push({
            id: alumni.id,
            user_type: 'alumni',
            first_name: alumni.first_name,
            last_name: alumni.last_name,
            alumni_photo: alumni.alumni_photo,
            displayName: `${alumni.first_name || ""} ${alumni.last_name || ""}`.trim() || "Alumni",
            role: null,
            // For group chat member selection
            compositeId: `alumni_${alumni.id}`
          });
        }
      });

      // Add admins (excluding current user if they're admin)
      (adminData || []).forEach(admin => {
        if (!(currentUserType === 'admin' && admin.id === currentUserId)) {
          allUsers.push({
            id: admin.id,
            user_type: 'admin',
            first_name: admin.admin_first_name,
            last_name: admin.admin_last_name,
            alumni_photo: admin.photo,
            displayName: `${admin.admin_first_name || ""} ${admin.admin_last_name || ""}`.trim() || "Admin",
            role: admin.admin_role,
            compositeId: `admin_${admin.id}`
          });
        }
      });

      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedUsers = users.filter(user => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // ✅ Get selected users with full details for display
  const selectedUsers = users.filter((user) => 
    selectedMembers.some(m => m.id === user.id && m.user_type === user.user_type)
  );

  // ✅ Toggle function - now takes the full user object
  const toggleSelectedMember = (user) => {
    setSelectedMembers((current) => {
      const exists = current.find(m => m.id === user.id && m.user_type === user.user_type);
      if (exists) {
        return current.filter(m => !(m.id === user.id && m.user_type === user.user_type));
      } else {
        return [...current, { 
          id: user.id, 
          user_type: user.user_type, 
          displayName: user.displayName,
          first_name: user.first_name,
          last_name: user.last_name,
          alumni_photo: user.alumni_photo
        }];
      }
    });
  };

  const handleCreateGroupChat = async () => {
    if (!currentUserId) {
      Alert.alert("Error", "Your account could not be identified.");
      return;
    }

    if (selectedMembers.length < 1) {
      Alert.alert("Select members", "Choose at least one connection to create a group chat.");
      return;
    }

    try {
      setIsCreatingGroup(true);
      const finalGroupName = groupName.trim() || "Group Chat";
      
      // ✅ Pass members with user types to the backend
      const createdGroup = await createGroupChat(
        currentUserId, 
        finalGroupName, 
        selectedMembers, // Now passing objects with id AND user_type
        currentUserType // 'alumni' or 'admin'
      );

      setIsGroupModalVisible(false);
      navigation.navigate("ConvoScreen", {
        groupId: createdGroup.id,
        groupName: finalGroupName,
        groupMembers: selectedUsers,
      });
    } catch (error) {
      Alert.alert("Unable to create group", error?.message || "Please try again.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const openChat = (selectedUser) => {
    const fullName = `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim();
    const avatarUrl = getAvatarUri(fullName, selectedUser.alumni_photo);
    
    navigation.navigate("ConvoScreen", {
      contactId: selectedUser.id,
      contactName: fullName,
      contactAvatar: avatarUrl,
      receiverType: selectedUser.user_type // Pass the user type for proper messaging
    });
  };

  const renderItem = ({ item }) => {
    const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim();
    const isAdmin = item.user_type === 'admin';

    return (
      <TouchableOpacity
        style={styles.listItem}
        activeOpacity={0.7}
        onPress={() => openChat(item)}
      >
        <UserAvatar name={fullName} photo={item.alumni_photo} size={50} style={styles.avatar} />
        <View style={styles.userInfoContainer}>
          <Text style={styles.nameText}>{fullName}</Text>
          {isAdmin && item.role && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>{item.role}</Text>
            </View>
          )}
        </View>
        {isAdmin && (
          <View style={styles.adminIconContainer}>
            <Ionicons name="shield-checkmark" size={16} color="#31429B" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-undo-outline" size={26} color="#333333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Message</Text>
        </View>

        <View style={styles.searchRow}>
          <Text style={styles.toLabel}>To:</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Type a name or group"
            placeholderTextColor="#888888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={false}
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.createGroupButton} activeOpacity={0.85} onPress={() => setIsGroupModalVisible(true)}>
          <Ionicons name="people-outline" size={20} color="#FFFFFF" />
          <Text style={styles.createGroupButtonText}>Create Group Chat</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#31429B" />
          </View>
        ) : (
          <FlatList
            data={displayedUsers}
            keyExtractor={(item) => item.compositeId || item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>Suggested</Text>
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No users found.</Text>
            }
          />
        )}

        <View style={styles.footer}>
          <Image
            source={require("../../assets/images/luminus_text_logo.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={isGroupModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGroupModalVisible(false)}
      >
        <Pressable style={styles.groupModalBackdrop} onPress={() => setIsGroupModalVisible(false)} />
        <View style={styles.groupModalContainer}>
          <View style={styles.groupModalCard}>
            <View style={styles.groupModalHeader}>
              <Text style={styles.groupModalTitle}>Create Group Chat</Text>
              <Pressable onPress={() => setIsGroupModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#1C1C1E" />
              </Pressable>
            </View>

            <Text style={styles.groupModalLabel}>Group Name</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Optional group name"
              placeholderTextColor="#9CA3AF"
              style={styles.groupNameInput}
            />

            <Text style={styles.groupModalLabel}>Select members</Text>
            <Text style={styles.groupModalHint}>Tap connections to include them in the group.</Text>

            <FlatList
              data={displayedUsers}
              keyExtractor={(item) => item.compositeId || item.id.toString()}
              style={styles.groupMemberList}
              contentContainerStyle={styles.groupMemberListContent}
              renderItem={({ item }) => {
                const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim();
                const isSelected = selectedMembers.some(m => m.id === item.id && m.user_type === item.user_type);
                const isAdmin = item.user_type === 'admin';

                return (
                  <Pressable
                    style={[styles.groupMemberRow, isSelected && styles.groupMemberRowSelected]}
                    onPress={() => toggleSelectedMember(item)}
                  >
                    <UserAvatar name={fullName} photo={item.alumni_photo} size={38} style={styles.groupMemberAvatar} />
                    <View style={styles.groupMemberInfo}>
                      <Text style={styles.groupMemberName} numberOfLines={1}>{fullName}</Text>
                      {isAdmin && item.role && (
                        <Text style={styles.groupMemberRole}>{item.role}</Text>
                      )}
                    </View>
                    <View style={[styles.groupMemberCheck, isSelected && styles.groupMemberCheckSelected]}>
                      {isSelected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                    </View>
                  </Pressable>
                );
              }}
            />

            <TouchableOpacity
              style={[styles.groupCreateButton, isCreatingGroup && styles.groupCreateButtonDisabled]}
              onPress={handleCreateGroupChat}
              disabled={isCreatingGroup}
              activeOpacity={0.85}
            >
              {isCreatingGroup ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.groupCreateButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}