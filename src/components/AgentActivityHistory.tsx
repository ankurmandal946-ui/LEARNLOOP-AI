import React, { useState } from 'react';
import { AgentCycleLog, AgentStepRecord } from '../types/physics';
import {
  Brain,
  Cpu,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AgentActivityHistoryProps {
  logs: AgentCycleLog[];
  activeStepRecord?: AgentStepRecord | null;
  isExecuting?: boolean;
}

export const AgentActivityHistory: React.FC<AgentActivityHistoryProps> = ({
  logs,
  activeStepRecord,
  isExecuting = false
}) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(logs[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const getStepBadge = (stepNumber: number) => {
    const titles = [
      '1. Evaluate Answer & Reasoning',
      '2. Identify Concept',
      '3. Detect Misconception',
      '4. Return Structured Data',
      '5. Update Mastery Score',
      '6. Find Weakest Concept',
      '7. Generate Targeted Question',
      '8. Schedule Next Revision'
    ];
    return titles[stepNumber - 1] || `Step ${stepNumber}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Agent Activity History & 8-Step Learning Cycle
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-300 font-semibold bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded">
            <Brain className="w-3 h-3" /> Gemini Reasoning
          </span>
          <span className="flex items-center gap-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
            <Cpu className="w-3 h-3" /> App State Update
          </span>
        </div>
      </div>

      {/* Live execution banner if currently executing */}
      {isExecuting && (
        <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
            <span className="text-xs font-bold text-sky-900 dark:text-sky-200">
              {activeStepRecord ? activeStepRecord.title : 'Executing Agent 8-Step Learning Cycle...'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400">
            {activeStepRecord ? `Step ${activeStepRecord.stepNumber} of 8` : 'Processing...'}
          </span>
        </div>
      )}

      {/* Cycle Logs List */}
      {logs.length === 0 ? (
        <p className="text-xs text-slate-400 py-3 text-center">
          No agent cycles recorded yet. Submit your answer in the AI Tutor to trigger the 8-step loop.
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;

            return (
              <div
                key={log.id}
                className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all bg-slate-50/50 dark:bg-slate-950/40"
              >
                {/* Summary Row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(log.id)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {log.questionTitle}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-sky-600 dark:text-sky-400 font-medium">
                        {log.evaluatedConceptName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{log.timestamp}</span>
                      <span>·</span>
                      <span className="font-mono">
                        Score: {log.score}% ({log.masteryDelta >= 0 ? '+' : ''}{log.masteryDelta}% delta)
                      </span>
                      <span>·</span>
                      <span className="text-amber-600 dark:text-amber-400">
                        Weakest: {log.weakestConceptName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                      8/8 Steps Executed
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded 8-Step Timeline */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Execution Trace (Reasoning vs State Update)
                    </div>

                    <div className="relative pl-6 space-y-3 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
                      {log.steps.map((step, idx) => {
                        const isGemini = step.category === 'gemini_reasoning';

                        return (
                          <div key={idx} className="relative group">
                            {/* Step Number Dot */}
                            <span
                              className={`absolute -left-[31px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${
                                isGemini ? 'bg-sky-600' : 'bg-indigo-600'
                              }`}
                            >
                              {step.stepNumber}
                            </span>

                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {step.title}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                                      isGemini
                                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                    }`}
                                  >
                                    {isGemini ? 'Gemini AI' : 'App State Function'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {step.timestamp}
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cycle Outcome Summary Strip */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase">Mastery State</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {log.masteryBefore}% → {log.masteryAfter}% ({log.masteryDelta >= 0 ? '+' : ''}{log.masteryDelta}%)
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase">Targeted Weak Concept</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {log.weakestConceptName}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase">Next Revision Scheduled</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {log.scheduledRevisionDate} ({log.scheduledRevisionInterval}d interval)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
