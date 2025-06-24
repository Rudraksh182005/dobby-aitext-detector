import React, { useState } from "react";

const API_KEY = "fw_3ZGFvosGeQjFrmMupLYKZDLx"; //
const API_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
const MODEL = "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new";

const systemPrompt = `
You are an expert AI text authorship detector. Given a code or text sample, return an accurate percentage estimate of how much was written by an AI assistant, how much by a human, and how much is mixed (i.e., parts edited by both). Respond only in the following strict JSON format: 
{
  "ai": <number 0-100>,
  "human": <number 0-100>,
  "mixed": <number 0-100>,
  "explanation": "<one-sentence summary>"
}
Percentages must sum to 100.
`;

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzeText() {
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 256,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input },
          ],
        }),
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      // Try to parse JSON from response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setResult(parsed);
      } else {
        setError("Could not parse AI response.");
      }
    } catch (err) {
      setError("API error. Check your API key or network.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-black">
      {/* Background */}
      <img
        src="/bg.png"
        alt="background"
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-60"
        style={{ pointerEvents: "none" }}
      />
      {/* Overlay for darkening */}
      <div className="fixed inset-0 bg-black opacity-60 z-10 pointer-events-none" />

      <main className="relative z-20 w-full max-w-xl mx-auto p-6 rounded-2xl bg-white/95 shadow-2xl border border-neutral-200 backdrop-blur">
        <header className="flex items-center mb-8">
          <img src="/logo.png" alt="logo" className="w-10 h-10 mr-4 rounded-xl shadow" />
          <h1 className="text-3xl font-bold tracking-wide text-black select-none" style={{ letterSpacing: ".06em" }}>
            AI TEXT DETECTOR
          </h1>
        </header>

        <textarea
          className="w-full rounded-xl border border-neutral-300 p-4 text-base font-mono text-black bg-white min-h-[140px] focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="Paste your code or text here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={7}
        />

        <button
          className={`w-full mt-5 py-3 rounded-xl bg-black text-white text-lg font-semibold tracking-wide shadow hover:bg-neutral-800 transition ${
            loading ? "opacity-60 cursor-not-allowed" : ""
          }`}
          disabled={loading || !input.trim()}
          onClick={analyzeText}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        {error && (
          <div className="mt-6 p-3 bg-red-100 text-red-800 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8">
            <ResultDisplay result={result} />
          </div>
        )}
      </main>
    </div>
  );
}

// --- SVG PIE CHART HELPERS ---
function percentToCoord(percent, radius = 44, cx = 50, cy = 50) {
  const angle = (percent / 100) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}
function makePiePath(startPercent, endPercent, color) {
  const r = 44, cx = 50, cy = 50;
  const start = percentToCoord(startPercent, r, cx, cy);
  const end = percentToCoord(endPercent, r, cx, cy);
  const largeArc = endPercent - startPercent > 50 ? 1 : 0;
  return (
    <path
      d={`
        M ${cx} ${cy}
        L ${start.x} ${start.y}
        A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}
        Z
      `}
      fill={color}
    />
  );
}

function ResultDisplay({ result }) {
  const { ai, human, mixed, explanation } = result;

  // Each slice is drawn in order: AI (blue), Human (green), Mixed (yellow)
  let slices = [];
  let acc = 0;
  if (ai > 0) {
    slices.push(makePiePath(acc, acc + ai, "#38bdf8")); // Sky blue
    acc += ai;
  }
  if (human > 0) {
    slices.push(makePiePath(acc, acc + human, "#22c55e")); // Green
    acc += human;
  }
  if (mixed > 0) {
    slices.push(makePiePath(acc, acc + mixed, "#eab308")); // Amber/Yellow
    acc += mixed;
  }

  // Center % (show the largest segment)
  let maxVal = Math.max(ai, human, mixed);
  let maxLabel = ai === maxVal ? "AI" : human === maxVal ? "Human" : "Mixed";
  let centerColor = ai === maxVal ? "#38bdf8" : human === maxVal ? "#22c55e" : "#eab308";

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative w-32 h-32">
        <svg width={100} height={100} viewBox="0 0 100 100">
          <circle cx={50} cy={50} r={44} fill="#f3f4f6" />
          {slices}
          <text
            x={50}
            y={56}
            textAnchor="middle"
            fontSize="1.8em"
            fontWeight="bold"
            fill={centerColor}
            style={{ dominantBaseline: "middle" }}
          >
            {maxVal}%
          </text>
        </svg>
      </div>
      <div className="flex gap-4 text-sm font-medium" style={{ color: "#111" }}>
        <Legend color="#38bdf8" label="AI" value={ai} />
        <Legend color="#22c55e" label="Human" value={human} />
        <Legend color="#eab308" label="Mixed" value={mixed} />
      </div>
      <div className="mt-2 text-center text-neutral-700 text-base">{explanation}</div>
    </div>
  );
}

function Legend({ color, label, value }) {
  return (
    <span className="flex items-center gap-2" style={{ color: "#111" }}>
      <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
      {label}: <span className="font-bold">{value}%</span>
    </span>
  );
}
