import {
  ConceptId,
  ConceptMastery,
  EvaluationResult,
  Question,
  RevisionItem,
  CohortStudent,
  TeacherAnalyticsReport,
  AgentCycleLog,
  AgentStepRecord,
  DifficultyLevel,
} from '../types/physics';
import { SpacedRevisionRecord } from '../types/platform';
import { CONCEPTS } from '../data/physicsConcepts';

/**
 * 1. evaluateStudentAnswer (Uses Gemini for reasoning across any academic subject)
 */
export async function evaluateStudentAnswer(params: {
  question: string;
  conceptId: string;
  conceptName: string;
  subjectName?: string;
  educationLevel?: string;
  language?: string;
  difficulty: DifficultyLevel | string;
  correctAnswerReference: string;
  studentAnswer: string;
  studentReasoning: string;
  currentMastery: number;
}): Promise<EvaluationResult> {
  const res = await fetch('/api/tutor/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Evaluation failed with status ${res.status}`);
  }

  const result: EvaluationResult = await res.json();
  return result;
}

/**
 * 2. updateMastery (Legacy Physics ConceptMastery updater)
 */
export function updateMastery(
  currentMasteries: Record<ConceptId, ConceptMastery>,
  conceptId: ConceptId,
  evaluation: EvaluationResult
): {
  updatedMasteries: Record<ConceptId, ConceptMastery>;
  previousScore: number;
  newScore: number;
  delta: number;
  status: ConceptMastery['status'];
} {
  const current = currentMasteries[conceptId] || {
    conceptId,
    name: CONCEPTS[conceptId]?.name || conceptId,
    score: 50,
    questionsAttempted: 0,
    questionsCorrect: 0,
    lastPracticed: null,
    status: 'developing' as const,
    detectedMisconceptions: [],
  };

  const previousScore = current.score;
  const newScore = Math.max(0, Math.min(100, previousScore + evaluation.masteryDelta));

  let status: ConceptMastery['status'] = 'developing';
  if (newScore >= 80) status = 'mastered';
  else if (newScore >= 65) status = 'proficient';
  else if (newScore >= 45) status = 'developing';
  else status = 'needs-focus';

  const mergedMisconceptions = Array.from(
    new Set([...current.detectedMisconceptions, ...(evaluation.detectedMisconceptions || [])])
  );

  const updatedConcept: ConceptMastery = {
    ...current,
    score: newScore,
    questionsAttempted: current.questionsAttempted + 1,
    questionsCorrect: current.questionsCorrect + (evaluation.isCorrect ? 1 : 0),
    lastPracticed: 'Just now',
    status,
    detectedMisconceptions: mergedMisconceptions,
  };

  const updatedMasteries = {
    ...currentMasteries,
    [conceptId]: updatedConcept,
  };

  return {
    updatedMasteries,
    previousScore,
    newScore,
    delta: evaluation.masteryDelta,
    status,
  };
}

/**
 * 3. getWeakestConcept
 */
export function getWeakestConcept(
  masteries: Record<ConceptId, ConceptMastery>
): ConceptMastery {
  const list = Object.values(masteries);
  if (list.length === 0) {
    return {
      conceptId: 'circuits',
      name: CONCEPTS['circuits'].name,
      score: 50,
      questionsAttempted: 0,
      questionsCorrect: 0,
      lastPracticed: null,
      status: 'needs-focus',
      detectedMisconceptions: [],
    };
  }

  return list.reduce((lowest, curr) => (curr.score < lowest.score ? curr : lowest), list[0]);
}

/**
 * 4. generateAdaptiveQuestion (Universal Subject/Topic Adaptive Problem Generator)
 */
export async function generateAdaptiveQuestion(params: {
  weakConceptId: string;
  weakConceptName: string;
  subjectName?: string;
  chapterName?: string;
  educationLevel?: string;
  language?: string;
  mastery: number;
  recentMisconceptions: string[];
}): Promise<Question> {
  const targetDifficulty: DifficultyLevel =
    params.mastery >= 75
      ? 'exam-prep'
      : params.mastery >= 55
      ? 'intermediate'
      : 'foundational';

  const res = await fetch('/api/tutor/next-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conceptId: params.weakConceptId,
      conceptName: params.weakConceptName,
      subjectName: params.subjectName || 'Physics',
      chapterName: params.chapterName || 'Core Syllabus',
      educationLevel: params.educationLevel || 'Class 10',
      language: params.language || 'English',
      targetDifficulty,
      recentMisconceptions: params.recentMisconceptions,
      mastery: params.mastery,
    }),
  });

  if (!res.ok) {
    throw new Error(`Adaptive question generation failed: ${res.status}`);
  }

  const question: Question = await res.json();
  return question;
}

/**
 * 5. scheduleRevision (Legacy Physics SM-2 + Universal SM-2 Helper)
 */
export function scheduleRevision(
  currentRevisions: RevisionItem[],
  conceptId: ConceptId,
  score: number
): {
  updatedRevisions: RevisionItem[];
  scheduledItem: RevisionItem;
  nextRevisionDate: string;
  intervalDays: number;
} {
  const existing = currentRevisions.find((r) => r.conceptId === conceptId);
  const now = new Date();

  let intervalDays = 1;
  let repetitions = existing ? existing.repetitions : 0;
  let easeFactor = existing ? existing.easeFactor : 2.5;

  if (score >= 70) {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 3;
    else intervalDays = Math.max(1, Math.round((existing?.intervalDays || 3) * easeFactor));
  } else {
    repetitions = Math.max(0, repetitions - 1);
    intervalDays = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  const dueDateObj = new Date(now);
  dueDateObj.setDate(dueDateObj.getDate() + intervalDays);
  const nextRevisionDate = dueDateObj.toISOString().split('T')[0];

  const scheduledItem: RevisionItem = {
    id: existing ? existing.id : `rev-${conceptId}`,
    conceptId,
    conceptName: CONCEPTS[conceptId]?.name || conceptId,
    dueDate: nextRevisionDate,
    intervalDays,
    repetitions,
    easeFactor: Number(easeFactor.toFixed(2)),
    status: intervalDays <= 0 ? 'due' : intervalDays > 14 ? 'mastered' : 'upcoming',
    lastReviewedScore: score,
  };

  const existsInArray = currentRevisions.some((item) => item.conceptId === conceptId);
  const updatedRevisions = existsInArray
    ? currentRevisions.map((item) => (item.conceptId === conceptId ? scheduledItem : item))
    : [scheduledItem, ...currentRevisions];

  return {
    updatedRevisions,
    scheduledItem,
    nextRevisionDate,
    intervalDays,
  };
}

export function computeUniversalSpacedRevision(params: {
  existing?: SpacedRevisionRecord;
  ownerId: string;
  topicKey: string;
  subjectName: string;
  topicName: string;
  score: number;
}): SpacedRevisionRecord {
  const { existing, ownerId, topicKey, subjectName, topicName, score } = params;
  let repetitions = existing ? existing.repetitions : 0;
  let easeFactor = existing ? existing.easeFactor : 2.5;
  let intervalDays = 1;

  if (score >= 70) {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 3;
    else if (repetitions === 3) intervalDays = 7;
    else intervalDays = Math.max(1, Math.round((existing?.intervalDays || 7) * easeFactor));
    if (score >= 88) easeFactor = Math.min(3.5, Number((easeFactor + 0.1).toFixed(2)));
  } else {
    repetitions = Math.max(0, repetitions - 1);
    intervalDays = score < 50 ? 0 : 1;
    easeFactor = Math.max(1.3, Number((easeFactor - 0.2).toFixed(2)));
  }

  const due = new Date();
  due.setDate(due.getDate() + intervalDays);
  const dueDate = due.toISOString().split('T')[0];

  return {
    id: existing ? existing.id : `urev-${topicKey.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60)}`,
    ownerId,
    topicKey,
    subjectName,
    topicName,
    dueDate,
    intervalDays,
    repetitions,
    easeFactor,
    lastScore: Math.round(score),
    status: intervalDays === 0 ? 'due' : intervalDays >= 14 ? 'mastered' : 'upcoming',
  };
}

/**
 * 6. getTeacherAnalytics
 */
export function getTeacherAnalytics(
  cohortStudents: CohortStudent[],
  currentStudentMasteries?: Record<ConceptId, ConceptMastery>
): TeacherAnalyticsReport {
  const allStudents = [...cohortStudents];

  if (currentStudentMasteries) {
    const scores: Record<ConceptId, number> = {
      'electric-current': currentStudentMasteries['electric-current']?.score ?? 65,
      'potential-difference': currentStudentMasteries['potential-difference']?.score ?? 55,
      resistance: currentStudentMasteries['resistance']?.score ?? 50,
      'ohms-law': currentStudentMasteries['ohms-law']?.score ?? 72,
      circuits: currentStudentMasteries['circuits']?.score ?? 42,
    };
    const overall = Math.round(
      Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length
    );

    allStudents.push({
      id: 'current-user',
      name: 'Current Learner (Live Session)',
      avatarSeed: 'live',
      overallScore: overall,
      conceptScores: scores,
      weakestConcept: getWeakestConcept(currentStudentMasteries).conceptId,
      identifiedMisconceptions: Object.values(currentStudentMasteries).flatMap(
        (c) => c.detectedMisconceptions
      ),
      lastActive: 'Just now',
      submissionsCount: Object.values(currentStudentMasteries).reduce(
        (a, b) => a + b.questionsAttempted,
        0
      ),
    });
  }

  const conceptAverages = (Object.keys(CONCEPTS) as ConceptId[]).reduce(
    (acc, cid) => {
      const sum = allStudents.reduce((s, st) => s + (st.conceptScores[cid] || 0), 0);
      acc[cid] = Math.round(sum / Math.max(1, allStudents.length));
      return acc;
    },
    {} as Record<ConceptId, number>
  );

  const cohortAverage = Math.round(
    Object.values(conceptAverages).reduce((a, b) => a + b, 0) / Object.keys(conceptAverages).length
  );

  const interventionNeededCount = allStudents.filter((s) => s.overallScore < 65).length;
  const proficientStudentCount = allStudents.filter((s) => s.overallScore >= 80).length;

  const commonMisconceptions = [
    {
      conceptId: 'circuits' as ConceptId,
      conceptName: 'Series & Parallel Circuits',
      misconception: 'Current is consumed or reduced by resistors in a branch instead of conserved.',
      affectedPct: 44,
      severity: 'High Priority',
    },
    {
      conceptId: 'circuits' as ConceptId,
      conceptName: 'Series & Parallel Circuits',
      misconception: 'Parallel branches share voltage additively (like series) rather than having equal V.',
      affectedPct: 38,
      severity: 'High Priority',
    },
    {
      conceptId: 'resistance' as ConceptId,
      conceptName: 'Resistance & Resistivity',
      misconception: 'Believing resistivity (ρ) changes when a wire is stretched or cut.',
      affectedPct: 31,
      severity: 'Medium',
    },
    {
      conceptId: 'potential-difference' as ConceptId,
      conceptName: 'Potential Difference',
      misconception: 'Thinking voltage flows through wires (confusing potential difference with current flow).',
      affectedPct: 22,
      severity: 'Medium',
    },
  ];

  return {
    cohortAverage,
    conceptAverages,
    interventionNeededCount,
    proficientStudentCount,
    commonMisconceptions,
  };
}

/**
 * 7. Orchestrator: runLearningCycle (Supports both Physics ConceptIds and Universal Topics)
 */
export async function runLearningCycle(params: {
  question: Question;
  studentAnswer: string;
  studentReasoning: string;
  subjectName?: string;
  chapterName?: string;
  educationLevel?: string;
  language?: string;
  topicScoreOverride?: number;
  currentMasteries: Record<ConceptId, ConceptMastery>;
  currentRevisions: RevisionItem[];
  onStepUpdate?: (step: AgentStepRecord) => void;
}): Promise<{
  evaluation: EvaluationResult;
  updatedMasteries: Record<ConceptId, ConceptMastery>;
  updatedRevisions: RevisionItem[];
  weakestConcept: ConceptMastery;
  nextAdaptiveQuestion: Question;
  cycleLog: AgentCycleLog;
}> {
  const steps: AgentStepRecord[] = [];
  const now = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const subjectLabel = params.subjectName || 'Physics';
  const levelLabel = params.educationLevel || 'Class 10';
  const isLegacyPhysicsConcept = Boolean(CONCEPTS[params.question.conceptId as ConceptId]);

  const addStep = (
    stepNumber: AgentStepRecord['stepNumber'],
    title: string,
    description: string,
    category: AgentStepRecord['category'],
    details?: Record<string, any>
  ) => {
    const record: AgentStepRecord = {
      stepNumber,
      title,
      description,
      timestamp: now(),
      status: 'completed',
      category,
      details,
    };
    steps.push(record);
    if (params.onStepUpdate) {
      params.onStepUpdate(record);
    }
  };

  addStep(
    1,
    "Evaluating Student's Answer & Reasoning",
    `Evaluating final response ("${(params.studentAnswer || 'None').slice(0, 50)}") and reasoning steps in ${subjectLabel} (${levelLabel})`,
    'gemini_reasoning'
  );

  const baselineMastery =
    params.topicScoreOverride ??
    params.currentMasteries[params.question.conceptId as ConceptId]?.score ??
    50;

  const evaluation = await evaluateStudentAnswer({
    question: params.question.prompt,
    conceptId: params.question.conceptId,
    conceptName: params.question.conceptName,
    subjectName: subjectLabel,
    educationLevel: levelLabel,
    language: params.language || 'English',
    difficulty: params.question.difficulty,
    correctAnswerReference: params.question.correctAnswerReference,
    studentAnswer: params.studentAnswer,
    studentReasoning: params.studentReasoning,
    currentMastery: baselineMastery,
  });

  addStep(
    2,
    'Mapping Academic Topic & Syllabus Node',
    `Mapped to ${subjectLabel} topic: ${params.question.conceptName}`,
    'gemini_reasoning',
    { conceptId: params.question.conceptId, subject: subjectLabel }
  );

  addStep(
    3,
    'Differentiating Error Type & Misconceptions',
    evaluation.errorClassification === 'conceptual_misconception' &&
      evaluation.detectedMisconceptions.length > 0
      ? `Conceptual Misconception Diagnosed: "${evaluation.detectedMisconceptions.join('", "')}"`
      : `Classification: ${(evaluation.errorClassification || 'accurate').replace('_', ' ')}`,
    'gemini_reasoning',
    {
      classification: evaluation.errorClassification,
      misconceptions: evaluation.detectedMisconceptions,
    }
  );

  addStep(
    4,
    'Returning Evidence-Based Evaluation',
    `Score: ${evaluation.score}/100 · Mastery Delta: ${
      evaluation.masteryDelta > 0 ? '+' : ''
    }${evaluation.masteryDelta}% · Verdict: ${evaluation.isCorrect ? 'Accurate' : 'Needs Review'}`,
    'gemini_reasoning',
    { score: evaluation.score, delta: evaluation.masteryDelta, isCorrect: evaluation.isCorrect }
  );

  let updatedMasteries = params.currentMasteries;
  let masteryBefore = baselineMastery;
  let masteryAfter = evaluation.newMastery;
  let statusAfter =
    masteryAfter >= 80
      ? 'mastered'
      : masteryAfter >= 65
      ? 'proficient'
      : masteryAfter >= 45
      ? 'developing'
      : 'needs-focus';

  if (isLegacyPhysicsConcept) {
    const masteryUpdate = updateMastery(
      params.currentMasteries,
      params.question.conceptId as ConceptId,
      evaluation
    );
    updatedMasteries = masteryUpdate.updatedMasteries;
    masteryBefore = masteryUpdate.previousScore;
    masteryAfter = masteryUpdate.newScore;
    statusAfter = masteryUpdate.status;
  }

  addStep(
    5,
    'Updating Learner Mastery Model',
    `Evidence transition: ${masteryBefore}% → ${masteryAfter}% (Status: ${statusAfter})`,
    'application_function',
    { previous: masteryBefore, next: masteryAfter, delta: evaluation.masteryDelta }
  );

  const weakestConcept = getWeakestConcept(updatedMasteries);
  const nextTargetId = isLegacyPhysicsConcept
    ? weakestConcept.conceptId
    : params.question.conceptId;
  const nextTargetName = isLegacyPhysicsConcept
    ? weakestConcept.name
    : params.question.conceptName;
  const nextTargetScore = isLegacyPhysicsConcept ? weakestConcept.score : masteryAfter;

  addStep(
    6,
    'Identifying Next Priority Concept',
    `Targeted next focus: ${nextTargetName} (${nextTargetScore}%)`,
    'application_function',
    { targetId: nextTargetId, score: nextTargetScore }
  );

  let nextAdaptiveQuestion: Question;
  try {
    nextAdaptiveQuestion = await generateAdaptiveQuestion({
      weakConceptId: nextTargetId,
      weakConceptName: nextTargetName,
      subjectName: subjectLabel,
      chapterName: params.chapterName || 'Core Syllabus',
      educationLevel: levelLabel,
      language: params.language || 'English',
      mastery: nextTargetScore,
      recentMisconceptions: evaluation.detectedMisconceptions || [],
    });
  } catch {
    nextAdaptiveQuestion = {
      id: `q-adaptive-${Date.now()}`,
      conceptId: (isLegacyPhysicsConcept ? weakestConcept.conceptId : params.question.conceptId) as ConceptId,
      conceptName: nextTargetName,
      difficulty: nextTargetScore >= 70 ? 'exam-prep' : 'intermediate',
      title: `Practice Drill: ${nextTargetName}`,
      prompt: `Apply the governing principles of ${nextTargetName} in ${subjectLabel} (${levelLabel}) to solve a concrete example and justify every step.`,
      expectedFormat: 'State your conclusion clearly and explain your step-by-step reasoning.',
      correctAnswerReference: `Apply fundamental definitions of ${nextTargetName}.`,
      hint1: 'Identify the primary definition or invariant.',
      hint2: 'List known constraints before computing.',
      hint3: 'Verify consistency of your conclusion.',
    };
  }

  addStep(
    7,
    'Generating Targeted Adaptive Question',
    `Synthesized ${levelLabel} problem: "${nextAdaptiveQuestion.title}"`,
    'gemini_reasoning',
    { questionId: nextAdaptiveQuestion.id, title: nextAdaptiveQuestion.title }
  );

  let updatedRevisions = params.currentRevisions;
  let nextRevDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  let revInterval = evaluation.score >= 70 ? 3 : 1;

  if (isLegacyPhysicsConcept) {
    const revisionUpdate = scheduleRevision(
      params.currentRevisions,
      params.question.conceptId as ConceptId,
      evaluation.score
    );
    updatedRevisions = revisionUpdate.updatedRevisions;
    nextRevDate = revisionUpdate.nextRevisionDate;
    revInterval = revisionUpdate.intervalDays;
  }

  addStep(
    8,
    'Scheduling Spaced Repetition (SM-2)',
    `Next review scheduled for ${nextRevDate} (Interval: ${revInterval} day(s))`,
    'application_function',
    { nextDate: nextRevDate, interval: revInterval }
  );

  const cycleLog: AgentCycleLog = {
    id: `cycle-${Date.now()}`,
    timestamp: now(),
    questionTitle: params.question.title,
    evaluatedConceptId: (isLegacyPhysicsConcept ? params.question.conceptId : 'ohms-law') as ConceptId,
    evaluatedConceptName: params.question.conceptName,
    steps,
    score: evaluation.score,
    masteryBefore,
    masteryAfter,
    masteryDelta: evaluation.masteryDelta,
    detectedMisconceptions: evaluation.detectedMisconceptions || [],
    weakestConceptId: weakestConcept.conceptId,
    weakestConceptName: nextTargetName,
    generatedQuestionTitle: nextAdaptiveQuestion.title,
    scheduledRevisionDate: nextRevDate,
    scheduledRevisionInterval: revInterval,
  };

  return {
    evaluation,
    updatedMasteries,
    updatedRevisions,
    weakestConcept,
    nextAdaptiveQuestion,
    cycleLog,
  };
}
