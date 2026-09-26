"use client";

import React from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Upload,
  Sparkles,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw
} from "lucide-react";

interface CalendarToolbarProps {
  currentDate: Date;
  viewMode: "month" | "week" | "agenda";
  onChangeViewMode: (mode: "month" | "week" | "agenda") => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToday: () => void;
  selectedChannelFilter: string;
  onSelectChannelFilter: (channel: string) => void;
  selectedStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  onOpenCreateModal: () => void;
  onOpenUploadModal: () => void;
  onOpenAISchedulerModal: () => void;
  onRefresh: () => void;
  pendingCount: number;
}

export function CalendarToolbar({
  currentDate,
  viewMode,
  onChangeViewMode,
  onPrevDate,
  onNextDate,
  onToday,
  selectedChannelFilter,
  onSelectChannelFilter,
  selectedStatusFilter,
  onSelectStatusFilter,
  onOpenCreateModal,
  onOpenUploadModal,
  onOpenAISchedulerModal,
  onRefresh,
  pendingCount,
}: CalendarToolbarProps) {
  const monthYearLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-[#1b1b23] border border-white/10 rounded-2xl p-4 shadow-lg space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#14141c] p-1 rounded-xl border border-white/10">
            <button
              onClick={onPrevDate}
              className="p-1.5 rounded-lg text-[#908fa0] hover:text-white hover:bg-[#292932] transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onToday}
              className="px-3 py-1 rounded-lg text-xs font-mono font-bold text-white hover:bg-[#292932] transition-colors"
            >
              Today
            </button>
            <button
              onClick={onNextDate}
              className="p-1.5 rounded-lg text-[#908fa0] hover:text-white hover:bg-[#292932] transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight font-sans min-w-[180px]">
            {monthYearLabel}
          </h2>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-[#292932] text-[#908fa0] hover:text-white hover:bg-[#34343d] border border-white/10 transition-colors"
            title="Refresh schedule"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode */}
          <div className="flex items-center bg-[#14141c] p-1 rounded-xl border border-white/10 font-mono text-xs">
            {(["month", "week", "agenda"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onChangeViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg uppercase font-bold transition-all ${
                  viewMode === mode
                    ? "bg-[#8083ff] text-[#0d0096] shadow-[0_0_12px_rgba(128,131,255,0.4)]"
                    : "text-[#908fa0] hover:text-white"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* AI Schedule Prompt Button */}
          <button
            onClick={onOpenAISchedulerModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8083ff] to-[#d0bcff] text-[#0d0096] text-xs font-bold font-mono tracking-wide uppercase hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] transition-all pressable"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Scheduler</span>
          </button>

          {/* Ingest Spreadsheet Button */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#292932] hover:bg-[#34343d] text-white text-xs font-mono font-bold border border-white/10 transition-all pressable"
          >
            <Upload className="w-4 h-4 text-[#c0c1ff]" />
            <span>Upload Schedule</span>
          </button>

          {/* Manual Create Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#571bc1]/60 hover:bg-[#571bc1] text-[#c0c1ff] hover:text-white text-xs font-mono font-bold border border-[#8083ff]/40 transition-all pressable"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#908fa0] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>CHANNELS:</span>
          </span>
          {["all", "linkedin", "x", "instagram", "email", "video"].map((ch) => (
            <button
              key={ch}
              onClick={() => onSelectChannelFilter(ch)}
              className={`px-2.5 py-1 rounded-lg uppercase text-[11px] font-bold transition-colors ${
                selectedChannelFilter === ch
                  ? "bg-[#8083ff]/20 text-[#c0c1ff] border border-[#8083ff]/40"
                  : "bg-[#14141c] text-[#908fa0] hover:text-white border border-white/5"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#908fa0]">STATUS:</span>
          {["all", "PENDING_VERIFICATION", "SCHEDULED", "PUBLISHED"].map((st) => (
            <button
              key={st}
              onClick={() => onSelectStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors ${
                selectedStatusFilter === st
                  ? "bg-[#8083ff]/20 text-[#c0c1ff] border border-[#8083ff]/40"
                  : "bg-[#14141c] text-[#908fa0] hover:text-white border border-white/5"
              }`}
            >
              {st === "PENDING_VERIFICATION" ? `Pending (${pendingCount})` : st}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
