import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FolderPlus,
  Layers,
  Plus,
  Search,
  Sparkles,
  Trash2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import { UNIVERSAL_SUBJECT_LIBRARY } from '../data/academicCatalog';
import { PageId } from '../components/Navigation';

interface CurriculumWorkspaceProps {
  setCurrentPage: (page: PageId) => void;
  onPracticeTopicInTutor: (topicId: string) => void;
}

export const CurriculumWorkspace: React.FC<CurriculumWorkspaceProps> = ({
  setCurrentPage,
  onPracticeTopicInTutor,
}) => {
  const {
    subjects,
    topics,
    activeSubjectId,
    setActiveSubjectId,
    addSubject,
    deleteSubject,
    addTopic,
    deleteTopic,
    suggestCurriculumWithAI,
    universalProfile,
  } = useLearner();

  const [librarySearch, setLibrarySearch] = useState('');
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjCategory, setNewSubjCategory] = useState('Custom Course');
  const [newSubjDesc, setNewSubjDesc] = useState('');

  const [newChapterName, setNewChapterName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicFormula, setNewTopicFormula] = useState('');

  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === activeSubjectId) || subjects[0],
    [subjects, activeSubjectId]
  );

  const subjectTopics = useMemo(
    () => (selectedSubject ? topics.filter((t) => t.subjectId === selectedSubject.id) : []),
    [topics, selectedSubject]
  );

  const groupedByChapter = useMemo(() => {
    const map: Record<string, typeof subjectTopics> = {};
    if (selectedSubject) {
      for (const ch of selectedSubject.chaptersList) {
        map[ch] = [];
      }
    }
    for (const tp of subjectTopics) {
      if (!map[tp.chapterName]) map[tp.chapterName] = [];
      map[tp.chapterName].push(tp);
    }
    return map;
  }, [selectedSubject, subjectTopics]);

  const unaddedCatalogSubjects = useMemo(() => {
    const existing = new Set(subjects.map((s) => s.name.toLowerCase()));
    const q = librarySearch.trim().toLowerCase();
    return UNIVERSAL_SUBJECT_LIBRARY.filter(
      (item) =>
        !existing.has(item.name.toLowerCase()) &&
        (!q ||
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q))
    );
  }, [subjects, librarySearch]);

  const handleCreateCustomSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;
    const created = await addSubject({
      name: newSubjName.trim(),
      category: newSubjCategory.trim() || 'Custom Course',
      courseCode: newSubjCode.trim() || 'CUSTOM-101',
      educationLevel: universalProfile.educationLevel,
      description: newSubjDesc.trim(),
      seedFromCatalog: true,
    });
    setNewSubjName('');
    setNewSubjCode('');
    setNewSubjDesc('');
    setShowAddSubjectForm(false);
    setStatusMessage(`Added "${created.name}" to your courses.`);
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !newTopicName.trim()) return;
    await addTopic({
      subjectId: selectedSubject.id,
      chapterName: newChapterName.trim() || selectedSubject.chaptersList[0] || 'Core Chapter',
      name: newTopicName.trim(),
      formulaOrKeyRule: newTopicFormula.trim(),
    });
    setNewTopicName('');
    setNewTopicFormula('');
    setStatusMessage('Topic added to syllabus.');
  };

  const handleAISuggest = async () => {
    if (!selectedSubject) return;
    setAiSuggesting(true);
    setStatusMessage(null);
    try {
      const count = await suggestCurriculumWithAI(selectedSubject.id);
      setStatusMessage(
        count > 0
          ? `Generated and added ${count} structured topics for ${selectedSubject.name}.`
          : `All suggested core topics are already in ${selectedSubject.name}.`
      );
    } catch (err: any) {
      setStatusMessage(err?.message || 'Could not suggest syllabus topics right now.');
    } finally {
      setAiSuggesting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Universal Subject &amp; Course Management
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            My Courses, Subjects, Chapters &amp; Topics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize any academic discipline, add custom modules, or auto-generate chapters tailored to {universalProfile.educationLevel}.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowAddSubjectForm((v) => !v)}
            className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Custom Subject / Course</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {statusMessage}
          </span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-700 dark:text-emerald-300 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Custom Subject Creation Panel */}
      {showAddSubjectForm && (
        <form
          onSubmit={handleCreateCustomSubject}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Create Custom Subject, University Course, or Exam Paper
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Subject or Course Name *
              </label>
              <input
                type="text"
                required
                value={newSubjName}
                onChange={(e) => setNewSubjName(e.target.value)}
                placeholder="e.g. Constitutional Law / Organic Chemistry II / AWS Cloud"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Course Code
              </label>
              <input
                type="text"
                value={newSubjCode}
                onChange={(e) => setNewSubjCode(e.target.value)}
                placeholder="e.g. LAW-302 / CHEM-204"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Discipline Category
              </label>
              <input
                type="text"
                value={newSubjCategory}
                onChange={(e) => setNewSubjCategory(e.target.value)}
                placeholder="e.g. Engineering / Humanities / Medical"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Syllabus Scope / Description
              </label>
              <input
                type="text"
                value={newSubjDesc}
                onChange={(e) => setNewSubjDesc(e.target.value)}
                placeholder="Key modules, textbooks, or exam objectives..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddSubjectForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
            >
              Save Subject
            </button>
          </div>
        </form>
      )}

      {/* Main Split Grid: Enrolled Subjects vs Active Syllabus Chapters/Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 4 Cols: Enrolled Courses + Searchable Catalog */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              My Enrolled Subjects ({subjects.length})
            </h2>
            <div className="space-y-2">
              {subjects.map((subj) => {
                const isSelected = selectedSubject?.id === subj.id;
                const sTopics = topics.filter((t) => t.subjectId === subj.id);
                const avg =
                  sTopics.length > 0
                    ? Math.round(sTopics.reduce((a, b) => a + b.score, 0) / sTopics.length)
                    : 50;

                return (
                  <div
                    key={subj.id}
                    onClick={() => setActiveSubjectId(subj.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/60 dark:bg-sky-950/40'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {subj.name}
                        </span>
                        {subj.courseCode && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {subj.courseCode}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {sTopics.length} topics · Avg Mastery{' '}
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                          {avg}%
                        </span>
                      </div>
                    </div>

                    {subjects.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSubject(subj.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                        title="Remove subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Searchable 23+ Discipline Library */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quick-Add from Subject Library
            </h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search Law, Economics, AI, Biology..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {unaddedCatalogSubjects.map((item) => (
                <div
                  key={item.name}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.category}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      addSubject({
                        name: item.name,
                        category: item.category,
                        courseCode: item.defaultCode,
                        description: item.description,
                        seedFromCatalog: true,
                      })
                    }
                    className="px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-semibold shrink-0 hover:opacity-90"
                  >
                    + Add
                  </button>
                </div>
              ))}
              {unaddedCatalogSubjects.length === 0 && (
                <p className="text-xs text-slate-400 py-2">
                  No matching unadded catalog subjects. Use "New Custom Subject" above to create any specialized course!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Selected Subject Syllabus, Chapters & Evidence-Based Topics */}
        <div className="lg:col-span-8 space-y-6">
          {selectedSubject ? (
            <>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
                      <BookOpen className="w-4 h-4" />
                      <span>{selectedSubject.category}</span>
                      {selectedSubject.courseCode && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{selectedSubject.courseCode}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {selectedSubject.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {selectedSubject.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleAISuggest}
                      disabled={aiSuggesting}
                      className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {aiSuggesting ? 'Generating Syllabus...' : 'AI Suggest Chapters & Topics'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('question-generator')}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
                    >
                      Generate Questions →
                    </button>
                  </div>
                </div>

                {/* Add Custom Chapter & Topic Form */}
                <form
                  onSubmit={handleAddTopic}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1"
                >
                  <input
                    type="text"
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    placeholder="Chapter / Module (e.g. Unit 2: Graph Theory)"
                    className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    required
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="New Topic Name *"
                    className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newTopicFormula}
                    onChange={(e) => setNewTopicFormula(e.target.value)}
                    placeholder="Key Formula / Rule (Optional)"
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Topic</span>
                  </button>
                </form>
              </div>

              {/* Chapters & Topics List */}
              <div className="space-y-4">
                {(Object.entries(groupedByChapter) as Array<[string, typeof subjectTopics]>).map(([chapter, chTopics]) => (
                  <div
                    key={chapter}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-sky-500" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {chapter}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {chTopics.length} topic(s)
                      </span>
                    </div>

                    {chTopics.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">
                        No topics in this chapter yet. Add one above or click "AI Suggest Chapters &amp; Topics".
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {chTopics.map((tp) => (
                          <div
                            key={tp.id}
                            className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                  {tp.name}
                                </span>
                                {tp.formulaOrKeyRule && (
                                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                    {tp.formulaOrKeyRule}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {tp.lastChangeReason}
                              </p>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                                <span>
                                  Mastery:{' '}
                                  <strong className="text-sky-600 dark:text-sky-400">
                                    {tp.score}%
                                  </strong>
                                </span>
                                <span>·</span>
                                <span>
                                  {tp.questionsCorrect}/{tp.questionsAttempted} correct
                                </span>
                                <span>·</span>
                                <span className="capitalize">{tp.difficultyTier}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => onPracticeTopicInTutor(tp.id)}
                                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <span>Tutor Practice</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTopic(tp.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Delete topic"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-500">
              Select or create a subject to manage chapters and topics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
