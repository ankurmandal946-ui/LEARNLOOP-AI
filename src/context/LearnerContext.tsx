import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ConceptId,
  ConceptMastery,
  DiagnosticResult,
  EvaluationResult,
  Question,
  RevisionItem,
  StudentProfile,
  AgentCycleLog,
  TeacherAnalyticsReport,
  Trophy,
} from '../types/physics';
import {
  AcademicSubjectItem,
  AgentToolCallLog,
  EducatorClassItem,
  ErrorClassification,
  ExamAttemptItem,
  ExamMode,
  GeneratedQuestionSetItem,
  SkillTier,
  SpacedRevisionRecord,
  StudyDocumentItem,
  TopicMasteryItem,
  UniversalQuestion,
  UniversalUserProfile,
} from '../types/platform';
import { CONCEPTS, INITIAL_DEMO_COHORT } from '../data/physicsConcepts';
import { UNIVERSAL_SUBJECT_LIBRARY } from '../data/academicCatalog';
import { INITIAL_TROPHIES, checkAndAwardTrophies } from '../services/trophies';
import {
  evaluateStudentAnswer as serviceEvaluate,
  updateMastery as serviceUpdateMastery,
  getWeakestConcept as serviceGetWeakest,
  generateAdaptiveQuestion as serviceGenerateQuestion,
  scheduleRevision as serviceScheduleRevision,
  computeUniversalSpacedRevision,
  getTeacherAnalytics as serviceGetTeacherAnalytics,
  runLearningCycle,
} from '../services/learningAgent';
import {
  auth,
  db,
  googleProvider,
  OperationType,
  handleFirestoreError,
  sanitizeDocId,
  clampInt,
  clampStr,
  buildFirestoreUserPayloads,
  buildFirestoreSubjectPayload,
  buildFirestoreTopicPayload,
  buildFirestoreQuestionSetPayload,
  buildFirestoreExamAttemptPayload,
  buildFirestoreRevisionPayload,
  buildFirestoreEducatorClassPayload,
  buildFirestoreStudyDocPayload,
} from '../lib/firebase';

export interface ActiveExamLaunchConfig {
  title: string;
  mode: ExamMode;
  subjectName: string;
  timeLimitMinutes: number;
  negativeMarks: number;
  questions: UniversalQuestion[];
}

interface LearnerContextType {
  // Theme & Auth / Workspace State
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  firebaseUser: User | null;
  authReady: boolean;
  workspaceMode: 'landing' | 'sandbox' | 'cloud';
  enterSandboxWorkspace: () => void;
  openLandingPage: () => void;
  signInWithGoogleAccount: () => Promise<void>;
  signOutWorkspace: () => Promise<void>;
  deleteAccountAndData: () => Promise<void>;
  showOnboardingModal: boolean;
  setShowOnboardingModal: (open: boolean) => void;

  // Universal Academic Profile & Curriculum
  universalProfile: UniversalUserProfile;
  saveUniversalProfile: (nextProfile: UniversalUserProfile, seedSelectedSubjects?: boolean) => Promise<void>;
  subjects: AcademicSubjectItem[];
  topics: TopicMasteryItem[];
  activeSubjectId: string;
  setActiveSubjectId: (id: string) => void;
  addSubject: (input: {
    name: string;
    category: string;
    courseCode?: string;
    educationLevel?: string;
    description?: string;
    chaptersList?: string[];
    seedFromCatalog?: boolean;
  }) => Promise<AcademicSubjectItem>;
  updateSubject: (subjectId: string, updates: Partial<AcademicSubjectItem>) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  addTopic: (input: {
    subjectId: string;
    chapterName: string;
    name: string;
    formulaOrKeyRule?: string;
  }) => Promise<TopicMasteryItem>;
  deleteTopic: (topicId: string) => Promise<void>;
  suggestCurriculumWithAI: (subjectId: string) => Promise<number>;

  // Evidence-Based Mastery & Universal Spaced Repetition
  recordTopicEvidence: (params: {
    topicId?: string;
    subjectName: string;
    chapterName?: string;
    topicName: string;
    scorePercent: number;
    isCorrect: boolean;
    difficulty: SkillTier;
    timeSpentSeconds: number;
    errorClassification: ErrorClassification;
    misconceptionNote?: string;
  }) => Promise<void>;
  universalRevisions: SpacedRevisionRecord[];
  markUniversalRevisionReviewed: (revisionId: string, recallScore: number) => Promise<void>;
  universalDueRevisionsCount: number;

  // Question Bank, Exams, Documents, Educator Classes & AI Agent Copilot
  questionSets: GeneratedQuestionSetItem[];
  saveQuestionSet: (setItem: Omit<GeneratedQuestionSetItem, 'id' | 'ownerId' | 'createdAt'>) => Promise<GeneratedQuestionSetItem>;
  deleteQuestionSet: (setId: string) => Promise<void>;
  examAttempts: ExamAttemptItem[];
  recordExamAttempt: (attempt: Omit<ExamAttemptItem, 'id' | 'ownerId' | 'createdAt'>) => Promise<ExamAttemptItem>;
  activeExamLaunch: ActiveExamLaunchConfig | null;
  setActiveExamLaunch: (cfg: ActiveExamLaunchConfig | null) => void;
  educatorClasses: EducatorClassItem[];
  createEducatorClass: (input: {
    name: string;
    subjectName: string;
    educationLevel: string;
    institutionName: string;
    departmentName?: string;
  }) => Promise<EducatorClassItem>;
  updateEducatorClass: (classId: string, updates: Partial<EducatorClassItem>) => Promise<void>;
  deleteEducatorClass: (classId: string) => Promise<void>;
  studyDocuments: StudyDocumentItem[];
  saveStudyDocument: (docItem: Omit<StudyDocumentItem, 'id' | 'ownerId' | 'createdAt'>) => Promise<StudyDocumentItem>;
  deleteStudyDocument: (docId: string) => Promise<void>;
  executePlatformAgent: (userPrompt: string) => Promise<{ reply: string; toolLogs: AgentToolCallLog[] }>;

  // Preserved Legacy Exports for Physics Modules
  profile: StudentProfile;
  masteries: Record<ConceptId, ConceptMastery>;
  revisions: RevisionItem[];
  recentEvaluations: Array<EvaluationResult & { questionTitle: string; timestamp: string }>;
  agentActivityLogs: AgentCycleLog[];
  trophies: Trophy[];
  latestAwardedTrophy: Trophy | null;
  dismissTrophyCelebration: () => void;
  evaluateStudentAnswer: typeof serviceEvaluate;
  updateMastery: (conceptId: ConceptId, evaluation: EvaluationResult) => void;
  getWeakestConcept: () => ConceptMastery;
  getWeakestTopicUniversal: () => TopicMasteryItem | null;
  generateAdaptiveQuestion: typeof serviceGenerateQuestion;
  scheduleRevision: (conceptId: ConceptId, score: number) => void;
  getTeacherAnalytics: () => TeacherAnalyticsReport;
  executeAgentLearningCycle: (params: {
    question: Question;
    studentAnswer: string;
    studentReasoning: string;
    subjectName?: string;
    chapterName?: string;
    topicId?: string;
    onStepUpdate?: (step: any) => void;
  }) => Promise<{
    evaluation: EvaluationResult;
    nextQuestion: Question;
    cycleLog: AgentCycleLog;
  }>;
  updateMasteryFromEvaluation: (
    conceptId: ConceptId,
    evaluation: EvaluationResult,
    questionTitle: string
  ) => void;
  completeDiagnostic: (result: DiagnosticResult) => void;
  markRevisionReviewed: (revisionId: string, score: number) => void;
  resetProgress: () => void;
  dueRevisionsCount: number;
}

const STORAGE_KEY = 'learnloop_ai_state_v1';
const PLATFORM_KEY = 'learnloop_universal_v2';

const getFutureDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const INITIAL_MASTERIES: Record<ConceptId, ConceptMastery> = {
  'electric-current': {
    conceptId: 'electric-current',
    name: CONCEPTS['electric-current'].name,
    score: 65,
    questionsAttempted: 4,
    questionsCorrect: 3,
    lastPracticed: 'Yesterday',
    status: 'developing',
    detectedMisconceptions: [],
  },
  'potential-difference': {
    conceptId: 'potential-difference',
    name: CONCEPTS['potential-difference'].name,
    score: 55,
    questionsAttempted: 3,
    questionsCorrect: 2,
    lastPracticed: '2 days ago',
    status: 'developing',
    detectedMisconceptions: ['Thinking voltage flows through wires'],
  },
  resistance: {
    conceptId: 'resistance',
    name: CONCEPTS['resistance'].name,
    score: 50,
    questionsAttempted: 5,
    questionsCorrect: 2,
    lastPracticed: '3 days ago',
    status: 'needs-focus',
    detectedMisconceptions: ['Stated wire resistivity changes when wire is cut'],
  },
  'ohms-law': {
    conceptId: 'ohms-law',
    name: CONCEPTS['ohms-law'].name,
    score: 72,
    questionsAttempted: 6,
    questionsCorrect: 5,
    lastPracticed: 'Today',
    status: 'proficient',
    detectedMisconceptions: [],
  },
  circuits: {
    conceptId: 'circuits',
    name: CONCEPTS['circuits'].name,
    score: 42,
    questionsAttempted: 5,
    questionsCorrect: 2,
    lastPracticed: 'Today',
    status: 'needs-focus',
    detectedMisconceptions: [
      'Believed parallel branches split voltage rather than current',
      'Assumed current is used up by resistors',
    ],
  },
};

const INITIAL_PROFILE: StudentProfile = {
  name: 'Alex Morgan',
  grade: 'Undergraduate · Computer Science & Physics',
  streakDays: 4,
  lastActiveDate: new Date().toISOString(),
  totalStudyMinutes: 145,
  diagnosticCompleted: false,
  diagnosticResult: null,
};

const INITIAL_UNIVERSAL_PROFILE: UniversalUserProfile = {
  uid: 'local-learner',
  displayName: 'Alex Morgan',
  email: 'alex.morgan@example.edu',
  personaType: 'student',
  country: 'India',
  institutionName: '',
  institutionType: 'Independent / No Institution',
  educationCategory: 'Higher Education',
  educationLevel: 'Undergraduate (B.Tech / B.E. / B.Sc / B.A. / B.Com / BBA)',
  customEducationLevel: '',
  gradeOrYear: 'Semester 3 / Year 2',
  degreeOrProgramme: 'B.Sc / B.Tech Honours',
  departmentOrBranch: 'Interdisciplinary Sciences & Computing',
  designation: '',
  teachingExperience: '',
  preferredLanguage: 'English',
  skillLevel: 'intermediate',
  learningGoals: 'Build rock-solid conceptual mastery, eliminate calculation & conceptual errors, and ace upcoming exams.',
  subjectsList: ['Physics', 'Computer Science', 'Mathematics'],
  streakDays: 4,
  totalStudyMinutes: 145,
  diagnosticCompleted: false,
  onboardingCompleted: false,
};

const INITIAL_SUBJECTS: AcademicSubjectItem[] = [
  {
    id: 'subj-physics',
    ownerId: 'local-learner',
    name: 'Physics',
    category: 'Natural Sciences',
    courseCode: 'PHYS-101',
    educationLevel: 'Class 10 / Foundational University',
    description: 'Electricity, Circuits, Mechanics, Thermodynamics, and Electromagnetism.',
    chaptersList: ['Electricity & Circuits', 'Electromagnetism & Optics'],
  },
  {
    id: 'subj-cs',
    ownerId: 'local-learner',
    name: 'Computer Science',
    category: 'Computing & Engineering',
    courseCode: 'CS-201',
    educationLevel: 'Undergraduate',
    description: 'Data Structures, Algorithms, Operating Systems, and Database Systems.',
    chaptersList: ['Data Structures & Algorithms', 'Database Systems'],
  },
  {
    id: 'subj-math',
    ownerId: 'local-learner',
    name: 'Mathematics',
    category: 'STEM & Quantitative',
    courseCode: 'MATH-101',
    educationLevel: 'Undergraduate',
    description: 'Calculus, Linear Algebra, Differential Equations, and Probability.',
    chaptersList: ['Calculus & Differentiation', 'Linear Algebra & Matrices'],
  },
];

const INITIAL_TOPICS: TopicMasteryItem[] = [
  {
    id: 'topic-circuits',
    ownerId: 'local-learner',
    subjectId: 'subj-physics',
    subjectName: 'Physics',
    chapterName: 'Electricity & Circuits',
    name: 'Series & Parallel Circuits',
    formulaOrKeyRule: 'Rs = R1 + R2 | 1/Rp = 1/R1 + 1/R2',
    score: 42,
    questionsAttempted: 5,
    questionsCorrect: 2,
    totalTimeSeconds: 420,
    difficultyTier: 'intermediate',
    status: 'needs-focus',
    lastChangeReason: 'Baseline assessment: 2/5 accurate; parallel current division misconception flagged.',
    misconceptions: ['Believed parallel branches split voltage rather than current'],
    legacyConceptId: 'circuits',
  },
  {
    id: 'topic-resistance',
    ownerId: 'local-learner',
    subjectId: 'subj-physics',
    subjectName: 'Physics',
    chapterName: 'Electricity & Circuits',
    name: 'Resistance & Resistivity',
    formulaOrKeyRule: 'R = ρ · (l / A)',
    score: 50,
    questionsAttempted: 5,
    questionsCorrect: 2,
    totalTimeSeconds: 380,
    difficultyTier: 'intermediate',
    status: 'developing',
    lastChangeReason: 'Baseline assessment: wire stretching area-volume inverse relationship needs practice.',
    misconceptions: ['Stated wire resistivity changes when wire is cut'],
    legacyConceptId: 'resistance',
  },
  {
    id: 'topic-potential',
    ownerId: 'local-learner',
    subjectId: 'subj-physics',
    subjectName: 'Physics',
    chapterName: 'Electricity & Circuits',
    name: 'Potential Difference',
    formulaOrKeyRule: 'V = W / Q',
    score: 55,
    questionsAttempted: 3,
    questionsCorrect: 2,
    totalTimeSeconds: 240,
    difficultyTier: 'intermediate',
    status: 'developing',
    lastChangeReason: '2/3 correct; clarify potential difference across nodes vs current flow.',
    misconceptions: ['Thinking voltage flows through wires'],
    legacyConceptId: 'potential-difference',
  },
  {
    id: 'topic-current',
    ownerId: 'local-learner',
    subjectId: 'subj-physics',
    subjectName: 'Physics',
    chapterName: 'Electricity & Circuits',
    name: 'Electric Current',
    formulaOrKeyRule: 'I = Q / t',
    score: 65,
    questionsAttempted: 4,
    questionsCorrect: 3,
    totalTimeSeconds: 290,
    difficultyTier: 'intermediate',
    status: 'proficient',
    lastChangeReason: '3/4 correct on charge conservation problems.',
    misconceptions: [],
    legacyConceptId: 'electric-current',
  },
  {
    id: 'topic-ohms-law',
    ownerId: 'local-learner',
    subjectId: 'subj-physics',
    subjectName: 'Physics',
    chapterName: 'Electricity & Circuits',
    name: "Ohm's Law",
    formulaOrKeyRule: 'V = I · R',
    score: 72,
    questionsAttempted: 6,
    questionsCorrect: 5,
    totalTimeSeconds: 410,
    difficultyTier: 'exam-prep',
    status: 'proficient',
    lastChangeReason: '5/6 correct on V-I slope and proportionality problems.',
    misconceptions: [],
    legacyConceptId: 'ohms-law',
  },
  {
    id: 'topic-cs-graphs',
    ownerId: 'local-learner',
    subjectId: 'subj-cs',
    subjectName: 'Computer Science',
    chapterName: 'Data Structures & Algorithms',
    name: 'Graph Traversal (BFS & DFS)',
    formulaOrKeyRule: 'Time: O(V + E) | Queue for BFS, Stack/Recursion for DFS',
    score: 61,
    questionsAttempted: 4,
    questionsCorrect: 2,
    totalTimeSeconds: 510,
    difficultyTier: 'intermediate',
    status: 'developing',
    lastChangeReason: '2/4 correct; visited-set cycle prevention on directed graphs needs review.',
    misconceptions: [],
  },
  {
    id: 'topic-cs-dp',
    ownerId: 'local-learner',
    subjectId: 'subj-cs',
    subjectName: 'Computer Science',
    chapterName: 'Data Structures & Algorithms',
    name: 'Dynamic Programming & Memoization',
    formulaOrKeyRule: 'Optimal Substructure + Overlapping Subproblems',
    score: 48,
    questionsAttempted: 3,
    questionsCorrect: 1,
    totalTimeSeconds: 460,
    difficultyTier: 'foundational',
    status: 'needs-focus',
    lastChangeReason: '1/3 correct; state transition recurrence formulation requires guided practice.',
    misconceptions: ['Applied greedy choice where overlapping subproblems required DP'],
  },
  {
    id: 'topic-math-chain',
    ownerId: 'local-learner',
    subjectId: 'subj-math',
    subjectName: 'Mathematics',
    chapterName: 'Calculus & Differentiation',
    name: 'Chain Rule & Derivatives',
    formulaOrKeyRule: "d/dx [f(g(x))] = f'(g(x)) · g'(x)",
    score: 76,
    questionsAttempted: 5,
    questionsCorrect: 4,
    totalTimeSeconds: 350,
    difficultyTier: 'exam-prep',
    status: 'proficient',
    lastChangeReason: '4/5 correct; strong composite function differentiation accuracy.',
    misconceptions: [],
  },
];

const INITIAL_REVISIONS: RevisionItem[] = [
  {
    id: 'rev-circuits',
    conceptId: 'circuits',
    conceptName: 'Series & Parallel Circuits',
    dueDate: getFutureDate(0),
    intervalDays: 1,
    repetitions: 1,
    easeFactor: 2.2,
    status: 'due',
    lastReviewedScore: 42,
  },
  {
    id: 'rev-resistance',
    conceptId: 'resistance',
    conceptName: 'Resistance & Resistivity',
    dueDate: getFutureDate(0),
    intervalDays: 2,
    repetitions: 2,
    easeFactor: 2.3,
    status: 'due',
    lastReviewedScore: 50,
  },
  {
    id: 'rev-potential',
    conceptId: 'potential-difference',
    conceptName: 'Potential Difference',
    dueDate: getFutureDate(1),
    intervalDays: 3,
    repetitions: 3,
    easeFactor: 2.5,
    status: 'upcoming',
    lastReviewedScore: 55,
  },
  {
    id: 'rev-current',
    conceptId: 'electric-current',
    conceptName: 'Electric Current',
    dueDate: getFutureDate(4),
    intervalDays: 5,
    repetitions: 4,
    easeFactor: 2.6,
    status: 'upcoming',
    lastReviewedScore: 65,
  },
  {
    id: 'rev-ohms',
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    dueDate: getFutureDate(7),
    intervalDays: 7,
    repetitions: 5,
    easeFactor: 2.7,
    status: 'upcoming',
    lastReviewedScore: 72,
  },
];

const INITIAL_UNIVERSAL_REVISIONS: SpacedRevisionRecord[] = [
  {
    id: 'urev-topic-circuits',
    ownerId: 'local-learner',
    topicKey: 'topic-circuits',
    subjectName: 'Physics',
    topicName: 'Series & Parallel Circuits',
    dueDate: getFutureDate(0),
    intervalDays: 1,
    repetitions: 1,
    easeFactor: 2.2,
    lastScore: 42,
    status: 'due',
  },
  {
    id: 'urev-topic-cs-dp',
    ownerId: 'local-learner',
    topicKey: 'topic-cs-dp',
    subjectName: 'Computer Science',
    topicName: 'Dynamic Programming & Memoization',
    dueDate: getFutureDate(0),
    intervalDays: 1,
    repetitions: 1,
    easeFactor: 2.3,
    lastScore: 48,
    status: 'due',
  },
  {
    id: 'urev-topic-resistance',
    ownerId: 'local-learner',
    topicKey: 'topic-resistance',
    subjectName: 'Physics',
    topicName: 'Resistance & Resistivity',
    dueDate: getFutureDate(1),
    intervalDays: 2,
    repetitions: 2,
    easeFactor: 2.4,
    lastScore: 50,
    status: 'upcoming',
  },
  {
    id: 'urev-topic-math-chain',
    ownerId: 'local-learner',
    topicKey: 'topic-math-chain',
    subjectName: 'Mathematics',
    topicName: 'Chain Rule & Derivatives',
    dueDate: getFutureDate(5),
    intervalDays: 5,
    repetitions: 3,
    easeFactor: 2.6,
    lastScore: 76,
    status: 'upcoming',
  },
];

const INITIAL_AGENT_LOGS: AgentCycleLog[] = [
  {
    id: 'cycle-seed-1',
    timestamp: '11:20 AM',
    questionTitle: 'Comparing Series and Parallel Connections',
    evaluatedConceptId: 'circuits',
    evaluatedConceptName: 'Series & Parallel Circuits',
    steps: [
      {
        stepNumber: 1,
        title: "Evaluating Student's Answer & Reasoning",
        description: 'Evaluated final value (4 Ω) and parallel branch current explanation',
        timestamp: '11:20:01 AM',
        status: 'completed',
        category: 'gemini_reasoning',
      },
      {
        stepNumber: 2,
        title: 'Mapping Academic Topic & Syllabus Node',
        description: 'Mapped to Physics: Series & Parallel Circuits (1/Rp = 1/R1 + 1/R2)',
        timestamp: '11:20:02 AM',
        status: 'completed',
        category: 'gemini_reasoning',
      },
      {
        stepNumber: 3,
        title: 'Differentiating Error Type & Misconceptions',
        description: 'Conceptual Misconception Diagnosed: "Believed current divides equally regardless of resistance in parallel"',
        timestamp: '11:20:03 AM',
        status: 'completed',
        category: 'gemini_reasoning',
      },
      {
        stepNumber: 4,
        title: 'Returning Evidence-Based Evaluation',
        description: 'Score: 65/100 · Mastery Delta: +4% · Verdict: Needs Review',
        timestamp: '11:20:04 AM',
        status: 'completed',
        category: 'gemini_reasoning',
      },
      {
        stepNumber: 5,
        title: 'Updating Learner Mastery Model',
        description: 'Evidence transition: 38% → 42% (Status: needs-focus)',
        timestamp: '11:20:05 AM',
        status: 'completed',
        category: 'application_function',
      },
      {
        stepNumber: 6,
        title: 'Identifying Next Priority Concept',
        description: 'Targeted next focus: Series & Parallel Circuits (42%)',
        timestamp: '11:20:05 AM',
        status: 'completed',
        category: 'application_function',
      },
      {
        stepNumber: 7,
        title: 'Generating Targeted Adaptive Question',
        description: 'Synthesized targeted problem: "Current Division in Parallel Branches"',
        timestamp: '11:20:07 AM',
        status: 'completed',
        category: 'gemini_reasoning',
      },
      {
        stepNumber: 8,
        title: 'Scheduling Spaced Repetition (SM-2)',
        description: 'Scheduled revision for tomorrow (Interval: 1 day)',
        timestamp: '11:20:07 AM',
        status: 'completed',
        category: 'application_function',
      },
    ],
    score: 65,
    masteryBefore: 38,
    masteryAfter: 42,
    masteryDelta: 4,
    detectedMisconceptions: ['Believed current divides equally regardless of resistance in parallel'],
    weakestConceptId: 'circuits',
    weakestConceptName: 'Series & Parallel Circuits',
    generatedQuestionTitle: 'Current Division in Parallel Branches',
    scheduledRevisionDate: getFutureDate(1),
    scheduledRevisionInterval: 1,
  },
];

function computeStatusFromScore(score: number): TopicMasteryItem['status'] {
  if (score >= 80) return 'mastered';
  if (score >= 65) return 'proficient';
  if (score >= 45) return 'developing';
  return 'needs-focus';
}

const LearnerContext = createContext<LearnerContextType | undefined>(undefined);

export const LearnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(PLATFORM_KEY + '_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(PLATFORM_KEY + '_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Auth & Workspace Mode
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<'landing' | 'sandbox' | 'cloud'>(() => {
    try {
      const saved = localStorage.getItem(PLATFORM_KEY + '_mode');
      if (saved === 'sandbox') return 'sandbox';
    } catch {
      // ignore
    }
    return 'landing';
  });
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Universal Profile & Collections
  const [universalProfile, setUniversalProfile] = useState<UniversalUserProfile>(() => {
    try {
      const saved = localStorage.getItem(PLATFORM_KEY + '_uprofile');
      return saved ? JSON.parse(saved) : INITIAL_UNIVERSAL_PROFILE;
    } catch {
      return INITIAL_UNIVERSAL_PROFILE;
    }
  });

  const [subjects, setSubjects] = useState<AcademicSubjectItem[]>(() => {
    try {
      const saved = localStorage.getItem(PLATFORM_KEY + '_subjects');
      return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
    } catch {
      return INITIAL_SUBJECTS;
    }
  });

  const [topics, setTopics] = useState<TopicMasteryItem[]>(() => {
    try {
      const saved = localStorage.getItem(PLATFORM_KEY + '_topics');
      return saved ? JSON.parse(saved) : INITIAL_TOPICS;
    } catch {
      return INITIAL_TOPICS;
    }
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string>(() => {
    return INITIAL_SUBJECTS[0].id;
  });

  const [universalRevisions, setUniversalRevisions] = useState<SpacedRevisionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(PLATFORM_KEY + '_urevisions');
      return saved ? JSON.parse(saved) : INITIAL_UNIVERSAL_REVISIONS;
    } catch {
      return INITIAL_UNIVERSAL_REVISIONS;
    }
  });

  const [questionSets, setQuestionSets] = useState<GeneratedQuestionSetItem[]>(() => {
    try {
      const saved = localStorage.getItem(PLATFORM_KEY + '_qsets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [examAttempts, setExamAttempts] = useState<ExamAttemptItem[]>(() => {
    try {
      const saved = localStorage.getItem(PLATFORM_KEY + '_exams');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeExamLaunch, setActiveExamLaunch] = useState<ActiveExamLaunchConfig | null>(null);

  const [educatorClasses, setEducatorClasses] = useState<EducatorClassItem[]>(() => {
    try {
      const saved = localStorage.getItem(PLATFORM_KEY + '_classes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [studyDocuments, setStudyDocuments] = useState<StudyDocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem(PLATFORM_KEY + '_docs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Legacy Physics State
  const [profile, setProfile] = useState<StudentProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_profile');
      return saved ? JSON.parse(saved) : INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  });

  const [masteries, setMasteries] = useState<Record<ConceptId, ConceptMastery>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_masteries');
      return saved ? JSON.parse(saved) : INITIAL_MASTERIES;
    } catch {
      return INITIAL_MASTERIES;
    }
  });

  const [revisions, setRevisions] = useState<RevisionItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_revisions');
      return saved ? JSON.parse(saved) : INITIAL_REVISIONS;
    } catch {
      return INITIAL_REVISIONS;
    }
  });

  const [recentEvaluations, setRecentEvaluations] = useState<
    Array<EvaluationResult & { questionTitle: string; timestamp: string }>
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_evaluations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [agentActivityLogs, setAgentActivityLogs] = useState<AgentCycleLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_agent_logs');
      return saved ? JSON.parse(saved) : INITIAL_AGENT_LOGS;
    } catch {
      return INITIAL_AGENT_LOGS;
    }
  });

  const [trophies, setTrophies] = useState<Trophy[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_trophies');
      return saved ? JSON.parse(saved) : INITIAL_TROPHIES;
    } catch {
      return INITIAL_TROPHIES;
    }
  });

  const [latestAwardedTrophy, setLatestAwardedTrophy] = useState<Trophy | null>(null);
  const dismissTrophyCelebration = useCallback(() => setLatestAwardedTrophy(null), []);

  // Track whether Firestore user bootstrap is complete for current session
  const userBootstrappedRef = useRef<string | null>(null);

  const isCloudVerified = Boolean(firebaseUser && firebaseUser.emailVerified);

  // Sync universalProfile basic display into legacy profile header
  useEffect(() => {
    const levelLabel =
      universalProfile.educationCategory === 'Custom' && universalProfile.customEducationLevel
        ? universalProfile.customEducationLevel
        : universalProfile.educationLevel;
    setProfile((prev) => ({
      ...prev,
      name: universalProfile.displayName || prev.name,
      grade: [levelLabel, universalProfile.degreeOrProgramme || universalProfile.gradeOrYear]
        .filter(Boolean)
        .join(' · ') || prev.grade,
      streakDays: universalProfile.streakDays || prev.streakDays,
      totalStudyMinutes: universalProfile.totalStudyMinutes || prev.totalStudyMinutes,
    }));
  }, [
    universalProfile.displayName,
    universalProfile.educationCategory,
    universalProfile.educationLevel,
    universalProfile.customEducationLevel,
    universalProfile.degreeOrProgramme,
    universalProfile.gradeOrYear,
    universalProfile.streakDays,
    universalProfile.totalStudyMinutes,
  ]);

  // Persist to localStorage in sandbox / cache
  useEffect(() => {
    try {
      localStorage.setItem(PLATFORM_KEY + '_uprofile', JSON.stringify(universalProfile));
    } catch {}
  }, [universalProfile]);
  useEffect(() => {
    try {
      localStorage.setItem(PLATFORM_KEY + '_subjects', JSON.stringify(subjects));
    } catch {}
  }, [subjects]);
  useEffect(() => {
    try {
      localStorage.setItem(PLATFORM_KEY + '_topics', JSON.stringify(topics));
    } catch {}
  }, [topics]);
  useEffect(() => {
    try {
      localStorage.setItem(PLATFORM_KEY + '_urevisions', JSON.stringify(universalRevisions));
    } catch {}
  }, [universalRevisions]);
  useEffect(() => {
    try {
      localStorage.setItem(PLATFORM_KEY + '_qsets', JSON.stringify(questionSets));
    } catch {}
  }, [questionSets]);
  useEffect(() => {
    try {
      localStorage.setItem(PLATFORM_KEY + '_exams', JSON.stringify(examAttempts));
    } catch {}
  }, [examAttempts]);
  useEffect(() => {
    try {
      localStorage.setItem(PLATFORM_KEY + '_classes', JSON.stringify(educatorClasses));
    } catch {}
  }, [educatorClasses]);
  useEffect(() => {
    try {
      localStorage.setItem(PLATFORM_KEY + '_docs', JSON.stringify(studyDocuments));
    } catch {}
  }, [studyDocuments]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + '_profile', JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEY + '_masteries', JSON.stringify(masteries));
      localStorage.setItem(STORAGE_KEY + '_revisions', JSON.stringify(revisions));
      localStorage.setItem(STORAGE_KEY + '_evaluations', JSON.stringify(recentEvaluations));
      localStorage.setItem(STORAGE_KEY + '_agent_logs', JSON.stringify(agentActivityLogs));
      localStorage.setItem(STORAGE_KEY + '_trophies', JSON.stringify(trophies));
    } catch {}
  }, [profile, masteries, revisions, recentEvaluations, agentActivityLogs, trophies]);

  // Ensure /users/{uid} and /userPrivate/{uid} exist before creating child documents
  const ensureFirestoreUserBootstrap = useCallback(
    async (user: User, overrideProfile?: UniversalUserProfile) => {
      if (!user.emailVerified) return;
      const uid = sanitizeDocId(user.uid);
      const userRef = doc(db, 'users', uid);
      const privRef = doc(db, 'userPrivate', uid);

      try {
        const snap = await getDoc(userRef);
        const baseProfile: UniversalUserProfile = overrideProfile || {
          ...universalProfile,
          uid,
          displayName: user.displayName || universalProfile.displayName || 'Academic Learner',
          email: user.email || universalProfile.email || 'learner@example.com',
        };

        if (!snap.exists()) {
          const { publicProfile, privateInfo } = buildFirestoreUserPayloads(uid, baseProfile, true);
          await setDoc(userRef, publicProfile);
          const privSnap = await getDoc(privRef);
          if (!privSnap.exists()) {
            await setDoc(privRef, privateInfo);
          }
          userBootstrappedRef.current = uid;
        } else {
          userBootstrappedRef.current = uid;
          const data = snap.data();
          const privSnap = await getDoc(privRef);
          const emailVal = privSnap.exists()
            ? String(privSnap.data().email || user.email || '')
            : user.email || '';

          if (!overrideProfile) {
            setUniversalProfile({
              uid,
              displayName: String(data.displayName || user.displayName || 'Learner'),
              email: emailVal,
              personaType: data.personaType || 'student',
              country: data.country || '',
              institutionName: data.institutionName || '',
              institutionType: data.institutionType || 'Independent / No Institution',
              educationCategory: data.educationCategory || 'Higher Education',
              educationLevel: data.educationLevel || 'Undergraduate',
              customEducationLevel: data.customEducationLevel || '',
              gradeOrYear: data.gradeOrYear || '',
              degreeOrProgramme: data.degreeOrProgramme || '',
              departmentOrBranch: data.departmentOrBranch || '',
              designation: data.designation || '',
              teachingExperience: data.teachingExperience || '',
              preferredLanguage: data.preferredLanguage || 'English',
              skillLevel: data.skillLevel || 'intermediate',
              learningGoals: data.learningGoals || '',
              subjectsList: Array.isArray(data.subjectsList) ? data.subjectsList : [],
              streakDays: Number(data.streakDays) || 1,
              totalStudyMinutes: Number(data.totalStudyMinutes) || 0,
              diagnosticCompleted: Boolean(data.diagnosticCompleted),
              onboardingCompleted: Boolean(data.onboardingCompleted),
            });
            if (!data.onboardingCompleted) {
              setShowOnboardingModal(true);
            }
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }
    },
    [universalProfile]
  );

  // Firebase Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user && user.emailVerified) {
        setWorkspaceMode('cloud');
        try {
          await ensureFirestoreUserBootstrap(user);
        } catch {
          // Handled inside ensureFirestoreUserBootstrap
        }
      }
    });
    return () => unsub();
  }, [ensureFirestoreUserBootstrap]);

  // Firestore Real-time Listeners (ONLY when authReady && firebaseUser?.emailVerified)
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) return;
    const uid = sanitizeDocId(firebaseUser.uid);

    const unsubs: Array<() => void> = [];

    // 1. Subjects
    unsubs.push(
      onSnapshot(
        query(collection(db, 'subjects'), where('ownerId', '==', uid)),
        (snap) => {
          if (!snap.empty) {
            const loaded: AcademicSubjectItem[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                ownerId: data.ownerId,
                name: data.name,
                category: data.category,
                courseCode: data.courseCode || '',
                educationLevel: data.educationLevel || '',
                description: data.description || '',
                chaptersList: Array.isArray(data.chaptersList) ? data.chaptersList : [],
              };
            });
            setSubjects(loaded);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'subjects')
      )
    );

    // 2. Topics
    unsubs.push(
      onSnapshot(
        query(collection(db, 'topics'), where('ownerId', '==', uid)),
        (snap) => {
          if (!snap.empty) {
            const loaded: TopicMasteryItem[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                ownerId: data.ownerId,
                subjectId: data.subjectId,
                subjectName: data.subjectName,
                chapterName: data.chapterName,
                name: data.name,
                formulaOrKeyRule: data.formulaOrKeyRule || '',
                score: Number(data.score) || 50,
                questionsAttempted: Number(data.questionsAttempted) || 0,
                questionsCorrect: Number(data.questionsCorrect) || 0,
                totalTimeSeconds: Number(data.totalTimeSeconds) || 0,
                difficultyTier: data.difficultyTier || 'intermediate',
                status: data.status || 'developing',
                lastChangeReason: data.lastChangeReason || '',
                misconceptions: Array.isArray(data.misconceptions) ? data.misconceptions : [],
              };
            });
            setTopics(loaded);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'topics')
      )
    );

    // 3. Question Sets
    unsubs.push(
      onSnapshot(
        query(collection(db, 'questionSets'), where('ownerId', '==', uid)),
        (snap) => {
          const loaded: GeneratedQuestionSetItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerId: data.ownerId,
              title: data.title,
              subjectName: data.subjectName,
              chapterName: data.chapterName || '',
              educationLevel: data.educationLevel || '',
              examType: data.examType || '',
              questionFormat: data.questionFormat || 'mcq',
              difficulty: data.difficulty || 'intermediate',
              questionCount: Number(data.questionCount) || 5,
              marksPerQuestion: Number(data.marksPerQuestion) || 2,
              negativeMarks: Number(data.negativeMarksScaled || 0) / 100,
              timeLimitMinutes: Number(data.timeLimitMinutes) || 30,
              language: data.language || 'English',
              questions: Array.isArray(data.questions) ? data.questions : [],
              createdAt: 'Saved in Cloud',
            };
          });
          if (loaded.length > 0) setQuestionSets(loaded);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'questionSets')
      )
    );

    // 4. Exam Attempts
    unsubs.push(
      onSnapshot(
        query(collection(db, 'examAttempts'), where('ownerId', '==', uid)),
        (snap) => {
          const loaded: ExamAttemptItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerId: data.ownerId,
              title: data.title,
              mode: data.mode || 'practice',
              subjectName: data.subjectName,
              totalQuestions: Number(data.totalQuestions) || 1,
              correctCount: Number(data.correctCount) || 0,
              scoreEarned: Number(data.scoreScaled || 0) / 100,
              maxMarks: Number(data.maxMarksScaled || 100) / 100,
              percentage: Number(data.percentage) || 0,
              timeTakenSeconds: Number(data.timeTakenSeconds) || 0,
              misconceptionsCount: Number(data.misconceptionsCount) || 0,
              calculationErrorsCount: Number(data.calculationErrorsCount) || 0,
              incompleteCount: Number(data.incompleteCount) || 0,
              status: data.status || 'completed',
              createdAt: 'Completed',
            };
          });
          if (loaded.length > 0) setExamAttempts(loaded);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'examAttempts')
      )
    );

    // 5. Revisions
    unsubs.push(
      onSnapshot(
        query(collection(db, 'revisions'), where('ownerId', '==', uid)),
        (snap) => {
          if (!snap.empty) {
            const loaded: SpacedRevisionRecord[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                ownerId: data.ownerId,
                topicKey: data.topicKey,
                subjectName: data.subjectName,
                topicName: data.topicName,
                dueDate: data.dueDate,
                intervalDays: Number(data.intervalDays) || 1,
                repetitions: Number(data.repetitions) || 0,
                easeFactor: Number(data.easeFactorScaled || 250) / 100,
                lastScore: Number(data.lastScore) || 50,
                status: data.status || 'upcoming',
              };
            });
            setUniversalRevisions(loaded);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'revisions')
      )
    );

    // 6. Educator Classes
    unsubs.push(
      onSnapshot(
        query(collection(db, 'educatorClasses'), where('ownerId', '==', uid)),
        (snap) => {
          const loaded: EducatorClassItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerId: data.ownerId,
              name: data.name,
              subjectName: data.subjectName,
              educationLevel: data.educationLevel || '',
              institutionName: data.institutionName || '',
              inviteCode: data.inviteCode || 'LOOP-101',
              rosterList: Array.isArray(data.rosterList) ? data.rosterList : [],
              assignmentsList: Array.isArray(data.assignmentsList) ? data.assignmentsList : [],
              createdAt: 'Active',
            };
          });
          if (loaded.length > 0) setEducatorClasses(loaded);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'educatorClasses')
      )
    );

    // 7. Study Documents
    unsubs.push(
      onSnapshot(
        query(collection(db, 'studyDocuments'), where('ownerId', '==', uid)),
        (snap) => {
          const loaded: StudyDocumentItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerId: data.ownerId,
              title: data.title,
              fileName: data.fileName,
              mimeType: data.mimeType,
              subjectName: data.subjectName || 'General',
              summary: data.summary || '',
              revisionNotes: data.revisionNotes || '',
              extractedTopics: Array.isArray(data.extractedTopics) ? data.extractedTopics : [],
              flashcards: Array.isArray(data.flashcards) ? data.flashcards : [],
              createdAt: 'Uploaded',
            };
          });
          if (loaded.length > 0) setStudyDocuments(loaded);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'studyDocuments')
      )
    );

    return () => unsubs.forEach((fn) => fn());
  }, [authReady, firebaseUser]);

  // Auth & Workspace Actions
  const enterSandboxWorkspace = useCallback(() => {
    setWorkspaceMode('sandbox');
    try {
      localStorage.setItem(PLATFORM_KEY + '_mode', 'sandbox');
    } catch {}
    if (!universalProfile.onboardingCompleted) {
      setShowOnboardingModal(true);
    }
  }, [universalProfile.onboardingCompleted]);

  const openLandingPage = useCallback(() => {
    setWorkspaceMode('landing');
  }, []);

  const signInWithGoogleAccount = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    setWorkspaceMode('cloud');
    try {
      localStorage.setItem(PLATFORM_KEY + '_mode', 'cloud');
    } catch {}
    if (cred.user && cred.user.emailVerified) {
      const uid = sanitizeDocId(cred.user.uid);
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        const seeded: UniversalUserProfile = {
          ...universalProfile,
          uid,
          displayName: cred.user.displayName || universalProfile.displayName || 'Learner',
          email: cred.user.email || universalProfile.email,
          onboardingCompleted: false,
        };
        setUniversalProfile(seeded);
        await ensureFirestoreUserBootstrap(cred.user, seeded);
        setShowOnboardingModal(true);
      } else {
        await ensureFirestoreUserBootstrap(cred.user);
      }
    }
  }, [universalProfile, ensureFirestoreUserBootstrap]);

  const signOutWorkspace = useCallback(async () => {
    if (firebaseUser) {
      await firebaseSignOut(auth);
    }
    userBootstrappedRef.current = null;
    setWorkspaceMode('landing');
    try {
      localStorage.removeItem(PLATFORM_KEY + '_mode');
    } catch {}
  }, [firebaseUser]);

  // Add Subject helper
  const addSubject = useCallback(
    async (input: {
      name: string;
      category: string;
      courseCode?: string;
      educationLevel?: string;
      description?: string;
      chaptersList?: string[];
      seedFromCatalog?: boolean;
    }): Promise<AcademicSubjectItem> => {
      const uid = isCloudVerified && firebaseUser ? sanitizeDocId(firebaseUser.uid) : 'local-learner';
      const catalogMatch = UNIVERSAL_SUBJECT_LIBRARY.find(
        (s) => s.name.toLowerCase() === input.name.trim().toLowerCase()
      );

      const subjId = sanitizeDocId(
        `subj-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${Date.now().toString().slice(-5)}`
      );

      const chapters =
        input.chaptersList && input.chaptersList.length > 0
          ? input.chaptersList
          : catalogMatch
          ? catalogMatch.starterChapters.map((c) => c.chapter)
          : ['Unit 1: Core Foundations'];

      const newSubj: AcademicSubjectItem = {
        id: subjId,
        ownerId: uid,
        name: input.name.trim(),
        category: input.category || catalogMatch?.category || 'Custom Discipline',
        courseCode: input.courseCode || catalogMatch?.defaultCode || 'COURSE-101',
        educationLevel: input.educationLevel || universalProfile.educationLevel || 'Universal',
        description:
          input.description ||
          catalogMatch?.description ||
          `Personalized curriculum and adaptive assessments for ${input.name.trim()}.`,
        chaptersList: chapters,
      };

      setSubjects((prev) => [...prev, newSubj]);
      setActiveSubjectId(newSubj.id);

      if (isCloudVerified && firebaseUser) {
        try {
          await ensureFirestoreUserBootstrap(firebaseUser);
          await setDoc(
            doc(db, 'subjects', subjId),
            buildFirestoreSubjectPayload(uid, newSubj, true)
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `subjects/${subjId}`);
        }
      }

      // Seed starter topics if catalog match exists
      if (input.seedFromCatalog !== false && catalogMatch) {
        const starterTopics: TopicMasteryItem[] = [];
        for (const ch of catalogMatch.starterChapters) {
          for (const tp of ch.topics) {
            const tid = sanitizeDocId(
              `top-${subjId.slice(-8)}-${tp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}-${Math.floor(Math.random() * 900 + 100)}`
            );
            const topicItem: TopicMasteryItem = {
              id: tid,
              ownerId: uid,
              subjectId: subjId,
              subjectName: newSubj.name,
              chapterName: ch.chapter,
              name: tp.name,
              formulaOrKeyRule: tp.keyRule,
              score: 50,
              questionsAttempted: 0,
              questionsCorrect: 0,
              totalTimeSeconds: 0,
              difficultyTier: universalProfile.skillLevel || 'intermediate',
              status: 'developing',
              lastChangeReason: 'Initialized at 50% baseline; complete practice or exam questions to calibrate.',
              misconceptions: [],
            };
            starterTopics.push(topicItem);
            if (isCloudVerified && firebaseUser) {
              try {
                await setDoc(
                  doc(db, 'topics', tid),
                  buildFirestoreTopicPayload(uid, topicItem, true)
                );
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, `topics/${tid}`);
              }
            }
          }
        }
        if (starterTopics.length > 0) {
          setTopics((prev) => [...prev, ...starterTopics]);
        }
      }

      return newSubj;
    },
    [isCloudVerified, firebaseUser, universalProfile.educationLevel, universalProfile.skillLevel, ensureFirestoreUserBootstrap]
  );

  // Save Universal Profile (respecting Firestore create vs update affectedKeys rules!)
  const saveUniversalProfile = useCallback(
    async (nextProfile: UniversalUserProfile, seedSelectedSubjects = false) => {
      const uid =
        isCloudVerified && firebaseUser ? sanitizeDocId(firebaseUser.uid) : nextProfile.uid || 'local-learner';
      const normalized: UniversalUserProfile = {
        ...nextProfile,
        uid,
        onboardingCompleted: true,
      };
      setUniversalProfile(normalized);

      if (isCloudVerified && firebaseUser) {
        const userRef = doc(db, 'users', uid);
        const privRef = doc(db, 'userPrivate', uid);
        try {
          const snap = await getDoc(userRef);
          const { publicProfile, privateInfo } = buildFirestoreUserPayloads(uid, normalized, !snap.exists());
          if (!snap.exists()) {
            await setDoc(userRef, publicProfile);
          } else {
            await updateDoc(userRef, {
              displayName: publicProfile.displayName,
              personaType: publicProfile.personaType,
              country: publicProfile.country,
              institutionName: publicProfile.institutionName,
              institutionType: publicProfile.institutionType,
              educationCategory: publicProfile.educationCategory,
              educationLevel: publicProfile.educationLevel,
              customEducationLevel: publicProfile.customEducationLevel,
              gradeOrYear: publicProfile.gradeOrYear,
              degreeOrProgramme: publicProfile.degreeOrProgramme,
              departmentOrBranch: publicProfile.departmentOrBranch,
              designation: publicProfile.designation,
              teachingExperience: publicProfile.teachingExperience,
              preferredLanguage: publicProfile.preferredLanguage,
              skillLevel: publicProfile.skillLevel,
              learningGoals: publicProfile.learningGoals,
              subjectsList: publicProfile.subjectsList,
              onboardingCompleted: publicProfile.onboardingCompleted,
              updatedAt: serverTimestamp(),
            });
          }

          const privSnap = await getDoc(privRef);
          if (!privSnap.exists()) {
            await setDoc(privRef, privateInfo);
          } else if (privSnap.data().email !== privateInfo.email) {
            await updateDoc(privRef, {
              email: privateInfo.email,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
        }
      }

      if (seedSelectedSubjects && normalized.subjectsList.length > 0) {
        const existingNames = new Set(subjects.map((s) => s.name.toLowerCase()));
        for (const sName of normalized.subjectsList) {
          if (!existingNames.has(sName.trim().toLowerCase())) {
            await addSubject({
              name: sName.trim(),
              category: 'Selected Discipline',
              educationLevel:
                normalized.educationCategory === 'Custom' && normalized.customEducationLevel
                  ? normalized.customEducationLevel
                  : normalized.educationLevel,
              seedFromCatalog: true,
            });
          }
        }
      }
    },
    [isCloudVerified, firebaseUser, subjects, addSubject]
  );

  const updateSubject = useCallback(
    async (subjectId: string, updates: Partial<AcademicSubjectItem>) => {
      let target: AcademicSubjectItem | undefined;
      setSubjects((prev) =>
        prev.map((s) => {
          if (s.id !== subjectId) return s;
          target = { ...s, ...updates };
          return target;
        })
      );

      if (isCloudVerified && firebaseUser && target) {
        const uid = sanitizeDocId(firebaseUser.uid);
        const built = buildFirestoreSubjectPayload(uid, target, false);
        try {
          const ref = doc(db, 'subjects', sanitizeDocId(subjectId));
          const snap = await getDoc(ref);
          if (snap.exists()) {
            await updateDoc(ref, {
              name: built.name,
              category: built.category,
              courseCode: built.courseCode,
              educationLevel: built.educationLevel,
              description: built.description,
              chaptersList: built.chaptersList,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `subjects/${subjectId}`);
        }
      }
    },
    [isCloudVerified, firebaseUser]
  );

  const deleteSubject = useCallback(
    async (subjectId: string) => {
      const relatedTopics = topics.filter((t) => t.subjectId === subjectId);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      setTopics((prev) => prev.filter((t) => t.subjectId !== subjectId));

      if (isCloudVerified && firebaseUser) {
        try {
          for (const rt of relatedTopics) {
            await deleteDoc(doc(db, 'topics', sanitizeDocId(rt.id))).catch(() => {});
          }
          await deleteDoc(doc(db, 'subjects', sanitizeDocId(subjectId))).catch(() => {});
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `subjects/${subjectId}`);
        }
      }
    },
    [topics, isCloudVerified, firebaseUser]
  );

  const addTopic = useCallback(
    async (input: {
      subjectId: string;
      chapterName: string;
      name: string;
      formulaOrKeyRule?: string;
    }): Promise<TopicMasteryItem> => {
      const subj = subjects.find((s) => s.id === input.subjectId) || subjects[0];
      const uid = isCloudVerified && firebaseUser ? sanitizeDocId(firebaseUser.uid) : 'local-learner';
      const tid = sanitizeDocId(
        `top-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${Date.now().toString().slice(-5)}`
      );

      const newTopic: TopicMasteryItem = {
        id: tid,
        ownerId: uid,
        subjectId: subj ? subj.id : input.subjectId,
        subjectName: subj ? subj.name : 'General Studies',
        chapterName: input.chapterName.trim() || 'Core Chapter',
        name: input.name.trim(),
        formulaOrKeyRule: input.formulaOrKeyRule?.trim() || '',
        score: 50,
        questionsAttempted: 0,
        questionsCorrect: 0,
        totalTimeSeconds: 0,
        difficultyTier: universalProfile.skillLevel || 'intermediate',
        status: 'developing',
        lastChangeReason: 'Newly added topic; complete an assessment or tutor problem to establish evidence.',
        misconceptions: [],
      };

      setTopics((prev) => [...prev, newTopic]);

      // Ensure chapter is listed on the subject
      if (subj && !subj.chaptersList.includes(newTopic.chapterName)) {
        await updateSubject(subj.id, {
          chaptersList: [...subj.chaptersList, newTopic.chapterName],
        });
      }

      if (isCloudVerified && firebaseUser && subj) {
        try {
          await ensureFirestoreUserBootstrap(firebaseUser);
          const subjRef = doc(db, 'subjects', sanitizeDocId(subj.id));
          const subjSnap = await getDoc(subjRef);
          if (!subjSnap.exists()) {
            await setDoc(subjRef, buildFirestoreSubjectPayload(uid, subj, true));
          }
          await setDoc(doc(db, 'topics', tid), buildFirestoreTopicPayload(uid, newTopic, true));
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `topics/${tid}`);
        }
      }

      return newTopic;
    },
    [subjects, isCloudVerified, firebaseUser, universalProfile.skillLevel, updateSubject, ensureFirestoreUserBootstrap]
  );

  const deleteTopic = useCallback(
    async (topicId: string) => {
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
      if (isCloudVerified && firebaseUser) {
        try {
          await deleteDoc(doc(db, 'topics', sanitizeDocId(topicId))).catch(() => {});
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `topics/${topicId}`);
        }
      }
    },
    [isCloudVerified, firebaseUser]
  );

  const suggestCurriculumWithAI = useCallback(
    async (subjectId: string): Promise<number> => {
      const subj = subjects.find((s) => s.id === subjectId);
      if (!subj) return 0;

      const res = await fetch('/api/curriculum/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: subj.name,
          educationLevel: subj.educationLevel || universalProfile.educationLevel,
          degreeOrProgramme: universalProfile.degreeOrProgramme,
          language: universalProfile.preferredLanguage || 'English',
        }),
      });

      if (!res.ok) throw new Error('Failed to generate syllabus topics.');
      const data = await res.json();
      const chapters = Array.isArray(data.chapters) ? data.chapters : [];
      let addedCount = 0;

      const existingTopicNames = new Set(
        topics.filter((t) => t.subjectId === subjectId).map((t) => t.name.toLowerCase())
      );

      for (const ch of chapters) {
        const chName = String(ch.chapterName || 'Core Unit').trim();
        for (const tp of ch.topics || []) {
          if (!tp.name || existingTopicNames.has(String(tp.name).toLowerCase())) continue;
          await addTopic({
            subjectId,
            chapterName: chName,
            name: String(tp.name),
            formulaOrKeyRule: String(tp.formulaOrKeyRule || ''),
          });
          existingTopicNames.add(String(tp.name).toLowerCase());
          addedCount += 1;
        }
      }

      if (data.description && !subj.description) {
        await updateSubject(subjectId, { description: String(data.description) });
      }
      return addedCount;
    },
    [subjects, topics, universalProfile, addTopic, updateSubject]
  );

  // Evidence-Based Topic Mastery & SM-2 Spaced Repetition Updater
  const recordTopicEvidence = useCallback(
    async (params: {
      topicId?: string;
      subjectName: string;
      chapterName?: string;
      topicName: string;
      scorePercent: number;
      isCorrect: boolean;
      difficulty: SkillTier;
      timeSpentSeconds: number;
      errorClassification: ErrorClassification;
      misconceptionNote?: string;
    }) => {
      const uid = isCloudVerified && firebaseUser ? sanitizeDocId(firebaseUser.uid) : 'local-learner';
      const existingTopic =
        (params.topicId ? topics.find((t) => t.id === params.topicId) : undefined) ||
        topics.find(
          (t) =>
            t.name.toLowerCase() === params.topicName.trim().toLowerCase() &&
            t.subjectName.toLowerCase() === params.subjectName.trim().toLowerCase()
        );

      const diffWeight =
        params.difficulty === 'exam-prep'
          ? 1.25
          : params.difficulty === 'advanced'
          ? 1.15
          : params.difficulty === 'foundational'
          ? 0.85
          : 1.0;

      const prevScore = existingTopic ? existingTopic.score : 50;
      let delta = 0;
      if (params.errorClassification === 'accurate' || params.scorePercent >= 80) {
        delta = Math.max(3, Math.min(14, Math.round(((100 - prevScore) * 0.16 + 3) * diffWeight)));
      } else if (params.errorClassification === 'calculation_error') {
        delta = params.scorePercent >= 60 ? 2 : -2;
      } else if (params.errorClassification === 'incomplete_answer') {
        delta = params.scorePercent >= 55 ? 1 : -4;
      } else {
        delta = -Math.max(4, Math.min(12, Math.round(prevScore * 0.12 + 3)));
      }

      const nextScore = clampInt(prevScore + delta, 0, 100, 50);
      const nextStatus = computeStatusFromScore(nextScore);
      const nextTier: SkillTier =
        nextScore >= 82
          ? 'exam-prep'
          : nextScore >= 68
          ? 'advanced'
          : nextScore >= 48
          ? 'intermediate'
          : 'foundational';

      const reasonText = `${delta >= 0 ? `+${delta}%` : `${delta}%`} (${prevScore}% → ${nextScore}%) from ${
        params.difficulty
      } problem (${Math.round(params.scorePercent)}% score, ${params.errorClassification.replace(
        /_/g,
        ' '
      )}, ${Math.max(1, Math.round(params.timeSpentSeconds))}s).`;

      if (existingTopic) {
        const mergedMisconceptions =
          params.errorClassification === 'conceptual_misconception' && params.misconceptionNote
            ? Array.from(new Set([...existingTopic.misconceptions, params.misconceptionNote])).slice(0, 20)
            : existingTopic.misconceptions;

        const updatedTopic: TopicMasteryItem = {
          ...existingTopic,
          score: nextScore,
          questionsAttempted: existingTopic.questionsAttempted + 1,
          questionsCorrect: existingTopic.questionsCorrect + (params.isCorrect ? 1 : 0),
          totalTimeSeconds: existingTopic.totalTimeSeconds + Math.max(1, Math.round(params.timeSpentSeconds)),
          difficultyTier: nextTier,
          status: nextStatus,
          lastChangeReason: reasonText,
          misconceptions: mergedMisconceptions,
        };

        setTopics((prev) => prev.map((t) => (t.id === existingTopic.id ? updatedTopic : t)));

        if (isCloudVerified && firebaseUser) {
          try {
            const ref = doc(db, 'topics', sanitizeDocId(existingTopic.id));
            const snap = await getDoc(ref);
            const built = buildFirestoreTopicPayload(uid, updatedTopic, !snap.exists());
            if (snap.exists()) {
              await updateDoc(ref, {
                subjectName: built.subjectName,
                chapterName: built.chapterName,
                name: built.name,
                formulaOrKeyRule: built.formulaOrKeyRule,
                score: built.score,
                questionsAttempted: built.questionsAttempted,
                questionsCorrect: built.questionsCorrect,
                totalTimeSeconds: built.totalTimeSeconds,
                difficultyTier: built.difficultyTier,
                status: built.status,
                lastChangeReason: built.lastChangeReason,
                misconceptions: built.misconceptions,
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `topics/${existingTopic.id}`);
          }
        }
      }

      // Schedule / update Universal SM-2 Spaced Revision
      const tKey = sanitizeDocId(existingTopic ? existingTopic.id : `${params.subjectName}-${params.topicName}`);
      const existingRev = universalRevisions.find((r) => r.topicKey === tKey);
      const nextRev = computeUniversalSpacedRevision({
        existing: existingRev,
        ownerId: uid,
        topicKey: tKey,
        subjectName: params.subjectName,
        topicName: params.topicName,
        score: params.scorePercent,
      });

      setUniversalRevisions((prev) => {
        const exists = prev.some((r) => r.id === nextRev.id || r.topicKey === tKey);
        return exists
          ? prev.map((r) => (r.id === nextRev.id || r.topicKey === tKey ? nextRev : r))
          : [nextRev, ...prev];
      });

      if (isCloudVerified && firebaseUser) {
        try {
          await ensureFirestoreUserBootstrap(firebaseUser);
          const revRef = doc(db, 'revisions', sanitizeDocId(nextRev.id));
          const revSnap = await getDoc(revRef);
          const builtRev = buildFirestoreRevisionPayload(uid, nextRev, !revSnap.exists());
          if (!revSnap.exists()) {
            await setDoc(revRef, builtRev);
          } else {
            await updateDoc(revRef, {
              dueDate: builtRev.dueDate,
              intervalDays: builtRev.intervalDays,
              repetitions: builtRev.repetitions,
              easeFactorScaled: builtRev.easeFactorScaled,
              lastScore: builtRev.lastScore,
              status: builtRev.status,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `revisions/${nextRev.id}`);
        }
      }
    },
    [topics, universalRevisions, isCloudVerified, firebaseUser, ensureFirestoreUserBootstrap]
  );

  const markUniversalRevisionReviewed = useCallback(
    async (revisionId: string, recallScore: number) => {
      const target = universalRevisions.find((r) => r.id === revisionId);
      if (!target) return;
      const uid = isCloudVerified && firebaseUser ? sanitizeDocId(firebaseUser.uid) : 'local-learner';
      const updated = computeUniversalSpacedRevision({
        existing: target,
        ownerId: uid,
        topicKey: target.topicKey,
        subjectName: target.subjectName,
        topicName: target.topicName,
        score: recallScore,
      });

      setUniversalRevisions((prev) => prev.map((r) => (r.id === revisionId ? updated : r)));

      if (isCloudVerified && firebaseUser) {
        try {
          const revRef = doc(db, 'revisions', sanitizeDocId(updated.id));
          const snap = await getDoc(revRef);
          const built = buildFirestoreRevisionPayload(uid, updated, !snap.exists());
          if (!snap.exists()) {
            await setDoc(revRef, built);
          } else {
            await updateDoc(revRef, {
              dueDate: built.dueDate,
              intervalDays: built.intervalDays,
              repetitions: built.repetitions,
              easeFactorScaled: built.easeFactorScaled,
              lastScore: built.lastScore,
              status: built.status,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `revisions/${updated.id}`);
        }
      }
    },
    [universalRevisions, isCloudVerified, firebaseUser]
  );

  // Question Sets CRUD
  const saveQuestionSet = useCallback(
    async (
      setItem: Omit<GeneratedQuestionSetItem, 'id' | 'ownerId' | 'createdAt'>
    ): Promise<GeneratedQuestionSetItem> => {
      const uid = isCloudVerified && firebaseUser ? sanitizeDocId(firebaseUser.uid) : 'local-learner';
      const id = sanitizeDocId(`qset-${Date.now()}`);
      const fullSet: GeneratedQuestionSetItem = {
        ...setItem,
        id,
        ownerId: uid,
        createdAt: new Date().toLocaleDateString(),
      };
      setQuestionSets((prev) => [fullSet, ...prev]);

      if (isCloudVerified && firebaseUser) {
        try {
          await ensureFirestoreUserBootstrap(firebaseUser);
          await setDoc(
            doc(db, 'questionSets', id),
            buildFirestoreQuestionSetPayload(uid, fullSet, true)
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `questionSets/${id}`);
        }
      }
      return fullSet;
    },
    [isCloudVerified, firebaseUser, ensureFirestoreUserBootstrap]
  );

  const deleteQuestionSet = useCallback(
    async (setId: string) => {
      setQuestionSets((prev) => prev.filter((s) => s.id !== setId));
      if (isCloudVerified && firebaseUser) {
        try {
          await deleteDoc(doc(db, 'questionSets', sanitizeDocId(setId))).catch(() => {});
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `questionSets/${setId}`);
        }
      }
    },
    [isCloudVerified, firebaseUser]
  );

  // Exam Attempts
  const recordExamAttempt = useCallback(
    async (attempt: Omit<ExamAttemptItem, 'id' | 'ownerId' | 'createdAt'>): Promise<ExamAttemptItem> => {
      const uid = isCloudVerified && firebaseUser ? sanitizeDocId(firebaseUser.uid) : 'local-learner';
      const id = sanitizeDocId(`exam-${Date.now()}`);
      const fullAttempt: ExamAttemptItem = {
        ...attempt,
        id,
        ownerId: uid,
        createdAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      };
      setExamAttempts((prev) => [fullAttempt, ...prev]);

      const addedMinutes = Math.max(1, Math.round(attempt.timeTakenSeconds / 60));
      const nextMinutes = universalProfile.totalStudyMinutes + addedMinutes;
      setUniversalProfile((prev) => ({ ...prev, totalStudyMinutes: nextMinutes }));

      if (isCloudVerified && firebaseUser) {
        try {
          await ensureFirestoreUserBootstrap(firebaseUser);
          await setDoc(
            doc(db, 'examAttempts', id),
            buildFirestoreExamAttemptPayload(uid, fullAttempt, true)
          );
          const userRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            await updateDoc(userRef, {
              streakDays: clampInt(universalProfile.streakDays, 0, 10000, 1),
              totalStudyMinutes: clampInt(nextMinutes, 0, 10000000, 1),
              diagnosticCompleted: Boolean(universalProfile.diagnosticCompleted),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `examAttempts/${id}`);
        }
      }
      return fullAttempt;
    },
    [isCloudVerified, firebaseUser, universalProfile, ensureFirestoreUserBootstrap]
  );

  // Educator Classes CRUD
  const createEducatorClass = useCallback(
    async (input: {
      name: string;
      subjectName: string;
      educationLevel: string;
      institutionName: string;
      departmentName?: string;
    }): Promise<EducatorClassItem> => {
      const uid = isCloudVerified && firebaseUser ? sanitizeDocId(firebaseUser.uid) : 'local-learner';
      const id = sanitizeDocId(`cls-${Date.now()}`);
      const code = `LOOP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const newCls: EducatorClassItem = {
        id,
        ownerId: uid,
        name: input.name.trim(),
        subjectName: input.subjectName.trim(),
        educationLevel: input.educationLevel.trim(),
        institutionName: input.institutionName.trim(),
        departmentName: input.departmentName?.trim() || '',
        inviteCode: code,
        rosterList: [],
        assignmentsList: [],
        createdAt: new Date().toLocaleDateString(),
      };
      setEducatorClasses((prev) => [newCls, ...prev]);

      if (isCloudVerified && firebaseUser) {
        try {
          await ensureFirestoreUserBootstrap(firebaseUser);
          await setDoc(
            doc(db, 'educatorClasses', id),
            buildFirestoreEducatorClassPayload(uid, newCls, true)
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `educatorClasses/${id}`);
        }
      }
      return newCls;
    },
    [isCloudVerified, firebaseUser, ensureFirestoreUserBootstrap]
  );

  const updateEducatorClass = useCallback(
    async (classId: string, updates: Partial<EducatorClassItem>) => {
      let updatedItem: EducatorClassItem | undefined;
      setEducatorClasses((prev) =>
        prev.map((c) => {
          if (c.id !== classId) return c;
          updatedItem = { ...c, ...updates };
          return updatedItem;
        })
      );

      if (isCloudVerified && firebaseUser && updatedItem) {
        const uid = sanitizeDocId(firebaseUser.uid);
        try {
          const ref = doc(db, 'educatorClasses', sanitizeDocId(classId));
          const snap = await getDoc(ref);
          const built = buildFirestoreEducatorClassPayload(uid, updatedItem, !snap.exists());
          if (!snap.exists()) {
            await setDoc(ref, built);
          } else {
            await updateDoc(ref, {
              name: built.name,
              subjectName: built.subjectName,
              educationLevel: built.educationLevel,
              institutionName: built.institutionName,
              rosterList: built.rosterList,
              assignmentsList: built.assignmentsList,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `educatorClasses/${classId}`);
        }
      }
    },
    [isCloudVerified, firebaseUser]
  );

  const deleteEducatorClass = useCallback(
    async (classId: string) => {
      setEducatorClasses((prev) => prev.filter((c) => c.id !== classId));
      if (isCloudVerified && firebaseUser) {
        try {
          await deleteDoc(doc(db, 'educatorClasses', sanitizeDocId(classId))).catch(() => {});
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `educatorClasses/${classId}`);
        }
      }
    },
    [isCloudVerified, firebaseUser]
  );

  // Study Documents CRUD
  const saveStudyDocument = useCallback(
    async (
      docItem: Omit<StudyDocumentItem, 'id' | 'ownerId' | 'createdAt'>
    ): Promise<StudyDocumentItem> => {
      const uid = isCloudVerified && firebaseUser ? sanitizeDocId(firebaseUser.uid) : 'local-learner';
      const id = sanitizeDocId(`doc-${Date.now()}`);
      const fullDoc: StudyDocumentItem = {
        ...docItem,
        id,
        ownerId: uid,
        createdAt: new Date().toLocaleDateString(),
      };
      setStudyDocuments((prev) => [fullDoc, ...prev]);

      if (isCloudVerified && firebaseUser) {
        try {
          await ensureFirestoreUserBootstrap(firebaseUser);
          await setDoc(
            doc(db, 'studyDocuments', id),
            buildFirestoreStudyDocPayload(uid, fullDoc, true)
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `studyDocuments/${id}`);
        }
      }
      return fullDoc;
    },
    [isCloudVerified, firebaseUser, ensureFirestoreUserBootstrap]
  );

  const deleteStudyDocument = useCallback(
    async (docId: string) => {
      setStudyDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (isCloudVerified && firebaseUser) {
        try {
          await deleteDoc(doc(db, 'studyDocuments', sanitizeDocId(docId))).catch(() => {});
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `studyDocuments/${docId}`);
        }
      }
    },
    [isCloudVerified, firebaseUser]
  );

  // Execute Gemini Function Calling Agent
  const executePlatformAgent = useCallback(
    async (userPrompt: string): Promise<{ reply: string; toolLogs: AgentToolCallLog[] }> => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken().catch(() => '');
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userPrompt,
          learnerContext: {
            profile: universalProfile,
            topics,
            revisions: universalRevisions,
            classes: educatorClasses,
            documents: studyDocuments,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Agent execution failed.');
      }

      return res.json();
    },
    [firebaseUser, universalProfile, topics, universalRevisions, educatorClasses, studyDocuments]
  );

  // Delete all cloud & local account data
  const deleteAccountAndData = useCallback(async () => {
    if (isCloudVerified && firebaseUser) {
      const uid = sanitizeDocId(firebaseUser.uid);
      const cols = [
        'topics',
        'subjects',
        'questionSets',
        'examAttempts',
        'revisions',
        'educatorClasses',
        'studyDocuments',
      ];
      for (const colName of cols) {
        try {
          const snap = await getDocs(query(collection(db, colName), where('ownerId', '==', uid)));
          for (const d of snap.docs) {
            await deleteDoc(doc(db, colName, d.id)).catch(() => {});
          }
        } catch {
          // continue cleanup
        }
      }
      await deleteDoc(doc(db, 'userPrivate', uid)).catch(() => {});
      await deleteDoc(doc(db, 'users', uid)).catch(() => {});
      await firebaseSignOut(auth).catch(() => {});
    }

    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(STORAGE_KEY) || k.startsWith(PLATFORM_KEY)) {
        localStorage.removeItem(k);
      }
    });

    setUniversalProfile(INITIAL_UNIVERSAL_PROFILE);
    setSubjects(INITIAL_SUBJECTS);
    setTopics(INITIAL_TOPICS);
    setUniversalRevisions(INITIAL_UNIVERSAL_REVISIONS);
    setQuestionSets([]);
    setExamAttempts([]);
    setEducatorClasses([]);
    setStudyDocuments([]);
    setProfile(INITIAL_PROFILE);
    setMasteries(INITIAL_MASTERIES);
    setRevisions(INITIAL_REVISIONS);
    setRecentEvaluations([]);
    setAgentActivityLogs(INITIAL_AGENT_LOGS);
    setTrophies(INITIAL_TROPHIES);
    setWorkspaceMode('landing');
  }, [isCloudVerified, firebaseUser]);

  // Legacy & Dual Functions
  const evaluateStudentAnswer = serviceEvaluate;

  const updateMastery = useCallback(
    (conceptId: ConceptId, evaluation: EvaluationResult) => {
      const res = serviceUpdateMastery(masteries, conceptId, evaluation);
      setMasteries(res.updatedMasteries);
    },
    [masteries]
  );

  const getWeakestConcept = useCallback((): ConceptMastery => {
    return serviceGetWeakest(masteries);
  }, [masteries]);

  const getWeakestTopicUniversal = useCallback((): TopicMasteryItem | null => {
    if (topics.length === 0) return null;
    return topics.reduce((low, curr) => (curr.score < low.score ? curr : low), topics[0]);
  }, [topics]);

  const generateAdaptiveQuestion = serviceGenerateQuestion;

  const scheduleRevision = useCallback(
    (conceptId: ConceptId, score: number) => {
      const res = serviceScheduleRevision(revisions, conceptId, score);
      setRevisions(res.updatedRevisions);
    },
    [revisions]
  );

  const getTeacherAnalytics = useCallback((): TeacherAnalyticsReport => {
    return serviceGetTeacherAnalytics(INITIAL_DEMO_COHORT, masteries);
  }, [masteries]);

  const executeAgentLearningCycle = useCallback(
    async (params: {
      question: Question;
      studentAnswer: string;
      studentReasoning: string;
      subjectName?: string;
      chapterName?: string;
      topicId?: string;
      onStepUpdate?: (step: any) => void;
    }) => {
      const matchedTopic =
        (params.topicId ? topics.find((t) => t.id === params.topicId) : undefined) ||
        topics.find((t) => t.legacyConceptId === params.question.conceptId) ||
        topics.find((t) => t.name.toLowerCase() === params.question.conceptName.toLowerCase());

      const subjName = params.subjectName || matchedTopic?.subjectName || 'Physics';
      const chapName = params.chapterName || matchedTopic?.chapterName || 'Electricity & Circuits';
      const eduLevel =
        universalProfile.educationCategory === 'Custom' && universalProfile.customEducationLevel
          ? universalProfile.customEducationLevel
          : universalProfile.educationLevel || 'Class 10';

      const cycleOutcome = await runLearningCycle({
        question: params.question,
        studentAnswer: params.studentAnswer,
        studentReasoning: params.studentReasoning,
        subjectName: subjName,
        chapterName: chapName,
        educationLevel: eduLevel,
        language: universalProfile.preferredLanguage || 'English',
        topicScoreOverride: matchedTopic?.score,
        currentMasteries: masteries,
        currentRevisions: revisions,
        onStepUpdate: params.onStepUpdate,
      });

      setMasteries(cycleOutcome.updatedMasteries);
      setRevisions(cycleOutcome.updatedRevisions);
      setAgentActivityLogs((prev) => [cycleOutcome.cycleLog, ...prev.slice(0, 19)]);
      setRecentEvaluations((prev) => [
        {
          ...cycleOutcome.evaluation,
          questionTitle: params.question.title,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.slice(0, 9),
      ]);

      // Also update universal evidence-based topic model
      await recordTopicEvidence({
        topicId: matchedTopic?.id,
        subjectName: subjName,
        chapterName: chapName,
        topicName: params.question.conceptName,
        scorePercent: cycleOutcome.evaluation.score,
        isCorrect: cycleOutcome.evaluation.isCorrect,
        difficulty: (params.question.difficulty as SkillTier) || 'intermediate',
        timeSpentSeconds: 90,
        errorClassification: cycleOutcome.evaluation.errorClassification || (cycleOutcome.evaluation.isCorrect ? 'accurate' : 'incomplete_answer'),
        misconceptionNote: cycleOutcome.evaluation.detectedMisconceptions?.[0],
      });

      const nextStudyMins = universalProfile.totalStudyMinutes + 3;
      setUniversalProfile((prev) => ({
        ...prev,
        totalStudyMinutes: nextStudyMins,
      }));
      setProfile((prev) => ({
        ...prev,
        totalStudyMinutes: nextStudyMins,
        lastActiveDate: new Date().toISOString(),
      }));

      setTrophies((prevTrophies) => {
        const check = checkAndAwardTrophies(
          prevTrophies,
          cycleOutcome.updatedMasteries,
          profile,
          CONCEPTS[params.question.conceptId as ConceptId] ? params.question.conceptId : undefined,
          cycleOutcome.evaluation.score
        );
        if (check.newlyAwardedTrophies.length > 0) {
          setLatestAwardedTrophy(check.newlyAwardedTrophies[0]);
        }
        return check.updatedTrophies;
      });

      return {
        evaluation: cycleOutcome.evaluation,
        nextQuestion: cycleOutcome.nextAdaptiveQuestion,
        cycleLog: cycleOutcome.cycleLog,
      };
    },
    [topics, universalProfile, masteries, revisions, profile, recordTopicEvidence]
  );

  const updateMasteryFromEvaluation = useCallback(
    (conceptId: ConceptId, evaluation: EvaluationResult, questionTitle: string) => {
      const res = serviceUpdateMastery(masteries, conceptId, evaluation);
      setMasteries(res.updatedMasteries);
      const revRes = serviceScheduleRevision(revisions, conceptId, evaluation.score);
      setRevisions(revRes.updatedRevisions);
      setRecentEvaluations((prev) => [
        {
          ...evaluation,
          questionTitle,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.slice(0, 9),
      ]);
    },
    [masteries, revisions]
  );

  const completeDiagnostic = useCallback(
    (result: DiagnosticResult) => {
      setProfile((prev) => ({
        ...prev,
        diagnosticCompleted: true,
        diagnosticResult: result,
        totalStudyMinutes: prev.totalStudyMinutes + 15,
      }));
      setUniversalProfile((prev) => ({
        ...prev,
        diagnosticCompleted: true,
        totalStudyMinutes: prev.totalStudyMinutes + 15,
      }));

      setMasteries((prev) => {
        const next = { ...prev };
        (Object.keys(result.conceptScores) as ConceptId[]).forEach((cid) => {
          const score = result.conceptScores[cid] || 50;
          const status = computeStatusFromScore(score);
          const relevantMisconceptions = result.diagnosedMisconceptions
            .filter((m) => m.conceptId === cid)
            .map((m) => m.misconception);

          next[cid] = {
            ...next[cid],
            score,
            questionsAttempted: next[cid].questionsAttempted + 1,
            questionsCorrect: score >= 60 ? next[cid].questionsCorrect + 1 : next[cid].questionsCorrect,
            lastPracticed: 'Just now',
            status,
            detectedMisconceptions: Array.from(
              new Set([...next[cid].detectedMisconceptions, ...relevantMisconceptions])
            ),
          };
        });

        setTrophies((prevTrophies) => {
          const check = checkAndAwardTrophies(
            prevTrophies,
            next,
            { ...profile, diagnosticCompleted: true },
            undefined,
            result.overallScore
          );
          if (check.newlyAwardedTrophies.length > 0) {
            setLatestAwardedTrophy(check.newlyAwardedTrophies[0]);
          }
          return check.updatedTrophies;
        });

        return next;
      });

      // Sync diagnostic scores into universal Physics topics
      setTopics((prev) =>
        prev.map((t) => {
          if (!t.legacyConceptId) return t;
          const sc = result.conceptScores[t.legacyConceptId as ConceptId];
          if (typeof sc !== 'number') return t;
          return {
            ...t,
            score: sc,
            status: computeStatusFromScore(sc),
            questionsAttempted: t.questionsAttempted + 1,
            questionsCorrect: sc >= 60 ? t.questionsCorrect + 1 : t.questionsCorrect,
            lastChangeReason: `Calibrated to ${sc}% via 5-concept Physics Diagnostic Assessment.`,
          };
        })
      );

      setRevisions((prev) =>
        prev.map((item) => {
          const score = result.conceptScores[item.conceptId] ?? 50;
          const interval = score >= 80 ? 4 : score >= 60 ? 2 : 0;
          return {
            ...item,
            dueDate: getFutureDate(interval),
            intervalDays: interval,
            status: interval === 0 ? 'due' : 'upcoming',
            lastReviewedScore: score,
          };
        })
      );
    },
    [profile]
  );

  const markRevisionReviewed = useCallback((revisionId: string, score: number) => {
    setRevisions((prev) =>
      prev.map((item) => {
        if (item.id !== revisionId) return item;
        const newInterval = score >= 70 ? Math.max(2, item.intervalDays * 2) : 1;
        return {
          ...item,
          dueDate: getFutureDate(newInterval),
          intervalDays: newInterval,
          status: 'upcoming',
          lastReviewedScore: score,
        };
      })
    );
  }, []);

  const resetProgress = useCallback(() => {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(STORAGE_KEY) || k.startsWith(PLATFORM_KEY)) {
        if (!k.endsWith('_theme') && !k.endsWith('_mode')) {
          localStorage.removeItem(k);
        }
      }
    });
    setUniversalProfile((prev) => ({
      ...INITIAL_UNIVERSAL_PROFILE,
      uid: prev.uid,
      displayName: prev.displayName,
      email: prev.email,
      onboardingCompleted: prev.onboardingCompleted,
    }));
    setSubjects(INITIAL_SUBJECTS);
    setTopics(INITIAL_TOPICS);
    setUniversalRevisions(INITIAL_UNIVERSAL_REVISIONS);
    setQuestionSets([]);
    setExamAttempts([]);
    setProfile(INITIAL_PROFILE);
    setMasteries(INITIAL_MASTERIES);
    setRevisions(INITIAL_REVISIONS);
    setRecentEvaluations([]);
    setAgentActivityLogs(INITIAL_AGENT_LOGS);
    setTrophies(INITIAL_TROPHIES);
    setLatestAwardedTrophy(null);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const dueRevisionsCount = revisions.filter(
    (r) => r.status === 'due' || r.dueDate <= todayStr
  ).length;
  const universalDueRevisionsCount = universalRevisions.filter(
    (r) => r.status === 'due' || r.dueDate <= todayStr
  ).length;

  return (
    <LearnerContext.Provider
      value={{
        theme,
        toggleTheme,
        firebaseUser,
        authReady,
        workspaceMode,
        enterSandboxWorkspace,
        openLandingPage,
        signInWithGoogleAccount,
        signOutWorkspace,
        deleteAccountAndData,
        showOnboardingModal,
        setShowOnboardingModal,
        universalProfile,
        saveUniversalProfile,
        subjects,
        topics,
        activeSubjectId,
        setActiveSubjectId,
        addSubject,
        updateSubject,
        deleteSubject,
        addTopic,
        deleteTopic,
        suggestCurriculumWithAI,
        recordTopicEvidence,
        universalRevisions,
        markUniversalRevisionReviewed,
        universalDueRevisionsCount,
        questionSets,
        saveQuestionSet,
        deleteQuestionSet,
        examAttempts,
        recordExamAttempt,
        activeExamLaunch,
        setActiveExamLaunch,
        educatorClasses,
        createEducatorClass,
        updateEducatorClass,
        deleteEducatorClass,
        studyDocuments,
        saveStudyDocument,
        deleteStudyDocument,
        executePlatformAgent,
        profile,
        masteries,
        revisions,
        recentEvaluations,
        agentActivityLogs,
        trophies,
        latestAwardedTrophy,
        dismissTrophyCelebration,
        evaluateStudentAnswer,
        updateMastery,
        getWeakestConcept,
        getWeakestTopicUniversal,
        generateAdaptiveQuestion,
        scheduleRevision,
        getTeacherAnalytics,
        executeAgentLearningCycle,
        updateMasteryFromEvaluation,
        completeDiagnostic,
        markRevisionReviewed,
        resetProgress,
        dueRevisionsCount,
      }}
    >
      {children}
    </LearnerContext.Provider>
  );
};

export const useLearner = () => {
  const context = useContext(LearnerContext);
  if (!context) {
    throw new Error('useLearner must be used within a LearnerProvider');
  }
  return context;
};
