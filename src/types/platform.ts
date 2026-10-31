export type PersonaType =
  | 'student'
  | 'teacher'
  | 'professor'
  | 'tutor'
  | 'institution_admin'
  | 'independent_learner';

export type EducationCategory =
  | 'School'
  | 'Higher Education'
  | 'Competitive & Professional'
  | 'Custom';

export type SkillTier = 'foundational' | 'intermediate' | 'advanced' | 'exam-prep';

export type QuestionFormatId =
  | 'mcq'
  | 'msq'
  | 'true_false'
  | 'fill_blanks'
  | 'one_word'
  | 'short_answer'
  | 'long_answer'
  | 'descriptive'
  | 'numerical'
  | 'coding'
  | 'output_prediction'
  | 'assertion_reasoning'
  | 'match_following'
  | 'case_based'
  | 'scenario_based'
  | 'diagram_based'
  | 'viva'
  | 'practical_lab'
  | 'interview'
  | 'application_based'
  | 'custom';

export type ErrorClassification =
  | 'accurate'
  | 'calculation_error'
  | 'incomplete_answer'
  | 'conceptual_misconception';

export type ExamMode =
  | 'practice'
  | 'mock'
  | 'timed'
  | 'chapter'
  | 'subject'
  | 'full_syllabus'
  | 'previous_year'
  | 'custom_paper';

export interface UniversalUserProfile {
  uid: string;
  displayName: string;
  email: string; // Stored separately in /userPrivate/{uid} when synced to Firestore
  personaType: PersonaType;
  country: string;
  institutionName: string;
  institutionType: string;
  educationCategory: EducationCategory;
  educationLevel: string;
  customEducationLevel: string;
  gradeOrYear: string;
  degreeOrProgramme: string;
  departmentOrBranch: string;
  designation: string;
  teachingExperience: string;
  preferredLanguage: string;
  skillLevel: SkillTier;
  learningGoals: string;
  subjectsList: string[];
  streakDays: number;
  totalStudyMinutes: number;
  diagnosticCompleted: boolean;
  onboardingCompleted: boolean;
}

export interface AcademicSubjectItem {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  courseCode: string;
  educationLevel: string;
  description: string;
  chaptersList: string[];
  createdAt?: string;
}

export interface TopicMasteryItem {
  id: string;
  ownerId: string;
  subjectId: string;
  subjectName: string;
  chapterName: string;
  name: string;
  formulaOrKeyRule: string;
  score: number; // 0-100 evidence-based
  questionsAttempted: number;
  questionsCorrect: number;
  totalTimeSeconds: number;
  difficultyTier: SkillTier;
  status: 'needs-focus' | 'developing' | 'proficient' | 'mastered';
  lastChangeReason: string;
  misconceptions: string[];
  legacyConceptId?: string;
}

export interface UniversalQuestion {
  id: string;
  format: QuestionFormatId;
  customFormatLabel?: string;
  subjectName: string;
  chapterName: string;
  topicName: string;
  difficulty: SkillTier;
  marks: number;
  title: string;
  prompt: string;
  contextPassage?: string; // For case-based / scenario-based
  codeSnippet?: string; // For coding / output-prediction
  options?: string[]; // For MCQ / MSQ / True-False / Assertion-Reasoning
  correctOptions?: string[]; // Exact matching option strings for MCQ / MSQ / True-False
  matchPairs?: Array<{ left: string; right: string }>;
  expectedAnswer: string;
  explanation: string;
  hint1: string;
  hint2: string;
  hint3: string;
  circuitSetup?: {
    hasCircuit: boolean;
    circuitType?: 'series' | 'parallel' | 'single' | 'none';
    voltage?: number;
    resistors?: number[];
    description?: string;
  };
}

export interface GeneratedQuestionSetItem {
  id: string;
  ownerId: string;
  title: string;
  subjectName: string;
  chapterName: string;
  educationLevel: string;
  examType: string;
  questionFormat: string;
  difficulty: SkillTier;
  questionCount: number;
  marksPerQuestion: number;
  negativeMarks: number; // e.g. 0, 0.25, 0.5, 1
  timeLimitMinutes: number;
  language: string;
  questions: UniversalQuestion[];
  createdAt: string;
}

export interface QuestionEvaluationDetail {
  questionId: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  errorClassification: ErrorClassification;
  feedback: string;
  incorrectConcept?: string;
  correctExplanation?: string;
  simpleExample?: string;
}

export interface ExamAttemptItem {
  id: string;
  ownerId: string;
  title: string;
  mode: ExamMode;
  subjectName: string;
  totalQuestions: number;
  correctCount: number;
  scoreEarned: number;
  maxMarks: number;
  percentage: number;
  timeTakenSeconds: number;
  misconceptionsCount: number;
  calculationErrorsCount: number;
  incompleteCount: number;
  status: 'in_progress' | 'completed';
  createdAt: string;
  details?: QuestionEvaluationDetail[];
}

export interface SpacedRevisionRecord {
  id: string;
  ownerId: string;
  topicKey: string;
  subjectName: string;
  topicName: string;
  dueDate: string; // YYYY-MM-DD
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  lastScore: number;
  status: 'due' | 'upcoming' | 'mastered';
}

export interface ClassRosterStudent {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  overallMastery: number;
  weakTopic: string;
  submissionsCount: number;
}

export interface ClassAssignmentItem {
  id: string;
  title: string;
  questionSetId?: string;
  dueDate: string;
  totalMarks: number;
  questionCount: number;
  status: 'active' | 'scheduled' | 'closed';
}

export interface EducatorClassItem {
  id: string;
  ownerId: string;
  name: string;
  subjectName: string;
  educationLevel: string;
  institutionName: string;
  departmentName?: string;
  inviteCode: string;
  rosterList: ClassRosterStudent[];
  assignmentsList: ClassAssignmentItem[];
  createdAt: string;
}

export interface FlashcardItem {
  front: string;
  back: string;
  topic: string;
}

export interface StudyDocumentItem {
  id: string;
  ownerId: string;
  title: string;
  fileName: string;
  mimeType: string;
  subjectName: string;
  rawTextPreview?: string;
  summary: string;
  revisionNotes: string;
  extractedTopics: string[];
  flashcards: FlashcardItem[];
  practiceQuestions?: UniversalQuestion[];
  createdAt: string;
}

export interface DocumentAnswerResult {
  answer: string;
  sourceType: 'uploaded_document' | 'general_ai_knowledge' | 'hybrid';
  sourceAttributionNote: string;
  citedSections: string[];
}

export interface AgentToolCallLog {
  toolName: string;
  args: Record<string, any>;
  outputSummary: string;
  timestamp: string;
}
