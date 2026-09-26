"use client";

import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, FileText, AlertCircle, Loader2, X, Check } from "lucide-react";
import { ingestParseScheduleFile, IngestParseResponse } from "@/lib/api-client";
import { toast } from "sonner";

interface FileUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (data: IngestParseResponse) => void;
}

export function FileUploader({ isOpen, onClose, onParsed }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv", "tsv", "txt", "md", "docx", "pdf"].includes(ext || "")) {
      toast.error(`Unsupported format: .${ext}. Please upload .xlsx, .csv, .txt, .docx, or .pdf.`);
      return;
    }

    setUploading(true);
    try {
      const res = await ingestParseScheduleFile(file, timezone);
      toast.success(`Successfully parsed ${res.total_rows} rows from ${file.name}!`);
      onParsed(res);
      onClose();
    } catch (e) {
      toast.error(`Failed to ingest file: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1b1b23] border border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8083ff]/20 flex items-center justify-center text-[#c0c1ff]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                Upload Marketing Schedule
              </h3>
              <p className="text-xs text-[#908fa0]">Spreadsheets &bull; Word Documents &bull; Plaintext &bull; PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#908fa0] hover:text-white hover:bg-[#292932]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timezone Selection */}
        <div className="flex items-center justify-between gap-3 text-xs font-mono bg-[#14141c] p-3 rounded-xl border border-white/5">
          <span className="text-[#908fa0]">TARGET SCHEDULE TIMEZONE:</span>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="bg-[#1f1f27] border border-white/10 rounded px-2.5 py-1 text-white text-xs font-mono focus:border-[#c0c1ff] outline-hidden"
          />
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? "border-[#8083ff] bg-[#8083ff]/10"
              : "border-white/10 hover:border-white/30 bg-[#14141c]/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv,.tsv,.txt,.docx,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {uploading ? (
            <div className="py-6 flex flex-col items-center gap-2 text-xs font-mono text-[#c0c1ff]">
              <Loader2 className="w-8 h-8 animate-spin text-[#8083ff]" />
              <span>Analyzing columns, validating dates, and extracting slots...</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-[#292932] flex items-center justify-center text-[#c0c1ff] shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Drag & drop your marketing schedule</p>
                <p className="text-xs text-[#908fa0] mt-1 font-mono">
                  Supports Excel (.xlsx), CSV, TXT, DOCX, and PDF tables
                </p>
              </div>
            </>
          )}
        </div>

        {/* Supported Schema Guide */}
        <div className="p-3.5 bg-[#14141c] rounded-xl border border-white/5 space-y-1.5 text-xs text-[#908fa0]">
          <p className="font-bold font-mono text-white text-[11px] uppercase">
            Automatic Column Normalization:
          </p>
          <p className="text-[11px] leading-relaxed font-mono">
            Columns like <code className="text-[#c0c1ff]">Date</code>, <code className="text-[#c0c1ff]">Platform</code>, <code className="text-[#c0c1ff]">Copy</code>, <code className="text-[#c0c1ff]">Subject</code>, and <code className="text-[#c0c1ff]">CTA</code> are automatically matched.
          </p>
        </div>
      </div>
    </div>
  );
}
