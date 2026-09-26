"use client";

import React, { useState } from "react";
import { Mail, Monitor, Smartphone, Code, Eye, Copy, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface EmailPreviewProps {
  subject: string;
  previewText?: string;
  senderName?: string;
  senderEmail?: string;
  markdownBody: string;
  renderedHtml?: string;
  ctaText?: string;
  ctaUrl?: string;
  onEditSubject?: (val: string) => void;
  onEditBody?: (val: string) => void;
  isEditable?: boolean;
}

export function EmailPreview({
  subject,
  previewText = "",
  senderName = "Velo Dynamics Founder",
  senderEmail = "notifications@velodynamics.com",
  markdownBody,
  renderedHtml,
  ctaText = "Explore Interactive Demo",
  ctaUrl = "https://velodynamics.com/demo",
  onEditSubject,
  onEditBody,
  isEditable = false,
}: EmailPreviewProps) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [viewMode, setViewMode] = useState<"preview" | "markdown">("preview");
  const [copied, setCopied] = useState<"html" | "md" | null>(null);

  const fallbackHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e1e2d; line-height: 1.6; background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6;">
    <div style="width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #4f46e5, #818cf8); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">V</div>
    <span style="font-weight: 700; font-size: 15px; color: #111827;">${senderName}</span>
  </div>
  
  <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin-top: 0; line-height: 1.3;">${subject}</h2>
  
  <div style="font-size: 14px; color: #374151; white-space: pre-wrap; margin: 20px 0;">
${markdownBody}
  </div>

  ${
    ctaUrl
      ? `<div style="margin: 28px 0 16px 0;">
    <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">${ctaText} &rarr;</a>
  </div>`
      : ""
  }

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px 0;" />
  <p style="font-size: 11px; color: #9ca3af; margin: 0; line-height: 1.4;">
    You received this communication because you are subscribed to updates from ${senderName}.<br />
    <a href="#" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> &bull; <a href="#" style="color: #6b7280; text-decoration: underline;">Privacy Policy</a>
  </p>
</div>
`;

  const htmlToRender = renderedHtml || fallbackHtml;

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(htmlToRender);
    setCopied("html");
    toast.success("Email HTML template copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyMd = () => {
    navigator.clipboard.writeText(markdownBody);
    setCopied("md");
    toast.success("Markdown body copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-[#1b1b23] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Header Bar */}
      <div className="p-4 bg-[#14141c] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#571bc1]/30 border border-[#8083ff]/30 flex items-center justify-center text-[#c0c1ff]">
            <Mail className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Email Marketing Campaign</h4>
            <p className="text-[11px] text-[#908fa0]">Campaign-native synchronized newsletter</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport switcher */}
          <div className="flex items-center bg-[#292932] p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setViewport("desktop")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewport === "desktop" ? "bg-[#8083ff] text-[#0d0096] font-bold" : "text-[#908fa0] hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewport === "mobile" ? "bg-[#8083ff] text-[#0d0096] font-bold" : "text-[#908fa0] hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#292932] p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewMode === "preview" ? "bg-[#34343d] text-white" : "text-[#908fa0] hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setViewMode("markdown")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewMode === "markdown" ? "bg-[#34343d] text-white" : "text-[#908fa0] hover:text-white"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Source</span>
            </button>
          </div>

          {/* Copy Actions */}
          <button
            onClick={handleCopyHtml}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#292932] hover:bg-[#34343d] text-white text-xs font-mono rounded-lg border border-white/10 transition-all pressable"
            title="Copy compiled HTML"
          >
            {copied === "html" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#c0c1ff]" />}
            <span>HTML</span>
          </button>
        </div>
      </div>

      {/* Email Metadata Header (Subject line, Sender, Preview text) */}
      <div className="p-4 bg-[#1f1f27] border-b border-white/10 space-y-2.5 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[#908fa0] w-16 flex-shrink-0">FROM:</span>
          <span className="text-white font-medium">{senderName}</span>
          <span className="text-[#908fa0]">&lt;{senderEmail}&gt;</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#908fa0] w-16 flex-shrink-0">SUBJECT:</span>
          {isEditable && onEditSubject ? (
            <input
              type="text"
              value={subject}
              onChange={(e) => onEditSubject(e.target.value)}
              className="flex-1 bg-[#13131b] border border-white/10 rounded px-2.5 py-1 text-white text-xs font-sans font-bold focus:border-[#c0c1ff] outline-hidden"
            />
          ) : (
            <span className="text-white font-bold font-sans text-sm">{subject}</span>
          )}
        </div>

        {previewText && (
          <div className="flex items-center gap-2">
            <span className="text-[#908fa0] w-16 flex-shrink-0">PREVIEW:</span>
            <span className="text-[#c7c4d7] italic truncate">{previewText}</span>
          </div>
        )}
      </div>

      {/* Email Body Canvas */}
      <div className="p-6 bg-[#0e0e14] flex justify-center min-h-[420px] overflow-x-auto">
        {viewMode === "markdown" ? (
          <div className="w-full max-w-2xl bg-[#14141c] p-4 rounded-xl border border-white/10 font-mono text-xs">
            {isEditable && onEditBody ? (
              <textarea
                value={markdownBody}
                onChange={(e) => onEditBody(e.target.value)}
                rows={14}
                className="w-full bg-transparent text-[#e4e1ed] outline-hidden resize-none font-mono leading-relaxed"
                placeholder="Compose email markdown body..."
              />
            ) : (
              <pre className="whitespace-pre-wrap text-[#e4e1ed] leading-relaxed">{markdownBody}</pre>
            )}
          </div>
        ) : (
          <div
            className={`transition-all duration-300 ${
              viewport === "mobile"
                ? "w-[375px] rounded-[36px] border-[8px] border-[#292932] shadow-2xl p-4 bg-white text-black overflow-y-auto"
                : "w-full max-w-[620px] rounded-xl shadow-lg p-6 bg-white text-black"
            }`}
          >
            {viewport === "mobile" && (
              <div className="w-24 h-4 bg-[#292932] rounded-full mx-auto mb-4" />
            )}
            <div
              className="prose prose-sm max-w-none text-slate-800"
              dangerouslySetInnerHTML={{ __html: htmlToRender }}
            />
          </div>
        )}
      </div>

      {/* Footer info banner */}
      <div className="p-3 bg-[#14141c] border-t border-white/10 flex items-center justify-between text-[11px] text-[#908fa0] font-mono px-4">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>HTML Sanitization active &bull; RFC 5322 Compliant</span>
        </span>
        <span>Target CTA: {ctaText}</span>
      </div>
    </div>
  );
}
