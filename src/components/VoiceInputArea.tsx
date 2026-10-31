import React, { useState } from 'react';
import { Mic, MicOff, Sparkles, Volume2, Square, Trash2, Keyboard } from 'lucide-react';
import { useSpeechRecognition, polishWisprFlowText } from '../hooks/useSpeechRecognition';

interface VoiceInputAreaProps {
  finalAnswer: string;
  setFinalAnswer: (val: string) => void;
  reasoning: string;
  setReasoning: (val: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  subjectName?: string;
  answerLabel?: string;
  answerPlaceholder?: string;
  reasoningLabel?: string;
  placeholder?: string;
  submitLabel?: string;
  sampleReasoningOptions?: string[];
}

const SYMBOL_PRESETS: Record<string, string[]> = {
  Physics: ['Ω', 'V = IR', 'I = Q/t', 'ρ·l/A', '1/Rp', 'ΔE'],
  Mathematics: ['∫', '∑', '√', 'lim(x→a)', '≥', '≤', 'π', 'θ'],
  Chemistry: ['→', '⇌', 'ΔH', 'mol/L', 'pH = -log[H+]'],
  'Computer Science': ['O(n log n)', 'O(V + E)', '⇒', '∀', '∈'],
  Default: ['→', '≈', '≥', '≤', 'Δ', '∑', '√', 'Ω'],
};

export const VoiceInputArea: React.FC<VoiceInputAreaProps> = ({
  finalAnswer,
  setFinalAnswer,
  reasoning,
  setReasoning,
  onSubmit,
  isSubmitting = false,
  disabled = false,
  subjectName = 'Physics',
  answerLabel = '1. Final Answer / Conclusion / Key Expression',
  answerPlaceholder = 'e.g. 300 C  /  O(V + E)  /  Contract is enforceable  /  x = 4.5',
  reasoningLabel = '2. Spoken or Written Step-by-Step Reasoning (Wispr Flow Compatible)',
  placeholder = 'Dictate with Wispr Flow, use browser voice input, or type your step-by-step explanation here. Review and edit before submitting...',
  submitLabel = 'Submit for Socratic Evaluation →',
  sampleReasoningOptions = [],
}) => {
  const {
    isListening,
    transcript,
    clearTranscript,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    isSpeaking,
    isSupported,
    error: speechError,
  } = useSpeechRecognition();

  const [lastPolished, setLastPolished] = useState(false);

  const symbols =
    Object.entries(SYMBOL_PRESETS).find(([key]) =>
      subjectName.toLowerCase().includes(key.toLowerCase())
    )?.[1] || SYMBOL_PRESETS.Default;

  const handleMicToggle = () => {
    if (!isSupported) return;
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        const combined = reasoning ? `${reasoning.trim()} ${transcript.trim()}` : transcript.trim();
        setReasoning(polishWisprFlowText(combined));
        clearTranscript();
        setLastPolished(true);
        setTimeout(() => setLastPolished(false), 2500);
      }
    } else {
      startListening();
    }
  };

  const applyWisprFlowPolish = () => {
    if (!reasoning.trim()) return;
    const polished = polishWisprFlowText(reasoning);
    setReasoning(polished);
    setLastPolished(true);
    setTimeout(() => setLastPolished(false), 2200);
  };

  const insertSymbol = (sym: string) => {
    setReasoning(reasoning ? `${reasoning} ${sym}` : sym);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Final Answer Input */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
          {answerLabel}
        </label>
        <input
          type="text"
          value={finalAnswer}
          onChange={(e) => setFinalAnswer(e.target.value)}
          disabled={disabled || isSubmitting}
          placeholder={answerPlaceholder}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Spoken / Written Reasoning Area */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {reasoningLabel}
          </label>
          <div className="flex items-center gap-2">
            {isListening && isSupported && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Recording browser audio — review after stopping
              </span>
            )}
            {lastPolished && (
              <span className="text-xs text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Notation & punctuation formatted
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <textarea
            rows={4}
            value={isListening && transcript ? `${reasoning} ${transcript}`.trim() : reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            disabled={disabled || isSubmitting}
            placeholder={placeholder}
            className={`w-full p-3.5 rounded-lg border ${
              isListening
                ? 'border-rose-400 dark:border-rose-500 ring-2 ring-rose-200 dark:ring-rose-950/50'
                : 'border-slate-200 dark:border-slate-700'
            } bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-y min-h-[115px]`}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
            {/* Academic Symbol Bar */}
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-slate-400 mr-1 text-[11px]">Insert:</span>
              {symbols.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => insertSymbol(sym)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {sym}
                </button>
              ))}
            </div>

            {/* Listen Back & Clear */}
            <div className="flex items-center gap-1.5 ml-auto">
              {reasoning && (
                <>
                  <button
                    type="button"
                    onClick={() => (isSpeaking ? stopSpeaking() : speakText(reasoning))}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Listen back to review your explanation"
                  >
                    {isSpeaking ? (
                      <Square className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isSpeaking ? 'Stop Audio' : 'Listen Back'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReasoning('')}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Clear explanation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
          Tip: Click inside either field and press your Wispr Flow hotkey for OS-level dictation, or use browser voice capture below. Always review your text before submitting.
        </p>

        {speechError && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">{speechError}</p>
        )}
      </div>

      {/* Action Bar */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {isSupported ? (
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={disabled || isSubmitting}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs transition-all ${
                isListening
                  ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm ring-2 ring-rose-400'
                  : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white shadow-sm'
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4 text-sky-400 dark:text-sky-600" />
              )}
              <span>{isListening ? 'Stop & Review Transcript' : 'Browser Voice Input'}</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs"
              title="Browser Web Speech API is not supported here; type or use Wispr Flow desktop dictation directly in the text area."
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Direct Text & Wispr Flow Ready</span>
            </div>
          )}

          {/* Notation & Formula Polish */}
          <button
            type="button"
            onClick={applyWisprFlowPolish}
            disabled={!reasoning.trim() || disabled || isSubmitting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-xs transition-colors disabled:opacity-40"
            title="Auto-format dictated units, symbols, and math expressions"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Format Symbols</span>
          </button>

          {sampleReasoningOptions.length > 0 && (
            <div className="relative group">
              <button
                type="button"
                className="px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Sample Reasoning ▾
              </button>
              <div className="absolute left-0 bottom-full mb-1 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 hidden group-hover:block z-20">
                <p className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase">
                  Example Structured Explanations
                </p>
                {sampleReasoningOptions.filter(Boolean).map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReasoning(opt)}
                    className="w-full text-left text-xs p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors line-clamp-2"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={(!finalAnswer.trim() && !reasoning.trim()) || isSubmitting || disabled}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs tracking-wide shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Evaluating Submission...</span>
            </>
          ) : (
            <span>{submitLabel}</span>
          )}
        </button>
      </div>
    </div>
  );
};
