import Link from "next/link";
import { ArrowRight, Bot, Sparkles, Target, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-300 to-purple-400">
              Incubation AI OS
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/onboarding/chat"
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 hover:opacity-90 transition-all flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-8">
          <Sparkles className="w-3.5 h-3.5" /> AI Marketing Operating System
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mb-6">
          Your Dedicated <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-400 to-purple-400">AI Marketing Manager</span> Built for Founders
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Talk naturally with an AI assistant that understands your startup, builds an evolving Living Brand Memory, and continuously generates multi-platform marketing campaigns.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/onboarding/chat"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            Start Conversational Interview <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold text-base transition-all"
          >
            View Demo Dashboard
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Adaptive Interview</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              No long forms. The missing-information detector asks dynamic follow-up questions to understand your USP, audience, and goals.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Living Brand Memory</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Stores brand voice, personas, taboo topics, and writing preferences into a flexible knowledge layer that evolves with feedback.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Multi-Metric Review</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every post variation is automatically scored for grammar, brand voice, readability, and CTA quality before publishing.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Incubation Centre Official AI Marketing Module • Phase 1 MVP
      </footer>
    </div>
  );
}
