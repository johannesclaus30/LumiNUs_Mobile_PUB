import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentUser } from "../services/supabaseAuth";
import { getUserDrafts, deletePost } from "../services/postQueries";
import { ThemedAlert } from "../components/ThemedAlert";

const DraftsScreen = () => {
  const navigation = useNavigation();
  const [drafts, setDrafts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const supaUser = await getCurrentUser();
      if (supaUser?.id) {
        const userDrafts = await getUserDrafts(supaUser.id);
        setDrafts(userDrafts);
      }
    } catch (error) {
      console.error("Failed to load drafts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDrafts();
    }, [fetchDrafts]),
  );

  const handleDeleteDraft = (draftId) => {
    ThemedAlert.alert(
      "Discard Draft",
      "Are you sure you want to delete this draft?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            const success = await deletePost(draftId).catch(() => false);
            if (success) {
              setDrafts((prev) => prev.filter((d) => d.id !== draftId));
            } else {
              ThemedAlert.alert("Error", "Failed to delete the draft.");
            }
          },
        },
      ],
    );
  };

  const openDraft = (draft) => {
    // Navigate back to the composer, passing the draft data to populate the fields
    navigation.navigate("CreatePostScreen", { post: draft });
  };

  const renderDraftItem = ({ item }) => {
    const hasImage = item.images && item.images.length > 0;
    const previewImage = hasImage
      ? item.images[0].image_url || item.images[0].image_path
      : null;
    const dateStr = new Date(item.created_at).toLocaleDateString();

    return (
      <TouchableOpacity
        style={styles.draftCard}
        activeOpacity={0.7}
        onPress={() => openDraft(item)}
      >
        <View style={styles.draftIconWrap}>
          <Ionicons name="document-text-outline" size={24} color="#32418C" />
        </View>
        <View style={styles.draftContent}>
          <Text style={styles.draftDate}>Saved on {dateStr}</Text>
          <Text style={styles.draftText} numberOfLines={2}>
            {item.caption ? item.caption : "(No text content)"}
          </Text>
          {hasImage && (
            <View style={styles.imageBadge}>
              <Ionicons name="image-outline" size={14} color="#31429B" />
              <Text style={styles.imageBadgeText}>
                {item.images.length} Image(s)
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteDraft(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerEyebrow}>COMMUNITY</Text>
            <Text style={styles.title}>Post drafts</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{drafts.length}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#31429B" />
          </View>
        ) : (
          <FlatList
            data={drafts}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderDraftItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color="#5A68A8"
                />
                <Text style={styles.emptyTitle}>No saved drafts yet</Text>
                <Text style={styles.emptyText}>
                  Drafts you save while creating a post will appear here.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#32418C" },
  container: { flex: 1, backgroundColor: "#F4F5FA" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: "#32418C",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  headerTitleWrap: { flex: 1, paddingHorizontal: 14 },
  headerEyebrow: {
    color: "#FBD117",
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 3,
  },
  title: {
    fontSize: 24,
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
  },
  countPill: {
    minWidth: 40,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251, 209, 23, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(251, 209, 23, 0.4)",
  },
  countText: {
    color: "#FBD117",
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
  },
  listContent: { padding: 20, paddingTop: 24, flexGrow: 1 },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    marginTop: 64,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    color: "#242F6B",
    fontFamily: "Poppins_700Bold",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: "#6B7280",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
  draftCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAECF3",
  },
  draftIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFF3C4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  draftContent: { flex: 1, paddingRight: 8 },
  draftDate: {
    fontSize: 12,
    color: "#7A849B",
    marginBottom: 6,
    fontFamily: "Poppins_600SemiBold",
  },
  draftText: {
    fontSize: 15,
    color: "#111827",
    lineHeight: 21,
    fontFamily: "Poppins_500Medium",
  },
  imageBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#EEF0FF",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageBadgeText: {
    fontSize: 12,
    color: "#32418C",
    marginLeft: 4,
    fontFamily: "Poppins_600SemiBold",
  },
  deleteButton: {
    padding: 9,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
  },
});

export default DraftsScreen;
