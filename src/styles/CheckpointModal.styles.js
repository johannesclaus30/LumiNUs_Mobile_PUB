// src/styles/CheckpointModal.styles.js
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  
  /* --- HEADER --- */
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: { 
    fontFamily: 'Poppins_700Bold', 
    fontSize: 18, 
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  closeButton: { 
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  
  /* --- SCROLL CONTENT --- */
  scrollContent: { 
    padding: 20, 
    flexGrow: 1,
    paddingBottom: 40,
  },
  
  /* --- QUESTION STEPS --- */
  stepContainer: { 
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#32418C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  questionText: { 
    fontFamily: 'Poppins_700Bold', 
    fontSize: 16, 
    color: '#1E293B', 
    marginBottom: 18, 
    lineHeight: 24,
  },
  
  /* --- SCALE STEPS --- */
  optionsList: { gap: 10 },
  optionCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: '#F1F5F9', 
    backgroundColor: '#F8FAFC' 
  },
  optionCardSelected: { 
    borderColor: '#32418C', 
    backgroundColor: '#EEF2FF' 
  },
  radioCircle: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    borderWidth: 2, 
    borderColor: '#CBD5E1', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  radioCircleSelected: { borderColor: '#32418C' },
  radioInner: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: '#32418C' 
  },
  optionText: { 
    fontFamily: 'Poppins_500Medium', 
    fontSize: 14, 
    color: '#475569', 
    flex: 1 
  },
  optionTextSelected: { 
    color: '#32418C', 
    fontFamily: 'Poppins_600SemiBold' 
  },

  /* --- DROPDOWN STEPS --- */
  dropdownTrigger: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 14, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: '#F1F5F9', 
    backgroundColor: '#F8FAFC' 
  },
  dropdownTriggerText: { 
    fontFamily: 'Poppins_500Medium', 
    fontSize: 14, 
    color: '#475569', 
    flex: 1, 
    marginRight: 10 
  },
  
  /* --- DROPDOWN MODAL --- */
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    height: '75%', 
    padding: 20 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  modalTitle: { 
    fontFamily: 'Poppins_700Bold', 
    fontSize: 18, 
    color: '#1E293B' 
  },
  searchWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    marginBottom: 16 
  },
  searchInput: { 
    flex: 1, 
    paddingVertical: 12, 
    paddingHorizontal: 8, 
    fontFamily: 'Poppins_400Regular', 
    fontSize: 14,
    color: '#1E293B',
  },
  dropdownItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 14, 
    paddingHorizontal: 8,
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  dropdownItemText: { 
    fontFamily: 'Poppins_500Medium', 
    fontSize: 14, 
    color: '#334155', 
    flex: 1 
  },

  /* --- FOOTER --- */
  footer: { 
    padding: 20, 
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9',
    paddingBottom: 34, // safe area padding
  },
  nextButton: { 
    backgroundColor: '#32418C', 
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: 'center',
    shadowColor: '#32418C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonDisabled: { 
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: { 
    fontFamily: 'Poppins_700Bold', 
    fontSize: 15, 
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* --- BANNERS --- */
  introBox: {
    backgroundColor: '#EEF2FF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DCE3FA',
  },
  introTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#32418C',
    marginBottom: 8,
  },
  introText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  
  /* --- PREFILL BOX --- */
  prefillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  prefillLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#64748B',
  },
  prefillValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#1E293B',
    marginTop: 2,
  },
  
  /* --- ALERTS (Success/Warning) --- */
  successBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
  },
  successText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#166534',
    marginLeft: 10,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEFCE8',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEF08A',
    alignItems: 'center',
  },
  warningText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#854D0E',
    marginLeft: 10,
    flex: 1,
  },
});