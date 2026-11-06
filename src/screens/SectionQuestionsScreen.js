import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from "react-native";
import {
  isQuestionVisible,
  getVisibleQuestions,
} from "../utils/branching";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import Constants from 'expo-constants'; // ⚠️ ADD THIS IMPORT
import TopHeaderDark from "../components/TopHeaderDark";
import styles from "../styles/SectionQuestionsScreen.styles";
import {
  getOrCreateDraftResponse,
  getDraftAnswers,
  saveAnswerDraft,
  submitDraftResponse,
  uploadTracerFile,
} from "../services/tracerQueries";
import { ThemedAlert } from "../components/ThemedAlert";
import { pickFile, formatFileSize, isFileTypeAllowed } from "../utils/filePicker";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const STARS = [
  { top: '3%', left: '10%', size: 1.5, opacity: 0.4 },
  { top: '8%', left: '30%', size: 2, opacity: 0.3 },
  { top: '15%', left: '80%', size: 1, opacity: 0.5 },
  { top: '22%', left: '15%', size: 2.5, opacity: 0.3 },
  { top: '30%', left: '70%', size: 1.5, opacity: 0.4 },
  { top: '38%', left: '50%', size: 1, opacity: 0.3 },
  { top: '45%', left: '88%', size: 2, opacity: 0.4 },
  { top: '55%', left: '25%', size: 1.5, opacity: 0.5 },
  { top: '65%', left: '60%', size: 1, opacity: 0.3 },
  { top: '75%', left: '8%', size: 2, opacity: 0.4 },
  { top: '82%', left: '75%', size: 1.5, opacity: 0.3 },
  { top: '90%', left: '40%', size: 1, opacity: 0.5 },
];

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

const StarField = () => (
  <View style={styles.starsContainer} pointerEvents="none">
    {STARS.map((star, i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          top: star.top,
          left: star.left,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: '#FFFFFF',
          opacity: star.opacity,
        }}
      />
    ))}
  </View>
);

// ─────────────────────────────────────────────
// QUESTION DOTS WITH SCROLL & ELLIPSIS
// ─────────────────────────────────────────────

const QuestionDots = ({ questions, answers, currentIndex, onDotPress }) => {
  const scrollViewRef = useRef(null);
  const [showLeftEllipsis, setShowLeftEllipsis] = useState(false);
  const [showRightEllipsis, setShowRightEllipsis] = useState(true);

  // Handle scroll to detect ellipsis visibility
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setShowLeftEllipsis(contentOffset.x > 10);
    setShowRightEllipsis(contentOffset.x + layoutMeasurement.width < contentSize.width - 10);
  };

  // Auto-scroll to current question
  useEffect(() => {
    if (scrollViewRef.current && currentIndex >= 0) {
      const dotWidth = 34; // width + gap
      const scrollToX = Math.max(0, currentIndex * dotWidth - 100);
      scrollViewRef.current.scrollTo({ x: scrollToX, animated: true });
    }
  }, [currentIndex]);

  const totalQuestions = questions.length;

  return (
    <View style={styles.questionDotsContainer}>
      {/* Left ellipsis */}
      {showLeftEllipsis && (
        <View style={styles.ellipsisWrapper}>
          <Text style={styles.ellipsisText}>…</Text>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.questionDotsScrollContent}
        style={styles.questionDotsScroll}
      >
        {questions.map((q, index) => {
          const isAnswered = answers[q.id] && (
            typeof answers[q.id] === 'string'
              ? answers[q.id].trim() !== ''
              : Object.keys(answers[q.id] || {}).length > 0
          );
          const isCurrent = index === currentIndex;
          const isLast = index === totalQuestions - 1;

          return (
            <TouchableOpacity
              key={q.id || index}
              style={[
                styles.questionDot,
                isCurrent && styles.questionDotCurrent,
                isAnswered && styles.questionDotAnswered,
              ]}
              onPress={() => onDotPress(index)}
            >
              <Text style={[
                styles.questionDotText,
                isCurrent && styles.questionDotTextCurrent,
                isAnswered && styles.questionDotTextAnswered,
              ]}>
                {index + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Right ellipsis */}
      {showRightEllipsis && (
        <View style={styles.ellipsisWrapper}>
          <Text style={styles.ellipsisText}>…</Text>
        </View>
      )}
    </View>
  );
};

/** Progress bar at the top */
const QuestionProgress = ({ current, total }) => {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <View style={styles.questionProgressContainer}>
      <View style={styles.questionProgressInfo}>
        <Text style={styles.questionProgressLabel}>Question {current} of {total}</Text>
        <Text style={styles.questionProgressPct}>{pct}%</Text>
      </View>
      <View style={styles.questionProgressBg}>
        <View
          style={[styles.questionProgressFill, { width: `${Math.max(pct, 2)}%` }]}
        />
      </View>
    </View>
  );
};

/** Short Answer Input */
const ShortAnswerInput = ({ question, value, onChange, error }) => (
  <View style={styles.questionCard}>
    <View style={styles.questionHeader}>
      <Text style={styles.questionNumber}>Q.</Text>
      <Text style={styles.questionText}>{question.question_text}</Text>
      {question.is_required && <Text style={styles.requiredStar}>*</Text>}
    </View>
    {question.description ? (
      <Text style={styles.questionDescription}>{question.description}</Text>
    ) : null}
    <TextInput
      style={[styles.textInput, error && styles.textInputError]}
      value={value}
      onChangeText={onChange}
      placeholder={question.placeholder || "Type your answer here..."}
      placeholderTextColor="rgba(255,255,255,0.25)"
      multiline={false}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

/** Paragraph Input */
const ParagraphInput = ({ question, value, onChange, error }) => (
  <View style={styles.questionCard}>
    <View style={styles.questionHeader}>
      <Text style={styles.questionNumber}>Q.</Text>
      <Text style={styles.questionText}>{question.question_text}</Text>
      {question.is_required && <Text style={styles.requiredStar}>*</Text>}
    </View>
    {question.description ? (
      <Text style={styles.questionDescription}>{question.description}</Text>
    ) : null}
    <TextInput
      style={[styles.textArea, error && styles.textInputError]}
      value={value}
      onChangeText={onChange}
      placeholder={question.placeholder || "Type your response here..."}
      placeholderTextColor="rgba(255,255,255,0.25)"
      multiline
      numberOfLines={4}
      textAlignVertical="top"
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const MultipleChoiceInput = ({ question, value, onChange, otherValue, onOtherChange, error }) => {
  const options = question.options || [];
  const otherOption = options.find(o => o.is_other) || options.find(o => o.option_label === 'Other');
  const otherSelected = !!otherOption && value === otherOption.option_label;

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q.</Text>
        <Text style={styles.questionText}>{question.question_text}</Text>
        {question.is_required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      {question.description ? (
        <Text style={styles.questionDescription}>{question.description}</Text>
      ) : null}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = value === option.option_label;
          return (
            <TouchableOpacity
              key={option.id || index}
              style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
              onPress={() => onChange(option.option_label)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.option_label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 🆕 Show the text input when "Other" is selected */}
      {otherSelected && (
        <TextInput
          style={[styles.textInput, { marginTop: 8 }]}
          value={otherValue || ''}
          onChangeText={onOtherChange}
          placeholder="Please specify..."
          placeholderTextColor="rgba(255,255,255,0.25)"
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

/** Checkboxes (Multi-select) */
const CheckboxesInput = ({ question, value, onChange, otherValue, onOtherChange, error }) => {
  const options = question.options || [];
  const selectedValues = value ? value.split(',') : [];
const otherOption = options.find(o => o.is_other) || options.find(o => o.option_label === 'Other');
const otherSelected = !!otherOption && selectedValues.includes(otherOption.option_label);

  const toggleOption = (optionLabel) => {
    let newSelected;
    if (selectedValues.includes(optionLabel)) {
      newSelected = selectedValues.filter(v => v !== optionLabel);
    } else {
      newSelected = [...selectedValues, optionLabel];
    }
    onChange(newSelected.join(','));
  };

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q.</Text>
        <Text style={styles.questionText}>{question.question_text}</Text>
        {question.is_required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      {question.description ? (
        <Text style={styles.questionDescription}>{question.description}</Text>
      ) : null}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isChecked = selectedValues.includes(option.option_label);
          return (
            <TouchableOpacity
              key={option.id || index}
              style={[styles.optionButton, isChecked && styles.optionButtonSelected]}
              onPress={() => toggleOption(option.option_label)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.optionText, isChecked && styles.optionTextSelected]}>
                {option.option_label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 🆕 Show the text input when "Other" is checked */}
      {otherSelected && (
        <TextInput
          style={[styles.textInput, { marginTop: 8 }]}
          value={otherValue || ''}
          onChangeText={onOtherChange}
          placeholder="Please specify..."
          placeholderTextColor="rgba(255,255,255,0.25)"
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const DropdownInput = ({ question, value, onChange, otherValue, onOtherChange, error }) => {
  const options = question.options || [];
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.option_label === value);
  const otherOption = options.find(o => o.is_other) || options.find(o => o.option_label === 'Other');
  const otherSelected = !!otherOption && value === otherOption.option_label;
  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q.</Text>
        <Text style={styles.questionText}>{question.question_text}</Text>
        {question.is_required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      {question.description ? (
        <Text style={styles.questionDescription}>{question.description}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.dropdownButton, error && styles.textInputError]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropdownText, !selectedOption && styles.dropdownPlaceholder]}>
          {selectedOption ? selectedOption.option_label : "Select an option..."}
        </Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color="rgba(255,255,255,0.5)"
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map((option, index) => {
            const isSelected = value === option.option_label;
            return (
              <TouchableOpacity
                key={option.id || index}
                style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                onPress={() => {
                  onChange(option.option_label);
                  setIsOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                  {option.option_label}
                </Text>
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFD404" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 🆕 Show the text input when "Other" is selected */}
      {otherSelected && (
        <TextInput
          style={[styles.textInput, { marginTop: 8 }]}
          value={otherValue || ''}
          onChangeText={onOtherChange}
          placeholder="Please specify..."
          placeholderTextColor="rgba(255,255,255,0.25)"
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

/** Likert Scale Input */
const LikertScaleInput = ({ question, value, onChange, error }) => {
  const rows = question.grid_rows || [];
  const columns = question.grid_columns || [];
  const [isScrolling, setIsScrolling] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollViewRef = useRef(null);
  
  // Parse existing value as JSON object { row_id: column_id }
  const selectedValues = value ? JSON.parse(value) : {};

  const handleSelect = (rowId, columnId) => {
    const updated = { ...selectedValues, [rowId]: columnId?.toString() };
    onChange(JSON.stringify(updated));
  };

  // Hide scroll hint after user scrolls
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 5;
    if (isAtEnd) {
      setShowScrollHint(false);
    }
    setIsScrolling(true);
    setTimeout(() => setIsScrolling(false), 500);
  };

  if (rows.length === 0) {
    return <MultipleChoiceInput question={question} value={value} onChange={onChange} error={error} />;
  }

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q.</Text>
        <Text style={styles.questionText}>{question.question_text}</Text>
        {question.is_required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      {question.description ? (
        <Text style={styles.questionDescription}>{question.description}</Text>
      ) : null}
      
      {/* Scroll Hint */}
      {showScrollHint && columns.length > 2 && (
        <View style={styles.scrollHintContainer}>
          <Ionicons name="chevron-forward-outline" size={16} color="#FFD404" />
          <Text style={styles.scrollHintText}>Swipe right to see more</Text>
          <Ionicons name="chevron-forward-outline" size={16} color="#FFD404" />
        </View>
      )}
      
      {/* Column headers */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.likertScrollView}
      >
        <View>
          <View style={styles.likertHeaderRow}>
            <View style={styles.likertRowLabelPlaceholder} />
            {columns.map((col) => (
              <View key={col.id} style={styles.likertColumnHeader}>
                <Text style={styles.likertColumnText}>{col.column_label}</Text>
              </View>
            ))}
          </View>
          
          {/* Rows */}
          {rows.map((row) => (
            <View key={row.id} style={styles.likertRow}>
              <View style={styles.likertRowLabel}>
                <Text style={styles.likertRowText} numberOfLines={2}>{row.row_label}</Text>
              </View>
              {columns.map((col) => {
                const isSelected = selectedValues[row.id] === col.id?.toString();
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[
                      styles.likertCell,
                      isSelected && styles.likertCellSelected,
                    ]}
                    onPress={() => handleSelect(row.id, col.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.likertRadio,
                      isSelected && styles.likertRadioSelected,
                    ]}>
                      {isSelected && <View style={styles.likertRadioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Scroll indicator dots */}
      {columns.length > 2 && (
        <View style={styles.scrollIndicatorContainer}>
          {columns.map((_, index) => (
            <View
              key={index}
              style={[
                styles.scrollIndicatorDot,
                index === 0 && styles.scrollIndicatorDotActive,
              ]}
            />
          ))}
        </View>
      )}
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

/** Multiple Choice Grid Input */
const MultipleChoiceGridInput = ({ question, value, onChange, error }) => {
  const rows = question.grid_rows || [];
  const columns = question.grid_columns || [];
  const [isScrolling, setIsScrolling] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollViewRef = useRef(null);
  
  // Parse existing value as JSON object { row_id: column_id }
  const selectedValues = value ? JSON.parse(value) : {};

  const handleSelect = (rowId, columnId) => {
    const updated = { ...selectedValues, [rowId]: columnId?.toString() };
    onChange(JSON.stringify(updated));
  };

  // Hide scroll hint after user scrolls
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 5;
    if (isAtEnd) {
      setShowScrollHint(false);
    }
    setIsScrolling(true);
    setTimeout(() => setIsScrolling(false), 500);
  };

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q.</Text>
        <Text style={styles.questionText}>{question.question_text}</Text>
        {question.is_required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      {question.description ? (
        <Text style={styles.questionDescription}>{question.description}</Text>
      ) : null}
      
      {/* Scroll Hint */}
      {showScrollHint && columns.length > 2 && (
        <View style={styles.scrollHintContainer}>
          <Ionicons name="chevron-forward-outline" size={16} color="#FFD404" />
          <Text style={styles.scrollHintText}>Swipe right to see more</Text>
          <Ionicons name="chevron-forward-outline" size={16} color="#FFD404" />
        </View>
      )}
      
      {/* Column headers */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.likertScrollView}
      >
        <View>
          <View style={styles.likertHeaderRow}>
            <View style={styles.likertRowLabelPlaceholder} />
            {columns.map((col) => (
              <View key={col.id} style={styles.likertColumnHeader}>
                <Text style={styles.likertColumnText}>{col.column_label}</Text>
              </View>
            ))}
          </View>
          
          {/* Rows */}
          {rows.map((row) => (
            <View key={row.id} style={styles.likertRow}>
              <View style={styles.likertRowLabel}>
                <Text style={styles.likertRowText} numberOfLines={2}>{row.row_label}</Text>
              </View>
              {columns.map((col) => {
                const isSelected = selectedValues[row.id] === col.id?.toString();
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[
                      styles.likertCell,
                      isSelected && styles.likertCellSelected,
                    ]}
                    onPress={() => handleSelect(row.id, col.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.likertRadio,
                      isSelected && styles.likertRadioSelected,
                    ]}>
                      {isSelected && <View style={styles.likertRadioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Scroll indicator dots */}
      {columns.length > 2 && (
        <View style={styles.scrollIndicatorContainer}>
          {columns.map((_, index) => (
            <View
              key={index}
              style={[
                styles.scrollIndicatorDot,
                index === 0 && styles.scrollIndicatorDotActive,
              ]}
            />
          ))}
        </View>
      )}
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};
/** File Upload Input */
const FileUploadInput = ({ question, value, onChange, error, onFilePick }) => {
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const fileInfo = value ? JSON.parse(value) : null;
  
  // Check if running in Expo Go
  const isExpoGo = Platform.OS === 'ios' && 
    Constants.manifest?.extra?.expoGo !== undefined;

  const handlePickFile = async () => {
    try {
      // Get allowed file types
      const allowedTypes = question.file_types || '*/*';
      const maxSizeMB = question.max_file_size || 10;

      if (isExpoGo) {
        // Show option to use link instead
        ThemedAlert.alert(
          "File Upload Option",
          "On iOS Expo Go, you can only upload images and videos directly. For other file types, you can:\n\n1️⃣ Upload your file to Google Drive, OneDrive, or Dropbox\n2️⃣ Create a shareable link\n3️⃣ Paste the link below",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Paste Link", 
              onPress: () => setShowLinkInput(true)
            },
            { 
              text: "Pick Image/Video", 
              onPress: handlePickFileDirect
            }
          ]
        );
        return;
      }

      // For Android or dev builds - use document picker
      const file = await pickFile({
        allowedTypes,
        maxSizeMB,
      });

      if (!file) return;

      // Validate file type
      if (!isFileTypeAllowed(file.name, allowedTypes)) {
        ThemedAlert.alert(
          "Invalid File Type",
          `File type not allowed. Allowed: ${allowedTypes}`
        );
        return;
      }

      setUploading(true);
      
      // If there's an upload function, use it; otherwise store file info locally
      if (onFilePick) {
        const uploadedPath = await onFilePick(file);
        onChange(JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          path: uploadedPath || file.uri,
          source: file.type || 'document',
        }));
      } else {
        onChange(JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          path: file.uri,
          source: file.type || 'document',
        }));
      }
    } catch (err) {
      console.error("[FileUpload] Error picking file:", err);
      ThemedAlert.alert("Error", err.message || "Failed to select file.");
    } finally {
      setUploading(false);
    }
  };

  // Separate function for direct file pick (images/videos only for iOS Expo Go)
  const handlePickFileDirect = async () => {
    try {
      const allowedTypes = question.file_types || '*/*';
      const maxSizeMB = question.max_file_size || 10;

      const file = await pickFile({
        allowedTypes,
        maxSizeMB,
      });

      if (!file) return;

      setUploading(true);
      
      if (onFilePick) {
        const uploadedPath = await onFilePick(file);
        onChange(JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          path: uploadedPath || file.uri,
          source: file.type || 'document',
        }));
      } else {
        onChange(JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          path: file.uri,
          source: file.type || 'document',
        }));
      }
    } catch (err) {
      console.error("[FileUpload] Error picking file:", err);
      ThemedAlert.alert("Error", err.message || "Failed to select file.");
    } finally {
      setUploading(false);
    }
  };

  // Handle link submission
  const handleLinkSubmit = () => {
    if (!linkValue || linkValue.trim() === '') {
      ThemedAlert.alert("Error", "Please enter a valid link.");
      return;
    }

    // Basic URL validation
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(linkValue.trim())) {
      ThemedAlert.alert("Invalid Link", "Please enter a valid URL (e.g., https://drive.google.com/...).");
      return;
    }

    // Extract filename from URL if possible, otherwise use a generic name
    let fileName = 'Shared File';
    try {
      const url = new URL(linkValue);
      const pathSegments = url.pathname.split('/');
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment && lastSegment.includes('.')) {
        fileName = lastSegment;
      }
    } catch (e) {
      // Use default name if URL parsing fails
    }

    onChange(JSON.stringify({
      name: fileName,
      size: 0,
      mimeType: 'application/octet-stream',
      path: linkValue.trim(),
      source: 'link',
      isLink: true,
    }));

    setShowLinkInput(false);
    setLinkValue('');
    
    ThemedAlert.alert(
      "Link Added",
      "Your file link has been saved successfully.",
      [{ text: "OK" }]
    );
  };

  const handleRemoveFile = () => {
    onChange('');
    setShowLinkInput(false);
    setLinkValue('');
  };

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q.</Text>
        <Text style={styles.questionText}>{question.question_text}</Text>
        {question.is_required && <Text style={styles.requiredStar}>*</Text>}
      </View>
      {question.description ? (
        <Text style={styles.questionDescription}>{question.description}</Text>
      ) : null}

      {question.max_file_size && (
        <Text style={styles.fileSizeHint}>
          Maximum file size: {question.max_file_size}MB
        </Text>
      )}

      {/* iOS Expo Go hint */}
      {isExpoGo && (
        <View style={styles.iosExpoContainer}>
          <Text style={styles.fileTypeHint}>
            ℹ️ On iOS Expo Go, you can upload images/videos directly or paste a shareable link.
          </Text>
          {!fileInfo && !showLinkInput && (
            <TouchableOpacity
              style={styles.linkOptionButton}
              onPress={() => setShowLinkInput(true)}
            >
              <Ionicons name="link-outline" size={16} color="#FFD404" />
              <Text style={styles.linkOptionText}>Paste file link instead</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Link input UI */}
      {showLinkInput && (
        <View style={styles.linkInputContainer}>
          <Text style={styles.linkInputLabel}>
            Paste your shareable file link from Google Drive, OneDrive, Dropbox, etc:
          </Text>
          <TextInput
            style={[styles.linkInput, error && styles.textInputError]}
            value={linkValue}
            onChangeText={setLinkValue}
            placeholder="https://drive.google.com/file/d/..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.linkActionButtons}>
            <TouchableOpacity
              style={[styles.linkCancelButton]}
              onPress={() => {
                setShowLinkInput(false);
                setLinkValue('');
              }}
            >
              <Text style={styles.linkCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkSubmitButton]}
              onPress={handleLinkSubmit}
            >
              <Text style={styles.linkSubmitText}>Add Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {fileInfo ? (
        <View style={styles.filePreview}>
          <View style={styles.fileInfo}>
            {fileInfo.isLink ? (
              <Ionicons name="link-outline" size={24} color="#FFD404" />
            ) : (
              <Ionicons name="document-text" size={24} color="#FFD404" />
            )}
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>{fileInfo.name}</Text>
              {fileInfo.isLink ? (
                <Text style={styles.fileLinkUrl} numberOfLines={1}>{fileInfo.path}</Text>
              ) : (
                <Text style={styles.fileSize}>{formatFileSize(fileInfo.size)}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.removeFileButton}
            onPress={handleRemoveFile}
          >
            <Ionicons name="close-circle" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      ) : (
        !showLinkInput && (
          <TouchableOpacity
            style={[styles.uploadButton, error && styles.textInputError]}
            onPress={handlePickFile}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFD404" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color="#FFD404" />
                <Text style={styles.uploadButtonText}>Tap to upload file</Text>
                {isExpoGo && (
                  <Text style={styles.uploadSubText}>or paste link above</Text>
                )}
              </>
            )}
          </TouchableOpacity>
        )
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const SectionQuestionsScreen = ({ navigation, route }) => {
  const { phase, section, sectionIndex, alumniId, totalSections, programType } = route.params;
  const questions = section?.questions || [];

  console.log("[SectionQuestions] Route params:", {
    alumniId,
    programType,
    sectionId: section?.id,
    sectionTitle: section?.title,
  });
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [responseId, setResponseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const saveQueueRef = useRef(Promise.resolve());   

    const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => (a.order_priority || 0) - (b.order_priority || 0)),
    [questions]
  );

  // Filter by branching conditions — recomputes whenever answers change
  const visibleQuestions = useMemo(
    () => getVisibleQuestions(sortedQuestions, answers),
    [sortedQuestions, answers]
  );

  // If branching hides the current question, snap back to the last visible one
  useEffect(() => {
    if (currentQuestionIndex >= visibleQuestions.length && visibleQuestions.length > 0) {
      setCurrentQuestionIndex(visibleQuestions.length - 1);
    }
  }, [visibleQuestions.length, currentQuestionIndex]);


  const currentQuestion = visibleQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === visibleQuestions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const submittingRef = useRef(false);

  // In SectionQuestionsScreen component - add isExpoGo constant at top
  const isExpoGo = Platform.OS === 'ios' && 
    Constants.manifest?.extra?.expoGo !== undefined;

  useFocusEffect(
    useCallback(() => {
      if (!alumniId) {
        ThemedAlert.alert("Session Error", "Missing alumni ID. Please log in again.");
        navigation.goBack();
        return;
      }
      if (!programType) {
        ThemedAlert.alert("Session Error", "Tracer type not specified. Please go back.");
        navigation.goBack();
        return;
      }
      initializeResponse();
    }, [alumniId, programType])
  );

  const initializeResponse = async () => {
    try {
      setLoading(true);
      
      const formId = phase?.form_id;
      if (!formId) {
        ThemedAlert.alert("Error", "Unable to determine form ID.");
        navigation.goBack();
        return;
      }

      if (!programType) {
        console.error("[SectionQuestions] Missing programType in route params");
        ThemedAlert.alert(
          "Session Error",
          "Tracer type not specified. Please go back and try again."
        );
        navigation.goBack();
        return;
      }

      // 🔥 NOW with programType — creates/fetches the right response
      const draft = await getOrCreateDraftResponse(alumniId, formId, programType);
      setResponseId(draft.id);

      const draftAnswers = await getDraftAnswers(draft.id);
      
      const existingAnswers = {};
      draftAnswers.forEach(ans => {
        const q = sortedQuestions.find(q => q.id === ans.question_id);

        // For grid questions, reconstruct the JSON value
        if (ans.grid_row_id && ans.answer_value) {
          if (!existingAnswers[ans.question_id]) {
            existingAnswers[ans.question_id] = {};
          }
          existingAnswers[ans.question_id][ans.grid_row_id] = ans.answer_value;
          return;
        }

      if (q && ['multiple_choice', 'dropdown', 'checkboxes'].includes(q.type)) {
        const opts = q.options || [];
        const raw = ans.answer_value || '';

        // Find the "Other" option (fall back to label match)
        const otherOpt = opts.find(o => o.is_other)
                      || opts.find(o => o.option_label === 'Other');

        if (q.type === 'checkboxes') {
          const parts = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];

          const matchedLabels = [];
          const unmatchedText = [];

          parts.forEach(part => {
            // 1) Does it match an option label directly?
            const byLabel = opts.find(o => o.option_label === part);
            if (byLabel) {
              matchedLabels.push(byLabel.option_label);
              return;
            }
            // 2) Does it match an option ID? (legacy drafts)
            const asInt = parseInt(part, 10);
            const byId = !isNaN(asInt) ? opts.find(o => o.id === asInt) : null;
            if (byId) {
              matchedLabels.push(byId.option_label);
              return;
            }
            // 3) Otherwise, it's free-text "Other"
            unmatchedText.push(part);
          });

          // If the "Other" sentinel was selected, we should also keep its label as selected
          if (unmatchedText.length > 0 && otherOpt) {
            if (!matchedLabels.includes(otherOpt.option_label)) {
              matchedLabels.push(otherOpt.option_label);
            }
          }

          existingAnswers[ans.question_id] = matchedLabels.join(',');
          if (unmatchedText.length > 0) {
            existingAnswers[`${ans.question_id}_other`] = unmatchedText.join(', ');
          }
          return;
        }

        // Single-select (multiple_choice, dropdown)
        // 1) Label match
        const byLabel = opts.find(o => o.option_label === raw);
        if (byLabel) {
          existingAnswers[ans.question_id] = byLabel.option_label;
          return;
        }
        // 2) ID match (legacy)
        const asInt = parseInt(raw, 10);
        const byId = !isNaN(asInt) ? opts.find(o => o.id === asInt) : null;
        if (byId) {
          existingAnswers[ans.question_id] = byId.option_label;
          return;
        }

        // 3) Fallback: is the answer actually linked to the "Other" option?
        //    We can tell by looking at ans.selections (which the query already includes).
        const linkedOptionIds = (ans.selections || [])
          .map(s => s.option_id)
          .filter(Boolean);

        const linkedOtherOption = otherOpt
          ? linkedOptionIds.includes(otherOpt.id)
          : false;

        if (otherOpt && linkedOtherOption) {
          // Legit "Other" answer — restore text
          existingAnswers[ans.question_id] = otherOpt.option_label;
          existingAnswers[`${ans.question_id}_other`] = raw;
        } else if (otherOpt && !/^\d+$/.test(raw) && raw.length > 0) {
          // Heuristic: non-numeric, non-empty, question has an Other option
          // Probably a legacy "Other" answer — safest to restore as Other text
          existingAnswers[ans.question_id] = otherOpt.option_label;
          existingAnswers[`${ans.question_id}_other`] = raw;
        } else {
          // Nothing matched — treat as raw (will show as unmatched, but won't
          // masquerade as Other)
          existingAnswers[ans.question_id] = raw;
        }
        return;

      }

        // Everything else: raw answer_value
        existingAnswers[ans.question_id] = ans.answer_value;
      });
      
      // Convert grid objects to JSON strings
      Object.keys(existingAnswers).forEach(qId => {
        if (typeof existingAnswers[qId] === 'object' && !Array.isArray(existingAnswers[qId])) {
          existingAnswers[qId] = JSON.stringify(existingAnswers[qId]);
        }
      });
      
setAnswers(existingAnswers);

// Compute visible questions with the restored answers, so the index
// points into the correct array (visibleQuestions, not sortedQuestions).
const initialVisible = getVisibleQuestions(sortedQuestions, existingAnswers);
const firstUnanswered = initialVisible.findIndex(q => !existingAnswers[q.id]);
setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
      
    } catch (error) {
      console.error("[SectionQuestions] Init error:", error);
      ThemedAlert.alert("Error", "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  };

  const animateTransition = (callback) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(callback, 150);
  };

const handleFileUpload = async (file) => {
  try {
    console.log('[FileUpload] Handling file:', file.name, 'Size:', file.size);
    
    // For Android or development builds - upload to server
    if (Platform.OS === 'android' || !isExpoGo) {
      console.log('[FileUpload] Uploading to server...');
      const uploadedPath = await uploadTracerFile(responseId, currentQuestion.id, file);
      return uploadedPath;
    }
    
    // For iOS Expo Go - store file locally
    console.log('[FileUpload] iOS Expo Go - storing locally...');
    
    // Create uploads directory if it doesn't exist
    const uploadDir = `${FileSystem.documentDirectory}uploads/`;
    const dirInfo = await FileSystem.getInfoAsync(uploadDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(uploadDir, { intermediates: true });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${timestamp}_${file.name}`;
    const destination = `${uploadDir}${fileName}`;
    
    // Copy file to app's local storage
    await FileSystem.copyAsync({
      from: file.uri,
      to: destination,
    });
    
    console.log('[FileUpload] File stored locally at:', destination);
    return destination;
  } catch (error) {
    console.error("[SectionQuestions] File upload error:", error);
    ThemedAlert.alert("Upload Error", "Failed to process file. Please try again.");
    throw error;
  }
};

  const getRequiredAnswerError = (question, value) => {
    const isBlank = value === undefined || value === null ||
      (typeof value === 'string' && value.trim() === '');

    if (isBlank) {
      return 'This question requires an answer, Commander!';
    }

    if (question.type === 'likert_scale' || question.type === 'multiple_choice_grid') {
      try {
        const gridData = typeof value === 'string' ? JSON.parse(value) : value;
        const rows = question.grid_rows || [];
        const allRowsAnswered = rows.length > 0 && rows.every(row => {
          const selectedColumn = gridData?.[row.id];
          return selectedColumn !== undefined && selectedColumn !== null && String(selectedColumn).trim() !== '';
        });

        if (!allRowsAnswered) {
          return 'Please answer every row before continuing, Commander!';
        }
      } catch (error) {
        return 'Please answer every row before continuing, Commander!';
      }
    }

    if (question.type === 'file_upload') {
      try {
        const fileData = typeof value === 'string' ? JSON.parse(value) : value;
        if (!fileData?.path && !fileData?.name) {
          return 'Please upload a file before continuing, Commander!';
        }
      } catch (error) {
        return 'Please upload a file before continuing, Commander!';
      }
    }

    if (['multiple_choice', 'dropdown', 'checkboxes'].includes(question.type)) {
      const selectedValues = question.type === 'checkboxes'
        ? String(value).split(',').map(item => item.trim()).filter(Boolean)
        : [value];
      const otherOption = (question.options || []).find(option => option.is_other) ||
        (question.options || []).find(option => option.option_label === 'Other');

      if (otherOption && selectedValues.includes(otherOption.option_label)) {
        const otherText = answers[`${question.id}_other`];
        if (!otherText || otherText.trim() === '') {
          return 'Please specify your answer before continuing, Commander!';
        }
      }
    }

    return null;
  };

  const saveCurrentAnswer = async () => {
    if (!responseId || !currentQuestion) return;

    let value = answers[currentQuestion.id];
    const questionType = currentQuestion.type;
    
    if (currentQuestion.is_required) {
      const validationError = getRequiredAnswerError(currentQuestion, value);
      if (validationError) {
        setErrors(prev => ({ ...prev, [currentQuestion.id]: validationError }));
        return false;
      }
    }

    setErrors(prev => {
      const nextErrors = { ...prev };
      delete nextErrors[currentQuestion.id];
      return nextErrors;
    });
    setSaving(true);

    try {
      let selections = undefined;

      switch (questionType) {
      case 'multiple_choice':
      case 'dropdown':
        if (value) {
          const opt = (currentQuestion.options || []).find(o => o.option_label === value);
          if (opt) {
            selections = [{ optionId: opt.id, gridColumnId: null }];
          }
          // 🆕 If the selected option is "Other", save the typed text as the answer_value
          if (opt?.is_other || opt?.option_label === 'Other') {
            const otherText = answers[`${currentQuestion.id}_other`] || '';
            value = otherText || value;
          }
        }
        break;

      case 'checkboxes':
        if (value) {
          const labels = value.split(',').map(s => s.trim());
          selections = labels
            .map(label => (currentQuestion.options || []).find(o => o.option_label === label))
            .filter(Boolean)
            .map(opt => ({ optionId: opt.id, gridColumnId: null }));

          // 🆕 If "Other" is checked, replace it with the typed text in answer_value
          const hasOther = selections.some(s => {
            const opt = (currentQuestion.options || []).find(o => o.id === s.optionId);
            return opt?.is_other || opt?.option_label === 'Other';
          });
          if (hasOther) {
            const otherText = answers[`${currentQuestion.id}_other`] || '';
            // Replace the "Other" label in the value with the typed text
            const replacedLabels = labels.map(l => {
              const opt = (currentQuestion.options || []).find(o => o.option_label === l);
              const isOther = opt?.is_other || opt?.option_label === 'Other';
              return isOther ? otherText : l;
            });
            value = replacedLabels.join(',');
          }
        }
        break;
          
        case 'likert_scale':
        case 'multiple_choice_grid':
          if (value) {
            const gridData = JSON.parse(value);
            selections = Object.entries(gridData).map(([rowId, colId]) => ({
              optionId: null,
              gridColumnId: parseInt(colId),
              gridRowId: parseInt(rowId),
            }));
            
            // 🆕 Parallel saves — all rows go at once
            await Promise.all(
              selections.map(selection =>
                saveAnswerDraft(
                  responseId,
                  currentQuestion.id,
                  selection.gridColumnId?.toString() || '',
                  {
                    selections: [{
                      optionId: null,
                      gridColumnId: selection.gridColumnId,
                    }],
                    gridRowId: selection.gridRowId,
                  }
                )
              )
            );
            setSaving(false);
            return true;
          }
          break;
          
        case 'file_upload':
          // Value is JSON string with file info
          if (value) {
            const fileData = JSON.parse(value);
            await saveAnswerDraft(
              responseId,
              currentQuestion.id,
              fileData.path || fileData.name,
              {
                filePath: fileData.path,
                fileName: fileData.name,
              }
            );
            setSaving(false);
            return true;
          }
          break;
          
        default:
          // short_answer, paragraph - no selections needed
          selections = undefined;
          break;
      }

      await saveAnswerDraft(
        responseId, 
        currentQuestion.id, 
        value || '', 
        { selections }
      );
      return true;
    } catch (error) {
      console.error("[SectionQuestions] Save error:", error);
      ThemedAlert.alert("Error", "Failed to save answer.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (submitting || saving) return;

    const saved = await saveCurrentAnswer();
    if (!saved) return;

    if (isLastQuestion) {
      handleSubmit();
    } else {
      animateTransition(() => {
        setCurrentQuestionIndex(prev => Math.min(prev + 1, visibleQuestions.length - 1));
      });
    }
  };

  const handlePrevious = () => {
    animateTransition(() => {
      setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
    });
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    setSubmitting(true);

    try {
      const saved = await saveCurrentAnswer();
      if (!saved) {
        submittingRef.current = false;
        return;
      }

    await saveQueueRef.current;

    const isFinalSection = sectionIndex === totalSections - 1;

    // Only mark the response as 'completed' when the alumnus
    // finishes the LAST section of the tracer. For all other sections,
    // completion is derived from answered questions (see getTracerProgress).
    // This avoids the fragile "legacy validation path" in submitDraftResponse,
    // which ignores branching conditions.
    if (isFinalSection) {
      await submitDraftResponse(responseId, { forceComplete: true });
    }

    navigation.replace("SectionComplete", {
      phase: phase,
      section: section,
      sectionIndex: sectionIndex,
      totalSections: totalSections,
      alumniId: alumniId,
      questionsAnswered: sortedQuestions.length,
      programType: programType, // 👈 pass along, good hygiene
    });
    
    } catch (error) {
      console.error("[SectionQuestions] Submit error:", error);
      ThemedAlert.alert("Error", "Failed to submit answers. Please try again.");
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const value = answers[currentQuestion.id] || '';
    const error = errors[currentQuestion.id];

    switch (currentQuestion.type) {
      case 'short_answer':
        return (
          <ShortAnswerInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      case 'paragraph':
        return (
          <ParagraphInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      case 'multiple_choice':
        return (
          <MultipleChoiceInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            otherValue={answers[`${currentQuestion.id}_other`] || ''}
            onOtherChange={(text) => handleAnswerChange(`${currentQuestion.id}_other`, text)}
            error={error}
          />
        );
      case 'checkboxes':
        return (
          <CheckboxesInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            otherValue={answers[`${currentQuestion.id}_other`] || ''}
            onOtherChange={(text) => handleAnswerChange(`${currentQuestion.id}_other`, text)}
            error={error}
          />
        );
      case 'dropdown':
        return (
          <DropdownInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            otherValue={answers[`${currentQuestion.id}_other`] || ''}
            onOtherChange={(text) => handleAnswerChange(`${currentQuestion.id}_other`, text)}
            error={error}
          />
        );
      case 'likert_scale':
        return (
          <LikertScaleInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      case 'multiple_choice_grid':
        return (
          <MultipleChoiceGridInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
      case 'file_upload':
        return (
          <FileUploadInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
            onFilePick={handleFileUpload}
          />
        );
      default:
        return (
          <ShortAnswerInput
            question={currentQuestion}
            value={value}
            onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            error={error}
          />
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
     
        <TopHeaderDark />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD404" />
          <Text style={styles.loadingText}>Loading mission data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
  
      <TopHeaderDark />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StarField />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFD404" />
            <Text style={styles.backButtonText}>Back to Objectives</Text>
          </TouchableOpacity>

          <View style={styles.sectionInfo}>
            <Text style={styles.sectionLabel}>OBJECTIVE {String(sectionIndex + 1).padStart(2, '0')}</Text>
            <Text style={styles.sectionTitle} numberOfLines={2}>{section.title}</Text>
          </View>

          <QuestionProgress
            current={currentQuestionIndex + 1}
            total={visibleQuestions.length}
          />
              
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderQuestion()}
          </Animated.View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrev, isFirstQuestion && styles.navButtonDisabled]}
              onPress={handlePrevious}
              disabled={isFirstQuestion}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={18}
                color={isFirstQuestion ? 'rgba(255,255,255,0.2)' : '#FFD404'}
              />
              <Text style={[styles.navButtonText, isFirstQuestion && styles.navButtonTextDisabled]}>
                Prev
              </Text>
            </TouchableOpacity>

            {/* Updated Question Dots with scroll */}
            <QuestionDots
              questions={visibleQuestions}
              answers={answers}
              currentIndex={currentQuestionIndex}
              onDotPress={async (index) => {
                if (submitting || saving || index === currentQuestionIndex) return;

                const saved = await saveCurrentAnswer();
                if (!saved) return;

                animateTransition(() => setCurrentQuestionIndex(index));
              }}
            />

            <TouchableOpacity
              style={[styles.navButton, styles.navButtonNext]}
              onPress={handleNext}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#1A237E" />
              ) : (
                <>
                  <Text style={[styles.navButtonText, styles.navButtonTextNext]}>
                    {isLastQuestion ? 'Submit' : 'Next'}
                  </Text>
                  {!isLastQuestion && (
                    <Ionicons name="arrow-forward" size={18} color="#1A237E" />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SectionQuestionsScreen;