"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bot, User } from 'lucide-react';

export default function Chat() {
  const router = useRouter();
  const [messages, setMessages] = useState<{role: 'ai' | 'user', content: string}[]>([
    { role: 'ai', content: "Hi! I'm NexusAI. To build your brand DNA, let's start with your Brand Name and Industry." }
  ]);
  const [input, setInput] = useState('');
  const [progress, setProgress] = useState(0);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');

    // Mock API call to backend
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/interview/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, session_id: '123' })
    });

    const data = await res.json();
    setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    setProgress(data.progress);

    if (data.progress >= 100) {
      setTimeout(() => router.push('/onboarding/brand-summary'), 1500);
    }
  };

  return (
    <main className="min-h-screen flex flex-col p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Brand Discovery</h1>
        <div className="w-full bg-zinc-800 rounded-full h-2.5">
          <div className="bg-white h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="text-sm text-gray-400 mt-2">{progress}% complete</p>
      </div>

      <div className="flex-1 bg-zinc-900 rounded-xl p-6 border border-zinc-800 overflow-y-auto mb-4 flex flex-col gap-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.role === 'ai' ? 'bg-blue-600' : 'bg-zinc-700'}`}>
              {m.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`p-3 rounded-lg max-w-[80%] ${m.role === 'ai' ? 'bg-zinc-800' : 'bg-blue-600'}`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer..."
          className="flex-1 p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-600"
        />
        <button type="submit" className="bg-white text-black p-4 rounded-lg font-bold hover:bg-gray-200">
          <ArrowRight size={20} />
        </button>
      </form>
    </main>
  );
}
