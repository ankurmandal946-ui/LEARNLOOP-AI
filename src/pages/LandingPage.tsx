import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  FileText,
  GraduationCap,
  Layers,
  Mic,
  Moon,
  Sun,
  Timer,
  Users,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import { ACCOUNT_ROLES, QUESTION_FORMATS, UNIVERSAL_SUBJECT_LIBRARY } from '../data/academicCatalog';
import heroStudyImg from '../assets/images/hero_universal_learning_1793457714044.jpg';

export const LandingPage: React.FC = () => {
  const {
    theme,
    toggleTheme,
    signInWithGoogleAccount,
    enterSandboxWorkspace,
  } = useLearner();

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogleAccount();
    } catch (err: any) {
      setAuthError(
        err?.code === 'auth/popup-closed-by-user'
          ? 'Sign-in popup closed. Try again or continue in Interactive Workspace.'
          : 'Google Sign-In could not complete in this browser frame. You can launch the Interactive Workspace immediately below.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* 3-Zone Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
              LL
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
              LearnLoop AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#levels" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Academic Levels
            </a>
            <a href="#engine" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Assessment Engine
            </a>
            <a href="#diagnostics" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Adaptive Mastery
            </a>
            <a href="#educators" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              For Educators
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={enterSandboxWorkspace}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors"
            >
              Launch Platform
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-14 sm:py-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              One Platform. Every Subject. Every Learner. Smarter Learning.
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              Universal AI Academic Learning, Assessment &amp; Teaching Workspace
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              From school classrooms and undergraduate engineering to medical boards, law, humanities, competitive exams, and self-paced upskilling — build custom curricula, generate 20+ exam formats, diagnose real misconceptions, and retain knowledge with spaced repetition.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="px-5 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm transition-all flex items-center gap-2.5 disabled:opacity-60"
              >
                <GraduationCap className="w-4 h-4 text-sky-400 dark:text-sky-600" />
                <span>{authLoading ? 'Connecting Account...' : 'Sign In with Google (Cloud Sync)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={enterSandboxWorkspace}
                className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm transition-all flex items-center gap-2"
              >
                <span>Open Interactive Workspace</span>
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                {authError}
              </div>
            )}

            {/* Key Capability Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800 max-w-xl">
              <div>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  23+ &amp; Custom
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Academic Disciplines
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  21 Formats
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  AI Question &amp; Exam Engine
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  6 Roles
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Learners, Faculty &amp; Admins
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Anchor */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-slate-900">
              {!imgFailed ? (
                <img
                  src={heroStudyImg}
                  alt="University learners and educators collaborating across disciplines"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-72 sm:h-80 object-cover"
                />
              ) : (
                <div className="w-full h-72 sm:h-80 bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 p-8 flex flex-col justify-end text-white">
                  <p className="text-xs uppercase tracking-widest text-sky-400 font-bold">
                    Universal Academic Workspace
                  </p>
                  <p className="text-xl font-bold mt-1">
                    Adaptive Socratic Reasoning Across Every Syllabus
                  </p>
                </div>
              )}
              <div className="p-5 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Differentiated Error &amp; Misconception Engine
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    Evidence-Calibrated
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Separates arithmetic or syntax slips from genuine conceptual misconceptions, updating topic mastery transparently from real assessment evidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Universal Roles & Academic Levels */}
      <section id="levels" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Flexible Onboarding &amp; Academic Profiles
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Designed for Every Academic Level, Role, and Learning Goal
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No forced institution fields. Join as a school student, university scholar, independent exam aspirant, professor, private mentor, or institution administrator.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ACCOUNT_ROLES.map((role) => (
            <div
              key={role.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{role.label}</h3>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {role.isEducator ? 'Teaching & Analytics' : 'Personalized Study'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {role.subtitle}
              </p>
            </div>
          ))}
        </div>

        {/* Subject Library Preview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Dynamic Subject &amp; Custom Course Library
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Start from 23 built-in disciplines or create any custom university course, module, chapter, or competitive exam paper.
              </p>
            </div>
            <button
              type="button"
              onClick={enterSandboxWorkspace}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline self-start sm:self-auto"
            >
              Customize Your Subjects →
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {UNIVERSAL_SUBJECT_LIBRARY.map((subj) => (
              <span
                key={subj.name}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {subj.name}
              </span>
            ))}
            <span className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-xs font-semibold text-sky-700 dark:text-sky-300">
              + Any Custom Subject or Syllabus
            </span>
          </div>
        </div>
      </section>

      {/* Core Platform Pillars */}
      <section
        id="engine"
        className="py-16 bg-white dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Complete Academic Architecture
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Assessment Generation, Timed Exams, Document Grounding &amp; Voice Tutoring
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {QUESTION_FORMATS.length} Question Formats &amp; Batch Scaling
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Generate MCQs, MSQs, coding problems, output prediction, case studies, assertion-reasoning, viva, lab practicals, or custom formats in sets of 5 to 100 questions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <Timer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Timed Examinations &amp; Negative Marking
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Simulate competitive tests, university finals, or chapter drills with live countdown timers, configurable negative marking, and instant rubric breakdowns.
              </p>
            </div>

            <div id="diagnostics" className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                True Misconception Differentiation
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Distinguishes calculation slips and incomplete answers from genuine conceptual flaws, providing targeted remediation and transparent mastery evidence.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Document Learning with Provenance
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload PDFs or lecture notes to extract topics, summaries, flashcards, and practice tests. Answers explicitly separate uploaded content from general AI knowledge.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <Mic className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Voice-First Socratic Tutor (Wispr Flow)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Explain derivations, proofs, or historical arguments aloud using Wispr Flow or browser voice capture, review your transcript, and receive progressive hints.
              </p>
            </div>

            <div id="educators" className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <Users className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Educator &amp; Institution Workspace
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Create classes and departments, invite students via code or CSV import, publish question sets as assignments, and monitor real cohort mastery analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="mt-auto py-8 bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">LearnLoop AI</span>
            <span>·</span>
            <span>One Platform. Every Subject. Every Learner. Smarter Learning.</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={enterSandboxWorkspace}
              className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
            >
              Enter Workspace
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
