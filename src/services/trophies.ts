import { Trophy, ConceptId, ConceptMastery, StudentProfile } from '../types/physics';
import { CONCEPTS } from '../data/physicsConcepts';

export const INITIAL_TROPHIES: Trophy[] = [
  {
    id: 'trophy-electric-current',
    title: 'Current Conductor Trophy',
    conceptId: 'electric-current',
    conceptName: 'Electric Current',
    tier: 'silver',
    iconName: 'zap',
    description: 'Awarded for master-level command of charge conservation and current flow (I = Q/t).',
    criteria: 'Maintain ≥ 80% mastery with 2+ consecutive high-scoring evaluations',
    unlocked: false,
    unlockedAt: null,
    progress: 65,
    consecutiveHighScores: 1,
    requiredConsecutive: 2
  },
  {
    id: 'trophy-potential-difference',
    title: 'Potential Pioneer Trophy',
    conceptId: 'potential-difference',
    conceptName: 'Potential Difference',
    tier: 'silver',
    iconName: 'battery-charging',
    description: 'Awarded for physical intuition of work done per unit charge (V = W/Q).',
    criteria: 'Maintain ≥ 80% mastery with 2+ consecutive high-scoring evaluations',
    unlocked: false,
    unlockedAt: null,
    progress: 55,
    consecutiveHighScores: 0,
    requiredConsecutive: 2
  },
  {
    id: 'trophy-resistance',
    title: 'Resistivity Champion Trophy',
    conceptId: 'resistance',
    conceptName: 'Resistance & Resistivity',
    tier: 'silver',
    iconName: 'gauge',
    description: 'Awarded for mastering wire dimensional scaling and material resistivity factors.',
    criteria: 'Maintain ≥ 80% mastery with 2+ consecutive high-scoring evaluations',
    unlocked: false,
    unlockedAt: null,
    progress: 50,
    consecutiveHighScores: 0,
    requiredConsecutive: 2
  },
  {
    id: 'trophy-ohms-law',
    title: "Ohm's Law Virtuoso Trophy",
    conceptId: 'ohms-law',
    conceptName: "Ohm's Law",
    tier: 'gold',
    iconName: 'trending-up',
    description: "Awarded for exceptional accuracy calculating linear V-I proportionalities and graph slopes.",
    criteria: 'Maintain ≥ 80% mastery with 2+ consecutive high-scoring evaluations',
    unlocked: false,
    unlockedAt: null,
    progress: 72,
    consecutiveHighScores: 1,
    requiredConsecutive: 2
  },
  {
    id: 'trophy-circuits',
    title: 'Circuit Grandmaster Trophy',
    conceptId: 'circuits',
    conceptName: 'Series & Parallel Circuits',
    tier: 'gold',
    iconName: 'network',
    description: 'Awarded for mastering complex series-parallel equivalent resistances and current division.',
    criteria: 'Maintain ≥ 80% mastery with 2+ consecutive high-scoring evaluations',
    unlocked: false,
    unlockedAt: null,
    progress: 42,
    consecutiveHighScores: 0,
    requiredConsecutive: 2
  },
  {
    id: 'trophy-voice-scholar',
    title: 'Wispr Flow Voice Scholar',
    conceptId: 'general',
    conceptName: 'Voice Dictation',
    tier: 'silver',
    iconName: 'mic',
    description: 'Awarded for active oral reasoning practice using Wispr Flow voice dictation.',
    criteria: 'Submit 3+ oral physics explanations formatted with Wispr Flow',
    unlocked: true,
    unlockedAt: 'Yesterday',
    progress: 100,
    consecutiveHighScores: 3,
    requiredConsecutive: 3
  },
  {
    id: 'trophy-retention-titan',
    title: 'Retention Titan Trophy',
    conceptId: 'general',
    conceptName: 'Spaced Repetition',
    tier: 'silver',
    iconName: 'flame',
    description: 'Awarded for consistent study discipline maintaining a 4+ day streak.',
    criteria: 'Maintain a 4-day study streak with timely spaced reviews',
    unlocked: true,
    unlockedAt: 'Today',
    progress: 100,
    consecutiveHighScores: 4,
    requiredConsecutive: 4
  },
  {
    id: 'trophy-diagnostic-distinction',
    title: 'Diagnostic Pathfinder',
    conceptId: 'general',
    conceptName: 'Diagnostic Assessment',
    tier: 'bronze',
    iconName: 'compass',
    description: 'Awarded for completing the 5-concept diagnostic baseline test.',
    criteria: 'Complete the Class 10 Physics diagnostic assessment',
    unlocked: false,
    unlockedAt: null,
    progress: 0,
    consecutiveHighScores: 0,
    requiredConsecutive: 1
  },
  {
    id: 'trophy-electricity-laureate',
    title: 'Electricity Unit Laureate (Apex Gold)',
    conceptId: 'general',
    conceptName: 'All 5 Concepts',
    tier: 'diamond',
    iconName: 'award',
    description: 'The pinnacle trophy awarded when a student earns mastery trophies across all 5 Electricity concepts.',
    criteria: 'Unlock all 5 individual concept mastery trophies',
    unlocked: false,
    unlockedAt: null,
    progress: 0,
    consecutiveHighScores: 0,
    requiredConsecutive: 5
  }
];

/**
 * Checks and updates trophy progress and awards new trophies after every submitted answer or diagnostic.
 * Returns the updated trophies array and any newly awarded trophies.
 */
export function checkAndAwardTrophies(
  currentTrophies: Trophy[],
  masteries: Record<ConceptId, ConceptMastery>,
  profile: StudentProfile,
  latestEvaluatedConceptId?: ConceptId,
  latestScore?: number
): {
  updatedTrophies: Trophy[];
  newlyAwardedTrophies: Trophy[];
} {
  const newlyAwarded: Trophy[] = [];
  const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const updatedTrophies = currentTrophies.map((trophy) => {
    // If already unlocked, retain state
    if (trophy.unlocked) {
      return trophy;
    }

    let progress = trophy.progress;
    let consecutive = trophy.consecutiveHighScores;
    let shouldUnlock = false;

    // 1. Concept-specific mastery trophies
    if (trophy.conceptId && trophy.conceptId !== 'general') {
      const conceptId = trophy.conceptId as ConceptId;
      const mastery = masteries[conceptId];

      if (mastery) {
        progress = mastery.score;

        if (latestEvaluatedConceptId === conceptId && latestScore !== undefined) {
          if (latestScore >= 75) {
            consecutive += 1;
          } else {
            consecutive = Math.max(0, consecutive - 1);
          }
        }

        // Unlock when mastery is >= 80% and student maintained consecutive high scores
        if (mastery.score >= 80 && consecutive >= trophy.requiredConsecutive) {
          shouldUnlock = true;
        }
      }
    }

    // 2. Diagnostic Pathfinder trophy
    if (trophy.id === 'trophy-diagnostic-distinction') {
      if (profile.diagnosticCompleted) {
        progress = 100;
        shouldUnlock = true;
      }
    }

    // 3. Retention Titan trophy
    if (trophy.id === 'trophy-retention-titan') {
      progress = Math.min(100, Math.round((profile.streakDays / trophy.requiredConsecutive) * 100));
      if (profile.streakDays >= trophy.requiredConsecutive) {
        shouldUnlock = true;
      }
    }

    // 4. Apex Diamond Trophy (Electricity Laureate)
    if (trophy.id === 'trophy-electricity-laureate') {
      const conceptTrophies = currentTrophies.filter(
        (t) => t.conceptId && t.conceptId !== 'general'
      );
      const unlockedConceptTrophies = conceptTrophies.filter((t) => t.unlocked).length;
      progress = Math.round((unlockedConceptTrophies / 5) * 100);
      if (unlockedConceptTrophies >= 5) {
        shouldUnlock = true;
      }
    }

    if (shouldUnlock && !trophy.unlocked) {
      const awarded: Trophy = {
        ...trophy,
        unlocked: true,
        unlockedAt: now,
        progress: 100,
        consecutiveHighScores: Math.max(consecutive, trophy.requiredConsecutive)
      };
      newlyAwarded.push(awarded);
      return awarded;
    }

    return {
      ...trophy,
      progress: Math.min(100, Math.max(0, progress)),
      consecutiveHighScores: consecutive
    };
  });

  return {
    updatedTrophies,
    newlyAwardedTrophies: newlyAwarded
  };
}
