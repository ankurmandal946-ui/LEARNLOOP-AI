import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Universal Academic Text Formatter & Wispr Flow Polish Engine
 * Formats dictated technical units, mathematical notation, physics laws,
 * chemical arrows, and computer science complexity expressions cleanly.
 */
export function polishWisprFlowText(rawText: string): string {
  if (!rawText) return '';

  let polished = rawText.trim();

  // Scientific & Academic Units
  polished = polished
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:volts?|volt)\b/gi, '$1 V')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:ohms?|ohm)\b/gi, '$1 Ω')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:amperes?|ampere|amps?)\b/gi, '$1 A')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:milliamperes?|milliamps?|ma)\b/gi, '$1 mA')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:coulombs?|coulomb)\b/gi, '$1 C')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:joules?|joule)\b/gi, '$1 J')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:watts?|watt)\b/gi, '$1 W')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:newtons?|newton)\b/gi, '$1 N')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:hertz)\b/gi, '$1 Hz')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:kelvin)\b/gi, '$1 K')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:moles?|mol)\b/gi, '$1 mol')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:seconds?|secs?)\b/gi, '$1 s')
    .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:minutes?|mins?)\b/gi, '$1 min');

  // Universal Math, Chemistry, CS & Physics Dictation Phrases
  polished = polished
    .replace(/\bgreater than or equal to\b/gi, '≥')
    .replace(/\bless than or equal to\b/gi, '≤')
    .replace(/\bnot equal to\b/gi, '≠')
    .replace(/\bapproximately equal to\b/gi, '≈')
    .replace(/\bproportional to\b/gi, '∝')
    .replace(/\bsquare root of\b/gi, '√')
    .replace(/\bintegral of\b/gi, '∫')
    .replace(/\bsummation of\b/gi, '∑')
    .replace(/\bdelta\s+([a-zA-Z])\b/g, 'Δ$1')
    .replace(/\byields\b/gi, '→')
    .replace(/\bbig o of n log n\b/gi, 'O(n log n)')
    .replace(/\bbig o of n squared\b/gi, 'O(n²)')
    .replace(/\bbig o of 1\b/gi, 'O(1)')
    .replace(/\bbig o of n\b/gi, 'O(n)')
    .replace(/\bv equals i times r\b/gi, 'V = I × R')
    .replace(/\bv equals i r\b/gi, 'V = I · R')
    .replace(/\bi equals v over r\b/gi, 'I = V / R')
    .replace(/\br equals v over i\b/gi, 'R = V / I')
    .replace(/\bi equals q over t\b/gi, 'I = Q / t')
    .replace(/\bq equals i times t\b/gi, 'Q = I × t')
    .replace(/\bv equals w over q\b/gi, 'V = W / Q')
    .replace(/\bw equals v times q\b/gi, 'W = V × Q')
    .replace(/\br equals rho times l over a\b/gi, 'R = ρ · (l / A)')
    .replace(/\brho l over a\b/gi, 'ρ · (l / A)')
    .replace(/\bone over r p\b/gi, '1/Rp')
    .replace(/\br sub s\b/gi, 'Rs')
    .replace(/\br sub p\b/gi, 'Rp');

  // Proper capitalization & clean sentence ending
  polished = polished.charAt(0).toUpperCase() + polished.slice(1);
  if (!/[.!?;)}\]]$/.test(polished)) {
    polished += '.';
  }

  return polished;
}

export function useSpeechRecognition(langCode = 'en-US') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langCode;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setError(
            'Browser microphone permission was declined. You can type directly or dictate into the text box using Wispr Flow on your device.'
          );
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Browser voice input unavailable (${event.error}). Type or use OS-level Wispr Flow dictation.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore cleanup stop errors
        }
      }
    };
  }, [langCode]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        setError('Voice session already active or blocked by browser.');
      }
    } else {
      setError(
        'Native Web Speech API is not supported in this browser. Focus the text area to dictate via Wispr Flow or type your response.'
      );
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  const speakText = useCallback((textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    polishWisprFlowText,
    speakText,
    stopSpeaking,
    isSpeaking,
  };
}
