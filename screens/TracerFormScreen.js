import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  StatusBar,
  TextInput,
  TouchableOpacity,
  BackHandler,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "../styles/TracerFormScreen.styles";
import {
  getTracerFormById,
  hasSubmittedForm,
  getOrCreateDraftResponse,
  getDraftAnswers,
  saveAnswerDraft,
  submitDraftResponse,
  submitTracerForm,
} from "../services/tracerQueries";
import { getCurrentUser } from "../services/supabaseAuth";
import { getAlumniByEmail } from "../services/alumniQueries";
import { ThemedAlert } from "../components/ThemedAlert";

const normalizeType = (type, hasOptions) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("check")) return "checkbox";
  if (t.includes("drop") || t.includes("select")) return "dropdown";
  if (t.includes("area") || t.includes("long")) return "textarea";
  if (t.includes("text") && !hasOptions) return "text";
  if (t.includes("radio") || hasOptions) return "radio";
  return "text";
};

const parseSettingsOptions = (settings) => {
  if (!settings) return [];
  let parsed;
  try {
    parsed = typeof settings === "string" ? JSON.parse(settings) : settings;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed?.options)) return [];
  return parsed.options.map((opt) => {
    if (typeof opt === "string") {
      return { option_label: opt, option_value: opt };
    }
    return {
      option_label: opt?.label || opt?.option_label || String(opt?.value || ""),
      option_value: opt?.value || opt?.option_value || opt?.label || "",
    };
  });
};

// ==========================================
// 🚨 IRONCLAD VALIDATION ENGINE 🚨
// ==========================================

const isQuestionRequired = (q) => {
  if (!q) return false;
  const req = q.is_required ?? q.isRequired ?? q.required;
  if (req === true || req === 1) return true;
  if (typeof req === "string") {
    const str = req.trim().toLowerCase();
    return ["true", "1", "yes", "t", "required", "on", "checked"].includes(str);
  }
  return false;
};

// IMPENETRABLE CHECK: Strips all hidden database string artifacts to check true emptiness
const isFieldAnswered = (val) => {
  if (val === undefined || val === null) return false;

  const isSubstantial = (v) => {
    if (v === undefined || v === null) return false;
    // Aggressively strip quotes, brackets, braces, and spaces
    const stripped = String(v).replace(/['"\[\]\{\}]/g, "").trim().toLowerCase();
    if (stripped === "" || stripped === "null" || stripped === "undefined" || stripped === "object object") {
      return false;
    }
    return true;
  };

  if (Array.isArray(val)) {
    if (val.length === 0) return false;
    return val.some(isSubstantial);
  }

  if (typeof val === "object") {
    const vals = Object.values(val);
    if (vals.length === 0) return false;
    return vals.some(isSubstantial);
  }

  return isSubstantial(val);
};

const getSanitizedValue = (question, val) => {
  if (val === undefined || val === null || val === "") return "";
  
  const options = Array.isArray(question?._options) ? question._options : [];
  const rawType = String(question?.type || "").toLowerCase();
  const isTextType = rawType.includes("text") || rawType.includes("area") || rawType.includes("long");

  // Bypass option sanitization for pure text inputs
  if (isTextType || options.length === 0) {
    return val;
  }

  const validIds = new Set(
    options.map((opt) => String(opt.id || opt.option_value || opt.option_label)).filter(Boolean)
  );

  let checkVal = val;
  if (typeof checkVal === "string" && checkVal.trim().startsWith("[") && checkVal.trim().endsWith("]")) {
    try {
      const parsed = JSON.parse(checkVal);
      if (Array.isArray(parsed)) checkVal = parsed;
    } catch (e) {}
  }

  if (Array.isArray(checkVal)) {
    if (validIds.size === 0) return [];
    return checkVal.map(String).filter((v) => validIds.has(v));
  }

  if (validIds.has(String(checkVal))) {
    return String(checkVal);
  }

  return "";
};

const serializeAnswerForDraft = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return ""; 
    return JSON.stringify(value);
  }
  if (value === undefined || value === null || value === "") {
    return "";
  }
  return String(value);
};

const hydrateDraftAnswer = (value) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return value;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : value;
  } catch {
    return value;
  }
};

const TracerFormScreen = ({ route, navigation }) => {
  const initialTracer = route?.params?.tracer || {};
  const [tracer, setTracer] = useState(initialTracer);
  const [answers, setAnswers] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSubmission, setCheckingSubmission] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftResponseId, setDraftResponseId] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ==========================================
  // 🔥 HIDE THE MAIN TAB NAVIGATOR 🔥
  // ==========================================
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({ tabBarStyle: { display: "none" } });
    }
    return () => {
      if (parent) {
        parent.setOptions({ tabBarStyle: { display: "flex" } });
      }
    };
  }, [navigation]);

  useEffect(() => {
    let active = true;
    const selectedId = initialTracer?.id || initialTracer?.form_id;
    if (!selectedId)
      return () => {
        active = false;
      };

    const loadFormDetails = async () => {
      try {
        setLoading(true);
        const found = await getTracerFormById(selectedId).catch(() => null);
        if (active && found) setTracer(found);
      } catch {
        // fallback to navigation payload
      } finally {
        if (active) setLoading(false);
      }
    };

    loadFormDetails();

    return () => {
      active = false;
    };
  }, [initialTracer]);

  useEffect(() => {
    let active = true;
    const selectedId =
      tracer?.id ||
      tracer?.form_id ||
      initialTracer?.id ||
      initialTracer?.form_id;

    if (!selectedId) {
      return () => {
        active = false;
      };
    }

    const checkSubmissionStatus = async () => {
      try {
        setCheckingSubmission(true);
        setDraftResponseId(null);
        setAnswers({});

        const supaUser = await getCurrentUser().catch(() => null);
        if (!supaUser?.email) {
          if (active) setAlreadySubmitted(false);
          return;
        }

        const alumni = await getAlumniByEmail(supaUser.email).catch(() => null);
        if (!alumni?.id) {
          if (active) setAlreadySubmitted(false);
          return;
        }

        const submitted = await hasSubmittedForm(alumni.id, selectedId).catch(
          () => false,
        );

        if (active) setAlreadySubmitted(submitted);

        if (active && submitted) {
          ThemedAlert.alert(
            "Already Submitted",
            "You have already submitted this tracer form.",
            [{ text: "OK", onPress: () => navigation.replace("AlumniTracer") }],
          );
          return;
        }

        const draft = await getOrCreateDraftResponse(alumni.id, selectedId).catch(() => null);
        if (!active || !draft?.id) return;

        setDraftResponseId(draft.id);

        const draftAnswers = await getDraftAnswers(draft.id).catch(() => []);
        if (!active || !Array.isArray(draftAnswers)) return;

        const nextAnswers = {};
        draftAnswers.forEach((entry) => {
          const qid = String(entry?.tq_id || entry?.question_id || "");
          if (!qid) return;
          nextAnswers[qid] = hydrateDraftAnswer(entry?.answer_value);
        });

        setAnswers(nextAnswers);
      } finally {
        if (active) setCheckingSubmission(false);
      }
    };

    checkSubmissionStatus();

    return () => {
      active = false;
    };
  }, [initialTracer, navigation, tracer]);

  const questions = useMemo(() => {
    const raw =
      tracer?.questions ||
      tracer?.tracer_questions ||
      tracer?.tracerQuestions ||
      [];
    if (!Array.isArray(raw)) return [];
    return [...raw]
      .sort((a, b) => (a?.order_priority ?? 0) - (b?.order_priority ?? 0))
      .map((question) => {
        const list =
          question?.tracer_question_options ||
          question?.answer_options ||
          question?.answerOptions ||
          question?.tracer_answer_options ||
          question?.options || 
          parseSettingsOptions(question?.settings);
        return {
          ...question,
          _options: Array.isArray(list) ? list : [],
        };
      });
  }, [tracer]);

  const totalSteps = questions.length;
  const currentQuestion = totalSteps > 0 ? questions[currentStep - 1] : null;

  useEffect(() => {
    setCurrentStep(1);
  }, [tracer?.id, tracer?.form_id]);

  useEffect(() => {
    const percentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [currentStep, progressAnim, totalSteps]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const toggleOption = (question, val) => {
    const qid = String(question?.id || "");
    if (!qid) return;
    
    const rawType = String(question?.type || "").toLowerCase();
    const isMultiSelect = rawType.includes("check") || rawType.includes("multiple");
    const strVal = String(val);

    setAnswers((prev) => {
      if (isMultiSelect) {
        const existing = Array.isArray(prev[qid]) ? prev[qid].map(String) : [];
        const next = existing.includes(strVal)
          ? existing.filter((v) => v !== strVal)
          : [...existing, strVal];
        return { ...prev, [qid]: next };
      }

      return { ...prev, [qid]: strVal };
    });
  };

  const confirmLeave = () => {
    ThemedAlert.alert(
      "Leave Form",
      "Are you sure you want to leave without submitting?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: () => navigation.replace("AlumniTracer") },
      ],
    );
  };

  const goBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setShowValidation(false);
      return;
    }
    confirmLeave();
  };

  useEffect(() => {
    const onBackPress = () => {
      goBackStep();
      return true; 
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => {
      if (subscription && typeof subscription.remove === "function") {
        subscription.remove();
      }
    };
  }, [currentStep, navigation, tracer, answers]);

  const setTextAnswer = (question, value) => {
    const qid = String(question?.id || "");
    if (!qid) return;
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const submitResponses = async () => {
    if (submitting) return;
    const formId = tracer?.id || tracer?.form_id;
    if (!formId) {
      ThemedAlert.alert("Submit Failed", "Unable to determine tracer form ID.");
      return;
    }

    try {
      Keyboard.dismiss();
      setSubmitting(true);

      if (alreadySubmitted) {
        ThemedAlert.alert(
          "Already Submitted",
          "You have already submitted this tracer form.",
          [{ text: "OK", onPress: () => navigation.replace("AlumniTracer") }],
        );
        return;
      }

      const supaUser = await getCurrentUser();
      if (!supaUser?.email) {
        ThemedAlert.alert("Session Expired", "Please log in again to submit your tracer form.");
        return;
      }

      const alumni = await getAlumniByEmail(supaUser.email).catch(() => null);
      if (!alumni?.id) {
        ThemedAlert.alert("User not found", "Unable to resolve alumni profile for submission.");
        return;
      }

      const submitted = await hasSubmittedForm(alumni.id, formId).catch(() => false);
      if (submitted) {
        setAlreadySubmitted(true);
        ThemedAlert.alert(
          "Already Submitted",
          "You have already submitted this tracer form.",
          [{ text: "OK", onPress: () => navigation.replace("AlumniTracer") }],
        );
        return;
      }

      let activeDraftId = draftResponseId;
      if (!activeDraftId) {
        const draft = await getOrCreateDraftResponse(alumni.id, formId).catch(() => null);
        activeDraftId = draft?.id || null;
        if (activeDraftId) {
          setDraftResponseId(activeDraftId);
        }
      }

      if (activeDraftId) {
        for (const question of questions) {
          const qid = String(question?.id || "");
          const rawValue = answers[qid];
          const cleanValue = getSanitizedValue(question, rawValue);
          
          try {
            await saveAnswerDraft(
              activeDraftId,
              qid,
              serializeAnswerForDraft(cleanValue)
            );
          } catch (e) {
            console.warn(`Silently caught error saving QID ${qid}:`, e);
          }
        }
        await submitDraftResponse(activeDraftId);
      } else {
        const answerArray = questions.map((q) => {
          const qid = String(q.id);
          const rawValue = answers[qid];
          const cleanValue = getSanitizedValue(q, rawValue);
          return {
            questionId: qid,
            value: cleanValue,
          };
        }).filter(a => isFieldAnswered(a.value));
        
        await submitTracerForm(alumni.id, formId, answerArray);
      }

      ThemedAlert.alert(
        "Submitted",
        "Your responses have been submitted successfully.",
        [{ text: "OK", onPress: () => navigation.replace("AlumniTracer") }],
      );
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to submit tracer responses.";
      ThemedAlert.alert("Submit Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (submitting || savingDraft || checkingSubmission) return;
    if (!currentQuestion) return;

    const qid = String(currentQuestion?.id || "");
    const rawValue = answers[qid];
    const cleanValue = getSanitizedValue(currentQuestion, rawValue);

    // Automatically cleanse UI state of deleted options
    if (JSON.stringify(rawValue) !== JSON.stringify(cleanValue)) {
      setAnswers((prev) => ({ ...prev, [qid]: cleanValue }));
    }

    setSavingDraft(true);
    try {
      await saveAnswerDraft(
        draftResponseId,
        qid,
        serializeAnswerForDraft(cleanValue)
      );
    } catch (error) {
      console.warn("Draft save warning ignored.");
    } finally {
      setSavingDraft(false);
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
      setShowValidation(false);
      return;
    }

    ThemedAlert.alert("Confirm Submission", "Are you sure with your answers?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: () => {
          void submitResponses();
        },
      },
    ]);
  };

  // ==========================================
  // 🔥 DYNAMIC BUTTON DISABLER LOGIC 🔥
  // ==========================================
  const isNextDisabled = useMemo(() => {
    // 1. Lock if we are loading or submitting
    if (submitting || savingDraft || alreadySubmitted || checkingSubmission || !currentQuestion) {
      return true;
    }

    // 2. If question is required, check if it's answered
    if (isQuestionRequired(currentQuestion)) {
      const qid = String(currentQuestion.id || "");
      const rawValue = answers[qid];
      const cleanValue = getSanitizedValue(currentQuestion, rawValue);
      
      // If it is NOT properly answered, we disable the button
      if (!isFieldAnswered(cleanValue)) {
        return true; 
      }
    }

    // 3. Otherwise, let them press it!
    return false;
  }, [submitting, savingDraft, alreadySubmitted, checkingSubmission, currentQuestion, answers]);

  return (
    <>
      <SafeAreaView edges={["top"]} style={styles.topSafe} />
      <StatusBar backgroundColor="#31429B" barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={goBackStep}
              accessibilityRole="button"
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            >
              <Text style={styles.backButtonText}>
                {currentStep > 1 ? "‹  Back" : "‹  Exit"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>
              Step {totalSteps > 0 ? currentStep : 0} of {totalSteps}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[styles.progressBarFill, { width: progressWidth }]}
            />
          </View>
        </View>
        {loading || checkingSubmission ? (
          <ActivityIndicator
            size="small"
            color="#31429B"
            style={{ marginTop: 10 }}
          />
        ) : null}
        <ScrollView
          style={styles.wizardScroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {tracer?.form_header ? (
            <Image
              source={{ uri: tracer.form_header }}
              style={styles.headerImage}
            />
          ) : (
            <View
              style={[styles.headerImage, { backgroundColor: "#E6EEF9" }]}
            />
          )}

          <View style={styles.titleCard}>
            <Text style={styles.titleText}>
              {tracer?.form_title || "Tracer Form"}
            </Text>
            {tracer?.form_description || tracer?.description ? (
              <Text style={styles.formDescriptionText}>
                {tracer?.form_description || tracer?.description}
              </Text>
            ) : null}
          </View>

          {currentQuestion ? (
            (() => {
              const qid = String(currentQuestion?.id || "");
              const options = currentQuestion?._options || [];
              const type = normalizeType(
                currentQuestion?.type,
                options.length > 0,
              );
              
              const rawSelected = answers[qid];
              const cleanSelected = getSanitizedValue(currentQuestion, rawSelected);
              const isRequired = isQuestionRequired(currentQuestion);
              
              const isInvalid = showValidation && isRequired && !isFieldAnswered(cleanSelected);

              return (
                <View
                  style={[
                    styles.card,
                    styles.screenCard,
                    isInvalid ? styles.cardInvalid : null,
                  ]}
                >
                  <View style={styles.questionTitleRow}>
                    <Text style={styles.cardTitle}>
                      {currentQuestion?.question_text || "Question"}
                    </Text>
                    {isRequired ? (
                      <Text style={styles.requiredMark}>*</Text>
                    ) : null}
                  </View>
                  {currentQuestion?.description ? (
                    <Text style={styles.cardText}>
                      {currentQuestion.description}
                    </Text>
                  ) : null}

                  {type === "text" || type === "textarea" ? (
                    <TextInput
                      value={typeof cleanSelected === "string" ? cleanSelected : ""}
                      onChangeText={(value) =>
                        setTextAnswer(currentQuestion, value)
                      }
                      placeholder={
                        type === "textarea" ? "Type your answer" : "Your answer"
                      }
                      placeholderTextColor="#9CA3AF"
                      multiline={type === "textarea"}
                      numberOfLines={type === "textarea" ? 4 : 1}
                      style={[
                        styles.textInput,
                        type === "textarea" ? styles.textArea : null,
                      ]}
                    />
                  ) : Array.isArray(options) && options.length > 0 ? (
                    options.map((option) => {
                      const rawValue = option?.id ?? option?.option_value ?? option?.option_label ?? "";
                      const value = String(rawValue);
                      const isChecked = Array.isArray(cleanSelected)
                        ? cleanSelected.map(String).includes(value)
                        : String(cleanSelected) === value;

                      return (
                        <Pressable
                          key={`${qid}-${value}`}
                          style={[
                            styles.optionRow,
                            isChecked ? styles.optionRowActive : null,
                          ]}
                          onPress={() => toggleOption(currentQuestion, value)}
                          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                          accessibilityRole="button"
                        >
                          <View
                            style={[
                              styles.radioOuter,
                              type === "checkbox" ? styles.checkboxOuter : null,
                            ]}
                          >
                            {isChecked ? (
                              <View
                                style={[
                                  styles.radioInner,
                                  type === "checkbox"
                                    ? styles.checkboxInner
                                    : null,
                                ]}
                              />
                            ) : null}
                          </View>
                          <Text style={styles.optionText}>
                            {option?.option_label || String(value)}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text style={styles.cardText}>
                      No answer options available.
                    </Text>
                  )}
                  {isInvalid ? (
                    <Text style={styles.requiredHint}>
                      This question is required.
                    </Text>
                  ) : null}
                </View>
              );
            })()
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No Questions Available</Text>
              <Text style={styles.cardText}>
                This tracer form does not have any questions yet.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {/* 🔥 BUTTON PHYSICAL LOCK APPLIED HERE 🔥 */}
          <TouchableOpacity
            style={[
              styles.nextButton,
              isNextDisabled ? { opacity: 0.4, backgroundColor: '#9CA3AF' } : null,
            ]}
            onPress={handleNext}
            disabled={isNextDisabled}
            accessibilityRole="button"
            activeOpacity={isNextDisabled ? 1 : 0.7}
          >
            {submitting || savingDraft ? (
              <ActivityIndicator
                size="small"
                color="#F9FAFB"
                style={{ marginRight: 8 }}
              />
            ) : null}
            <Text style={styles.nextButtonText}>
              {submitting
                ? "Submitting..."
                : savingDraft
                  ? "Saving draft..."
                  : currentStep >= totalSteps
                    ? "Submit"
                    : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <SafeAreaView edges={["bottom"]} style={styles.bottomSafe} />
    </>
  );
};

export default TracerFormScreen;
