import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  FileText,
  Flame,
  Layers,
  Send,
  Sparkles,
  Timer,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import { PageId } from '../components/Navigation';
import { ConceptId } from '../types/physics';
import { AgentToolCallLog } from '../types/platform';
import { AgentActivityHistory } from '../components/AgentActivityHistory';
import { MasteryTrophiesShowcase } from '../components/MasteryTrophiesShowcase';
import { ACCOUNT_ROLES } from '../data/academicCatalog';

interface StudentDashboardProps {
  setCurrentPage: (page: PageId) => void;
  onSelectConceptForTutor: (conceptId: ConceptId) => void;
  onSelectUniversalTopicForTutor?: (topicId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  setCurrentPage,
  onSelectConceptForTutor,
  onSelectUniversalTopicForTutor,
}) => {
  const {
    universalProfile,
    subjects,
    topics,
    universalRevisions,
    universalDueRevisionsCount,
    examAttempts,
    studyDocuments,
    getWeakestTopicUniversal,
    executePlatformAgent,
    agentActivityLogs,
    trophies,
    latestAwardedTrophy,
    dismissTrophyCelebration,
    setShowOnboardingModal,
  } = useLearner();

  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentReply, setAgentReply] = useState<string | null>(null);
  const [agentToolsUsed, setAgentToolsUsed] = useState<AgentToolCallLog[]>([]);

  const avgMastery =
    topics.length > 0
      ? Math.round(topics.reduce((acc, t) => acc + t.score, 0) / topics.length)
      : 50;

  const weakestTopic = getWeakestTopicUniversal();

  const filteredTopics =
    subjectFilter === 'all'
      ? topics
      : topics.filter((t) => t.subjectId === subjectFilter);

  const activeMisconceptions = Array.from(
    new Set(topics.flatMap((t) => t.misconceptions))
  );

  const roleLabel =
    ACCOUNT_ROLES.find((r) => r.id === universalProfile.personaType)?.label || 'Learner';
  const levelLabel =
    universalProfile.educationCategory === 'Custom' && universalProfile.customEducationLevel
      ? universalProfile.customEducationLevel
      : universalProfile.educationLevel;

  const handleRunAgent = async (promptText: string) => {
    if (!promptText.trim()) return;
    setAgentRunning(true);
    setAgentReply(null);
    try {
      const out = await executePlatformAgent(promptText.trim());
      setAgentReply(out.reply);
      setAgentToolsUsed(out.toolLogs || []);
      setAgentPrompt('');
    } catch (err: any) {
      setAgentReply(err?.message || 'Could not run academic agent right now.');
    } finally {
      setAgentRunning(false);
    }
  };

  const handlePracticeTopic = (topicId: string, legacyConceptId?: string) => {
    if (onSelectUniversalTopicForTutor) {
      onSelectUniversalTopicForTutor(topicId);
    } else if (legacyConceptId) {
      onSelectConceptForTutor(legacyConceptId as ConceptId);
      setCurrentPage('tutor');
    } else {
      setCurrentPage('tutor');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Personalized Academic Hero Card */}
      <div className="bg-slate-900 dark:bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md border border-slate-800">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-sky-400 font-semibold uppercase tracking-wider">
              <span>{roleLabel}</span>
              <span>·</span>
              <span>{levelLabel}</span>
              {universalProfile.institutionName && (
                <>
                  <span>·</span>
                  <span>{universalProfile.institutionName}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {universalProfile.displayName}
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              {universalProfile.learningGoals ||
                'One Platform. Every Subject. Every Learner. Smarter Learning.'}{' '}
              {weakestTopic && (
                <>
                  Priority focus right now:{' '}
                  <span className="text-amber-400 font-semibold">
                    {weakestTopic.subjectName} — {weakestTopic.name} ({weakestTopic.score}%)
                  </span>
                  .
                </>
              )}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              {weakestTopic && (
                <button
                  type="button"
                  onClick={() =>
                    handlePracticeTopic(weakestTopic.id, weakestTopic.legacyConceptId)
                  }
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Practice Priority Topic ({weakestTopic.name})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setCurrentPage('question-generator')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/15 transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Generate Questions</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage('exam-workspace')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/15 transition-colors flex items-center gap-1.5"
              >
                <Timer className="w-4 h-4 text-emerald-400" />
                <span>Take Mock Exam</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOnboardingModal(true)}
                className="px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white text-xs font-medium underline underline-offset-4"
              >
                Customize Profile &amp; Subjects
              </button>
            </div>
          </div>

          {/* 4 Clean Tabular Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-center shrink-0">
            <div className="p-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 font-mono tabular-nums">
                {avgMastery}%
              </div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
                Overall Mastery
              </div>
            </div>
            <div className="p-2 border-l border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tabular-nums flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 text-amber-400" />
                {universalProfile.streakDays}
              </div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
                Day Streak
              </div>
            </div>
            <div className="p-2 border-l border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums flex items-center justify-center gap-1">
                <Clock className="w-5 h-5 text-emerald-400" />
                {universalProfile.totalStudyMinutes}m
              </div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
                Study Time
              </div>
            </div>
            <div className="p-2 border-l border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-yellow-400 font-mono tabular-nums flex items-center justify-center gap-1">
                <Award className="w-5 h-5 text-yellow-400" />
                {trophies.filter((t) => t.unlocked).length}/{trophies.length}
              </div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
                Achievements
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gemini Function-Calling Academic Orchestrator Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <span>Academic Study Planner &amp; Function-Calling Copilot</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Uses real application tools (`identifyWeakConcepts`, `recommendLearningPath`, `generateStudyPlan`, `getStudentProgress`, `searchUploadedMaterials`) on your live learner state.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              'Identify my weakest concepts and recommend a daily path',
              'Create a 7-day study plan for my subjects',
              'Summarize my overall mastery progress and due revisions',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleRunAgent(q)}
                disabled={agentRunning}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunAgent(agentPrompt);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={agentPrompt}
            onChange={(e) => setAgentPrompt(e.target.value)}
            placeholder="Ask for a personalized study plan, exam blueprint, weakness diagnosis, or note search..."
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={agentRunning || !agentPrompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{agentRunning ? 'Executing Tools...' : 'Run Agent'}</span>
          </button>
        </form>

        {agentReply && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            {agentToolsUsed.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-500 uppercase text-[10px]">
                  Invoked Tools:
                </span>
                {agentToolsUsed.map((tl, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-mono text-[11px]"
                  >
                    {tl.toolName}()
                  </span>
                ))}
              </div>
            )}
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {agentReply}
            </p>
          </div>
        )}
      </div>

      {/* Main Grid: Multi-Subject Topics Mastery + Spaced Repetition & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8 Cols: Enrolled Courses & Evidence-Calibrated Topics */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                My Subjects &amp; Evidence-Calibrated Topic Mastery
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every score reflects real accuracy, difficulty weight, time spent, and error classification.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage('curriculum')}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Manage Courses &amp; Add Topics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subject Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubjectFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                subjectFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              All Subjects ({topics.length})
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubjectFilter(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  subjectFilter === s.id
                    ? 'bg-sky-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Topic Cards */}
          <div className="space-y-3">
            {filteredTopics.map((tp) => {
              const barColor =
                tp.score >= 80
                  ? 'bg-emerald-500'
                  : tp.score >= 60
                  ? 'bg-sky-500'
                  : 'bg-amber-500';
              return (
                <div
                  key={tp.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        {tp.subjectName} · {tp.chapterName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {tp.name}
                      </h3>
                      {tp.formulaOrKeyRule && (
                        <span className="text-xs font-mono text-slate-400">
                          [{tp.formulaOrKeyRule}]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${tp.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {tp.score}%
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {tp.lastChangeReason}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {tp.status.replace('-', ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePracticeTopic(tp.id, tp.legacyConceptId)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
                    >
                      Tutor Session →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Due Revisions, Misconceptions, Recent Exams & Study Docs */}
        <div className="lg:col-span-4 space-y-6">
          {/* Spaced Repetition Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Spaced Repetition Queue
                </h3>
              </div>
              <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                {universalDueRevisionsCount} Due
              </span>
            </div>

            <div className="space-y-2.5">
              {universalRevisions.slice(0, 4).map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {rev.topicName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {rev.subjectName} · {rev.intervalDays}d interval
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('revision')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold shrink-0 ${
                      rev.status === 'due'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {rev.status === 'due' ? 'Review' : rev.dueDate}
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage('revision')}
              className="w-full text-center pt-2 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline border-t border-slate-100 dark:border-slate-800 block"
            >
              Open Full Revision Planner →
            </button>
          </div>

          {/* Diagnosed Conceptual Misconceptions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Active Conceptual Misconceptions
              </h3>
            </div>
            {activeMisconceptions.length > 0 ? (
              <div className="space-y-2 text-xs">
                {activeMisconceptions.slice(0, 4).map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200"
                  >
                    "{m}"
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No conceptual misconceptions flagged. Calculation slips are tracked separately so your conceptual profile stays accurate.
              </p>
            )}
          </div>

          {/* Quick Links: Recent Exams & Uploaded Study Notes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-500" />
                <span>Learning Activity Summary</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCurrentPage('exam-workspace')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left hover:border-sky-400"
              >
                <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  {examAttempts.length}
                </div>
                <div className="text-[11px] text-slate-500">Exams Completed</div>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('documents')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left hover:border-sky-400"
              >
                <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  {studyDocuments.length}
                </div>
                <div className="text-[11px] text-slate-500">Study Docs Analyzed</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mastery Trophies Showcase */}
      <MasteryTrophiesShowcase
        trophies={trophies}
        latestAwardedTrophy={latestAwardedTrophy}
        onDismissCelebration={dismissTrophyCelebration}
      />

      {/* 8-Step Pedagogical Agent History */}
      <AgentActivityHistory logs={agentActivityLogs} />
    </div>
  );
};
