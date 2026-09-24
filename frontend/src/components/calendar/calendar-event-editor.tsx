"use client";

import React, { useState, useEffect } from "react";
import { CalendarEvent, VerificationAuditLog } from "@/lib/api-client";
import { X, Save, Trash2, Copy, AlertTriangle, History, ShieldCheck, Lock } from "lucide-react";

interface CalendarEventEditorProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onDelete: (eventId: string) => void;
  onDuplicate: (eventId: string) => void;
  auditLogs?: VerificationAuditLog[];
}

export function CalendarEventEditor({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  auditLogs = [],
}: CalendarEventEditorProps) {
  const [title, setTitle] = useState(() => event?.title || "");
  const [channel, setChannel] = useState(() => event?.channel || "linkedin");
  const [scheduledAt, setScheduledAt] = useState(() => event?.scheduled_at ? new Date(event.scheduled_at).toISOString().slice(0, 16) : "");
  const [timezone, setTimezone] = useState(() => event?.timezone || "Asia/Kolkata");
  const [postText, setPostText] = useState(() => {
    const pl = event?.channel_payload || {};
    return (pl.post_text || pl.source_body || pl.caption || "") as string;
  });
  const [cta, setCta] = useState(() => {
    const pl = event?.channel_payload || {};
    return (pl.cta || pl.cta_button_text || "") as string;
  });
  const [subject, setSubject] = useState(() => {
    const pl = event?.channel_payload || {};
    return (pl.subject || event?.title || "") as string;
  });
  const [showHistory, setShowHistory] = useState(false);

  const prevEventIdRef = React.useRef(event?.id);

  useEffect(() => {
    if (event && event.id !== prevEventIdRef.current) {
      prevEventIdRef.current = event.id;
      setTitle(event.title || "");
      setChannel(event.channel || "linkedin");
      setScheduledAt(event.scheduled_at ? new Date(event.scheduled_at).toISOString().slice(0, 16) : "");
      setTimezone(event.timezone || "Asia/Kolkata");
      const pl = event.channel_payload || {};
      setPostText((pl.post_text || pl.source_body || pl.caption || "") as string);
      setCta((pl.cta || pl.cta_button_text || "") as string);
      setSubject((pl.subject || event.title || "") as string);
      setShowHistory(false);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const isPublished = event.status === "PUBLISHED";
  const isApproved = event.status === "SCHEDULED" || event.status === "APPROVED";

  const handleSave = () => {
    const channelPayload: Record<string, unknown> = { ...event.channel_payload };
    if (channel === "email") {
      channelPayload.subject = subject;
      channelPayload.source_body = postText;
      channelPayload.rendered_html = `<div style="font-family: sans-serif; line-height: 1.6;"><h2>${subject}</h2><p>${postText}</p></div>`;
      channelPayload.plain_text_fallback = postText;
      channelPayload.cta_button_text = cta;
    } else if (channel === "instagram") {
      channelPayload.caption = postText;
      channelPayload.cta = cta;
    } else {
      channelPayload.post_text = postText;
      channelPayload.cta = cta;
    }

    onSave(event.id, {
      title,
      channel,
      scheduled_at: new Date(scheduledAt).toISOString(),
      timezone,
      channel_payload: channelPayload,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1b1b23] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 bg-[#14141c] border-b border-white/10 flex items-center justify-between sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                Event Details & Editor
              </h3>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#292932] text-[#c0c1ff] border border-white/10">
                {event.status}
              </span>
            </div>
            <p className="text-xs text-[#908fa0] font-mono mt-0.5">
              Version {event.content_version} &bull; Hash: {event.current_content_hash.slice(0, 10)}...
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-xl text-xs font-mono transition-colors flex items-center gap-1 ${
                showHistory ? "bg-[#8083ff] text-[#0d0096]" : "bg-[#292932] text-[#908fa0] hover:text-white"
              }`}
              title="Audit trail"
            >
              <History className="w-4 h-4" />
              <span>Audit</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#908fa0] hover:text-white hover:bg-[#292932] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 flex-1">
          {isPublished && (
            <div className="p-4 bg-blue-950/60 border border-blue-500/40 rounded-xl text-xs text-blue-200 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span>
                This event is <strong>PUBLISHED</strong> and historically immutable. To use this copy again, click <strong>Duplicate Draft</strong> below.
              </span>
            </div>
          )}

          {isApproved && (
            <div className="p-4 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Warning:</strong> This event was previously verified. Making changes to content or time will invalidate its approval and reset its status to <strong>PENDING_VERIFICATION</strong>.
              </span>
            </div>
          )}

          {showHistory ? (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-white">Immutable Verification Audit Trail</h4>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-[#908fa0] font-mono py-8 text-center">No sign-off records logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-[#14141c] rounded-xl border border-white/5 text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between text-[#c0c1ff]">
                        <span className="font-bold uppercase">{log.action}</span>
                        <span className="text-[#908fa0]">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-white">By: {log.user_id} ({log.user_role}) &bull; v{log.content_version}</p>
                      {log.notes && <p className="text-[#908fa0] italic">&ldquo;{log.notes}&rdquo;</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-[#908fa0] block mb-1">EVENT TITLE</label>
                <input
                  type="text"
                  disabled={isPublished}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#14141c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-hidden focus:border-[#c0c1ff] disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="text-xs text-[#908fa0] block mb-1">CHANNEL</label>
                  <select
                    disabled={isPublished}
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full bg-[#14141c] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-hidden focus:border-[#c0c1ff] uppercase disabled:opacity-50"
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X (Twitter)</option>
                    <option value="instagram">Instagram</option>
                    <option value="email">Email</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#908fa0] block mb-1">SCHEDULED AT</label>
                  <input
                    type="datetime-local"
                    disabled={isPublished}
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-[#14141c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-hidden focus:border-[#c0c1ff] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#908fa0] block mb-1">TIMEZONE</label>
                  <input
                    type="text"
                    disabled={isPublished}
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[#14141c] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-hidden focus:border-[#c0c1ff] disabled:opacity-50"
                  />
                </div>
              </div>

              {channel === "email" && (
                <div>
                  <label className="text-xs font-mono text-[#908fa0] block mb-1">EMAIL SUBJECT</label>
                  <input
                    type="text"
                    disabled={isPublished}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-[#14141c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-hidden focus:border-[#c0c1ff] disabled:opacity-50 font-bold"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-mono text-[#908fa0] block mb-1">
                  {channel === "email" ? "EMAIL BODY (MARKDOWN)" : "POST COPY"}
                </label>
                <textarea
                  rows={6}
                  disabled={isPublished}
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="w-full bg-[#14141c] border border-white/10 rounded-xl p-3.5 text-xs text-white outline-hidden focus:border-[#c0c1ff] disabled:opacity-50 font-sans leading-relaxed resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-[#908fa0] block mb-1">CALL TO ACTION (CTA)</label>
                <input
                  type="text"
                  disabled={isPublished}
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  className="w-full bg-[#14141c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-hidden focus:border-[#c0c1ff] disabled:opacity-50 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#14141c] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onDuplicate(event.id);
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-[#292932] hover:bg-[#34343d] text-white text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-[#c0c1ff]" />
              <span>Duplicate Draft</span>
            </button>

            {!isPublished && (
              <button
                onClick={() => {
                  onDelete(event.id);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-mono transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#292932] text-white text-xs font-mono hover:bg-[#34343d]"
            >
              Close
            </button>

            {!isPublished && (
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-[#8083ff] text-[#0d0096] font-bold text-xs font-mono uppercase tracking-wider hover:bg-[#c0c1ff] transition-all pressable flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
