import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import styles from '../styles/AddSkillsScreen.styles';
import supabase from '../services/supabase';
import { getCurrentUser } from '../services/supabaseAuth';
import { ThemedAlert } from '../components/ThemedAlert';

/* ============================================================
   SUGGESTED SKILLS — Quick Add Chips
   ============================================================ */
const SUGGESTED_SKILLS = [
  'JavaScript', 'Python', 'React Native', 'UI/UX Design',
  'Project Management', 'Data Analysis', 'Public Speaking',
  'Communication', 'Leadership', 'Problem Solving',
  'Digital Marketing', 'Photoshop', 'Excel', 'SQL',
];

/* ============================================================
   MAIN SCREEN
   ============================================================ */
const AddSkillsScreen = ({ navigation }) => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null); // null = add mode, object = edit mode
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);

  const isMounted = useRef(true);
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  /* ---------- Fetch Skills ---------- */
  const fetchSkills = async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const user = await getCurrentUser();
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('alumni_skills')
        .select('*')
        .eq('alumni_id', user.id)
        .order('skill_name', { ascending: true });

      if (error) throw error;
      if (isMounted.current) setSkills(data || []);
    } catch (error) {
      console.error('Fetch skills error:', error);
      ThemedAlert.alert('Error', 'Unable to load your skills at this time.');
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSkills();
    }, [])
  );

  const onRefresh = () => fetchSkills(true);

  /* ---------- Filtered Skills ---------- */
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const q = searchQuery.toLowerCase();
    return skills.filter((s) => s.skill_name.toLowerCase().includes(q));
  }, [skills, searchQuery]);

  /* ---------- Modal Open Helpers ---------- */
  const openAddModal = (presetValue = '') => {
    setEditingSkill(null);
    setSkillInput(presetValue);
    setModalVisible(true);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const openEditModal = (skillItem) => {
    setEditingSkill(skillItem);
    setSkillInput(skillItem.skill_name);
    setModalVisible(true);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingSkill(null);
    setSkillInput('');
    Keyboard.dismiss();
  };

  /* ---------- Save (Add or Edit) ---------- */
  const handleSave = async () => {
    const trimmed = skillInput.trim();

    if (!trimmed) {
      ThemedAlert.alert('Missing Field', 'Please enter a skill before saving.');
      return;
    }

    if (trimmed.length > 40) {
      ThemedAlert.alert('Too Long', 'Skill name must be 40 characters or less.');
      return;
    }

    setSaving(true);
    try {
      const user = await getCurrentUser();
      if (!user?.id) throw new Error('No active session found.');

      // ----- EDIT MODE -----
      if (editingSkill) {
        // Prevent duplicate when renaming to an existing skill
        const { data: dupes, error: dupeErr } = await supabase
          .from('alumni_skills')
          .select('id')
          .eq('alumni_id', user.id)
          .ilike('skill_name', trimmed)
          .neq('id', editingSkill.id);

        if (dupeErr) throw dupeErr;
        if (dupes && dupes.length > 0) {
          ThemedAlert.alert(
            'Duplicate Skill',
            'Another skill with this name already exists.'
          );
          if (isMounted.current) setSaving(false);
          return;
        }

        const { error: updateErr } = await supabase
          .from('alumni_skills')
          .update({ skill_name: trimmed })
          .eq('id', editingSkill.id);

        if (updateErr) throw updateErr;
      }
      // ----- ADD MODE -----
      else {
        const { data: existing, error: checkErr } = await supabase
          .from('alumni_skills')
          .select('id')
          .eq('alumni_id', user.id)
          .ilike('skill_name', trimmed);

        if (checkErr) throw checkErr;

        if (existing && existing.length > 0) {
          ThemedAlert.alert(
            'Duplicate Skill',
            'You have already added this skill to your profile.'
          );
          if (isMounted.current) setSaving(false);
          return;
        }

        const { error: insertErr } = await supabase
          .from('alumni_skills')
          .insert([{ alumni_id: user.id, skill_name: trimmed }]);

        if (insertErr) throw insertErr;
      }

      closeModal();
      fetchSkills();
    } catch (error) {
      console.error('Save skill error:', error);
      ThemedAlert.alert('Error', 'Could not save your skill. Please try again.');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  /* ---------- Delete ---------- */
  const confirmDelete = (skillItem) => {
    Alert.alert(
      'Delete Skill',
      `Remove "${skillItem.skill_name}" from your profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('alumni_skills')
                .delete()
                .eq('id', skillItem.id);

              if (error) throw error;
              fetchSkills();
            } catch (err) {
              console.error('Delete skill error:', err);
              ThemedAlert.alert('Error', 'Could not delete skill.');
            }
          },
        },
      ]
    );
  };

  /* ---------- Quick Add Suggested Skill ---------- */
  const handleQuickAdd = async (skillName) => {
    const trimmed = skillName.trim();

    const alreadyExists = skills.some(
      (s) => s.skill_name.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      ThemedAlert.alert('Already Added', `"${trimmed}" is already in your skills.`);
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user?.id) throw new Error('No active session.');

      const { error } = await supabase
        .from('alumni_skills')
        .insert([{ alumni_id: user.id, skill_name: trimmed }]);

      if (error) throw error;
      fetchSkills();
    } catch (err) {
      console.error('Quick add error:', err);
      ThemedAlert.alert('Error', 'Could not add skill.');
    }
  };

  /* ---------- Render Skill Card ---------- */
  const renderSkillCard = ({ item }) => (
    <View style={styles.skillCard}>
      <View style={styles.skillIconWrap}>
        <Ionicons name="sparkles" size={16} color="#FBD117" />
      </View>

      <Text style={styles.skillText} numberOfLines={2}>
        {item.skill_name}
      </Text>

      <View style={styles.skillActions}>
        <TouchableOpacity
          style={styles.skillActionBtn}
          onPress={() => openEditModal(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={16} color="#32418C" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.skillActionBtn, styles.skillDeleteBtn]}
          onPress={() => confirmDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  /* ---------- Suggested chips to display ---------- */
  const suggestedToShow = SUGGESTED_SKILLS.filter(
    (s) =>
      !skills.some(
        (existing) => existing.skill_name.toLowerCase() === s.toLowerCase()
      )
  ).slice(0, 8);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* ============ HERO HEADER ============ */}
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
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Skills</Text>
              <Text style={styles.headerSubtitle}>
                {skills.length} {skills.length === 1 ? 'skill' : 'skills'} added
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          {skills.length > 4 && (
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search your skills..."
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color="rgba(255,255,255,0.6)"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ============ CONTENT ============ */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#32418C" />
              <Text style={styles.loadingText}>Loading skills...</Text>
            </View>
          ) : skills.length === 0 ? (
            /* ===== EMPTY STATE ===== */
            <ScrollView
              contentContainerStyle={styles.emptyScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="sparkles-outline" size={40} color="#32418C" />
                </View>
                <Text style={styles.emptyTitle}>No skills yet</Text>
                <Text style={styles.emptySubtitle}>
                  Showcase your expertise by adding your first skill
                </Text>

                <TouchableOpacity
                  style={styles.emptyButton}
                  activeOpacity={0.85}
                  onPress={() => openAddModal()}
                >
                  <Ionicons name="add" size={18} color="#32418C" />
                  <Text style={styles.emptyButtonText}>Add Skill</Text>
                </TouchableOpacity>
              </View>

              {/* Suggested Skills (Empty state) */}
              {suggestedToShow.length > 0 && (
                <View style={styles.suggestedSection}>
                  <Text style={styles.suggestedTitle}>POPULAR SKILLS</Text>
                  <View style={styles.suggestedChips}>
                    {suggestedToShow.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={styles.suggestedChip}
                        onPress={() => handleQuickAdd(s)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="add" size={12} color="#32418C" />
                        <Text style={styles.suggestedChipText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            /* ===== SKILLS LIST ===== */
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
              {/* Search Result Count */}
              {searchQuery.length > 0 && (
                <Text style={styles.searchResultText}>
                  {filteredSkills.length} result
                  {filteredSkills.length !== 1 ? 's' : ''} for "{searchQuery}"
                </Text>
              )}

              {/* Skills List */}
              <FlatList
                data={filteredSkills}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderSkillCard}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.noResults}>
                    <Ionicons name="search-outline" size={32} color="#CBD5E1" />
                    <Text style={styles.noResultsText}>No skills match your search</Text>
                  </View>
                }
              />

              {/* Suggested Chips (Populated state) */}
              {suggestedToShow.length > 0 && !searchQuery && (
                <View style={styles.suggestedSectionInline}>
                  <Text style={styles.suggestedTitle}>QUICK ADD</Text>
                  <View style={styles.suggestedChips}>
                    {suggestedToShow.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={styles.suggestedChip}
                        onPress={() => handleQuickAdd(s)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="add" size={12} color="#32418C" />
                        <Text style={styles.suggestedChipText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* ============ FAB ============ */}
        {!loading && skills.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.85}
            onPress={() => openAddModal()}
          >
            <Ionicons name="add" size={28} color="#32418C" />
          </TouchableOpacity>
        )}

        {/* ============ ADD / EDIT MODAL ============ */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeModal}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              style={styles.modalOverlay}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <Pressable style={styles.modalBackdrop} onPress={closeModal} />

              <View style={styles.modalContainer}>
                <View style={styles.modalHandle} />

                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={styles.modalIconWrap}>
                      <Ionicons
                        name={editingSkill ? 'create-outline' : 'sparkles'}
                        size={18}
                        color="#FBD117"
                      />
                    </View>
                    <View>
                      <Text style={styles.modalTitle}>
                        {editingSkill ? 'Edit Skill' : 'Add New Skill'}
                      </Text>
                      <Text style={styles.modalSubtitle}>
                        {editingSkill
                          ? 'Update your skill name'
                          : 'Enter a skill to showcase your expertise'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={closeModal}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Skill Name</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      value={skillInput}
                      onChangeText={setSkillInput}
                      placeholder="e.g. Graphic Design, JavaScript"
                      placeholderTextColor="#94A3B8"
                      maxLength={40}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSave}
                    />
                    <Text style={styles.charCount}>
                      {skillInput.length}/40
                    </Text>
                  </View>
                </View>

                {/* Quick Suggestions in Modal (only when adding) */}
                {!editingSkill && suggestedToShow.length > 0 && (
                  <View style={styles.modalSuggestions}>
                    <Text style={styles.modalSuggestionsLabel}>Suggestions</Text>
                    <View style={styles.suggestedChips}>
                      {suggestedToShow.slice(0, 6).map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={styles.modalSuggestedChip}
                          onPress={() => setSkillInput(s)}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.modalSuggestedChipText}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Buttons */}
                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={closeModal}
                    disabled={saving}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalSaveBtn,
                      (!skillInput.trim() || saving) && { opacity: 0.6 },
                    ]}
                    onPress={handleSave}
                    disabled={saving || !skillInput.trim()}
                    activeOpacity={0.85}
                  >
                    {saving ? (
                      <ActivityIndicator color="#32418C" />
                    ) : (
                      <>
                        <Ionicons
                          name={editingSkill ? 'checkmark' : 'add'}
                          size={18}
                          color="#32418C"
                        />
                        <Text style={styles.modalSaveText}>
                          {editingSkill ? 'Save Changes' : 'Add Skill'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default AddSkillsScreen;