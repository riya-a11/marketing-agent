"use client";

import React, { useState } from "react";
import { X, Send } from "lucide-react";
import { AsterAvatar } from "./aster-avatar";

interface AsterChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  brandContext?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "aster";
  text: string;
}

export function AsterChatDrawer({
  isOpen,
  onClose,
  brandContext,
}: AsterChatDrawerProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      sender: "aster",
      text: "I'm here. What's on your mind? We can sharpen a narrative angle, audit evidence for a claim, or shape copy for a specific channel.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");
    const newMsg: ChatMessage = { id: `u_${Date.now()}`, sender: "user", text: userText };
    setMessages((prev) => [...prev, newMsg]);

    setIsTyping(true);
    // Realistic Aster strategist response
    setTimeout(() => {
      let reply = "Here are 3 ways to frame this:\n1. Focus on the time saved by your customer.\n2. Highlight the tangible business outcome rather than internal tech.\n3. Anchor it to a verifiable customer benchmark.\n\nWant me to draft a quick LinkedIn variation?";
      if (userText.toLowerCase().includes("claim") || userText.toLowerCase().includes("evidence")) {
        reply = "Looking at your Brand Truth facts, make sure you cite the benchmark test (e.g. BENCH-001) or customer interview log. That keeps our Claims Gate green and prevents vague superlatives.";
      }
      setMessages((prev) => [
        ...prev,
        { id: `a_${Date.now()}`, sender: "aster", text: reply },
      ]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-[#16181D] border border-[#2D323E] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#282C37] bg-[#1C1F26] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AsterAvatar mood={isTyping ? "thinking" : "neutral"} size="sm" showStatus />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-semibold text-sm text-[#FBF9F5]">Aster</span>
              <span className="text-[11px] text-[#5E6955] font-medium bg-[#5E6955]/20 px-1.5 py-0.2 rounded">Strategist</span>
            </div>
            <p className="text-[11px] text-[#9FA4B2]">Curious, sharp &amp; on your side</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-[#9FA4B2] hover:text-[#FBF9F5] hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3.5 max-h-[380px] min-h-[220px] text-xs leading-relaxed">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "aster" && <AsterAvatar mood="neutral" size="xs" />}
            <div
              className={`p-3 rounded-lg max-w-[85%] whitespace-pre-line ${
                m.sender === "user"
                  ? "bg-[#222630] text-[#FBF9F5] border border-[#333846]"
                  : "bg-[#1C1F26] text-[#E5E2DC] border border-[#2A2E39]"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2 items-center text-[11px] text-[#9FA4B2] pl-8">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4C9B8] animate-bounce" />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4C9B8] animate-bounce delay-100" />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4C9B8] animate-bounce delay-200" />
            <span className="ml-1">Aster is thinking...</span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#282C37] bg-[#14161B] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Aster anything..."
          className="flex-1 bg-[#1C1F26] border border-[#2D323E] rounded-md px-3 py-2 text-xs text-[#FBF9F5] placeholder-[#6C7282] outline-none focus:border-[#D4C9B8]"
        />
        <button
          type="submit"
          className="p-2 rounded-md bg-[#F4EFE6] text-[#16181D] hover:bg-[#EAE3D2] transition-colors pressable"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
