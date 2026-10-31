import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: 'terms' | 'privacy';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose,
}) => {
  const [tab, setTab] = React.useState<'terms' | 'privacy'>(initialTab);

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              LearnLoop AI Legal & Academic Data Policy
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setTab('terms')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                tab === 'terms'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setTab('privacy')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                tab === 'privacy'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Privacy Policy
            </button>
          </div>
        </div>

        <div className="p-6 max-h-80 overflow-y-auto space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {tab === 'terms' ? (
            <>
              <p className="font-semibold text-slate-900 dark:text-white">
                1. Educational Purpose & Academic Integrity
              </p>
              <p>
                LearnLoop AI provides adaptive Socratic tutoring, misconception diagnostics, and
                spaced repetition schedules aligned with Class 10 Physics curricula. Students agree
                to submit their own genuine reasoning during diagnostic and practice sessions.
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">
                2. Account Roles & Access Boundaries
              </p>
              <p>
                Student and Teacher accounts are strictly separated and validated server-side.
                Account roles selected during registration are immutable to preserve classroom data
                integrity.
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">
                3. AI-Assisted Feedback
              </p>
              <p>
                Evaluations and Socratic hints are generated dynamically by Gemini models on the
                server to supplement—not replace—certified classroom instruction.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-900 dark:text-white">
                1. Zero Plaintext Passwords & Isolated PII
              </p>
              <p>
                Authentication credentials are managed exclusively by Google Firebase
                Authentication. Email addresses are isolated in a private vault accessible solely to
                the authenticated account owner.
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">
                2. Voice & Text Reasoning Privacy
              </p>
              <p>
                Browser voice dictation uses native client speech recognition or Wispr Flow text
                input so you can review and edit every transcript before submitting it for tutoring
                evaluation.
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">
                3. Learner Mastery & Retention Records
              </p>
              <p>
                Concept mastery scores, spaced repetition intervals, and unlocked trophies are
                associated with your authenticated user ID so your progress stays synchronized.
              </p>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
