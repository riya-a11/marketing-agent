"use client";

import React from "react";
import {
  CalendarEvent,
  CalendarEventStatus,
} from "@/lib/api-client";
import {
  Mail,
  Video,
  Share2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  RotateCw,
  XCircle,
  Copy
} from "lucide-react";

interface CalendarGridProps {
  currentDate: Date;
  viewMode: "month" | "week" | "agenda";
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenVerifyModal: (event: CalendarEvent) => void;
}

export function CalendarGrid({
  currentDate,
  viewMode,
  events,
  onSelectEvent,
  onOpenVerifyModal,
}: CalendarGridProps) {
  const getChannelBadge = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "email":
        return { icon: Mail, label: "EMAIL", bg: "bg-indigo-950/60", text: "text-indigo-300", border: "border-indigo-500/30" };
      case "video":
        return { icon: Video, label: "VIDEO", bg: "bg-purple-950/60", text: "text-purple-300", border: "border-purple-500/30" };
      case "x":
        return { icon: Share2, label: "X", bg: "bg-sky-950/60", text: "text-sky-300", border: "border-sky-500/30" };
      case "instagram":
        return { icon: Share2, label: "IG", bg: "bg-pink-950/60", text: "text-pink-300", border: "border-pink-500/30" };
      default:
        return { icon: Share2, label: "LINKEDIN", bg: "bg-blue-950/60", text: "text-blue-300", border: "border-blue-500/30" };
    }
  };

  const getStatusBadge = (status: CalendarEventStatus) => {
    switch (status) {
      case "PUBLISHED":
        return { icon: CheckCircle2, text: "text-emerald-400", bg: "bg-emerald-950/80 border-emerald-500/40", label: "Published" };
      case "SCHEDULED":
      case "APPROVED":
        return { icon: Clock, text: "text-cyan-400", bg: "bg-cyan-950/80 border-cyan-500/40", label: "Scheduled" };
      case "PUBLISHING":
        return { icon: RotateCw, text: "text-[#c0c1ff] animate-spin", bg: "bg-[#571bc1]/60 border-[#8083ff]/40", label: "Publishing" };
      case "PUBLISH_FAILED":
        return { icon: XCircle, text: "text-rose-400", bg: "bg-rose-950/80 border-rose-500/40", label: "Failed" };
      case "PUBLISH_UNKNOWN":
        return { icon: AlertTriangle, text: "text-amber-400", bg: "bg-amber-950/80 border-amber-500/40", label: "Needs Audit" };
      case "REJECTED":
      case "CANCELLED":
        return { icon: XCircle, text: "text-[#908fa0]", bg: "bg-[#1f1f27] border-white/10", label: status };
      default:
        return { icon: Lock, text: "text-amber-400", bg: "bg-amber-950/80 border-amber-500/40", label: "Needs Verification" };
    }
  };

  // Month grid calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const totalDays = lastDayOfMonth.getDate();

  const daysArray = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysArray.push(new Date(year, month, d));
  }

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((e) => {
      try {
        const evDate = new Date(e.scheduled_at).toISOString().split("T")[0];
        return evDate === dateStr;
      } catch {
        return false;
      }
    });
  };

  if (viewMode === "agenda") {
    return (
      <div className="bg-[#1b1b23] border border-white/10 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider mb-4">
          Agenda Timeline ({events.length} Scheduled Events)
        </h3>

        {events.length === 0 ? (
          <div className="text-center py-16 text-[#908fa0] text-xs font-mono">
            No events found for this filter.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map((ev) => {
              const ch = getChannelBadge(ev.channel);
              const st = getStatusBadge(ev.status);
              const ChIcon = ch.icon;
              const StIcon = st.icon;
              const dt = new Date(ev.scheduled_at);

              return (
                <div
                  key={ev.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#292932]/30 px-3 rounded-xl transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl border ${ch.bg} ${ch.border} flex-shrink-0 mt-0.5`}>
                      <ChIcon className={`w-4 h-4 ${ch.text}`} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${ch.bg} ${ch.text} ${ch.border}`}>
                          {ch.label}
                        </span>
                        <span className="text-xs font-mono text-[#c7c4d7]">
                          {dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at{" "}
                          {dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${st.bg} ${st.text}`}>
                          <StIcon className="w-3 h-3" />
                          <span>{st.label}</span>
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-sm font-sans">{ev.title}</h4>
                      <p className="text-xs text-[#908fa0] line-clamp-1 max-w-2xl font-sans">
                        {ev.channel_payload?.post_text || ev.channel_payload?.source_body || ev.channel_payload?.caption || "No copy preview"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ev.status === "PENDING_VERIFICATION" && (
                      <button
                        onClick={() => onOpenVerifyModal(ev)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold transition-all pressable flex items-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        <span>VERIFY & SIGN OFF</span>
                      </button>
                    )}

                    <button
                      onClick={() => onSelectEvent(ev)}
                      className="px-3 py-1.5 rounded-lg bg-[#292932] hover:bg-[#34343d] text-[#c7c4d7] hover:text-white border border-white/10 text-xs font-mono transition-all pressable"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#1b1b23] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b border-white/10 bg-[#14141c] text-center font-mono text-[11px] font-bold text-[#908fa0] py-2.5">
        <span>SUN</span>
        <span>MON</span>
        <span>TUE</span>
        <span>WED</span>
        <span>THU</span>
        <span>FRI</span>
        <span>SAT</span>
      </div>

      {/* Calendar Grid Cells */}
      <div className="grid grid-cols-7 divide-x divide-y divide-white/5 bg-[#14141c]/40">
        {daysArray.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="min-h-[120px] bg-[#12121a]/30 p-2" />;
          }

          const dayEvents = getEventsForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[130px] p-2 flex flex-col justify-between transition-colors hover:bg-[#1f1f27]/40 ${
                isToday ? "bg-[#571bc1]/10 border-t border-t-[#8083ff]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-mono font-bold ${
                    isToday
                      ? "w-6 h-6 rounded-full bg-[#8083ff] text-[#0d0096] flex items-center justify-center shadow-[0_0_10px_rgba(128,131,255,0.5)]"
                      : "text-[#908fa0]"
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-mono text-[#c0c1ff] font-semibold">
                    {dayEvents.length} slot{dayEvents.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Day's Event Cards */}
              <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[140px]">
                {dayEvents.map((ev) => {
                  const ch = getChannelBadge(ev.channel);
                  const st = getStatusBadge(ev.status);
                  const ChIcon = ch.icon;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.02] pressable ${ch.bg} ${ch.border}`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-[9px] font-mono font-bold uppercase flex items-center gap-1 ${ch.text}`}>
                          <ChIcon className="w-2.5 h-2.5" />
                          <span>{ch.label}</span>
                        </span>

                        <span className={`text-[9px] font-mono ${st.text}`}>
                          {ev.status === "PENDING_VERIFICATION" ? "VERIFY" : ev.status}
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold text-white truncate font-sans">
                        {ev.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
