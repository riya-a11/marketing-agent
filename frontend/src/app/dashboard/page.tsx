"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Type, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);

  const generatePosts = async () => {
    setLoading(true);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/content/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: "LinkedIn", content_type: "Thought Leadership" })
    });
    const data = await res.json();
    setVariations(data.variations);
    setLoading(false);
  };

  const proceedToVideo = () => {
    if (selectedPost === null) return;
    // In real app, pass post data to context or state manager
    router.push('/dashboard/video-studio');
  };

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto flex flex-col gap-8">
      <header className="flex justify-between items-end border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold">Content Generator</h1>
          <p className="text-gray-400">Generate on-brand posts and reels.</p>
        </div>
        <button
          onClick={generatePosts}
          disabled={loading}
          className="bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate 3 Variations'}
        </button>
      </header>

      {variations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {variations.map((post, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedPost(idx)}
              className={`bg-zinc-900 p-6 rounded-xl border-2 cursor-pointer transition-all ${selectedPost === idx ? 'border-blue-500' : 'border-zinc-800 hover:border-zinc-600'}`}
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                  {post.style_label}
                </span>
                <span className="text-sm text-green-400 flex items-center gap-1">
                  <CheckCircle size={14}/> {post.score}/100
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{post.body}</p>
            </div>
          ))}
        </div>
      )}

      {selectedPost !== null && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-zinc-900 border-t border-zinc-800 flex justify-center gap-4">
          <button className="flex items-center gap-2 bg-zinc-800 px-8 py-4 rounded-full font-bold hover:bg-zinc-700">
            <Type size={20} /> Publish to Social
          </button>
          <button
            onClick={proceedToVideo}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-700"
          >
            <Video size={20} /> Turn into 9:16 Reel
          </button>
        </div>
      )}
    </main>
  );
}
