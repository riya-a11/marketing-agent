"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  Target,
  Megaphone,
  CheckCircle2,
  Building2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getBrandProfile } from "@/lib/api-client";
import { AsterAvatar } from "@/components/aster-avatar";

export default function BrandSummaryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, any>>({
    brand_name: "NexusAI",
    industry: "AI / B2B SaaS",
    mission: "Automate high-converting marketing for early stage startup founders.",
    brand_voice: "Authoritative, Energetic, Inspiring",
    tone: "Confident & Professional",
    target_audience: "Early stage startup founders & incubator cohort members",
    buyer_personas: ["Tech Solo Founders", "Incubator Cohort Members", "Bootstrapped SaaS Builders"],
    competitors: ["Traditional Marketing Agencies", "Manual Freelancers"],
    taboo_topics: ["Aggressive sales pressure", "Overhyped corporate jargon", "Unrealistic growth promises"],
    hashtags: ["#StartupMarketing", "#AIMarketing", "#FounderJourney"],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getBrandProfile();
        if (data && typeof data === "object") {
          setProfile((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.warn("Using active brand profile from local storage / fallback:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#111215] text-[#FBF9F5] font-sans flex flex-col antialiased">
      {/* Navigation Header */}
      <header className="h-16 border-b border-[#242833] px-6 sm:px-12 flex items-center justify-between bg-[#111215]/90 backdrop-blur-md sticky top-0 z-40">
        <Link href="/" className="font-serif font-bold text-lg text-[#FBF9F5] flex items-center gap-2">
          <span className="text-[#C8BBA8] font-sans font-black">M</span> Marketing OS
        </Link>

        <div className="flex items-center gap-3">
          <AsterAvatar mood="proud" size="sm" showStatus />
          <div className="hidden sm:block text-left">
            <span className="font-serif text-xs font-semibold text-[#FBF9F5]">Aster Verified</span>
            <p className="text-[10px] text-emerald-400 font-mono">100% Truth Grounded</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-md bg-[#F4EFE6] text-[#16181D] font-medium text-xs hover:bg-[#EAE3D2] transition-colors pressable flex items-center gap-1.5 shadow-sm"
        >
          <span>Confirm & Enter Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-6">
        {/* Verification Success Hero Banner */}
        <div className="surface-card rounded-2xl p-6 border border-[#2A2E39] bg-gradient-to-r from-[#16181D] via-[#1B1E26] to-[#16181D] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl sm:text-2xl text-[#FBF9F5]">
                  {profile.brand_name || "Your Brand"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#1C1F26] border border-[#2D323E] text-[11px] font-mono text-[#C8BBA8]">
                  {profile.industry || "B2B SaaS"}
                </span>
              </div>
              <p className="text-xs text-[#9FA4B2] mt-1 max-w-xl leading-relaxed">
                Living Brand Memory synthesized. Aster uses these messaging pillars, tone parameters, and taboo rules to ensure zero hallucination across all marketing channels.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/interview"
              className="px-3.5 py-2 rounded-md bg-[#1C1F26] border border-[#2D323E] text-xs text-[#C5C9D3] hover:text-[#FBF9F5] transition-colors pressable flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake Interview</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-md bg-[#F4EFE6] text-[#16181D] font-medium text-xs hover:bg-[#EAE3D2] transition-colors pressable flex items-center gap-1.5"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Brand Truth Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Core Mission & Value Proposition */}
          <div className="surface-card rounded-xl p-5 border border-[#242833] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9FA4B2]">
              <span className="font-mono text-[10px] text-[#C8BBA8] uppercase tracking-wider">Foundation</span>
              <Building2 className="w-4 h-4 text-[#C8BBA8]" />
            </div>
            <h2 className="font-serif text-base text-[#FBF9F5]">Core Mission & Problem Solved</h2>
            <p className="text-xs text-[#C5C9D3] leading-relaxed bg-[#111215] p-3.5 rounded-lg border border-[#242833]">
              {profile.mission || "Automates high-converting marketing for early stage startup founders."}
            </p>
          </div>

          {/* Card 2: Brand Voice & Persona */}
          <div className="surface-card rounded-xl p-5 border border-[#242833] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9FA4B2]">
              <span className="font-mono text-[10px] text-[#C8BBA8] uppercase tracking-wider">Tone & Style</span>
              <Megaphone className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="font-serif text-base text-[#FBF9F5]">Brand Voice & Personality</h2>
            <div className="p-3.5 rounded-lg bg-[#111215] border border-[#242833] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-300">
                  {profile.brand_voice || "Authoritative & Inspiring"}
                </span>
                <span className="text-[10px] font-mono text-[#9FA4B2]">{profile.tone || "Confident"}</span>
              </div>
              <p className="text-[11px] text-[#9FA4B2]">
                Speaks with empirical evidence, founder conviction, and zero superficial corporate jargon.
              </p>
            </div>
          </div>

          {/* Card 3: Target Audience & Buyer Personas */}
          <div className="surface-card rounded-xl p-5 border border-[#242833] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9FA4B2]">
              <span className="font-mono text-[10px] text-[#C8BBA8] uppercase tracking-wider">Audience Alignment</span>
              <Target className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="font-serif text-base text-[#FBF9F5]">Target Buyer Personas</h2>
            <p className="text-xs text-[#9FA4B2] mb-2">{profile.target_audience}</p>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(profile.buyer_personas) && profile.buyer_personas.length > 0
                ? profile.buyer_personas
                : ["Busy Solo Founders", "Incubator Cohort Members", "Growth Marketers"]
              ).map((persona: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-[#1C1F26] border border-[#2D323E] text-sky-300 text-xs font-medium"
                >
                  ✦ {persona}
                </span>
              ))}
            </div>
          </div>

          {/* Card 4: Taboo Topics & Guardrails */}
          <div className="surface-card rounded-xl p-5 border border-[#242833] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9FA4B2]">
              <span className="font-mono text-[10px] text-rose-400 uppercase tracking-wider">Guardrails & Safety</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <h2 className="font-serif text-base text-[#FBF9F5]">Taboo Topics & Avoid List</h2>
            <p className="text-[11px] text-[#9FA4B2]">
              Aster strictly blocks these patterns during generation and verification passes:
            </p>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(profile.taboo_topics) && profile.taboo_topics.length > 0
                ? profile.taboo_topics
                : ["Overhyped buzzwords", "Aggressive sales pressure", "Unsubstantiated claims"]
              ).map((taboo: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs font-medium"
                >
                  ✕ {taboo}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA Card */}
        <div className="surface-card rounded-xl p-6 border border-[#282C37] text-center space-y-4">
          <AsterAvatar mood="happy" size="md" className="mx-auto" />
          <div className="space-y-1">
            <h3 className="font-serif text-lg text-[#FBF9F5]">Ready to turn company updates into compelling stories?</h3>
            <p className="text-xs text-[#9FA4B2] max-w-md mx-auto">
              Your brand profile is locked in. Drop your first engineering changelog or milestone into the Studio flywheel.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#F4EFE6] text-[#16181D] font-medium text-xs hover:bg-[#EAE3D2] transition-colors pressable shadow-md"
          >
            <span>Proceed to Marketing Studio Flywheel</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
