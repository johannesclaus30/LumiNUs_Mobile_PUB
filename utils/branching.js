// utils/branching.js

/**
 * Determines whether a question should be visible based on:
 *   - its condition (if any)
 *   - the alumni's current answers
 *
 * @param {object} question - with optional .condition
 * @param {object} answers  - map of { questionId: value }
 *                            value can be string, string[], or object (grid)
 * @returns {boolean}
 */
export const isQuestionVisible = (question, answers) => {
  if (!question?.condition?.dependsOnQuestionId) return true;

  const parentAnswer = answers[question.condition.dependsOnQuestionId];

  // Parent not answered yet → hide
  if (
    parentAnswer === undefined ||
    parentAnswer === null ||
    parentAnswer === ''
  ) {
    return false;
  }

  const matchLabels = question.condition.optionLabels || [];
  const matchType = question.condition.matchType || 'any';

  // Normalize parent answer to an array
  const parentValues = Array.isArray(parentAnswer)
    ? parentAnswer
    : [parentAnswer];

  switch (matchType) {
    case 'any':
      return parentValues.some(v => matchLabels.includes(v));
    case 'all':
      return matchLabels.every(l => parentValues.includes(l));
    case 'none':
      return !parentValues.some(v => matchLabels.includes(v));
    default:
      return true;
  }
};

/**
 * A section is visible if it has at least one currently-visible question,
 * OR if it has no questions.
 */
export const isSectionVisible = (section, answers) => {
  if (!section.questions || section.questions.length === 0) return true;
  return section.questions.some(q => isQuestionVisible(q, answers));
};

/**
 * Filter a list of questions to only visible ones.
 */
export const getVisibleQuestions = (questions, answers) =>
  (questions || []).filter(q => isQuestionVisible(q, answers));

/**
 * Filter sections to only those with visible questions.
 */
export const getVisibleSections = (sections, answers) =>
  (sections || []).filter(s => isSectionVisible(s, answers));