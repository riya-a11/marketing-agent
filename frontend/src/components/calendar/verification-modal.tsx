"use client";

import React, { useState } from "react";
import { CalendarEvent } from "@/lib/api-client";
import { Lock, ShieldCheck, X, Check, AlertTriangle, Clock, Calendar, Mail, FileText, Send } from "lucide-react";
import { EmailPreview } from "../email-preview";

interface VerificationModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (params: {
    eventId: string;
    contentVersion: number;
    contentHash: string;
    immediateAction?: string;
    rescheduledAt?: string;
    notes?: string;
  }) => void;
  onReject: (eventId: string, reason: string) => void;
}

export function VerificationModal({
  event,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: VerificationModalProps) {
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [pastDateChoice, setPastDateChoice] = useState<"dispatch_now" | "reschedule">("dispatch_now");
  const [rescheduleDate, setRescheduleDate] = useState("");

  if (!isOpen || !event) return null;

  const isEmail = event.channel.toLowerCase() === "email";
  const isVideo = event.channel.toLowerCase() === "video";
  const scheduledDate = new Date(event.scheduled_at);
  const isPast = scheduledDate <= new Date();

  const handleConfirmApprove = () => {
    onApprove({
      eventId: event.id,
      contentVersion: event.content_version,
      contentHash: event.current_content_hash,
      immediateAction: isPast ? (pastDateChoice === "dispatch_now" ? "DISPATCH_NOW" : undefined) : undefined,
      rescheduledAt: isPast && pastDateChoice === "reschedule" && rescheduleDate ? new Date(rescheduleDate).toISOString() : undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) return;
    onReject(event.id, rejectReason);
    setIsRejecting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1b1b23] border border-amber-500/40 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-6 bg-[#14141c] border-b border-white/10 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                  Human-in-the-Loop Verification Gate
                </h3>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {event.channel.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#908fa0] font-mono">
                Cryptographic Snapshot Lock &bull; Version {event.content_version}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#908fa0] hover:text-white hover:bg-[#292932] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Version and Hash Banner */}
          <div className="bg-[#14141c] p-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div>
              <span className="text-[#908fa0]">CANONICAL CONTENT HASH:</span>
              <span className="text-[#c0c1ff] font-bold block truncate max-w-md">
                {event.current_content_hash}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#908fa0]">SCHEDULED FOR:</span>
              <span className="text-white font-bold block">
                {scheduledDate.toLocaleString()} ({event.timezone})
              </span>
            </div>
          </div>

          {/* Past Date Alert & Resolution */}
          {isPast && (
            <div className="p-4 bg-amber-950/60 border border-amber-500/40 rounded-xl space-y-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Scheduled slot has already passed ({scheduledDate.toLocaleString()})</span>
              </div>
              <p className="text-[#c7c4d7]">
                Per your safety specification, past events will not silently publish. Choose how to proceed:
              </p>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="radio"
                    name="past_choice"
                    checked={pastDateChoice === "dispatch_now"}
                    onChange={() => setPastDateChoice("dispatch_now")}
                    className="accent-amber-500"
                  />
                  <span>Dispatch Immediately Upon Sign-off</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="radio"
                    name="past_choice"
                    checked={pastDateChoice === "reschedule"}
                    onChange={() => setPastDateChoice("reschedule")}
                    className="accent-amber-500"
                  />
                  <span>Reschedule for a Future Slot</span>
                </label>
              </div>

              {pastDateChoice === "reschedule" && (
                <div className="pt-2">
                  <input
                    type="datetime-local"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="bg-[#14141c] border border-white/20 rounded-lg px-3 py-2 text-white text-xs font-mono outline-hidden focus:border-amber-400"
                  />
                </div>
              )}
            </div>
          )}

          {/* Post / Channel Content Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase text-[#908fa0] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#c0c1ff]" />
              <span>Exact Content Snapshot For Verification</span>
            </h4>

            {isEmail ? (
              <EmailPreview
                subject={event.channel_payload?.subject || event.title}
                previewText={event.channel_payload?.preview_text}
                senderName={event.channel_payload?.sender_name || "Brand Founder"}
                markdownBody={event.channel_payload?.source_body || ""}
                renderedHtml={event.channel_payload?.rendered_html}
                ctaText={event.channel_payload?.cta_button_text || "Explore Demo"}
                ctaUrl={event.channel_payload?.cta_url || "https://velodynamics.com"}
              />
            ) : isVideo ? (
              <div className="bg-[#14141c] p-4 rounded-xl border border-white/10 space-y-3">
                <h5 className="font-bold text-white text-sm">{event.title}</h5>
                <p className="text-xs text-[#c0c1ff]">
                  Hook Line: &ldquo;{event.channel_payload?.hook_line}&rdquo;
                </p>
                <div className="space-y-2">
                  {event.channel_payload?.scenes?.map((sc) => (
                    <div key={sc.scene_no} className="p-2.5 bg-[#1b1b23] rounded-lg border border-white/5 text-xs">
                      <span className="font-bold text-white">Scene {sc.scene_no}:</span>
                      <p className="text-[#908fa0] mt-0.5">Visual: {sc.visual}</p>
                      <p className="text-[#e4e1ed] mt-0.5 font-medium">VO: &ldquo;{sc.voiceover}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#14141c] p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{event.title}</span>
                  <span className="text-[10px] font-mono uppercase text-[#c0c1ff]">{event.channel}</span>
                </div>
                <p className="text-sm text-white whitespace-pre-wrap leading-relaxed font-sans">
                  {event.channel_payload?.post_text || event.channel_payload?.caption || "No text available"}
                </p>
                {event.channel_payload?.cta && (
                  <div className="pt-2 border-t border-white/5 text-xs text-[#c0c1ff] font-mono">
                    CTA: {event.channel_payload.cta}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reviewer Commentary */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#908fa0]">OPTIONAL AUDIT NOTES:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified customer metrics against Q3 audit logs."
              className="w-full bg-[#14141c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-hidden focus:border-[#c0c1ff] font-mono"
            />
          </div>

          {/* Rejection Drawer */}
          {isRejecting && (
            <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl space-y-3 animate-in fade-in">
              <label className="text-xs font-mono font-bold text-rose-300">
                REASON FOR REJECTION (Stored in Immutable Audit Trail):
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Explain what needs revision or why this post cannot go live..."
                className="w-full bg-[#14141c] border border-rose-500/30 rounded-xl p-3 text-xs text-white outline-hidden font-sans"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#292932] text-xs font-mono text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={!rejectReason.trim()}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs font-mono uppercase transition-all hover:bg-rose-500 disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 bg-[#14141c] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="flex items-center gap-2">
            {!isRejecting && (
              <button
                onClick={() => setIsRejecting(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold transition-all pressable"
              >
                Reject with Feedback
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#292932] hover:bg-[#34343d] text-white text-xs font-mono transition-all pressable"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmApprove}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-[#062419] font-black text-xs font-mono uppercase tracking-wider hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all pressable flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify & Authorize Posting</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
