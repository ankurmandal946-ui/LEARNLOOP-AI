import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileText,
  HelpCircle,
  Layers,
  Play,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import { DocumentAnswerResult, StudyDocumentItem, UniversalQuestion } from '../types/platform';
import { PageId } from '../components/Navigation';

interface DocumentLearningProps {
  setCurrentPage: (page: PageId) => void;
}

export const DocumentLearning: React.FC<DocumentLearningProps> = ({ setCurrentPage }) => {
  const {
    universalProfile,
    subjects,
    studyDocuments,
    saveStudyDocument,
    deleteStudyDocument,
    addTopic,
    setActiveExamLaunch,
  } = useLearner();

  const [docTitle, setDocTitle] = useState('');
  const [subjectName, setSubjectName] = useState(subjects[0]?.name || 'General Studies');
  const [pastedText, setPastedText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedMimeType, setUploadedMimeType] = useState('text/plain');
  const [pdfBase64, setPdfBase64] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    studyDocuments[0]?.id || null
  );
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [importedNotice, setImportedNotice] = useState<string | null>(null);

  // Grounded Q&A state
  const [questionInput, setQuestionInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<
    Array<{ question: string; result: DocumentAnswerResult }>
  >([]);

  const activeDoc: StudyDocumentItem | undefined =
    studyDocuments.find((d) => d.id === selectedDocId) || studyDocuments[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Please upload a document under 10 MB.');
      return;
    }

    setUploadedFileName(file.name);
    if (!docTitle.trim()) {
      setDocTitle(file.name.replace(/\.[^.]+$/, ''));
    }

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setUploadedMimeType('application/pdf');
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = String(reader.result || '');
        const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
        setPdfBase64(base64);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedMimeType('text/plain');
      setPdfBase64('');
      const reader = new FileReader();
      reader.onload = () => {
        setPastedText(String(reader.result || ''));
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyzeDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim() && !pdfBase64) {
      setErrorMsg('Upload a PDF/text file or paste study notes first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setImportedNotice(null);

    try {
      const res = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle.trim() || uploadedFileName || 'Study Notes',
          subjectName,
          educationLevel: universalProfile.educationLevel,
          mimeType: uploadedMimeType,
          textContent: pastedText,
          base64Data: pdfBase64,
          language: universalProfile.preferredLanguage || 'English',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Document analysis failed.');
      }

      const data = await res.json();
      const practiceQs: UniversalQuestion[] = Array.isArray(data.practiceQuestions)
        ? data.practiceQuestions.map((pq: any, idx: number) => ({
            id: `docq-${Date.now()}-${idx}`,
            format: Array.isArray(pq.options) && pq.options.length > 0 ? 'mcq' : 'short_answer',
            subjectName,
            chapterName: docTitle.trim() || 'Uploaded Material',
            topicName: pq.topicName || 'Document Concept',
            difficulty: 'intermediate',
            marks: 2,
            title: pq.title || `Document Question ${idx + 1}`,
            prompt: pq.prompt,
            options: pq.options,
            correctOptions: pq.correctOptions,
            expectedAnswer: pq.expectedAnswer,
            explanation: pq.explanation,
            hint1: 'Refer to the summary and key principles extracted from the uploaded material.',
            hint2: 'Check definitions in the revision notes.',
            hint3: 'Synthesize directly from the passage.',
          }))
        : [];

      const saved = await saveStudyDocument({
        title: docTitle.trim() || uploadedFileName || 'Study Notes',
        fileName: uploadedFileName || 'pasted-notes.txt',
        mimeType: uploadedMimeType,
        subjectName,
        rawTextPreview: pastedText.slice(0, 20000),
        summary: data.summary || '',
        revisionNotes: data.revisionNotes || '',
        extractedTopics: Array.isArray(data.extractedTopics) ? data.extractedTopics : [],
        flashcards: Array.isArray(data.flashcards) ? data.flashcards : [],
        practiceQuestions: practiceQs,
      });

      setSelectedDocId(saved.id);
      setDocTitle('');
      setPastedText('');
      setPdfBase64('');
      setUploadedFileName('');
      setQaHistory([]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error analyzing uploaded document.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImportTopicsToCurriculum = async () => {
    if (!activeDoc || activeDoc.extractedTopics.length === 0) return;
    const targetSubj =
      subjects.find((s) => s.name.toLowerCase() === activeDoc.subjectName.toLowerCase()) ||
      subjects[0];
    if (!targetSubj) return;

    for (const tName of activeDoc.extractedTopics.slice(0, 10)) {
      await addTopic({
        subjectId: targetSubj.id,
        chapterName: activeDoc.title,
        name: tName,
      });
    }
    setImportedNotice(
      `Imported ${Math.min(10, activeDoc.extractedTopics.length)} extracted topics into "${targetSubj.name}".`
    );
  };

  const handleAskDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc || !questionInput.trim()) return;
    const qText = questionInput.trim();
    setIsAsking(true);
    try {
      const res = await fetch('/api/documents/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qText,
          documentTitle: activeDoc.title,
          documentSummary: activeDoc.summary,
          documentNotes: activeDoc.revisionNotes,
          rawTextPreview: activeDoc.rawTextPreview || '',
          language: universalProfile.preferredLanguage || 'English',
        }),
      });
      if (!res.ok) throw new Error('Could not answer document question.');
      const result: DocumentAnswerResult = await res.json();
      setQaHistory((prev) => [{ question: qText, result }, ...prev]);
      setQuestionInput('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Document Q&A error.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          AI-Powered Document Learning &amp; Grounded Q&amp;A
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
          Study From Textbooks, PDFs, Syllabi &amp; Lecture Notes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Extract concepts, summaries, flashcards, and practice quizzes strictly grounded in your uploaded material, with transparent provenance on every Q&amp;A response.
        </p>
      </div>

      {/* Upload & Paste Form */}
      <form
        onSubmit={handleAnalyzeDocument}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Material Title
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Lecture 4: Operating System Paging"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Subject
            </label>
            <input
              type="text"
              list="doc-subjects"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
            <datalist id="doc-subjects">
              {subjects.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Upload PDF or Text File (.pdf, .txt, .md)
            </label>
            <label className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer hover:border-sky-500">
              <Upload className="w-4 h-4 text-sky-500 shrink-0" />
              <span className="truncate">
                {uploadedFileName || 'Choose PDF or Notes file...'}
              </span>
              <input
                type="file"
                accept=".pdf,.txt,.md,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Or Paste Lecture Notes / Syllabus / Chapter Excerpt
          </label>
          <textarea
            rows={4}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste textbook paragraphs, research abstract, syllabus outline, or class notes here..."
            className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isAnalyzing}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isAnalyzing
                ? 'Analyzing Material & Extracting Concepts...'
                : 'Extract Concepts, Notes, Flashcards & Quiz →'}
            </span>
          </button>
        </div>
      </form>

      {/* Library & Active Document Workspace */}
      {studyDocuments.length > 0 && activeDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 4 Cols: Uploaded Materials List */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Uploaded Study Materials ({studyDocuments.length})
            </h2>
            <div className="space-y-2">
              {studyDocuments.map((docItem) => {
                const isSelected = docItem.id === activeDoc.id;
                return (
                  <div
                    key={docItem.id}
                    onClick={() => {
                      setSelectedDocId(docItem.id);
                      setQaHistory([]);
                      setFlippedCards({});
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/70 dark:bg-sky-950/40'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {docItem.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {docItem.subjectName} · {docItem.flashcards.length} flashcards
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStudyDocument(docItem.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 8 Cols: Active Study Material Insights & Provenance Q&A */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    {activeDoc.subjectName} · {activeDoc.fileName}
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {activeDoc.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleImportTopicsToCurriculum}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Import Topics to Syllabus</span>
                  </button>

                  {activeDoc.practiceQuestions && activeDoc.practiceQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveExamLaunch({
                          title: `${activeDoc.title} — Document Quiz`,
                          mode: 'practice',
                          subjectName: activeDoc.subjectName,
                          timeLimitMinutes: 15,
                          negativeMarks: 0,
                          questions: activeDoc.practiceQuestions || [],
                        });
                        setCurrentPage('exam-workspace');
                      }}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Practice Document Quiz</span>
                    </button>
                  )}
                </div>
              </div>

              {importedNotice && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{importedNotice}</span>
                </div>
              )}

              {/* Extracted Topics */}
              {activeDoc.extractedTopics.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Extracted Syllabus Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeDoc.extractedTopics.map((tp, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        {tp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Executive Summary & Revision Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Document Summary
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {activeDoc.summary}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Structured Revision Notes
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {activeDoc.revisionNotes}
                  </p>
                </div>
              </div>

              {/* Interactive Flashcards */}
              {activeDoc.flashcards.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active Recall Flashcards (Click to Flip)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeDoc.flashcards.map((fc, idx) => {
                      const flipped = Boolean(flippedCards[idx]);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setFlippedCards((prev) => ({ ...prev, [idx]: !prev[idx] }))
                          }
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-sky-400 text-left transition-all min-h-[104px] flex flex-col justify-between"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                            {flipped ? 'Answer / Explanation' : `Prompt · ${fc.topic}`}
                          </span>
                          <p className="text-xs font-medium text-slate-900 dark:text-white mt-1.5 leading-relaxed">
                            {flipped ? fc.back : fc.front}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Grounded Q&A with Provenance Attribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-sky-500" />
                  <span>Ask Questions About "{activeDoc.title}"</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Responses explicitly distinguish between facts grounded in your uploaded document and general academic knowledge.
                </p>
              </div>

              <form onSubmit={handleAskDocument} className="flex gap-2">
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="Ask about a definition, theorem, or difficult section in this document..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isAsking || !questionInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAsking ? 'Checking...' : 'Ask'}</span>
                </button>
              </form>

              {qaHistory.length > 0 && (
                <div className="space-y-3 pt-2">
                  {qaHistory.map((item, idx) => {
                    const sourceBadge =
                      item.result.sourceType === 'uploaded_document'
                        ? {
                            label: 'Grounded in Uploaded Document',
                            cls: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                          }
                        : item.result.sourceType === 'hybrid'
                        ? {
                            label: 'Hybrid: Uploaded Document + General Context',
                            cls: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
                          }
                        : {
                            label: 'General AI Knowledge (Not in Uploaded Document)',
                            cls: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                          };

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Q: {item.question}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded border font-semibold ${sourceBadge.cls}`}>
                            {sourceBadge.label}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                          {item.result.answer}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/70 dark:border-slate-800 pt-2">
                          <strong>Provenance Note:</strong> {item.result.sourceAttributionNote}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
