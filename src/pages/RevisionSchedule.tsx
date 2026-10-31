import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import { PageId } from '../components/Navigation';
import { ConceptId } from '../types/physics';

interface RevisionScheduleProps {
  setCurrentPage: (page: PageId) => void;
  onSelectConceptForTutor: (conceptId: ConceptId) => void;
  onSelectUniversalTopicForTutor?: (topicId: string) => void;
}

export const RevisionSchedule: React.FC<RevisionScheduleProps> = ({
  setCurrentPage,
  onSelectUniversalTopicForTutor,
}) => {
  const {
    universalRevisions,
    markUniversalRevisionReviewed,
    universalDueRevisionsCount,
    topics,
  } = useLearner();

  const [filter, setFilter] = useState<'all' | 'due' | 'upcoming' | 'mastered'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  const distinctSubjects = Array.from(
    new Set(universalRevisions.map((r) => r.subjectName))
  );

  const filteredRevisions = universalRevisions.filter((item) => {
    const isDue = item.status === 'due' || item.dueDate <= todayStr;
    if (subjectFilter !== 'all' && item.subjectName !== subjectFilter) return false;
    if (filter === 'due') return isDue;
    if (filter === 'upcoming') return !isDue && item.status !== 'mastered';
    if (filter === 'mastered') return item.status === 'mastered';
    return true;
  });

  const handlePracticeItem = (topicKey: string, topicName: string) => {
    const matchedTopic =
      topics.find((t) => t.id === topicKey) ||
      topics.find((t) => t.name.toLowerCase() === topicName.toLowerCase());
    if (matchedTopic && onSelectUniversalTopicForTutor) {
      onSelectUniversalTopicForTutor(matchedTopic.id);
    } else {
      setCurrentPage('tutor');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            <span>Universal Spaced Repetition Planner (SM-2 Engine)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            Personal Retention &amp; Daily Revision Schedule
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automatically schedules optimal review intervals (1d → 3d → 7d → 14d+) across all your enrolled subjects.
          </p>
        </div>

        {universalDueRevisionsCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              const firstDue = universalRevisions.find(
                (r) => r.status === 'due' || r.dueDate <= todayStr
              );
              if (firstDue) handlePracticeItem(firstDue.topicKey, firstDue.topicName);
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Due Revisions ({universalDueRevisionsCount}) →</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            <span>All Scheduled Reviews Caught Up</span>
          </div>
        )}
      </div>

      {/* Retention Science Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
          <TrendingUp className="w-4 h-4" />
          <span>Evidence-Driven Retention Curve</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          Every completed tutor problem and examination question updates your topic ease factor and schedules your next review right before memory decay sets in. Weak topics resurface within 24 hours; mastered topics expand to multi-week intervals.
        </p>
      </div>

      {/* Filters & Schedule Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            {(
              [
                { id: 'all', label: `All (${universalRevisions.length})` },
                { id: 'due', label: `Due Today (${universalDueRevisionsCount})` },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'mastered', label: 'Long-Term (14d+)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded font-semibold transition-all ${
                  filter === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">All Subjects</option>
            {distinctSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredRevisions.map((rev) => {
            const isDue = rev.status === 'due' || rev.dueDate <= todayStr;
            return (
              <div
                key={rev.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      {rev.subjectName}
                    </span>
                    <span>·</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {rev.topicName}
                    </h3>
                    {isDue ? (
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded">
                        Due Today
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        Next: {rev.dueDate}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>Interval: {rev.intervalDays}d</span>
                    <span>·</span>
                    <span>Repetitions: #{rev.repetitions}</span>
                    <span>·</span>
                    <span>Ease: {rev.easeFactor}</span>
                    <span>·</span>
                    <span>Last Score: {rev.lastScore}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePracticeItem(rev.topicKey, rev.topicName)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      isDue
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Practice Topic</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => markUniversalRevisionReviewed(rev.id, 85)}
                    className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    title="Mark reviewed today with strong recall (85%)"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredRevisions.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No revision items match this filter. Complete practice or exam questions to populate spaced reviews!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
