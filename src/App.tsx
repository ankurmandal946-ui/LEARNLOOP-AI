import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { LearnerProvider, useLearner } from './context/LearnerContext';
import { Navigation, PageId, WorkspaceSidebar } from './components/Navigation';
import { OnboardingModal } from './components/OnboardingModal';
import { LandingPage } from './pages/LandingPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { CurriculumWorkspace } from './pages/CurriculumWorkspace';
import { QuestionGenerator } from './pages/QuestionGenerator';
import { ExamWorkspace } from './pages/ExamWorkspace';
import { InteractiveAITutor } from './pages/InteractiveAITutor';
import { DocumentLearning } from './pages/DocumentLearning';
import { RevisionSchedule } from './pages/RevisionSchedule';
import { ConceptMasteryMap } from './pages/ConceptMasteryMap';
import { DiagnosticAssessment } from './pages/DiagnosticAssessment';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { ProfileSettings } from './pages/ProfileSettings';
import { ConceptId } from './types/physics';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [selectedConceptForTutor, setSelectedConceptForTutor] = useState<ConceptId | undefined>();
  const [selectedTopicIdForTutor, setSelectedTopicIdForTutor] = useState<string | undefined>();
  const [confirmFooterReset, setConfirmFooterReset] = useState(false);

  const {
    workspaceMode,
    getWeakestConcept,
    getWeakestTopicUniversal,
    resetProgress,
  } = useLearner();

  if (workspaceMode === 'landing') {
    return <LandingPage />;
  }

  const handleSelectConceptForTutor = (conceptId: ConceptId) => {
    setSelectedConceptForTutor(conceptId);
    setSelectedTopicIdForTutor(undefined);
    setCurrentPage('tutor');
  };

  const handleSelectUniversalTopicForTutor = (topicId: string) => {
    setSelectedTopicIdForTutor(topicId);
    setSelectedConceptForTutor(undefined);
    setCurrentPage('tutor');
  };

  const handleQuickPracticeWeakest = () => {
    const weakestTopic = getWeakestTopicUniversal();
    if (weakestTopic) {
      handleSelectUniversalTopicForTutor(weakestTopic.id);
    } else {
      const weakest = getWeakestConcept();
      handleSelectConceptForTutor(weakest.conceptId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <OnboardingModal />

      <Navigation
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onQuickPracticeWeakest={handleQuickPracticeWeakest}
      />

      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        <WorkspaceSidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />

        <main className="flex-1 min-w-0">
          {currentPage === 'dashboard' && (
            <StudentDashboard
              setCurrentPage={setCurrentPage}
              onSelectConceptForTutor={handleSelectConceptForTutor}
              onSelectUniversalTopicForTutor={handleSelectUniversalTopicForTutor}
            />
          )}

          {currentPage === 'curriculum' && (
            <CurriculumWorkspace
              setCurrentPage={setCurrentPage}
              onPracticeTopicInTutor={handleSelectUniversalTopicForTutor}
            />
          )}

          {currentPage === 'question-generator' && (
            <QuestionGenerator setCurrentPage={setCurrentPage} />
          )}

          {currentPage === 'exam-workspace' && <ExamWorkspace />}

          {currentPage === 'tutor' && (
            <InteractiveAITutor
              key={selectedTopicIdForTutor || selectedConceptForTutor || 'default-tutor'}
              selectedConceptId={selectedConceptForTutor}
              selectedTopicId={selectedTopicIdForTutor}
            />
          )}

          {currentPage === 'documents' && (
            <DocumentLearning setCurrentPage={setCurrentPage} />
          )}

          {currentPage === 'revision' && (
            <RevisionSchedule
              setCurrentPage={setCurrentPage}
              onSelectConceptForTutor={handleSelectConceptForTutor}
              onSelectUniversalTopicForTutor={handleSelectUniversalTopicForTutor}
            />
          )}

          {currentPage === 'mastery-map' && (
            <ConceptMasteryMap
              setCurrentPage={setCurrentPage}
              onSelectConceptForTutor={handleSelectConceptForTutor}
            />
          )}

          {currentPage === 'diagnostic' && (
            <DiagnosticAssessment
              setCurrentPage={setCurrentPage}
              onSelectConceptForTutor={handleSelectConceptForTutor}
            />
          )}

          {currentPage === 'teacher' && <TeacherDashboard />}

          {currentPage === 'profile' && <ProfileSettings />}
        </main>
      </div>

      {/* Quiet Workspace Footer (Inline Confirmation — Zero window.confirm) */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">LearnLoop AI</span>
            <span>·</span>
            <span>One Platform. Every Subject. Every Learner. Smarter Learning.</span>
          </div>

          <div className="flex items-center gap-4">
            {!confirmFooterReset ? (
              <button
                type="button"
                onClick={() => setConfirmFooterReset(true)}
                className="text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Progress</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Reset mastery &amp; schedules?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetProgress();
                    setConfirmFooterReset(false);
                    setCurrentPage('dashboard');
                  }}
                  className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmFooterReset(false)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LearnerProvider>
      <AppContent />
    </LearnerProvider>
  );
}
