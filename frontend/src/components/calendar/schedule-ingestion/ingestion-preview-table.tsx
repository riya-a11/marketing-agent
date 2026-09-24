"use client";

import React, { useState } from "react";
import { IngestParseResponse, IngestionRow } from "@/lib/api-client";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Save, Trash2, X } from "lucide-react";

interface IngestionPreviewTableProps {
  data: IngestParseResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rows: IngestionRow[]) => void;
}

export function IngestionPreviewTable({
  data,
  isOpen,
  onClose,
  onConfirm,
}: IngestionPreviewTableProps) {
  const [rows, setRows] = useState<IngestionRow[]>(() => data?.rows ?? []);
  const prevDataRef = React.useRef(data);

  React.useEffect(() => {
    if (data && data !== prevDataRef.current && data.rows) {
      prevDataRef.current = data;
      setRows(data.rows);
    }
  }, [data]);

  if (!isOpen || !data) return null;

  const validCount = rows.filter((r) => r.status !== "error").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  const handleUpdateRow = (index: number, field: keyof IngestionRow, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };

      // Re-evaluate error status if corrected
      if (field === "channel") {
        if (["linkedin", "x", "instagram", "email", "video"].includes(value.toLowerCase())) {
          target.errors = target.errors.filter((e) => !e.toLowerCase().includes("channel"));
        }
      }
      if (target.errors.length === 0) {
        target.status = target.warnings.length > 0 ? "warning" : "valid";
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCommit = () => {
    onConfirm(rows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1b1b23] border border-white/10 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 bg-[#14141c] border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                Schedule Ingestion Review
              </h3>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#292932] text-white">
                {data.filename}
              </span>
            </div>
            <p className="text-xs text-[#908fa0] mt-0.5">
              Review and correct parsed rows. Confirmed events will enter the Verification Queue as PENDING.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {validCount} Ready
            </span>
            {errorCount > 0 && (
              <span className="text-xs font-mono text-rose-400 font-bold">
                {errorCount} Need Fixing
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#908fa0] hover:text-white hover:bg-[#292932]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#14141c]">
            <table className="w-full text-left text-xs font-mono divide-y divide-white/5">
              <thead className="bg-[#1b1b23] text-[#908fa0] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-28">Channel</th>
                  <th className="p-3 w-48">Scheduled Date & Time</th>
                  <th className="p-3">Title & Copy</th>
                  <th className="p-3 w-32">Status</th>
                  <th className="p-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white">
                {rows.map((row, idx) => {
                  const isError = row.status === "error";
                  const isWarning = row.status === "warning";

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-[#292932]/40 transition-colors ${
                        isError ? "bg-rose-950/20" : isWarning ? "bg-amber-950/10" : ""
                      }`}
                    >
                      <td className="p-3 text-center text-[#908fa0]">{row.row_number}</td>

                      <td className="p-3">
                        <select
                          value={row.channel}
                          onChange={(e) => handleUpdateRow(idx, "channel", e.target.value)}
                          className={`w-full bg-[#1b1b23] border rounded px-2 py-1 uppercase text-xs outline-hidden ${
                            isError && row.errors.some((e) => e.includes("channel"))
                              ? "border-rose-500 text-rose-300 font-bold"
                              : "border-white/10 text-white"
                          }`}
                        >
                          <option value="linkedin">LinkedIn</option>
                          <option value="x">X</option>
                          <option value="instagram">Instagram</option>
                          <option value="email">Email</option>
                          <option value="video">Video</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <input
                          type="datetime-local"
                          value={row.scheduled_at ? new Date(row.scheduled_at).toISOString().slice(0, 16) : ""}
                          onChange={(e) =>
                            handleUpdateRow(idx, "scheduled_at", new Date(e.target.value).toISOString())
                          }
                          className={`w-full bg-[#1b1b23] border rounded px-2 py-1 text-xs outline-hidden ${
                            isError && row.errors.some((e) => e.includes("date"))
                              ? "border-rose-500 text-rose-300 font-bold"
                              : "border-white/10 text-white"
                          }`}
                        />
                      </td>

                      <td className="p-3 space-y-1">
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) => handleUpdateRow(idx, "title", e.target.value)}
                          className="w-full bg-[#1b1b23] border border-white/10 rounded px-2 py-1 text-xs font-bold text-white outline-hidden"
                          placeholder="Event Title"
                        />
                        <textarea
                          rows={2}
                          value={row.content_text}
                          onChange={(e) => handleUpdateRow(idx, "content_text", e.target.value)}
                          className="w-full bg-[#12121a] border border-white/5 rounded p-2 text-xs text-[#c7c4d7] font-sans resize-none outline-hidden"
                          placeholder="Post copy..."
                        />
                      </td>

                      <td className="p-3">
                        {isError ? (
                          <div className="space-y-1 text-[10px] text-rose-400">
                            <span className="font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>Validation Error</span>
                            </span>
                            <ul className="list-disc list-inside leading-tight opacity-90">
                              {row.errors.map((e, ei) => (
                                <li key={ei}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        ) : isWarning ? (
                          <div className="space-y-1 text-[10px] text-amber-400">
                            <span className="font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>Notice</span>
                            </span>
                            <p className="leading-tight opacity-90">{row.warnings[0]}</p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Valid</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1.5 rounded hover:bg-rose-950/60 text-[#908fa0] hover:text-rose-300 transition-colors"
                          title="Drop row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#14141c] border-t border-white/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#292932] text-white text-xs font-mono hover:bg-[#34343d]"
          >
            Cancel
          </button>

          <button
            onClick={handleCommit}
            disabled={validCount === 0}
            className="px-6 py-2.5 rounded-xl bg-[#8083ff] hover:bg-[#c0c1ff] text-[#0d0096] font-black text-xs font-mono uppercase tracking-wider transition-all pressable flex items-center gap-2 disabled:opacity-50"
          >
            <span>Commit {validCount} Events to Verification Queue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
