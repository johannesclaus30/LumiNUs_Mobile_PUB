// src/components/checkpoint/CheckpointModal.js
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../styles/CheckpointModal.styles';
import ScaleStep from './steps/ScaleStep';
import DropdownStep from './steps/DropdownStep';
import { 
  SHS_STRANDS, COLLEGE_PROGRAMS, SCALE_AGREEMENT, SCALE_SATISFACTION
} from '../../constants/tracerReference';
import { completeCheckpoint, dismissCheckpoint } from '../../services/checkpointQueries';

export default function CheckpointModal({ visible, onClose, userId, alumniType, userData, existingData, isCompleted, hasShsRecord }) {
  const [answers, setAnswers] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Determine if we should show the SHS block
  const showShsBlock = alumniType === 'shs' || hasShsRecord;

  // Define ALL required keys to determine if ANY are missing
  const allRequiredKeys = [
    ...(showShsBlock ? ['shs_strand', 'shs_satisfaction', 'shs_match_interests', 'shs_prepared', 'shs_primary_activity'] : []),
    ...(alumniType === 'college' ? ['college_program', 'college_satisfaction', 'college_prepared', 'college_would_choose_again', 'college_perceived_relation', 'college_college_influence'] : [])
  ];

  // Form is complete if ALL currently active questions are answered
  const isFormComplete = allRequiredKeys.every(key => {
    const val = answers[key];
    return val !== undefined && val !== null && val !== '';
  });

  // Determine if there are any EMPTY fields that need to be filled
  const hasEmptyFields = allRequiredKeys.some(key => {
    const val = answers[key];
    return val === undefined || val === null || val === '';
  });

  // If there are empty fields, the form must be unlocked to let them fill it.
  // If all fields are filled AND they completed it, lock it.
  const isLocked = isCompleted && !hasEmptyFields;

  useEffect(() => {
    if (visible) {
      const currentProgram = userData?.program || '';
      const matchedProgram = COLLEGE_PROGRAMS.find(p =>
        currentProgram.toLowerCase().includes(p.label.toLowerCase()) ||
        currentProgram.toLowerCase().includes(p.code.toLowerCase())
      );

      // A promoted SHS alumnus already has a checkpoint row. Merge the
      // college prefill into that row instead of treating it as a complete
      // answer set for the new college checkpoint.
      setAnswers({
        ...(existingData || {}),
        ...(!existingData?.college_program && matchedProgram
          ? { college_program: matchedProgram.code }
          : {})
      });
    }
  }, [visible, existingData, userData]);

  const handleSave = () => {
    if (!isFormComplete) {
      Alert.alert("Incomplete", "Please answer all required questions before submitting.");
      return;
    }

    // Trigger the final confirmation alert
    Alert.alert(
      "Confirm Submission",
      "Are you sure all your answers are correct? Once submitted, you will no longer be able to modify these answers.",
      [
        {
          text: "Review Again",
          style: "cancel"
        },
        {
          text: "Yes, Submit",
          style: "default",
          onPress: () => executeSave()
        }
      ]
    );
  };

    const executeSave = async () => {
    setIsSaving(true);
    try {
      // Build payload from answers, but strip out anything that should not be saved
      const { id, created_at, updated_at, alumni_id, ...cleanAnswers } = answers;
      
      // Ensure numeric fields are numbers, not strings
      const normalizedPayload = {
        ...cleanAnswers,
        college_prepared: cleanAnswers.college_prepared ? Number(cleanAnswers.college_prepared) : null,
        college_satisfaction: cleanAnswers.college_satisfaction ? Number(cleanAnswers.college_satisfaction) : null,
        college_college_influence: cleanAnswers.college_college_influence ? Number(cleanAnswers.college_college_influence) : null,
        shs_satisfaction: cleanAnswers.shs_satisfaction ? Number(cleanAnswers.shs_satisfaction) : null,
        shs_match_interests: cleanAnswers.shs_match_interests ? Number(cleanAnswers.shs_match_interests) : null,
        shs_prepared: cleanAnswers.shs_prepared ? Number(cleanAnswers.shs_prepared) : null,
      };
      
      await completeCheckpoint(userId, alumniType, normalizedPayload);
      onClose(); 
    } catch (err) {
      console.error("Failed to complete checkpoint", err);
      Alert.alert("Error", err.message || "Could not save checkpoint. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDismiss = async () => {
    try {
      if (!isLocked) {
        await dismissCheckpoint(userId);
      }
      onClose();
    } catch (err) {
      console.error("Failed to dismiss checkpoint", err);
      Alert.alert("Unable to close", err.message || "Please try again.");
    }
  };

  const updateAnswer = (key, val) => {
    if (isLocked) return; 
    setAnswers(prev => ({ ...prev, [key]: val }));
  };

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={handleDismiss} 
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alumni Checkpoint</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={[
            styles.introBox, 
            isLocked && { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1 }
          ]}>
            <Text style={[styles.introTitle, isLocked && { color: '#166534' }]}>
              {isLocked 
                ? "Checkpoint Completed" 
                : "Alumni Information"}
            </Text>
            <Text style={styles.introText}>
              {isLocked
                ? "Thank you for completing your alumni tracer. Here is a summary of your responses."
                : "Please fill out the fields below to complete your profile."}
            </Text>
          </View>

          {/* ================= SHS BRANCH ================= */}
          {showShsBlock && (
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginLeft: 4 }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#32418C' }}>
                  Senior High School Information
                </Text>
                {hasShsRecord && alumniType === 'college' && (
                  <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 }}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#64748B' }}>ARCHIVED</Text>
                  </View>
                )}
              </View>
              
              {/* SHS Fields: Locked ONLY if they are a college alumni (archive) OR if the whole form is locked */}
              <DropdownStep
                question="Which SHS strand or career pathway did you complete?"
                options={SHS_STRANDS}
                selectedValue={answers.shs_strand}
                onSelect={(val) => updateAnswer('shs_strand', val)}
                disabled={(hasShsRecord && alumniType === 'college') || isLocked} 
              />

              <ScaleStep
                question="I am satisfied with the SHS strand or career pathway I completed."
                options={SCALE_AGREEMENT}
                selectedValue={answers.shs_satisfaction}
                onSelect={(val) => updateAnswer('shs_satisfaction', val)}
                disabled={(hasShsRecord && alumniType === 'college') || isLocked}
              />

              <ScaleStep
                question="My SHS background matched my interests and abilities."
                options={SCALE_AGREEMENT}
                selectedValue={answers.shs_match_interests}
                onSelect={(val) => updateAnswer('shs_match_interests', val)}
                disabled={(hasShsRecord && alumniType === 'college') || isLocked}
              />

              <ScaleStep
                question="My SHS education prepared me for my next educational or career pursuit."
                options={SCALE_AGREEMENT}
                selectedValue={answers.shs_prepared}
                onSelect={(val) => updateAnswer('shs_prepared', val)}
                disabled={(hasShsRecord && alumniType === 'college') || isLocked}
              />

              <DropdownStep
                question="What is your current primary activity?"
                options={[
                  { code: 'college', label: 'Enrolled in college' },
                  { code: 'employed', label: 'Employed / Self-Employed' },
                  { code: 'seeking', label: 'Seeking Work' },
                  { code: 'not_seeking', label: 'Not Seeking Work' },
                  { code: 'vocational', label: 'Technical/Vocational Training' },
                  { code: 'other', label: 'Other Structured Activity' },
                ]}
                selectedValue={answers.shs_primary_activity}
                onSelect={(val) => updateAnswer('shs_primary_activity', val)}
                disabled={(hasShsRecord && alumniType === 'college') || isLocked}
              />
            </View>
          )}

          {/* ================= COLLEGE BRANCH ================= */}
          {alumniType === 'college' && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#32418C', marginBottom: 16, marginLeft: 4 }}>
                College Information
              </Text>

              <View style={styles.prefillBox}>
                <Ionicons name="school" size={20} color="#32418C" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.prefillLabel}>Your Program (from database)</Text>
                  <Text style={styles.prefillValue}>{userData?.program || "Not specified"}</Text>
                </View>
              </View>

              {!answers.college_program && (
                <DropdownStep
                  question="Please confirm your College Program"
                  options={COLLEGE_PROGRAMS}
                  selectedValue={answers.college_program}
                  onSelect={(val) => updateAnswer('college_program', val)}
                  disabled={isLocked}
                />
              )}

              <ScaleStep
                question="How satisfied are you with the college program you completed?"
                options={SCALE_SATISFACTION}
                selectedValue={answers.college_satisfaction}
                onSelect={(val) => updateAnswer('college_satisfaction', val)}
                disabled={isLocked}
              />

              <DropdownStep
                question="How well did college prepare you for employment or professional practice?"
                options={[
                  { code: '1', label: 'Not at All' },
                  { code: '2', label: 'Slightly' },
                  { code: '3', label: 'Moderately' },
                  { code: '4', label: 'Very Well' },
                  { code: '5', label: 'Extremely Well' },
                ]}
                selectedValue={answers.college_prepared ? String(answers.college_prepared) : null}
                onSelect={(val) => updateAnswer('college_prepared', parseInt(val, 10))}
                disabled={isLocked}
              />

              <DropdownStep
                question="If you could choose again, would you take the same program?"
                options={[
                  { code: 'definitely_not', label: 'Definitely Not' },
                  { code: 'probably_not', label: 'Probably Not' },
                  { code: 'unsure', label: 'Unsure' },
                  { code: 'probably_yes', label: 'Probably Yes' },
                  { code: 'definitely_yes', label: 'Definitely Yes' },
                ]}
                selectedValue={answers.college_would_choose_again}
                onSelect={(val) => updateAnswer('college_would_choose_again', val)}
                disabled={isLocked}
              />

              <DropdownStep
                question="How closely related do you perceive your college degree program to be to your career path?"
                options={[
                  { code: 'directly_related', label: 'Directly Related' },
                  { code: 'somewhat_related', label: 'Somewhat Related' },
                  { code: 'not_related', label: 'Not Related' },
                  { code: 'unsure', label: 'Unsure' },
                ]}
                selectedValue={answers.college_perceived_relation}
                onSelect={(val) => updateAnswer('college_perceived_relation', val)}
                disabled={isLocked}
              />

              <ScaleStep
                question="How much did your college program influence your career choice?"
                options={[
                  { value: 1, label: "Not at All" },
                  { value: 2, label: "Slightly" },
                  { value: 3, label: "Moderately" },
                  { value: 4, label: "Very Much" },
                  { value: 5, label: "Extremely" },
                ]}
                selectedValue={answers.college_college_influence}
                onSelect={(val) => updateAnswer('college_college_influence', val)}
                disabled={isLocked}
              />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {isLocked ? (
            <TouchableOpacity style={styles.nextButton} onPress={onClose}>
              <Text style={styles.nextButtonText}>Saved</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.nextButton, (!isFormComplete || isSaving) && styles.nextButtonDisabled]} 
              disabled={!isFormComplete || isSaving}
              onPress={handleSave}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {isFormComplete ? "Submit Checkpoint" : "Answer all required fields to submit"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}