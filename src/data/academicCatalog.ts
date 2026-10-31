import { EducationCategory, PersonaType, QuestionFormatId } from '../types/platform';

export const ACCOUNT_ROLES: Array<{
  id: PersonaType;
  label: string;
  subtitle: string;
  isEducator: boolean;
}> = [
  {
    id: 'student',
    label: 'Student / Learner',
    subtitle: 'School, college, university, or degree programme learner',
    isEducator: false,
  },
  {
    id: 'independent_learner',
    label: 'Independent Learner',
    subtitle: 'Self-paced study, competitive exams, certifications, or upskilling',
    isEducator: false,
  },
  {
    id: 'teacher',
    label: 'Teacher / Educator',
    subtitle: 'School or academy educator managing classes, quizzes, and cohorts',
    isEducator: true,
  },
  {
    id: 'professor',
    label: 'Professor / Faculty',
    subtitle: 'University or college faculty teaching undergraduate or graduate courses',
    isEducator: true,
  },
  {
    id: 'tutor',
    label: 'Tutor / Mentor',
    subtitle: 'Private mentor, coaching instructor, or exam specialist',
    isEducator: true,
  },
  {
    id: 'institution_admin',
    label: 'Institution Administrator',
    subtitle: 'Manage departments, batches, faculty, and institutional assessments',
    isEducator: true,
  },
];

export const EDUCATION_LEVELS_BY_CATEGORY: Record<EducationCategory, string[]> = {
  School: [
    'Primary Education (Classes 1–5)',
    'Middle School (Classes 6–8)',
    'Secondary Education (Classes 9–10)',
    'Higher Secondary Education (Classes 11–12)',
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
    'Class 6',
    'Class 7',
    'Class 8',
    'Class 9',
    'Class 10',
    'Class 11',
    'Class 12',
  ],
  'Higher Education': [
    'Diploma',
    'Polytechnic',
    'Undergraduate (B.Tech / B.E. / B.Sc / B.A. / B.Com / BBA)',
    'Postgraduate (M.Tech / M.Sc / M.A. / M.Com / MBA / MCA)',
    'Integrated Programme (Dual Degree / 5-Year Integrated)',
    'Doctoral / PhD Research',
    'Professional Degree (MBBS / MD / LLB / CA / CFA / Architecture)',
  ],
  'Competitive & Professional': [
    'Competitive Examinations (JEE / NEET / GATE / CAT / SAT / GRE / GMAT)',
    'Government & Civil Services Examinations (UPSC / SSC / State PCS / Banking)',
    'University & College Entrance Examinations (CUET / CLAT / NDA)',
    'Certification Programmes (Cloud / Cybersecurity / Data / Finance)',
    'Skill Development & Coding Bootcamps',
    'Self-Learning & Open Courseware',
    'Professional Upskilling & Executive Education',
  ],
  Custom: ['Custom Academic Level / Programme'],
};

export const INSTITUTION_TYPES = [
  'Independent / No Institution',
  'School (Public / Private / International)',
  'College',
  'University / Technical Institute',
  'Coaching & Test-Prep Centre',
  'Research Academy',
  'Corporate / Professional Training',
  'Other',
];

export const SUPPORTED_LANGUAGES = [
  'English',
  'Hindi',
  'Spanish',
  'French',
  'German',
  'Mandarin Chinese',
  'Arabic',
  'Bengali',
  'Portuguese',
  'Japanese',
  'Tamil',
  'Telugu',
  'Marathi',
  'Korean',
];

export interface SubjectCatalogEntry {
  name: string;
  category: string;
  defaultCode: string;
  description: string;
  starterChapters: Array<{
    chapter: string;
    topics: Array<{ name: string; keyRule: string }>;
  }>;
}

export const UNIVERSAL_SUBJECT_LIBRARY: SubjectCatalogEntry[] = [
  {
    name: 'Mathematics',
    category: 'STEM & Quantitative',
    defaultCode: 'MATH-101',
    description: 'Algebra, Calculus, Geometry, Linear Algebra, Probability, and Number Theory.',
    starterChapters: [
      {
        chapter: 'Calculus & Differentiation',
        topics: [
          { name: 'Limits & Continuity', keyRule: 'lim(x→a) f(x) = f(a)' },
          { name: 'Chain Rule & Derivatives', keyRule: 'd/dx [f(g(x))] = f\'(g(x)) · g\'(x)' },
        ],
      },
      {
        chapter: 'Linear Algebra & Matrices',
        topics: [
          { name: 'Eigenvalues & Eigenvectors', keyRule: 'A·v = λ·v, det(A - λI) = 0' },
        ],
      },
    ],
  },
  {
    name: 'Physics',
    category: 'Natural Sciences',
    defaultCode: 'PHYS-101',
    description: 'Mechanics, Electricity & Magnetism, Thermodynamics, Optics, and Modern Physics.',
    starterChapters: [
      {
        chapter: 'Electricity & Circuits',
        topics: [
          { name: 'Electric Current', keyRule: 'I = Q / t' },
          { name: 'Potential Difference', keyRule: 'V = W / Q' },
          { name: 'Resistance & Resistivity', keyRule: 'R = ρ · (l / A)' },
          { name: "Ohm's Law", keyRule: 'V = I · R' },
          { name: 'Series & Parallel Circuits', keyRule: 'Rs = R1+R2 | 1/Rp = 1/R1+1/R2' },
        ],
      },
    ],
  },
  {
    name: 'Chemistry',
    category: 'Natural Sciences',
    defaultCode: 'CHEM-101',
    description: 'Physical, Organic, Inorganic, Analytical Chemistry, and Chemical Kinetics.',
    starterChapters: [
      {
        chapter: 'Chemical Bonding & Equilibrium',
        topics: [
          { name: 'Stoichiometry & Mole Concept', keyRule: 'n = m / M = N / N_A' },
          { name: 'Le Chatelier Principle & pH', keyRule: 'pH = -log10[H+]' },
        ],
      },
    ],
  },
  {
    name: 'Biology',
    category: 'Life & Medical Sciences',
    defaultCode: 'BIO-101',
    description: 'Cell Biology, Genetics, Physiology, Ecology, Molecular Biology, and Evolution.',
    starterChapters: [
      {
        chapter: 'Genetics & Cellular Energetics',
        topics: [
          { name: 'DNA Replication & Transcription', keyRule: 'DNA → mRNA → Protein' },
          { name: 'Cellular Respiration & ATP', keyRule: 'C6H12O6 + 6O2 → 6CO2 + 6H2O + ATP' },
        ],
      },
    ],
  },
  {
    name: 'Computer Science',
    category: 'Computing & Engineering',
    defaultCode: 'CS-201',
    description: 'Data Structures, Algorithms, Operating Systems, Databases, and Computer Networks.',
    starterChapters: [
      {
        chapter: 'Data Structures & Algorithms',
        topics: [
          { name: 'Graph Traversal (BFS & DFS)', keyRule: 'Time Complexity: O(V + E)' },
          { name: 'Dynamic Programming & Memoization', keyRule: 'Optimal Substructure + Overlapping Subproblems' },
        ],
      },
      {
        chapter: 'Database Systems',
        topics: [
          { name: 'Normalization & ACID Transactions', keyRule: 'Atomicity, Consistency, Isolation, Durability' },
        ],
      },
    ],
  },
  {
    name: 'Artificial Intelligence and Machine Learning',
    category: 'Computing & Engineering',
    defaultCode: 'AIML-301',
    description: 'Supervised/Unsupervised Learning, Deep Neural Networks, Transformers, and Optimization.',
    starterChapters: [
      {
        chapter: 'Foundations of Machine Learning',
        topics: [
          { name: 'Bias-Variance Tradeoff & Regularization', keyRule: 'L2 Loss = MSE + λ∑w_i²' },
          { name: 'Gradient Descent & Backpropagation', keyRule: 'θ := θ - α · ∇J(θ)' },
        ],
      },
    ],
  },
  {
    name: 'Data Science',
    category: 'Computing & Engineering',
    defaultCode: 'DS-205',
    description: 'Statistical Inference, Exploratory Data Analysis, Hypothesis Testing, and Time Series.',
    starterChapters: [
      {
        chapter: 'Statistical Inference',
        topics: [
          { name: 'Bayesian Inference & Conditional Probability', keyRule: 'P(A|B) = P(B|A)P(A) / P(B)' },
          { name: 'Hypothesis Testing & p-Values', keyRule: 'z = (x̄ - μ) / (σ / √n)' },
        ],
      },
    ],
  },
  {
    name: 'Engineering',
    category: 'Computing & Engineering',
    defaultCode: 'ENG-200',
    description: 'Electrical, Mechanical, Civil, Chemical, Signals & Systems, and Control Engineering.',
    starterChapters: [
      {
        chapter: 'Signals, Mechanics & Thermodynamics',
        topics: [
          { name: 'First & Second Laws of Thermodynamics', keyRule: 'ΔU = Q - W' },
          { name: 'Laplace & Fourier Transforms', keyRule: 'F(s) = ∫ f(t)e^(-st) dt' },
        ],
      },
    ],
  },
  {
    name: 'Medical Sciences',
    category: 'Life & Medical Sciences',
    defaultCode: 'MED-310',
    description: 'Human Anatomy, Physiology, Pathology, Pharmacology, and Clinical Diagnostics.',
    starterChapters: [
      {
        chapter: 'Cardiovascular & Renal Physiology',
        topics: [
          { name: 'Cardiac Output & Frank-Starling Law', keyRule: 'CO = HR × SV, MAP = CO × SVR' },
          { name: 'Glomerular Filtration Rate (GFR)', keyRule: 'Clearance Cx = (Ux · V) / Px' },
        ],
      },
    ],
  },
  {
    name: 'Commerce',
    category: 'Commerce & Management',
    defaultCode: 'COM-101',
    description: 'Trade, Financial Markets, Banking Operations, Auditing, and Taxation.',
    starterChapters: [
      {
        chapter: 'Financial Markets & Banking',
        topics: [
          { name: 'Capital Markets & Money Instruments', keyRule: 'Primary vs Secondary Market Mechanics' },
        ],
      },
    ],
  },
  {
    name: 'Economics',
    category: 'Commerce & Management',
    defaultCode: 'ECON-102',
    description: 'Microeconomics, Macroeconomics, Econometrics, Fiscal & Monetary Policy.',
    starterChapters: [
      {
        chapter: 'Microeconomic Equilibrium & Macro Policy',
        topics: [
          { name: 'Price Elasticity of Demand', keyRule: 'Ed = (% ΔQd) / (% ΔP)' },
          { name: 'GDP & Keynesian Multiplier', keyRule: 'Y = C + I + G + (X - M)' },
        ],
      },
    ],
  },
  {
    name: 'Accountancy',
    category: 'Commerce & Management',
    defaultCode: 'ACCT-105',
    description: 'Financial Accounting, Cost Accounting, Balance Sheets, Cash Flow, and IFRS/GAAP.',
    starterChapters: [
      {
        chapter: 'Double-Entry & Financial Statements',
        topics: [
          { name: 'Fundamental Accounting Equation', keyRule: 'Assets = Liabilities + Equity' },
          { name: 'Cash Flow & Ratio Analysis', keyRule: 'Current Ratio = Current Assets / Current Liabilities' },
        ],
      },
    ],
  },
  {
    name: 'Business Administration',
    category: 'Commerce & Management',
    defaultCode: 'BBA-201',
    description: 'Corporate Strategy, Operations Management, Marketing, and Organizational Behavior.',
    starterChapters: [
      {
        chapter: 'Corporate Strategy & Operations',
        topics: [
          { name: 'Competitive Advantage & Value Chain', keyRule: 'Net Present Value (NPV) = ∑ CF_t / (1+r)^t' },
        ],
      },
    ],
  },
  {
    name: 'Management',
    category: 'Commerce & Management',
    defaultCode: 'MGMT-301',
    description: 'Project Management, Supply Chain, Leadership, and Decision Analysis.',
    starterChapters: [
      {
        chapter: 'Project & Operations Execution',
        topics: [
          { name: 'Critical Path Method & Agile Delivery', keyRule: 'Slack = LS - ES = LF - EF' },
        ],
      },
    ],
  },
  {
    name: 'Arts and Humanities',
    category: 'Humanities & Social Sciences',
    defaultCode: 'HUM-101',
    description: 'Philosophy, Sociology, Psychology, Ethics, Aesthetics, and Cultural Studies.',
    starterChapters: [
      {
        chapter: 'Critical Theory & Ethics',
        topics: [
          { name: 'Utilitarian vs Deontological Ethics', keyRule: 'Consequentialism vs Categorical Imperative' },
        ],
      },
    ],
  },
  {
    name: 'History',
    category: 'Humanities & Social Sciences',
    defaultCode: 'HIST-101',
    description: 'Ancient Civilizations, Medieval, Modern World History, and Historiography.',
    starterChapters: [
      {
        chapter: 'Modern World Transformations',
        topics: [
          { name: 'Industrial Revolution & Global Trade', keyRule: 'Primary vs Secondary Historical Source Analysis' },
        ],
      },
    ],
  },
  {
    name: 'Geography',
    category: 'Humanities & Social Sciences',
    defaultCode: 'GEOG-101',
    description: 'Physical Geomorphology, Climatology, Human Geography, and GIS.',
    starterChapters: [
      {
        chapter: 'Climatology & Plate Tectonics',
        topics: [
          { name: 'Atmospheric Circulation & Coriolis Effect', keyRule: 'Hadley, Ferrel, and Polar Cells' },
        ],
      },
    ],
  },
  {
    name: 'Political Science',
    category: 'Humanities & Social Sciences',
    defaultCode: 'POLS-101',
    description: 'Constitutional Governance, Comparative Politics, International Relations, and Public Policy.',
    starterChapters: [
      {
        chapter: 'Constitutional Systems & International Relations',
        topics: [
          { name: 'Separation of Powers & Federalism', keyRule: 'Legislative, Executive, and Judicial Checks' },
        ],
      },
    ],
  },
  {
    name: 'Literature',
    category: 'Humanities & Social Sciences',
    defaultCode: 'LIT-101',
    description: 'Comparative Literature, Poetics, Narrative Structure, Rhetoric, and Literary Criticism.',
    starterChapters: [
      {
        chapter: 'Narrative Poetics & Close Reading',
        topics: [
          { name: 'Figurative Devices & Structural Irony', keyRule: 'Thesis → Textual Evidence → Critical Synthesis' },
        ],
      },
    ],
  },
  {
    name: 'Law',
    category: 'Law & Governance',
    defaultCode: 'LAW-201',
    description: 'Constitutional Law, Contract Law, Torts, Criminal Jurisprudence, and International Law.',
    starterChapters: [
      {
        chapter: 'Contract & Tort Jurisprudence',
        topics: [
          { name: 'Elements of Enforceable Contracts', keyRule: 'Offer + Acceptance + Consideration + Intention' },
          { name: 'IRAC Legal Reasoning Method', keyRule: 'Issue, Rule, Application, Conclusion' },
        ],
      },
    ],
  },
  {
    name: 'Languages',
    category: 'Languages & Linguistics',
    defaultCode: 'LANG-101',
    description: 'Grammar, Academic Writing, Comprehension, Linguistics, and Second-Language Acquisition.',
    starterChapters: [
      {
        chapter: 'Syntax, Rhetoric & Comprehension',
        topics: [
          { name: 'Argumentative Synthesis & Precision Grammar', keyRule: 'Cohesion, Register, and Syntactic Clarity' },
        ],
      },
    ],
  },
  {
    name: 'Competitive Examination Subjects',
    category: 'Test Prep & Competitive',
    defaultCode: 'COMP-400',
    description: 'Quantitative Aptitude, Logical Reasoning, Verbal Ability, General Studies, and Data Interpretation.',
    starterChapters: [
      {
        chapter: 'Aptitude & Analytical Reasoning',
        topics: [
          { name: 'Permutations, Combinations & Probability', keyRule: 'nCr = n! / (r!(n - r)!)' },
          { name: 'Syllogisms & Critical Reasoning', keyRule: 'Premise Validity vs Deductive Entailment' },
        ],
      },
    ],
  },
  {
    name: 'Professional and Technical Subjects',
    category: 'Professional & Technical',
    defaultCode: 'TECH-410',
    description: 'Cloud Architecture, Cybersecurity, DevOps, Financial Modeling, and Product Engineering.',
    starterChapters: [
      {
        chapter: 'Distributed Systems & Security',
        topics: [
          { name: 'CAP Theorem & Fault Tolerance', keyRule: 'Consistency, Availability, Partition Tolerance' },
          { name: 'Zero-Trust Authentication & Cryptography', keyRule: 'Least Privilege & Asymmetric TLS' },
        ],
      },
    ],
  },
];

export const QUESTION_FORMATS: Array<{
  id: QuestionFormatId;
  number: number;
  label: string;
  shortDesc: string;
  isObjective: boolean;
}> = [
  { id: 'mcq', number: 1, label: 'Multiple-Choice Questions (MCQ)', shortDesc: 'Single best option among 4 choices', isObjective: true },
  { id: 'msq', number: 2, label: 'Multiple-Select Questions (MSQ)', shortDesc: 'One or more correct options', isObjective: true },
  { id: 'true_false', number: 3, label: 'True or False', shortDesc: 'Binary conceptual verification', isObjective: true },
  { id: 'fill_blanks', number: 4, label: 'Fill in the Blanks', shortDesc: 'Precise missing term or value', isObjective: false },
  { id: 'one_word', number: 5, label: 'One-Word Answers', shortDesc: 'Concise single-term recall', isObjective: false },
  { id: 'short_answer', number: 6, label: 'Short-Answer Questions', shortDesc: '2–4 sentence focused explanation', isObjective: false },
  { id: 'long_answer', number: 7, label: 'Long-Answer Questions', shortDesc: 'Comprehensive multi-step derivation', isObjective: false },
  { id: 'descriptive', number: 8, label: 'Descriptive Questions', shortDesc: 'Structured analytical essay response', isObjective: false },
  { id: 'numerical', number: 9, label: 'Numerical Problems', shortDesc: 'Quantitative calculation with units', isObjective: false },
  { id: 'coding', number: 10, label: 'Coding Questions', shortDesc: 'Write an algorithm or function implementation', isObjective: false },
  { id: 'output_prediction', number: 11, label: 'Output-Prediction Questions', shortDesc: 'Trace code execution and state exact output', isObjective: false },
  { id: 'assertion_reasoning', number: 12, label: 'Assertion and Reasoning', shortDesc: 'Evaluate Assertion (A) and Reason (R) link', isObjective: true },
  { id: 'match_following', number: 13, label: 'Match the Following', shortDesc: 'Pair Column A concepts with Column B', isObjective: false },
  { id: 'case_based', number: 14, label: 'Case-Based Questions', shortDesc: 'Analyze an academic or real-world case passage', isObjective: false },
  { id: 'scenario_based', number: 15, label: 'Scenario-Based Questions', shortDesc: 'Decision-making in an applied scenario', isObjective: false },
  { id: 'diagram_based', number: 16, label: 'Diagram-Based Questions', shortDesc: 'Interpret structural or schematic descriptions', isObjective: false },
  { id: 'viva', number: 17, label: 'Viva Questions', shortDesc: 'Oral defense and conceptual probing', isObjective: false },
  { id: 'practical_lab', number: 18, label: 'Practical & Laboratory Questions', shortDesc: 'Experimental procedure, error, and observation', isObjective: false },
  { id: 'interview', number: 19, label: 'Interview Questions', shortDesc: 'Technical or academic placement interview prep', isObjective: false },
  { id: 'application_based', number: 20, label: 'Application-Based Questions', shortDesc: 'Transfer theory to novel real-world systems', isObjective: false },
  { id: 'custom', number: 21, label: 'Custom Question Format', shortDesc: 'Define your own specialized format structure', isObjective: false },
];

export const QUICK_QUESTION_QUANTITIES = [5, 10, 15, 20, 25, 30, 50, 100];
