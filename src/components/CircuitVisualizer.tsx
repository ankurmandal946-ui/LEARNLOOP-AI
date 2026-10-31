import React, { useId } from 'react';

interface CircuitVisualizerProps {
  type?: 'series' | 'parallel' | 'single' | 'none';
  voltage?: number;
  resistors?: number[];
  interactive?: boolean;
  onVoltageChange?: (v: number) => void;
  onResistorChange?: (index: number, r: number) => void;
}

export const CircuitVisualizer: React.FC<CircuitVisualizerProps> = ({
  type = 'series',
  voltage = 12,
  resistors = [6, 6],
  interactive = false,
  onVoltageChange,
  onResistorChange
}) => {
  const gradientId = useId();
  if (type === 'none') return null;

  const r1 = resistors[0] ?? 6;
  const r2 = resistors[1] ?? 6;

  // Electrical math
  let totalResistance = 6;
  let totalCurrent = 2; // Amperes
  let branchI1 = 1;
  let branchI2 = 1;

  if (type === 'single') {
    totalResistance = r1;
    totalCurrent = totalResistance > 0 ? voltage / totalResistance : 0;
  } else if (type === 'series') {
    totalResistance = r1 + r2;
    totalCurrent = totalResistance > 0 ? voltage / totalResistance : 0;
  } else if (type === 'parallel') {
    totalResistance = (r1 * r2) / ((r1 + r2) || 1);
    totalCurrent = totalResistance > 0 ? voltage / totalResistance : 0;
    branchI1 = r1 > 0 ? voltage / r1 : 0;
    branchI2 = r2 > 0 ? voltage / r2 : 0;
  }

  // Visual brightness factor (0 to 1)
  const bulbBrightness = Math.min(1, Math.max(0.15, totalCurrent / 4));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white flex flex-col gap-3 shadow-inner">
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sky-400">
            {type === 'series' ? 'Series Circuit Schematic' : type === 'parallel' ? 'Parallel Circuit Schematic' : 'Single Conductor Circuit'}
          </span>
          <span className="text-slate-500">·</span>
          <span>Class 10 CBSE Standard</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-amber-400 font-medium">V = {voltage.toFixed(1)} V</span>
          <span className="text-emerald-400 font-medium">I = {totalCurrent.toFixed(2)} A</span>
          <span className="text-indigo-400 font-medium">Req = {totalResistance.toFixed(1)} Ω</span>
        </div>
      </div>

      {/* SVG Circuit Canvas */}
      <div className="relative w-full h-44 bg-slate-950/80 rounded-lg overflow-hidden border border-slate-800/80 flex items-center justify-center">
        <svg
          viewBox="0 0 500 200"
          className="w-full h-full max-h-44 select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id={`bulbGlow-${gradientId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity={bulbBrightness} />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>
            <filter id={`glowFilter-${gradientId}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Wire loop background */}
          {type === 'parallel' ? (
            <>
              {/* Main loop */}
              <path
                d="M 60 100 L 60 50 L 180 50"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                className="animate-[dash_8s_linear_infinite]"
              />
              <path
                d="M 60 100 L 60 150 L 180 150"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
              />
              {/* Parallel branches */}
              {/* Top Branch */}
              <path d="M 180 50 L 180 70 L 320 70 L 320 50" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
              {/* Bottom Branch */}
              <path d="M 180 50 L 180 130 L 320 130 L 320 50" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
              {/* Return to battery */}
              <path d="M 320 50 L 440 50 L 440 100 L 440 150 L 60 150" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            </>
          ) : (
            /* Series or Single Loop */
            <rect
              x="60"
              y="40"
              width="380"
              height="120"
              rx="12"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
          )}

          {/* Battery (Left side: x=60, y=100) */}
          <g transform="translate(60, 100)">
            <line x1="-16" y1="-12" x2="16" y2="-12" stroke="#f8fafc" strokeWidth="3" />
            <line x1="-8" y1="12" x2="8" y2="12" stroke="#94a3b8" strokeWidth="3" />
            <text x="-25" y="-14" fill="#38bdf8" fontSize="11" fontWeight="bold">+</text>
            <text x="-25" y="16" fill="#94a3b8" fontSize="11" fontWeight="bold">-</text>
            <text x="-50" y="4" fill="#f8fafc" fontSize="10" fontFamily="IBM Plex Mono">
              {voltage}V
            </text>
          </g>

          {/* Ammeter (Bottom Wire: x=250, y=160) */}
          <g transform="translate(250, 160)">
            <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
            <text x="0" y="4" fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle">A</text>
            <text x="0" y="24" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="IBM Plex Mono">
              {totalCurrent.toFixed(2)}A
            </text>
          </g>

          {/* Light Bulb (Right Wire: x=440, y=100) */}
          <g transform="translate(440, 100)">
            {/* Bulb Glow */}
            <circle cx="0" cy="0" r={24 * bulbBrightness} fill={`url(#bulbGlow-${gradientId})`} />
            <circle cx="0" cy="0" r="13" fill="#1e293b" stroke="#eab308" strokeWidth="2" />
            <path
              d="M -5 -4 L 5 4 M -5 4 L 5 -4"
              stroke="#fef08a"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <text x="24" y="4" fill="#fef08a" fontSize="10" fontWeight="bold">Bulb</text>
          </g>

          {/* Resistors */}
          {type === 'series' && (
            <>
              {/* Resistor 1 */}
              <g transform="translate(180, 40)">
                <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#1e293b" stroke="#818cf8" strokeWidth="2" />
                <path d="M -18 0 L -12 -5 L -6 5 L 0 -5 L 6 5 L 12 -5 L 18 0" stroke="#818cf8" strokeWidth="1.5" fill="none" />
                <text x="0" y="-12" fill="#c7d2fe" fontSize="10" textAnchor="middle" fontFamily="IBM Plex Mono">
                  R1: {r1}Ω
                </text>
              </g>
              {/* Resistor 2 */}
              <g transform="translate(320, 40)">
                <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#1e293b" stroke="#818cf8" strokeWidth="2" />
                <path d="M -18 0 L -12 -5 L -6 5 L 0 -5 L 6 5 L 12 -5 L 18 0" stroke="#818cf8" strokeWidth="1.5" fill="none" />
                <text x="0" y="-12" fill="#c7d2fe" fontSize="10" textAnchor="middle" fontFamily="IBM Plex Mono">
                  R2: {r2}Ω
                </text>
              </g>
            </>
          )}

          {type === 'parallel' && (
            <>
              {/* Branch 1 Resistor */}
              <g transform="translate(250, 70)">
                <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#1e293b" stroke="#818cf8" strokeWidth="2" />
                <path d="M -18 0 L -12 -5 L -6 5 L 0 -5 L 6 5 L 12 -5 L 18 0" stroke="#818cf8" strokeWidth="1.5" fill="none" />
                <text x="0" y="-12" fill="#c7d2fe" fontSize="10" textAnchor="middle" fontFamily="IBM Plex Mono">
                  R1: {r1}Ω ({branchI1.toFixed(2)}A)
                </text>
              </g>
              {/* Branch 2 Resistor */}
              <g transform="translate(250, 130)">
                <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#1e293b" stroke="#818cf8" strokeWidth="2" />
                <path d="M -18 0 L -12 -5 L -6 5 L 0 -5 L 6 5 L 12 -5 L 18 0" stroke="#818cf8" strokeWidth="1.5" fill="none" />
                <text x="0" y="24" fill="#c7d2fe" fontSize="10" textAnchor="middle" fontFamily="IBM Plex Mono">
                  R2: {r2}Ω ({branchI2.toFixed(2)}A)
                </text>
              </g>
            </>
          )}

          {type === 'single' && (
            <g transform="translate(250, 40)">
              <rect x="-30" y="-10" width="60" height="20" rx="3" fill="#1e293b" stroke="#818cf8" strokeWidth="2" />
              <path d="M -24 0 L -16 -6 L -8 6 L 0 -6 L 8 6 L 16 -6 L 24 0" stroke="#818cf8" strokeWidth="1.8" fill="none" />
              <text x="0" y="-15" fill="#c7d2fe" fontSize="11" textAnchor="middle" fontFamily="IBM Plex Mono">
                R: {r1}Ω
              </text>
            </g>
          )}

          {/* Current Flow Direction Arrow */}
          <g transform="translate(130, 32)">
            <polygon points="0,0 8,4 0,8" fill="#38bdf8" />
            <text x="-4" y="-4" fill="#38bdf8" fontSize="8" fontFamily="IBM Plex Mono">I (Current)</text>
          </g>
        </svg>
      </div>

      {/* Interactive Controls if enabled */}
      {interactive && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-800">
          <div>
            <label className="text-slate-400 block mb-1">
              Supply Voltage: <span className="text-amber-400 font-mono font-medium">{voltage} V</span>
            </label>
            <input
              type="range"
              min="2"
              max="24"
              step="1"
              value={voltage}
              onChange={(e) => onVoltageChange && onVoltageChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">
              Resistor 1: <span className="text-indigo-400 font-mono font-medium">{r1} Ω</span>
            </label>
            <input
              type="range"
              min="1"
              max="24"
              step="1"
              value={r1}
              onChange={(e) => onResistorChange && onResistorChange(0, parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
          {type !== 'single' && (
            <div>
              <label className="text-slate-400 block mb-1">
                Resistor 2: <span className="text-indigo-400 font-mono font-medium">{r2} Ω</span>
              </label>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={r2}
                onChange={(e) => onResistorChange && onResistorChange(1, parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
