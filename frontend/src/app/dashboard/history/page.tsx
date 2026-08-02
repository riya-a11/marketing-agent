"use client";

import { useState } from "react";
import { History, Copy, RefreshCw, Layers, Check } from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const campaigns = [
    {
      id: "1",
      title: "NexusAI Launch Post",
      type: "Product Launch",
      platform: "LinkedIn",
      date: "2026-08-01",
      text: "🚀 Exciting news! We are launching our new AI Marketing OS built specifically for early-stage startup founders. Build your brand memory in minutes and never run out of campaign ideas again.",
    },
    {
      id: "2",
      title: "Founder Journey & Lessons",
      type: "Founder Story",
      platform: "X / Twitter",
      date: "2026-07-28",
      text: "Building a startup is hard enough. Marketing shouldn't feel like a second full-time job. Here is how incubator cohort founders are automating consistent social content.",
    },
    {
      id: "3",
      title: "3 Marketing Mistakes to Avoid",
      type: "Educational Post",
      platform: "LinkedIn",
      date: "2026-07-25",
      text: "💡 3 Marketing Mistakes early-stage founders make:\n1. Inconsistent messaging\n2. Ignoring buyer personas\n3. Form-heavy tools\n\nFix them with our incubation AI module.",
    },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Campaign History</h1>
            <p className="text-xs text-slate-400">Stored Historical Content • NexusAI</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all"
        >
          Back to Dashboard
        </Link>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                    {c.type}
                  </span>
                  <h2 className="text-sm font-bold text-white">{c.title}</h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                  <span>{c.platform}</span>
                  <span>•</span>
                  <span>{c.date}</span>
                </div>
              </div>

              <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                {c.text}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleCopy(c.id, c.text)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all"
                >
                  {copiedId === c.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Text
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
