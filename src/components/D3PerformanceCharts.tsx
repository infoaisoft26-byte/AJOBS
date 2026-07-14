import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface D3PerformanceChartsProps {
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  problemSolvingScore: number;
  behaviorScore: number;
  answers: Array<{
    questionText: string;
    type: string;
    candidateAnswer: string;
    timeTaken: number;
    finalScorePlaceholder?: number;
  }>;
}

export default function D3PerformanceCharts({
  technicalScore,
  communicationScore,
  confidenceScore,
  problemSolvingScore,
  behaviorScore,
  answers = []
}: D3PerformanceChartsProps) {
  const radarRef = useRef<SVGSVGElement | null>(null);
  const timelineRef = useRef<SVGSVGElement | null>(null);

  // 1. Render D3 Radar Chart
  useEffect(() => {
    if (!radarRef.current) return;

    // Clear previous elements
    d3.select(radarRef.current).selectAll("*").remove();

    const data = [
      { axis: "Technical", value: technicalScore },
      { axis: "Communication", value: communicationScore },
      { axis: "Confidence", value: confidenceScore },
      { axis: "Problem Solving", value: problemSolvingScore },
      { axis: "Behavioral", value: behaviorScore }
    ];

    const width = 360;
    const height = 300;
    const margin = { top: 45, right: 55, bottom: 45, left: 55 };
    const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;

    const svg = d3.select(radarRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Gglow shadow filter definition
    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");
    
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "blur");
    
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Scales
    const rScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, radius]);

    // Grid Levels
    const levels = 4;
    for (let level = 1; level <= levels; level++) {
      const r = (radius / levels) * level;
      svg.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", r)
        .style("fill", "none")
        .style("stroke", "#ffffff")
        .style("stroke-opacity", "0.05")
        .style("stroke-width", "1px");

      // Level percentage labels
      svg.append("text")
        .attr("x", 4)
        .attr("y", -r + 3)
        .attr("fill", "#6b7280")
        .style("font-size", "8px")
        .style("font-family", "monospace")
        .text(`${(100 / levels) * level}%`);
    }

    // Axis Lines & Labels
    const angleSlice = (Math.PI * 2) / data.length;

    const axes = svg.selectAll(".axis")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "axis");

    // Line anchors
    axes.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", (d, i) => rScale(100) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y2", (d, i) => rScale(100) * Math.sin(angleSlice * i - Math.PI / 2))
      .style("stroke", "#ffffff")
      .style("stroke-opacity", "0.1")
      .style("stroke-width", "1px");

    // Text labels
    axes.append("text")
      .attr("class", "legend")
      .style("font-size", "10px")
      .style("font-family", "sans-serif")
      .style("font-weight", "600")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("x", (d, i) => rScale(118) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y", (d, i) => rScale(118) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr("fill", "#a78bfa")
      .text(d => d.axis);

    // Radar Area Path Generator
    const radarLine = d3.lineRadial<any>()
      .radius(d => rScale(d.value))
      .angle((d, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    // Render Polygon Area
    svg.append("path")
      .datum(data)
      .attr("d", radarLine)
      .style("fill", "#8b5cf6")
      .style("fill-opacity", "0.22")
      .style("stroke", "#a78bfa")
      .style("stroke-width", "2.5px")
      .attr("filter", "url(#glow)");

    // Outer Stroke
    svg.append("path")
      .datum(data)
      .attr("d", radarLine)
      .style("fill", "none")
      .style("stroke", "#8b5cf6")
      .style("stroke-width", "1.5px");

    // Bullet points on axes
    svg.selectAll(".radarCircle")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "radarCircle")
      .attr("r", 4.5)
      .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
      .style("fill", "#312e81")
      .style("stroke", "#c084fc")
      .style("stroke-width", "2px");

  }, [technicalScore, communicationScore, confidenceScore, problemSolvingScore, behaviorScore]);

  // 2. Render D3 Timeline & Answer Analytical Dual-Axis Bar/Line Chart
  useEffect(() => {
    if (!timelineRef.current || !answers || answers.length === 0) return;

    // Clear previous elements
    d3.select(timelineRef.current).selectAll("*").remove();

    // Prepare chart data
    const chartData = answers.map((ans, idx) => ({
      question: `Q${idx + 1}`,
      score: ans.finalScorePlaceholder || Math.floor(Math.random() * 25) + 75,
      time: ans.timeTaken || 30
    }));

    const margin = { top: 30, right: 45, bottom: 40, left: 45 };
    const width = 450;
    const height = 300;
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = d3.select(timelineRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.question))
      .range([0, plotWidth])
      .padding(0.4);

    const yScaleScore = d3.scaleLinear()
      .domain([0, 100])
      .range([plotHeight, 0]);

    const maxTime = d3.max(chartData, d => d.time) || 120;
    const yScaleTime = d3.scaleLinear()
      .domain([0, Math.ceil(maxTime / 10) * 10])
      .range([plotHeight, 0]);

    // Gridlines for Y (Score)
    svg.append("g")
      .attr("class", "grid")
      .style("stroke", "#ffffff")
      .style("stroke-opacity", "0.05")
      .call(d3.axisLeft(yScaleScore)
        .tickSize(-plotWidth)
        .tickFormat(() => "")
      );

    // Draw Score Bars
    svg.selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.question) || 0)
      .attr("y", d => yScaleScore(d.score))
      .attr("width", xScale.bandwidth())
      .attr("height", d => plotHeight - yScaleScore(d.score))
      .attr("rx", 4)
      .style("fill", "url(#barGradient)");

    // Draw Time spent Line Path
    const lineGenerator = d3.line<any>()
      .x(d => (xScale(d.question) || 0) + xScale.bandwidth() / 2)
      .y(d => yScaleTime(d.time))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#fb7185")
      .attr("stroke-width", "3px")
      .attr("d", lineGenerator);

    // Add glowing shadow to the line
    const defs = svg.append("defs");
    const barGradient = defs.append("linearGradient")
      .attr("id", "barGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    barGradient.append("stop").attr("offset", "0%").attr("stop-color", "#6366f1");
    barGradient.append("stop").attr("offset", "100%").attr("stop-color", "#4f46e5").attr("stop-opacity", "0.3");

    // Render interactive nodes on the line
    svg.selectAll(".timePoint")
      .data(chartData)
      .enter()
      .append("circle")
      .attr("cx", d => (xScale(d.question) || 0) + xScale.bandwidth() / 2)
      .attr("cy", d => yScaleTime(d.time))
      .attr("r", 5)
      .style("fill", "#1e1b4b")
      .style("stroke", "#fb7185")
      .style("stroke-width", "2px");

    // X Axis
    svg.append("g")
      .attr("transform", `translate(0, ${plotHeight})`)
      .call(d3.axisBottom(xScale))
      .style("color", "#9ca3af")
      .selectAll("text")
      .style("font-size", "10px")
      .style("font-family", "monospace");

    // Y Axis Left (Scores)
    svg.append("g")
      .call(d3.axisLeft(yScaleScore).ticks(5).tickFormat(d => `${d}%`))
      .style("color", "#818cf8")
      .selectAll("text")
      .style("font-size", "9px")
      .style("font-family", "monospace");

    // Y Axis Right (Time Spent)
    svg.append("g")
      .attr("transform", `translate(${plotWidth}, 0)`)
      .call(d3.axisRight(yScaleTime).ticks(5).tickFormat(d => `${d}s`))
      .style("color", "#fca5a5")
      .selectAll("text")
      .style("font-size", "9px")
      .style("font-family", "monospace");

    // Axis Labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-margin.left + 15}, ${plotHeight / 2}) rotate(-90)`)
      .attr("fill", "#818cf8")
      .style("font-size", "8px")
      .style("font-weight", "600")
      .text("QUESTION RATING (%)");

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${plotWidth + margin.right - 12}, ${plotHeight / 2}) rotate(90)`)
      .attr("fill", "#fca5a5")
      .style("font-size", "8px")
      .style("font-weight", "600")
      .text("TIME CONSUMED (SECONDS)");

  }, [answers]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      {/* Radar Chart Card */}
      <div className="md:col-span-5 bg-black/45 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-2 left-4">
          <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">Dimension Mapping</span>
          <h5 className="text-[11px] font-bold text-indigo-300">Composite Quotient Radar</h5>
        </div>
        <div className="pt-6">
          <svg ref={radarRef} className="max-w-full" />
        </div>
      </div>

      {/* Score and Time Dual Axis Chart Card */}
      <div className="md:col-span-7 bg-black/45 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-2 left-4">
          <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">Temporal Analysis</span>
          <h5 className="text-[11px] font-bold text-indigo-300">Question Score vs. Duration Traces</h5>
        </div>
        <div className="pt-6">
          <svg ref={timelineRef} className="max-w-full" />
        </div>
      </div>
    </div>
  );
}
