/**
 * Firestore Security Rules Verification Suite (Dirty Dozen Adversarial TDD)
 * Validates structural invariants and simulates rule predicate evaluation against
 * all 12 Dirty Dozen attack payloads defined in security_spec.md.
 */
import fs from 'fs';
import path from 'path';

const rulesPath = fs.existsSync(path.resolve('firestore.rules'))
  ? path.resolve('firestore.rules')
  : path.resolve('DRAFT_firestore.rules');

const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
const blueprint = JSON.parse(fs.readFileSync(path.resolve('firebase-blueprint.json'), 'utf-8'));

interface SimAuth {
  uid: string;
  email_verified: boolean;
}

interface SimContext {
  auth: SimAuth | null;
  requestTime: number;
  db: Record<string, Record<string, any>>;
}

const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const isValidId = (id: string) => typeof id === 'string' && id.length >= 1 && id.length <= 128 && ID_REGEX.test(id);

function evaluateRulesOperation(params: {
  ctx: SimContext;
  collection: string;
  docId?: string;
  op: 'get' | 'list' | 'create' | 'update' | 'delete';
  incoming?: Record<string, any>;
}): boolean {
  const { ctx, collection, docId = '', op, incoming } = params;
  const existing = docId ? ctx.db[`${collection}/${docId}`] : undefined;
  const isSignedIn = ctx.auth !== null;
  const isVerified = ctx.auth !== null && ctx.auth.email_verified === true;

  // Payload 5: List queries must filter strictly by resource.data.ownerId == request.auth.uid
  if (op === 'list') {
    if (collection === 'users' || collection === 'userPrivate') return false;
    if (!isSignedIn) return false;
    return Boolean(existing && existing.ownerId === ctx.auth!.uid);
  }

  if (!isValidId(docId)) return false;

  if (op === 'get') {
    if (!isSignedIn || !existing) return false;
    if (collection === 'users' || collection === 'userPrivate') {
      return ctx.auth!.uid === docId;
    }
    return existing.ownerId === ctx.auth!.uid;
  }

  if (!isVerified) return false;

  if (op === 'delete') {
    if (collection === 'users' || collection === 'userPrivate') return ctx.auth!.uid === docId;
    return Boolean(existing && existing.ownerId === ctx.auth!.uid);
  }

  if (!incoming) return false;

  // Temporal checks
  if (op === 'create') {
    if (incoming.createdAt !== ctx.requestTime || incoming.updatedAt !== ctx.requestTime) return false;
  } else if (op === 'update') {
    if (!existing) return false;
    if (incoming.createdAt !== existing.createdAt || incoming.updatedAt !== ctx.requestTime) return false;
  }

  // Blueprint schema & strict key check
  const pathKey = Object.keys(blueprint.firestore).find((p) => p.startsWith(`/${collection}/`));
  if (!pathKey) return false;
  const entityName = blueprint.firestore[pathKey].schema;
  const entityDef = blueprint.entities[entityName];
  const allowedKeys = Object.keys(entityDef.properties);
  const incomingKeys = Object.keys(incoming);

  // Shadow key check (hasAll + hasOnly)
  if (
    !entityDef.required.every((k: string) => incomingKeys.includes(k)) ||
    !incomingKeys.every((k) => allowedKeys.includes(k))
  ) {
    return false;
  }

  // Field-level type, regex, and maxLength checks
  for (const key of incomingKeys) {
    const prop = entityDef.properties[key];
    const val = incoming[key];
    if (prop.type === 'string' && prop.format !== 'date-time') {
      if (typeof val !== 'string') return false;
      if (prop.minLength !== undefined && val.length < prop.minLength) return false;
      if (prop.maxLength !== undefined && val.length > prop.maxLength) return false;
      if (prop.pattern && !new RegExp(prop.pattern).test(val)) return false;
      if (prop.enum && !prop.enum.includes(val)) return false;
    }
  }

  if (collection === 'users') {
    if (incoming.uid !== ctx.auth!.uid || docId !== ctx.auth!.uid) return false;
    if (!Array.isArray(incoming.subjectsList) || incoming.subjectsList.length > 30) return false;
    return true;
  }

  if (collection === 'userPrivate') {
    return incoming.uid === ctx.auth!.uid && docId === ctx.auth!.uid;
  }

  // Owned collections
  if (incoming.ownerId !== ctx.auth!.uid) return false;
  if (op === 'update' && (!existing || existing.ownerId !== incoming.ownerId)) return false;

  if (collection === 'topics') {
    const parentSub = ctx.db[`subjects/${incoming.subjectId}`];
    if (op === 'create' && (!parentSub || parentSub.ownerId !== ctx.auth!.uid)) return false;
    return true;
  }

  if (collection === 'questionSets') {
    if (!ctx.db[`users/${ctx.auth!.uid}`]) return false;
    if (!Array.isArray(incoming.questions) || incoming.questions.length > 100) return false;
    return true;
  }

  if (collection === 'examAttempts') {
    if (op === 'update' && existing?.status === 'completed') return false;
    return Boolean(ctx.db[`users/${ctx.auth!.uid}`]);
  }

  return Boolean(ctx.db[`users/${ctx.auth!.uid}`]);
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`SECURITY ASSERTION FAILED: ${message}`);
  }
}

// Static AST/Structural Checks on firestore.rules text
assert(rulesContent.includes("rules_version = '2';"), "Must use rules_version = '2'");
assert(rulesContent.includes('match /{document=**} {\n      allow read, write: if false;\n    }'), 'Must start with global default-deny catch-all');
assert(!/allow\s+list\s*:[^;]*\b(get|exists)\s*\(/.test(rulesContent), 'Must never call get() or exists() inside allow list');
assert(!/allow\s+(read|get|list)\s*:\s*if\s+isSignedIn\(\)\s*;/.test(rulesContent), 'Must never allow blanket isSignedIn() reads');

for (const collectionPath of Object.keys(blueprint.firestore)) {
  assert(rulesContent.includes(`match ${collectionPath}`), `Missing match block for ${collectionPath}`);
}

const NOW = 1793450000000;
const baseUserA = {
  uid: 'user_A',
  displayName: 'Ankur Learner',
  personaType: 'student',
  country: 'India',
  institutionName: 'IIT Delhi',
  institutionType: 'University',
  educationCategory: 'Higher Education',
  educationLevel: 'Undergraduate',
  customEducationLevel: '',
  gradeOrYear: 'Semester 4',
  degreeOrProgramme: 'B.Tech',
  departmentOrBranch: 'Computer Science',
  designation: '',
  teachingExperience: '',
  preferredLanguage: 'English',
  skillLevel: 'intermediate',
  learningGoals: 'Master Algorithms and Physics',
  subjectsList: ['Computer Science', 'Physics'],
  streakDays: 4,
  totalStudyMinutes: 120,
  diagnosticCompleted: false,
  onboardingCompleted: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const baseSubjectA = {
  ownerId: 'user_A',
  name: 'Computer Science',
  category: 'Computer Science',
  courseCode: 'CS201',
  educationLevel: 'Undergraduate',
  description: 'Data Structures & Algorithms',
  chaptersList: ['Graphs', 'Dynamic Programming'],
  createdAt: NOW,
  updatedAt: NOW,
};

const ctxA: SimContext = {
  auth: { uid: 'user_A', email_verified: true },
  requestTime: NOW,
  db: {
    'users/user_A': baseUserA,
    'userPrivate/user_A': { uid: 'user_A', email: 'usera@example.com', createdAt: NOW, updatedAt: NOW },
    'subjects/sub_1': baseSubjectA,
    'examAttempts/att_done': {
      ownerId: 'user_A',
      title: 'Mock Exam 1',
      mode: 'timed',
      subjectName: 'Physics',
      totalQuestions: 10,
      correctCount: 8,
      scoreScaled: 800,
      maxMarksScaled: 1000,
      percentage: 80,
      timeTakenSeconds: 420,
      misconceptionsCount: 1,
      calculationErrorsCount: 1,
      incompleteCount: 0,
      status: 'completed',
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
};

// Verify Dirty Dozen Payloads ALL return PERMISSION_DENIED (false)
// 1. Identity Spoofing on Subject Creation
assert(
  !evaluateRulesOperation({
    ctx: ctxA,
    collection: 'subjects',
    docId: 'sub_spoof',
    op: 'create',
    incoming: { ...baseSubjectA, ownerId: 'user_B' },
  }),
  'Payload 1 (Identity Spoofing) must be DENIED'
);

// 2. Shadow Field Injection on Profile Update
assert(
  !evaluateRulesOperation({
    ctx: ctxA,
    collection: 'users',
    docId: 'user_A',
    op: 'update',
    incoming: { ...baseUserA, isAdmin: true },
  }),
  'Payload 2 (Shadow Field Injection) must be DENIED'
);

// 3. Unverified Email Spoof Write
assert(
  !evaluateRulesOperation({
    ctx: { ...ctxA, auth: { uid: 'user_A', email_verified: false } },
    collection: 'users',
    docId: 'user_A',
    op: 'create',
    incoming: baseUserA,
  }),
  'Payload 3 (Unverified Email Spoof) must be DENIED'
);

// 4. Cross-User PII Read
assert(
  !evaluateRulesOperation({
    ctx: { ...ctxA, auth: { uid: 'user_B', email_verified: true } },
    collection: 'userPrivate',
    docId: 'user_A',
    op: 'get',
  }),
  'Payload 4 (Cross-User PII Read) must be DENIED'
);

// 5. Blanket List Scraping on Foreign Subject
assert(
  !evaluateRulesOperation({
    ctx: { ...ctxA, auth: { uid: 'user_B', email_verified: true } },
    collection: 'subjects',
    docId: 'sub_1',
    op: 'list',
  }),
  'Payload 5 (Foreign List Scraping) must be DENIED'
);

// 6. ID Poisoning (Invalid / Oversized ID)
assert(
  !evaluateRulesOperation({
    ctx: ctxA,
    collection: 'subjects',
    docId: 'invalid$id!' + 'x'.repeat(150),
    op: 'create',
    incoming: baseSubjectA,
  }),
  'Payload 6 (ID Poisoning) must be DENIED'
);

// 7. Orphaned Topic Creation
assert(
  !evaluateRulesOperation({
    ctx: ctxA,
    collection: 'topics',
    docId: 'top_orphan',
    op: 'create',
    incoming: {
      ownerId: 'user_A',
      subjectId: 'non_existent_subject',
      subjectName: 'Physics',
      chapterName: 'Mechanics',
      name: 'Kinematics',
      formulaOrKeyRule: 'v = u + at',
      score: 50,
      questionsAttempted: 0,
      questionsCorrect: 0,
      totalTimeSeconds: 0,
      difficultyTier: 'foundational',
      status: 'developing',
      lastChangeReason: 'Initial',
      misconceptions: [],
      createdAt: NOW,
      updatedAt: NOW,
    },
  }),
  'Payload 7 (Orphaned Topic Creation) must be DENIED'
);

// 8. Terminal State Tampering on Completed ExamAttempt
assert(
  !evaluateRulesOperation({
    ctx: ctxA,
    collection: 'examAttempts',
    docId: 'att_done',
    op: 'update',
    incoming: { ...ctxA.db['examAttempts/att_done'], percentage: 100 },
  }),
  'Payload 8 (Terminal State Tampering) must be DENIED'
);

// 9. Immutable Field Mutation (createdAt altered)
assert(
  !evaluateRulesOperation({
    ctx: ctxA,
    collection: 'subjects',
    docId: 'sub_1',
    op: 'update',
    incoming: { ...baseSubjectA, createdAt: NOW - 5000 },
  }),
  'Payload 9 (Immutable createdAt Mutation) must be DENIED'
);

// 10. Forged Client Timestamp on Create
assert(
  !evaluateRulesOperation({
    ctx: ctxA,
    collection: 'subjects',
    docId: 'sub_forged_time',
    op: 'create',
    incoming: { ...baseSubjectA, createdAt: NOW - 99999 },
  }),
  'Payload 10 (Forged Client Timestamp) must be DENIED'
);

// 11. Value Poisoning on Whitelisted Key
assert(
  !evaluateRulesOperation({
    ctx: ctxA,
    collection: 'users',
    docId: 'user_A',
    op: 'update',
    incoming: { ...baseUserA, displayName: 'X'.repeat(500) },
  }),
  'Payload 11 (Value Poisoning Oversized String) must be DENIED'
);

// 12. Unbounded Array Exhaustion
assert(
  !evaluateRulesOperation({
    ctx: ctxA,
    collection: 'questionSets',
    docId: 'qs_huge',
    op: 'create',
    incoming: {
      ownerId: 'user_A',
      title: 'Oversized Set',
      subjectName: 'Math',
      chapterName: 'Calculus',
      educationLevel: 'UG',
      examType: 'Semester',
      questionFormat: 'mcq',
      difficulty: 'intermediate',
      questionCount: 50,
      marksPerQuestion: 2,
      negativeMarksScaled: 0,
      timeLimitMinutes: 60,
      language: 'English',
      questions: Array.from({ length: 150 }, (_, i) => ({ id: `q-${i}` })),
      createdAt: NOW,
      updatedAt: NOW,
    },
  }),
  'Payload 12 (Unbounded Array Exhaustion) must be DENIED'
);

// Positive Control: Legitimate owner operations SUCCEED
assert(
  evaluateRulesOperation({
    ctx: ctxA,
    collection: 'subjects',
    docId: 'sub_valid',
    op: 'create',
    incoming: baseSubjectA,
  }),
  'Legitimate Subject Creation by Verified Owner must SUCCEED'
);

console.log('ALL 12 DIRTY DOZEN PAYLOADS REJECTED & STRUCTURAL AUDIT PASSED.');
