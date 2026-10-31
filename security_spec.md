# LearnLoop AI — Payload-First Security Specification (Phase 0 TDD)

## 1. Data Invariants & Master Sources of Truth

1. **Global Default-Deny Gate**: Every path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **PII Split Isolation (`/users/{userId}` vs `/userPrivate/{userId}`)**:
   - Email addresses are strictly isolated in `/userPrivate/{userId}` and never stored in `/users/{userId}`.
   - Neither `/users` nor `/userPrivate` permits `list` queries; `get`, `create`, `update`, and `delete` require `request.auth.uid == userId`.
3. **Verified Identity Enforcement**: Every write operation (`create`, `update`, `delete`) across all collections requires `request.auth != null && request.auth.token.email_verified == true`.
4. **No Self-Assigned Cross-Tenant Privileges**: `personaType` is constrained to a strict enum (`student`, `teacher`, `professor`, `tutor`, `institution_admin`, `independent_learner`) and never grants access to another user's or institution's documents. All tenant/institution data is isolated by `ownerId == request.auth.uid`.
5. **Relational & Parent Integrity**:
   - Creating a document in `/subjects`, `/questionSets`, `/examAttempts`, `/revisions`, `/educatorClasses`, or `/studyDocuments` requires an existing `/users/$(request.auth.uid)` profile (`exists(...)`).
   - Creating a `/topics/{topicId}` document requires that `/subjects/$(incoming().subjectId)` exists and its `ownerId == request.auth.uid`.
6. **Terminal State Locking**: Once an `/examAttempts/{attemptId}` document reaches `status == 'completed'`, all subsequent `update` operations are rejected.
7. **Temporal & Immutable Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation; `ownerId`/`uid` and `createdAt` are immutable on update; `updatedAt == request.time` on update.
8. **Zero Client Query Delegation**: Every `allow list` rule explicitly enforces `resource.data.ownerId == request.auth.uid` without using `get()` or `exists()` inside `list`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Identity Spoofing on Subject Creation**: Authenticated `user_A` creates `/subjects/sub_1` with `ownerId: "user_B"`. -> **DENIED** (`data.ownerId == request.auth.uid` fails).
2. **Payload 2 — Shadow Field Injection on Profile Update**: `user_A` updates `/users/user_A` adding `{ isAdmin: true }`. -> **DENIED** (`hasOnly` in `isValidUserProfile` and `affectedKeys().hasOnly(...)` reject unknown keys).
3. **Payload 3 — Unverified Email Spoof Write**: Token has `uid: "user_A"`, `email: "ankurmandal013@gmail.com"`, `email_verified: false` attempting `create` on `/users/user_A`. -> **DENIED** (`isVerifiedUser()` requires `email_verified == true`).
4. **Payload 4 — Cross-User PII Read**: Authenticated `user_B` attempts `get` on `/userPrivate/user_A`. -> **DENIED** (`request.auth.uid == userId` fails).
5. **Payload 5 — Blanket List Scraping on Subjects**: Authenticated `user_B` queries `/subjects` without filtering `ownerId == "user_B"`, hitting a doc owned by `user_A`. -> **DENIED** (`resource.data.ownerId == request.auth.uid` fails).
6. **Payload 6 — ID Poisoning (2KB Path ID)**: `user_A` attempts `create` on `/subjects/<200-char-junk-id!@#$>`. -> **DENIED** (`isValidId(subjectId)` enforces `<= 128` and `^[a-zA-Z0-9_\-]+$`).
7. **Payload 7 — Orphaned Topic Creation**: `user_A` creates `/topics/top_1` pointing to non-existent or `user_B`-owned `subjectId: "foreign_sub"`. -> **DENIED** (`exists` + `get(...).data.ownerId == request.auth.uid` fails).
8. **Payload 8 — Terminal State Tampering on ExamAttempt**: `user_A` attempts to `update` `percentage: 100` on `/examAttempts/att_1` whose `existing().status == "completed"`. -> **DENIED** (`existing().status != 'completed'` fails).
9. **Payload 9 — Immutable Field Mutation (`createdAt` / `ownerId`)**: `user_A` updates `/subjects/sub_1` changing `createdAt` to an older timestamp. -> **DENIED** (`incoming().createdAt == existing().createdAt` and `affectedKeys().hasOnly(...)` fail).
10. **Payload 10 — Forged Client Timestamp**: `user_A` creates `/revisions/rev_1` with `createdAt: request.time - 1000s`. -> **DENIED** (`incoming().createdAt == request.time` fails).
11. **Payload 11 — Value Poisoning on Whitelisted Key**: `user_A` updates whitelisted key `displayName` on `/users/user_A` with a 5,000-character string or integer `999`. -> **DENIED** (`isValidUserProfile(incoming())` wraps `allow update` and enforces `is string && size() <= 120`).
12. **Payload 12 — Unbounded Array Exhaustion**: `user_A` creates `/questionSets/qs_1` with 250 items in `questions` array. -> **DENIED** (`data.questions.size() <= 100` fails).

---

## 3. Test Runner Reference

Executable rule verification suite implemented in `/firestore.rules.test.ts` validating all 12 Dirty Dozen payloads return `PERMISSION_DENIED` while legitimate owner operations succeed.
