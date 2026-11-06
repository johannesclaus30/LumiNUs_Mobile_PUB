import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles/WorkExperienceFormScreen.styles";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { ThemedAlert } from "../components/ThemedAlert";
import { INDUSTRIES, OCCUPATIONS } from "../constants/tracerReference";

/* ============================================================
   PSGC API SERVICE — Philippine Standard Geographic Code
   Docs: https://psgc.cloud/api/
   ============================================================ */
const PSGC_BASE = "https://psgc.cloud/api";

const psgcApi = {
  getRegions: async () => {
    const res = await fetch(`${PSGC_BASE}/regions`);
    if (!res.ok) throw new Error("Failed to fetch regions");
    return res.json();
  },
  getProvincesByRegion: async (regionCode) => {
    const res = await fetch(`${PSGC_BASE}/regions/${regionCode}/provinces`);
    if (!res.ok) throw new Error("Failed to fetch provinces");
    return res.json();
  },
  getCitiesByProvince: async (provinceCode) => {
    const res = await fetch(`${PSGC_BASE}/provinces/${provinceCode}/cities-municipalities`);
    if (!res.ok) throw new Error("Failed to fetch cities");
    return res.json();
  },
  // For NCR (Metro Manila) which has no provinces
  getCitiesByRegion: async (regionCode) => {
    const res = await fetch(`${PSGC_BASE}/regions/${regionCode}/cities-municipalities`);
    if (!res.ok) throw new Error("Failed to fetch cities");
    return res.json();
  },
  getBarangaysByCity: async (cityCode) => {
    const res = await fetch(`${PSGC_BASE}/cities-municipalities/${cityCode}/barangays`);
    if (!res.ok) throw new Error("Failed to fetch barangays");
    return res.json();
  },
};

/* ============================================================
   CUSTOM DROPDOWN — Bottom Sheet Style
   ============================================================ */
const CustomDropdown = ({
  label,
  value,
  options,
  onSelect,
  placeholder,
  disabled = false,
  loading = false,
  icon = "chevron-down",
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) =>
      (opt.label || opt).toLowerCase().includes(q)
    );
  }, [options, search]);

  const displayValue = typeof value === "object" ? value?.label : value;

  return (
    <>
      <Pressable
        style={[
          styles.dropdownTrigger,
          disabled && styles.dropdownTriggerDisabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
      >
        <Text
          style={[
            styles.dropdownTriggerText,
            !displayValue && styles.dropdownTriggerPlaceholder,
          ]}
          numberOfLines={1}
        >
          {displayValue || placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#94A3B8" />
        ) : (
          <Ionicons
            name={icon}
            size={18}
            color={disabled ? "#CBD5E1" : "#64748B"}
          />
        )}
      </Pressable>

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

            {/* Search Bar */}
            <View style={styles.dropdownSearchWrapper}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.dropdownSearchInput}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredOptions.map((item) => {
                const itemLabel = typeof item === "object" ? item.label : item;
                const itemKey = typeof item === "object" ? item.code : item;
                const isActive = displayValue === itemLabel;

                return (
                  <TouchableOpacity
                    key={itemKey}
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                    onPress={() => {
                      onSelect(item);
                      setModalVisible(false);
                      setSearch("");
                    }}
                  >
                    <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                      {itemLabel}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={20} color="#32418C" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      
    </>
  );
};

/* ============================================================
   OPTIONS
   ============================================================ */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EMPLOYMENT_TYPES = [
  { label: "Full-time", icon: "briefcase" },
  { label: "Part-time", icon: "time" },
  { label: "Contract", icon: "document-text" },
  { label: "Freelance", icon: "laptop" },
  { label: "Internship", icon: "school" },
  { label: "Self-employed", icon: "person" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 60 }, (_, i) => `${CURRENT_YEAR - i}`);

/* ============================================================
   MAIN SCREEN
   ============================================================ */
const WorkExperienceFormScreen = ({ navigation }) => {
  // Basic Info
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [industry, setIndustry] = useState(null);
  const [occupation, setOccupation] = useState(null);

  // Location
  const [countryType, setCountryType] = useState("local");
  const [abroadCountry, setAbroadCountry] = useState("");

  // Philippine Address (PSGC)
  const [region, setRegion] = useState(null);
  const [province, setProvince] = useState(null);
  const [city, setCity] = useState(null);
  const [barangay, setBarangay] = useState(null);

  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // Dates
  const [isCurrent, setIsCurrent] = useState(false);
  const [startMonth, setStartMonth] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [endYear, setEndYear] = useState("");

  // Description
  const [jobDescription, setJobDescription] = useState("");

  const [saving, setSaving] = useState(false);

  /* ---------- Load Regions on mount ---------- */
  useEffect(() => {
    if (countryType === "local" && regions.length === 0) {
      loadRegions();
    }
  }, [countryType]);

  /* ---------- Cascade Reset Helpers ---------- */
  const resetProvinces = () => {
    setProvince(null);
    setProvinces([]);
    resetCities();
  };
  const resetCities = () => {
    setCity(null);
    setCities([]);
    resetBarangays();
  };
  const resetBarangays = () => {
    setBarangay(null);
    setBarangays([]);
  };

  /* ---------- PSGC Loaders ---------- */
  const loadRegions = async () => {
    setLoadingRegions(true);
    try {
      const data = await psgcApi.getRegions();
      const formatted = data
        .map((r) => ({ code: r.code, label: r.name, regionName: r.regionName }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setRegions(formatted);
    } catch (err) {
      console.error("Load regions error:", err);
      ThemedAlert.alert("Network Error", "Could not load regions. Please check your connection.");
    } finally {
      setLoadingRegions(false);
    }
  };

  const handleSelectRegion = async (item) => {
    setRegion(item);
    resetProvinces();

    setLoadingProvinces(true);
    try {
      const data = await psgcApi.getProvincesByRegion(item.code);

      if (!data || data.length === 0) {
        // NCR or regions without provinces — load cities directly
        const cityData = await psgcApi.getCitiesByRegion(item.code);
        const formattedCities = (cityData || [])
          .map((c) => ({ code: c.code, label: c.name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setCities(formattedCities);
      } else {
        const formatted = data
          .map((p) => ({ code: p.code, label: p.name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setProvinces(formatted);
      }
    } catch (err) {
      console.error("Load provinces error:", err);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const handleSelectProvince = async (item) => {
    setProvince(item);
    resetCities();

    setLoadingCities(true);
    try {
      const data = await psgcApi.getCitiesByProvince(item.code);
      const formatted = (data || [])
        .map((c) => ({ code: c.code, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setCities(formatted);
    } catch (err) {
      console.error("Load cities error:", err);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleSelectCity = async (item) => {
    setCity(item);
    resetBarangays();

    setLoadingBarangays(true);
    try {
      const data = await psgcApi.getBarangaysByCity(item.code);
      const formatted = (data || [])
        .map((b) => ({ code: b.code, label: b.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setBarangays(formatted);
    } catch (err) {
      console.error("Load barangays error:", err);
    } finally {
      setLoadingBarangays(false);
    }
  };

  /* ---------- Save ---------- */
  const getMonthNumber = (monthName) => {
    const index = MONTHS.indexOf(monthName);
    return index >= 0 ? String(index + 1).padStart(2, "0") : "01";
  };

  const handleSave = async () => {
    if (!jobTitle.trim() || !company.trim() || !startMonth || !startYear) {
      ThemedAlert.alert(
        "Missing Fields",
        "Please fill in the Job Title, Company, and Start Date."
      );
      return;
    }

    if (!isCurrent && (!endMonth || !endYear)) {
      ThemedAlert.alert(
        "Missing Fields",
        "Please provide an End Date or check 'I currently work here'."
      );
      return;
    }

        if (!industry) {
      ThemedAlert.alert("Missing Fields", "Please select an Industry.");
      return;
    }

    if (!occupation) {
      ThemedAlert.alert("Missing Fields", "Please select an Occupation.");
      return;
    }

    if (countryType === "local" && !region) {
      ThemedAlert.alert("Missing Fields", "Please select a Region.");
      return;
    }

    if (countryType === "abroad" && !abroadCountry.trim()) {
      ThemedAlert.alert("Missing Fields", "Please enter the country.");
      return;
    }

    setSaving(true);
    try {
      const user = await getCurrentUser();
      if (!user?.id) throw new Error("User session not found.");

      // Compose location string
      let locationString = "";
      if (countryType === "local") {
        locationString = [
          barangay?.label,
          city?.label,
          province?.label,
          region?.label,
          "Philippines",
        ]
          .filter(Boolean)
          .join(", ");
      } else {
        locationString = abroadCountry.trim();
      }

      const startDateStr = `${startYear}-${getMonthNumber(startMonth)}-01`;
      let endDateStr = null;
      if (!isCurrent) {
        endDateStr = `${endYear}-${getMonthNumber(endMonth)}-01`;
      }

      const finalJobTitle = employmentType
        ? `${jobTitle.trim()} (${employmentType})`
        : jobTitle.trim();

      const { error } = await supabase.from("alumni_employments").insert([
        {
          alumni_id: user.id,
          job_title: finalJobTitle,
          company: company.trim(),
          location: locationString,
          career_description: jobDescription.trim(),
          start_date: startDateStr,
          end_date: endDateStr,
          is_current: isCurrent,
          industry: industry?.code || null,     // <-- ADDED
          occupation: occupation?.code || null, // <-- ADDED
        },
      ]);

      if (error) throw error;

      ThemedAlert.alert("Success", "Work experience added successfully.");
      navigation.goBack();
    } catch (error) {
      console.error("Save Work Experience Error:", error);
      ThemedAlert.alert("Error", "Could not save work experience. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Preview Location ---------- */
  const locationPreview =
    countryType === "local"
      ? [barangay?.label, city?.label, province?.label, region?.label, "Philippines"]
          .filter(Boolean)
          .join(", ")
      : abroadCountry.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* ============ HERO HEADER ============ */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>NEW ENTRY</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.headerTitle}>Work Experience</Text>
        <Text style={styles.headerSubtitle}>
          Tell us about your professional journey
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#F5F7FB" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ============ SECTION 1: ROLE ============ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>1</Text>
              </View>
              <Text style={styles.sectionTitle}>Role Details</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Job Title</Text>
              <TextInput
                style={styles.textInput}
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholder="e.g. Software Engineer"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company / Organization</Text>
              <TextInput
                style={styles.textInput}
                value={company}
                onChangeText={setCompany}
                placeholder="e.g. Google Philippines"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Add these right above the Employment Type block */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Industry</Text>
              <CustomDropdown
                label="Industry"
                value={industry}
                options={INDUSTRIES}
                onSelect={setIndustry}
                placeholder="Select Industry"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Occupation</Text>
                <Text style={styles.charCount}>Choose the nearest match</Text>
              </View>
              <CustomDropdown
                label="Occupation"
                value={occupation}
                options={OCCUPATIONS}
                onSelect={setOccupation}
                placeholder="Select Occupation"
              />
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#64748B', marginTop: 6, marginLeft: 4 }}>
                If your exact job title isn't listed, please select the closest matching occupation.
              </Text>
            </View>

            <View style={[styles.inputGroup, { marginBottom: 4 }]}>
              <Text style={styles.label}>Employment Type</Text>
              <View style={styles.chipContainer}>
                {EMPLOYMENT_TYPES.map((type) => {
                  const active = employmentType === type.label;
                  return (
                    <TouchableOpacity
                      key={type.label}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() =>
                        setEmploymentType(active ? "" : type.label)
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={type.icon}
                        size={13}
                        color={active ? "#FBD117" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ============ SECTION 2: LOCATION ============ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>2</Text>
              </View>
              <Text style={styles.sectionTitle}>Company Location</Text>
            </View>

            {/* Segmented Control */}
            <View style={styles.segmentedContainer}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  countryType === "local" && styles.segmentActive,
                ]}
                onPress={() => setCountryType("local")}
                activeOpacity={0.9}
              >
                <Ionicons
                  name="flag"
                  size={14}
                  color={countryType === "local" ? "#32418C" : "#94A3B8"}
                />
                <Text
                  style={[
                    styles.segmentText,
                    countryType === "local" && styles.segmentTextActive,
                  ]}
                >
                  Philippines
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segment,
                  countryType === "abroad" && styles.segmentActive,
                ]}
                onPress={() => setCountryType("abroad")}
                activeOpacity={0.9}
              >
                <Ionicons
                  name="globe"
                  size={14}
                  color={countryType === "abroad" ? "#32418C" : "#94A3B8"}
                />
                <Text
                  style={[
                    styles.segmentText,
                    countryType === "abroad" && styles.segmentTextActive,
                  ]}
                >
                  Abroad
                </Text>
              </TouchableOpacity>
            </View>

            {countryType === "abroad" ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.textInput}
                  value={abroadCountry}
                  onChangeText={setAbroadCountry}
                  placeholder="e.g. United States, Japan, UAE"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            ) : (
              <>
                {/* Region */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Region</Text>
                  <CustomDropdown
                    label="Region"
                    value={region}
                    options={regions}
                    onSelect={handleSelectRegion}
                    placeholder="Select Region"
                    loading={loadingRegions}
                  />
                </View>

                {/* Province — only if region has provinces */}
                {region && provinces.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Province</Text>
                    <CustomDropdown
                      label="Province"
                      value={province}
                      options={provinces}
                      onSelect={handleSelectProvince}
                      placeholder="Select Province"
                      loading={loadingProvinces}
                    />
                  </View>
                )}

                {/* City */}
                {region && cities.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>City / Municipality</Text>
                    <CustomDropdown
                      label="City/Municipality"
                      value={city}
                      options={cities}
                      onSelect={handleSelectCity}
                      placeholder="Select City or Municipality"
                      loading={loadingCities}
                    />
                  </View>
                )}

                {/* Barangay — optional */}
                {city && barangays.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Barangay{" "}
                      <Text style={styles.labelOptional}>(optional)</Text>
                    </Text>
                    <CustomDropdown
                      label="Barangay"
                      value={barangay}
                      options={barangays}
                      onSelect={setBarangay}
                      placeholder="Select Barangay"
                      loading={loadingBarangays}
                    />
                  </View>
                )}
              </>
            )}

            {/* Location Preview */}
            {locationPreview.length > 0 && (
              <View style={styles.previewCard}>
                <View style={styles.previewIconContainer}>
                  <Ionicons name="location" size={16} color="#32418C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewLabel}>Location Preview</Text>
                  <Text style={styles.previewValue}>{locationPreview}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ============ SECTION 3: TIMELINE ============ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>Timeline</Text>
            </View>

            {/* Currently Working Toggle */}
            <Pressable
              style={styles.toggleRow}
              onPress={() => setIsCurrent(!isCurrent)}
            >
              <View style={styles.toggleLabelWrap}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={isCurrent ? "#32418C" : "#CBD5E1"}
                />
                <View>
                  <Text style={styles.toggleLabel}>I currently work here</Text>
                  <Text style={styles.toggleHint}>
                    End date will be set to "Present"
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.toggleTrack,
                  isCurrent && styles.toggleTrackActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    isCurrent && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </Pressable>

            {/* Start Date */}
            <Text style={styles.dateGroupLabel}>Start Date</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <CustomDropdown
                  label="Start Month"
                  value={startMonth}
                  options={MONTHS}
                  onSelect={setStartMonth}
                  placeholder="Month"
                />
              </View>
              <View style={styles.flex1}>
                <CustomDropdown
                  label="Start Year"
                  value={startYear}
                  options={YEARS}
                  onSelect={setStartYear}
                  placeholder="Year"
                />
              </View>
            </View>

            {/* End Date */}
            {!isCurrent && (
              <>
                <Text style={styles.dateGroupLabel}>End Date</Text>
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <CustomDropdown
                      label="End Month"
                      value={endMonth}
                      options={MONTHS}
                      onSelect={setEndMonth}
                      placeholder="Month"
                    />
                  </View>
                  <View style={styles.flex1}>
                    <CustomDropdown
                      label="End Year"
                      value={endYear}
                      options={YEARS}
                      onSelect={setEndYear}
                      placeholder="Year"
                    />
                  </View>
                </View>
              </>
            )}
          </View>

          {/* ============ SECTION 4: DESCRIPTION ============ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>4</Text>
              </View>
              <Text style={styles.sectionTitle}>Description</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Job Description</Text>
                <Text style={styles.charCount}>
                  {jobDescription.length}/500
                </Text>
              </View>
              <TextInput
                style={styles.textArea}
                value={jobDescription}
                onChangeText={(t) => setJobDescription(t.slice(0, 500))}
                placeholder="Briefly describe your role, responsibilities, and achievements..."
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
            </View>
          </View>

          {/* ============ REMINDER CARD ============ */}
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <Ionicons name="information-circle" size={18} color="#FBD117" />
              <Text style={styles.reminderTitle}>Reminder</Text>
            </View>
            <Text style={styles.reminderText}>
              This section is required. If you are currently not employed, please
              enter "N/A" for the Job Title and Company, then save the form.
            </Text>
          </View>

          {/* ============ ACTION BUTTONS ============ */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.discardButton}
              activeOpacity={0.8}
              onPress={() => navigation.goBack()}
              disabled={saving}
            >
              <Text style={styles.discardButtonText}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#32418C" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#32418C" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default WorkExperienceFormScreen;