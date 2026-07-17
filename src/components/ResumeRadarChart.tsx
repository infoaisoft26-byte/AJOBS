import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface ResumeRadarChartProps {
  scores: {
    overallScore?: number;
    atsCompatibilityScore?: number;
    grammarScore?: number;
    formattingScore?: number;
    professionalSummaryScore?: number;
    skillsMatchScore?: number;
    experienceScore?: number;
    educationScore?: number;
    achievementsScore?: number;
    keywordOptimizationScore?: number;
  } | null;
}

interface RadarDataPoint {
  axis: string;
  value: number;
  label: string;
  desc: string;
}

export default function ResumeRadarChart({ scores }: ResumeRadarChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<RadarDataPoint | null>(null);
  const [dimensions, setDimensions] = useState({ width: 320, height: 320 });

  // Map the raw scores to structured axis points
  const rawData: RadarDataPoint[] = [
    {
      axis: "ATS Layout",
      value: scores?.atsCompatibilityScore ?? 80,
      label: "ATS Layout Compatibility",
      desc: "Formatting compliance for scanning engines."
    },
    {
      axis: "Grammar",
      value: scores?.grammarScore ?? 85,
      label: "Grammar & Vocabulary",
      desc: "Language integrity and professional expression."
    },
    {
      axis: "Formatting",
      value: scores?.formattingScore ?? 80,
      label: "Visual Balance",
      desc: "Margins, consistency, and spatial spacing."
    },
    {
      axis: "Summary",
      value: scores?.professionalSummaryScore ?? 75,
      label: "Professional Summary Pitch",
      desc: "Hook strength of your career objective."
    },
    {
      axis: "Skills",
      value: scores?.skillsMatchScore ?? 85,
      label: "Skills Alignment Vector",
      desc: "Relevance matching active market demand."
    },
    {
      axis: "Experience",
      value: scores?.experienceScore ?? 78,
      label: "Experience Impact",
      desc: "Action-oriented bullet points and outcomes."
    },
    {
      axis: "Education",
      value: scores?.educationScore ?? 80,
      label: "Education Layout",
      desc: "Academic degrees details structure."
    },
    {
      axis: "Quantifiable",
      value: scores?.achievementsScore ?? 70,
      label: "Quantifiable Achievements",
      desc: "Scale numbers, stats, and milestones."
    },
    {
      axis: "Keywords",
      value: scores?.keywordOptimizationScore ?? 82,
      label: "Keyword Density",
      desc: "Frequency of required target roles terms."
    }
  ];

  // Track size changes of parent element to make it fully fluid
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const size = Math.max(260, Math.min(480, width));
        setDimensions({ width: size, height: size });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const { width, height } = dimensions;
  const margin = 50;
  const radius = Math.min(width, height) / 2 - margin;
  const angleSlice = (Math.PI * 2) / rawData.length;

  // Level grid bounds
  const levels = 5;
  const gridLevels = Array.from({ length: levels }, (_, i) => ((i + 1) / levels) * 100);

  // Line radial generators
  const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

  // Map values to coordinates
  const coordinates = rawData.map((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const valueRadius = rScale(d.value);
    return {
      x: width / 2 + Math.cos(angle) * valueRadius,
      y: height / 2 + Math.sin(angle) * valueRadius,
      data: d
    };
  });

  // Closed path for SVG polygon
  const radarPath = coordinates.reduce((path, p, i) => {
    return `${path} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`;
  }, "") + " Z";

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#090d16] to-black/30 rounded-2xl border border-white/5 shadow-xl relative select-none w-full" ref={containerRef}>
      <h4 className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase mb-4 flex items-center space-x-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
        <span>ATS Vector Resonance Radar</span>
      </h4>

      <div className="relative w-full flex justify-center items-center">
        <svg width={width} height={height} className="overflow-visible">
          {/* Radial Grid Lines & Levels Labels */}
          {gridLevels.map((level, lIdx) => {
            const levelRadius = rScale(level);
            const gridPoints = rawData.map((_, i) => {
              const angle = angleSlice * i - Math.PI / 2;
              return `${width / 2 + Math.cos(angle) * levelRadius},${height / 2 + Math.sin(angle) * levelRadius}`;
            }).join(" ");

            return (
              <g key={`grid-${level}`} className="opacity-40">
                <polygon
                  points={gridPoints}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                <text
                  x={width / 2 + 4}
                  y={height / 2 - levelRadius + 3}
                  className="font-mono text-[7px] fill-indigo-400/50"
                  textAnchor="start"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* Core Axes Radiating Outward */}
          {rawData.map((d, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const endX = width / 2 + Math.cos(angle) * radius;
            const endY = height / 2 + Math.sin(angle) * radius;
            const labelX = width / 2 + Math.cos(angle) * (radius + 20);
            const labelY = height / 2 + Math.sin(angle) * (radius + 14);

            return (
              <g key={`axis-${d.axis}`}>
                <line
                  x1={width / 2}
                  y1={height / 2}
                  x2={endX}
                  y2={endY}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1.2"
                />
                <text
                  x={labelX}
                  y={labelY}
                  className={`font-mono text-[8px] font-bold tracking-wider cursor-help transition-colors duration-200 ${
                    hoveredPoint?.axis === d.axis ? "fill-indigo-400 font-extrabold" : "fill-gray-400"
                  }`}
                  textAnchor={Math.abs(labelX - width / 2) < 10 ? "middle" : labelX > width / 2 ? "start" : "end"}
                  onMouseEnter={() => setHoveredPoint(d)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {d.axis}
                </text>
              </g>
            );
          })}

          {/* Area Gradients & Shading Definition */}
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0.05" />
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Main Filled Area Polygon */}
          <path
            d={radarPath}
            fill="url(#radarGlow)"
            stroke="#6366f1"
            strokeWidth="2"
            filter="url(#glow)"
            className="transition-all duration-300 ease-out"
          />

          {/* Interactive Node/Vertex Rings */}
          {coordinates.map((p, idx) => (
            <circle
              key={`vertex-${idx}`}
              cx={p.x}
              cy={p.y}
              r={hoveredPoint?.axis === p.data.axis ? "6" : "3.5"}
              className="fill-[#090d16] stroke-indigo-400 stroke-[2] cursor-pointer transition-all duration-200 hover:scale-125"
              onMouseEnter={() => setHoveredPoint(p.data)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-[90%] max-w-[280px] bg-[#0c1221]/95 border border-indigo-500/20 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col space-y-1 text-left transition-all duration-300 pointer-events-none ${
          hoveredPoint ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
        }`}>
          {hoveredPoint && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white tracking-wide">{hoveredPoint.label}</span>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono text-[9px] font-black rounded-md border border-indigo-500/30">
                  {hoveredPoint.value}%
                </span>
              </div>
              <p className="text-[9px] text-gray-400 leading-relaxed font-sans">{hoveredPoint.desc}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
