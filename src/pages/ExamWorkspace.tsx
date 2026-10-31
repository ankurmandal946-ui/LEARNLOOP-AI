import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import {
  ErrorClassification,
  ExamMode,
  QuestionEvaluationDetail,
  QuestionFormatId,
  SkillTier,
  UniversalQuestion,
} from '../types/platform';
import { QUESTION_FORMATS } from '../data/academicCatalog';
import { polishWisprFlowText } from '../hooks/useSpeechRecognition';

const EXAM_MODES: Array<{ id: ExamMode; label: string; desc: string; timed: boolean }> = [
  { id: 'practice', label: 'Practice Mode', desc: 'Untimed self-paced mastery with hints', timed: false },
  { id: 'timed', label: 'Timed Examination', desc: 'Strict countdown timer & auto-submit', timed: true },
  { id: 'mock', label: 'Mock Test Mode', desc: 'Full exam simulation with negative marking', timed: true },
  { id: 'chapter', label: 'Chapter-Wise Practice', desc: 'Focused assessment on one module', timed: false },
  { id: 'subject', label: 'Subject-Wise Test', desc: 'Cross-chapter comprehensive test', timed: true },
  { id: 'full_syllabus', label: 'Full Syllabus Exam', desc: 'Complete course readiness paper', timed: true },
  { id: 'previous_year', label: 'Previous-Year Style', desc: 'Authentic past-paper exam patterns', timed: true },
  { id: 'custom_paper', label: 'Custom Question Paper', desc: 'User-configured marks & format', timed: true },
];

interface ResponseEntry {
  selectedOptions: string[];
  textAnswer: string;
  reasoning: string;
}

export const ExamWorkspace: React.FC = () => {
  const {
    universalProfile,
    subjects,
    questionSets,
    examAttempts,
    activeExamLaunch,
    setActiveExamLaunch,
    recordExamAttempt,
    recordTopicEvidence,
  } = useLearner();

  // Setup state when no active exam is running
  const [selectedMode, setSelectedMode] = useState<ExamMode>('timed');
  const [setupSubject, setSetupSubject] = useState(subjects[0]?.name || 'Physics');
  const [setupChapter, setSetupChapter] = useState(
    subjects[0]?.chaptersList?.[0] || 'Full Syllabus'
  );
  const [setupFormat, setSetupFormat] = useState<QuestionFormatId>('mcq');
  const [setupCount, setSetupCount] = useState(5);
  const [setupDuration, setSetupDuration] = useState(15);
  const [setupNegative, setSetupNegative] = useState(0.25);
  const [isBuildingPaper, setIsBuildingPaper] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Active Exam Runtime State
  const [examPhase, setExamPhase] = useState<'setup' | 'active' | 'results'>('setup');
  const [paperTitle, setPaperTitle] = useState('');
  const [paperMode, setPaperMode] = useState<ExamMode>('timed');
  const [paperSubject, setPaperSubject] = useState('');
  const [paperNegative, setPaperNegative] = useState(0);
  const [questions, setQuestions] = useState<UniversalQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, ResponseEntry>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(900);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Results State
  const [evalSummary, setEvalSummary] = useState<{
    correctCount: number;
    scoreEarned: number;
    maxMarks: number;
    percentage: number;
    misconceptionsCount: number;
    calculationErrorsCount: number;
    incompleteCount: number;
    details: QuestionEvaluationDetail[];
  } | null>(null);

  const autoSubmitTriggered = useRef(false);

  // Launch automatically if navigated from QuestionGenerator or DocumentLearning
  useEffect(() => {
    if (activeExamLaunch && activeExamLaunch.questions.length > 0) {
      setPaperTitle(activeExamLaunch.title);
      setPaperMode(activeExamLaunch.mode);
      setPaperSubject(activeExamLaunch.subjectName);
      setPaperNegative(activeExamLaunch.negativeMarks);
      setQuestions(activeExamLaunch.questions);
      setCurrentIdx(0);
      setResponses({});
      setRemainingSeconds(Math.max(60, activeExamLaunch.timeLimitMinutes * 60));
      setElapsedSeconds(0);
      setEvalSummary(null);
      autoSubmitTriggered.current = false;
      setExamPhase('active');
      setActiveExamLaunch(null);
    }
  }, [activeExamLaunch, setActiveExamLaunch]);

  const isTimedMode = EXAM_MODES.find((m) => m.id === paperMode)?.timed ?? true;

  // Countdown & Elapsed Timer
  useEffect(() => {
    if (examPhase !== 'active') return;
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
      if (isTimedMode) {
        setRemainingSeconds((rem) => {
          if (rem <= 1) {
            if (!autoSubmitTriggered.current) {
              autoSubmitTriggered.current = true;
              handleSubmitExam();
            }
            return 0;
          }
          return rem - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examPhase, isTimedMode]);

  const handleQuickStartPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBuildingPaper(true);
    setSetupError(null);
    try {
      const count = Math.max(1, Math.min(30, setupCount));
      const collected: UniversalQuestion[] = [];
      const batches = Math.ceil(count / 10);

      for (let b = 0; b < batches; b++) {
        const chunk = Math.min(10, count - collected.length);
        const res = await fetch('/api/questions/generate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            educationLevel: universalProfile.educationLevel,
            examType: EXAM_MODES.find((m) => m.id === selectedMode)?.label || 'Academic Exam',
            subjectName: setupSubject,
            chapterName: setupChapter,
            difficulty: universalProfile.skillLevel || 'intermediate',
            questionFormat: setupFormat,
            batchSize: chunk,
            batchIndex: b,
            marksPerQuestion: 2,
            language: universalProfile.preferredLanguage || 'English',
            avoidTitles: collected.map((q) => q.title),
          }),
        });
        if (!res.ok) throw new Error('Could not synthesize examination paper.');
        const data = await res.json();
        collected.push(...(data.questions || []));
      }

      setPaperTitle(`${setupSubject} — ${EXAM_MODES.find((m) => m.id === selectedMode)?.label}`);
      setPaperMode(selectedMode);
      setPaperSubject(setupSubject);
      setPaperNegative(selectedMode === 'practice' ? 0 : setupNegative);
      setQuestions(collected);
      setCurrentIdx(0);
      setResponses({});
      setRemainingSeconds(Math.max(60, setupDuration * 60));
      setElapsedSeconds(0);
      setEvalSummary(null);
      autoSubmitTriggered.current = false;
      setExamPhase('active');
    } catch (err: any) {
      setSetupError(err?.message || 'Failed to build examination paper.');
    } finally {
      setIsBuildingPaper(false);
    }
  };

  const handleSubmitExam = async () => {
    if (isSubmitting || questions.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/exams/evaluate-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions,
          responses,
          negativeMarks: paperNegative,
          language: universalProfile.preferredLanguage || 'English',
        }),
      });

      if (!res.ok) throw new Error('Evaluation request failed.');
      const data = await res.json();
      setEvalSummary(data);
      setExamPhase('results');

      // Record Exam Attempt in Cloud / Local History
      await recordExamAttempt({
        title: paperTitle,
        mode: paperMode,
        subjectName: paperSubject,
        totalQuestions: questions.length,
        correctCount: data.correctCount,
        scoreEarned: data.scoreEarned,
        maxMarks: data.maxMarks,
        percentage: data.percentage,
        timeTakenSeconds: elapsedSeconds,
        misconceptionsCount: data.misconceptionsCount,
        calculationErrorsCount: data.calculationErrorsCount,
        incompleteCount: data.incompleteCount,
        status: 'completed',
        details: data.details,
      });

      // Update Evidence-Based Topic Mastery & Spaced Repetition per evaluated question
      const avgTimePerQ = Math.max(5, Math.round(elapsedSeconds / Math.max(1, questions.length)));
      for (const q of questions) {
        const detail: QuestionEvaluationDetail | undefined = (data.details || []).find(
          (d: QuestionEvaluationDetail) => d.questionId === q.id
        );
        if (!detail) continue;
        const pct = Math.max(
          0,
          Math.min(100, Math.round((Math.max(0, detail.marksAwarded) / Math.max(1, detail.maxMarks)) * 100))
        );
        await recordTopicEvidence({
          subjectName: q.subjectName || paperSubject,
          chapterName: q.chapterName,
          topicName: q.topicName || q.chapterName || 'Core Concept',
          scorePercent: pct,
          isCorrect: detail.isCorrect,
          difficulty: (q.difficulty as SkillTier) || 'intermediate',
          timeSpentSeconds: avgTimePerQ,
          errorClassification: detail.errorClassification,
          misconceptionNote:
            detail.errorClassification === 'conceptual_misconception'
              ? detail.feedback
              : undefined,
        });
      }
    } catch (err: any) {
      setSetupError(err?.message || 'Error grading submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const toggleOption = (q: UniversalQuestion, opt: string) => {
    setResponses((prev) => {
      const current = prev[q.id] || { selectedOptions: [], textAnswer: '', reasoning: '' };
      if (q.format === 'msq') {
        const exists = current.selectedOptions.includes(opt);
        const nextOpts = exists
          ? current.selectedOptions.filter((o) => o !== opt)
          : [...current.selectedOptions, opt];
        return { ...prev, [q.id]: { ...current, selectedOptions: nextOpts } };
      }
      return { ...prev, [q.id]: { ...current, selectedOptions: [opt] } };
    });
  };

  const updateTextField = (qId: string, field: 'textAnswer' | 'reasoning', val: string) => {
    setResponses((prev) => {
      const current = prev[qId] || { selectedOptions: [], textAnswer: '', reasoning: '' };
      return { ...prev, [qId]: { ...current, [field]: val } };
    });
  };

  const errorBadgeLabel = (cls: ErrorClassification) => {
    switch (cls) {
      case 'accurate':
        return { text: 'Accurate', style: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' };
      case 'calculation_error':
        return { text: 'Calculation / Syntax Slip', style: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' };
      case 'incomplete_answer':
        return { text: 'Incomplete Steps', style: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800' };
      case 'conceptual_misconception':
        return { text: 'Conceptual Misconception', style: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800' };
    }
  };

  // =========================================================================
  // VIEW 1: ACTIVE EXAMINATION WORKSPACE
  // =========================================================================
  if (examPhase === 'active' && questions.length > 0) {
    const activeQ = questions[currentIdx];
    const currentResp = responses[activeQ.id] || {
      selectedOptions: [],
      textAnswer: '',
      reasoning: '',
    };
    const answeredCount = questions.filter((q) => {
      const r = responses[q.id];
      return r && (r.selectedOptions.length > 0 || r.textAnswer.trim() || r.reasoning.trim());
    }).length;

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Sticky Exam Control Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              {EXAM_MODES.find((m) => m.id === paperMode)?.label} · {paperSubject}
            </p>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {paperTitle}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-2">
              <Timer
                className={`w-4 h-4 ${
                  isTimedMode && remainingSeconds < 120 ? 'text-rose-500' : 'text-sky-500'
                }`}
              />
              <span className="font-mono font-extrabold text-sm sm:text-base tabular-nums text-slate-900 dark:text-white">
                {isTimedMode ? formatTimer(remainingSeconds) : formatTimer(elapsedSeconds)}
              </span>
              <span className="text-[11px] text-slate-500">
                {isTimedMode ? 'left' : 'elapsed'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubmitExam}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Grading Paper...' : `Submit Paper (${answeredCount}/${questions.length})`}
            </button>
          </div>
        </div>

        {/* Exam Body: Question Workspace + Palette */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Question Card */}
          <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                Question {currentIdx + 1} of {questions.length} · {activeQ.topicName}
              </span>
              <span className="font-mono text-slate-500">
                +{activeQ.marks} Marks
                {paperNegative > 0 ? ` / -${paperNegative} Incorrect` : ''}
              </span>
            </div>

            {activeQ.contextPassage && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeQ.contextPassage}
              </div>
            )}

            <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
              {activeQ.prompt}
            </p>

            {activeQ.codeSnippet && (
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
                {activeQ.codeSnippet}
              </pre>
            )}

            {/* Objective Options */}
            {activeQ.options && activeQ.options.length > 0 ? (
              <div className="space-y-2.5 pt-2">
                {activeQ.format === 'msq' && (
                  <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    Multiple-Select: Select all options that apply.
                  </p>
                )}
                {activeQ.options.map((opt, oi) => {
                  const selected = currentResp.selectedOptions.includes(opt);
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => toggleOption(activeQ, opt)}
                      className={`w-full p-3.5 rounded-xl border text-left text-sm transition-all flex items-center gap-3 ${
                        selected
                          ? 'border-sky-600 bg-sky-50/70 dark:bg-sky-950/40 text-slate-900 dark:text-white font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-md border border-current flex items-center justify-center font-mono text-xs shrink-0">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Subjective / Numerical / Coding / Viva Response */
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {activeQ.format === 'coding' ? 'Code Solution' : 'Your Answer'}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateTextField(
                          activeQ.id,
                          'textAnswer',
                          polishWisprFlowText(currentResp.textAnswer)
                        )
                      }
                      className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      Format Symbols (Wispr Flow)
                    </button>
                  </div>
                  <textarea
                    rows={activeQ.format === 'coding' ? 6 : 4}
                    value={currentResp.textAnswer}
                    onChange={(e) => updateTextField(activeQ.id, 'textAnswer', e.target.value)}
                    placeholder={
                      activeQ.format === 'coding'
                        ? 'Write your clean function or algorithm implementation...'
                        : 'Type or dictate your direct answer...'
                    }
                    className={`w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white ${
                      activeQ.format === 'coding' ? 'font-mono text-xs' : ''
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Optional Working / Reasoning Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Working / Step-by-Step Reasoning (Helps distinguish calculation slips from misconceptions)
              </label>
              <textarea
                rows={2}
                value={currentResp.reasoning}
                onChange={(e) => updateTextField(activeQ.id, 'reasoning', e.target.value)}
                placeholder="Optional: Show your steps, formula, or justification..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Practice Mode Instant Hint */}
            {paperMode === 'practice' && activeQ.hint1 && (
              <details className="text-xs bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 rounded-xl p-3">
                <summary className="font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer">
                  Need a Socratic Hint?
                </summary>
                <p className="mt-2 text-slate-700 dark:text-slate-300">{activeQ.hint1}</p>
              </details>
            )}

            {/* Prev / Next Navigation */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40"
              >
                ← Previous
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="px-5 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
                >
                  Next Question →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  {isSubmitting ? 'Evaluating...' : 'Finish & Submit Exam →'}
                </button>
              )}
            </div>
          </div>

          {/* Question Palette Navigator */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Question Navigator
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const r = responses[q.id];
                const isDone =
                  r && (r.selectedOptions.length > 0 || r.textAnswer.trim() || r.reasoning.trim());
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-lg font-mono text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-sky-600 text-white ring-2 ring-sky-400'
                        : isDone
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: DETAILED RESULTS & DIFFERENTIATED ERROR REPORT
  // =========================================================================
  if (examPhase === 'results' && evalSummary) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Examination Evaluated · Learner Model &amp; SM-2 Updated
              </p>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {paperTitle}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Time Taken: {formatTimer(elapsedSeconds)} · Correct: {evalSummary.correctCount}/
                {questions.length}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-sky-600 dark:text-sky-400">
                  {evalSummary.scoreEarned} / {evalSummary.maxMarks}
                </div>
                <div className="text-xs text-slate-400 font-semibold">
                  {evalSummary.percentage}% Score
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExamPhase('setup')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Exam</span>
              </button>
            </div>
          </div>

          {/* Error Differentiation Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                {evalSummary.correctCount}
              </div>
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                Accurate Solutions
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-700 dark:text-amber-300">
                {evalSummary.calculationErrorsCount}
              </div>
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                Calculation / Syntax Slips
              </div>
            </div>
            <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900">
              <div className="text-2xl font-extrabold font-mono tabular-nums text-sky-700 dark:text-sky-300">
                {evalSummary.incompleteCount}
              </div>
              <div className="text-xs font-semibold text-sky-800 dark:text-sky-200">
                Incomplete / Unanswered
              </div>
            </div>
            <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
              <div className="text-2xl font-extrabold font-mono tabular-nums text-rose-700 dark:text-rose-300">
                {evalSummary.misconceptionsCount}
              </div>
              <div className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                Conceptual Misconceptions
              </div>
            </div>
          </div>

          {/* Question-by-Question Breakdown */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Detailed Solution &amp; Diagnostic Breakdown
            </h2>
            {questions.map((q, idx) => {
              const det = evalSummary.details.find((d) => d.questionId === q.id);
              const badge = errorBadgeLabel(det?.errorClassification || 'incomplete_answer');
              return (
                <div
                  key={q.id}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Q{idx + 1}. {q.title} ({q.topicName})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold ${badge.style}`}>
                        {badge.text}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {det?.marksAwarded ?? 0} / {q.marks} Marks
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{q.prompt}</p>
                  {det && (
                    <div className="text-xs space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                      <p className="text-slate-800 dark:text-slate-200">
                        <strong>Feedback:</strong> {det.feedback}
                      </p>
                      <p className="text-emerald-800 dark:text-emerald-300">
                        <strong>Correct Explanation:</strong> {det.correctExplanation || q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: EXAM MODE LAUNCHPAD & HISTORY
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          Advanced Examination &amp; Practice Modes
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
          Simulated Examinations, Mock Papers &amp; Chapter Drills
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Select an examination mode below or launch any saved paper from your Question Bank.
        </p>
      </div>

      {/* 8 Exam Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {EXAM_MODES.map((m) => {
          const active = selectedMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMode(m.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                active
                  ? 'border-sky-600 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-600'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{m.label}</span>
                {m.timed && <Clock className="w-3.5 h-3.5 text-sky-500" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Instant Paper Builder */}
      <form
        onSubmit={handleQuickStartPaper}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          Configure &amp; Start {EXAM_MODES.find((m) => m.id === selectedMode)?.label}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              required
              list="exam-subjects"
              value={setupSubject}
              onChange={(e) => setSetupSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
            <datalist id="exam-subjects">
              {subjects.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Scope / Chapter
            </label>
            <input
              type="text"
              required
              value={setupChapter}
              onChange={(e) => setSetupChapter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Question Format
            </label>
            <select
              value={setupFormat}
              onChange={(e) => setSetupFormat(e.target.value as QuestionFormatId)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            >
              {QUESTION_FORMATS.filter((f) => f.id !== 'custom').map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Questions (5–30)
            </label>
            <input
              type="number"
              min={3}
              max={30}
              value={setupCount}
              onChange={(e) => setSetupCount(Number(e.target.value) || 5)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Duration (Mins)
            </label>
            <input
              type="number"
              min={3}
              max={180}
              value={setupDuration}
              onChange={(e) => setSetupDuration(Number(e.target.value) || 15)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">Negative Marking:</span>
            {[0, 0.25, 0.5, 1].map((neg) => (
              <button
                key={neg}
                type="button"
                onClick={() => setSetupNegative(neg)}
                className={`px-2.5 py-1 rounded font-mono font-semibold ${
                  setupNegative === neg
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {neg === 0 ? 'None' : `-${neg}`}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isBuildingPaper}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{isBuildingPaper ? 'Preparing Paper...' : 'Start Examination Now →'}</span>
          </button>
        </div>

        {setupError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs">
            {setupError}
          </div>
        )}
      </form>

      {/* Saved Question Sets Ready to Launch */}
      {questionSets.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Start from Saved Question Bank
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {questionSets.map((qs) => (
              <div
                key={qs.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{qs.title}</div>
                  <div className="text-xs text-slate-500">
                    {qs.questionCount}Q · {qs.timeLimitMinutes} mins
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPaperTitle(qs.title);
                    setPaperMode('timed');
                    setPaperSubject(qs.subjectName);
                    setPaperNegative(qs.negativeMarks);
                    setQuestions(qs.questions);
                    setCurrentIdx(0);
                    setResponses({});
                    setRemainingSeconds(qs.timeLimitMinutes * 60);
                    setElapsedSeconds(0);
                    setEvalSummary(null);
                    setExamPhase('active');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shrink-0"
                >
                  Begin →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Examination Attempts */}
      {examAttempts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Recent Examination History
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {examAttempts.slice(0, 8).map((att) => (
              <div
                key={att.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {att.title}
                  </span>
                  <div className="text-slate-500 mt-0.5">
                    {att.subjectName} · {att.correctCount}/{att.totalQuestions} correct ·{' '}
                    {att.misconceptionsCount} misconceptions · {att.calculationErrorsCount} slips
                  </div>
                </div>
                <div className="font-mono font-extrabold text-sm text-sky-600 dark:text-sky-400">
                  {att.scoreEarned}/{att.maxMarks} ({att.percentage}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
