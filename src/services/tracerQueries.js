import supabase from "./supabase";
import { isQuestionVisible } from "../utils/branching";

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// ELIGIBILITY — which tracers can this alumnus open?
// ═══════════════════════════════════════

/**
 * Returns an array of program types the alumnus can access.
 * 
 * Rules (confirmed by the Alumni Affairs Office):
 *   - SHS      → eligible if they have ANY program row with program_type='shs'
 *   - College  → eligible ONLY if they have a program row with 
 *                program_type='college' AND enrollment_status='graduated'
 *                (enrolled/dropped do NOT unlock the College tracer)
 * 
 * @param {number} alumniId
 * @returns {Promise<Array<{programType: 'shs'|'college', label: string, icon: string}>>}
 */
export const getEligibleTracers = async (alumniId) => {
  try {
    console.log("🐛 [getEligibleTracers] Called with alumniId:", alumniId, "type:", typeof alumniId);

    const { data: programs, error } = await supabase
      .from("alumni_programs")
      .select("program_type, enrollment_status, program_name")
      .eq("alumni_id", alumniId);

    console.log("🐛 [getEligibleTracers] DB returned:", programs);
    if (error) {
      console.error("🐛 [getEligibleTracers] DB error:", error);
      throw error;
    }
    if (!programs || programs.length === 0) {
      console.warn("🐛 [getEligibleTracers] No rows found for alumniId:", alumniId);
      return [];
    }

    const eligible = [];

    // SHS: any SHS row counts
    if (programs.some(p => p.program_type === 'shs')) {
      eligible.push({
        programType: 'shs',
        label: 'SHS Tracer',
        icon: 'school',
      });
    }

    // College: only if GRADUATED
    const graduatedCollege = programs.find(
      p => p.program_type === 'college' && p.enrollment_status === 'graduated'
    );
    if (graduatedCollege) {
      eligible.push({
        programType: 'college',
        label: 'College Tracer',
        icon: 'graduation-cap',
        programName: graduatedCollege.program_name,
      });
    }

    console.log("[tracer] Eligible tracers:", eligible.map(e => e.programType));
    return eligible;

  } catch (error) {
    console.error("[tracer] getEligibleTracers error:", error.message);
    return [];
  }
};

const normalizeCondition = (condition) => {
  // Supabase returns `{}` (empty object) when there's no matching row
  // for a 1:1 embed. Treat that as "no condition".
  if (!condition || !condition.depends_on_question_id) return null;

  const labels = Array.isArray(condition.option_labels)
    ? condition.option_labels.map(l => l.option_label)
    : [];
  return {
    dependsOnQuestionId: condition.depends_on_question_id,
    matchType: condition.match_type || 'any',
    optionLabels: labels,
  };
};

// Walk phases → sections → questions and normalize each question's condition
const attachConditions = (phases) => {
  (phases || []).forEach(phase => {
    phase.sections?.forEach(section => {
      section.questions?.forEach(question => {
        question.condition = normalizeCondition(question.condition);
      });
    });
  });
  return phases;
};

/**
 * Fetch tracer phases applicable to a specific program type.
 * 
 * @param {'shs'|'college'} programType - which tracer to fetch phases for
 * @returns {Promise<Array>} phases with nested sections/questions
 */
export const getTracerForms = async (programType) => {
  try {
    if (!programType) {
      console.warn("[tracer] getTracerForms called without programType");
      return [];
    }

    let query = supabase
      .from("tracer_phases")
      .select(`
        id,
        form_id,
        title,
        subtitle,
        icon,
        color,
        order_priority,
        target_alumni_type,
        sections:tracer_sections(
          id,
          title,
          description,
          order_priority,
          questions:tracer_questions(
            id,
            type,
            question_text,
            description,
            placeholder,
            is_required,
            order_priority,
            file_types,
            max_file_size,
            options:tracer_question_options(id, option_label, order_priority, is_other),
            grid_rows:tracer_grid_rows(id, row_label, order_priority),
            grid_columns:tracer_grid_columns(id, column_label, order_priority),
            condition:tracer_question_conditions!tracer_question_conditions_question_id_fkey(
              id,
              depends_on_question_id,
              match_type,
              option_labels:tracer_question_condition_options(option_label)
            )
          )
        )
      `)
      .eq("is_archived", false)
      .order("order_priority", { ascending: true });

    // Return phases for 'all' + this specific program type
    query = query.or(`target_alumni_type.eq.all,target_alumni_type.eq.${programType}`);

    const { data: phases, error } = await query;
    if (error) throw error;

    console.log(
      `[tracer] Phases fetched for ${programType}:`,
      phases?.length || 0
    );

    if (phases) {
      phases.forEach(phase => {
        if (phase.sections) {
          phase.sections.sort((a, b) => a.order_priority - b.order_priority);
          phase.sections.forEach(section => {
            if (section.questions) {
              section.questions.sort((a, b) => a.order_priority - b.order_priority);
            }
          });
        }
      });

      // Normalize branching conditions
      attachConditions(phases);
    }

    return phases || [];

  } catch (error) {
    console.error("[tracer] getTracerForms error:", error.message);
    throw error;
  }
};

/**
 * Get a single phase by ID
 */
export const getPhaseById = async (phaseId) => {
  try {
    const { data, error } = await supabase
  .from("tracer_phases")
  .select(`
    id,
    form_id,
    title,
    subtitle,
    icon,
    color,
    order_priority,
    sections:tracer_sections(
      id,
      title,
      description,
      order_priority,
      questions:tracer_questions(
        id,
        type,
        question_text,
        description,
        placeholder,
        is_required,
        order_priority,
        file_types,
        max_file_size,
        options:tracer_question_options(id, option_label, order_priority, is_other),
        grid_rows:tracer_grid_rows(id, row_label, order_priority),
        grid_columns:tracer_grid_columns(id, column_label, order_priority),
        condition:tracer_question_conditions!tracer_question_conditions_question_id_fkey(
          id,
          depends_on_question_id,
          match_type,
          option_labels:tracer_question_condition_options(option_label)
        )
      )
    )
  `)
  .eq("id", phaseId)
  .single();

    if (error) throw error;

    // 🆕 Normalize branching conditions on a single phase
    if (data) {
      [data].forEach(phase => {
        phase.sections?.forEach(section => {
          section.questions?.forEach(question => {
            question.condition = normalizeCondition(question.condition);
          });
        });
      });
    }

    return data;
    
  } catch (error) {
    console.error("[tracer] Get phase error:", error.message);
    throw error;
  }
};

/**
 * Get tracer progress for a specific alumni + program type.
 * 
 * @param {number} alumniId
 * @param {'shs'|'college'} programType
 * @returns {Promise<{completedSections, totalSections, completedSectionIds, status, responseId}>}
 */
export const getTracerProgress = async (alumniId, programType) => {
  const EMPTY = {
    completedSections: 0,
    totalSections: 0,
    completedSectionIds: [],
    status: null,
    responseId: null,
  };

  try {
    if (!programType) {
      console.warn("[tracer] getTracerProgress called without programType");
      return EMPTY;
    }

    // 1. Find the response for THIS program type
    const { data: response, error: responseError } = await supabase
      .from("tracer_responses")
      .select("id, form_id, status")
      .eq("alumni_id", alumniId)
      .eq("program_type", programType)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (responseError) throw responseError;
    if (!response) return EMPTY;

    // 2. Fetch phases for this form + program type
    let phasesQuery = supabase
      .from("tracer_phases")
      .select(`
        id,
        target_alumni_type,
        sections:tracer_sections(
          id,
          questions:tracer_questions(
            id,
            type,
            options:tracer_question_options(id, option_label, is_other),
            condition:tracer_question_conditions!tracer_question_conditions_question_id_fkey(
              id,
              depends_on_question_id,
              match_type,
              option_labels:tracer_question_condition_options(option_label)
            )
          )
        )
      `)
      .eq("form_id", response.form_id)
      .eq("is_archived", false);

    phasesQuery = phasesQuery.or(
      `target_alumni_type.eq.all,target_alumni_type.eq.${programType}`
    );

    const { data: phases, error: phasesError } = await phasesQuery;
    if (phasesError) throw phasesError;

    // 3. Fetch answers for this response
    const { data: answers, error: answersError } = await supabase
      .from("tracer_answers_base")
      .select("question_id")
      .eq("tracer_response_id", response.id);

    if (answersError) throw answersError;

    const answeredQuestionIds = new Set(
      (answers || []).map((a) => a.question_id)
    );

    // 4. Fetch full answers WITH selections for branching evaluation
    const { data: fullAnswers, error: fullAnswersError } = await supabase
      .from("tracer_answers_base")
      .select(`
        question_id,
        answer_value,
        grid_row_id,
        question:tracer_questions(type),
        selections:tracer_answer_selections(
          option:tracer_question_options(option_label)
        )
      `)
      .eq("tracer_response_id", response.id);

    if (fullAnswersError) throw fullAnswersError;

    // Build answerMap (same shape as getAlumniAnswerMap)
    const answerMap = {};
    (fullAnswers || []).forEach((ans) => {
      const type = ans.question?.type;
      const qid = ans.question_id;

      if (ans.grid_row_id != null) {
        if (!answerMap[qid] || typeof answerMap[qid] !== 'object' || Array.isArray(answerMap[qid])) {
          answerMap[qid] = {};
        }
        answerMap[qid][ans.grid_row_id] = ans.answer_value;
        return;
      }

      if (['multiple_choice', 'dropdown', 'checkboxes'].includes(type)) {
        const labels = (ans.selections || [])
          .map(s => s.option?.option_label)
          .filter(Boolean);
        answerMap[qid] = type === 'checkboxes' ? labels : (labels[0] ?? null);
        return;
      }

      answerMap[qid] = ans.answer_value;
    });

    // 5. Compute completed sections
    const completedSectionIds = [];
    let totalSections = 0;

    (phases || []).forEach((phase) => {
      (phase.sections || []).forEach((section) => {
        totalSections++;

        const normalizedQuestions = (section.questions || []).map(q => ({
          ...q,
          condition: q.condition
            ? {
                dependsOnQuestionId: q.condition.depends_on_question_id,
                matchType: q.condition.match_type || 'any',
                optionLabels: Array.isArray(q.condition.option_labels)
                  ? q.condition.option_labels.map(l => l.option_label)
                  : [],
              }
            : null,
        }));

        const visibleQuestions = normalizedQuestions.filter(q =>
          isQuestionVisible(q, answerMap)
        );

        if (visibleQuestions.length === 0) {
          completedSectionIds.push(section.id);
          return;
        }

        const allVisibleAnswered = visibleQuestions.every(q =>
          answeredQuestionIds.has(q.id)
        );

        if (allVisibleAnswered) {
          completedSectionIds.push(section.id);
        }
      });
    });

    return {
      completedSections: completedSectionIds.length,
      totalSections,
      completedSectionIds,
      status: response.status,
      responseId: response.id,
    };

  } catch (error) {
    console.error(`[tracer] getTracerProgress(${programType}) error:`, error.message);
    return { ...EMPTY, error: error.message };
  }
};

/**
 * Find or create the in-progress response for this alumni + form + program type.
 * 
 * @param {number} alumniId
 * @param {number} formId
 * @param {'shs'|'college'} programType
 */
export const getOrCreateDraftResponse = async (alumniId, formId, programType) => {
  console.log('[tracerQueries] getOrCreateDraft:', { alumniId, formId, programType });

  if (!alumniId || !formId || !['shs', 'college'].includes(programType)) {
    throw new Error('A valid alumni, tracer form, and tracer type are required.');
  }

  // 1) Find existing — MUST filter by program_type
  const { data: existing, error: findError } = await supabase
    .from('tracer_responses')
    .select('*')
    .eq('alumni_id', alumniId)
    .eq('form_id', formId)
    .eq('program_type', programType)   // 🔥 THE KEY LINE
    .maybeSingle();

  if (findError) {
    console.error('❌ getOrCreateDraft find error:', findError);
    throw findError;
  }

  if (existing) {
    console.log('✅ Found existing response:', existing.id);
    return existing;
  }

  // 2) Not found — create
  console.log('📝 Creating NEW', programType, 'draft...');
  const { data: created, error: createError } = await supabase
    .from('tracer_responses')
    .insert({
      alumni_id: alumniId,
      form_id: formId,
      program_type: programType,
      status: 'in_progress',
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Create error:', createError);

    // 🛟 Race-condition fallback
    if (createError.code === '23505') {
      const { data: retry, error: retryError } = await supabase
        .from('tracer_responses')
        .select('*')
        .eq('alumni_id', alumniId)
        .eq('form_id', formId)
        .eq('program_type', programType)
        .single();

      if (retryError) throw retryError;
      return retry;
    }

    throw createError;
  }

  return created;
};

/**
 * Helper: Create a new draft response scoped to a program type.
 */
const createNewDraftResponse = async (alumniId, formId, programType) => {
  try {
    console.log(`📝 Creating NEW ${programType} draft...`);

    const { data: newDraft, error: createError } = await supabase
      .from("tracer_responses")
      .insert([{
        alumni_id: alumniId,
        form_id: formId,
        program_type: programType,
        status: "in_progress",
      }])
      .select()
      .single();

    if (createError) {
      console.error("❌ Create error:", createError);
      throw createError;
    }

    console.log("✅ New draft created:", newDraft.id);
    return newDraft;

  } catch (error) {
    console.error("❌ createNewDraftResponse error:", error.message);
    throw error;
  }
};

/**
 * Save answer draft.
 * Handles both single-row answers (short_answer, multiple_choice, etc.)
 * and multi-row answers (likert_scale / multiple_choice_grid — one row per grid row).
 */
export const saveAnswerDraft = async (responseId, questionId, value, options = {}) => {
  try {
    const { filePath, fileName, gridRowId, selections } = options;

    console.log("💾 Saving answer:", {
      responseId,
      questionId,
      gridRowId: gridRowId ?? null,
      value: value?.toString().substring(0, 30),
      hasSelections: !!selections,
    });

    // ─────────────────────────────────────────
    // Find the existing row for this (response, question, gridRow) combo
    // ─────────────────────────────────────────
    let existingQuery = supabase
      .from("tracer_answers_base")
      .select("id")
      .eq("tracer_response_id", responseId)
      .eq("question_id", questionId);

    // For grid questions, match on grid_row_id so each row has its own answer row
    if (gridRowId !== undefined && gridRowId !== null) {
      existingQuery = existingQuery.eq("grid_row_id", gridRowId);
    } else {
      // For non-grid questions, we want the one row with NULL grid_row_id
      existingQuery = existingQuery.is("grid_row_id", null);
    }

    // ✅ The fix: order + limit 1 before maybeSingle, so 2+ rows won't blow up
    const { data: existingData, error: existingError } = await existingQuery
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    let answerId;

    if (existingData) {
      console.log("🔄 Updating existing answer:", existingData.id);
      const { error } = await supabase
        .from("tracer_answers_base")
        .update({
          answer_value: value,
          file_path: filePath || null,
          file_name: fileName || null,
        })
        .eq("id", existingData.id);

      if (error) throw error;
      answerId = existingData.id;
    } else {
      console.log("➕ Creating new answer...");
      const { data, error } = await supabase
        .from("tracer_answers_base")
        .insert([{
          tracer_response_id: responseId,
          question_id: questionId,
          answer_value: value,
          file_path: filePath || null,
          file_name: fileName || null,
          grid_row_id: gridRowId ?? null,
        }])
        .select()
        .single();

      if (error) throw error;
      answerId = data.id;
    }

    // ─────────────────────────────────────────
    // Handle selections
    // ─────────────────────────────────────────
    if (selections !== undefined) {
      console.log("🔗 Updating selections for answer:", answerId, selections);

      await supabase
        .from("tracer_answer_selections")
        .delete()
        .eq("tracer_answer_id", answerId);

      if (selections && selections.length > 0) {
        const selectionRecords = selections.map((sel) => ({
          tracer_answer_id: answerId,
          option_id: sel.optionId || null,
          grid_column_id: sel.gridColumnId || null,
        }));

        const { error: insertError } = await supabase
          .from("tracer_answer_selections")
          .insert(selectionRecords);

        if (insertError) throw insertError;
      }
    }

    console.log("✅ Answer saved successfully:", answerId);
    return { id: answerId, question_id: questionId, answer_value: value };
  } catch (error) {
    console.error("❌ saveAnswerDraft error:", error.message, error);
    throw error;
  }
};

/**
 * Get draft answers for a response
 */
export const getDraftAnswers = async (responseId) => {
  try {
    console.log("📖 Fetching draft answers for response:", responseId);
    
    const { data, error } = await supabase
      .from("tracer_answers_base")
      .select(`
        id,
        question_id,
        answer_value,
        file_path,
        file_name,
        grid_row_id,
        selections:tracer_answer_selections(
          id,
          option_id,
          grid_column_id
        )
      `)
      .eq("tracer_response_id", responseId);

    if (error) throw error;
    
    console.log("📖 Draft answers fetched:", data?.length || 0);
    return data || [];
  } catch (error) {
    console.error("❌ getDraftAnswers error:", error.message);
    throw error;
  }
};

export const submitDraftResponse = async (responseId, options = {}) => {
  const { forceComplete = false } = options;
  try {
    console.log("📤 Submitting response:", responseId, "forceComplete:", forceComplete);

    const { data: response, error: rErr } = await supabase
      .from("tracer_responses")
      .select("id, form_id, alumni_id")
      .eq("id", responseId)
      .single();

    if (rErr) throw rErr;
    if (!response) throw new Error("Response not found");

    let payload;

    if (forceComplete) {
      // Trust the client — alumni finished the last visible section
      payload = { status: "completed", submitted_at: new Date().toISOString() };
    } else {
      // Legacy path: check every question answered
      const { data: questions, error: qErr } = await supabase
        .from("tracer_questions")
        .select(`id, section:tracer_sections!inner(phase:tracer_phases!inner(form_id))`)
        .eq("section.phase.form_id", response.form_id);

      if (qErr) throw qErr;

      const { data: answers, error: aErr } = await supabase
        .from("tracer_answers_base")
        .select("question_id")
        .eq("tracer_response_id", responseId);

      if (aErr) throw aErr;

      const answered = new Set((answers || []).map(a => a.question_id));
      const allAnswered =
        (questions || []).length > 0 &&
        questions.every(q => answered.has(q.id));

      payload = allAnswered
        ? { status: "completed", submitted_at: new Date().toISOString() }
        : { status: "in_progress" };
    }

    const { data, error } = await supabase
      .from("tracer_responses")
      .update(payload)
      .eq("id", responseId)
      .select()
      .single();

    if (error) throw error;
    console.log("✅ Response submitted:", data?.id, "status:", data?.status);
    return data;
  } catch (error) {
    console.error("❌ submitDraft error:", error.message);
    throw error;
  }
};

export const uploadTracerFile = async (responseId, questionId, file) => {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.mimeType,
    name: file.name,
  });
  formData.append('response_id', responseId);
  formData.append('question_id', questionId);

  const response = await api.post('/tracer/upload-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  
  return response.data.path;
};

/**
 * Count alumni who have answered EVERY question in the phases
 * that apply to their alumni type.
 */
export const getCompletedAlumniCount = async () => {
  try {
    // 1. Fetch all phases with their questions and target type
    const { data: phases, error: phasesError } = await supabase
      .from("tracer_phases")
      .select(`
        id,
        target_alumni_type,
        sections:tracer_sections(
          id,
          questions:tracer_questions(id)
        )
      `);

    if (phasesError) throw phasesError;
    if (!phases || phases.length === 0) return 0;

    // Build a question set per target type:
    //   all      → questions everyone must answer
    //   college  → questions college alumni must answer (on top of 'all')
    //   shs      → questions SHS alumni must answer
    const questionIdsByType = {
      all: new Set(),
      college: new Set(),
      shs: new Set(),
    };

    phases.forEach((phase) => {
      const type = phase.target_alumni_type || "all";
      phase.sections?.forEach((section) => {
        section.questions?.forEach((q) => {
          if (questionIdsByType[type]) {
            questionIdsByType[type].add(q.id);
          }
        });
      });
    });

    // 2. Fetch all completed responses with alumni type
    const { data: responses, error: responsesError } = await supabase
      .from("tracer_responses")
      .select(`
        id,
        alumni_id,
        status,
        alumni:alumnis_base!inner(id, alumni_type)
      `)
      .eq("status", "completed");

    if (responsesError) throw responsesError;
    if (!responses || responses.length === 0) return 0;

    // 3. Fetch all answers for those responses
    const responseIds = responses.map((r) => r.id);
    const { data: allAnswers, error: answersError } = await supabase
      .from("tracer_answers_base")
      .select("tracer_response_id, question_id")
      .in("tracer_response_id", responseIds);

    if (answersError) throw answersError;

    // Group answers by response
    const answersByResponse = new Map();
    (allAnswers || []).forEach((a) => {
      if (!answersByResponse.has(a.tracer_response_id)) {
        answersByResponse.set(a.tracer_response_id, new Set());
      }
      answersByResponse.get(a.tracer_response_id).add(a.question_id);
    });

    // 4. Count unique alumni who answered every applicable question
    const fullyCompletedAlumni = new Set();

    responses.forEach((response) => {
      const alumniType = response.alumni?.alumni_type || null;

      // Build the required question set for this alumnus
      const required = new Set(questionIdsByType.all);
      if (alumniType === "college") {
        questionIdsByType.college.forEach((id) => required.add(id));
      } else if (alumniType === "shs") {
        questionIdsByType.shs.forEach((id) => required.add(id));
      }

      if (required.size === 0) return; // no questions for this type — skip

      const answered = answersByResponse.get(response.id) || new Set();

      // Must have answered every required question
      let allDone = true;
      for (const qid of required) {
        if (!answered.has(qid)) {
          allDone = false;
          break;
        }
      }

      if (allDone) {
        fullyCompletedAlumni.add(response.alumni_id);
      }
    });

    return fullyCompletedAlumni.size;
  } catch (error) {
    console.error("[tracer] Get completed alumni count error:", error.message);
    return 0;
  }
};

// ═══════════════════════════════════════
// BRANCHING HELPERS
// ═══════════════════════════════════════

export const getAlumniAnswerMap = async (alumniId, formId, programType) => {
  try {
    if (!programType) {
      console.warn("[tracer] getAlumniAnswerMap called without programType");
      return {};
    }

    // 1. Find the response for THIS program type
    const { data: response, error: rErr } = await supabase
      .from("tracer_responses")
      .select("id")
      .eq("alumni_id", alumniId)
      .eq("form_id", formId)
      .eq("program_type", programType)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!response) return {};

    // 2. Fetch all answers with their question info + selections
    const { data: answers, error: aErr } = await supabase
      .from("tracer_answers_base")
      .select(`
        question_id,
        answer_value,
        grid_row_id,
        question:tracer_questions(type),
        selections:tracer_answer_selections(
          option:tracer_question_options(option_label)
        )
      `)
      .eq("tracer_response_id", response.id);

    if (aErr) throw aErr;

    const map = {};

    (answers || []).forEach((ans) => {
      const type = ans.question?.type;
      const qid = ans.question_id;

      // Grid questions — aggregate per row into a JSON object
      if (ans.grid_row_id != null) {
        if (!map[qid] || typeof map[qid] !== 'object' || Array.isArray(map[qid])) {
          map[qid] = {};
        }
        map[qid][ans.grid_row_id] = ans.answer_value;
        return;
      }

      if (['multiple_choice', 'dropdown', 'checkboxes'].includes(type)) {
        const labels = (ans.selections || [])
          .map(s => s.option?.option_label)
          .filter(Boolean);
        map[qid] = type === 'checkboxes' ? labels : (labels[0] ?? null);
        return;
      }

      // Everything else — raw answer_value
      map[qid] = ans.answer_value;
    });

    return map;
  } catch (error) {
    console.error("[tracer] getAlumniAnswerMap error:", error.message);
    return {};
  }
};
  
