// src/services/checkpointQueries.js
import supabase from './supabase';

export const checkCheckpointStatus = async (userId) => {
  const { data: userBase, error: baseError } = await supabase
    .from('alumnis_base')
    .select('checkpoint_completed_at, checkpoint_dismissed_at, checkpoint_last_shown_at, alumni_type')
    .eq('id', userId)
    .single();

  if (baseError) throw baseError;

  const { data: checkpointData } = await supabase
    .from('alumni_checkpoints')
    .select('*')
    .eq('alumni_id', userId)
    .maybeSingle();

  // --- NEW: Fetch the alumni's historical programs ---
  const { data: programsData } = await supabase
    .from('alumni_programs')
    .select('program_type, enrollment_status')
    .eq('alumni_id', userId);

  // If any row has program_type === 'shs' and enrollment_status === 'graduated', they have an SHS history.
  const hasShsRecord = programsData?.some(p => p.program_type === 'shs' && p.enrollment_status === 'graduated') || false;

  const requiredFields = [
    ...(userBase.alumni_type === 'shs' || hasShsRecord
      ? ['shs_strand', 'shs_satisfaction', 'shs_match_interests', 'shs_prepared', 'shs_primary_activity']
      : []),
    ...(userBase.alumni_type === 'college'
      ? ['college_program', 'college_satisfaction', 'college_prepared', 'college_would_choose_again', 'college_perceived_relation', 'college_college_influence']
      : []),
  ];
  const hasMissingAnswers = requiredFields.some((field) => {
    const value = checkpointData?.[field];
    return value === undefined || value === null || value === '';
  });

  // Completion belongs to the current education stage. A SHS checkpoint
  // must not prevent a later college checkpoint after promotion.
  const isCompleted =
    !!userBase.checkpoint_completed_at &&
    checkpointData?.checkpoint_type === userBase.alumni_type &&
    !hasMissingAnswers;

  return {
    // A new login should always remind the alumnus until this stage is complete.
    shouldShow: !isCompleted,
    alumniType: userBase.alumni_type,
    existingData: checkpointData || null, 
    isCompleted,
    hasShsRecord // <-- Return this to the modal
  };
};

export const markCheckpointShown = async (userId) => {
  await supabase
    .from('alumnis_base')
    .update({ checkpoint_last_shown_at: new Date().toISOString() })
    .eq('id', userId);
};

export const dismissCheckpoint = async (userId) => {
  const { error } = await supabase
    .from('alumnis_base')
    .update({ checkpoint_dismissed_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
};

export const completeCheckpoint = async (userId, checkpointType, payload) => {
  if (!userId || !['shs', 'college'].includes(checkpointType)) {
    throw new Error('Invalid checkpoint details.');
  }

  // Ensure payload is clean - remove any fields that shouldn't be sent
  const cleanPayload = { ...payload };
  delete cleanPayload.id;
  delete cleanPayload.created_at;
  delete cleanPayload.updated_at;
  delete cleanPayload.alumni_id;
  delete cleanPayload.checkpoint_type;

  const timestamp = new Date().toISOString();
  const { error: saveError } = await supabase
    .from('alumni_checkpoints')
    .upsert({
      alumni_id: userId,
      checkpoint_type: checkpointType,
      ...cleanPayload,
      updated_at: timestamp
    }, { onConflict: 'alumni_id' });

  if (saveError) {
    console.error("Checkpoint save error:", saveError);
    throw saveError;
  }

  // Mark the base record only after the checkpoint row has been saved.
  const { error: baseError } = await supabase
    .from('alumnis_base')
    .update({ checkpoint_completed_at: timestamp })
    .eq('id', userId);
    
  if (baseError) throw baseError;
};