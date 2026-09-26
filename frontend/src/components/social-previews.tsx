"use client";

import React from "react";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Bookmark,
  ThumbsUp,
  Send,
  MoreHorizontal,
  CheckCircle2,
  Sparkles,
  Play,
  Volume2,
  Film,
  Lightbulb,
  Globe,
  Radio,
} from "lucide-react";

interface SocialPreviewProps {
  channel: "linkedin" | "x" | "instagram" | "video" | "youtube" | "email";
  postText: string;
  cta?: string;
  title?: string;
  subject?: string;
  senderName?: string;
  visualHeadline?: string;
  videoScenes?: Array<{ voiceover?: string; visual?: string }>;
}

export function SocialPreview({
  channel,
  postText,
  cta,
  title,
  subject,
  senderName,
  visualHeadline,
  videoScenes,
}: SocialPreviewProps) {
  const defaultText = postText || "Your generated campaign copy will appear here in real-time...";

  if (channel === "linkedin") {
    return (
      <div className="bg-[#1b1b23] rounded-xl border border-white/10 shadow-lg overflow-hidden text-[#e4e1ed] transition-all font-sans">
        {/* LinkedIn Header */}
        <div className="p-4 flex items-start justify-between border-b border-white/5 bg-[#1f1f27]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20 font-mono">
              VD
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-sm text-[#e4e1ed]">
                <span>Velo Dynamics</span>
                <span className="text-xs text-[#908fa0] font-normal">• 1st</span>
              </div>
              <p className="text-xs text-[#c7c4d7] line-clamp-1">
                Autonomous Financial Operations • Marketing OS
              </p>
              <p className="text-[11px] text-[#908fa0] flex items-center gap-1 mt-0.5 font-mono">
                <span>Just now</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[#c0c1ff]" />
                  Verified Provenance
                </span>
              </p>
            </div>
          </div>
          <button className="text-[#908fa0] hover:text-[#e4e1ed] p-1 rounded-lg">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* LinkedIn Body Text */}
        <div className="p-4 text-sm text-[#e4e1ed] whitespace-pre-line leading-relaxed font-normal">
          {defaultText}
        </div>

        {/* Attached Link Card */}
        <div className="mx-4 mb-4 rounded-lg border border-white/10 overflow-hidden bg-[#13131b] hover:border-indigo-400/40 transition-colors">
          <div className="h-32 bg-gradient-to-br from-[#1f1f27] via-[#1b1b23] to-[#0d0d15] p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#8083ff]/15 rounded-full blur-2xl pointer-events-none" />
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-[#c0c1ff] bg-[#292932] px-2 py-0.5 rounded border border-white/10 w-fit">
              <Sparkles className="w-3 h-3 text-[#c0c1ff]" />
              VERIFIED PROOF
            </span>
            <div>
              <h4 className="text-white font-bold text-sm line-clamp-1">{title || "Reconciliation Reimagined"}</h4>
              <p className="text-[#c7c4d7] text-xs mt-0.5 line-clamp-1">From 3 days down to 40 minutes with AI automation</p>
            </div>
          </div>
          <div className="p-3 bg-[#1b1b23] border-t border-white/5 flex items-center justify-between">
            <div className="text-xs">
              <p className="font-mono text-[#c0c1ff]">velo.io/proof</p>
              <p className="text-[#908fa0] text-[11px]">{cta || "Read the breakdown"}</p>
            </div>
            <button className="px-3 py-1 rounded bg-[#8083ff] text-[#0d0096] text-xs font-bold font-mono hover:bg-[#c0c1ff] transition-colors">
              VIEW
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-xs text-[#908fa0] font-mono">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white">
              <ThumbsUp className="w-3 h-3" />
            </span>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white">
              <Lightbulb className="w-3 h-3" />
            </span>
            <span className="ml-1 text-[#e4e1ed] font-semibold">142</span>
          </div>
          <span>18 comments • 9 reposts</span>
        </div>

        {/* Action Bar */}
        <div className="px-2 py-1.5 border-t border-white/5 grid grid-cols-4 gap-1 text-[#c7c4d7] text-xs font-semibold">
          <button className="flex items-center justify-center gap-1.5 py-2 rounded hover:bg-white/5 transition-colors">
            <ThumbsUp className="w-4 h-4" />
            <span>Like</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 py-2 rounded hover:bg-white/5 transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span>Comment</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 py-2 rounded hover:bg-white/5 transition-colors">
            <Repeat2 className="w-4 h-4" />
            <span>Repost</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 py-2 rounded hover:bg-white/5 transition-colors">
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    );
  }

  if (channel === "x") {
    return (
      <div className="bg-[#000000] text-white rounded-xl border border-neutral-800 shadow-lg p-4 transition-all font-sans">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700 flex-shrink-0 flex items-center justify-center font-bold text-sm font-mono text-[#c0c1ff]">
            <Share2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-bold text-white">Velo</span>
                <CheckCircle2 className="w-4 h-4 text-sky-400 fill-sky-400" />
                <span className="text-neutral-500 font-mono text-xs">@velo_hq</span>
                <span className="text-neutral-500 text-xs">· 2m</span>
              </div>
              <button className="text-neutral-500 hover:text-neutral-300">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2 text-sm text-neutral-100 whitespace-pre-line leading-relaxed">
              {defaultText}
            </div>

            <div className="mt-3 rounded-lg border border-neutral-800 overflow-hidden bg-neutral-950">
              <div className="h-40 bg-gradient-to-tr from-[#1b1b23] via-[#0d0d15] to-[#1f1f27] flex flex-col justify-end p-4 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(128,131,255,0.2),transparent_70%)]" />
                <div className="relative z-10">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#c0c1ff]">Executive Briefing</p>
                  <h4 className="text-base font-bold text-white mt-1">3 Days to 40 Minutes Reconciliation</h4>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-neutral-400 text-xs max-w-md pt-2 border-t border-neutral-900 font-mono">
              <button className="flex items-center gap-1.5 hover:text-sky-400 transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>32</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                <Repeat2 className="w-4 h-4" />
                <span>84</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-pink-500 transition-colors">
                <Heart className="w-4 h-4" />
                <span>419</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-sky-400 transition-colors">
                <Bookmark className="w-4 h-4" />
                <span>56</span>
              </button>
              <button className="hover:text-neutral-300 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (channel === "instagram") {
    return (
      <div className="bg-[#1b1b23] rounded-xl border border-white/10 shadow-lg overflow-hidden text-[#e4e1ed] max-w-md mx-auto font-sans">
        <div className="p-3 flex items-center justify-between border-b border-white/5 bg-[#1f1f27]">
          <div className="flex items-center gap-2.5">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
              <div className="w-7 h-7 rounded-full bg-[#13131b] p-0.5">
                <div className="w-full h-full rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs font-mono">
                  V
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-xs text-white font-mono">velodynamics</p>
              <p className="text-[10px] text-[#908fa0]">Verified Audio</p>
            </div>
          </div>
          <MoreHorizontal className="w-4 h-4 text-[#908fa0]" />
        </div>

        <div className="aspect-square bg-gradient-to-br from-[#0d0d15] via-[#1f1f27] to-[#13131b] p-6 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#8083ff]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-center z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-white/10 backdrop-blur-md border border-white/20 text-[#c0c1ff]">
              FOUNDER PROOF
            </span>
            <Sparkles className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div className="z-10 text-center px-2 font-mono">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 leading-tight uppercase">
              {visualHeadline || "3 DAYS / 40 MIN"}
            </p>
            <p className="text-xs text-[#c7c4d7] max-w-[240px] mx-auto font-sans">
              {title || "Automated invoice matching eliminates ledger friction forever."}
            </p>
          </div>
          <div className="z-10 flex justify-between items-center text-[11px] font-mono text-[#908fa0] border-t border-white/10 pt-3">
            <span>VELO DYNAMICS</span>
            <span>{cta || "LINK IN BIO"}</span>
          </div>
        </div>

        <div className="p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[#c7c4d7]">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 hover:text-rose-400 transition-colors cursor-pointer" />
              <MessageCircle className="w-5 h-5 hover:text-[#c0c1ff] transition-colors cursor-pointer" />
              <Share2 className="w-5 h-5 hover:text-[#c0c1ff] transition-colors cursor-pointer" />
            </div>
            <Bookmark className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
          </div>
          <p className="text-xs font-bold text-white font-mono">428 likes</p>
          <div className="text-xs text-[#e4e1ed] leading-relaxed">
            <span className="font-bold mr-1.5 text-white font-mono">velodynamics</span>
            {defaultText}
          </div>
        </div>
      </div>
    );
  }

  if (channel === "email") {
    return (
      <div className="bg-[#1b1b23] rounded-xl border border-white/10 shadow-lg overflow-hidden text-[#e4e1ed] font-sans">
        {/* Email Client Header */}
        <div className="p-4 border-b border-white/10 bg-[#1f1f27] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-[11px] text-[#908fa0] font-mono ml-2">Inbox Preview</span>
            </div>
            <span className="text-[10px] font-mono bg-[#8083ff]/15 text-[#c0c1ff] px-2 py-0.5 rounded border border-[#8083ff]/30">
              HTML + Plain Text
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2 text-xs">
              <span className="text-[#908fa0] font-mono w-14">From:</span>
              <span className="text-white font-medium">{senderName || "Founding Team"} &lt;updates@velodynamics.com&gt;</span>
            </div>
            <div className="flex items-baseline gap-2 text-xs mt-1">
              <span className="text-[#908fa0] font-mono w-14">Subject:</span>
              <span className="text-[#c0c1ff] font-semibold">{subject || title || "A new milestone is live"}</span>
            </div>
          </div>
        </div>

        {/* Email Body Preview */}
        <div className="p-6 bg-[#16161e] space-y-4">
          <div className="p-5 rounded-lg bg-[#1f1f27] border border-white/5 space-y-4 max-w-lg mx-auto text-xs text-[#e4e1ed] leading-relaxed">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <span className="font-bold text-sm text-white">Velo Dynamics</span>
              <span className="text-[10px] text-[#908fa0] font-mono">Customer Update</span>
            </div>

            <div className="whitespace-pre-line space-y-2">
              {defaultText}
            </div>

            <div className="pt-2 text-center">
              <a
                href="#preview-cta"
                onClick={(e) => e.preventDefault()}
                className="inline-block px-5 py-2.5 rounded-lg bg-[#8083ff] text-[#0d0096] text-xs font-bold font-mono hover:bg-[#c0c1ff] transition-colors"
              >
                {cta || "Explore the Interactive Demo &rarr;"}
              </a>
            </div>

            <div className="pt-4 border-t border-white/10 text-[10px] text-[#908fa0] text-center">
              You received this email because you subscribed to updates from our team.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Video Storyboard (default or for "video" / "youtube")
  return (
    <div className="bg-[#1b1b23] text-white rounded-xl border border-white/10 shadow-lg overflow-hidden font-sans">
      <div className="aspect-video bg-gradient-to-tr from-[#0d0d15] via-[#1f1f27] to-[#13131b] relative flex flex-col justify-between p-5 border-b border-white/10">
        <div className="flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-mono text-[#c0c1ff]">DIRECTOR STORYBOARD (16:9)</span>
          </div>
          <span className="text-xs font-mono bg-[#292932] px-2 py-0.5 rounded text-[#c0c1ff] border border-white/10">
            00:45 • 4K 60FPS
          </span>
        </div>

        <div className="self-center flex flex-col items-center gap-2 z-10">
          <div className="w-14 h-14 rounded-full bg-[#8083ff] text-[#0d0096] flex items-center justify-center shadow-lg shadow-[#8083ff]/30 hover:scale-105 transition-transform cursor-pointer border border-[#c0c1ff]/40">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
          <span className="text-xs font-mono text-[#c7c4d7]">PREVIEW MOTION NARRATIVE</span>
        </div>

        <div className="flex items-end gap-1 h-6 z-10">
          <Volume2 className="w-4 h-4 text-[#908fa0] mr-2" />
          {[40, 75, 30, 90, 60, 100, 45, 80, 55, 95, 35, 70, 85, 40, 65].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-[#8083ff] rounded-full animate-pulse"
              style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[280px] overflow-y-auto font-mono">
        <div className="flex items-center gap-2 text-xs font-bold text-[#c0c1ff] uppercase tracking-wider">
          <Film className="w-4 h-4" />
          <span>Scene Breakdown</span>
        </div>
        {videoScenes && videoScenes.length > 0 ? (
          videoScenes.map((scene, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-[#1f1f27] border border-white/5 text-xs space-y-1">
              <div className="flex justify-between text-[#908fa0] text-[11px]">
                <span>SCENE {idx + 1}</span>
                <span className="text-[#c0c1ff]">{scene.visual || "Kinetic Motion Graphic"}</span>
              </div>
              <p className="text-[#e4e1ed] font-sans font-medium leading-relaxed">
                &ldquo;{scene.voiceover || "..."}&rdquo;
              </p>
            </div>
          ))
        ) : (
          <div className="p-3 rounded-lg bg-[#1f1f27] border border-white/5 text-xs text-[#c7c4d7]">
            Voiceover thesis: &ldquo;{postText || "How a single finance update turns into a high-converting video campaign."}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
