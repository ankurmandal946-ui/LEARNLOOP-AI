import { ConceptId, ConceptInfo, Question, CohortStudent } from '../types/physics';

export const CONCEPTS: Record<ConceptId, ConceptInfo> = {
  'electric-current': {
    id: 'electric-current',
    name: 'Electric Current',
    tagline: 'Rate of flow of electric charges through a cross-section',
    formula: 'I = Q / t  (where Q = n × e)',
    siUnit: 'Ampere (A) = Coulomb / second',
    measuringDevice: 'Ammeter (always connected in series, low resistance)',
    cbseWeightage: '2–3 Marks',
    description: 'Electric current is the continuous rate of net charge flow through a conductor cross-section. By convention, direction is opposite to electron drift.',
    keyPrinciples: [
      'Current is conserved; charges are never created or destroyed in circuit nodes.',
      '1 Ampere is defined as 1 Coulomb of charge passing per second.',
      'Electrons drift from negative to positive, but conventional current is positive to negative.'
    ],
    commonMisconceptions: [
      'Believing current gets "consumed" or "used up" by resistors and bulbs.',
      'Confusing speed of electricity with the physical electron drift velocity (~10^-4 m/s).',
      'Thinking an ammeter can be connected in parallel across a battery.'
    ]
  },
  'potential-difference': {
    id: 'potential-difference',
    name: 'Potential Difference',
    tagline: 'Work done to move a unit positive charge between two points',
    formula: 'V = W / Q',
    siUnit: 'Volt (V) = Joule / Coulomb',
    measuringDevice: 'Voltmeter (always connected in parallel, high resistance)',
    cbseWeightage: '2–3 Marks',
    description: 'Potential difference or voltage represents the electrical pressure or energy per unit charge supplied by an electrochemical cell or battery.',
    keyPrinciples: [
      '1 Volt is when 1 Joule of work is done to move 1 Coulomb of charge between two points.',
      'A battery maintains a constant potential difference across its terminals by chemical action.',
      'Potential difference drives electric current through conductors.'
    ],
    commonMisconceptions: [
      'Thinking voltage "flows" through wires (current flows, voltage is across two points).',
      'Confusing electromotive force (EMF) with actual physical force in Newtons.',
      'Assuming points connected by an ideal conductor have different potentials.'
    ]
  },
  'resistance': {
    id: 'resistance',
    name: 'Resistance & Resistivity',
    tagline: 'Property of conductor opposing electric charge motion',
    formula: 'R = ρ · (l / A)',
    siUnit: 'Ohm (Ω) for Resistance; Ohm-meter (Ω·m) for Resistivity (ρ)',
    measuringDevice: 'Ohmmeter or calculated via V and I',
    cbseWeightage: '3–4 Marks',
    description: 'Resistance depends on length (l), cross-sectional area (A), material nature (ρ), and temperature. Resistivity is a characteristic material property independent of dimensions.',
    keyPrinciples: [
      'Resistance is directly proportional to conductor length (R ∝ l).',
      'Resistance is inversely proportional to cross-sectional area (R ∝ 1/A). If wire radius is doubled, area quadruples and resistance drops to 1/4.',
      'Resistivity (ρ) depends only on material and temperature, not on length or thickness.'
    ],
    commonMisconceptions: [
      'Believing resistivity changes when a wire is stretched or cut in half.',
      'Confusing doubling the radius with doubling the area (Area = πr²).',
      'Assuming thick wires have more resistance because they contain more atoms.'
    ]
  },
  'ohms-law': {
    id: 'ohms-law',
    name: "Ohm's Law",
    tagline: 'Linear proportionality between potential difference and current',
    formula: 'V = I · R  (at constant temperature)',
    siUnit: 'V in Volts, I in Amperes, R in Ohms',
    measuringDevice: 'V–I experimental graph with slope = R (or 1/R if I on vertical axis)',
    cbseWeightage: '3–5 Marks',
    description: 'The potential difference across the ends of a metallic wire is directly proportional to the current flowing through it, provided temperature remains constant.',
    keyPrinciples: [
      'V/I = constant = R for ohmic conductors at constant temperature.',
      'The slope of a V vs I graph equals the resistance R.',
      'If temperature increases, resistance of metallic conductors usually increases.'
    ],
    commonMisconceptions: [
      'Believing Ohm\'s law applies universally to all electronic devices (e.g. diodes, semiconductors).',
      'Misinterpreting graph slope when axes are reversed (I on y-axis means slope = 1/R).',
      'Assuming resistance changes when voltage is altered for an ohmic conductor.'
    ]
  },
  'circuits': {
    id: 'circuits',
    name: 'Series & Parallel Circuits',
    tagline: 'Equivalent resistance and energy distribution in circuit networks',
    formula: 'Series: Rs = R1 + R2 | Parallel: 1/Rp = 1/R1 + 1/R2',
    siUnit: 'Ohm (Ω)',
    measuringDevice: 'Multimeter / circuit analysis network',
    cbseWeightage: '4–6 Marks (High Yield)',
    description: 'Series circuits share current equally with additive voltage drops. Parallel circuits share voltage equally across all branches while dividing current inversely to branch resistance.',
    keyPrinciples: [
      'In series: Current is identical through every component; total voltage V = V1 + V2.',
      'In parallel: Potential difference across every branch is identical; total current I = I1 + I2.',
      'Equivalent resistance in parallel is always less than the smallest individual resistor.'
    ],
    commonMisconceptions: [
      'Believing adding more resistors in parallel increases total circuit resistance.',
      'Assuming current divides equally across parallel branches with unequal resistors.',
      'Thinking if one bulb fuses in parallel, the other bulbs will also turn off.'
    ]
  }
};

export const DIAGNOSTIC_QUESTIONS: Question[] = [
  {
    id: 'diag-1',
    conceptId: 'electric-current',
    conceptName: 'Electric Current',
    difficulty: 'foundational',
    title: 'Charge Transfer in an Electric Lamp',
    prompt: 'A current of 0.5 A is drawn by a filament of an electric bulb for 10 minutes. Calculate the amount of electric charge that flows through the circuit. In your explanation, explain why the electric current exiting the bulb filament equals the current entering it.',
    circuitSetup: {
      hasCircuit: true,
      circuitType: 'single',
      voltage: 12,
      resistors: [24],
      description: 'Single electric bulb connected in series with an ammeter and 12V DC power source.'
    },
    expectedFormat: 'State total charge in Coulombs (C) and explain the principle of charge conservation.',
    correctAnswerReference: 'Q = I * t. Time t = 10 min = 600 s. Q = 0.5 A * 600 s = 300 Coulombs. Current entering equals current exiting because charge cannot accumulate or be destroyed in the filament (conservation of charge).',
    hint1: 'Remember to convert time from minutes into seconds (1 min = 60 s).',
    hint2: 'Use the fundamental definition of current: I = Q / t, which rearranges to Q = I × t.',
    hint3: 'For the reasoning, think about whether electrons get consumed or merely lose electrical potential energy.'
  },
  {
    id: 'diag-2',
    conceptId: 'potential-difference',
    conceptName: 'Potential Difference',
    difficulty: 'intermediate',
    title: 'Energy to Move Charge Across Terminals',
    prompt: 'How much work is done in moving a charge of 4 Coulombs across two points having a potential difference of 12 Volts? In your spoken reasoning, explain what "12 Volts" physically means in terms of energy per charge carrier.',
    circuitSetup: {
      hasCircuit: true,
      circuitType: 'single',
      voltage: 12,
      resistors: [10],
      description: '12V battery with a voltmeter connected in parallel across the terminals.'
    },
    expectedFormat: 'State the work done in Joules (J) and define 1 Volt in terms of Joules and Coulombs.',
    correctAnswerReference: 'W = V * Q = 12 V * 4 C = 48 Joules. 12 Volts physically means 12 Joules of energy is supplied to move each 1 Coulomb of charge across those points (1 V = 1 J/C).',
    hint1: 'Recall the definition of electric potential difference: V = W / Q.',
    hint2: 'Rearrange the formula to solve for Work (W): W = V × Q.',
    hint3: '1 Volt equals 1 Joule per Coulomb of charge.'
  },
  {
    id: 'diag-3',
    conceptId: 'resistance',
    conceptName: 'Resistance & Resistivity',
    difficulty: 'intermediate',
    title: 'Stretching a Cylindrical Wire',
    prompt: 'A cylindrical copper wire has resistance R. If the wire is stretched so that its length is doubled while keeping its volume constant, how will its new resistance compare to R? State the new resistance and explain how the cross-sectional area changes when length is doubled.',
    circuitSetup: {
      hasCircuit: false,
      circuitType: 'none',
      description: 'Uniform cylindrical conductor undergoing mechanical stretching.'
    },
    expectedFormat: 'State new resistance in terms of R (e.g. 2R, 4R, or R/2) and explain the area relationship.',
    correctAnswerReference: 'New resistance is 4R. Because volume V = A * l remains constant, doubling length (l\' = 2l) causes the cross-sectional area to halve (A\' = A/2). Since R = ρ(l/A), R\' = ρ(2l / (A/2)) = 4 * ρ(l/A) = 4R.',
    hint1: 'When a wire is stretched, its total volume (Volume = Area × Length) does not change.',
    hint2: 'If length l doubles, what must happen to area A to keep Volume constant?',
    hint3: 'Substitute the new length (2l) and new area (A/2) into the resistance formula R = ρ(l/A).'
  },
  {
    id: 'diag-4',
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    difficulty: 'intermediate',
    title: 'V-I Graph Analysis and Resistance',
    prompt: 'In an experiment, when potential difference V = 6.0 V is applied across a heating coil, the measured current is 1.5 A. Calculate the resistance of the coil. If the voltage is now increased to 9.0 V while temperature stays constant, calculate the new current and explain the physical principle.',
    circuitSetup: {
      hasCircuit: true,
      circuitType: 'single',
      voltage: 6,
      resistors: [4],
      description: 'Heating coil in series with ammeter and variable DC supply, with voltmeter in parallel.'
    },
    expectedFormat: 'State initial resistance in Ohms, new current in Amperes, and state Ohm\'s law proportionality.',
    correctAnswerReference: 'R = V/I = 6.0 V / 1.5 A = 4.0 Ω. At constant temperature, R remains 4.0 Ω (Ohm\'s Law). When V = 9.0 V, new current I = V/R = 9.0 V / 4.0 Ω = 2.25 A. Since V is directly proportional to I, current scales proportionally.',
    hint1: 'First find the resistance R using R = V / I with the initial values (6.0V and 1.5A).',
    hint2: 'Does resistance change when voltage increases if temperature is constant?',
    hint3: 'Use the calculated resistance to find the new current at 9.0V using I = V / R.'
  },
  {
    id: 'diag-5',
    conceptId: 'circuits',
    conceptName: 'Series & Parallel Circuits',
    difficulty: 'exam-prep',
    title: 'Comparing Series and Parallel Connections',
    prompt: 'Two resistors of 6 Ω and 12 Ω are connected in parallel across a 12 V battery. (a) Calculate the equivalent resistance of the combination. (b) Find the total current drawn from the battery. (c) In your explanation, explain whether the 6 Ω resistor draws more current than the 12 Ω resistor, and why.',
    circuitSetup: {
      hasCircuit: true,
      circuitType: 'parallel',
      voltage: 12,
      resistors: [6, 12],
      description: '12V DC battery with parallel branches containing 6Ω and 12Ω resistors.'
    },
    expectedFormat: 'State equivalent resistance in Ohms, total current in Amperes, and explain current division.',
    correctAnswerReference: '1/Rp = 1/6 + 1/12 = 2/12 + 1/12 = 3/12 = 1/4 => Rp = 4 Ω. Total current I = V / Rp = 12 V / 4 Ω = 3 A. The 6 Ω resistor draws 12V/6Ω = 2 A, while the 12 Ω resistor draws 12V/12Ω = 1 A. The 6 Ω resistor draws twice as much current because in parallel, both experience the same 12V, and current is inversely proportional to resistance.',
    hint1: 'Use the parallel resistance formula: 1/Rp = 1/R1 + 1/R2.',
    hint2: 'Find total current using Ohm\'s law with total voltage (12V) and equivalent resistance Rp.',
    hint3: 'Remember: In parallel circuits, both resistors receive the full 12V. Smaller resistance allows more current to flow.'
  }
];

export const INITIAL_DEMO_COHORT: CohortStudent[] = [
  {
    id: 'st-01',
    name: 'Aarav Sharma',
    avatarSeed: 'aarav',
    overallScore: 84,
    conceptScores: {
      'electric-current': 92,
      'potential-difference': 85,
      'resistance': 88,
      'ohms-law': 90,
      'circuits': 65
    },
    weakestConcept: 'circuits',
    identifiedMisconceptions: ['Assumed parallel branches share voltage additive instead of equal.'],
    lastActive: 'Today, 2:15 PM',
    submissionsCount: 14
  },
  {
    id: 'st-02',
    name: 'Diya Patel',
    avatarSeed: 'diya',
    overallScore: 62,
    conceptScores: {
      'electric-current': 78,
      'potential-difference': 55,
      'resistance': 58,
      'ohms-law': 72,
      'circuits': 47
    },
    weakestConcept: 'circuits',
    identifiedMisconceptions: ['Believed current gets consumed by higher resistors', 'Confused resistivity with resistance.'],
    lastActive: 'Yesterday',
    submissionsCount: 9
  },
  {
    id: 'st-03',
    name: 'Rohan Verma',
    avatarSeed: 'rohan',
    overallScore: 91,
    conceptScores: {
      'electric-current': 95,
      'potential-difference': 90,
      'resistance': 92,
      'ohms-law': 94,
      'circuits': 84
    },
    weakestConcept: 'circuits',
    identifiedMisconceptions: [],
    lastActive: 'Today, 11:30 AM',
    submissionsCount: 22
  },
  {
    id: 'st-04',
    name: 'Ananya Iyer',
    avatarSeed: 'ananya',
    overallScore: 74,
    conceptScores: {
      'electric-current': 85,
      'potential-difference': 70,
      'resistance': 62,
      'ohms-law': 80,
      'circuits': 73
    },
    weakestConcept: 'resistance',
    identifiedMisconceptions: ['Stated wire resistivity quadruples when stretched.'],
    lastActive: '2 days ago',
    submissionsCount: 11
  },
  {
    id: 'st-05',
    name: 'Kabir Mehta',
    avatarSeed: 'kabir',
    overallScore: 56,
    conceptScores: {
      'electric-current': 65,
      'potential-difference': 52,
      'resistance': 50,
      'ohms-law': 60,
      'circuits': 53
    },
    weakestConcept: 'resistance',
    identifiedMisconceptions: ['Confused current with voltage direction', 'Inverted Ohm\'s law slope.'],
    lastActive: 'Today, 9:00 AM',
    submissionsCount: 7
  },
  {
    id: 'st-06',
    name: 'Meera Nair',
    avatarSeed: 'meera',
    overallScore: 88,
    conceptScores: {
      'electric-current': 90,
      'potential-difference': 86,
      'resistance': 84,
      'ohms-law': 92,
      'circuits': 88
    },
    weakestConcept: 'resistance',
    identifiedMisconceptions: [],
    lastActive: 'Today, 4:00 PM',
    submissionsCount: 18
  }
];
