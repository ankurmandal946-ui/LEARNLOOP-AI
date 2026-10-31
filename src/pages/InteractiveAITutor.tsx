import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import { CONCEPTS, DIAGNOSTIC_QUESTIONS } from '../data/physicsConcepts';
import {
  AgentStepRecord,
  ConceptId,
  DifficultyLevel,
  EvaluationResult,
  Question,
} from '../types/physics';
import { VoiceInputArea } from '../components/VoiceInputArea';
import { CircuitVisualizer } from '../components/CircuitVisualizer';
import { AgentActivityHistory } from '../components/AgentActivityHistory';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface InteractiveAITutorProps {
  selectedConceptId?: ConceptId;
  selectedTopicId?: string;
}

export const InteractiveAITutor: React.FC<InteractiveAITutorProps> = ({
  selectedConceptId: initialConceptId,
  selectedTopicId: initialTopicId,
}) => {
  const {
    universalProfile,
    subjects,
    topics,
    executeAgentLearningCycle,
    agentActivityLogs,
    latestAwardedTrophy,
    dismissTrophyCelebration,
  } = useLearner();
  const { speakText, stopSpeaking, isSpeaking } = useSpeechRecognition();

  // Resolve initial topic from either selectedTopicId or legacy selectedConceptId
  const initialTopic = useMemo(() => {
    if (initialTopicId) {
      const found = topics.find((t) => t.id === initialTopicId);
      if (found) return found;
    }
    if (initialConceptId) {
      const foundLegacy = topics.find((t) => t.legacyConceptId === initialConceptId);
      if (foundLegacy) return foundLegacy;
    }
    return topics[0];
  }, [initialTopicId, initialConceptId, topics]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialTopic?.subjectId || subjects[0]?.id || 'subj-physics'
  );
  const [activeTopicId, setActiveTopicId] = useState<string>(
    initialTopic?.id || topics[0]?.id || 'topic-circuits'
  );

  const activeSubject =
    subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const subjectTopics = topics.filter((t) => t.subjectId === activeSubject?.id);
  const activeTopic =
    topics.find((t) => t.id === activeTopicId) || subjectTopics[0] || topics[0];

  const [currentQuestion, setCurrentQuestion] = useState<Question>(() => {
    if (activeTopic?.legacyConceptId) {
      const match = DIAGNOSTIC_QUESTIONS.find(
        (q) => q.conceptId === activeTopic.legacyConceptId
      );
      if (match) return match;
    }
    const tName = activeTopic?.name || 'Core Concept';
    const sName = activeTopic?.subjectName || 'Academic Studies';
    return {
      id: `q-init-${Date.now()}`,
      conceptId: (activeTopic?.legacyConceptId || 'ohms-law') as ConceptId,
      conceptName: tName,
      difficulty: 'intermediate',
      title: `Conceptual & Analytical Application: ${tName}`,
      prompt: `Explain the governing principle of ${tName} in ${sName}${
        activeTopic?.formulaOrKeyRule ? ` (${activeTopic.formulaOrKeyRule})` : ''
      }, apply it to a concrete problem or case, and explain how you verify your conclusion.`,
      circuitSetup: { hasCircuit: false, circuitType: 'none' },
      expectedFormat: 'Provide your direct conclusion/answer and step-by-step reasoning.',
      correctAnswerReference: `Define ${tName}, apply ${activeTopic?.formulaOrKeyRule || 'core rules'} systematically, and justify edge conditions.`,
      hint1: `Start from the fundamental definition of ${tName}.`,
      hint2: activeTopic?.formulaOrKeyRule
        ? `Connect the variables using ${activeTopic.formulaOrKeyRule}.`
        : 'Identify the primary inputs and constraints.',
      hint3: 'Walk through a concrete step-by-step example to confirm your result.',
    };
  });

  const [finalAnswer, setFinalAnswer] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [hintsUnlocked, setHintsUnlocked] = useState<number>(0);
  const [activeHintText, setActiveHintText] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [nextTargetedQuestion, setNextTargetedQuestion] = useState<Question | null>(null);
  const [activeStepRecord, setActiveStepRecord] = useState<AgentStepRecord | null>(null);

  const topicScore = activeTopic?.score ?? 50;
  const dynamicDifficulty: DifficultyLevel =
    topicScore >= 75 ? 'exam-prep' : topicScore >= 55 ? 'intermediate' : 'foundational';

  const educationLevelLabel =
    universalProfile.educationCategory === 'Custom' && universalProfile.customEducationLevel
      ? universalProfile.customEducationLevel
      : universalProfile.educationLevel || 'Undergraduate';

  const fetchQuestionForTopic = async (targetTopic = activeTopic) => {
    if (!targetTopic) return;
    setIsGeneratingNext(true);
    setEvaluationResult(null);
    setFinalAnswer('');
    setReasoning('');
    setHintsUnlocked(0);
    setActiveHintText(null);
    setEvalError(null);

    const diff: DifficultyLevel =
      targetTopic.score >= 75
        ? 'exam-prep'
        : targetTopic.score >= 55
        ? 'intermediate'
        : 'foundational';

    try {
      const res = await fetch('/api/tutor/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: targetTopic.legacyConceptId || targetTopic.id,
          conceptName: targetTopic.name,
          subjectName: targetTopic.subjectName,
          chapterName: targetTopic.chapterName,
          educationLevel: educationLevelLabel,
          language: universalProfile.preferredLanguage || 'English',
          targetDifficulty: diff,
          recentMisconceptions: targetTopic.misconceptions || [],
          mastery: targetTopic.score,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Question = await res.json();
      setCurrentQuestion(data);
    } catch {
      if (targetTopic.legacyConceptId) {
        const fb = DIAGNOSTIC_QUESTIONS.find((q) => q.conceptId === targetTopic.legacyConceptId);
        if (fb) {
          setCurrentQuestion({ ...fb, id: `q-${Date.now()}` });
          return;
        }
      }
      setCurrentQuestion({
        id: `q-${Date.now()}`,
        conceptId: 'ohms-law',
        conceptName: targetTopic.name,
        difficulty: diff,
        title: `Applied Problem: ${targetTopic.name}`,
        prompt: `In ${targetTopic.subjectName} (${targetTopic.chapterName}), state the core rule governing ${targetTopic.name}, work through an example, and explain what happens if a key assumption is violated.`,
        circuitSetup: { hasCircuit: false, circuitType: 'none' },
        expectedFormat: 'State your direct answer and step-by-step explanation.',
        correctAnswerReference: `Apply ${targetTopic.formulaOrKeyRule || targetTopic.name} accurately.`,
        hint1: `Recall the governing principle of ${targetTopic.name}.`,
        hint2: 'List known inputs and verify units or assumptions.',
        hint3: 'Check how altering the primary parameter changes the outcome.',
      });
    } finally {
      setIsGeneratingNext(false);
    }
  };

  const handleSubjectChange = (subjId: string) => {
    setSelectedSubjectId(subjId);
    const firstTopic = topics.find((t) => t.subjectId === subjId);
    if (firstTopic) {
      setActiveTopicId(firstTopic.id);
      fetchQuestionForTopic(firstTopic);
    }
  };

  const handleTopicChange = (topicId: string) => {
    setActiveTopicId(topicId);
    const found = topics.find((t) => t.id === topicId);
    if (found) {
      fetchQuestionForTopic(found);
    }
  };

  const handleRequestHint = async (level: number) => {
    if (level <= hintsUnlocked) return;
    setLoadingHint(true);
    setHintsUnlocked(level);
    try {
      const res = await fetch('/api/tutor/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionPrompt: currentQuestion.prompt,
          subjectName: activeTopic?.subjectName || 'Academic Studies',
          language: universalProfile.preferredLanguage || 'English',
          hintLevel: level,
          studentAttemptSoFar: `${finalAnswer} ${reasoning}`.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveHintText(data.hint);
      } else {
        setActiveHintText(
          level === 1
            ? currentQuestion.hint1
            : level === 2
            ? currentQuestion.hint2
            : currentQuestion.hint3
        );
      }
    } catch {
      setActiveHintText(
        level === 1
          ? currentQuestion.hint1
          : level === 2
          ? currentQuestion.hint2
          : currentQuestion.hint3
      );
    } finally {
      setLoadingHint(false);
    }
  };

  const handleEvaluate = async () => {
    if (!finalAnswer.trim() && !reasoning.trim()) return;
    setIsEvaluating(true);
    setEvalError(null);
    setActiveStepRecord(null);

    try {
      const outcome = await executeAgentLearningCycle({
        question: currentQuestion,
        studentAnswer: finalAnswer,
        studentReasoning: reasoning,
        subjectName: activeTopic?.subjectName,
        chapterName: activeTopic?.chapterName,
        topicId: activeTopic?.id,
        onStepUpdate: (step) => setActiveStepRecord(step),
      });

      setEvaluationResult(outcome.evaluation);
      setNextTargetedQuestion(outcome.nextQuestion);

      if (outcome.evaluation.simpleExplanation) {
        speakText(outcome.evaluation.simpleExplanation);
      }
    } catch (err: any) {
      setEvalError(err?.message || 'Evaluation failed.');
    } finally {
      setIsEvaluating(false);
      setActiveStepRecord(null);
    }
  };

  const handleLoadNextQuestion = () => {
    if (nextTargetedQuestion) {
      setCurrentQuestion(nextTargetedQuestion);
      setEvaluationResult(null);
      setNextTargetedQuestion(null);
      setFinalAnswer('');
      setReasoning('');
      setHintsUnlocked(0);
      setActiveHintText(null);
    } else {
      fetchQuestionForTopic(activeTopic);
    }
  };

  const classificationMeta = (cls?: EvaluationResult['errorClassification'], isCorrect?: boolean) => {
    const resolved = cls || (isCorrect ? 'accurate' : 'incomplete_answer');
    switch (resolved) {
      case 'accurate':
        return {
          label: 'Accurate Answer & Sound Reasoning',
          cls: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'calculation_error':
        return {
          label: 'Calculation / Syntax Slip (Concept Understood)',
          cls: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'incomplete_answer':
        return {
          label: 'Incomplete Justification (Partial Steps)',
          cls: 'bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        };
      case 'conceptual_misconception':
        return {
          label: 'Conceptual Misconception Diagnosed',
          cls: 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Universal Subject & Topic Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Subject:
            </span>
            {subjects.map((subj) => (
              <button
                key={subj.id}
                type="button"
                onClick={() => handleSubjectChange(subj.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeSubject?.id === subj.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {subj.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="text-slate-400">Adaptive Tier:</span>
            <span className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold uppercase text-[11px]">
              {dynamicDifficulty}
            </span>
          </div>
        </div>

        {/* Topics within Selected Subject */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800 no-scrollbar">
          <span className="text-xs font-semibold text-slate-400 mr-1 shrink-0">Topic:</span>
          {subjectTopics.map((tp) => {
            const isActive = tp.id === activeTopic?.id;
            return (
              <button
                key={tp.id}
                type="button"
                onClick={() => handleTopicChange(tp.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>{tp.name}</span>
                <span className="text-[10px] font-mono opacity-80">({tp.score}%)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Workspace */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activeTopic?.subjectName || 'Academic Tutor'}</span>
              <span>·</span>
              <span>{currentQuestion.conceptName}</span>
              <span>·</span>
              <span className="text-slate-400 font-normal">{educationLevelLabel}</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {currentQuestion.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => fetchQuestionForTopic(activeTopic)}
            disabled={isGeneratingNext}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingNext ? 'animate-spin' : ''}`} />
            <span>New Problem</span>
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
            {currentQuestion.prompt}
          </p>
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <strong className="text-sky-600 dark:text-sky-400 mr-1.5">Response Guide:</strong>
            {currentQuestion.expectedFormat}
          </div>
        </div>

        {/* Interactive Circuit Visualizer when on Electrical Circuit Questions */}
        {currentQuestion.circuitSetup && currentQuestion.circuitSetup.hasCircuit && (
          <CircuitVisualizer
            type={currentQuestion.circuitSetup.circuitType}
            voltage={currentQuestion.circuitSetup.voltage}
            resistors={currentQuestion.circuitSetup.resistors}
          />
        )}

        {/* 3-Level Progressive Socratic Hint Ladder */}
        <div className="border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Progressive Socratic Hints</span>
            </div>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
              {hintsUnlocked}/3 Revealed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { level: 1, title: 'Hint 1: Guiding Principle' },
              { level: 2, title: 'Hint 2: Governing Framework' },
              { level: 3, title: 'Hint 3: Step-by-Step Setup' },
            ].map(({ level, title }) => (
              <button
                key={level}
                type="button"
                onClick={() => handleRequestHint(level)}
                disabled={loadingHint}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                  hintsUnlocked >= level
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100'
                }`}
              >
                {title}
              </button>
            ))}
          </div>

          {activeHintText && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200/80 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
              <strong className="text-indigo-600 dark:text-indigo-400 mr-1.5">
                Hint {hintsUnlocked}:
              </strong>
              {activeHintText}
            </div>
          )}
        </div>

        {/* Wispr Flow & Voice-First Input Area */}
        <VoiceInputArea
          finalAnswer={finalAnswer}
          setFinalAnswer={setFinalAnswer}
          reasoning={reasoning}
          setReasoning={setReasoning}
          onSubmit={handleEvaluate}
          isSubmitting={isEvaluating}
          subjectName={activeTopic?.subjectName || 'Physics'}
          sampleReasoningOptions={[currentQuestion.correctAnswerReference]}
        />

        {evalError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{evalError}</span>
          </div>
        )}

        {/* Differentiated Misconception & Socratic Feedback Card */}
        {evaluationResult && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
            {latestAwardedTrophy && (
              <div className="p-4 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase font-black">Achievement Unlocked</div>
                    <div className="font-extrabold text-sm">{latestAwardedTrophy.title}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismissTrophyCelebration}
                  className="px-3 py-1 rounded-lg bg-slate-950 text-white text-xs font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-xl font-mono text-white ${
                    evaluationResult.score >= 75
                      ? 'bg-emerald-600'
                      : evaluationResult.score >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-600'
                  }`}
                >
                  {evaluationResult.score}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const meta = classificationMeta(
                        evaluationResult.errorClassification,
                        evaluationResult.isCorrect
                      );
                      return (
                        <span className={`px-2.5 py-0.5 rounded border text-xs font-bold ${meta.cls}`}>
                          {meta.label}
                        </span>
                      );
                    })()}
                    <span
                      className={`text-xs font-mono font-bold ${
                        evaluationResult.masteryDelta >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {evaluationResult.masteryDelta >= 0
                        ? `+${evaluationResult.masteryDelta}%`
                        : `${evaluationResult.masteryDelta}%`}{' '}
                      Mastery ({evaluationResult.newMastery}%)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  isSpeaking
                    ? stopSpeaking()
                    : speakText(
                        `${evaluationResult.correctExplanation || evaluationResult.simpleExplanation}. ${evaluationResult.reasoningCritique}`
                      )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium self-start sm:self-auto"
              >
                {isSpeaking ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-rose-500" />
                    <span>Stop Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-sky-500" />
                    <span>Listen to Feedback</span>
                  </>
                )}
              </button>
            </div>

            {/* Answer & Reasoning Critiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Answer Critique
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {evaluationResult.answerCritique}
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Reasoning &amp; Steps Critique
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {evaluationResult.reasoningCritique}
                </p>
              </div>
            </div>

            {/* Structured Remediation Breakdown when inaccurate */}
            {!evaluationResult.isCorrect && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {evaluationResult.incorrectConcept && (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-rose-600 dark:text-rose-400 uppercase text-[11px]">
                      1. Concept / Step Flagged
                    </span>
                    <p className="text-slate-800 dark:text-slate-200">
                      {evaluationResult.incorrectConcept}
                    </p>
                  </div>
                )}
                {evaluationResult.whyIncorrect && (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-amber-600 dark:text-amber-400 uppercase text-[11px]">
                      2. Why It Went Wrong
                    </span>
                    <p className="text-slate-800 dark:text-slate-200">
                      {evaluationResult.whyIncorrect}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Genuine Conceptual Misconception Alert (ONLY when conceptual_misconception) */}
            {evaluationResult.hasMisconception &&
              evaluationResult.detectedMisconceptions.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold uppercase">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Recorded Conceptual Misconception</span>
                  </div>
                  {evaluationResult.detectedMisconceptions.map((m, idx) => (
                    <div key={idx} className="font-semibold text-rose-900 dark:text-rose-200">
                      • "{m}"
                    </div>
                  ))}
                </div>
              )}

            {/* Correct Explanation & Simple Example */}
            <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 rounded-xl text-xs sm:text-sm text-sky-950 dark:text-sky-200 space-y-2 leading-relaxed">
              <div>
                <strong className="block uppercase tracking-wider text-[11px] text-sky-800 dark:text-sky-300 mb-0.5">
                  Clear Conceptual Explanation:
                </strong>
                {evaluationResult.correctExplanation || evaluationResult.simpleExplanation}
              </div>
              {evaluationResult.simpleExample && (
                <div className="pt-2 border-t border-sky-200/60 dark:border-sky-800/60">
                  <strong className="block uppercase tracking-wider text-[11px] text-sky-800 dark:text-sky-300 mb-0.5">
                    Concrete Example:
                  </strong>
                  {evaluationResult.simpleExample}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <strong className="text-slate-800 dark:text-slate-200">Next Step:</strong>{' '}
                {evaluationResult.nextRecommendation}
              </div>

              <button
                type="button"
                onClick={handleLoadNextQuestion}
                disabled={isGeneratingNext}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 ml-auto"
              >
                <span>
                  {nextTargetedQuestion
                    ? `Practice Targeted Follow-Up: ${nextTargetedQuestion.conceptName}`
                    : 'Next Adaptive Question'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AgentActivityHistory
        logs={agentActivityLogs}
        activeStepRecord={activeStepRecord}
        isExecuting={isEvaluating}
      />
    </div>
  );
};
