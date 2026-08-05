"use client";

import { useState } from "react";
import { Bot, Sparkles, CheckCircle, RefreshCw, Send, Layers, ThumbsUp, Star } from "lucide-react";

export default function Dashboard() {
  const [contentType, setContentType] = useState("Product Launch");
  const [platform, setPlatform] = useState("linkedin");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setSelectedIdx(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_profile_id: "demo-profile-1",
          content_type: contentType,
          platform: platform,
        }),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      // Mock Fallback
      setResults({
        variations: [
          {
            variation_no: 1,
            platform: platform,
            content_text: `🚀 Exciting news from NexusAI! We're launching our new AI Marketing OS built specifically for early-stage startup founders. Build your brand memory in minutes and never run out of campaign ideas again.`,
            cta: "Try the interactive demo now",
            style_label: "Direct & Punchy",
          },
          {
            variation_no: 2,
            platform: platform,
            content_text: `Building a startup is hard enough. Marketing shouldn't feel like a second full-time job. Here is how incubator cohort founders are automating consistent social content without hiring agencies.`,
            cta: "Read our founder guide",
            style_label: "Story-driven",
          },
          {
            variation_no: 3,
            platform: platform,
            content_text: `💡 3 Marketing Mistakes early-stage founders make:\n1. Inconsistent messaging\n2. Ignoring target buyer personas\n3. Relying on form-heavy tools\n\nFix them with our incubation AI module.`,
            cta: "Explore the toolkit",
            style_label: "Educational",
          },
        ],
        review_evaluation: {
          overall_score: 92,
          breakdown: { grammar: 95, brand_voice: 90, readability: 92, cta_quality: 90 },
          feedback_notes: "Strong clarity and punchy call to action. Matches your living brand profile.",
        },
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Content Generation Dashboard</h1>
            <p className="text-xs text-slate-400">Living Brand Memory Active • NexusAI</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
          <span className="text-indigo-400">Dashboard</span>
          <span className="hover:text-white cursor-pointer">History</span>
          <span className="hover:text-white cursor-pointer">Brand Memory</span>
          <a href="/dashboard/video-studio" className="px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:text-white transition-all">
            Video Studio (9:16)
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
        {/* Controls Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Campaign Planner & Generator
              </h2>
              <p className="text-xs text-slate-400">Select content objective and target platform.</p>
            </div>

            {/* Platform Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {["linkedin", "facebook", "instagram", "x"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                    platform === p
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Content Type Chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Suggested Content Types
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                "Product Launch",
                "Founder Story",
                "Hiring Post",
                "Customer Success Story",
                "Educational Post",
                "Investment Update",
              ].map((type) => (
                <button
                  key={type}
                  onClick={() => setContentType(type)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                    contentType === type
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Orchestrating Platform Generators...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate Content Variations
              </>
            )}
          </button>
        </div>

        {/* Results Area */}
        {results && (
          <div className="space-y-6">
            {/* Review Evaluation Scorecard */}
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Review & Optimisation Scorecard
                </div>
                <p className="text-xs text-slate-300">{results.review_evaluation?.feedback_notes}</p>
              </div>

              <div className="flex items-center gap-4 text-center">
                <div className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400">Overall</div>
                  <div className="text-sm font-extrabold text-emerald-400">
                    {results.review_evaluation?.overall_score}/100
                  </div>
                </div>
                <div className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400">Grammar</div>
                  <div className="text-sm font-bold text-white">
                    {results.review_evaluation?.breakdown?.grammar}
                  </div>
                </div>
                <div className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400">Brand Voice</div>
                  <div className="text-sm font-bold text-white">
                    {results.review_evaluation?.breakdown?.brand_voice}
                  </div>
                </div>
              </div>
            </div>

            {/* Generated Variations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {results.variations.map((v: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl bg-slate-900 border flex flex-col justify-between space-y-4 transition-all ${
                    selectedIdx === idx
                      ? "border-emerald-500 ring-1 ring-emerald-500/50 bg-slate-900/90"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                        {v.style_label}
                      </span>
                      <span className="text-xs text-slate-500 uppercase font-mono">{v.platform}</span>
                    </div>
                    <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                      {v.content_text}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <div className="text-xs text-slate-400 font-medium">
                      <span className="text-indigo-400">CTA:</span> {v.cta}
                    </div>
                    <button
                      onClick={() => setSelectedIdx(idx)}
                      className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        selectedIdx === idx
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {selectedIdx === idx ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" /> Selected for Campaign
                        </>
                      ) : (
                        <>
                          <ThumbsUp className="w-3.5 h-3.5" /> Select Variation
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
