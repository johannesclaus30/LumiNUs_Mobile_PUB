// src/components/checkpoint/steps/DropdownStep.js
import React, { useState, useMemo, useEffect } from 'react'; // <-- Import useEffect
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../../styles/CheckpointModal.styles';

export default function DropdownStep({ question, options, selectedValue, onSelect, placeholder = "Select an option", disabled }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  // Force close the modal if it becomes disabled
  useEffect(() => {
    if (disabled && modalVisible) {
      setModalVisible(false);
    }
  }, [disabled, modalVisible]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search]);

  const displayValue = options.find(o => o.code === selectedValue)?.label || placeholder;

  return (
    <View style={[styles.stepContainer, { marginBottom: 24 }]}>
      <Text style={styles.questionText}>{question}</Text>
      
      <TouchableOpacity 
        style={[
          styles.dropdownTrigger, 
          disabled && { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }
        ]} 
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.dropdownTriggerText, !selectedValue && { color: '#94A3B8' }, disabled && { color: '#475569' }]}>
          {displayValue}
        </Text>
        {!disabled && <Ionicons name="chevron-down" size={20} color="#64748B" />}
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
         {/* ... keep your existing modal code exactly the same ... */}
         <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Option</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    onSelect(item.code);
                    setModalVisible(false);
                    setSearch("");
                  }}
                >
                  <Text style={styles.dropdownItemText}>{item.label}</Text>
                  {selectedValue === item.code && <Ionicons name="checkmark" size={20} color="#32418C" />}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}