"use client";

import { useState } from "react";
import { Film, Play, Sparkles, Video, Settings, FileText, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { generateVideoStoryboard, renderVideo } from "@/lib/api-client";

export default function VideoStudioPage() {
  const [selectedPost, setSelectedPost] = useState(
    "🚀 Exciting news! We are launching our new AI Marketing OS built specifically for early-stage startup founders. Build your brand memory in minutes and never run out of campaign ideas again."
  );

  // Preference states tailored for 9:16 reels
  const [duration, setDuration] = useState("30s");
  const [visualStyle, setVisualStyle] = useState("Cinematic Founder");
  const [voiceTone, setVoiceTone] = useState("Energetic");
  const [provider, setProvider] = useState("veo");

  const [loadingStoryboard, setLoadingStoryboard] = useState(false);
  const [loadingRender, setLoadingRender] = useState(false);
  const [storyboard, setStoryboard] = useState<any>(null);
  const [renderResult, setRenderResult] = useState<any>(null);

  const handleGenerateStoryboard = async () => {
    setLoadingStoryboard(true);
    setRenderResult(null);
    try {
      const res = await generateVideoStoryboard({
        selected_post: selectedPost,
        preferences: {
          aspect_ratio: "9:16",
          target_duration: duration,
          visual_style: visualStyle,
          voice_tone: voiceTone,
        },
      });
      setStoryboard(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStoryboard(false);
    }
  };

  const handleRenderVideo = async () => {
    if (!storyboard) return;
    setLoadingRender(true);
    try {
      const res = await renderVideo({
        provider_name: provider,
        storyboard,
      });
      setRenderResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRender(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">AI Video Generation Studio (9:16 Reel)</h1>
            <p className="text-xs text-slate-400">Your Assigned Module • Google Veo & NVIDIA Cosmos Ready</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all"
        >
          Back to Dashboard
        </Link>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Preferences & Selected Post Input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <FileText className="w-4 h-4" /> 1. Selected Post Content
            </div>
            <textarea
              value={selectedPost}
              onChange={(e) => setSelectedPost(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder="Paste selected post content here..."
            />
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
              <Settings className="w-4 h-4" /> 2. 9:16 Reel Settings
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Reel Duration (Max 60s)</label>
              <div className="grid grid-cols-3 gap-2">
                {["15s", "30s", "60s"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      duration === d
                        ? "bg-purple-600/20 border-purple-500 text-purple-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Style Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Visual Style</label>
              <select
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Cinematic Founder">Cinematic Founder (Direct Camera)</option>
                <option value="Minimalist Tech">Minimalist Tech (UI + Motion)</option>
                <option value="Dynamic UGC">Dynamic UGC (Fast Paced)</option>
                <option value="Kinetic Typography">Kinetic Typography (Text Heavy)</option>
              </select>
            </div>

            {/* Voice Tone Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Voice Tone</label>
              <select
                value={voiceTone}
                onChange={(e) => setVoiceTone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Energetic">Energetic & Fast</option>
                <option value="Authoritative">Authoritative & Inspiring</option>
                <option value="Relatable">Relatable & Casual</option>
                <option value="Enthusiastic">High-Energy Enthusiastic</option>
              </select>
            </div>

            {/* AI Engine Provider */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">AI Video Model Engine</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="veo">Google Veo 2 (Photorealistic)</option>
                <option value="cosmos">NVIDIA Cosmos (World Model)</option>
                <option value="mock">Mock Offline Render (Dev Test)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateStoryboard}
              disabled={loadingStoryboard}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {loadingStoryboard ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating Storyboard...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Create 9:16 Storyboard & Prompts
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Storyboard & Render Studio */}
        <div className="lg:col-span-7 space-y-6">
          {!storyboard ? (
            <div className="h-full min-h-[400px] p-8 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">No Storyboard Generated Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Select your post and preferred 9:16 Reel options on the left, then click "Create 9:16 Storyboard & Prompts".
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              {/* Storyboard Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 uppercase">
                    9:16 Vertical Reel Storyboard
                  </span>
                  <h2 className="text-base font-bold text-white mt-1">{storyboard.video_title}</h2>
                  <p className="text-xs text-slate-400">Total Duration: ~{storyboard.total_estimated_seconds}s</p>
                </div>
                <button
                  onClick={handleRenderVideo}
                  disabled={loadingRender}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all flex items-center gap-2"
                >
                  {loadingRender ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Dispatching to AI Engine...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Generate Video ({provider.toUpperCase()})
                    </>
                  )}
                </button>
              </div>

              {/* Render Output Result if Available */}
              {renderResult && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Render Request Dispatched ({renderResult.rendering?.provider || renderResult.provider || provider.toUpperCase()})
                  </div>
                  <p className="text-xs text-slate-300">
                    Status: <span className="font-mono text-emerald-300 uppercase">{renderResult.status || renderResult.rendering?.status || "COMPLETED"}</span>
                  </p>
                  {(renderResult.video_url || renderResult.rendering?.video_url) && (
                    <div className="space-y-2 text-center">
                      <video 
                        controls 
                        autoPlay
                        loop
                        src={renderResult.video_url || renderResult.rendering?.video_url}
                        className="w-full max-w-[280px] rounded-xl border border-slate-800 mx-auto shadow-2xl"
                      />
                      <a 
                        href={renderResult.video_url || renderResult.rendering?.video_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-block text-xs font-semibold text-purple-400 hover:text-purple-300 underline"
                      >
                        Open Video Sample MP4 in New Tab
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Voiceover Script Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Full Voiceover Script
                </span>
                <p className="text-xs text-slate-200 leading-relaxed italic">
                  "{storyboard.full_voiceover_script}"
                </p>
              </div>

              {/* Scene Breakdown */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Scene-by-Scene Breakdown ({storyboard.scenes?.length || 0} Scenes)
                </h3>

                {storyboard.scenes?.map((scene: any) => (
                  <div key={scene.scene_number} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-purple-400">Scene {scene.scene_number}</span>
                      <span className="text-slate-500 font-mono">{scene.duration_seconds}s</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium block">Visual Action (9:16):</span>
                        <p className="text-slate-300">{scene.visual_description}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Text Overlay:</span>
                        <p className="text-indigo-300 font-semibold">{scene.text_overlay}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">AI Video Prompt (Veo/Cosmos):</span>
                      <code className="text-[11px] text-purple-300 font-mono block bg-slate-900 p-2 rounded-lg mt-1 border border-slate-800">
                        {scene.ai_video_prompt}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
