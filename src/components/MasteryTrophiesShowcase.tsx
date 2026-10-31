import React, { useState } from 'react';
import { Trophy, TrophyTier } from '../types/physics';
import {
  Award,
  Zap,
  TrendingUp,
  BatteryCharging,
  Gauge,
  Network,
  Mic,
  Flame,
  Compass,
  CheckCircle2,
  Lock,
  Sparkles,
  X
} from 'lucide-react';

interface MasteryTrophiesShowcaseProps {
  trophies: Trophy[];
  latestAwardedTrophy?: Trophy | null;
  onDismissCelebration?: () => void;
}

export const MasteryTrophiesShowcase: React.FC<MasteryTrophiesShowcaseProps> = ({
  trophies,
  latestAwardedTrophy,
  onDismissCelebration
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const unlockedCount = trophies.filter((t) => t.unlocked).length;
  const conceptTrophiesCount = trophies.filter(
    (t) => t.conceptId && t.conceptId !== 'general' && t.unlocked
  ).length;

  const filteredTrophies = trophies.filter((t) => {
    if (filter === 'unlocked') return t.unlocked;
    if (filter === 'locked') return !t.unlocked;
    return true;
  });

  const getTrophyIcon = (iconName: string, tier: TrophyTier, unlocked: boolean) => {
    const className = `w-6 h-6 ${
      !unlocked
        ? 'text-slate-400 dark:text-slate-600'
        : tier === 'diamond'
        ? 'text-cyan-400'
        : tier === 'gold'
        ? 'text-amber-400'
        : tier === 'silver'
        ? 'text-slate-200'
        : 'text-amber-600'
    }`;

    switch (iconName) {
      case 'zap':
        return <Zap className={className} />;
      case 'battery-charging':
        return <BatteryCharging className={className} />;
      case 'gauge':
        return <Gauge className={className} />;
      case 'trending-up':
        return <TrendingUp className={className} />;
      case 'network':
        return <Network className={className} />;
      case 'mic':
        return <Mic className={className} />;
      case 'flame':
        return <Flame className={className} />;
      case 'compass':
        return <Compass className={className} />;
      case 'award':
      default:
        return <Award className={className} />;
    }
  };

  const getTierBadgeClass = (tier: TrophyTier, unlocked: boolean) => {
    if (!unlocked) {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
    }
    switch (tier) {
      case 'diamond':
        return 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-sm';
      case 'gold':
        return 'bg-amber-400/90 text-slate-950 font-bold shadow-sm';
      case 'silver':
        return 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold';
      case 'bronze':
        return 'bg-amber-700/80 text-white font-semibold';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Celebration Modal Banner if a trophy was just awarded */}
      {latestAwardedTrophy && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-6 text-slate-950 shadow-xl animate-scaleUp">
          <div className="absolute top-2 right-2">
            <button
              type="button"
              onClick={onDismissCelebration}
              className="p-1 rounded-full bg-black/10 hover:bg-black/20 text-slate-950 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg shrink-0">
              <Award className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-1 text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
                <Sparkles className="w-4 h-4" />
                <span>Mastery Trophy Unlocked!</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                {latestAwardedTrophy.title}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-900/90 leading-relaxed max-w-xl">
                {latestAwardedTrophy.description}
              </p>
              <div className="text-xs font-semibold pt-1 text-slate-900">
                Criteria Met: {latestAwardedTrophy.criteria}
              </div>
            </div>

            <button
              type="button"
              onClick={onDismissCelebration}
              className="px-5 py-2.5 rounded-xl bg-slate-950 text-white font-bold text-xs hover:bg-slate-900 shadow-md transition-all shrink-0"
            >
              Claim & Continue
            </button>
          </div>
        </div>
      )}

      {/* Main Header & Overview Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Mastery Engagement & Trophy System</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Physics Concept Mastery Trophies
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Earned by demonstrating consistent high scores (≥80%) and sound physical reasoning.
          </p>
        </div>

        {/* Aggregate Progress Card */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs shrink-0">
          <div className="text-center pr-3 border-r border-slate-200 dark:border-slate-800">
            <div className="text-lg font-extrabold text-amber-500 font-mono">
              {unlockedCount} / {trophies.length}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Trophies Earned</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-extrabold text-sky-500 font-mono">
              {conceptTrophiesCount} / 5
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Concept Badges</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs w-fit">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded font-medium transition-all ${
            filter === 'all'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          All Trophies ({trophies.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unlocked')}
          className={`px-3 py-1.5 rounded font-medium transition-all ${
            filter === 'unlocked'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Unlocked ({unlockedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('locked')}
          className={`px-3 py-1.5 rounded font-medium transition-all ${
            filter === 'locked'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          In Progress ({trophies.length - unlockedCount})
        </button>
      </div>

      {/* Trophies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTrophies.map((trophy) => {
          const isUnlocked = trophy.unlocked;

          return (
            <div
              key={trophy.id}
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                isUnlocked
                  ? 'bg-gradient-to-br from-white to-amber-50/20 dark:from-slate-900 dark:to-slate-950 border-amber-300 dark:border-amber-900/60 shadow-sm'
                  : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-80'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    isUnlocked
                      ? 'bg-slate-900 dark:bg-slate-950 border-amber-400/40 shadow-inner'
                      : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {getTrophyIcon(trophy.iconName, trophy.tier, isUnlocked)}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${getTierBadgeClass(
                      trophy.tier,
                      isUnlocked
                    )}`}
                  >
                    {trophy.tier}
                  </span>
                  {isUnlocked ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1 flex-1">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {trophy.title}
                </h3>
                <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                  {trophy.conceptName}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {trophy.description}
                </p>
              </div>

              {/* Progress & Criteria Footer */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1" title={trophy.criteria}>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Goal:</span> {trophy.criteria}
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-400">Mastery Progress</span>
                    <span className={`font-bold ${isUnlocked ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
                      {trophy.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUnlocked
                          ? 'bg-amber-400'
                          : trophy.progress >= 70
                          ? 'bg-sky-500'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${trophy.progress}%` }}
                    />
                  </div>
                </div>

                {isUnlocked && trophy.unlockedAt && (
                  <div className="text-[10px] text-slate-400 text-right">
                    Awarded: {trophy.unlockedAt}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
