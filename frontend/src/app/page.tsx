import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24 text-center">
      <h1 className="text-6xl font-bold mb-6">NexusAI</h1>
      <p className="text-xl mb-8 max-w-2xl text-gray-400">
        AI-powered marketing automation for early-stage startup founders. Build your brand identity, generate content, and render 9:16 vertical shorts automatically.
      </p>
      <Link
        href="/login"
        className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-semibold hover:bg-gray-200 transition-colors"
      >
        Get Started <ArrowRight size={20} />
      </Link>
    </main>
  );
}
