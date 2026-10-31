import React, { useState } from 'react';
import { GraduationCap, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserRole } from '../types/physics';

export const GoogleOnboardingModal: React.FC = () => {
  const { needsOnboarding, suggestedName, completeGoogleOnboarding, logout } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(suggestedName || '');
  const [role, setRole] = useState<UserRole>('student');
  const [gradeOrSubject, setGradeOrSubject] = useState('Class 10 CBSE');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (suggestedName && !displayName) {
      setDisplayName(suggestedName);
    }
  }, [suggestedName, displayName]);

  if (!needsOnboarding) return null;

  const handleRoleSwitch = (nextRole: UserRole) => {
    setRole(nextRole);
    setGradeOrSubject(nextRole === 'student' ? 'Class 10 CBSE' : 'Class 10 Physics');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!gradeOrSubject.trim()) {
      setError(
        role === 'student'
          ? 'Please enter your class or grade.'
          : 'Please enter your teaching subject area.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = await completeGoogleOnboarding({
        displayName: displayName.trim(),
        role,
        gradeOrSubject: gradeOrSubject.trim(),
      });
      showToast({
        title: `Welcome to LearnLoop AI, ${profile.displayName}!`,
        description: `Your ${profile.role} workspace is ready.`,
        variant: 'success',
      });
    } catch (err: any) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Final Step · Account Setup
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Personalize your workspace
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Select your academic role so LearnLoop AI configures the right dashboard and access
            permissions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              I am joining as a
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleRoleSwitch('student')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  role === 'student'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Student</div>
                  <div className="text-[11px] opacity-75">Adaptive Tutor</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch('teacher')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  role === 'teacher'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Teacher</div>
                  <div className="text-[11px] opacity-75">Class Analytics</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {role === 'student' ? 'Class / Grade' : 'Subject or Teaching Area'}
            </label>
            <input
              type="text"
              value={gradeOrSubject}
              onChange={(e) => setGradeOrSubject(e.target.value)}
              placeholder={
                role === 'student'
                  ? 'e.g. Class 10 CBSE / ICSE'
                  : 'e.g. Class 10 Physics & Electricity'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => logout()}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel & Sign Out
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Saving...' : 'Continue to Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
