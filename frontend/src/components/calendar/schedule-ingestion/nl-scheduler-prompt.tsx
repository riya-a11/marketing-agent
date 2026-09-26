"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, ArrowRight, ShieldCheck, X, Check, Calendar } from "lucide-react";
import { proposeAISchedule, AIScheduleProposalResponse, ProposedEventItem } from "@/lib/api-client";
import { toast } from "sonner";

interface NLSchedulerPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptProposal: (events: ProposedEventItem[]) => void;
  brandName: string;
}

export function NLSchedulerPrompt({
  isOpen,
  onClose,
  onAcceptProposal,
  brandName,
}: NLSchedulerPromptProps) {
  const [prompt, setPrompt] = useState(
    "Create a 2-week launch schedule for our product with 3 LinkedIn posts, 2 X updates, and 1 marketing email newsletter on Friday."
  );
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState<AIScheduleProposalResponse | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await proposeAISchedule({
        prompt,
        brand_id: brandName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        timezone: "Asia/Kolkata",
      });
      setProposal(res);
      toast.success("Otto formulated a strategic schedule proposal!");
    } catch (e) {
      toast.error(`Proposal generation failed: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = () => {
    if (proposal && proposal.proposed_events.length > 0) {
      onAcceptProposal(proposal.proposed_events);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1b1b23] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 bg-[#14141c] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8083ff] to-[#d0bcff] flex items-center justify-center text-[#0d0096]">
              <Sparkles className="w-5 h-5 text-[#0d0096]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                AI Natural Language Scheduler
              </h3>
              <p className="text-xs text-[#908fa0]">Formulates structured schedule with explicit assumptions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#908fa0] hover:text-white hover:bg-[#292932]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 flex-1">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-white uppercase">
              Describe your desired campaign cadence & events:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Schedule a 3-week product launch starting next Tuesday with LinkedIn posts and an email newsletter on Friday..."
              className="w-full bg-[#14141c] border border-white/10 rounded-2xl p-4 text-xs text-white outline-hidden focus:border-[#c0c1ff] font-sans leading-relaxed resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8083ff] to-[#d0bcff] text-[#0d0096] font-black text-xs font-mono uppercase tracking-wider hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] transition-all pressable flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{generating ? "Formulating Strategy..." : "Generate Schedule Proposal"}</span>
            </button>
          </div>

          {/* Proposal Review */}
          {proposal && (
            <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in">
              <div className="bg-[#14141c] p-4 rounded-xl border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white font-mono uppercase">
                    Strategic Proposal Summary
                  </h4>
                  <span className="text-[10px] font-mono text-[#c0c1ff] bg-[#292932] px-2 py-0.5 rounded">
                    {proposal.timezone}
                  </span>
                </div>
                <p className="text-[#c7c4d7] font-sans">{proposal.summary}</p>
              </div>

              {/* Explicit Assumptions Card */}
              <div className="bg-amber-950/40 p-4 rounded-xl border border-amber-500/30 space-y-2 text-xs font-mono">
                <p className="font-bold text-amber-300 uppercase flex items-center gap-1.5">
                  <span>Explicit Operational Assumptions:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 text-[#c7c4d7] text-[11px]">
                  {proposal.assumptions.map((asm, idx) => (
                    <li key={idx}>{asm}</li>
                  ))}
                </ul>
              </div>

              {/* Proposed Slots List */}
              <div className="space-y-2">
                <h5 className="text-xs font-mono font-bold text-[#908fa0] uppercase">
                  Proposed Slots ({proposal.proposed_events.length} Events)
                </h5>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {proposal.proposed_events.map((ev) => (
                    <div
                      key={ev.temp_id}
                      className="p-3 bg-[#14141c] rounded-xl border border-white/5 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#292932] text-[#c0c1ff]">
                            {ev.channel}
                          </span>
                          <span className="text-[11px] font-mono text-[#908fa0]">{ev.display_time}</span>
                        </div>
                        <h6 className="font-bold text-white font-sans">{ev.title}</h6>
                        <p className="text-[11px] text-[#908fa0] font-sans">&ldquo;{ev.draft_hook}&rdquo;</p>
                      </div>

                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                        {ev.claims_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {proposal && (
          <div className="p-6 bg-[#14141c] border-t border-white/10 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#292932] text-white text-xs font-mono hover:bg-[#34343d]"
            >
              Cancel
            </button>

            <button
              onClick={handleAccept}
              className="px-6 py-2.5 rounded-xl bg-[#8083ff] text-[#0d0096] font-black text-xs font-mono uppercase tracking-wider hover:bg-[#c0c1ff] transition-all pressable flex items-center gap-2"
            >
              <span>Accept & Create {proposal.proposed_events.length} Pending Events</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
