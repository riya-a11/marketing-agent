"use client";

import React, { useState } from "react";
import { CalendarEvent } from "@/lib/api-client";
import { Lock, AlertTriangle, ShieldCheck, CheckCheck, Clock, ArrowRight, Eye } from "lucide-react";

interface PendingVerificationQueueProps {
  pendingEvents: CalendarEvent[];
  onOpenVerifyModal: (event: CalendarEvent) => void;
  onBulkApprove: (events: CalendarEvent[]) => void;
}

export function PendingVerificationQueue({
  pendingEvents,
  onOpenVerifyModal,
  onBulkApprove,
}: PendingVerificationQueueProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (pendingEvents.length === 0) {
    return (
      <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-white uppercase">Verification Queue Clear</p>
            <p className="text-emerald-300/80 text-[11px]">All scheduled posts and campaigns are verified and armed.</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold">
          0 PENDING ITEMS
        </span>
      </div>
    );
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === pendingEvents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingEvents.map((e) => e.id));
    }
  };

  const handleTriggerBulk = () => {
    const selected = pendingEvents.filter((e) => selectedIds.includes(e.id));
    if (selected.length > 0) {
      onBulkApprove(selected);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-950/40 via-[#1f1b27] to-amber-950/20 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Human-in-the-Loop Verification Queue
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/40">
                {pendingEvents.length} PENDING
              </span>
            </div>
            <p className="text-xs text-[#c7c4d7]">
              Zero-Unauthorized Safety Invariant: Posts will NEVER go live until you review and sign off.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleTriggerBulk}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-amber-950 hover:bg-amber-400 text-xs font-mono font-bold transition-all pressable flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Authorize {selectedIds.length} Selected Posts</span>
            </button>
          )}

          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 rounded-xl bg-[#292932] hover:bg-[#34343d] text-white text-xs font-mono border border-white/10 transition-colors"
          >
            {selectedIds.length === pendingEvents.length ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>

      {/* Pending Items Horizontal Carousel / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pendingEvents.map((ev) => {
          const dt = new Date(ev.scheduled_at);
          const isSelected = selectedIds.includes(ev.id);

          return (
            <div
              key={ev.id}
              className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                isSelected
                  ? "bg-amber-950/60 border-amber-400"
                  : "bg-[#14141c] border-white/10 hover:border-amber-500/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(ev.id)}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {ev.channel}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-[#908fa0] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </span>
                </div>

                <h4 className="font-bold text-white text-xs font-sans mb-1 line-clamp-1">
                  {ev.title}
                </h4>

                <p className="text-[11px] text-[#908fa0] line-clamp-2 leading-relaxed">
                  {ev.channel_payload?.post_text || ev.channel_payload?.source_body || ev.channel_payload?.caption || "No copy preview"}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#c0c1ff]">
                  v{ev.content_version} &bull; {ev.current_content_hash.slice(0, 8)}...
                </span>

                <button
                  onClick={() => onOpenVerifyModal(ev)}
                  className="flex items-center gap-1 text-xs font-mono font-bold text-amber-300 hover:text-white transition-colors"
                >
                  <span>Review & Sign Off</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
