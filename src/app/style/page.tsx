"use client";

import { useState, useEffect } from "react";

interface StyleAnalysis {
  styleProfile: {
    aesthetic: string;
    description: string;
  };
  categoryBalance: {
    breakdown: Record<string, number>;
    assessment: string;
    suggestion: string;
  };
  colorAnalysis: {
    dominantColors: string[];
    missingColors: string[];
    assessment: string;
  };
  gaps: Array<{
    item: string;
    reason: string;
  }>;
  seasonalCoverage: {
    strong: string[];
    weak: string[];
    suggestion: string;
  };
}

const CACHE_KEY = "wardrobe-style-analysis";

export default function StylePage() {
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setAnalysis(JSON.parse(cached));
      } catch { /* ignore bad cache */ }
    }
  }, []);

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/style-analysis", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Analysis failed");
        return;
      }
      const data = await res.json();
      setAnalysis(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-ink">
            Style Analysis
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            AI-powered insights about your wardrobe
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-5 py-2.5 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors"
        >
          {loading ? "Analyzing..." : analysis ? "Re-analyze" : "Analyze My Wardrobe"}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-4" />
          <p className="text-stone-600 text-sm">Analyzing your wardrobe style...</p>
          <p className="text-stone-400 text-xs mt-1">This may take a few seconds</p>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-3">{error}</p>
      )}

      {!loading && analysis && (
        <div className="space-y-6">
          {/* Style Profile */}
          <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Your Style
            </h2>
            <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-ink mb-2">
              {analysis.styleProfile.aesthetic}
            </p>
            <p className="text-stone-600 text-sm leading-relaxed">
              {analysis.styleProfile.description}
            </p>
          </section>

          {/* Category Balance */}
          <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
              Category Balance
            </h2>
            <div className="grid grid-cols-5 gap-3 mb-4">
              {Object.entries(analysis.categoryBalance.breakdown).map(([cat, count]) => (
                <div key={cat} className="text-center">
                  <div className="text-2xl font-bold text-ink">{count}</div>
                  <div className="text-xs text-stone-500 capitalize">
                    {cat.toLowerCase().replace("_", " ")}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-stone-600 text-sm">{analysis.categoryBalance.assessment}</p>
            <p className="text-stone-800 text-sm font-medium mt-2">
              {analysis.categoryBalance.suggestion}
            </p>
          </section>

          {/* Color Analysis */}
          <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
              Color Palette
            </h2>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <p className="text-xs text-stone-500 mb-2">Dominant</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.colorAnalysis.dominantColors.map((color) => (
                    <span
                      key={color}
                      className="px-2.5 py-1 bg-stone-100 rounded-full text-xs font-medium text-stone-700"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs text-stone-500 mb-2">Missing</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.colorAnalysis.missingColors.map((color) => (
                    <span
                      key={color}
                      className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-700"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-stone-600 text-sm">{analysis.colorAnalysis.assessment}</p>
          </section>

          {/* Gaps & Recommendations */}
          <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
              Recommended Additions
            </h2>
            <div className="space-y-3">
              {analysis.gaps.map((gap, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-stone-800 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{gap.item}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{gap.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Seasonal Coverage */}
          <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
              Seasonal Coverage
            </h2>
            <div className="flex gap-6 mb-3">
              {analysis.seasonalCoverage.strong.length > 0 && (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Strong</p>
                  <div className="flex gap-1.5">
                    {analysis.seasonalCoverage.strong.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.seasonalCoverage.weak.length > 0 && (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Needs Work</p>
                  <div className="flex gap-1.5">
                    {analysis.seasonalCoverage.weak.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-stone-600 text-sm">{analysis.seasonalCoverage.suggestion}</p>
          </section>
        </div>
      )}

      {!loading && !analysis && !error && (
        <div className="text-center py-16 text-stone-400 text-sm">
          Click &quot;Analyze My Wardrobe&quot; to get AI-powered style insights.
        </div>
      )}
    </div>
  );
}
