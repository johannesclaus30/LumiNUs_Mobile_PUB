import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import styles from "../styles/MentorshipTrackerScreen.styles";
import { ThemedAlert } from "../components/ThemedAlert";

const MentorshipTrackerScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("submitted"); 
  const [applications, setApplications] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const fetchMentorships = useCallback(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error("Not authenticated");

      const { data: alumniRow } = await supabase
        .from("alumnis_base")
        .select("id")
        .eq("email", authData.user.email)
        .single();

      if (!alumniRow?.id) return;

      const { data, error } = await supabase
        .from("mentorships")
        .select("*")
        .eq("alumni_id", alumniRow.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const submitted = data.filter((item) => !item.is_draft);
      const savedDrafts = data.filter((item) => item.is_draft);

      setApplications(submitted);
      setDrafts(savedDrafts);
    } catch (error) {
      console.error("Error fetching mentorships:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMentorships();
  }, [fetchMentorships]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMentorships();
  };

  const getStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return { color: "#059669", bg: "#D1FAE5", icon: "checkmark-circle", label: "Active" };
      case "completed":
        return { color: "#3B82F6", bg: "#DBEAFE", icon: "ribbon", label: "Completed" };
      case "declined":
        return { color: "#DC2626", bg: "#FEE2E2", icon: "close-circle", label: "Declined" };
      case "pending":
      default:
        return { color: "#D97706", bg: "#FEF3C7", icon: "time", label: "Pending Review" };
    }
  };

  const handleOpenAttachment = async (url) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        ThemedAlert.alert("Error", "Your device does not support opening this file type.");
      }
    } catch (error) {
      ThemedAlert.alert("Error", "Could not open the attachment.");
    }
  };

  const renderCard = ({ item }) => {
    const isDraft = item.is_draft;
    const statusInfo = getStatusDisplay(item.status);

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => {
          if (isDraft) {
            navigation.navigate("MentorshipScreen", { draftData: item });
          } else {
            setSelectedApplication(item);
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {item.event_title || "Untitled Proposal"}
            </Text>
            <Text style={styles.eventType}>
              {item.event_type ? item.event_type.toUpperCase() : "EVENT"}
            </Text>
          </View>
          
          {!isDraft ? (
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: "#E2E8F0" }]}>
              <Ionicons name="document-text" size={12} color="#475569" style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: "#475569" }]}>Draft</Text>
            </View>
          )}
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666680" />
            <Text style={styles.detailText}>{item.proposed_date || "Date TBD"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#666680" />
            <Text style={styles.detailText}>{item.event_format || "Format TBD"}</Text>
          </View>
        </View>

        {!isDraft && (
          <View style={styles.draftActionRow}>
            <Text style={styles.resumeText}>Tap to view application details</Text>
            <Ionicons name="chevron-forward" size={16} color="#32418C" />
          </View>
        )}

        {isDraft && (
          <View style={styles.draftActionRow}>
            <Text style={styles.resumeText}>Tap to resume editing</Text>
            <Ionicons name="chevron-forward" size={16} color="#32418C" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === "submitted" ? "folder-open-outline" : "document-outline"} 
        size={60} 
        color="#CBD5E1" 
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === "submitted" ? "No applications yet" : "No saved drafts"}
      </Text>
      <Text style={styles.emptyStateText}>
        {activeTab === "submitted" 
          ? "Proposals you submit will appear here so you can track their status." 
          : "Proposals you save for later will be stored here safely."}
      </Text>
      {activeTab === "submitted" && (
        <TouchableOpacity 
          style={styles.proposeButton}
          onPress={() => navigation.navigate("MentorshipScreen")}
        >
          <Text style={styles.proposeButtonText}>Propose an Event</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Proposals</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "submitted" && styles.activeTab]} 
          onPress={() => setActiveTab("submitted")}
        >
          <Text style={[styles.tabText, activeTab === "submitted" && styles.activeTabText]}>
            Submitted ({applications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "drafts" && styles.activeTab]} 
          onPress={() => setActiveTab("drafts")}
        >
          <Text style={[styles.tabText, activeTab === "drafts" && styles.activeTabText]}>
            Drafts ({drafts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#32418C" />
        </View>
      ) : (
        <FlatList
          data={activeTab === "submitted" ? applications : drafts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#32418C" />
          }
        />
      )}

      <Modal
        visible={Boolean(selectedApplication)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedApplication(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedApplication(null)}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable style={styles.detailsModal} onPress={() => {}}>
              <View style={styles.modalHandle} />
              {selectedApplication && (() => {
                const statusInfo = getStatusDisplay(selectedApplication.status);
                return (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                    <View style={styles.modalHero}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalEyebrow}>SUBMITTED PROPOSAL</Text>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedApplication(null)}>
                          <Ionicons name="close" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                      <View style={[styles.detailStatus, { backgroundColor: statusInfo.bg }]}>
                        <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                        <Text style={[styles.detailStatusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                      </View>
                      <Text style={styles.detailTitle}>{selectedApplication.event_title || "Untitled Proposal"}</Text>
                      <Text style={styles.detailSubtitle}>
                        {selectedApplication.event_type || "Event"}  •  {selectedApplication.event_format || "Format TBD"}
                      </Text>
                    </View>

                    <Text style={styles.sectionKicker}>EVENT SNAPSHOT</Text>
                    <View style={styles.detailsSection}>
                      <View style={styles.detailsGrid}>
                        <DetailRow icon="people-outline" label="Audience" value={selectedApplication.target_audience} />
                        <DetailRow icon="stats-chart-outline" label="Capacity" value={selectedApplication.expected_capacity} />
                        <DetailRow icon="calendar-outline" label="Date" value={selectedApplication.proposed_date} />
                        <DetailRow icon="time-outline" label="Time" value={selectedApplication.start_time && selectedApplication.end_time ? `${selectedApplication.start_time} - ${selectedApplication.end_time}` : selectedApplication.start_time} />
                        <DetailRow icon="mic-outline" label="Co-speakers" value={selectedApplication.co_speakers} />
                      </View>
                    </View>

                    <View style={styles.narrativeSection}>
                      <Text style={styles.sectionKicker}>DESCRIPTION & OBJECTIVES</Text>
                      <Text style={styles.narrativeText}>
                        {selectedApplication.description || "No description provided."}
                      </Text>
                    </View>

                    {selectedApplication.attached_file_url && (
                      <TouchableOpacity 
                        style={styles.attachmentRow}
                        activeOpacity={0.7}
                        onPress={() => handleOpenAttachment(selectedApplication.attached_file_url)}
                      >
                        <View style={styles.attachmentIcon}>
                          <Ionicons name="document-attach-outline" size={19} color="#32418C" />
                        </View>
                        <View style={styles.attachmentTextWrap}>
                          <Text style={styles.attachmentLabel}>Attachment</Text>
                          <Text style={[styles.attachmentValue, { color: "#32418C", textDecorationLine: "underline" }]}>Tap to open or download file</Text>
                        </View>
                        <Ionicons name="download-outline" size={20} color="#32418C" />
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                );
              })()}
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.applicationDetailRow}>
    <View style={styles.detailRowIcon}>
      <Ionicons name={icon} size={17} color="#32418C" />
    </View>
    <Text style={styles.applicationDetailLabel}>{label}</Text>
    <Text style={styles.applicationDetailValue}>
      {value == null || value === "" ? "Not provided" : String(value)}
    </Text>
  </View>
);

export default MentorshipTrackerScreen;