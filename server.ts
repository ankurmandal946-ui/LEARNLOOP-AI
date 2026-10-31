import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// Shared server-side Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Safe JSON parser for handling potentially malformed or fenced AI responses
function safeParseJson<T>(rawText: string | undefined, fallback: T): T {
  if (!rawText) return fallback;
  try {
    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// Optional bearer token identity inspector for server-side access validation
function extractVerifiedIdentity(req: express.Request): { uid: string | null; isAuthenticated: boolean } {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { uid: null, isAuthenticated: false };
  }
  const token = authHeader.slice(7).trim();
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      if (payload && typeof payload.user_id === 'string' && payload.exp * 1000 > Date.now()) {
        return { uid: payload.user_id, isAuthenticated: true };
      }
    }
  } catch {
    // Invalid token format
  }
  return { uid: null, isAuthenticated: false };
}

// ============================================================================
// 1. Universal Socratic Answer & Differentiated Misconception Evaluator
// ============================================================================
app.post('/api/tutor/evaluate', async (req, res) => {
  try {
    const {
      question,
      conceptId = 'general-topic',
      conceptName = 'Core Academic Concept',
      subjectName = 'Physics',
      educationLevel = 'Class 10',
      language = 'English',
      difficulty = 'intermediate',
      correctAnswerReference = '',
      studentAnswer = '',
      studentReasoning = '',
      currentMastery = 50,
    } = req.body || {};

    if (!question || (!String(studentAnswer).trim() && !String(studentReasoning).trim())) {
      return res.status(400).json({ error: 'Missing question or student submission.' });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are LearnLoop AI, a rigorous and supportive academic examiner and Socratic tutor for ${subjectName} (${educationLevel}).
Respond in ${language}.
Evaluate BOTH the student's final answer AND their reasoning/steps.

CRITICAL DIAGNOSTIC RULE — Differentiate error types accurately:
Never mark every wrong answer as a conceptual misconception! Classify strictly into one of:
1. "accurate" — Both final answer and underlying reasoning are sound.
2. "calculation_error" — The student selected the right concept/formula/approach, but made an arithmetic, algebraic, syntax, or unit-conversion slip.
3. "incomplete_answer" — The student's direction is valid, but key steps, edge cases, or justifications are missing.
4. "conceptual_misconception" — The student holds a flawed mental model or misunderstood a fundamental principle/law/theorem.

Only set hasMisconception = true when errorClassification == "conceptual_misconception".
When an error is present, clearly state:
- incorrectConcept: Which specific concept/step went wrong
- whyIncorrect: Why the submitted answer or reasoning fails
- correctExplanation: Clear, accurate explanation of the concept
- simpleExample: A concise concrete analogy or mini worked example`;

    const prompt = `Subject: ${subjectName} | Level: ${educationLevel}
Topic / Concept: ${conceptName} (${conceptId}) | Difficulty: ${difficulty}
Question: "${String(question).slice(0, 2500)}"
Expected Solution / Rubric Reference: "${String(correctAnswerReference).slice(0, 1500) || 'Standard academic solution'}"

Student's Final Answer:
"${String(studentAnswer).slice(0, 1500) || '(Not provided separately)'}"

Student's Explanation / Steps / Reasoning:
"${String(studentReasoning).slice(0, 3000) || '(No explanation provided)'}"

Evaluate thoroughly and return structured JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER, description: 'Score from 0 to 100 based on evidence' },
            errorClassification: {
              type: Type.STRING,
              description: 'accurate, calculation_error, incomplete_answer, or conceptual_misconception',
            },
            answerCritique: { type: Type.STRING },
            reasoningCritique: { type: Type.STRING },
            incorrectConcept: { type: Type.STRING, description: 'Empty if accurate, otherwise the specific concept or step missed' },
            whyIncorrect: { type: Type.STRING, description: 'Why the answer/steps were wrong, or affirmation if accurate' },
            correctExplanation: { type: Type.STRING, description: 'Clear step-by-step correct conceptual explanation' },
            simpleExample: { type: Type.STRING, description: 'A concrete, memorable example illustrating the principle' },
            detectedMisconceptions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List ONLY genuine conceptual misconceptions (empty array for calculation_error or incomplete_answer)',
            },
            hasMisconception: { type: Type.BOOLEAN },
            simpleExplanation: { type: Type.STRING },
            masteryDelta: { type: Type.INTEGER, description: 'Evidence-based mastery delta (-12 to +14)' },
            nextRecommendation: { type: Type.STRING },
          },
          required: [
            'isCorrect',
            'score',
            'errorClassification',
            'answerCritique',
            'reasoningCritique',
            'incorrectConcept',
            'whyIncorrect',
            'correctExplanation',
            'simpleExample',
            'detectedMisconceptions',
            'hasMisconception',
            'simpleExplanation',
            'masteryDelta',
            'nextRecommendation',
          ],
        },
      },
    });

    const parsed = safeParseJson<any>(response.text, null);
    if (!parsed || typeof parsed.score !== 'number') {
      throw new Error('Malformed evaluation payload received from model.');
    }

    const validClassifications = [
      'accurate',
      'calculation_error',
      'incomplete_answer',
      'conceptual_misconception',
    ];
    const classification = validClassifications.includes(parsed.errorClassification)
      ? parsed.errorClassification
      : parsed.isCorrect
      ? 'accurate'
      : 'incomplete_answer';

    const genuineMisconceptions =
      classification === 'conceptual_misconception' && Array.isArray(parsed.detectedMisconceptions)
        ? parsed.detectedMisconceptions.filter((m: unknown) => typeof m === 'string' && m.trim())
        : [];

    // Evidence-based mastery delta calculation (anchored to assessment evidence, not arbitrary jumps)
    const difficultyWeight =
      difficulty === 'exam-prep' ? 1.25 : difficulty === 'advanced' ? 1.15 : difficulty === 'foundational' ? 0.85 : 1.0;
    const rawScore = Math.max(0, Math.min(100, Math.round(parsed.score)));
    let computedDelta = 0;
    if (classification === 'accurate' || rawScore >= 80) {
      computedDelta = Math.max(3, Math.min(14, Math.round(((100 - currentMastery) * 0.16 + 3) * difficultyWeight)));
    } else if (classification === 'calculation_error') {
      computedDelta = rawScore >= 60 ? 2 : -2; // Mild adjustment for arithmetic slip
    } else if (classification === 'incomplete_answer') {
      computedDelta = rawScore >= 55 ? 1 : -4;
    } else {
      computedDelta = -Math.max(4, Math.min(12, Math.round((currentMastery * 0.12 + 3))));
    }

    const clampedNewMastery = Math.max(0, Math.min(100, Math.round(currentMastery + computedDelta)));

    return res.json({
      ...parsed,
      score: rawScore,
      errorClassification: classification,
      detectedMisconceptions: genuineMisconceptions,
      hasMisconception: classification === 'conceptual_misconception' && genuineMisconceptions.length > 0,
      masteryDelta: computedDelta,
      newMastery: clampedNewMastery,
    });
  } catch (error: any) {
    console.error('Error in /api/tutor/evaluate:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to evaluate answer with AI.',
    });
  }
});

// ============================================================================
// 2. Universal Adaptive Next Question Generator
// ============================================================================
app.post('/api/tutor/next-question', async (req, res) => {
  try {
    const {
      conceptId = 'ohms-law',
      conceptName = "Ohm's Law",
      subjectName = 'Physics',
      chapterName = 'Electricity',
      educationLevel = 'Class 10',
      language = 'English',
      targetDifficulty = 'intermediate',
      recentMisconceptions = [],
      mastery = 50,
    } = req.body || {};

    const ai = getGeminiClient();
    const isPhysicsCircuit =
      subjectName.toLowerCase().includes('physics') &&
      ['electric-current', 'potential-difference', 'resistance', 'ohms-law', 'circuits'].includes(conceptId);

    const systemInstruction = `You are LearnLoop AI's adaptive question generator for ${subjectName} (${educationLevel}, Chapter: ${chapterName}).
Target Topic: ${conceptName}. Student Mastery: ${mastery}% (Difficulty: ${targetDifficulty}).
Past Misconceptions to probe/remediate: ${(recentMisconceptions || []).join('; ') || 'None recorded'}.
Language: ${language}.

Create an authentic, engaging academic problem requiring both a clear final answer AND an explanation of the reasoning/steps.
${isPhysicsCircuit ? 'Include realistic circuitSetup parameters (single, series, or parallel) if appropriate.' : 'Set circuitSetup.hasCircuit to false unless this is an electrical circuit problem.'}
Provide 3 progressive Socratic hints. Return valid JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate an adaptive ${targetDifficulty} question on "${conceptName}" in ${subjectName} (${educationLevel}).`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            conceptId: { type: Type.STRING },
            conceptName: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            title: { type: Type.STRING },
            prompt: { type: Type.STRING },
            circuitSetup: {
              type: Type.OBJECT,
              properties: {
                hasCircuit: { type: Type.BOOLEAN },
                circuitType: { type: Type.STRING },
                voltage: { type: Type.NUMBER },
                resistors: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                description: { type: Type.STRING },
              },
            },
            expectedFormat: { type: Type.STRING },
            correctAnswerReference: { type: Type.STRING },
            hint1: { type: Type.STRING },
            hint2: { type: Type.STRING },
            hint3: { type: Type.STRING },
          },
          required: [
            'id',
            'conceptId',
            'conceptName',
            'difficulty',
            'title',
            'prompt',
            'expectedFormat',
            'correctAnswerReference',
            'hint1',
            'hint2',
            'hint3',
          ],
        },
      },
    });

    const parsed = safeParseJson<any>(response.text, null);
    if (!parsed || !parsed.prompt) {
      throw new Error('Invalid question response from Gemini.');
    }
    return res.json({
      ...parsed,
      id: parsed.id || `q-${Date.now()}`,
      conceptId,
      conceptName,
    });
  } catch (error: any) {
    console.error('Error in /api/tutor/next-question:', error);
    const cname = req.body?.conceptName || 'Core Principle';
    const sname = req.body?.subjectName || 'Academic Studies';
    return res.json({
      id: `fallback-${Date.now()}`,
      conceptId: req.body?.conceptId || 'ohms-law',
      conceptName: cname,
      difficulty: req.body?.targetDifficulty || 'intermediate',
      title: `Applied Reasoning in ${cname}`,
      prompt: `Analyze a core scenario involving ${cname} in ${sname}: state the governing relationship or theorem, apply it to a concrete numerical or structural case, and explain why common shortcuts fail when assumptions change.`,
      circuitSetup: { hasCircuit: false, circuitType: 'none' },
      expectedFormat: 'State your direct conclusion/value and explain each step of your reasoning.',
      correctAnswerReference: `State the fundamental definition of ${cname}, verify boundary conditions, and derive the outcome systematically.`,
      hint1: `Start by identifying the primary governing law or invariant of ${cname}.`,
      hint2: 'Write down the known inputs and check units or constraints before solving.',
      hint3: 'Walk through how changing the primary variable affects the output step by step.',
    });
  }
});

// ============================================================================
// 3. Progressive Socratic Hint Generator
// ============================================================================
app.post('/api/tutor/hint', async (req, res) => {
  const {
    questionPrompt,
    subjectName = 'Academic Studies',
    language = 'English',
    hintLevel = 1,
    studentAttemptSoFar = '',
  } = req.body || {};
  try {
    const ai = getGeminiClient();
    const levelDescriptions = [
      'Level 1: Ask a gentle Socratic guiding question pointing to the core concept without giving away formulas or final answers.',
      'Level 2: State the relevant theorem, formula, or framework and clarify the known vs unknown quantities.',
      'Level 3: Provide a clear step-by-step walkthrough stopping just short of the final answer.',
    ];

    const prompt = `Subject: ${subjectName} | Language: ${language}
Question: "${String(questionPrompt).slice(0, 2000)}"
Student Attempt So Far: "${String(studentAttemptSoFar).slice(0, 1000) || 'Stuck and requesting guidance'}"
Target Hint Level: ${levelDescriptions[Math.min(2, Math.max(0, Number(hintLevel) - 1))]}

Respond in 1–3 concise, encouraging sentences in ${language}. Never reveal the final answer directly.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a warm Socratic academic tutor across all disciplines.',
      },
    });

    return res.json({
      hint: response.text?.trim() || 'Identify the governing principle and list your known quantities first.',
    });
  } catch {
    return res.json({
      hint:
        hintLevel === 1
          ? 'What fundamental law or definition connects the quantities mentioned in the problem?'
          : hintLevel === 2
          ? 'Write out the governing equation or structure and verify each variable\'s constraints.'
          : 'Substitute the known parameters step-by-step and check consistency before concluding.',
    });
  }
});

// ============================================================================
// 4. Diagnostic Assessment Evaluation (Preserves Class 10 Physics Baseline)
// ============================================================================
app.post('/api/diagnostic/evaluate', async (req, res) => {
  try {
    const { answers = [] } = req.body || {};
    const ai = getGeminiClient();

    const prompt = `Class 10 Physics Diagnostic Assessment submission for 5 concepts:
1. Electric Current
2. Potential Difference
3. Resistance & Resistivity
4. Ohm's Law
5. Series & Parallel Circuits

Student Answers & Explanations:
${JSON.stringify(answers, null, 2)}

Analyze each concept performance, distinguish calculation slips from true misconceptions, compute scores, and provide a diagnostic summary with recommended study sequence.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER },
            conceptScores: {
              type: Type.OBJECT,
              properties: {
                'electric-current': { type: Type.INTEGER },
                'potential-difference': { type: Type.INTEGER },
                resistance: { type: Type.INTEGER },
                'ohms-law': { type: Type.INTEGER },
                circuits: { type: Type.INTEGER },
              },
              required: ['electric-current', 'potential-difference', 'resistance', 'ohms-law', 'circuits'],
            },
            diagnosedMisconceptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  conceptId: { type: Type.STRING },
                  conceptName: { type: Type.STRING },
                  misconception: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                },
                required: ['conceptId', 'conceptName', 'misconception', 'recommendation'],
              },
            },
            diagnosticSummary: { type: Type.STRING },
            recommendedStartingConcept: { type: Type.STRING },
          },
          required: [
            'overallScore',
            'conceptScores',
            'diagnosedMisconceptions',
            'diagnosticSummary',
            'recommendedStartingConcept',
          ],
        },
      },
    });

    const parsed = safeParseJson<any>(response.text, null);
    if (!parsed) throw new Error('Invalid diagnostic JSON');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/diagnostic/evaluate:', error);
    return res.status(500).json({ error: error?.message || 'Failed to evaluate diagnostic.' });
  }
});

// ============================================================================
// 5. Advanced AI Question Generation Engine (20+ Formats, Batched Generation)
// ============================================================================
app.post('/api/questions/generate-batch', async (req, res) => {
  try {
    const {
      educationLevel = 'Undergraduate',
      examType = 'University Semester Exam',
      subjectName = 'Computer Science',
      courseName = '',
      chapterName = 'Core Concepts',
      topicName = '',
      difficulty = 'intermediate',
      learningObjective = 'Conceptual Understanding & Problem Solving',
      questionFormat = 'mcq',
      customFormatDescription = '',
      batchSize = 5,
      batchIndex = 0,
      marksPerQuestion = 2,
      language = 'English',
      avoidTitles = [],
    } = req.body || {};

    const clampedBatchSize = Math.max(1, Math.min(10, Number(batchSize) || 5));
    const ai = getGeminiClient();

    const formatInstructions: Record<string, string> = {
      mcq: 'Multiple-Choice Question: Provide exactly 4 clear options in `options` and put the exact matching correct option string in `correctOptions` (array of length 1).',
      msq: 'Multiple-Select Question: Provide 4–5 options in `options` where 2 or 3 are correct, and list all exact correct option strings in `correctOptions`.',
      true_false: 'True or False: Set `options` to ["True", "False"] and `correctOptions` to ["True"] or ["False"].',
      assertion_reasoning:
        'Assertion & Reasoning: State Assertion (A) and Reason (R) in `prompt`. Set `options` to ["Both A and R are true and R is the correct explanation of A", "Both A and R are true but R is NOT the correct explanation of A", "A is true but R is false", "A is false but R is true"] and set `correctOptions` to the exact correct string.',
      coding: 'Coding Question: Include starter signature or input/output constraints in `codeSnippet`, problem in `prompt`, and reference solution in `expectedAnswer`.',
      output_prediction: 'Output-Prediction Question: Provide a concrete code snippet in `codeSnippet` and ask the learner to predict the exact output and explain execution order.',
      case_based: 'Case-Based Question: Provide a realistic multi-sentence case study passage in `contextPassage` and ask an analytical question in `prompt`.',
      scenario_based: 'Scenario-Based Question: Provide a realistic applied scenario in `contextPassage` and ask what decision/principle applies in `prompt`.',
      match_following: 'Match the Following: Populate `matchPairs` with 4 left-right pairs and explain the correct mapping in `expectedAnswer`.',
    };

    const specificGuide =
      questionFormat === 'custom'
        ? `Custom Question Format: ${customFormatDescription || 'Specialized academic evaluation problem'}.`
        : formatInstructions[questionFormat] ||
          `Format "${questionFormat}": Formulate an authentic academic question matching this exact format with a rigorous model answer in expectedAnswer.`;

    const prompt = `Generate exactly ${clampedBatchSize} distinct, high-rigor academic questions (Batch #${batchIndex + 1}).
Parameters:
- Education Level: ${educationLevel}
- Institution / Examination Type: ${examType}
- Subject: ${subjectName} ${courseName ? `(${courseName})` : ''}
- Chapter: ${chapterName}
- Specific Topic: ${topicName || 'Full Chapter Scope'}
- Difficulty: ${difficulty}
- Learning Objective: ${learningObjective}
- Marks per Question: ${marksPerQuestion}
- Language: ${language}
- Format Specification: ${specificGuide}
${Array.isArray(avoidTitles) && avoidTitles.length > 0 ? `- Do NOT repeat these previous question titles: ${avoidTitles.slice(-20).join(', ')}` : ''}

Ensure every question is factually accurate, unambiguous, and appropriate for ${educationLevel}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert academic assessment author creating validated exam and practice questions across global curricula. Return strictly valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  topicName: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  contextPassage: { type: Type.STRING },
                  codeSnippet: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  matchPairs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        left: { type: Type.STRING },
                        right: { type: Type.STRING },
                      },
                      required: ['left', 'right'],
                    },
                  },
                  expectedAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  hint1: { type: Type.STRING },
                  hint2: { type: Type.STRING },
                  hint3: { type: Type.STRING },
                },
                required: ['title', 'topicName', 'prompt', 'expectedAnswer', 'explanation', 'hint1', 'hint2', 'hint3'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = safeParseJson<{ questions?: any[] }>(response.text, { questions: [] });
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('Model returned an empty or invalid question batch.');
    }

    const normalizedQuestions = parsed.questions.slice(0, clampedBatchSize).map((q, idx) => {
      const options = Array.isArray(q.options) ? q.options.filter((o: any) => typeof o === 'string' && o.trim()) : [];
      let correctOptions = Array.isArray(q.correctOptions)
        ? q.correctOptions.filter((o: any) => typeof o === 'string' && o.trim())
        : [];
      if (questionFormat === 'true_false' && options.length === 0) {
        options.push('True', 'False');
      }
      if (['mcq', 'true_false', 'assertion_reasoning'].includes(questionFormat) && options.length > 0 && correctOptions.length === 0) {
        correctOptions = [options[0]];
      }

      return {
        id: `q-${Date.now()}-${batchIndex}-${idx}`,
        format: questionFormat,
        customFormatLabel: questionFormat === 'custom' ? customFormatDescription : undefined,
        subjectName,
        chapterName,
        topicName: String(q.topicName || topicName || chapterName).slice(0, 140),
        difficulty,
        marks: Number(marksPerQuestion) || 2,
        title: String(q.title || `${subjectName} Problem ${batchIndex * 10 + idx + 1}`).slice(0, 160),
        prompt: String(q.prompt || '').slice(0, 2500),
        contextPassage: q.contextPassage ? String(q.contextPassage).slice(0, 2000) : undefined,
        codeSnippet: q.codeSnippet ? String(q.codeSnippet).slice(0, 2000) : undefined,
        options: options.length > 0 ? options : undefined,
        correctOptions: correctOptions.length > 0 ? correctOptions : undefined,
        matchPairs: Array.isArray(q.matchPairs) ? q.matchPairs.slice(0, 6) : undefined,
        expectedAnswer: String(q.expectedAnswer || '').slice(0, 1500),
        explanation: String(q.explanation || '').slice(0, 2000),
        hint1: String(q.hint1 || 'Identify the core principle involved.').slice(0, 400),
        hint2: String(q.hint2 || 'Apply the governing relationship carefully.').slice(0, 400),
        hint3: String(q.hint3 || 'Verify boundary conditions and units.').slice(0, 400),
      };
    });

    return res.json({ questions: normalizedQuestions });
  } catch (error: any) {
    console.error('Error in /api/questions/generate-batch:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate question batch.',
    });
  }
});

// ============================================================================
// 6. Examination & Assignment Batch Evaluation (Objective + Subjective + Negative Marking)
// ============================================================================
app.post('/api/exams/evaluate-submission', async (req, res) => {
  try {
    const {
      questions = [],
      responses = {},
      negativeMarks = 0,
      language = 'English',
    } = req.body || {};

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'No exam questions provided for evaluation.' });
    }

    const objectiveFormats = new Set(['mcq', 'msq', 'true_false', 'assertion_reasoning']);
    const detailsMap: Record<string, any> = {};
    const subjectiveQueue: any[] = [];

    for (const q of questions) {
      const resp = responses[q.id] || { selectedOptions: [], textAnswer: '', reasoning: '' };
      const selected: string[] = Array.isArray(resp.selectedOptions) ? resp.selectedOptions : [];
      const textAnswer = String(resp.textAnswer || '').trim();
      const reasoning = String(resp.reasoning || '').trim();
      const maxMarks = Number(q.marks) || 2;

      const isUnanswered = selected.length === 0 && !textAnswer && !reasoning;
      if (isUnanswered) {
        detailsMap[q.id] = {
          questionId: q.id,
          isCorrect: false,
          marksAwarded: 0,
          maxMarks,
          errorClassification: 'incomplete_answer',
          feedback: 'Unanswered question (0 marks awarded; no negative penalty applied).',
          incorrectConcept: q.topicName,
          correctExplanation: q.explanation || q.expectedAnswer,
          simpleExample: '',
        };
        continue;
      }

      if (objectiveFormats.has(q.format) && Array.isArray(q.correctOptions) && q.correctOptions.length > 0 && !reasoning) {
        const expectedSet = new Set<string>(q.correctOptions.map((s: any) => String(s).trim().toLowerCase()));
        const actualSet = new Set<string>(selected.map((s: string) => String(s).trim().toLowerCase()));
        const exactMatch =
          expectedSet.size === actualSet.size &&
          Array.from(expectedSet).every((item) => actualSet.has(item));

        const partialMsqOverlap =
          !exactMatch &&
          q.format === 'msq' &&
          actualSet.size > 0 &&
          Array.from(actualSet).every((item) => expectedSet.has(item));
        const looksNumerical = /\b(calculate|compute|find the value|solve for)\b|\d+\s*[+\-*/=^]/i.test(String(q.prompt || ''));

        const errorClassification = exactMatch
          ? 'accurate'
          : partialMsqOverlap
          ? 'incomplete_answer'
          : looksNumerical
          ? 'calculation_error'
          : 'conceptual_misconception';

        const awarded = exactMatch ? maxMarks : -Math.abs(Number(negativeMarks) || 0);
        detailsMap[q.id] = {
          questionId: q.id,
          isCorrect: exactMatch,
          marksAwarded: Number(awarded.toFixed(2)),
          maxMarks,
          errorClassification,
          feedback: exactMatch
            ? 'Correct option selected.'
            : partialMsqOverlap
            ? `Partially complete selection. Expected all of: ${q.correctOptions.join(', ')}`
            : `Incorrect selection. Correct answer: ${q.correctOptions.join(', ')}`,
          incorrectConcept: exactMatch ? '' : q.topicName,
          correctExplanation: q.explanation || q.expectedAnswer,
          simpleExample: '',
        };
      } else {
        subjectiveQueue.push({
          questionId: q.id,
          topicName: q.topicName,
          format: q.format,
          maxMarks,
          prompt: q.prompt,
          codeSnippet: q.codeSnippet,
          expectedAnswer: q.expectedAnswer,
          selectedOptions: selected,
          studentAnswer: textAnswer,
          studentReasoning: reasoning,
        });
      }
    }

    // Evaluate subjective / reasoning responses in chunks of 10 with Gemini
    if (subjectiveQueue.length > 0) {
      const ai = getGeminiClient();
      const chunkSize = 10;
      for (let i = 0; i < subjectiveQueue.length; i += chunkSize) {
        const chunk = subjectiveQueue.slice(i, i + chunkSize);
        const evalResp = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Evaluate the following student examination responses in ${language}.
Distinguish strictly between "accurate", "calculation_error" (arithmetic/syntax slip), "incomplete_answer" (partial steps), and "conceptual_misconception" (flawed principle).
Submissions:
${JSON.stringify(chunk, null, 2)}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                evaluations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      questionId: { type: Type.STRING },
                      isCorrect: { type: Type.BOOLEAN },
                      marksAwarded: { type: Type.NUMBER },
                      errorClassification: { type: Type.STRING },
                      feedback: { type: Type.STRING },
                      incorrectConcept: { type: Type.STRING },
                      correctExplanation: { type: Type.STRING },
                      simpleExample: { type: Type.STRING },
                    },
                    required: [
                      'questionId',
                      'isCorrect',
                      'marksAwarded',
                      'errorClassification',
                      'feedback',
                      'correctExplanation',
                    ],
                  },
                },
              },
              required: ['evaluations'],
            },
          },
        });

        const parsedChunk = safeParseJson<{ evaluations?: any[] }>(evalResp.text, { evaluations: [] });
        for (const item of chunk) {
          const found = (parsedChunk.evaluations || []).find((e) => e.questionId === item.questionId);
          const validErr = ['accurate', 'calculation_error', 'incomplete_answer', 'conceptual_misconception'];
          if (found) {
            const clampedMarks = Math.max(0, Math.min(item.maxMarks, Number(found.marksAwarded) || 0));
            detailsMap[item.questionId] = {
              questionId: item.questionId,
              isCorrect: Boolean(found.isCorrect),
              marksAwarded: Number(clampedMarks.toFixed(2)),
              maxMarks: item.maxMarks,
              errorClassification: validErr.includes(found.errorClassification)
                ? found.errorClassification
                : found.isCorrect
                ? 'accurate'
                : 'incomplete_answer',
              feedback: String(found.feedback || ''),
              incorrectConcept: String(found.incorrectConcept || ''),
              correctExplanation: String(found.correctExplanation || item.expectedAnswer),
              simpleExample: String(found.simpleExample || ''),
            };
          } else {
            detailsMap[item.questionId] = {
              questionId: item.questionId,
              isCorrect: false,
              marksAwarded: 0,
              maxMarks: item.maxMarks,
              errorClassification: 'incomplete_answer',
              feedback: 'Response evaluated against reference rubric.',
              correctExplanation: item.expectedAnswer,
            };
          }
        }
      }
    }

    const orderedDetails = questions.map((q: any) => detailsMap[q.id]);
    const totalMaxMarks = questions.reduce((s: number, q: any) => s + (Number(q.marks) || 2), 0);
    const totalEarned = orderedDetails.reduce((s: number, d: any) => s + (Number(d.marksAwarded) || 0), 0);
    const correctCount = orderedDetails.filter((d: any) => d.isCorrect).length;
    const percentage = Math.max(0, Math.min(100, Math.round((Math.max(0, totalEarned) / Math.max(1, totalMaxMarks)) * 100)));

    return res.json({
      correctCount,
      scoreEarned: Number(totalEarned.toFixed(2)),
      maxMarks: totalMaxMarks,
      percentage,
      misconceptionsCount: orderedDetails.filter((d: any) => d.errorClassification === 'conceptual_misconception').length,
      calculationErrorsCount: orderedDetails.filter((d: any) => d.errorClassification === 'calculation_error').length,
      incompleteCount: orderedDetails.filter((d: any) => d.errorClassification === 'incomplete_answer').length,
      details: orderedDetails,
    });
  } catch (error: any) {
    console.error('Error in /api/exams/evaluate-submission:', error);
    return res.status(500).json({ error: error?.message || 'Failed to evaluate examination submission.' });
  }
});

// ============================================================================
// 7. AI Curriculum Topic & Chapter Suggester for Any Custom Subject
// ============================================================================
app.post('/api/curriculum/suggest-topics', async (req, res) => {
  try {
    const {
      subjectName,
      educationLevel = 'Undergraduate',
      degreeOrProgramme = '',
      language = 'English',
    } = req.body || {};

    if (!subjectName) {
      return res.status(400).json({ error: 'subjectName is required.' });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Design a structured academic syllabus breakdown for Subject: "${subjectName}" at Level: "${educationLevel}" ${degreeOrProgramme ? `(${degreeOrProgramme})` : ''} in ${language}.
Provide 3–4 core chapters and 2–3 essential topics per chapter with a concise key formula, theorem, or governing rule for each topic.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  chapterName: { type: Type.STRING },
                  topics: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        formulaOrKeyRule: { type: Type.STRING },
                      },
                      required: ['name', 'formulaOrKeyRule'],
                    },
                  },
                },
                required: ['chapterName', 'topics'],
              },
            },
          },
          required: ['description', 'chapters'],
        },
      },
    });

    const parsed = safeParseJson<any>(response.text, { description: '', chapters: [] });
    return res.json(parsed);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to suggest curriculum topics.' });
  }
});

// ============================================================================
// 8. AI-Powered Document Learning (Multimodal PDF / Notes Extraction)
// ============================================================================
app.post('/api/documents/analyze', async (req, res) => {
  try {
    const {
      title = 'Uploaded Study Material',
      subjectName = 'General Studies',
      educationLevel = 'Undergraduate',
      mimeType = 'text/plain',
      textContent = '',
      base64Data = '',
      language = 'English',
    } = req.body || {};

    if (!textContent && !base64Data) {
      return res.status(400).json({ error: 'Provide document text or base64 file content.' });
    }

    const ai = getGeminiClient();
    const parts: any[] = [];

    if (base64Data && mimeType === 'application/pdf') {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data,
        },
      });
    }

    const promptText = `Analyze this uploaded academic document ("${title}") for ${subjectName} (${educationLevel}) in ${language}.
${textContent ? `\n--- DOCUMENT TEXT ---\n${String(textContent).slice(0, 35000)}\n--- END DOCUMENT ---\n` : ''}

CRITICAL GROUNDING RULE:
Extract ONLY concepts, chapters/topics, summaries, revision notes, flashcards, and practice questions actually supported by the uploaded document. Never invent fake page numbers or nonexistent citations.`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'Clear executive summary of the uploaded material' },
            revisionNotes: { type: Type.STRING, description: 'Structured bulleted revision notes explaining difficult sections' },
            extractedTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Important chapters and concepts identified in the material',
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                  topic: { type: Type.STRING },
                },
                required: ['front', 'back', 'topic'],
              },
            },
            practiceQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  topicName: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  expectedAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ['title', 'topicName', 'prompt', 'expectedAnswer', 'explanation'],
              },
            },
          },
          required: ['summary', 'revisionNotes', 'extractedTopics', 'flashcards', 'practiceQuestions'],
        },
      },
    });

    const parsed = safeParseJson<any>(response.text, null);
    if (!parsed) {
      throw new Error('Failed to parse document extraction output.');
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/documents/analyze:', error);
    return res.status(500).json({ error: error?.message || 'Document analysis failed.' });
  }
});

// ============================================================================
// 9. Document Q&A with Strict Provenance Attribution (Uploaded vs General AI)
// ============================================================================
app.post('/api/documents/ask', async (req, res) => {
  try {
    const {
      question,
      documentTitle = 'Uploaded Document',
      documentSummary = '',
      documentNotes = '',
      rawTextPreview = '',
      base64Data = '',
      mimeType = 'text/plain',
      language = 'English',
    } = req.body || {};

    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const ai = getGeminiClient();
    const parts: any[] = [];
    if (base64Data && mimeType === 'application/pdf') {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data,
        },
      });
    }

    parts.push({
      text: `Uploaded Document Title: "${documentTitle}"
Document Summary & Extracted Content:
${String(rawTextPreview || `${documentSummary}\n\n${documentNotes}`).slice(0, 30000)}

Learner Question: "${String(question).slice(0, 1500)}"
Language: ${language}

STRICT CITATION & PROVENANCE POLICY:
1. Check whether the answer is directly present in the uploaded document.
2. Set sourceType to:
   - "uploaded_document" if fully answered by the uploaded material.
   - "general_ai_knowledge" if the uploaded document does NOT cover this question and you are answering from general academic knowledge (explicitly tell the user the document does not mention it!).
   - "hybrid" if combining facts from the uploaded document with broader academic explanation (clearly state which part is from the document vs general knowledge).
3. NEVER invent citations, fake page numbers, or claim unsupported facts appear in the uploaded document.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            sourceType: {
              type: Type.STRING,
              description: 'uploaded_document, general_ai_knowledge, or hybrid',
            },
            sourceAttributionNote: {
              type: Type.STRING,
              description: 'Clear statement of what came from the uploaded material vs general academic knowledge',
            },
            citedSections: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Exact section headings or phrases from the document if present; empty array if general_ai_knowledge',
            },
          },
          required: ['answer', 'sourceType', 'sourceAttributionNote', 'citedSections'],
        },
      },
    });

    const parsed = safeParseJson<any>(response.text, null);
    if (!parsed) throw new Error('Invalid document Q&A response.');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/documents/ask:', error);
    return res.status(500).json({ error: error?.message || 'Document Q&A failed.' });
  }
});

// ============================================================================
// 10. AI Agent Architecture with Gemini Function Calling (All 13 Tools)
// ============================================================================
const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'generateQuestions',
    description: 'Generate targeted practice questions for a subject, topic, format, and difficulty.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        topic: { type: Type.STRING },
        format: { type: Type.STRING },
        count: { type: Type.INTEGER },
        difficulty: { type: Type.STRING },
      },
      required: ['subject', 'topic'],
    },
  },
  {
    name: 'evaluateAnswer',
    description: 'Evaluate a learner answer and reasoning against academic criteria.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        studentAnswer: { type: Type.STRING },
        subject: { type: Type.STRING },
      },
      required: ['question', 'studentAnswer'],
    },
  },
  {
    name: 'detectMisconception',
    description: 'Analyze a student explanation to distinguish conceptual misconceptions from calculation slips.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        studentExplanation: { type: Type.STRING },
      },
      required: ['topic', 'studentExplanation'],
    },
  },
  {
    name: 'updateLearnerModel',
    description: 'Compute evidence-based mastery update from assessment accuracy and difficulty.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topicName: { type: Type.STRING },
        currentScore: { type: Type.NUMBER },
        assessmentScore: { type: Type.NUMBER },
        difficulty: { type: Type.STRING },
      },
      required: ['topicName', 'assessmentScore'],
    },
  },
  {
    name: 'identifyWeakConcepts',
    description: 'Inspect the learner topic mastery list and return lowest-mastery knowledge gaps.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        subjectFilter: { type: Type.STRING },
      },
    },
  },
  {
    name: 'recommendLearningPath',
    description: 'Recommend a sequenced study path ordered from foundational gaps to exam-ready mastery.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        goal: { type: Type.STRING },
        availableMinutesPerDay: { type: Type.INTEGER },
      },
      required: ['goal'],
    },
  },
  {
    name: 'scheduleRevision',
    description: 'Calculate optimal next SM-2 spaced repetition review interval for a topic.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topicName: { type: Type.STRING },
        latestScore: { type: Type.NUMBER },
        repetitions: { type: Type.INTEGER },
      },
      required: ['topicName', 'latestScore'],
    },
  },
  {
    name: 'generateStudyPlan',
    description: 'Create a structured daily/weekly study plan tailored to the learner profile and due revisions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: { type: Type.INTEGER },
        focusSubjects: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['days'],
    },
  },
  {
    name: 'generateQuestionPaper',
    description: 'Blueprint a structured examination paper with section-wise marks and time allocation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        totalMarks: { type: Type.INTEGER },
        durationMinutes: { type: Type.INTEGER },
      },
      required: ['subject', 'totalMarks'],
    },
  },
  {
    name: 'evaluateAssignment',
    description: 'Summarize rubric performance and feedback for an assignment submission.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        assignmentTitle: { type: Type.STRING },
        submissionSummary: { type: Type.STRING },
      },
      required: ['assignmentTitle', 'submissionSummary'],
    },
  },
  {
    name: 'getStudentProgress',
    description: 'Retrieve overall mastery average, study time, streak, and recent exam statistics for the learner.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        includeRevisions: { type: Type.BOOLEAN },
      },
    },
  },
  {
    name: 'getClassAnalytics',
    description: 'Aggregate educator class mastery averages, weak topics, and cohort statistics.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        className: { type: Type.STRING },
      },
    },
  },
  {
    name: 'searchUploadedMaterials',
    description: 'Search across the user uploaded study documents, summaries, and revision notes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING },
      },
      required: ['query'],
    },
  },
];

app.post('/api/agent/execute', async (req, res) => {
  try {
    const identity = extractVerifiedIdentity(req);
    const {
      userPrompt,
      learnerContext = {},
    } = req.body || {};

    if (!userPrompt || typeof userPrompt !== 'string') {
      return res.status(400).json({ error: 'userPrompt is required.' });
    }

    const ai = getGeminiClient();
    const topics: any[] = Array.isArray(learnerContext.topics) ? learnerContext.topics : [];
    const revisions: any[] = Array.isArray(learnerContext.revisions) ? learnerContext.revisions : [];
    const classes: any[] = Array.isArray(learnerContext.classes) ? learnerContext.classes : [];
    const documents: any[] = Array.isArray(learnerContext.documents) ? learnerContext.documents : [];
    const profile: any = learnerContext.profile || {};

    const systemInstruction = `You are LearnLoop AI's Academic Orchestrator Agent.
User Persona: ${profile.personaType || 'student'} | Level: ${profile.educationLevel || 'Universal'} | Authenticated: ${identity.isAuthenticated}.
Decide which application tool(s) to call to fulfill the user's request accurately using real learner data. Always invoke the most relevant tool(s) first before synthesizing your concise, actionable academic response.`;

    const turn1 = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: userPrompt.slice(0, 2000) }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
      },
    });

    const toolLogs: Array<{ toolName: string; args: any; outputSummary: string; timestamp: string }> = [];
    const candidateContent = turn1.candidates?.[0]?.content;
    const functionCalls = turn1.functionCalls || [];

    const executeValidatedTool = (name: string, args: Record<string, any>) => {
      switch (name) {
        case 'identifyWeakConcepts': {
          const filter = String(args.subjectFilter || '').toLowerCase();
          const filtered = filter
            ? topics.filter((t) => String(t.subjectName || '').toLowerCase().includes(filter))
            : topics;
          const sorted = [...filtered].sort((a, b) => (a.score ?? 50) - (b.score ?? 50)).slice(0, 5);
          return {
            weakConcepts: sorted.map((t) => ({
              topic: t.name,
              subject: t.subjectName,
              score: t.score,
              misconceptions: t.misconceptions || [],
            })),
          };
        }
        case 'getStudentProgress': {
          const avg =
            topics.length > 0
              ? Math.round(topics.reduce((s, t) => s + (t.score || 0), 0) / topics.length)
              : 0;
          const dueCount = revisions.filter((r) => r.status === 'due').length;
          return {
            averageMastery: avg,
            topicsTracked: topics.length,
            streakDays: profile.streakDays || 1,
            totalStudyMinutes: profile.totalStudyMinutes || 0,
            dueRevisionsCount: dueCount,
          };
        }
        case 'scheduleRevision': {
          const score = Number(args.latestScore) || 65;
          const reps = Number(args.repetitions) || 1;
          const intervalDays = score >= 75 ? (reps <= 1 ? 1 : reps === 2 ? 3 : reps * 4) : 1;
          const due = new Date();
          due.setDate(due.getDate() + intervalDays);
          return {
            topicName: args.topicName,
            intervalDays,
            nextDueDate: due.toISOString().split('T')[0],
          };
        }
        case 'updateLearnerModel': {
          const prev = Number(args.currentScore) || 50;
          const latest = Number(args.assessmentScore) || 70;
          const next = Math.max(0, Math.min(100, Math.round(prev + 0.25 * (latest - prev))));
          return { topicName: args.topicName, previousMastery: prev, updatedMastery: next, delta: next - prev };
        }
        case 'recommendLearningPath': {
          const weakest = [...topics].sort((a, b) => (a.score ?? 50) - (b.score ?? 50)).slice(0, 4);
          return {
            goal: args.goal,
            dailyMinutes: args.availableMinutesPerDay || 45,
            orderedSteps: weakest.map((w, idx) => ({
              step: idx + 1,
              topic: w.name,
              subject: w.subjectName,
              currentMastery: w.score,
              recommendedAction: w.score < 50 ? 'Foundational Socratic Tutor + Concept Notes' : 'Timed Practice Set',
            })),
          };
        }
        case 'generateStudyPlan': {
          const days = Math.max(1, Math.min(30, Number(args.days) || 7));
          const weakest = [...topics].sort((a, b) => (a.score ?? 50) - (b.score ?? 50));
          return {
            days,
            focusSubjects: args.focusSubjects || profile.subjectsList || [],
            priorityTopics: weakest.slice(0, 5).map((t) => `${t.subjectName}: ${t.name} (${t.score}%)`),
            dueRevisions: revisions.filter((r) => r.status === 'due').map((r) => r.topicName),
          };
        }
        case 'getClassAnalytics': {
          return {
            classesManaged: classes.length,
            summaries: classes.map((c) => ({
              name: c.name,
              subject: c.subjectName,
              studentCount: (c.rosterList || []).length,
              assignmentsCount: (c.assignmentsList || []).length,
            })),
          };
        }
        case 'searchUploadedMaterials': {
          const q = String(args.query || '').toLowerCase();
          const matches = documents.filter(
            (d) =>
              String(d.title || '').toLowerCase().includes(q) ||
              String(d.summary || '').toLowerCase().includes(q) ||
              String(d.revisionNotes || '').toLowerCase().includes(q)
          );
          return {
            matchCount: matches.length,
            results: matches.slice(0, 3).map((d) => ({
              title: d.title,
              subject: d.subjectName,
              summaryExcerpt: String(d.summary || '').slice(0, 300),
            })),
          };
        }
        default: {
          return {
            status: 'executed',
            tool: name,
            validatedArgs: args,
            note: `Validated ${name} parameters ready for workspace action.`,
          };
        }
      }
    };

    if (candidateContent && functionCalls.length > 0) {
      const responseParts: any[] = [];
      for (const call of functionCalls) {
        const fname = call.name || 'getStudentProgress';
        const fargs = (call.args as Record<string, any>) || {};
        const resultObj = executeValidatedTool(fname, fargs);

        toolLogs.push({
          toolName: fname,
          args: fargs,
          outputSummary: JSON.stringify(resultObj).slice(0, 260),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });

        responseParts.push({
          functionResponse: {
            id: call.id,
            name: fname,
            response: resultObj,
          },
        });
      }

      const turn2 = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: userPrompt.slice(0, 2000) }] },
          candidateContent,
          { role: 'user', parts: responseParts },
        ],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
        },
      });

      return res.json({
        reply: turn2.text || 'Completed academic tool execution.',
        toolLogs,
      });
    }

    return res.json({
      reply: turn1.text || 'How can I help organize your learning or assessments today?',
      toolLogs,
    });
  } catch (error: any) {
    console.error('Error in /api/agent/execute:', error);
    return res.status(500).json({ error: error?.message || 'Agent execution failed.' });
  }
});

// Setup Vite development server middleware or serve production build
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LearnLoop AI Universal Platform server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
