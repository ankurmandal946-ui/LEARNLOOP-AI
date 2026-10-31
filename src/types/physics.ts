export type ConceptId =
  | 'electric-current'
  | 'potential-difference'
  | 'resistance'
  | 'ohms-law'
  | 'circuits';

export type DifficultyLevel = 'foundational' | 'intermediate' | 'exam-prep';

export type TrophyTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Trophy {
  id: string;
  title: string;
  conceptId?: ConceptId | 'general';
  conceptName?: string;
  tier: TrophyTier;
  iconName: string;
  description: string;
  criteria: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number; // 0 to 100
  consecutiveHighScores: number;
  requiredConsecutive: number;
}

export interface ConceptInfo {
  id: ConceptId;
  name: string;
  tagline: string;
  formula: string;
  siUnit: string;
  measuringDevice: string;
  cbseWeightage: string;
  description: string;
  keyPrinciples: string[];
  commonMisconceptions: string[];
}

export interface ConceptMastery {
  conceptId: ConceptId;
  name: string;
  score: number; // 0 to 100
  questionsAttempted: number;
  questionsCorrect: number;
  lastPracticed: string | null;
  status: 'needs-focus' | 'developing' | 'proficient' | 'mastered';
  detectedMisconceptions: string[];
}

export interface CircuitSetup {
  hasCircuit: boolean;
  circuitType?: 'series' | 'parallel' | 'single' | 'none';
  voltage?: number;
  resistors?: number[];
  description?: string;
}

export interface Question {
  id: string;
  conceptId: ConceptId;
  conceptName: string;
  difficulty: DifficultyLevel;
  title: string;
  prompt: string;
  circuitSetup?: CircuitSetup;
  expectedFormat: string;
  correctAnswerReference: string;
  hint1: string;
  hint2: string;
  hint3: string;
}

export interface EvaluationResult {
  isCorrect: boolean;
  score: number;
  answerCritique: string;
  reasoningCritique: string;
  detectedMisconceptions: string[];
  hasMisconception: boolean;
  simpleExplanation: string;
  masteryDelta: number;
  newMastery: number;
  nextRecommendation: string;
  // Extended universal misconception & error differentiation fields
  errorClassification?: 'accurate' | 'calculation_error' | 'incomplete_answer' | 'conceptual_misconception';
  incorrectConcept?: string;
  whyIncorrect?: string;
  correctExplanation?: string;
  simpleExample?: string;
  evidenceSummary?: string;
}

export interface RevisionItem {
  id: string;
  conceptId: ConceptId;
  conceptName: string;
  dueDate: string;
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  status: 'due' | 'upcoming' | 'mastered';
  lastReviewedScore?: number;
}

export interface DiagnosticAnswer {
  conceptId: ConceptId;
  questionId: string;
  questionText: string;
  studentAnswer: string;
  studentReasoning: string;
}

export interface DiagnosticResult {
  overallScore: number;
  conceptScores: Record<ConceptId, number>;
  diagnosedMisconceptions: Array<{
    conceptId: string;
    conceptName: string;
    misconception: string;
    recommendation: string;
  }>;
  diagnosticSummary: string;
  recommendedStartingConcept: ConceptId;
  completedAt: string;
}

export interface StudentProfile {
  name: string;
  grade: string;
  streakDays: number;
  lastActiveDate: string;
  totalStudyMinutes: number;
  diagnosticCompleted: boolean;
  diagnosticResult: DiagnosticResult | null;
}

export interface CohortStudent {
  id: string;
  name: string;
  avatarSeed: string;
  overallScore: number;
  conceptScores: Record<ConceptId, number>;
  weakestConcept: ConceptId;
  identifiedMisconceptions: string[];
  lastActive: string;
  submissionsCount: number;
}

export type LearningCycleStepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface AgentStepRecord {
  stepNumber: LearningCycleStepNumber;
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'in_progress' | 'pending';
  category: 'gemini_reasoning' | 'application_function';
  details?: Record<string, any>;
}

export interface AgentCycleLog {
  id: string;
  timestamp: string;
  questionTitle: string;
  evaluatedConceptId: ConceptId;
  evaluatedConceptName: string;
  steps: AgentStepRecord[];
  score: number;
  masteryBefore: number;
  masteryAfter: number;
  masteryDelta: number;
  detectedMisconceptions: string[];
  weakestConceptId: ConceptId;
  weakestConceptName: string;
  generatedQuestionTitle: string;
  scheduledRevisionDate: string;
  scheduledRevisionInterval: number;
}

export interface TeacherAnalyticsReport {
  cohortAverage: number;
  conceptAverages: Record<ConceptId, number>;
  interventionNeededCount: number;
  proficientStudentCount: number;
  commonMisconceptions: Array<{
    conceptId: ConceptId;
    conceptName: string;
    misconception: string;
    affectedPct: number;
    severity: string;
  }>;
}

