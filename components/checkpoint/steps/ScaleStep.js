// src/components/checkpoint/steps/ScaleStep.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../../styles/CheckpointModal.styles';

export default function ScaleStep({ question, options, selectedValue, onSelect, disabled }) {
  return (
    <View style={[styles.stepContainer, { marginBottom: 24 }]}>
      <Text style={styles.questionText}>{question}</Text>
      <View style={styles.optionsList}>
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionCard, 
                isSelected && styles.optionCardSelected,
                disabled && { backgroundColor: isSelected ? '#EEF2FF' : '#F8FAFC', opacity: isSelected ? 1 : 0.6 }
              ]}
              onPress={() => !disabled && onSelect(opt.value)}
              activeOpacity={disabled ? 1 : 0.7}
              disabled={disabled}
            >
              <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}