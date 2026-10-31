# LearnLoop AI — Voice-First Adaptive Exam Preparation Tutor

LearnLoop AI is an intelligent, voice-first exam preparation tutor designed for CBSE/ICSE Class 10 Physics (Unit: Electricity). It combines real-time speech dictation, Socratic AI dialogue, conceptual misconception diagnostics, dynamic question generation, Bayesian concept mastery mapping, and spaced repetition scheduling.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were established during Phase 1 clarification:
> - **Voice & Audio Experience**: In-browser live speech recognition (Web Speech API) paired with a Wispr Flow quick-dictate simulation and audio read-aloud playback for multi-modal study.
> - **Tutoring Strategy**: Socratic dialogue with dual evaluation (evaluating both final numerical/conceptual answer and physical reasoning/explanation), misconception identification, and a progressive 3-step hint ladder.
> - **Teacher Analytics**: Comprehensive Class 10 cohort dashboard with concept mastery heatmaps across 5 core electricity concepts, misconception frequency logs, and student performance drilldowns with clearly marked demo data.

---

## 1. Overview & Core Concept

### What It Does
LearnLoop AI helps Class 10 students master Physics through oral explanation and deliberate practice. Instead of rote multiple-choice guessing, students dictate their physical reasoning using voice-first input. Gemini evaluates their answers, diagnoses fundamental misconceptions (e.g., confusing current with potential difference or failing to apply Kirchhoff's current division in parallel branches), and dynamically generates adaptive follow-up problems targeted at their weakest concept nodes.

### 5 Core Concepts (Electricity Unit)
1. **Electric Current ($I = Q/t$)**: Flow of charge, amperes, series ammeter placement.
2. **Potential Difference ($V = W/Q$)**: Work done per unit charge, volts, parallel voltmeter placement.
3. **Resistance & Resistivity ($R = \rho l / A$)**: Factors affecting conductor resistance, cross-sectional area, material properties.
4. **Ohm's Law ($V = IR$)**: Linear $V\text{–}I$ relationship, slope representation, ohmic vs non-ohmic components.
5. **Series & Parallel Circuits**: Equivalent resistance ($R_s = R_1 + R_2$, $1/R_p = 1/R_1 + 1/R_2$), voltage sharing vs current division.

### Key Pages & Capabilities
1. **Student Dashboard**: Real-time mastery summary across the 5 concepts, study streak counter, exam readiness meter, upcoming spaced repetition reviews, and quick launch into targeted tutoring.
2. **Diagnostic Assessment**: 5-question multi-concept baseline test with voice dictation and reasoning inputs. Computes initial mastery vectors and misconception baselines.
3. **Interactive AI Tutor**: Voice-first problem workspace with real-time speech-to-text, Wispr Flow quick-dictate triggers, step-by-step reasoning editor, dual evaluation (answer + physical intuition), instant feedback with misconception breakdowns, hint ladder, and dynamic adaptive next question generation.
4. **Concept Mastery Map**: Visual knowledge graph showing nodes for each concept, prerequisite edges, live mastery scores ($0\%\text{--}100\%$), interactive formula cheat-sheets, and an interactive circuit simulator (varying $V$ and $R$ to observe current flow).
5. **Personal Revision Schedule**: Spaced repetition planner (SM-2 / Leitner algorithm) showing due dates, retention curves, overdue items, and a one-click "Review Due Concepts" practice session.
6. **Teacher Analytics Dashboard**: Class 10 cohort view featuring concept mastery heatmaps, high-frequency misconceptions, student roster cards with weak-concept alerts, and clearly demarcated seed demo data.

---

## 2. User Experience & Visual Design

### Aesthetic Direction & Layout
- **Style**: Modern academic studio aesthetic—clean, authoritative, distraction-free educational design with high typographic clarity.
- **Palette**:
  - Dominant Canvas: Clean crisp slate (`bg-slate-50 dark:bg-slate-950`)
  - Structural Panels: Pure white cards with hairline borders (`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`)
  - Primary Accent: Deep Academic Cobalt & Electric Teal (`text-sky-600`, `bg-sky-600 hover:bg-sky-700`, `text-teal-600`)
  - Semantic Feedback: Emerald (`#059669`) for verified concepts, Amber (`#D97706`) for partial reasoning, Rose (`#E11D48`) for identified misconceptions.
- **Typography**:
  - Display Font: `Plus Jakarta Sans` for clean, confident headlines.
  - Body Font: `DM Sans` for readable educational prose and student prompts.
  - Math & Telemetry: `IBM Plex Mono` / `tabular-nums` for circuit values ($12\text{ V}$, $4\text{ }\Omega$, $3\text{ A}$), formulas, and scores.

### Voice-First Input (Wispr Flow Integration)
- Dedicated expansive text area for student explanations with active speech transcription badge.
- Microphone toggle button with live audio waveform animation (pulsing ring using Web Audio API or CSS keyframes).
- Wispr Flow quick dictate feature: Simulated one-click smart punctuation and physics terminology cleanup (`Ω` for ohm, `μ` for micro, uppercase formulas).
- Review & Submit bar: Allows students to inspect dictated words, edit equations, and listen back before submitting to Gemini.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Server-Side Full-Stack Architecture for Gemini
- **Approach**: Express backend (`server.ts`) running concurrently with Vite dev server on port 3000. Express exposes endpoints:
  - `POST /api/tutor/evaluate`: Dual evaluation of student reasoning and answer using `@google/genai` with `gemini-3.8-flash`.
  - `POST /api/tutor/next-question`: Generates personalized exam-style questions targeting weak concepts at dynamic difficulty tiers.
  - `POST /api/diagnostic/evaluate`: Grades diagnostic baseline and generates diagnostic summary report.
  - `POST /api/tutor/hint`: Produces Socratic hints without revealing the final answer.
- **Why**: Keeps API keys strictly server-side, conforms to Google AI Studio Build standards, and provides structured JSON schemas (`Type.OBJECT`) for reliable frontend rendering.

### Decision 2: Adaptive Learner Model & Spaced Repetition Engine
- **Approach**: Maintain a Bayesian-style learner state per concept:
  $$\text{Mastery}_{t} = \text{Mastery}_{t-1} + \alpha \times (\text{Score} - \text{Mastery}_{t-1})$$
  Weighted higher when reasoning explanation is conceptually sound.
- **Spaced Repetition**: Calculates interval $I = 1, 3, 7, 14$ days based on consecutive successful answers. Persisted in `localStorage` with initial defaults and reset/seed capabilities.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LearnLoop AI Architecture                       │
└────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │                      React 19 Frontend (Vite)                    │
  │                                                                  │
  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
  │  │   Student    │ │  Diagnostic  │ │  Interactive │ │ Concept  │ │
  │  │  Dashboard   │ │  Assessment  │ │   AI Tutor   │ │ Map & Sim│ │
  │  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └────┬─────┘ │
  │         │                │                │              │       │
  │  ┌──────┴───────┐ ┌──────┴───────┐        │              │       │
  │  │   Revision   │ │   Teacher    │        │              │       │
  │  │   Schedule   │ │  Analytics   │        │              │       │
  │  └──────────────┘ └──────────────┘        │              │       │
  │                                           │              │       │
  │  ┌────────────────────────────────────────▼──────────────┴─────┐ │
  │  │ State Stores (LearnerProfile, Concepts, SpacedRepetition)   │ │
  │  │ Voice Dictation Engine (Web Speech STT + Wispr Flow Sim)    │ │
  │  │ localStorage Persistence & Hydration                        │ │
  │  └────────────────────────┬────────────────────────────────────┘ │
  └───────────────────────────┼──────────────────────────────────────┘
                              │ HTTP /api/*
  ┌───────────────────────────▼──────────────────────────────────────┐
  │                    Node.js / Express Server                      │
  │                                                                  │
  │  ┌───────────────────────┐        ┌────────────────────────────┐ │
  │  │  /api/tutor/evaluate  │        │ /api/tutor/next-question   │ │
  │  ├───────────────────────┤        ├────────────────────────────┤ │
  │  │  /api/tutor/hint      │        │ /api/diagnostic/evaluate   │ │
  │  └───────────┬───────────┘        └─────────────┬──────────────┘ │
  │              │                                  │                │
  │              └─────────────────┬────────────────┘                │
  │                                │                                 │
  │              ┌─────────────────▼────────────────┐                │
  │              │ @google/genai SDK               │                │
  │              │ Model: gemini-3.8-flash          │                │
  │              │ Structured Schema / JSON Mode    │                │
  │              └──────────────────────────────────┘                │
  └──────────────────────────────────────────────────────────────────┘
```

### Data Entities & Schema
- `ConceptId`: `'electric-current' | 'potential-difference' | 'resistance' | 'ohms-law' | 'circuits'`
- `ConceptMastery`: `{ conceptId, name, masteryScore: 0-100, lastPracticed, questionsAnswered, accuracy, detectedMisconceptions: string[] }`
- `Question`: `{ id, conceptId, difficulty: 'foundational' | 'intermediate' | 'exam-prep', prompt, circuitData?, formulaReference, rubric }`
- `EvaluationResult`: `{ isCorrect, score: 0-100, answerFeedback, reasoningFeedback, detectedMisconceptions: string[], weakConceptAlert?: string, masteryDelta: number, nextRecommendedTopic: string }`
- `RevisionItem`: `{ id, conceptId, dueDate: string, intervalDays: number, repetitions: number, easeFactor: number, status: 'due' | 'upcoming' | 'completed' }`
- `TeacherClassData`: `{ cohortName: 'Class 10 - Section A', totalStudents: 32, conceptAverages: Record<ConceptId, number>, frequentMisconceptions: Array<{ conceptId, description, affectedStudentCount }>, students: Array<{ id, name, overallScore, weakConcepts, lastActive }> }`
