"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export default function BrandSummary() {
  const router = useRouter();
  const [memory, setMemory] = useState<any>(null);

  useEffect(() => {
    // Generate and fetch from backend
    const generate = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/brand-profile/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: "NexusAI",
          industry: "AI SaaS",
          mission: "Automate content",
          target_audience: "Founders",
          brand_voice: "Bold",
          competitors: "Buffer"
        })
      });
      const data = await res.json();
      setMemory(data.brand_memory);
    };
    generate();
  }, []);

  if (!memory) return <div className="p-24 text-center">Synthesizing Brand DNA...</div>;

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-green-900/30 text-green-400 px-4 py-2 rounded-full mb-4">
          <CheckCircle2 size={16} /> Brand DNA Locked In
        </div>
        <h1 className="text-4xl font-bold">Living Brand Memory</h1>
        <p className="text-gray-400 mt-2">This identity will be applied to all future content.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h3 className="text-sm text-gray-400 mb-1">Brand Name</h3>
          <p className="text-xl font-bold">{memory.brand_name}</p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h3 className="text-sm text-gray-400 mb-1">Industry</h3>
          <p className="text-xl font-bold">{memory.industry}</p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 md:col-span-2">
          <h3 className="text-sm text-gray-400 mb-1">Brand Voice & Tone</h3>
          <p className="text-xl font-bold">{memory.brand_voice} &bull; {memory.tone}</p>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-gray-200"
        >
          Go to Content Dashboard
        </button>
      </div>
    </main>
  );
}
