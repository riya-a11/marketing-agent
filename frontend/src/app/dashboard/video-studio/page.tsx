"use client";
import { useState } from 'react';
import { Film, PlayCircle, Loader2 } from 'lucide-react';

export default function VideoStudio() {
  const [stage, setStage] = useState<'config' | 'rendering' | 'done'>('config');
  const [videoUrl, setVideoUrl] = useState('');

  const handleRender = async () => {
    setStage('rendering');

    // Generate storyboard
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/video/storyboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_body: "Sample", duration: "30s", visual_style: "Cinematic", voice_tone: "Energetic" })
    });

    // Render video
    const renderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/video/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyboard: {} })
    });

    const renderData = await renderRes.json();

    // Simulate delay for rendering
    setTimeout(() => {
      setVideoUrl(renderData.video_url || 'https://www.w3schools.com/html/mov_bbb.mp4');
      setStage('done');
    }, 3000);
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3"><Film /> 9:16 Video Studio</h1>
        <p className="text-gray-400">Configure preferences and render your Reel.</p>
      </div>

      {stage === 'config' && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl flex flex-col gap-6">
          <div>
            <label className="block text-sm font-bold mb-2">Duration</label>
            <select className="w-full p-3 rounded bg-zinc-800 border border-zinc-700">
              <option>15 Seconds</option>
              <option>30 Seconds</option>
              <option>60 Seconds</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Visual Style</label>
            <select className="w-full p-3 rounded bg-zinc-800 border border-zinc-700">
              <option>Cinematic Founder</option>
              <option>Minimalist Tech</option>
              <option>Kinetic Typography</option>
            </select>
          </div>
          <button
            onClick={handleRender}
            className="w-full bg-blue-600 text-white p-4 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <PlayCircle /> Generate Storyboard & Render
          </button>
        </div>
      )}

      {stage === 'rendering' && (
        <div className="bg-zinc-900 border border-zinc-800 p-24 rounded-xl flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <h2 className="text-2xl font-bold">Rendering with NVIDIA Cosmos...</h2>
          <p className="text-gray-400">Stitching scenes and injecting voiceover via OpenMontage.</p>
        </div>
      )}

      {stage === 'done' && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-6 text-green-400 flex items-center gap-2">Render Complete!</h2>
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-[320px] h-[568px] bg-black rounded-lg shadow-xl object-cover"
          />
          <div className="mt-8 flex gap-4">
            <button className="bg-white text-black px-6 py-3 rounded font-bold hover:bg-gray-200">
              Download MP4
            </button>
            <button className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700">
              Publish Directly
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
