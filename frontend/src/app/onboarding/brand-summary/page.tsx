"use client";

import { useState } from "react";
import { Sparkles, Edit3, ArrowRight, ShieldCheck, Tag, Target, Megaphone } from "lucide-react";
import Link from "next/link";

export default function BrandSummary() {
  const [brandProfile, setBrandProfile] = useState({
    brand_name: "NexusAI",
    industry: "AI / B2B SaaS",
    mission: "Empower early-stage startup founders with automated, consistent marketing.",
    brand_voice: "Friendly, Professional, Authoritative",
    buyer_personas: ["Busy Solo Founders", "Incubator Cohort Members", "Non-technical CEOs"],
    keywords: ["AI Marketing", "Automation", "Startup Growth", "Brand Consistency"],
    taboo_topics: ["Overhyped buzzwords", "Aggressive sales pitches", "Competitor bashing"],
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            BP
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Living Brand Memory Summary</h1>
            <p className="text-xs text-slate-400">Knowledge Layer • Synchronized across agents</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
        >
          Confirm & Go to Content Dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-white">Brand Memory Extracted Successfully</h2>
              <p className="text-xs text-slate-300">Every campaign generated will strictly respect these messaging pillars and taboo rules.</p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Megaphone className="w-4 h-4" /> Brand Voice & Tone
            </div>
            <p className="text-lg font-bold text-white">{brandProfile.brand_voice}</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maintains an empathetic tone for founders while delivering direct, actionable marketing value.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
              <Target className="w-4 h-4" /> Target Buyer Personas
            </div>
            <div className="flex flex-wrap gap-2">
              {brandProfile.buyer_personas.map((persona, i) => (
                <span key={i} className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                  {persona}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
              <Tag className="w-4 h-4" /> Core Brand Keywords
            </div>
            <div className="flex flex-wrap gap-2">
              {brandProfile.keywords.map((kw, i) => (
                <span key={i} className="px-3 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium">
                  #{kw}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" /> Taboo Topics & Avoid List
            </div>
            <div className="flex flex-wrap gap-2">
              {brandProfile.taboo_topics.map((topic, i) => (
                <span key={i} className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                  ✕ {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
