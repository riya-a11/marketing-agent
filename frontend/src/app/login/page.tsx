"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error && error.message === 'Invalid login credentials') {
        const signupRes = await supabase.auth.signUp({ email, password });
        if (signupRes.error) throw signupRes.error;
        alert('Created a new demo account! Log in now.');
      } else if (error) {
        throw error;
      }

      if (data?.session) {
        router.push('/onboarding/chat');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24">
      <div className="w-full max-w-md bg-zinc-900 p-8 rounded-xl border border-zinc-800">
        <h1 className="text-3xl font-bold mb-6">Login / Signup</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="p-3 rounded bg-zinc-800 border border-zinc-700 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="p-3 rounded bg-zinc-800 border border-zinc-700 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="bg-white text-black p-3 rounded font-bold hover:bg-gray-200">
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
