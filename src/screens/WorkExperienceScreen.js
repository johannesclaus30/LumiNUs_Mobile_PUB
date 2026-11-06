import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { INDUSTRIES, OCCUPATIONS } from '../constants/tracerReference';

let DraggableFlatList;
let ScaleDecorator;
try {
  const draggable = require('react-native-draggable-flatlist');
  DraggableFlatList = draggable.default;
  ScaleDecorator = draggable.ScaleDecorator;
} catch (e) {
  console.log('DraggableFlatList not available');
}

import styles from '../styles/WorkExperienceScreen.styles';
import supabase from '../services/supabase';
import { getCurrentUser } from '../services/supabaseAuth';
import { ThemedAlert } from '../components/ThemedAlert';
import { sortWorkExperiences } from '../utils/workExperience';

// Add this component at the top of the file
// Add this component at the top of the file
const EditDropdown = ({ label, value, options, onSelect, placeholder }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search]);

  const displayValue = value?.label || placeholder;

  return (
    <View>
      <TouchableOpacity 
        style={styles.inputField} 
        onPress={() => setModalVisible(true)}
      >
        {/* ADDED POPPINS FONT HERE */}
        <Text style={[styles.dropdownTriggerText, { color: value ? '#1E293B' : '#94A3B8' }]}>
          {displayValue}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable 
            style={[styles.modalContainer, { height: '75%' }]} 
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.dropdownSearchWrapper}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={[styles.dropdownSearchInput, { fontFamily: 'Poppins_400Regular' }]} // <-- ADDED FONT
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredOptions.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.dropdownItem, value?.code === item.code && styles.dropdownItemActive]}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                    setSearch("");
                  }}
                >
                  {/* ADDED POPPINS FONT HERE */}
                  <Text style={[styles.dropdownItemText, { fontFamily: 'Poppins_500Medium' }]}>
                    {item.label}
                  </Text>
                  {value?.code === item.code && <Ionicons name="checkmark" size={20} color="#32418C" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const WorkExperienceScreen = ({ navigation }) => {
  const [workExperiences, setWorkExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExp, setSelectedExp] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
    industry: null,    // <-- ADDED
    occupation: null   // <-- ADDED
  });

  const fetchWorkExperiences = async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const user = await getCurrentUser();
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('alumni_employments')
        .select('*')
        .eq('alumni_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const sortedData = sortWorkExperiences(data);

      const formattedData = sortedData.map(exp => {
        const start = new Date(exp.start_date);
        const startDateStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        let endDateStr = 'Present';
        if (!exp.is_current && exp.end_date) {
          const end = new Date(exp.end_date);
          endDateStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }

        // Calculate duration
        const startYear = start.getFullYear();
        const startMonth = start.getMonth();
        const endYear = exp.is_current ? new Date().getFullYear() : (exp.end_date ? new Date(exp.end_date).getFullYear() : startYear);
        const endMonth = exp.is_current ? new Date().getMonth() : (exp.end_date ? new Date(exp.end_date).getMonth() : startMonth);
        const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;

        let durationStr = '';
        if (years > 0) durationStr += `${years}y `;
        if (months > 0) durationStr += `${months}m`;
        if (!durationStr) durationStr = '1m';

        return {
          id: exp.id,
          title: exp.job_title,
          subtitle: exp.company,
          date: `${startDateStr} - ${endDateStr}`,
          location: exp.location,
          description: exp.career_description || '',
          duration: durationStr.trim(),
          isCurrent: exp.is_current,
          display_order: exp.display_order,
          raw: exp,
          industry: exp.industry,
          occupation: exp.occupation,
        };
      });

      setWorkExperiences(formattedData);
    } catch (error) {
      console.error('Error fetching work experiences:', error);
      ThemedAlert.alert('Error', 'Unable to load work experiences at this time.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWorkExperiences();
    }, [])
  );

  const onRefresh = () => fetchWorkExperiences(true);

  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      if (workExperiences.some((exp) => exp.display_order === undefined)) {
        throw new Error(
          'Work experience ordering is not enabled in the database. Apply supabase/work_experience_order.sql first.'
        );
      }

      const results = await Promise.all(
        workExperiences.map((exp, index) =>
          supabase
            .from('alumni_employments')
            .update({ display_order: index })
            .eq('id', exp.id)
        )
      );
      const failedUpdate = results.find(({ error }) => error);
      if (failedUpdate?.error) throw failedUpdate.error;
      setIsReordering(false);
      ThemedAlert.alert("Success", "Work experience order saved!");
    } catch (error) {
      console.error('Save order error:', error);
      ThemedAlert.alert('Error', 'Failed to save order.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (exp) => {
    setSelectedExp(exp);
    setEditForm({
      title: exp.raw.job_title || '',
      company: exp.raw.company || '',
      location: exp.raw.location || '',
      startDate: exp.raw.start_date ? exp.raw.start_date.split('T')[0] : '',
      endDate: exp.raw.end_date ? exp.raw.end_date.split('T')[0] : '',
      isCurrent: exp.raw.is_current || false,
      description: exp.raw.career_description || '',
      // Match the database code to the dropdown object format
      industry: INDUSTRIES.find(i => i.code === exp.raw.industry) || null,
      occupation: OCCUPATIONS.find(o => o.code === exp.raw.occupation) || null
    });
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editForm.title || !editForm.company || !editForm.startDate) {
      ThemedAlert.alert('Missing Fields', 'Please fill out the Job Title, Company, and Start Date.');
      return;
    }

    if (!editForm.industry) {
      ThemedAlert.alert('Missing Fields', 'Please select an Industry.');
      return;
    }
    if (!editForm.occupation) {
      ThemedAlert.alert('Missing Fields', 'Please select an Occupation.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('alumni_employments')
        .update({
          job_title: editForm.title,
          company: editForm.company,
          location: editForm.location,
          start_date: editForm.startDate || null,
          end_date: editForm.isCurrent ? null : (editForm.endDate || null),
          is_current: editForm.isCurrent,
          career_description: editForm.description,
          industry: editForm.industry?.code || null,    // <-- ADDED
          occupation: editForm.occupation?.code || null // <-- ADDED
        })
        .eq('id', selectedExp.id);

      if (error) throw error;

      setModalVisible(false);
      fetchWorkExperiences();
    } catch (error) {
      console.error('Update error:', error);
      ThemedAlert.alert('Error', 'Failed to update work experience.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Remove Experience",
      "Are you sure you want to delete this work experience? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsSaving(true);
            try {
              const { error } = await supabase
                .from('alumni_employments')
                .delete()
                .eq('id', selectedExp.id);

              if (error) throw error;
              setModalVisible(false);
              fetchWorkExperiences();
            } catch (err) {
              ThemedAlert.alert('Error', 'Could not delete work experience.');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const renderDraggableItem = ({ item, drag, isActive }) => (
    <ScaleDecorator>
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        activeOpacity={0.9}
        style={[
          styles.dragCard,
          isActive && styles.dragCardActive
        ]}
      >
        <View style={styles.dragHandle}>
          <Ionicons name="reorder-three" size={24} color="#32418C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dragTitle}>{item.title}</Text>
          <Text style={styles.dragSubtitle}>{item.subtitle}</Text>
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
  );

  const renderStaticItem = ({ item }) => (
    <View style={styles.dragCard}>
      <View style={styles.dragHandle}>
        <Ionicons name="reorder-three" size={24} color="#CBD5E1" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.dragTitle}>{item.title}</Text>
        <Text style={styles.dragSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const renderTimelineCard = (exp, index) => {
    const isExpanded = expandedId === exp.id;
    const isLast = index === workExperiences.length - 1;

    return (
      <View key={exp.id} style={styles.timelineItem}>
        {/* Timeline Track */}
        <View style={styles.timelineTrack}>
          <View style={[styles.timelineDot, exp.isCurrent && styles.timelineDotActive]}>
            {exp.isCurrent && <View style={styles.timelineDotInner} />}
          </View>
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        {/* Card */}
        <TouchableOpacity
          activeOpacity={0.95}
          style={styles.timelineCard}
          onPress={() => setExpandedId(isExpanded ? null : exp.id)}
        >
          {/* Header Row */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.companyLogoContainer}>
              <Text style={styles.companyLogoText}>
                {exp.subtitle?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>

            <View style={styles.cardHeaderInfo}>
              <Text style={styles.cardTitle} numberOfLines={2}>{exp.title}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>{exp.subtitle}</Text>
            </View>

            <TouchableOpacity
              style={styles.cardMenuButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => openEditModal(exp)}
            >
              <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Meta Row */}
          <View style={styles.cardMetaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={12} color="#32418C" />
              <Text style={styles.metaChipText}>{exp.date}</Text>
            </View>

            {exp.duration && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={12} color="#32418C" />
                <Text style={styles.metaChipText}>{exp.duration}</Text>
              </View>
            )}

            {exp.isCurrent && (
              <View style={styles.currentBadge}>
                <View style={styles.currentDot} />
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>

          {/* Location */}
          {exp.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#64748B" />
              <Text style={styles.locationText} numberOfLines={1}>{exp.location}</Text>
            </View>
          ) : null}

                    {/* Industry & Occupation Chips */}
          {(exp.industry || exp.occupation) && (
            <View style={[styles.cardMetaRow, { marginTop: 8 }]}>
              {exp.industry && (
                <View style={styles.metaChip}>
                  <Ionicons name="business-outline" size={12} color="#32418C" />
                  <Text style={styles.metaChipText}>
                    {INDUSTRIES.find(i => i.code === exp.industry)?.label || exp.industry}
                  </Text>
                </View>
              )}
              {exp.occupation && (
                <View style={styles.metaChip}>
                  <Ionicons name="briefcase-outline" size={12} color="#32418C" />
                  <Text style={styles.metaChipText}>
                    {OCCUPATIONS.find(o => o.code === exp.occupation)?.label || exp.occupation}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Expandable Description */}
          {isExpanded && exp.description ? (
            <View style={styles.descriptionContainer}>
              <View style={styles.descriptionDivider} />
              <Text style={styles.descriptionText}>{exp.description}</Text>
            </View>
          ) : null}

          {/* Expand Hint */}
          {exp.description ? (
            <View style={styles.expandHint}>
              <Text style={styles.expandHintText}>
                {isExpanded ? 'Show less' : 'Show more'}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#32418C"
              />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          {/* Hero Header */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.headerLabel}>YOUR PROFILE</Text>

              <View style={{ width: 40 }} />
            </View>

            <View style={styles.headerTitleRow}>
              <View>
                <Text style={styles.headerTitle}>Work Experience</Text>
                <Text style={styles.headerSubtitle}>
                  {workExperiences.length} {workExperiences.length === 1 ? 'entry' : 'entries'}
                </Text>
              </View>

              {!isReordering && workExperiences.length > 1 && DraggableFlatList && (
                <TouchableOpacity
                  style={styles.headerActionBtn}
                  onPress={() => setIsReordering(true)}
                >
                  <Ionicons name="swap-vertical" size={18} color="#FBD117" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {isReordering ? (
              <View style={styles.reorderBanner}>
                <View style={styles.reorderBannerContent}>
                  <Ionicons name="information-circle" size={18} color="#32418C" />
                  <Text style={styles.reorderBannerText}>
                    Long press and drag to reorder
                  </Text>
                </View>
                <View style={styles.reorderBannerActions}>
                  <TouchableOpacity
                    style={styles.reorderCancelBtn}
                    onPress={() => {
                      setIsReordering(false);
                      fetchWorkExperiences();
                    }}
                  >
                    <Text style={styles.reorderCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reorderSaveBtn}
                    onPress={handleSaveOrder}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#32418C" />
                    ) : (
                      <Text style={styles.reorderSaveText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#32418C" />
                <Text style={styles.loadingText}>Loading experiences...</Text>
              </View>
            ) : workExperiences.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="briefcase-outline" size={40} color="#32418C" />
                </View>
                <Text style={styles.emptyTitle}>No experiences yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add your work experience to build your professional profile
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate("WorkExperienceFormScreen")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={18} color="#32418C" />
                  <Text style={styles.emptyButtonText}>Add Experience</Text>
                </TouchableOpacity>
              </View>
            ) : isReordering && DraggableFlatList ? (
              <DraggableFlatList
                data={workExperiences}
                onDragEnd={({ data }) => setWorkExperiences(data)}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 100 }}
                renderItem={renderDraggableItem}
              />
            ) : isReordering && !DraggableFlatList ? (
              <View style={{ flex: 1 }}>
                <Text style={styles.fallbackMessage}>
                  Reordering is not available on this device.
                </Text>
                <FlatList
                  data={workExperiences}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={{ paddingBottom: 100 }}
                  renderItem={renderStaticItem}
                />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#32418C"
                  />
                }
              >
                {workExperiences.map((exp, index) => renderTimelineCard(exp, index))}
              </ScrollView>
            )}
          </View>

          {/* Floating Action Button */}
          {!loading && !isReordering && workExperiences.length > 0 && (
            <TouchableOpacity
              style={styles.fab}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("WorkExperienceFormScreen")}
            >
              <Ionicons name="add" size={28} color="#32418C" />
            </TouchableOpacity>
          )}
        </View>

        {/* Edit Modal - Bottom Sheet */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setModalVisible(false)}
            />

            <View style={styles.modalContainer}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Experience</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Job Title</Text>
                  <TextInput
                    style={styles.inputField}
                    value={editForm.title}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, title: text }))}
                    placeholder="e.g. Software Engineer"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Company</Text>
                  <TextInput
                    style={styles.inputField}
                    value={editForm.company}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, company: text }))}
                    placeholder="e.g. Google"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* REPLACE THE PLACEHOLDER DROPDOWNS WITH THIS */}
                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Industry</Text>
                  <EditDropdown
                    label="Industry"
                    value={editForm.industry}
                    options={INDUSTRIES}
                    onSelect={(item) => setEditForm(prev => ({ ...prev, industry: item }))}
                    placeholder="Select Industry"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.inputLabel}>Occupation</Text>
                    <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: '#64748B' }}>Choose nearest match</Text>
                  </View>
                  <EditDropdown
                    label="Occupation"
                    value={editForm.occupation}
                    options={OCCUPATIONS}
                    onSelect={(item) => setEditForm(prev => ({ ...prev, occupation: item }))}
                    placeholder="Select Occupation"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.inputField}
                    value={editForm.location}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, location: text }))}
                    placeholder="e.g. Manila, Philippines"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.rowSplit}>
                  <View style={[styles.formRow, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Start Date</Text>
                    <TextInput
                      style={styles.inputField}
                      value={editForm.startDate}
                      onChangeText={(text) => setEditForm(prev => ({ ...prev, startDate: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  {!editForm.isCurrent && (
                    <View style={[styles.formRow, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>End Date</Text>
                      <TextInput
                        style={styles.inputField}
                        value={editForm.endDate}
                        onChangeText={(text) => setEditForm(prev => ({ ...prev, endDate: text }))}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  )}
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#32418C" />
                    <Text style={styles.switchLabel}>I currently work here</Text>
                  </View>
                  <Switch
                    value={editForm.isCurrent}
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, isCurrent: val }))}
                    trackColor={{ false: "#E2E8F0", true: "#32418C" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.inputField, styles.textArea]}
                    value={editForm.description}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))}
                    placeholder="Describe your role and achievements..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={confirmDelete}
                    disabled={isSaving}
                  >
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                    onPress={handleUpdate}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default WorkExperienceScreen;