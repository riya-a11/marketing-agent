"use client";

import { useState } from "react";
import { Bot, Send, User, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Message {
  sender: "ai" | "user";
  text: string;
}

export default function OnboardingChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Welcome to the Incubation AI Marketing Assistant! Let's build your startup's brand profile together. What is the name of your startup and what problem are you solving?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(25);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: data.reply || "Thank you! Tell me more." },
      ]);
      if (data.completion_percentage) {
        setProgress(data.completion_percentage);
      } else {
        setProgress((prev) => Math.min(prev + 20, 100));
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "That sounds great! Who would you say is your ideal target audience or buyer persona?" },
      ]);
      setProgress((prev) => Math.min(prev + 25, 100));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Adaptive Onboarding Interview</h1>
            <p className="text-xs text-slate-400">Missing Information Detector Active</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3 w-48 sm:w-64">
          <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-400">{progress}%</span>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto mb-6 pr-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${
                m.sender === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  m.sender === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-indigo-600 text-white"
                }`}
              >
                {m.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                  m.sender === "user"
                    ? "bg-purple-600/20 border border-purple-500/30 text-slate-100 rounded-tr-none"
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-slate-400 text-xs italic">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
              AI Assistant is thinking...
            </div>
          )}
        </div>

        {/* Completion Prompt or Input */}
        {progress >= 100 ? (
          <div className="p-6 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Brand Memory Knowledge Extracted!</h2>
            <p className="text-slate-300 text-sm max-w-md mx-auto">
              Your startup details have been synthesized into a reusable Living Brand Profile.
            </p>
            <Link
              href="/onboarding/brand-summary"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-all"
            >
              Review Living Brand Memory <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your startup details here..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
