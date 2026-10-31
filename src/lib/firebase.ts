import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  AcademicSubjectItem,
  EducatorClassItem,
  ExamAttemptItem,
  GeneratedQuestionSetItem,
  SpacedRevisionRecord,
  StudyDocumentItem,
  TopicMasteryItem,
  UniversalUserProfile,
} from '../types/platform';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Mandatory initial connection check per firebase-integration-rpc guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ============================================================================
// Blueprint-Synchronized Sanitization Helpers (Matches firebase-blueprint.json)
// ============================================================================
const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function sanitizeDocId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 120);
  return cleaned && VALID_ID_REGEX.test(cleaned) ? cleaned : `id-${Date.now()}`;
}

export function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return (trimmed || fallback).slice(0, maxLen);
}

export function clampInt(val: unknown, min: number, max: number, fallback = 0): number {
  const num = typeof val === 'number' && Number.isFinite(val) ? Math.round(val) : fallback;
  return Math.max(min, Math.min(max, num));
}

export function buildFirestoreUserPayloads(
  uid: string,
  profile: UniversalUserProfile,
  isNew: boolean
) {
  const safeUid = sanitizeDocId(uid);
  const validPersonas = [
    'student',
    'teacher',
    'professor',
    'tutor',
    'institution_admin',
    'independent_learner',
  ];
  const validSkills = ['foundational', 'intermediate', 'advanced', 'exam-prep'];

  const publicProfile: Record<string, any> = {
    uid: safeUid,
    displayName: clampStr(profile.displayName, 120, 'Learner'),
    personaType: validPersonas.includes(profile.personaType) ? profile.personaType : 'student',
    country: clampStr(profile.country, 80, ''),
    institutionName: clampStr(profile.institutionName, 160, ''),
    institutionType: clampStr(profile.institutionType, 60, 'Independent / No Institution'),
    educationCategory: clampStr(profile.educationCategory, 40, 'Higher Education'),
    educationLevel: clampStr(profile.educationLevel, 100, 'Undergraduate'),
    customEducationLevel: clampStr(profile.customEducationLevel, 120, ''),
    gradeOrYear: clampStr(profile.gradeOrYear, 80, ''),
    degreeOrProgramme: clampStr(profile.degreeOrProgramme, 120, ''),
    departmentOrBranch: clampStr(profile.departmentOrBranch, 120, ''),
    designation: clampStr(profile.designation, 100, ''),
    teachingExperience: clampStr(profile.teachingExperience, 80, ''),
    preferredLanguage: clampStr(profile.preferredLanguage, 60, 'English'),
    skillLevel: validSkills.includes(profile.skillLevel) ? profile.skillLevel : 'intermediate',
    learningGoals: clampStr(profile.learningGoals, 600, ''),
    subjectsList: (profile.subjectsList || [])
      .slice(0, 30)
      .map((s) => clampStr(s, 100, 'General Studies')),
    streakDays: clampInt(profile.streakDays, 0, 10000, 1),
    totalStudyMinutes: clampInt(profile.totalStudyMinutes, 0, 10000000, 0),
    diagnosticCompleted: Boolean(profile.diagnosticCompleted),
    onboardingCompleted: Boolean(profile.onboardingCompleted),
    updatedAt: serverTimestamp(),
  };

  const privateInfo: Record<string, any> = {
    uid: safeUid,
    email: clampStr(profile.email, 254, 'learner@example.com'),
    updatedAt: serverTimestamp(),
  };

  if (isNew) {
    publicProfile.createdAt = serverTimestamp();
    privateInfo.createdAt = serverTimestamp();
  }

  return { publicProfile, privateInfo };
}

export function buildFirestoreSubjectPayload(
  uid: string,
  subject: AcademicSubjectItem,
  isNew: boolean
) {
  const payload: Record<string, any> = {
    ownerId: sanitizeDocId(uid),
    name: clampStr(subject.name, 120, 'Untitled Subject'),
    category: clampStr(subject.category, 80, 'General'),
    courseCode: clampStr(subject.courseCode, 40, ''),
    educationLevel: clampStr(subject.educationLevel, 100, ''),
    description: clampStr(subject.description, 600, ''),
    chaptersList: (subject.chaptersList || [])
      .slice(0, 50)
      .map((c) => clampStr(c, 120, 'Chapter 1')),
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  return payload;
}

export function buildFirestoreTopicPayload(
  uid: string,
  topic: TopicMasteryItem,
  isNew: boolean
) {
  const validSkills = ['foundational', 'intermediate', 'advanced', 'exam-prep'];
  const validStatuses = ['needs-focus', 'developing', 'proficient', 'mastered'];
  const payload: Record<string, any> = {
    ownerId: sanitizeDocId(uid),
    subjectId: sanitizeDocId(topic.subjectId),
    subjectName: clampStr(topic.subjectName, 120, 'Subject'),
    chapterName: clampStr(topic.chapterName, 120, 'Core Chapter'),
    name: clampStr(topic.name, 140, 'Core Topic'),
    formulaOrKeyRule: clampStr(topic.formulaOrKeyRule, 240, ''),
    score: clampInt(topic.score, 0, 100, 50),
    questionsAttempted: clampInt(topic.questionsAttempted, 0, 100000, 0),
    questionsCorrect: clampInt(topic.questionsCorrect, 0, 100000, 0),
    totalTimeSeconds: clampInt(topic.totalTimeSeconds, 0, 100000000, 0),
    difficultyTier: validSkills.includes(topic.difficultyTier)
      ? topic.difficultyTier
      : 'intermediate',
    status: validStatuses.includes(topic.status) ? topic.status : 'developing',
    lastChangeReason: clampStr(topic.lastChangeReason, 400, ''),
    misconceptions: (topic.misconceptions || [])
      .slice(0, 25)
      .map((m) => clampStr(m, 240, 'Conceptual error')),
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  return payload;
}

export function buildFirestoreQuestionSetPayload(
  uid: string,
  setItem: GeneratedQuestionSetItem,
  isNew: boolean
) {
  const payload: Record<string, any> = {
    ownerId: sanitizeDocId(uid),
    title: clampStr(setItem.title, 160, 'Question Set'),
    subjectName: clampStr(setItem.subjectName, 120, 'General'),
    chapterName: clampStr(setItem.chapterName, 120, ''),
    educationLevel: clampStr(setItem.educationLevel, 100, ''),
    examType: clampStr(setItem.examType, 100, ''),
    questionFormat: clampStr(setItem.questionFormat, 80, 'mcq'),
    difficulty: clampStr(setItem.difficulty, 40, 'intermediate'),
    questionCount: clampInt(setItem.questions.length || setItem.questionCount, 1, 100, 5),
    marksPerQuestion: clampInt(setItem.marksPerQuestion, 1, 100, 2),
    negativeMarksScaled: clampInt(Math.round((setItem.negativeMarks || 0) * 100), 0, 10000, 0),
    timeLimitMinutes: clampInt(setItem.timeLimitMinutes, 1, 600, 30),
    language: clampStr(setItem.language, 60, 'English'),
    questions: (setItem.questions || []).slice(0, 100).map((q) => ({
      id: clampStr(q.id, 80, `q-${Date.now()}`),
      format: clampStr(q.format, 40, 'mcq'),
      subjectName: clampStr(q.subjectName, 120, setItem.subjectName),
      chapterName: clampStr(q.chapterName, 120, setItem.chapterName),
      topicName: clampStr(q.topicName, 140, 'Core Topic'),
      difficulty: clampStr(q.difficulty, 40, 'intermediate'),
      marks: clampInt(q.marks, 1, 100, 2),
      title: clampStr(q.title, 160, 'Question'),
      prompt: clampStr(q.prompt, 2000, 'Solve the problem.'),
      contextPassage: clampStr(q.contextPassage, 2000, ''),
      codeSnippet: clampStr(q.codeSnippet, 2000, ''),
      options: (q.options || []).slice(0, 8).map((o) => clampStr(o, 400, '')),
      correctOptions: (q.correctOptions || []).slice(0, 8).map((o) => clampStr(o, 400, '')),
      expectedAnswer: clampStr(q.expectedAnswer, 1500, ''),
      explanation: clampStr(q.explanation, 2000, ''),
      hint1: clampStr(q.hint1, 400, ''),
      hint2: clampStr(q.hint2, 400, ''),
      hint3: clampStr(q.hint3, 400, ''),
    })),
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  return payload;
}

export function buildFirestoreExamAttemptPayload(
  uid: string,
  attempt: ExamAttemptItem,
  isNew: boolean
) {
  const payload: Record<string, any> = {
    ownerId: sanitizeDocId(uid),
    title: clampStr(attempt.title, 160, 'Practice Session'),
    mode: clampStr(attempt.mode, 40, 'practice'),
    subjectName: clampStr(attempt.subjectName, 120, 'General'),
    totalQuestions: clampInt(attempt.totalQuestions, 1, 200, 1),
    correctCount: clampInt(attempt.correctCount, 0, 200, 0),
    scoreScaled: clampInt(Math.round(attempt.scoreEarned * 100), -20000, 1000000, 0),
    maxMarksScaled: clampInt(Math.max(100, Math.round(attempt.maxMarks * 100)), 100, 1000000, 100),
    percentage: clampInt(attempt.percentage, 0, 100, 0),
    timeTakenSeconds: clampInt(attempt.timeTakenSeconds, 0, 86400, 0),
    misconceptionsCount: clampInt(attempt.misconceptionsCount, 0, 200, 0),
    calculationErrorsCount: clampInt(attempt.calculationErrorsCount, 0, 200, 0),
    incompleteCount: clampInt(attempt.incompleteCount, 0, 200, 0),
    status: attempt.status === 'in_progress' ? 'in_progress' : 'completed',
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  return payload;
}

export function buildFirestoreRevisionPayload(
  uid: string,
  rev: SpacedRevisionRecord,
  isNew: boolean
) {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(rev.dueDate)
    ? rev.dueDate
    : new Date().toISOString().split('T')[0];
  const payload: Record<string, any> = {
    ownerId: sanitizeDocId(uid),
    topicKey: clampStr(rev.topicKey, 128, 'topic-1'),
    subjectName: clampStr(rev.subjectName, 120, 'Subject'),
    topicName: clampStr(rev.topicName, 140, 'Topic'),
    dueDate: validDate,
    intervalDays: clampInt(rev.intervalDays, 0, 3650, 1),
    repetitions: clampInt(rev.repetitions, 0, 10000, 0),
    easeFactorScaled: clampInt(Math.round(rev.easeFactor * 100), 130, 500, 250),
    lastScore: clampInt(rev.lastScore, 0, 100, 50),
    status: ['due', 'upcoming', 'mastered'].includes(rev.status) ? rev.status : 'upcoming',
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  return payload;
}

export function buildFirestoreEducatorClassPayload(
  uid: string,
  cls: EducatorClassItem,
  isNew: boolean
) {
  const payload: Record<string, any> = {
    ownerId: sanitizeDocId(uid),
    name: clampStr(cls.name, 140, 'Academic Cohort'),
    subjectName: clampStr(cls.subjectName, 120, 'Subject'),
    educationLevel: clampStr(cls.educationLevel, 100, ''),
    institutionName: clampStr(cls.institutionName, 160, ''),
    inviteCode: sanitizeDocId(cls.inviteCode || 'LOOP-2026').slice(0, 24),
    rosterList: (cls.rosterList || []).slice(0, 50).map((s) => ({
      id: clampStr(s.id, 60, `st-${Date.now()}`),
      name: clampStr(s.name, 120, 'Student'),
      email: clampStr(s.email, 254, ''),
      joinedAt: clampStr(s.joinedAt, 40, 'Today'),
      overallMastery: clampInt(s.overallMastery, 0, 100, 65),
      weakTopic: clampStr(s.weakTopic, 120, 'Core Topic'),
      submissionsCount: clampInt(s.submissionsCount, 0, 10000, 0),
    })),
    assignmentsList: (cls.assignmentsList || []).slice(0, 50).map((a) => ({
      id: clampStr(a.id, 60, `asg-${Date.now()}`),
      title: clampStr(a.title, 140, 'Assessment'),
      dueDate: clampStr(a.dueDate, 20, ''),
      totalMarks: clampInt(a.totalMarks, 1, 1000, 20),
      questionCount: clampInt(a.questionCount, 1, 100, 10),
      status: clampStr(a.status, 30, 'active'),
    })),
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  return payload;
}

export function buildFirestoreStudyDocPayload(
  uid: string,
  docItem: StudyDocumentItem,
  isNew: boolean
) {
  const payload: Record<string, any> = {
    ownerId: sanitizeDocId(uid),
    title: clampStr(docItem.title, 160, 'Study Material'),
    fileName: clampStr(docItem.fileName, 160, 'notes.txt'),
    mimeType: clampStr(docItem.mimeType, 80, 'text/plain'),
    subjectName: clampStr(docItem.subjectName, 120, 'General'),
    summary: clampStr(docItem.summary, 8000, ''),
    revisionNotes: clampStr(docItem.revisionNotes, 8000, ''),
    extractedTopics: (docItem.extractedTopics || [])
      .slice(0, 40)
      .map((t) => clampStr(t, 140, 'Topic')),
    flashcards: (docItem.flashcards || []).slice(0, 50).map((f) => ({
      front: clampStr(f.front, 500, 'Question'),
      back: clampStr(f.back, 1000, 'Answer'),
      topic: clampStr(f.topic, 120, 'Concept'),
    })),
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  return payload;
}
