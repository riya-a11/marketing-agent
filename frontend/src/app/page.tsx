"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Sliders,
  Laptop,
  Play,
  Mail,
  Video,
  Calendar as CalendarIcon,
  BarChart2,
  Check,
} from "lucide-react";
import { AsterAvatar } from "@/components/aster-avatar";
import { AsterChatDrawer } from "@/components/aster-chat-drawer";

export default function LandingPage() {
  const [demoInput, setDemoInput] = useState(
    "We reduced sync latency by 70% with a new architecture."
  );
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#111215] text-[#FBF9F5] font-sans antialiased selection:bg-[#EAE3D2] selection:text-[#16181D]">
      {/* Navigation */}
      <header className="h-20 border-b border-[#242833] px-6 sm:px-12 flex items-center justify-between sticky top-0 z-40 bg-[#111215]/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="font-serif font-bold text-xl tracking-tight text-[#FBF9F5]">
            <span className="text-[#C8BBA8] mr-1.5 font-sans font-black">M</span> Marketing OS
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#9FA4B2]">
          <a href="#product" className="hover:text-[#FBF9F5] transition-colors">Product</a>
          <a href="#how-it-works" className="hover:text-[#FBF9F5] transition-colors">How it works</a>
          <a href="#customers" className="hover:text-[#FBF9F5] transition-colors">Customers</a>
          <a href="#pricing" className="hover:text-[#FBF9F5] transition-colors">Pricing</a>
          <a href="#resources" className="hover:text-[#FBF9F5] transition-colors">Resources</a>
        </nav>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/login"
            className="px-4 py-2 rounded-md text-[#9FA4B2] hover:text-[#FBF9F5] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-md bg-[#F4EFE6] text-[#16181D] font-medium hover:bg-[#EAE3D2] transition-all pressable flex items-center gap-1.5"
          >
            <span>Get early access</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-20 px-6 sm:px-12 max-w-6xl mx-auto flex flex-col items-center text-center relative">
        <p className="text-[11px] font-mono tracking-widest text-[#9FA4B2] uppercase mb-5">
          For Founders and Lean Teams
        </p>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-normal tracking-tight text-[#FBF9F5] max-w-4xl leading-[1.08] mb-6">
          From what you shipped to what the world sees.
        </h1>

        <p className="text-[#9FA4B2] text-base sm:text-lg max-w-2xl font-light leading-relaxed mb-8">
          Turn company updates into strategic, evidence-grounded content for every channel — in minutes, not days.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Link
            href="/dashboard"
            className="px-7 py-3 rounded-md bg-[#F4EFE6] text-[#16181D] font-medium hover:bg-[#EAE3D2] transition-all pressable flex items-center gap-2 text-sm shadow-md"
          >
            <span>Get early access</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/interview"
            className="px-6 py-3 rounded-md bg-[#1C1F26] border border-[#2D323E] text-[#FBF9F5] text-sm hover:bg-[#232731] transition-all pressable flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch a 2 min demo</span>
          </Link>
        </div>

        {/* Interactive Floating Mockup Preview */}
        <div className="w-full max-w-3xl relative">
          <div className="surface-card rounded-xl p-6 sm:p-8 text-left shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <span className="font-serif text-lg sm:text-xl text-[#FBF9F5]">What happened?</span>
              <span className="text-[11px] text-[#9FA4B2] font-mono">STEP 01</span>
            </div>

            <div className="relative mb-5">
              <input
                type="text"
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                className="w-full bg-[#111215] border border-[#2A2E39] rounded-lg px-4 py-3.5 text-sm text-[#FBF9F5] focus:border-[#C8BBA8] outline-none pr-12 font-sans"
              />
              <Link
                href="/dashboard"
                className="absolute right-2 top-2 bottom-2 px-3 rounded-md bg-[#F4EFE6] text-[#16181D] flex items-center justify-center hover:bg-[#EAE3D2] transition-colors pressable"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Social Channel Support Icons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#242833] text-xs text-[#9FA4B2]">
              <div className="flex items-center gap-4">
                <span className="text-[11px] uppercase font-mono tracking-wider">Distributes To:</span>
                <div className="flex items-center gap-2 text-[#C5C9D3]">
                  <span className="p-1 rounded bg-[#1C1F26] border border-[#2D323E] font-bold text-[10px] text-[#0A66C2] px-1.5">in</span>
                  <span className="p-1 rounded bg-[#1C1F26] border border-[#2D323E] font-bold text-[10px] px-1.5">X</span>
                  <span className="p-1 rounded bg-[#1C1F26] border border-[#2D323E] font-bold text-[10px] text-[#E1306C] px-1.5">IG</span>
                  <span className="p-1.5 rounded bg-[#1C1F26] border border-[#2D323E]"><Mail className="w-3.5 h-3.5" /></span>
                  <span className="p-1.5 rounded bg-[#1C1F26] border border-[#2D323E]"><Video className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              <span className="font-script text-base text-[#D4C9B8] hidden sm:inline">
                One idea. Multiple stories. Real impact.
              </span>
            </div>
          </div>

          {/* Aster Companion Preview Badge */}
          <div className="absolute -top-4 -right-4 sm:-right-6 surface-card rounded-full p-1.5 pr-3.5 border border-[#3A3F4D] flex items-center gap-2 shadow-lg">
            <AsterAvatar mood="curious" size="xs" />
            <span className="text-[11px] text-[#C5C9D3] font-medium">Aster is ready</span>
          </div>
        </div>

        {/* Feature Value Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-12 w-full max-w-4xl text-xs text-[#C5C9D3]">
          <div className="surface-card rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 text-center">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Evidence-backed content</span>
          </div>
          <div className="surface-card rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 text-center">
            <Laptop className="w-4 h-4 text-[#C8BBA8]" />
            <span>Built for technical SaaS teams</span>
          </div>
          <div className="surface-card rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 text-center">
            <Layers className="w-4 h-4 text-[#C8BBA8]" />
            <span>Multi-channel by design</span>
          </div>
          <div className="surface-card rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 text-center">
            <Lock className="w-4 h-4 text-[#10B981]" />
            <span>Human approval always</span>
          </div>
          <div className="surface-card rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 text-center col-span-2 sm:col-span-1">
            <Sliders className="w-4 h-4 text-[#C8BBA8]" />
            <span>Your brand voice, not AI slop</span>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-16 pt-10 border-t border-[#242833] w-full max-w-3xl flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-[#9FA4B2]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#6C7282]">
            Trusted by builders at:
          </span>
          <div className="flex items-center gap-8 text-[#C5C9D3] font-medium tracking-tight">
            <span>▲ Vercel</span>
            <span>Linear</span>
            <span>supabase</span>
            <span>Notion</span>
          </div>
        </div>
      </section>

      {/* Quote Banner from Mood Board */}
      <section className="py-16 border-y border-[#242833] bg-[#14161B] text-center px-6">
        <blockquote className="font-serif text-2xl sm:text-3xl text-[#FBF9F5] max-w-2xl mx-auto mb-3 font-normal">
          &ldquo;Great marketing isn&rsquo;t louder. It&rsquo;s truer.&rdquo;
        </blockquote>
        <p className="font-script text-lg text-[#C8BBA8]">
          &mdash; The Marketing OS Philosophy
        </p>
      </section>

      {/* 6 Product Workflow Pages Showcase (Replicating Image 2) */}
      <section id="product" className="py-20 px-6 sm:px-12 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#9FA4B2]">Complete System Architecture</p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#FBF9F5]">The 6 Stages of Marketing OS</h2>
          <p className="text-[#9FA4B2] text-sm max-w-xl mx-auto">
            From raw engineering logs to verifiable claims, scheduled distribution, and content performance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Input */}
          <div className="surface-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9FA4B2]">
              <span className="font-mono text-[10px] text-[#C8BBA8]">01 // INGESTION</span>
              <span className="px-2 py-0.5 rounded bg-[#1C1F26] border border-[#2D323E] text-[10px]">What happened?</span>
            </div>
            <h3 className="font-serif text-lg text-[#FBF9F5]">Raw Update Input</h3>
            <p className="text-xs text-[#9FA4B2] leading-relaxed">
              Drop changelog updates, customer quotes, or benchmark data. Aster extracts grounded evidence nodes.
            </p>
            <div className="p-3 rounded bg-[#111215] border border-[#242833] text-[11px] text-[#C5C9D3] italic font-serif">
              &ldquo;We reduced sync latency by 70% with a new architecture.&rdquo;
            </div>
          </div>

          {/* 2. Angles */}
          <div className="surface-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9FA4B2]">
              <span className="font-mono text-[10px] text-[#C8BBA8]">02 // STRATEGY</span>
              <span className="px-2 py-0.5 rounded bg-[#1C1F26] border border-[#2D323E] text-[10px]">3 Angles</span>
            </div>
            <h3 className="font-serif text-lg text-[#FBF9F5]">Strategic Angles</h3>
            <p className="text-xs text-[#9FA4B2] leading-relaxed">
              Choose the story worth telling: Engineering Story, Customer Outcome, or Founder Conviction.
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center p-1.5 rounded bg-[#1C1F26] border border-[#2D323E]">
                <span>Engineering Story</span>
                <span className="text-emerald-400 font-mono text-[10px]">Best fit &bull; 92%</span>
              </div>
              <div className="flex justify-between items-center p-1.5 rounded bg-[#1C1F26]/60 text-[#9FA4B2]">
                <span>Customer Outcome</span>
                <span className="font-mono text-[10px]">68%</span>
              </div>
            </div>
          </div>

          {/* 3. Content Preview */}
          <div className="surface-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9FA4B2]">
              <span className="font-mono text-[10px] text-[#C8BBA8]">03 // EDITORIAL</span>
              <span className="px-2 py-0.5 rounded bg-[#1C1F26] border border-[#2D323E] text-[10px]">Content Ready</span>
            </div>
            <h3 className="font-serif text-lg text-[#FBF9F5]">Multi-Channel Studio</h3>
            <p className="text-xs text-[#9FA4B2] leading-relaxed">
              Platform-native editorial copy crafted specifically for LinkedIn, X threads, Instagram carousels, and email.
            </p>
            <div className="p-3 rounded bg-[#111215] border border-[#242833] text-[11px] text-[#C5C9D3]">
              <span className="text-[#10B981] font-mono text-[10px]">&check; 3 claims &bull; All verified</span>
              <p className="mt-1 line-clamp-2">We just reduced sync latency by 70%. For teams building real-time apps...</p>
            </div>
          </div>

          {/* 4. Verification */}
          <div className="surface-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9FA4B2]">
              <span className="font-mono text-[10px] text-[#10B981]">04 // EVIDENCE GATE</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 text-[10px]">Zero Slop</span>
            </div>
            <h3 className="font-serif text-lg text-[#FBF9F5]">Claims Verification</h3>
            <p className="text-xs text-[#9FA4B2] leading-relaxed">
              Deterministic verification gate flags ungrounded statistics and hard-blocks prohibited superlatives.
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="p-1.5 rounded bg-emerald-950/30 border border-emerald-800/30 text-emerald-300 flex justify-between">
                <span>Sync latency reduced 70%</span>
                <span>Verified</span>
              </div>
              <div className="p-1.5 rounded bg-amber-950/30 border border-amber-800/30 text-amber-300 flex justify-between">
                <span>Faster user workflows</span>
                <span>Needs evidence</span>
              </div>
            </div>
          </div>

          {/* 5. Calendar */}
          <div className="surface-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9FA4B2]">
              <span className="font-mono text-[10px] text-[#C8BBA8]">05 // SCHEDULE</span>
              <span className="px-2 py-0.5 rounded bg-[#1C1F26] border border-[#2D323E] text-[10px]">Autopilot</span>
            </div>
            <h3 className="font-serif text-lg text-[#FBF9F5]">Content Calendar</h3>
            <p className="text-xs text-[#9FA4B2] leading-relaxed">
              Plan publication slots across days and weeks. Natural language ingestion supports one-click scheduling.
            </p>
            <div className="p-2.5 rounded bg-[#111215] border border-[#242833] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-[#C8BBA8]" />
                <span>March 2025 &bull; 4 queued</span>
              </div>
              <span className="text-[#C8BBA8] font-mono text-[10px]">Ready</span>
            </div>
          </div>

          {/* 6. Analytics */}
          <div className="surface-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9FA4B2]">
              <span className="font-mono text-[10px] text-[#C8BBA8]">06 // TELEMETRY</span>
              <span className="px-2 py-0.5 rounded bg-[#1C1F26] border border-[#2D323E] text-[10px]">Live Data</span>
            </div>
            <h3 className="font-serif text-lg text-[#FBF9F5]">Performance Insights</h3>
            <p className="text-xs text-[#9FA4B2] leading-relaxed">
              Real engagement tracking across all published channels. Direct metrics on what resonates with your audience.
            </p>
            <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
              <div className="p-2 rounded bg-[#1C1F26] border border-[#2D323E]">
                <div className="font-serif font-bold text-sm text-[#FBF9F5]">24.8K</div>
                <div className="text-[#9FA4B2] text-[10px]">Impressions (+12%)</div>
              </div>
              <div className="p-2 rounded bg-[#1C1F26] border border-[#2D323E]">
                <div className="font-serif font-bold text-sm text-[#FBF9F5]">2.1K</div>
                <div className="text-[#9FA4B2] text-[10px]">Engagements (+43%)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Aster Showcase Section (Replicating Image 3) */}
      <section className="py-20 px-6 sm:px-12 border-t border-[#242833] bg-[#14161B]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-1/2 flex justify-center">
            <div className="relative w-64 h-80 sm:w-72 sm:h-96 rounded-2xl overflow-hidden border border-[#3A3F4D] shadow-2xl bg-[#111215]">
              <Image
                src="/aster/aster_hero.png"
                alt="Aster the AI Marketing Strategist"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="w-full md:w-1/2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1F26] border border-[#2D323E] text-xs font-mono text-[#D4C9B8]">
              <span>✦</span>
              <span>AI MARKETING STRATEGIST</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-serif text-[#FBF9F5]">
              Meet Aster.
            </h2>

            <p className="text-[#9FA4B2] text-sm sm:text-base leading-relaxed font-light">
              Your in-house marketing strategist. Always on your side. Aster lives inside Marketing OS &mdash; observing, analysing, questioning and cheering you on as you turn ideas into impact.
            </p>

            <blockquote className="border-l-2 border-[#C8BBA8] pl-4 py-1 italic font-serif text-sm text-[#E5E2DC]">
              &ldquo;Good marketing is a form of clarity.&rdquo; &mdash; Aster
            </blockquote>

            <div className="pt-2 flex items-center gap-4">
              <button
                onClick={() => setChatOpen(true)}
                className="px-5 py-2.5 rounded-md bg-[#F4EFE6] text-[#16181D] font-medium text-xs hover:bg-[#EAE3D2] transition-colors pressable flex items-center gap-2"
              >
                <AsterAvatar mood="happy" size="xs" />
                <span>Talk to Aster</span>
              </button>

              <span className="font-script text-base text-[#C8BBA8]">
                Think deeper. Ship louder.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 sm:px-12 border-t border-[#242833] max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9FA4B2]">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-sm text-[#FBF9F5]">Marketing OS</span>
          <span>&copy; 2026</span>
        </div>
        <p className="font-script text-sm text-[#C8BBA8]">
          Progress deserves a stage.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/login" className="hover:text-[#FBF9F5]">Sign In</Link>
          <Link href="/dashboard" className="hover:text-[#FBF9F5]">Launch Studio</Link>
        </div>
      </footer>

      {/* Floating On-demand Aster Chat Drawer */}
      <AsterChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
