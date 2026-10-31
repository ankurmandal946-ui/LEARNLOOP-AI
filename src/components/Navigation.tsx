import React from 'react';
import {
  BookOpen,
  Brain,
  Calendar,
  Cpu,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Mic,
  Moon,
  Settings,
  Sun,
  Timer,
  Users,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import { ACCOUNT_ROLES } from '../data/academicCatalog';

export type PageId =
  | 'dashboard'
  | 'curriculum'
  | 'question-generator'
  | 'exam-workspace'
  | 'tutor'
  | 'documents'
  | 'revision'
  | 'mastery-map'
  | 'diagnostic'
  | 'teacher'
  | 'profile';

interface NavigationProps {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  onQuickPracticeWeakest?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  setCurrentPage,
  onQuickPracticeWeakest,
}) => {
  const {
    theme,
    toggleTheme,
    universalProfile,
    universalDueRevisionsCount,
    openLandingPage,
    setShowOnboardingModal,
  } = useLearner();

  const roleLabel =
    ACCOUNT_ROLES.find((r) => r.id === universalProfile.personaType)?.label || 'Learner';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center gap-2.5 text-left group"
          >
            <span className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white text-xs font-extrabold shadow-sm group-hover:bg-sky-500 transition-colors">
              LL
            </span>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white block leading-none">
                LearnLoop AI
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block mt-0.5">
                Universal Academic Platform
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Active Academic Context Summary */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {universalProfile.displayName}
          </span>
          <span>·</span>
          <span>{roleLabel}</span>
          <span>·</span>
          <span className="truncate max-w-xs">
            {universalProfile.educationCategory === 'Custom' && universalProfile.customEducationLevel
              ? universalProfile.customEducationLevel
              : universalProfile.educationLevel}
          </span>
          <button
            type="button"
            onClick={() => setShowOnboardingModal(true)}
            className="ml-1 text-sky-600 dark:text-sky-400 font-semibold hover:underline"
          >
            Switch Level / Subjects
          </button>
        </div>

        {/* Zone 3: Primary Action + Theme + Profile */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onQuickPracticeWeakest) onQuickPracticeWeakest();
              else setCurrentPage('tutor');
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            Practice Weakest Topic →
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle light and dark theme"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={openLandingPage}
            className="hidden sm:inline-flex px-2.5 py-2 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            title="View Platform Overview"
          >
            Overview
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Navigation Strip */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 gap-3 text-xs font-medium no-scrollbar">
        {[
          { id: 'dashboard' as PageId, label: 'Dashboard' },
          { id: 'curriculum' as PageId, label: 'My Subjects' },
          { id: 'question-generator' as PageId, label: 'Question Engine' },
          { id: 'exam-workspace' as PageId, label: 'Exams' },
          { id: 'tutor' as PageId, label: 'AI Tutor' },
          { id: 'documents' as PageId, label: 'Docs Q&A' },
          {
            id: 'revision' as PageId,
            label:
              universalDueRevisionsCount > 0
                ? `Revision (${universalDueRevisionsCount})`
                : 'Revision',
          },
          { id: 'mastery-map' as PageId, label: 'Circuit Lab' },
          { id: 'teacher' as PageId, label: 'Educators' },
          { id: 'profile' as PageId, label: 'Profile' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrentPage(item.id)}
            className={`whitespace-nowrap py-1 px-2 rounded-md transition-colors ${
              currentPage === item.id
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};

export const WorkspaceSidebar: React.FC<{
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
}> = ({ currentPage, setCurrentPage }) => {
  const { universalDueRevisionsCount, universalProfile } = useLearner();

  const sections: Array<{
    heading: string;
    items: Array<{ id: PageId; label: string; icon: React.ReactNode; count?: number }>;
  }> = [
    {
      heading: 'Learning Environment',
      items: [
        { id: 'dashboard', label: 'My Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'curriculum', label: 'My Courses & Subjects', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'tutor', label: 'Voice AI Tutor', icon: <Mic className="w-4 h-4" /> },
        { id: 'documents', label: 'Document Learning', icon: <FileText className="w-4 h-4" /> },
        {
          id: 'revision',
          label: 'Spaced Revision',
          icon: <Calendar className="w-4 h-4" />,
          count: universalDueRevisionsCount > 0 ? universalDueRevisionsCount : undefined,
        },
      ],
    },
    {
      heading: 'Assessment & Labs',
      items: [
        {
          id: 'question-generator',
          label: 'Question Engine (20+)',
          icon: <Layers className="w-4 h-4" />,
        },
        { id: 'exam-workspace', label: 'Exams & Mock Tests', icon: <Timer className="w-4 h-4" /> },
        { id: 'mastery-map', label: 'Physics Circuit Lab', icon: <Cpu className="w-4 h-4" /> },
        { id: 'diagnostic', label: 'Physics Diagnostic', icon: <Brain className="w-4 h-4" /> },
      ],
    },
    {
      heading: 'Educator & Account',
      items: [
        {
          id: 'teacher',
          label: 'Educator & Institution',
          icon: <Users className="w-4 h-4" />,
        },
        {
          id: 'profile',
          label: 'Profile & Settings',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 min-h-[calc(100vh-4rem)] p-4 space-y-6">
      {sections.map((sec) => (
        <div key={sec.heading} className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            {sec.heading}
          </div>
          {sec.items.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentPage(item.id)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  active
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>
                {item.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      active ? 'bg-white text-sky-700' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* Compact Academic Context Card at bottom of sidebar */}
      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white truncate">
            <GraduationCap className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="truncate">{universalProfile.displayName}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {universalProfile.institutionName || 'Independent Workspace'}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Language: {universalProfile.preferredLanguage}
          </div>
        </div>
      </div>
    </aside>
  );
};
