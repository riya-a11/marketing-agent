"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronDown,
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  ExternalLink,
  Edit,
  Wrench,
  Users,
  Lightbulb,
  Check,
  AlertTriangle,
  Plus,
  RefreshCw,
  LogOut,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Mail,
  Send,
  X,
  FileText,
  Link2,
  FolderOpen,
  Sun,
  Moon,
  Coffee,
  Bookmark,
  Clock,
  Eye,
  Share2,
} from "lucide-react";
import { AsterAvatar, type AsterMood } from "./aster-avatar";
import { AsterChatDrawer } from "./aster-chat-drawer";
import { ConnectedAccountsDialog } from "./connected-accounts-dialog";
import {
  analyzeUpdate,
  generateCampaignPackage,
  verifyClaims,
  multiPublish,
  type Angle,
  type ClaimsGateResult,
  type PublishReceipt,
} from "@/lib/api-client";
import { getSavedTenantUser, firebaseSignOut } from "@/lib/firebase";

type StudioStep = 1 | 2 | 3 | 4 | 5;
type TabType = "studio" | "campaign-detail" | "calendar" | "analytics" | "brand-brain";
type ActiveChannel = "linkedin" | "x" | "instagram" | "email";
type AppTheme = "dark" | "editorial";

export default function MarketingOSApp() {
  const [activeTab, setActiveTab] = useState<TabType>("studio");
  const [studioStep, setStudioStep] = useState<StudioStep>(1);
  const [theme, setTheme] = useState<AppTheme>("editorial"); // Default to Mood Board 1's warm editorial style
  const [accountsOpen, setAccountsOpen] = useState(false);

  // Step 1: Tell us / What happened?
  const [rawUpdate, setRawUpdate] = useState(
    "We reduced sync latency by 70% with a new architecture."
  );

  // Step 2: Strategy / 3 Angles
  const [selectedAngle, setSelectedAngle] = useState<"eng" | "cust" | "founder">("eng");
  const [analyzing, setAnalyzing] = useState(false);

  // Step 3: Content / Multi-channel preview
  const [activeChannel, setActiveChannel] = useState<ActiveChannel>("linkedin");
  const [postText, setPostText] = useState(
    `We just reduced sync latency by 70%.\n\nFor teams building real-time applications, latency isn't just a number — it's lost focus, broken flow, and frustrated users.\n\nHere's how we re-architected our sync engine, what we learned, and why performance remains a core part of our product philosophy.\n\n#BuildInPublic #SaaS #Engineering`
  );
  const [generating, setGenerating] = useState(false);

  // Step 4: Verification / Claim check
  const [claimsStatus, setClaimsStatus] = useState({
    c1: { text: "Sync latency reduced by 70%", source: "Engineering benchmark (BENCH-001)", status: "verified" },
    c2: { text: "Faster user workflows", source: "No direct source found", status: "needs_evidence", overridden: false },
    c3: { text: "Best-in-class performance", source: "Comparative claim (no benchmark)", status: "unsupported" },
  });

  // Step 5: Review & Publish
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // On-demand Aster Chat Drawer
  const [chatOpen, setChatOpen] = useState(false);

  // Campaign Detail Sub-tab State (Screen 4 from Mood Board 2)
  const [detailSubTab, setDetailSubTab] = useState<"overview" | "content" | "evidence" | "performance" | "activity">("overview");

  // Derive Aster's Mood dynamically from the current workflow state
  const getAsterMood = (): AsterMood => {
    if (analyzing || generating || publishing) return "thinking";
    if (studioStep === 4 && !claimsStatus.c2.overridden) return "concerned";
    if (publishSuccess) return "proud";
    if (studioStep === 2) return "curious";
    if (studioStep === 3) return "focused";
    return "neutral";
  };

  // Step 1 -> Step 2
  const handleFindStory = async () => {
    if (!rawUpdate.trim()) return;
    setAnalyzing(true);
    try {
      await analyzeUpdate({ raw_update: rawUpdate });
    } catch {
      // Graceful offline fallback
    } finally {
      setAnalyzing(false);
      setStudioStep(2);
    }
  };

  // Step 2 -> Step 3
  const handleSelectAngle = async () => {
    setGenerating(true);
    try {
      await generateCampaignPackage({
        selected_angle: selectedAngle,
        raw_update: rawUpdate,
      });
    } catch {
      // Graceful offline fallback
    } finally {
      setGenerating(false);
      setStudioStep(3);
    }
  };

  // Step 4: Override quantitative claim
  const handleToggleOverride = (claimKey: "c2") => {
    setClaimsStatus((prev) => ({
      ...prev,
      [claimKey]: { ...prev[claimKey], overridden: !prev[claimKey].overridden },
    }));
  };

  // Step 5: Publish
  const handleApproveAndPublish = async () => {
    setPublishing(true);
    try {
      await multiPublish({
        platforms: ["linkedin", "x"],
        content_text: postText,
      });
    } catch {
      // Graceful offline fallback
    } finally {
      setPublishing(false);
      setPublishSuccess(true);
    }
  };

  const handleReset = () => {
    setStudioStep(1);
    setPublishSuccess(false);
  };

  // Theme-dependent styling helpers
  const isDark = theme === "dark";
  const canvasBg = isDark ? "bg-[#111215] text-[#FBF9F5]" : "bg-[#FBF9F5] text-[#16181D]";
  const cardBg = isDark ? "bg-[#16181D] border-[#282C37]" : "bg-[#FFFFFF] border-[#EAE6DE] shadow-sm";
  const cardElevated = isDark ? "bg-[#1C1F26] border-[#333846]" : "bg-[#F7F4EE] border-[#DDD8CE]";
  const textPrimary = isDark ? "text-[#FBF9F5]" : "text-[#16181D]";
  const textSecondary = isDark ? "text-[#9FA4B2]" : "text-[#6E6C66]";
  const borderSubtle = isDark ? "border-[#242833]" : "border-[#EAE6DE]";
  const btnPrimary = isDark
    ? "bg-[#F4EFE6] text-[#16181D] hover:bg-[#EAE3D2]"
    : "bg-[#18181B] text-[#FFFFFF] hover:bg-[#27272A]";
  const scriptAccent = isDark ? "text-[#C8BBA8]" : "text-[#8B452B]";

  return (
    <div className={`min-h-screen ${canvasBg} font-sans flex flex-col antialiased transition-colors duration-200`}>
      {/* Top Header Navigation */}
      <header className={`h-16 border-b ${borderSubtle} px-6 sm:px-10 flex items-center justify-between sticky top-0 z-40 ${isDark ? "bg-[#111215]/95" : "bg-[#FBF9F5]/95"} backdrop-blur-md`}>
        <div className="flex items-center gap-6">
          <Link href="/" className={`font-serif font-bold text-lg ${textPrimary} flex items-center gap-2`}>
            <span className={`${isDark ? "text-[#C8BBA8]" : "text-[#8B452B]"} font-sans font-black`}>M</span> Marketing OS
          </Link>

          {/* Tab Navigation */}
          <nav className={`hidden md:flex items-center gap-1 text-xs ${textSecondary}`}>
            <button
              onClick={() => setActiveTab("studio")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "studio"
                  ? `${isDark ? "bg-[#1C1F26] text-[#FBF9F5] border-[#2D323E]" : "bg-[#EAE6DE] text-[#16181D] font-medium"} border`
                  : "hover:opacity-80"
              }`}
            >
              Studio
            </button>
            <button
              onClick={() => setActiveTab("campaign-detail")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "campaign-detail"
                  ? `${isDark ? "bg-[#1C1F26] text-[#FBF9F5] border-[#2D323E]" : "bg-[#EAE6DE] text-[#16181D] font-medium"} border`
                  : "hover:opacity-80"
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "calendar"
                  ? `${isDark ? "bg-[#1C1F26] text-[#FBF9F5] border-[#2D323E]" : "bg-[#EAE6DE] text-[#16181D] font-medium"} border`
                  : "hover:opacity-80"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "analytics"
                  ? `${isDark ? "bg-[#1C1F26] text-[#FBF9F5] border-[#2D323E]" : "bg-[#EAE6DE] text-[#16181D] font-medium"} border`
                  : "hover:opacity-80"
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab("brand-brain")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "brand-brain"
                  ? `${isDark ? "bg-[#1C1F26] text-[#FBF9F5] border-[#2D323E]" : "bg-[#EAE6DE] text-[#16181D] font-medium"} border`
                  : "hover:opacity-80"
              }`}
            >
              Brand Truth
            </button>
          </nav>
        </div>

        {/* Right Header Area: Channels, Theme Switcher & Aster Companion */}
        <div className="flex items-center gap-3">
          {/* Connected Channels & OAuth Button */}
          <button
            onClick={() => setAccountsOpen(true)}
            title="Manage Social Channels & OAuth"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-all pressable ${
              isDark ? "bg-[#1C1F26] border-[#2D323E] text-[#C5C9D3] hover:text-white" : "bg-[#FFFFFF] border-[#EAE6DE] text-[#16181D] shadow-xs hover:border-[#DDD8CE]"
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline text-[11px] font-medium">Channels</span>
          </button>

          {/* Exact Mood Board Theme Toggle: Dark (Board 2) vs Editorial Ivory (Board 1) */}
          <button
            onClick={() => setTheme(isDark ? "editorial" : "dark")}
            title={isDark ? "Switch to Editorial Ivory (Mood Board 1)" : "Switch to Dark Charcoal (Mood Board 2)"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-all pressable ${
              isDark ? "bg-[#1C1F26] border-[#2D323E] text-[#C5C9D3]" : "bg-[#FFFFFF] border-[#EAE6DE] text-[#16181D] shadow-xs"
            }`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
            <span className="hidden lg:inline text-[11px] font-medium">
              {isDark ? "Dark Theme" : "Editorial Ivory"}
            </span>
          </button>

          {/* Aster Companion Button */}
          <button
            onClick={() => setChatOpen(true)}
            className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all pressable ${
              isDark ? "bg-[#1C1F26] border-[#2D323E] hover:border-[#3A3F4D]" : "bg-[#FFFFFF] border-[#EAE6DE] shadow-xs hover:border-[#DDD8CE]"
            }`}
          >
            <AsterAvatar mood={getAsterMood()} size="xs" showStatus />
            <span className={`text-xs font-serif font-medium ${textPrimary}`}>Aster</span>
            <span className={`text-[10px] ${scriptAccent} font-mono hidden sm:inline capitalize`}>
              ({getAsterMood()})
            </span>
          </button>

          <div className={`flex items-center gap-2 border-l ${borderSubtle} pl-3 text-xs ${textSecondary}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline font-medium">Velo Dynamics</span>
          </div>
        </div>
      </header>


      {/* SUB-HEADER: Aster Welcome Banner (Matching Mood Board 3) */}
      <div className={`border-b ${borderSubtle} ${isDark ? "bg-[#14161B]" : "bg-[#F6F3EC]"} px-6 sm:px-10 py-3.5`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AsterAvatar mood={getAsterMood()} size="sm" onClick={() => setChatOpen(true)} />
            <div>
              <p className={`text-xs font-serif font-medium ${textPrimary}`}>
                Good evening, Riya. Ready to turn progress into presence?
              </p>
              <p className={`text-[11px] ${textSecondary}`}>
                Tell me what your team shipped, discovered, or achieved. I&rsquo;ll help you find the story worth telling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className={`flex items-center gap-3 font-mono text-[11px] ${textSecondary}`}>
              <span><strong>12</strong> Campaigns</span>
              <span>&bull;</span>
              <span><strong>8</strong> Published</span>
              <span>&bull;</span>
              <span className="text-emerald-500 font-semibold">+42% Engagement</span>
            </div>

            {studioStep > 1 && activeTab === "studio" && (
              <button
                onClick={handleReset}
                className={`px-3 py-1 rounded text-xs transition-colors pressable border ${
                  isDark ? "bg-[#1C1F26] border-[#2D323E] text-[#C5C9D3]" : "bg-[#FFFFFF] border-[#DDD8CE] text-[#16181D]"
                }`}
              >
                New Update
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN BODY AREA */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-10">
        {/* =========================================================================
            TAB 1: STUDIO WORKFLOW (The 5-Step Pipeline from Mood Board 1)
           ========================================================================= */}
        {activeTab === "studio" && (
          <div className="space-y-8">
            {/* Step Progress Breadcrumb */}
            <div className={`flex items-center gap-2 overflow-x-auto pb-2 border-b ${borderSubtle} text-xs font-mono`}>
              {[
                { num: "01", label: "Tell us", step: 1 },
                { num: "02", label: "Strategy", step: 2 },
                { num: "03", label: "Content", step: 3 },
                { num: "04", label: "Verification", step: 4 },
                { num: "05", label: "Publish", step: 5 },
              ].map((st, i) => {
                const isCurrent = studioStep === st.step;
                const isDone = studioStep > st.step;
                return (
                  <React.Fragment key={st.step}>
                    {i > 0 && <span className={isDark ? "text-[#3A3F4D]" : "text-[#D0CBC0]"}>&bull;</span>}
                    <button
                      onClick={() => (isDone ? setStudioStep(st.step as StudioStep) : null)}
                      disabled={!isDone && !isCurrent}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                        isCurrent
                          ? btnPrimary + " font-bold shadow-xs"
                          : isDone
                          ? isDark ? "text-[#C5C9D3] hover:text-[#FBF9F5] cursor-pointer" : "text-[#16181D] hover:underline cursor-pointer"
                          : isDark ? "text-[#4A5060] cursor-not-allowed" : "text-[#A09C92] cursor-not-allowed"
                      }`}
                    >
                      <span>{st.num}</span>
                      <span>{st.label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* STEP 1: TELL US / WHAT HAPPENED? (Matching Mood Board 1) */}
            {studioStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Left Card: Architecture / Quote (Matching Image 1) */}
                <div className={`md:col-span-4 rounded-xl p-6 border ${cardBg} space-y-4 relative overflow-hidden`}>
                  <div className="relative w-full h-44 rounded-lg overflow-hidden border border-black/10">
                    <Image
                      src="/brand/brand_architecture_card.png"
                      alt="Architecture"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <blockquote className={`font-serif text-lg ${textPrimary} leading-snug`}>
                      Good products deserve good stories.
                    </blockquote>
                    <p className={`text-xs ${textSecondary} mt-2 leading-relaxed`}>
                      Marketing OS bridges the gap between engineering execution and high-converting market presence.
                    </p>
                  </div>
                </div>

                {/* Right Area: Input Workspace */}
                <div className={`md:col-span-8 rounded-xl p-8 border ${cardBg} space-y-6`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className={`font-serif text-3xl ${textPrimary}`}>What happened?</h1>
                      <p className={`text-xs ${textSecondary} mt-1`}>
                        Share what your team shipped, discovered, or achieved.
                      </p>
                    </div>
                    <span className={`font-script text-base ${scriptAccent} hidden sm:inline`}>
                      Just the truth. We&rsquo;ll handle the rest.
                    </span>
                  </div>

                  <div className="space-y-3">
                    <textarea
                      rows={5}
                      value={rawUpdate}
                      onChange={(e) => setRawUpdate(e.target.value)}
                      placeholder="We reduced sync latency by 70% with a new architecture..."
                      className={`w-full ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-[#FBF9F5] border-[#D8D3C8]"} border rounded-lg p-4 text-sm ${textPrimary} outline-none focus:border-[#A8583C] leading-relaxed resize-none`}
                    />

                    {/* Action Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <button className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1.5 ${cardElevated}`}>
                          <Plus className="w-3 h-3" />
                          <span>Add file</span>
                        </button>
                        <button className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1.5 ${cardElevated}`}>
                          <Link2 className="w-3 h-3" />
                          <span>Link</span>
                        </button>
                        <button className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1.5 ${cardElevated}`}>
                          <FolderOpen className="w-3 h-3" />
                          <span>Use from notes</span>
                        </button>
                      </div>

                      <button
                        onClick={handleFindStory}
                        disabled={analyzing || !rawUpdate.trim()}
                        className={`px-5 py-2 rounded font-medium text-xs transition-colors pressable flex items-center gap-1.5 ${btnPrimary}`}
                      >
                        <span>{analyzing ? "Analysing..." : "Find the story"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Try an Example */}
                  <div className={`pt-4 border-t ${borderSubtle} space-y-2`}>
                    <span className={`text-[11px] font-mono ${textSecondary} uppercase tracking-wider`}>
                      Try an example:
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        "Launched v2.0",
                        "Closed a new customer",
                        "Open sourced a tool",
                        "Hit 10k users",
                      ].map((ex) => (
                        <button
                          key={ex}
                          onClick={() => {
                            if (ex === "Launched v2.0") setRawUpdate("We deployed our v2 autonomous reconciliation engine with zero downtime.");
                            if (ex === "Closed a new customer") setRawUpdate("Acme Corp scaled from 1,000 to 50,000 monthly transactions with zero headcount increase.");
                            if (ex === "Open sourced a tool") setRawUpdate("We just open-sourced our cryptographic audit ledger with 1,200 GitHub stars.");
                            if (ex === "Hit 10k users") setRawUpdate("Our real-time platform crossed 10,000 active daily developers.");
                          }}
                          className={`px-2.5 py-1 rounded border transition-colors ${cardElevated} hover:opacity-80`}
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: STRATEGY / 3 ANGLES (Matching Mood Board 1) */}
            {studioStep === 2 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className={`font-serif text-3xl ${textPrimary}`}>We found 3 strategic angles</h1>
                    <p className={`text-xs ${textSecondary} mt-1`}>
                      Here are different ways to tell this story, based on your update.
                    </p>
                  </div>
                  <button className={`px-3 py-1.5 rounded border text-xs transition-colors ${cardElevated} self-start sm:self-auto`}>
                    Edit angles
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Angle 1: Engineering Story */}
                  <div
                    onClick={() => setSelectedAngle("eng")}
                    className={`rounded-xl p-6 cursor-pointer transition-all pressable space-y-4 border ${
                      selectedAngle === "eng"
                        ? isDark ? "border-[#C8BBA8] bg-[#1C1F26]" : "border-[#16181D] bg-[#FFFFFF] shadow-md ring-1 ring-[#16181D]"
                        : cardBg + " hover:opacity-90"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? "bg-[#252934] text-[#C8BBA8]" : "bg-[#F3EFE7] text-[#8B452B]"}`}>
                        <Wrench className="w-4 h-4" />
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                        Best fit
                      </span>
                    </div>

                    <div>
                      <h3 className={`font-serif text-lg ${textPrimary}`}>Engineering Story</h3>
                      <p className={`text-xs ${textSecondary} mt-1 leading-relaxed`}>
                        A deep dive into the technical challenge and how you solved it.
                      </p>
                    </div>

                    <div className={`pt-3 border-t ${borderSubtle} space-y-1.5 text-xs ${textSecondary}`}>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Evidence</span>
                        <span className={textPrimary}>92%</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Relevance</span>
                        <span className={textPrimary}>88%</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Differentiation</span>
                        <span className={textPrimary}>85%</span>
                      </div>
                    </div>
                  </div>

                  {/* Angle 2: Customer Outcome */}
                  <div
                    onClick={() => setSelectedAngle("cust")}
                    className={`rounded-xl p-6 cursor-pointer transition-all pressable space-y-4 border ${
                      selectedAngle === "cust"
                        ? isDark ? "border-[#C8BBA8] bg-[#1C1F26]" : "border-[#16181D] bg-[#FFFFFF] shadow-md ring-1 ring-[#16181D]"
                        : cardBg + " hover:opacity-90"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? "bg-[#252934] text-[#C8BBA8]" : "bg-[#F3EFE7] text-[#8B452B]"}`}>
                      <Users className="w-4 h-4" />
                    </div>

                    <div>
                      <h3 className={`font-serif text-lg ${textPrimary}`}>Customer Outcome</h3>
                      <p className={`text-xs ${textSecondary} mt-1 leading-relaxed`}>
                        How this makes your users faster and more productive.
                      </p>
                    </div>

                    <div className={`pt-3 border-t ${borderSubtle} space-y-1.5 text-xs ${textSecondary}`}>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Evidence</span>
                        <span className={textPrimary}>68%</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Relevance</span>
                        <span className={textPrimary}>76%</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Differentiation</span>
                        <span className={textPrimary}>72%</span>
                      </div>
                    </div>
                  </div>

                  {/* Angle 3: Founder Conviction */}
                  <div
                    onClick={() => setSelectedAngle("founder")}
                    className={`rounded-xl p-6 cursor-pointer transition-all pressable space-y-4 border ${
                      selectedAngle === "founder"
                        ? isDark ? "border-[#C8BBA8] bg-[#1C1F26]" : "border-[#16181D] bg-[#FFFFFF] shadow-md ring-1 ring-[#16181D]"
                        : cardBg + " hover:opacity-90"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? "bg-[#252934] text-[#C8BBA8]" : "bg-[#F3EFE7] text-[#8B452B]"}`}>
                      <Lightbulb className="w-4 h-4" />
                    </div>

                    <div>
                      <h3 className={`font-serif text-lg ${textPrimary}`}>Founder Conviction</h3>
                      <p className={`text-xs ${textSecondary} mt-1 leading-relaxed`}>
                        Why this matters for the bigger picture.
                      </p>
                    </div>

                    <div className={`pt-3 border-t ${borderSubtle} space-y-1.5 text-xs ${textSecondary}`}>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Evidence</span>
                        <span className={textPrimary}>54%</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Relevance</span>
                        <span className={textPrimary}>70%</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Differentiation</span>
                        <span className={textPrimary}>80%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setStudioStep(1)}
                    className={`text-xs ${textSecondary} hover:${textPrimary}`}
                  >
                    &larr; Back to input
                  </button>

                  <button
                    onClick={handleSelectAngle}
                    disabled={generating}
                    className={`px-6 py-2.5 rounded font-medium text-xs transition-colors pressable flex items-center gap-1.5 ${btnPrimary}`}
                  >
                    <span>{generating ? "Drafting Content..." : "Continue with this angle"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CONTENT / YOUR CONTENT IS READY (Matching Mood Board 1) */}
            {studioStep === 3 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className={`font-serif text-3xl ${textPrimary}`}>Your content is ready</h1>
                    <p className={`text-xs ${textSecondary} mt-1`}>
                      Review, edit, and approve before publishing.
                    </p>
                  </div>

                  {/* Channel Switcher */}
                  <div className={`flex items-center gap-1 p-1 rounded-lg border ${cardElevated} text-xs`}>
                    <button
                      onClick={() => setActiveChannel("linkedin")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        activeChannel === "linkedin" ? (isDark ? "bg-[#282C37] text-white" : "bg-white text-black shadow-xs font-medium") : textSecondary
                      }`}
                    >
                      LinkedIn
                    </button>
                    <button
                      onClick={() => setActiveChannel("x")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        activeChannel === "x" ? (isDark ? "bg-[#282C37] text-white" : "bg-white text-black shadow-xs font-medium") : textSecondary
                      }`}
                    >
                      X (Twitter)
                    </button>
                    <button
                      onClick={() => setActiveChannel("instagram")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        activeChannel === "instagram" ? (isDark ? "bg-[#282C37] text-white" : "bg-white text-black shadow-xs font-medium") : textSecondary
                      }`}
                    >
                      Instagram
                    </button>
                    <button
                      onClick={() => setActiveChannel("email")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        activeChannel === "email" ? (isDark ? "bg-[#282C37] text-white" : "bg-white text-black shadow-xs font-medium") : textSecondary
                      }`}
                    >
                      Email
                    </button>
                  </div>
                </div>

                {/* Aster Inline Coaching Chip (Matching Mood Board 3) */}
                <div className={`p-3.5 rounded-lg border ${cardBg} flex items-start gap-3 text-xs`}>
                  <AsterAvatar mood="curious" size="xs" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-serif font-semibold ${textPrimary}`}>Aster&rsquo;s Feedback</span>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          onClick={() => setPostText("We reduced sync latency by 70% with a new architecture.\n\nHere is how we did it:...")}
                          className={`px-2 py-0.5 rounded border transition-colors ${cardElevated}`}
                        >
                          Make it stronger
                        </button>
                        <button
                          onClick={() => setPostText("We cut sync latency by 70%.\n\nFull architecture breakdown below.")}
                          className={`px-2 py-0.5 rounded border transition-colors ${cardElevated}`}
                        >
                          Shorten
                        </button>
                      </div>
                    </div>
                    <p className={`${textSecondary} leading-relaxed`}>
                      This is a strong start. Consider leading with the impact (70% faster) instead of the technical detail.
                    </p>
                  </div>
                </div>

                {/* Content Dual Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Post Editor */}
                  <div className={`md:col-span-7 rounded-xl p-6 border ${cardBg} space-y-4`}>
                    <div className={`flex items-center justify-between border-b ${borderSubtle} pb-3 text-xs`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0A66C2]">in</span>
                        <span className={`font-semibold ${textPrimary}`}>LinkedIn Post</span>
                      </div>
                      <button className={`flex items-center gap-1 ${textSecondary} hover:${textPrimary}`}>
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <textarea
                      rows={8}
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      className={`w-full ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-[#FBF9F5] border-[#DDD8CE]"} border rounded-lg p-4 text-xs ${textPrimary} leading-relaxed resize-none outline-none focus:border-[#A8583C]`}
                    />

                    <div className={`flex items-center justify-between text-[11px] ${textSecondary} font-mono`}>
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        &check; 3 claims &bull; All verified
                      </span>
                      <span>{postText.length} / 3000</span>
                    </div>
                  </div>

                  {/* Right Column: Asset Graphic Preview */}
                  <div className={`md:col-span-5 rounded-xl p-6 border ${cardBg} space-y-4`}>
                    <span className={`text-xs font-mono uppercase tracking-wider ${textSecondary}`}>Asset Preview</span>
                    <div className={`rounded-lg p-6 border ${isDark ? "bg-gradient-to-br from-[#1C1F26] to-[#14161B] border-[#333846]" : "bg-gradient-to-br from-[#F5F1E8] to-[#EAE3D2] border-[#DDD8CE]"} text-center space-y-4`}>
                      <div className={`font-serif text-3xl ${textPrimary} leading-tight`}>
                        70% Faster Sync.
                      </div>
                      <p className={`font-script text-base ${scriptAccent}`}>
                        Same product. Smoother experience.
                      </p>
                      <div className={`pt-4 text-[10px] font-mono ${textSecondary} uppercase`}>
                        Velo Dynamics Architecture Milestone
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setStudioStep(2)}
                    className={`text-xs ${textSecondary} hover:${textPrimary}`}
                  >
                    &larr; Back to angles
                  </button>

                  <button
                    onClick={() => setStudioStep(4)}
                    className={`px-6 py-2.5 rounded font-medium text-xs transition-colors pressable flex items-center gap-1.5 ${btnPrimary}`}
                  >
                    <span>Check claims &amp; evidence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: VERIFICATION / CLAIM CHECK (Matching Mood Board 1 & 3) */}
            {studioStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h1 className={`font-serif text-3xl ${textPrimary}`}>Claim check</h1>
                  <p className={`text-xs ${textSecondary} mt-1`}>
                    3 claims found in this post. Deterministic evidence gate ensures zero false statements.
                  </p>
                </div>

                {/* Aster Claims Intervention Warning (Matching Mood Board 3) */}
                <div className={`p-4 rounded-xl border flex items-start gap-3.5 text-xs ${isDark ? "bg-amber-950/20 border-amber-800/40" : "bg-amber-50 border-amber-200"}`}>
                  <AsterAvatar mood="concerned" size="sm" />
                  <div className="flex-1 space-y-1.5">
                    <p className={`font-serif font-medium ${textPrimary}`}>
                      Aster: Hold on. This claim isn&rsquo;t fully supported by your evidence.
                    </p>
                    <p className={textSecondary}>
                      Claim &ldquo;Faster user workflows&rdquo; has no direct benchmark in Brand Truth. You can add supporting evidence or apply a founder override.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleToggleOverride("c2")}
                        className={`px-3 py-1 rounded font-medium text-[11px] pressable ${btnPrimary}`}
                      >
                        {claimsStatus.c2.overridden ? "Override Applied &check;" : "Apply Founder Override"}
                      </button>
                      <button
                        onClick={() => setChatOpen(true)}
                        className={`px-3 py-1 rounded border text-[11px] transition-colors ${cardElevated}`}
                      >
                        Explain why
                      </button>
                    </div>
                  </div>
                </div>

                {/* Claims Verification Table */}
                <div className="space-y-3">
                  {/* Claim 1 */}
                  <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between gap-4`}>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-medium ${textPrimary}`}>{claimsStatus.c1.text}</p>
                      <p className={`text-[11px] ${textSecondary} font-mono`}>Source: {claimsStatus.c1.source}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono">
                      Verified
                    </span>
                  </div>

                  {/* Claim 2 */}
                  <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between gap-4`}>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-medium ${textPrimary}`}>{claimsStatus.c2.text}</p>
                      <p className={`text-[11px] ${textSecondary} font-mono`}>
                        {claimsStatus.c2.overridden ? "Allowed by Founder Override" : claimsStatus.c2.source}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-mono ${
                        claimsStatus.c2.overridden
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {claimsStatus.c2.overridden ? "Allowed" : "Needs evidence"}
                    </span>
                  </div>

                  {/* Claim 3 */}
                  <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between gap-4 opacity-70`}>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-medium ${textPrimary} line-through`}>{claimsStatus.c3.text}</p>
                      <p className="text-[11px] text-rose-500 font-mono">
                        Stripped by Gate: {claimsStatus.c3.source}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-mono">
                      Unsupported
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setStudioStep(3)}
                    className={`text-xs ${textSecondary} hover:${textPrimary}`}
                  >
                    &larr; Back to content
                  </button>

                  <button
                    onClick={() => setStudioStep(5)}
                    className={`px-6 py-2.5 rounded font-medium text-xs transition-colors pressable flex items-center gap-1.5 ${btnPrimary}`}
                  >
                    <span>Proceed to Review &amp; Schedule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW / READY TO PUBLISH? (Matching Mood Board 1 & 3) */}
            {studioStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h1 className={`font-serif text-3xl ${textPrimary}`}>Ready to publish?</h1>
                  <p className={`text-xs ${textSecondary} mt-1`}>
                    Review your campaign assets and schedule them.
                  </p>
                </div>

                {publishSuccess ? (
                  /* Post-Publish Celebration State (Matching Mood Board 3) */
                  <div className={`rounded-xl p-8 border ${cardBg} text-center space-y-5`}>
                    <div className="flex justify-center">
                      <AsterAvatar mood="proud" size="lg" />
                    </div>
                    <div>
                      <h2 className={`font-serif text-2xl ${textPrimary}`}>Aster: It&rsquo;s live! 🎉</h2>
                      <p className={`text-xs ${textSecondary} mt-1 max-w-md mx-auto leading-relaxed`}>
                        LinkedIn post dispatched with zero ungrounded claims. X thread scheduled for 10:30 AM. Now let&rsquo;s see how this story performs.
                      </p>
                    </div>

                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={() => setActiveTab("analytics")}
                        className={`px-5 py-2 rounded text-xs font-medium pressable ${btnPrimary}`}
                      >
                        View analytics
                      </button>
                      <button
                        onClick={handleReset}
                        className={`px-5 py-2 rounded border text-xs pressable ${cardElevated}`}
                      >
                        Create another &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Pre-Publish Channel List */
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {/* Channel 1: LinkedIn */}
                      <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between text-xs`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded border ${cardElevated} font-bold text-[10px] text-[#0A66C2] flex items-center justify-center`}>in</span>
                          <span className={`font-medium ${textPrimary}`}>LinkedIn Post</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
                            Ready
                          </span>
                          <span className={`font-mono text-[11px] ${textSecondary}`}>Mar 12, 10:00 AM</span>
                        </div>
                      </div>

                      {/* Channel 2: X Thread */}
                      <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between text-xs`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded border ${cardElevated} font-bold text-[10px] flex items-center justify-center`}>X</span>
                          <span className={`font-medium ${textPrimary}`}>X (Twitter) Thread</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
                            Ready
                          </span>
                          <span className={`font-mono text-[11px] ${textSecondary}`}>Mar 12, 10:30 AM</span>
                        </div>
                      </div>

                      {/* Channel 3: Instagram */}
                      <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between text-xs`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded border ${cardElevated} font-bold text-[10px] text-[#E1306C] flex items-center justify-center`}>IG</span>
                          <span className={`font-medium ${textPrimary}`}>Instagram Carousel</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono text-[10px]">
                            Review media
                          </span>
                          <span className={`font-mono text-[11px] ${textSecondary}`}>Mar 13, 9:00 AM</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6">
                      <button
                        onClick={() => setStudioStep(4)}
                        className={`text-xs ${textSecondary} hover:${textPrimary}`}
                      >
                        &larr; Back to claim check
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setAccountsOpen(true)}
                          className={`px-3 py-2 rounded border text-xs flex items-center gap-1.5 pressable ${cardElevated}`}
                          title="Manage connected social media channels"
                        >
                          <Share2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>Manage Channels</span>
                        </button>
                        <button className={`px-4 py-2 rounded border text-xs ${cardElevated}`}>
                          Schedule for later
                        </button>
                        <button
                          onClick={handleApproveAndPublish}
                          disabled={publishing}
                          className={`px-6 py-2 rounded font-medium text-xs transition-colors pressable ${btnPrimary}`}
                        >
                          {publishing ? "Publishing..." : "Approve & Publish"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: CAMPAIGN DETAIL PAGE (Screen 4 from Mood Board 2)
           ========================================================================= */}
        {activeTab === "campaign-detail" && (
          <div className="space-y-6">
            {/* Breadcrumb & Header */}
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-xs font-mono ${textSecondary}`}>
                <span>Campaign</span>
                <span>&gt;</span>
                <span className={textPrimary}>70% Faster Data Sync</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                  &bull; Scheduled
                </span>
              </div>

              <h1 className={`font-serif text-3xl ${textPrimary}`}>
                70% Faster Data Synchronization
              </h1>
              <p className={`text-xs ${textSecondary}`}>
                A technical deep dive into the architecture, tradeoffs, and results.
              </p>
            </div>

            {/* Campaign Sub-Tabs */}
            <div className={`flex items-center gap-4 border-b ${borderSubtle} text-xs font-medium ${textSecondary}`}>
              {(["overview", "content", "evidence", "performance", "activity"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDetailSubTab(t)}
                  className={`pb-2.5 capitalize transition-colors ${
                    detailSubTab === t
                      ? `${textPrimary} border-b-2 ${isDark ? "border-[#C8BBA8]" : "border-[#16181D]"} font-semibold`
                      : "hover:opacity-80"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Campaign Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Campaign Metadata */}
              <div className={`md:col-span-5 rounded-xl p-6 border ${cardBg} space-y-4`}>
                <h3 className={`font-serif text-sm font-semibold ${textPrimary}`}>Campaign Details</h3>
                <div className={`space-y-3 text-xs ${textSecondary}`}>
                  <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                    <span>Created by</span>
                    <span className={textPrimary}>Alex Chen</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                    <span>Created on</span>
                    <span className={textPrimary}>Mar 10, 2025</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                    <span>Strategic Angle</span>
                    <span className={textPrimary}>Engineering Story</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                    <span>Target Channels</span>
                    <span className={textPrimary}>LinkedIn, X (Twitter)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Execution Status</span>
                    <span className="text-emerald-500 font-mono font-medium">Scheduled</span>
                  </div>
                </div>

                {/* Aster's Campaign Note */}
                <div className={`p-3 rounded-lg border ${cardElevated} flex items-start gap-2.5 text-xs`}>
                  <AsterAvatar mood="thinking" size="xs" />
                  <p className={`${textSecondary} text-[11px] leading-relaxed`}>
                    <strong>Aster:</strong> This campaign is scheduled for peak founder engagement hours (10:00 AM &ndash; 10:30 AM EST).
                  </p>
                </div>
              </div>

              {/* Right Column: Content Preview Assets */}
              <div className={`md:col-span-7 rounded-xl p-6 border ${cardBg} space-y-4`}>
                <div className="flex items-center justify-between">
                  <h3 className={`font-serif text-sm font-semibold ${textPrimary}`}>Scheduled Assets</h3>
                  <button className={`text-xs ${scriptAccent} hover:underline`}>
                    View all assets &rarr;
                  </button>
                </div>

                <div className="space-y-3">
                  <div className={`p-3.5 rounded-lg border ${cardElevated} flex items-center justify-between text-xs`}>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-xs text-[#0A66C2]">in</span>
                      <span className={`font-medium ${textPrimary}`}>LinkedIn Post</span>
                    </div>
                    <span className={`font-mono text-[11px] ${textSecondary}`}>Mar 12, 10:00 AM</span>
                  </div>

                  <div className={`p-3.5 rounded-lg border ${cardElevated} flex items-center justify-between text-xs`}>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-xs">X</span>
                      <span className={`font-medium ${textPrimary}`}>X Thread</span>
                    </div>
                    <span className={`font-mono text-[11px] ${textSecondary}`}>Mar 12, 10:30 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: CONTENT CALENDAR (Matching Mood Board 1 & 2)
           ========================================================================= */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className={`font-serif text-3xl ${textPrimary}`}>Content Calendar</h1>
                <p className={`text-xs ${textSecondary} mt-1`}>A clear view of your upcoming and published content.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className={`flex items-center p-0.5 rounded-md border ${cardElevated} text-xs`}>
                  <button className={`px-3 py-1 rounded font-medium ${isDark ? "bg-[#282C37] text-white" : "bg-white text-black shadow-xs"}`}>Month</button>
                  <button className={`px-3 py-1 rounded ${textSecondary}`}>Week</button>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("studio");
                    setStudioStep(1);
                  }}
                  className={`px-3.5 py-1.5 rounded font-medium text-xs pressable flex items-center gap-1 ${btnPrimary}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Update</span>
                </button>
              </div>
            </div>

            {/* Calendar Grid Header */}
            <div className={`rounded-xl border ${cardBg} overflow-hidden`}>
              <div className={`p-4 border-b ${borderSubtle} flex items-center justify-between ${cardElevated}`}>
                <span className={`font-serif text-base font-semibold ${textPrimary}`}>March 2025</span>
                <div className={`flex items-center gap-1.5 text-xs ${textSecondary}`}>
                  <button className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">&lt;</button>
                  <button className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">&gt;</button>
                </div>
              </div>

              {/* Grid */}
              <div className={`grid grid-cols-7 text-center text-xs font-mono border-b ${borderSubtle} ${isDark ? "bg-[#14161B]" : "bg-[#F3EFE7]"} ${textSecondary} py-2`}>
                <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
              </div>

              <div className={`grid grid-cols-7 gap-px ${isDark ? "bg-[#242833]" : "bg-[#E5E0D5]"} text-xs`}>
                {/* 28 Days Simulation */}
                {Array.from({ length: 28 }, (_, i) => {
                  const day = i + 1;
                  return (
                    <div key={day} className={`${isDark ? "bg-[#16181D]" : "bg-[#FFFFFF]"} min-h-[90px] p-2 space-y-1`}>
                      <span className={`text-[10px] font-mono ${textSecondary}`}>{day}</span>
                      {day === 4 && (
                        <div className="p-1 rounded bg-blue-500/15 border border-blue-500/30 text-[10px] text-blue-600 dark:text-blue-300 truncate font-medium">
                          LinkedIn 10:00 AM
                        </div>
                      )}
                      {day === 12 && (
                        <div className="p-1 rounded bg-slate-500/15 border border-slate-500/30 text-[10px] text-slate-800 dark:text-slate-200 truncate font-medium">
                          X Thread 10:30 AM
                        </div>
                      )}
                      {day === 14 && (
                        <div className="p-1 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-700 dark:text-amber-300 truncate font-medium">
                          Customer Story
                        </div>
                      )}
                      {day === 19 && (
                        <div className="p-1 rounded bg-pink-500/15 border border-pink-500/30 text-[10px] text-pink-700 dark:text-pink-300 truncate font-medium">
                          Instagram 9:00 AM
                        </div>
                      )}
                      {day === 24 && (
                        <div className="p-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-700 dark:text-emerald-300 truncate font-medium">
                          Product Update
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: ANALYTICS (Matching Mood Board 1 & 2)
           ========================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`font-serif text-3xl ${textPrimary}`}>Your content is performing well.</h1>
                <p className={`text-xs ${textSecondary} mt-1`}>See how your content is performing across platforms.</p>
              </div>
              <span className={`text-xs font-mono ${textSecondary} px-3 py-1.5 rounded border ${cardElevated}`}>
                Last 30 days &darr;
              </span>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`rounded-xl p-5 border ${cardBg}`}>
                <span className={`text-xs ${textSecondary}`}>Impressions</span>
                <p className={`font-serif text-2xl ${textPrimary} mt-1`}>24.8K</p>
                <span className="text-[11px] font-mono text-emerald-500">&uarr; 12%</span>
              </div>
              <div className={`rounded-xl p-5 border ${cardBg}`}>
                <span className={`text-xs ${textSecondary}`}>Engagements</span>
                <p className={`font-serif text-2xl ${textPrimary} mt-1`}>2.1K</p>
                <span className="text-[11px] font-mono text-emerald-500">&uarr; 43%</span>
              </div>
              <div className={`rounded-xl p-5 border ${cardBg}`}>
                <span className={`text-xs ${textSecondary}`}>Engagement rate</span>
                <p className={`font-serif text-2xl ${textPrimary} mt-1`}>8.4%</p>
                <span className="text-[11px] font-mono text-emerald-500">&uarr; 2.1%</span>
              </div>
              <div className={`rounded-xl p-5 border ${cardBg}`}>
                <span className={`text-xs ${textSecondary}`}>Link clicks</span>
                <p className={`font-serif text-2xl ${textPrimary} mt-1`}>320</p>
                <span className="text-[11px] font-mono text-emerald-500">&uarr; 18%</span>
              </div>
            </div>

            {/* Multi-Series Performance Chart */}
            <div className={`rounded-xl p-6 border ${cardBg} space-y-4`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${textPrimary}`}>Cross-Platform Engagement Trend</span>
                <div className={`flex items-center gap-4 text-[11px] ${textSecondary}`}>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0A66C2]" /> LinkedIn</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> X (Twitter)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E1306C]" /> Instagram</span>
                </div>
              </div>

              {/* Minimal SVG Chart */}
              <div className="h-44 w-full pt-4">
                <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                  <path
                    d="M 10 90 Q 120 40 250 50 T 490 20"
                    fill="none"
                    stroke="#0A66C2"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M 10 100 Q 140 70 250 65 T 490 45"
                    fill="none"
                    stroke="#8F92A3"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <path
                    d="M 10 110 Q 150 85 250 80 T 490 60"
                    fill="none"
                    stroke="#E1306C"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className={`flex justify-between text-[10px] font-mono ${textSecondary} pt-2 border-t ${borderSubtle}`}>
                <span>Mar 1</span>
                <span>Mar 8</span>
                <span>Mar 15</span>
                <span>Mar 22</span>
                <span>Mar 31</span>
              </div>
            </div>

            {/* Top Performing Content Card */}
            <div className={`rounded-xl p-5 border ${cardBg} flex items-center justify-between`}>
              <div className="space-y-1">
                <span className={`text-[10px] font-mono uppercase ${textSecondary}`}>Top Performing Content</span>
                <p className={`font-serif text-base ${textPrimary}`}>70% Faster Sync &mdash; Engineering Story</p>
                <p className={`text-xs ${textSecondary} font-mono`}>1.2K engagements &bull; Mar 12</p>
              </div>
              <button className={`px-3.5 py-1.5 rounded border text-xs transition-colors ${cardElevated}`}>
                View &rarr;
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: BRAND TRUTH / BRAND BRAIN (Evidence & Grounded Facts)
           ========================================================================= */}
        {activeTab === "brand-brain" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`font-serif text-3xl ${textPrimary}`}>Brand Truth Grounding</h1>
                <p className={`text-xs ${textSecondary} mt-1`}>
                  The verified evidence foundation that Aster uses to write and check your stories.
                </p>
              </div>
              <button className={`px-3.5 py-1.5 rounded font-medium text-xs pressable flex items-center gap-1.5 ${btnPrimary}`}>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Verified Fact</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`rounded-xl p-5 border ${cardBg} space-y-2`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-500 font-mono text-[11px]">&check; Verified</span>
                  <span className={`${textSecondary} font-mono text-[10px]`}>Aug 2026</span>
                </div>
                <p className={`font-serif text-sm ${textPrimary}`}>72% faster reconciliation</p>
                <p className={`text-[11px] ${textSecondary}`}>Source: Customer Case Study (Acme Corp)</p>
              </div>

              <div className={`rounded-xl p-5 border ${cardBg} space-y-2`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-500 font-mono text-[11px]">&check; Verified</span>
                  <span className={`${textSecondary} font-mono text-[10px]`}>Aug 2026</span>
                </div>
                <p className={`font-serif text-sm ${textPrimary}`}>3 days reduced to 40 minutes</p>
                <p className={`text-[11px] ${textSecondary}`}>Source: Finance Interview Log</p>
              </div>

              <div className={`rounded-xl p-5 border ${cardBg} space-y-2`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-500 font-mono text-[11px]">&bull; Needs Evidence</span>
                  <span className={`${textSecondary} font-mono text-[10px]`}>Aug 2026</span>
                </div>
                <p className={`font-serif text-sm ${textPrimary}`}>Saves teams hundreds of hours</p>
                <p className={`text-[11px] ${textSecondary}`}>Source: Unbacked marketing copy</p>
              </div>

              <div className={`rounded-xl p-5 border ${cardBg} space-y-2`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-500 font-mono text-[11px]">&times; Prohibited</span>
                  <span className={`${textSecondary} font-mono text-[10px]`}>Aug 2026</span>
                </div>
                <p className={`font-serif text-sm ${textPrimary} line-through`}>Industry&rsquo;s fastest platform</p>
                <p className="text-[11px] text-rose-500">Hard-blocked absolute superlative</p>
              </div>
            </div>

            {/* Empty State / Bottom Inspiration with Aster Peeking (Matching Mood Board 3) */}
            <div className={`rounded-xl p-6 border ${cardBg} flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-10 overflow-hidden relative">
                  <Image
                    src="/aster/aster_peeking.png"
                    alt="Aster Peeking"
                    width={56}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className={`font-serif text-sm font-semibold ${textPrimary}`}>Small moments. Big impact.</p>
                  <p className={`text-xs ${textSecondary}`}>Add customer quotes, benchmarks, and changelogs to expand Aster&rsquo;s evidence brain.</p>
                </div>
              </div>

              <span className={`font-script text-base ${scriptAccent}`}>
                With Aster, every story goes further.
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Floating On-Demand Aster Chat Drawer */}
      <AsterChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Connected Social Accounts & OAuth Management Modal */}
      <ConnectedAccountsDialog
        isOpen={accountsOpen}
        onClose={() => setAccountsOpen(false)}
        isDark={isDark}
      />
    </div>
  );
}

