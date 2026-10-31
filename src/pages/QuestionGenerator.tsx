import React, { useState, useRef } from 'react';
import {
  AlertTriangle,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Play,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import {
  QUESTION_FORMATS,
  QUICK_QUESTION_QUANTITIES,
  SUPPORTED_LANGUAGES,
} from '../data/academicCatalog';
import {
  ExamMode,
  QuestionFormatId,
  SkillTier,
  UniversalQuestion,
} from '../types/platform';
import { PageId } from '../components/Navigation';

interface QuestionGeneratorProps {
  setCurrentPage: (page: PageId) => void;
}

export const QuestionGenerator: React.FC<QuestionGeneratorProps> = ({ setCurrentPage }) => {
  const {
    universalProfile,
    subjects,
    topics,
    questionSets,
    saveQuestionSet,
    deleteQuestionSet,
    setActiveExamLaunch,
  } = useLearner();

  const initialSubj = subjects[0]?.name || 'Computer Science';

  const [educationLevel, setEducationLevel] = useState(
    universalProfile.educationCategory === 'Custom' && universalProfile.customEducationLevel
      ? universalProfile.customEducationLevel
      : universalProfile.educationLevel || 'Undergraduate'
  );
  const [examType, setExamType] = useState('University Semester / Board / Competitive Exam');
  const [subjectName, setSubjectName] = useState(initialSubj);
  const [courseName, setCourseName] = useState(subjects[0]?.courseCode || '');
  const [chapterName, setChapterName] = useState(
    subjects[0]?.chaptersList?.[0] || 'Core Foundations'
  );
  const [topicName, setTopicName] = useState('');
  const [difficulty, setDifficulty] = useState<SkillTier>('intermediate');
  const [learningObjective, setLearningObjective] = useState(
    'Conceptual Mastery, Analytical Reasoning & Applied Problem Solving'
  );
  const [questionFormat, setQuestionFormat] = useState<QuestionFormatId>('mcq');
  const [customFormatDescription, setCustomFormatDescription] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [marksPerQuestion, setMarksPerQuestion] = useState<number>(2);
  const [negativeMarks, setNegativeMarks] = useState<number>(0);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(20);
  const [language, setLanguage] = useState(universalProfile.preferredLanguage || 'English');

  const [isGenerating, setIsGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<UniversalQuestion[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const abortRef = useRef(false);

  const matchingTopics = topics.filter(
    (t) => t.subjectName.toLowerCase() === subjectName.trim().toLowerCase()
  );

  const handleSubjectQuickSelect = (name: string) => {
    setSubjectName(name);
    const found = subjects.find((s) => s.name === name);
    if (found) {
      setCourseName(found.courseCode || '');
      setChapterName(found.chaptersList[0] || 'Core Chapter');
    }
  };

  // Multi-batch generation loop (up to 10 questions per Gemini call for speed & reliability)
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetTotal = Math.max(1, Math.min(100, Math.round(questionCount)));
    setIsGenerating(true);
    setErrorMsg(null);
    setSavedNotice(null);
    setGeneratedQuestions([]);
    abortRef.current = false;

    const batchSize = 10;
    const totalBatches = Math.ceil(targetTotal / batchSize);
    const collected: UniversalQuestion[] = [];

    try {
      for (let b = 0; b < totalBatches; b++) {
        if (abortRef.current) break;
        const remaining = targetTotal - collected.length;
        const currentChunk = Math.min(batchSize, remaining);
        setBatchProgress({ current: collected.length, total: targetTotal });

        const res = await fetch('/api/questions/generate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            educationLevel,
            examType,
            subjectName,
            courseName,
            chapterName,
            topicName,
            difficulty,
            learningObjective,
            questionFormat,
            customFormatDescription,
            batchSize: currentChunk,
            batchIndex: b,
            marksPerQuestion,
            language,
            avoidTitles: collected.map((q) => q.title),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Generation failed on batch ${b + 1}`);
        }

        const data = await res.json();
        const batchQuestions: UniversalQuestion[] = Array.isArray(data.questions)
          ? data.questions
          : [];
        collected.push(...batchQuestions);
        setGeneratedQuestions([...collected]);
        setBatchProgress({ current: collected.length, total: targetTotal });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error generating question set.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSet = async () => {
    if (generatedQuestions.length === 0) return;
    const fmtLabel =
      QUESTION_FORMATS.find((f) => f.id === questionFormat)?.label || questionFormat;
    const saved = await saveQuestionSet({
      title: `${subjectName} — ${topicName || chapterName} (${generatedQuestions.length}Q · ${fmtLabel.split(' ')[0]})`,
      subjectName,
      chapterName,
      educationLevel,
      examType,
      questionFormat,
      difficulty,
      questionCount: generatedQuestions.length,
      marksPerQuestion,
      negativeMarks,
      timeLimitMinutes,
      language,
      questions: generatedQuestions,
    });
    setSavedNotice(`Saved "${saved.title}" to your Question Bank.`);
  };

  const handleLaunchExam = (mode: ExamMode, questionsToUse: UniversalQuestion[], titleText: string, mins: number, neg: number, subj: string) => {
    setActiveExamLaunch({
      title: titleText,
      mode,
      subjectName: subj,
      timeLimitMinutes: mins,
      negativeMarks: neg,
      questions: questionsToUse,
    });
    setCurrentPage('exam-workspace');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          Advanced AI Question Generation Engine
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
          Custom Assessment &amp; Question Paper Generator
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Generate 5 to 100 validated academic questions across 20+ formats with configurable marks, time limits, and multi-batch synthesis.
        </p>
      </div>

      {/* Generator Configuration Form */}
      <form
        onSubmit={handleGenerate}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6"
      >
        {/* Quick Subject Selector from User Courses */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 mr-1">My Subjects:</span>
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSubjectQuickSelect(s.name)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  subjectName === s.name
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Subject / Discipline *
            </label>
            <input
              type="text"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Physics, Algorithms, Law..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Course / Paper Code
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. CS-301 / NEET-UG"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chapter / Module *
            </label>
            <input
              type="text"
              required
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
              placeholder="e.g. Dynamic Programming / Electricity"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Specific Topic (Optional)
            </label>
            <input
              type="text"
              list="topic-suggestions"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="Leave blank for full chapter"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
            <datalist id="topic-suggestions">
              {matchingTopics.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Education Level
            </label>
            <input
              type="text"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Institution / Exam Type
            </label>
            <input
              type="text"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              placeholder="e.g. Semester Final / JEE / UPSC / Bar"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Difficulty Tier
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as SkillTier)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            >
              <option value="foundational">Foundational</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="exam-prep">Exam-Prep / Olympiad</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Output Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Format, Learning Objective, Marks, Negative Marking & Quantity */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Question Format (All 20 Academic Formats + Custom)
            </label>
            <select
              value={questionFormat}
              onChange={(e) => setQuestionFormat(e.target.value as QuestionFormatId)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            >
              {QUESTION_FORMATS.map((fmt) => (
                <option key={fmt.id} value={fmt.id}>
                  {fmt.number}. {fmt.label} — {fmt.shortDesc}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Learning Objective
            </label>
            <input
              type="text"
              value={learningObjective}
              onChange={(e) => setLearningObjective(e.target.value)}
              placeholder="e.g. Proof derivation, edge-case debugging, clinical diagnosis"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Marks/Q
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={marksPerQuestion}
              onChange={(e) => setMarksPerQuestion(Number(e.target.value) || 2)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Neg. Mark
            </label>
            <select
              value={negativeMarks}
              onChange={(e) => setNegativeMarks(Number(e.target.value))}
              className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono text-slate-900 dark:text-white"
            >
              <option value={0}>0</option>
              <option value={0.25}>-0.25</option>
              <option value={0.33}>-0.33</option>
              <option value={0.5}>-0.5</option>
              <option value={1}>-1.0</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mins
            </label>
            <input
              type="number"
              min={1}
              max={360}
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Number(e.target.value) || 30)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {questionFormat === 'custom' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Custom Question Format Specification *
            </label>
            <input
              type="text"
              required
              value={customFormatDescription}
              onChange={(e) => setCustomFormatDescription(e.target.value)}
              placeholder="e.g. Socratic Cross-Examination / Legal IRAC Fact Pattern / SQL Query Optimization Prompt"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>
        )}

        {/* Flexible Question Quantity Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1">
              Number of Questions:
            </span>
            {QUICK_QUESTION_QUANTITIES.map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => {
                  setQuestionCount(qty);
                  setTimeLimitMinutes(Math.max(5, qty * 2));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  questionCount === qty
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {qty}
              </button>
            ))}
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-xs text-slate-400">Custom:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(Math.max(1, Math.min(100, Number(e.target.value) || 5)))
                }
                className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isGenerating && (
              <button
                type="button"
                onClick={() => {
                  abortRef.current = true;
                }}
                className="px-3.5 py-2.5 rounded-lg border border-rose-300 text-rose-600 text-xs font-semibold"
              >
                Stop After Current Batch
              </button>
            )}
            <button
              type="submit"
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isGenerating
                  ? `Synthesizing (${batchProgress.current}/${batchProgress.total})...`
                  : `Generate ${questionCount} Questions →`}
              </span>
            </button>
          </div>
        </div>

        {/* Batch Progress Bar */}
        {isGenerating && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500 font-mono">
              <span>Generating validated questions in batches of up to 10...</span>
              <span>
                {batchProgress.current} / {batchProgress.total} completed
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((batchProgress.current / Math.max(1, batchProgress.total)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>

      {/* Generated Question Set Output */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Generated Set: {generatedQuestions.length} Questions ({generatedQuestions.reduce((s, q) => s + q.marks, 0)} Total Marks)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subjectName} · {chapterName} · Time Limit: {timeLimitMinutes} mins
                {negativeMarks > 0 ? ` · Negative Marking: -${negativeMarks}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveSet}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
              >
                <BookmarkCheck className="w-4 h-4 text-sky-500" />
                <span>Save to Question Bank</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleLaunchExam(
                    'practice',
                    generatedQuestions,
                    `${subjectName}: ${topicName || chapterName} Practice`,
                    timeLimitMinutes,
                    0,
                    subjectName
                  )
                }
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Practice Mode</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleLaunchExam(
                    'timed',
                    generatedQuestions,
                    `${subjectName}: Timed Examination`,
                    timeLimitMinutes,
                    negativeMarks,
                    subjectName
                  )
                }
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Timed Exam →</span>
              </button>
            </div>
          </div>

          {savedNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{savedNotice}</span>
            </div>
          )}

          {/* Question Cards */}
          <div className="space-y-3">
            {generatedQuestions.map((q, index) => {
              const isExpanded = Boolean(expandedIds[q.id]);
              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span className="font-bold text-sky-600 dark:text-sky-400">
                          Q{index + 1}
                        </span>
                        <span>·</span>
                        <span>{q.topicName}</span>
                        <span>·</span>
                        <span>{q.marks} Marks</span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                        {q.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIds((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 shrink-0"
                    >
                      <span>{isExpanded ? 'Hide Solution' : 'Solution & Hints'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {q.contextPassage && (
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-bold block mb-1 uppercase text-[10px] tracking-wider text-slate-400">
                        Case / Scenario Context
                      </span>
                      {q.contextPassage}
                    </div>
                  )}

                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {q.prompt}
                  </p>

                  {q.codeSnippet && (
                    <pre className="p-3.5 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
                      {q.codeSnippet}
                    </pre>
                  )}

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300"
                        >
                          <span className="font-mono font-bold mr-2 text-slate-400">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.matchPairs && q.matchPairs.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      {q.matchPairs.map((pair, pi) => (
                        <React.Fragment key={pi}>
                          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium">
                            {pi + 1}. {pair.left}
                          </div>
                          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            {String.fromCharCode(65 + pi)}. {pair.right}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200">
                        <span className="font-bold block mb-0.5">Reference Answer:</span>
                        {q.expectedAnswer}
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        <span className="font-bold block mb-0.5">Detailed Explanation:</span>
                        {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved Question Bank */}
      {questionSets.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Saved Question Bank ({questionSets.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {questionSets.map((qs) => (
              <div
                key={qs.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{qs.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {qs.subjectName} · {qs.questionCount} questions · {qs.timeLimitMinutes} mins · {qs.language}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleLaunchExam(
                        'timed',
                        qs.questions,
                        qs.title,
                        qs.timeLimitMinutes,
                        qs.negativeMarks,
                        qs.subjectName
                      )
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
                  >
                    Launch Exam →
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteQuestionSet(qs.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500"
                    title="Delete question set"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
