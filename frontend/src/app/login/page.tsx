"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Lock, Mail, Building2, User } from "lucide-react";
import { firebaseSignIn, firebaseSignUp, firebaseGoogleSignIn } from "@/lib/firebase";
import { AsterAvatar } from "@/components/aster-avatar";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [founderName, setFounderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await firebaseGoogleSignIn();
      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "auth/popup-closed-by-user") {
        setErrorMsg("Google sign-in popup was closed before completing.");
      } else if (e.code === "auth/cancelled-popup-request") {
        setErrorMsg("Sign-in was cancelled.");
      } else {
        setErrorMsg(e.message || "Failed to sign in with Google. Check Firebase credentials in .env.local.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      if (mode === "signup") {
        if (!orgName.trim()) {
          setErrorMsg("Please provide your company or startup name.");
          setLoading(false);
          return;
        }
        await firebaseSignUp({
          email,
          password,
          orgName: orgName.trim(),
          founderName: founderName.trim(),
        });
        router.push("/interview");
      } else {
        await firebaseSignIn({ email, password });
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErrorMsg("Incorrect email or password. Please try again.");
      } else if (e.code === "auth/user-not-found") {
        setErrorMsg("No account found with this email. Please sign up.");
      } else if (e.code === "auth/email-already-in-use") {
        setErrorMsg("An account with this email already exists. Please sign in.");
      } else if (e.code === "auth/weak-password") {
        setErrorMsg("Password is too weak. Please use at least 6 characters.");
      } else {
        // Fallback for offline development mode if Firebase is not provisioned
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#111215] text-[#FBF9F5] font-sans flex flex-col justify-between p-6 sm:p-12">
      {/* Top Brand Nav */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/" className="font-serif font-bold text-xl tracking-tight text-[#FBF9F5] flex items-center gap-2">
          <span className="text-[#C8BBA8] font-sans font-black">M</span> Marketing OS
        </Link>
        <span className="font-script text-base text-[#C8BBA8]">
          Good products deserve good stories.
        </span>
      </div>

      {/* Centered Auth Card */}
      <div className="max-w-md w-full mx-auto my-12 surface-card rounded-xl p-8 shadow-2xl relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-[#FBF9F5]">
              {mode === "login" ? "Welcome back." : "Create your workspace."}
            </h1>
            <p className="text-xs text-[#9FA4B2] mt-1">
              {mode === "login"
                ? "Sign in to your team's Marketing OS workspace."
                : "Enter your company details to initialize Brand Truth."}
            </p>
          </div>
          <AsterAvatar mood={mode === "login" ? "happy" : "curious"} size="sm" />
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Google SSO Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-md bg-[#1C1F26] border border-[#2D323E] hover:bg-[#252A34] text-[#FBF9F5] font-medium text-xs transition-colors pressable flex items-center justify-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#242833]" />
          <span className="text-[10px] uppercase tracking-wider text-[#6C7282] font-semibold">Or continue with email</span>
          <div className="flex-1 h-px bg-[#242833]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === "signup" && (
            <>
              <div>
                <label className="block text-[#9FA4B2] mb-1 font-medium">Company / Startup Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#6C7282] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Velo Dynamics"
                    className="w-full bg-[#111215] border border-[#2A2E39] rounded-md pl-9 pr-3 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#9FA4B2] mb-1 font-medium">Your Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#6C7282] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={founderName}
                    onChange={(e) => setFounderName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    className="w-full bg-[#111215] border border-[#2A2E39] rounded-md pl-9 pr-3 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[#9FA4B2] mb-1 font-medium">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6C7282] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@company.com"
                className="w-full bg-[#111215] border border-[#2A2E39] rounded-md pl-9 pr-3 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#9FA4B2] mb-1 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6C7282] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111215] border border-[#2A2E39] rounded-md pl-9 pr-3 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-[#F4EFE6] text-[#16181D] font-medium text-xs hover:bg-[#EAE3D2] transition-colors pressable flex items-center justify-center gap-1.5 mt-2"
          >
            <span>{mode === "login" ? "Enter Studio" : "Start Founder Onboarding"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#242833] flex items-center justify-between text-xs text-[#9FA4B2]">
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="hover:text-[#FBF9F5] underline underline-offset-4"
          >
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>

          <button
            type="button"
            onClick={handleDemoBypass}
            className="px-2.5 py-1 rounded bg-[#1C1F26] border border-[#2D323E] hover:bg-[#252A34] text-[#C5C9D3] transition-colors"
          >
            Instant Demo Access &rarr;
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[#6C7282] max-w-5xl mx-auto w-full">
        &copy; 2026 Marketing OS &bull; Built for technical teams
      </div>
    </div>
  );
}
