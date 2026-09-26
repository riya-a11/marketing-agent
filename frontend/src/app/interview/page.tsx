"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Send,
  ArrowRight,
  CheckCircle2,
  Building2,
  Globe,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  sendInterviewMessage,
  generateBrandProfile,
  directConnectSocialAccount,
} from "@/lib/api-client";
import { getSavedTenantUser } from "@/lib/firebase";
import { AsterAvatar } from "@/components/aster-avatar";

interface Message {
  role: "assistant" | "user";
  content: string;
}

const REQUIRED_SLOTS = [
  { key: "brand_name", label: "Company / Product Name" },
  { key: "industry", label: "Category & Industry" },
  { key: "mission", label: "Core Mission & Problem" },
  { key: "target_audience", label: "Target Buyer Persona" },
  { key: "brand_voice", label: "Tone & Voice" },
  { key: "competitors", label: "Key Competitors" },
];

export default function InterviewPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(() => {
    const user = typeof window !== "undefined" ? getSavedTenantUser() : null;
    const company = user?.organizationName || "Your Startup";
    return [
      {
        role: "assistant",
        content: `Hi, I'm Aster. I'm your in-house marketing strategist. Good marketing is a form of clarity—so tell me what ${company} recently shipped, learned, or achieved, and who you built it for.`,
      },
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [completionPercentage, setCompletionPercentage] = useState<number>(20);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await sendInterviewMessage({
        message: userText,
        history: newMessages.map((m) => ({ role: m.role, content: m.content })),
        current_slots: slots,
      });

      const replyText = res?.reply;
      if (replyText) {
        setMessages([...newMessages, { role: "assistant", content: replyText }]);
        if (res.extracted_slots) {
          const cleanSlots: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.extracted_slots)) {
            if (v && typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null") {
              cleanSlots[k] = v.trim();
            }
          }
          setSlots((prev) => ({ ...prev, ...cleanSlots }));
          setCompletionPercentage(res.completion_percentage || 50);
        }
      }
    } catch {
      // Fallback response for offline demo
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Got it! That gives us a crisp foundation. What is the one key metric or customer result that proves this works?",
        },
      ]);
      setSlots((prev) => ({
        ...prev,
        brand_name: prev.brand_name || "NexusAI",
        mission: prev.mission || "Fast, automated marketing for early-stage startup founders.",
        target_audience: prev.target_audience || "Enterprise Finance Teams & Tech Founders",
      }));
      setCompletionPercentage(75);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOnboarding = async () => {
    setGeneratingProfile(true);
    try {
      const brandPayload = {
        brand_name: slots.brand_name || "NexusAI",
        industry: slots.industry || "AI / B2B SaaS",
        mission: slots.mission || "Automate high-converting marketing for early stage startup founders.",
        target_audience: slots.target_audience || "Early stage startup founders & incubator cohort members",
        brand_voice: slots.brand_voice || "Authoritative, data-backed, clear",
        competitors: slots.competitors || "Traditional marketing agencies",
      };
      await generateBrandProfile({
        slots: brandPayload,
        extracted_slots: brandPayload,
        ...brandPayload,
      });
      router.push("/onboarding/brand-summary");
    } catch {
      router.push("/onboarding/brand-summary");
    } finally {
      setGeneratingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111215] text-[#FBF9F5] font-sans flex flex-col antialiased">
      {/* Header */}
      <header className="h-16 border-b border-[#242833] px-6 sm:px-12 flex items-center justify-between bg-[#111215]/90 backdrop-blur-md">
        <Link href="/" className="font-serif font-bold text-lg text-[#FBF9F5] flex items-center gap-2">
          <span className="text-[#C8BBA8] font-sans font-black">M</span> Marketing OS
        </Link>

        <div className="flex items-center gap-3">
          <AsterAvatar mood={loading ? "thinking" : "happy"} size="sm" showStatus />
          <div className="hidden sm:block text-left">
            <span className="font-serif text-xs font-semibold text-[#FBF9F5]">Aster</span>
            <p className="text-[10px] text-[#9FA4B2]">Strategic Onboarding</p>
          </div>
        </div>

        <button
          onClick={handleFinishOnboarding}
          disabled={generatingProfile}
          className="px-4 py-1.5 rounded-md bg-[#F4EFE6] text-[#16181D] font-medium text-xs hover:bg-[#EAE3D2] transition-colors pressable flex items-center gap-1.5"
        >
          <span>{generatingProfile ? "Building Brand Truth..." : "Enter Studio"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8">
        {/* Left Pane: Conversational Chat with Aster (7 cols) */}
        <div className="md:col-span-7 flex flex-col surface-card rounded-xl border border-[#282C37] overflow-hidden">
          <div className="p-4 border-b border-[#242833] bg-[#16181D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AsterAvatar mood="neutral" size="xs" />
              <span className="text-xs font-medium text-[#FBF9F5]">Aster Strategist Room</span>
            </div>
            <span className="font-script text-sm text-[#C8BBA8]">
              Think deeper. Ship louder.
            </span>
          </div>

          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[520px]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && <AsterAvatar mood="neutral" size="sm" />}
                <div
                  className={`p-3.5 rounded-lg max-w-[82%] text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#222630] text-[#FBF9F5] border border-[#333846]"
                      : "bg-[#1C1F26] text-[#E5E2DC] border border-[#2A2E39]"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-[#9FA4B2] pl-10">
                <AsterAvatar mood="thinking" size="xs" />
                <span>Aster is analysing your update...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-[#242833] bg-[#14161B] flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell Aster what happened or answer her question..."
              className="flex-1 bg-[#1C1F26] border border-[#2A2E39] rounded-md px-3.5 py-2.5 text-xs text-[#FBF9F5] placeholder-[#6C7282] outline-none focus:border-[#C8BBA8]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 rounded-md bg-[#F4EFE6] text-[#16181D] hover:bg-[#EAE3D2] disabled:opacity-40 transition-colors pressable flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right Pane: Extracted Brand Truth Slots (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="surface-card rounded-xl p-5 border border-[#282C37]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-sm font-semibold text-[#FBF9F5]">Brand Truth Grounding</h2>
              <span className="text-[11px] font-mono text-[#10B981]">{completionPercentage}% Grounded</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[#222630] rounded-full overflow-hidden mb-5">
              <div
                className="h-full bg-[#10B981] transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="space-y-3 text-xs">
              {REQUIRED_SLOTS.map((slot) => {
                const val = slots[slot.key];
                return (
                  <div
                    key={slot.key}
                    className="p-2.5 rounded-md bg-[#1C1F26] border border-[#282C37]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#9FA4B2] text-[11px] font-medium">{slot.label}</span>
                      {val ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      ) : (
                        <span className="text-[10px] text-[#6C7282] font-mono">Pending</span>
                      )}
                    </div>
                    <p className="text-xs text-[#FBF9F5] truncate">
                      {val || <span className="text-[#6C7282] italic">Listening in chat...</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="surface-card rounded-xl p-4 border border-[#282C37] text-center space-y-3">
            <p className="text-xs text-[#9FA4B2]">
              Ready to create your first evidence-backed campaign?
            </p>
            <button
              onClick={handleFinishOnboarding}
              disabled={generatingProfile}
              className="w-full py-2.5 rounded-md bg-[#F4EFE6] text-[#16181D] font-medium text-xs hover:bg-[#EAE3D2] transition-colors pressable flex items-center justify-center gap-2"
            >
              <span>Launch Studio Flywheel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
