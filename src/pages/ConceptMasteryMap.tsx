import React, { useState } from 'react';
import { useLearner } from '../context/LearnerContext';
import { CONCEPTS } from '../data/physicsConcepts';
import { ConceptId } from '../types/physics';
import { CircuitVisualizer } from '../components/CircuitVisualizer';
import { PageId } from '../components/Navigation';
import {
  GitFork,
  ArrowRight,
  Info,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Sparkles,
  Zap,
  Award
} from 'lucide-react';

interface ConceptMasteryMapProps {
  setCurrentPage: (page: PageId) => void;
  onSelectConceptForTutor: (conceptId: ConceptId) => void;
}

export const ConceptMasteryMap: React.FC<ConceptMasteryMapProps> = ({
  setCurrentPage,
  onSelectConceptForTutor
}) => {
  const { masteries, trophies } = useLearner();

  const [selectedConceptId, setSelectedConceptId] = useState<ConceptId>('ohms-law');

  // Interactive Sandbox State
  const [sandboxMode, setSandboxMode] = useState<'series' | 'parallel' | 'single'>('series');
  const [voltage, setVoltage] = useState(12);
  const [resistor1, setResistor1] = useState(6);
  const [resistor2, setResistor2] = useState(6);

  // Math for sandbox
  let req = 6;
  let totalI = 2;
  let i1 = 2;
  let i2 = 0;

  if (sandboxMode === 'single') {
    req = resistor1;
    totalI = req > 0 ? voltage / req : 0;
  } else if (sandboxMode === 'series') {
    req = resistor1 + resistor2;
    totalI = req > 0 ? voltage / req : 0;
  } else {
    req = (resistor1 * resistor2) / (resistor1 + resistor2 || 1);
    totalI = req > 0 ? voltage / req : 0;
    i1 = resistor1 > 0 ? voltage / resistor1 : 0;
    i2 = resistor2 > 0 ? voltage / resistor2 : 0;
  }

  const selectedInfo = CONCEPTS[selectedConceptId];
  const selectedMastery = masteries[selectedConceptId] || {
    score: 50,
    status: 'developing',
    detectedMisconceptions: []
  };

  // Node definitions with graph coordinates
  const nodes: Array<{
    id: ConceptId;
    title: string;
    level: number;
    col: string;
    prereqs: ConceptId[];
  }> = [
    { id: 'electric-current', title: '1. Electric Current (I)', level: 1, col: '1', prereqs: [] },
    { id: 'potential-difference', title: '2. Potential Diff (V)', level: 1, col: '2', prereqs: [] },
    { id: 'resistance', title: '3. Resistance (R)', level: 1, col: '3', prereqs: [] },
    {
      id: 'ohms-law',
      title: "4. Ohm's Law (V = IR)",
      level: 2,
      col: 'span-2',
      prereqs: ['electric-current', 'potential-difference', 'resistance']
    },
    {
      id: 'circuits',
      title: '5. Series & Parallel Networks',
      level: 3,
      col: 'span-3',
      prereqs: ['ohms-law']
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
          <GitFork className="w-4 h-4" />
          <span>Knowledge Graph & Circuit Laboratory</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
          Electricity Unit: Concept Mastery Graph
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track prerequisite dependencies across the 5 core concepts and test Ohm's law relationships dynamically in the circuit sandbox.
        </p>
      </div>

      {/* Visual Prerequisite Graph */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Syllabus Dependency Hierarchy
          </h2>
          <span className="text-xs text-slate-400">Click any node to inspect details</span>
        </div>

        {/* Level 1: Foundations */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
            Tier 1: Fundamental Physical Quantities
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nodes.slice(0, 3).map((node) => {
              const mastery = masteries[node.id];
              const isSelected = selectedConceptId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedConceptId(node.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/40 dark:bg-sky-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {node.title}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        mastery.score >= 70
                          ? 'text-emerald-600'
                          : mastery.score >= 50
                          ? 'text-sky-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {mastery.score}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        mastery.score >= 70 ? 'bg-emerald-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${mastery.score}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 font-mono">
                    {CONCEPTS[node.id].formula}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Connecting Arrows */}
        <div className="flex items-center justify-center text-slate-300 dark:text-slate-700 font-mono text-xs">
          <span>↓ Synthesized into Proportional Law ↓</span>
        </div>

        {/* Level 2: Ohm's Law */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
            Tier 2: Governing Proportional Law
          </span>
          {(() => {
            const node = nodes[3];
            const mastery = masteries[node.id];
            const isSelected = selectedConceptId === node.id;
            return (
              <button
                type="button"
                onClick={() => setSelectedConceptId(node.id)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/40 dark:bg-sky-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {node.title}
                    </span>
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded">
                      Central Core Concept
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                    {mastery.score}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full"
                    style={{ width: `${mastery.score}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  Prerequisites: Electric Current (I), Potential Difference (V), Resistance (R)
                </div>
              </button>
            );
          })()}
        </div>

        {/* Connecting Arrows */}
        <div className="flex items-center justify-center text-slate-300 dark:text-slate-700 font-mono text-xs">
          <span>↓ Applied to Circuit Networks ↓</span>
        </div>

        {/* Level 3: Circuits */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
            Tier 3: Complex Multi-Component Networks
          </span>
          {(() => {
            const node = nodes[4];
            const mastery = masteries[node.id];
            const isSelected = selectedConceptId === node.id;
            return (
              <button
                type="button"
                onClick={() => setSelectedConceptId(node.id)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/40 dark:bg-sky-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {node.title}
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                      High-Yield Exam Focus (4–6 Marks)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    {mastery.score}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${mastery.score}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  Prerequisites: Ohm's Law (V = IR), Current conservation, Voltage distribution
                </div>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Two-Column Deep Dive: Selected Node Card + Live Interactive Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Selected Concept Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">
                  Concept Details
                </span>
                {trophies.some((t) => t.conceptId === selectedConceptId && t.unlocked) && (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded">
                    <Award className="w-3 h-3 text-amber-500" />
                    <span>Mastery Trophy Earned</span>
                  </span>
                )}
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {selectedInfo.name}
              </h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-extrabold text-sky-600">
                {selectedMastery.score}%
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Mastery</div>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {selectedInfo.description}
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">Primary Formula</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {selectedInfo.formula}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">SI Unit</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedInfo.siUnit}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">Measurement</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedInfo.measuringDevice}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">CBSE Weightage</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedInfo.cbseWeightage}
              </span>
            </div>
          </div>

          {/* Key Principles */}
          <div className="space-y-1.5 text-xs">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Key Physical Principles:
            </span>
            {selectedInfo.keyPrinciples.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{p}</span>
              </div>
            ))}
          </div>

          {/* Common Misconceptions */}
          <div className="space-y-1.5 text-xs">
            <span className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Common Student Misconceptions:</span>
            </span>
            {selectedInfo.commonMisconceptions.map((m, i) => (
              <div
                key={i}
                className="p-2 rounded bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-[11px]"
              >
                "{m}"
              </div>
            ))}
          </div>

          {/* Direct CTA */}
          <button
            type="button"
            onClick={() => {
              onSelectConceptForTutor(selectedConceptId);
              setCurrentPage('tutor');
            }}
            className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Practice {selectedInfo.name} with AI Tutor →</span>
          </button>
        </div>

        {/* Interactive Circuit Laboratory Sandbox */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 uppercase tracking-wider">
                <Sliders className="w-4 h-4" />
                <span>Interactive Sandbox</span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                Ohm's Law & Circuit Lab
              </h3>
            </div>

            {/* Circuit Mode Selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              {(['series', 'parallel', 'single'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSandboxMode(mode)}
                  className={`px-2.5 py-1 rounded font-semibold capitalize transition-all ${
                    sandboxMode === mode
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Circuit Visualizer with animated bulb and current */}
          <CircuitVisualizer
            type={sandboxMode}
            voltage={voltage}
            resistors={[resistor1, resistor2]}
            interactive={true}
            onVoltageChange={setVoltage}
            onResistorChange={(idx, val) => {
              if (idx === 0) setResistor1(val);
              else setResistor2(val);
            }}
          />

          {/* Mathematical Proof Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-500" />
              <span>Real-Time Physics Proof:</span>
            </span>

            {sandboxMode === 'series' && (
              <div className="space-y-1 font-mono text-slate-700 dark:text-slate-300">
                <div>Req = R1 + R2 = {resistor1}Ω + {resistor2}Ω = <span className="font-bold text-indigo-500">{req} Ω</span></div>
                <div>Total Current I = V / Req = {voltage}V / {req}Ω = <span className="font-bold text-emerald-500">{totalI.toFixed(2)} A</span></div>
                <div className="text-[11px] text-slate-500 font-sans">
                  Notice: Current is identical through both resistors. Voltage divides proportionally: V1 = {(totalI * resistor1).toFixed(1)}V, V2 = {(totalI * resistor2).toFixed(1)}V.
                </div>
              </div>
            )}

            {sandboxMode === 'parallel' && (
              <div className="space-y-1 font-mono text-slate-700 dark:text-slate-300">
                <div>1/Req = 1/{resistor1} + 1/{resistor2} ⇒ Req = <span className="font-bold text-indigo-500">{req.toFixed(2)} Ω</span></div>
                <div>Branch 1 Current I1 = V / R1 = {voltage}V / {resistor1}Ω = <span className="font-bold text-sky-500">{i1.toFixed(2)} A</span></div>
                <div>Branch 2 Current I2 = V / R2 = {voltage}V / {resistor2}Ω = <span className="font-bold text-sky-500">{i2.toFixed(2)} A</span></div>
                <div>Total Current I = I1 + I2 = <span className="font-bold text-emerald-500">{totalI.toFixed(2)} A</span></div>
                <div className="text-[11px] text-slate-500 font-sans">
                  Notice: Both branches experience the full {voltage}V. The smaller resistor ({Math.min(resistor1, resistor2)}Ω) draws more current.
                </div>
              </div>
            )}

            {sandboxMode === 'single' && (
              <div className="space-y-1 font-mono text-slate-700 dark:text-slate-300">
                <div>Ohm's Law: I = V / R = {voltage}V / {resistor1}Ω = <span className="font-bold text-emerald-500">{totalI.toFixed(2)} A</span></div>
                <div>Power Dissipated: P = V × I = {voltage}V × {totalI.toFixed(2)}A = <span className="font-bold text-amber-500">{(voltage * totalI).toFixed(1)} W</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
