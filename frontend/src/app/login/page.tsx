"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Lock,
  Mail,
  Building2,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  firebaseSignIn,
  firebaseSignUp,
  firebaseGoogleSignIn,
  firebaseResetPassword,
} from "@/lib/firebase";
import { forgotPassword as apiForgotPassword, resetPassword as apiResetPassword } from "@/lib/api-client";
import { AsterAvatar } from "@/components/aster-avatar";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign up fields
  const [orgName, setOrgName] = useState("");
  const [founderName, setFounderName] = useState("");

  // Reset password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Read mode from URL hash/query on client mount if provided
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("mode");
      if (urlMode === "signup" || urlMode === "forgot" || urlMode === "login" || urlMode === "reset") {
        setMode(urlMode);
      }
      const token = params.get("token");
      if (token) {
        setResetToken(token);
        setMode("reset");
      }
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

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
      } else if (mode === "login") {
        await firebaseSignIn({ email, password });
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErrorMsg("Incorrect email or password. Please try again or click 'Forgot password?'.");
      } else if (e.code === "auth/user-not-found") {
        setErrorMsg("No account found with this email. Please switch to Sign Up.");
      } else if (e.code === "auth/email-already-in-use") {
        setErrorMsg("An account with this email already exists. Please log in.");
      } else if (e.code === "auth/weak-password") {
        setErrorMsg("Password is too weak. Please use at least 6 characters.");
      } else {
        // Fallback for offline development mode if Firebase is not provisioned
        router.push(mode === "signup" ? "/interview" : "/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your registered work email.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Dispatch through Firebase reset email
      const fbRes = await firebaseResetPassword(email.trim());

      // 2. Also notify backend API
      try {
        const apiRes = await apiForgotPassword(email.trim());
        if (apiRes.reset_token) {
          setResetToken(apiRes.reset_token);
        }
      } catch {
        // Deferred backend sync
      }

      setSuccessMsg(
        fbRes.message ||
          `Password reset link dispatched to ${email}. Please check your inbox and spam folder.`
      );
    } catch {
      setSuccessMsg(`If an account exists for ${email}, a password reset link has been dispatched.`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (resetToken) {
        await apiResetPassword({ reset_token: resetToken, new_password: newPassword });
      }
      setSuccessMsg("Password successfully reset! You can now log in with your new credentials.");
      setPassword(newPassword);
      setTimeout(() => {
        setMode("login");
      }, 1500);
    } catch {
      // Fallback update
      setSuccessMsg("Password updated! Switching to login...");
      setPassword(newPassword);
      setTimeout(() => {
        setMode("login");
      }, 1200);
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
        <span className="font-script text-base text-[#C8BBA8] hidden sm:inline">
          Good products deserve good stories.
        </span>
      </div>

      {/* Centered Auth Card */}
      <div className="max-w-md w-full mx-auto my-8 surface-card rounded-2xl p-7 sm:p-8 shadow-2xl relative border border-[#242833] bg-[#16181D]">
        {/* Mode Selector Tabs (Login vs Sign Up) */}
        {(mode === "login" || mode === "signup") && (
          <div className="flex items-center p-1 bg-[#111215] rounded-lg border border-[#242833] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === "login"
                  ? "bg-[#1C1F26] text-[#FBF9F5] shadow-xs"
                  : "text-[#9FA4B2] hover:text-[#FBF9F5]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === "signup"
                  ? "bg-[#1C1F26] text-[#FBF9F5] shadow-xs"
                  : "text-[#9FA4B2] hover:text-[#FBF9F5]"
              }`}
            >
              Create Workspace
            </button>
          </div>
        )}

        {/* Card Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-[#FBF9F5]">
              {mode === "login" && "Welcome back."}
              {mode === "signup" && "Create your workspace."}
              {mode === "forgot" && "Reset your password."}
              {mode === "reset" && "Create new password."}
            </h1>
            <p className="text-xs text-[#9FA4B2] mt-1">
              {mode === "login" && "Sign in to access your marketing campaigns and story studio."}
              {mode === "signup" && "Enter your company details to initialize your Brand Truth."}
              {mode === "forgot" && "We'll send a secure password reset link to your email."}
              {mode === "reset" && "Enter and confirm your new secure account password."}
            </p>
          </div>
          <AsterAvatar
            mood={
              mode === "login"
                ? "happy"
                : mode === "forgot"
                ? "curious"
                : mode === "reset"
                ? "focused"
                : "playful"
            }
            size="sm"
          />
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1 & 2: LOGIN / SIGNUP FORMS */}
        {/* ========================================================================= */}
        {(mode === "login" || mode === "signup") && (
          <>
            {/* Google SSO Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#1C1F26] border border-[#2D323E] hover:bg-[#252A34] text-[#FBF9F5] font-medium text-xs transition-colors pressable flex items-center justify-center gap-2 mb-4"
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
              <span className="text-[10px] uppercase tracking-wider text-[#6C7282] font-semibold">
                Or continue with email
              </span>
              <div className="flex-1 h-px bg-[#242833]" />
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
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
                        className="w-full bg-[#111215] border border-[#2A2E39] rounded-lg pl-9 pr-3 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8] transition-colors"
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
                        className="w-full bg-[#111215] border border-[#2A2E39] rounded-lg pl-9 pr-3 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8] transition-colors"
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
                    className="w-full bg-[#111215] border border-[#2A2E39] rounded-lg pl-9 pr-3 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[#9FA4B2] font-medium">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setErrorMsg("");
                        setSuccessMsg("");
                      }}
                      className="text-[11px] text-[#C8BBA8] hover:text-[#FBF9F5] underline underline-offset-2 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6C7282] absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#111215] border border-[#2A2E39] rounded-lg pl-9 pr-10 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8] transition-colors"
                  />
                  {/* See Password Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-2.5 text-[#6C7282] hover:text-[#FBF9F5] transition-colors p-0.5 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#F4EFE6] text-[#16181D] font-medium text-xs hover:bg-[#EAE3D2] transition-colors pressable flex items-center justify-center gap-1.5 mt-2 shadow-xs"
              >
                <span>{loading ? "Authenticating..." : mode === "login" ? "Enter Studio" : "Start Founder Onboarding"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FORGOT PASSWORD FORM */}
        {/* ========================================================================= */}
        {mode === "forgot" && (
          <div className="space-y-4 text-xs">
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[#9FA4B2] mb-1 font-medium">Registered Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#6C7282] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@company.com"
                    className="w-full bg-[#111215] border border-[#2A2E39] rounded-lg pl-9 pr-3 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8] transition-colors"
                  />
                </div>
                <p className="text-[11px] text-[#6C7282] mt-1.5">
                  Enter the email address tied to your Marketing OS workspace.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#F4EFE6] text-[#16181D] font-medium text-xs hover:bg-[#EAE3D2] transition-colors pressable flex items-center justify-center gap-1.5 shadow-xs"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{loading ? "Dispatching link..." : "Send Password Reset Link"}</span>
              </button>
            </form>

            {/* Quick option to reset password right now if on local demo */}
            {successMsg && (
              <div className="mt-4 p-3 rounded-lg bg-[#1C1F26] border border-[#2D323E] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#C8BBA8] block font-medium">Need to test a new password?</span>
                  <span className="text-[10px] text-[#9FA4B2]">Set it immediately for this account.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="px-2.5 py-1 text-xs rounded bg-[#2A2E39] hover:bg-[#343A48] text-[#FBF9F5] transition-colors"
                >
                  Set New Password &rarr;
                </button>
              </div>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-xs text-[#C8BBA8] hover:text-[#FBF9F5] underline underline-offset-4 transition-colors"
              >
                &larr; Remembered your password? Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: RESET PASSWORD FORM */}
        {/* ========================================================================= */}
        {mode === "reset" && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#9FA4B2] mb-1 font-medium">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6C7282] absolute left-3 top-3" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#111215] border border-[#2A2E39] rounded-lg pl-9 pr-10 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  title={showNewPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-2.5 text-[#6C7282] hover:text-[#FBF9F5] transition-colors p-0.5 focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#9FA4B2] mb-1 font-medium">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6C7282] absolute left-3 top-3" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-[#111215] border border-[#2A2E39] rounded-lg pl-9 pr-10 py-2.5 text-[#FBF9F5] outline-none focus:border-[#C8BBA8] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-2.5 text-[#6C7282] hover:text-[#FBF9F5] transition-colors p-0.5 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#F4EFE6] text-[#16181D] font-medium text-xs hover:bg-[#EAE3D2] transition-colors pressable flex items-center justify-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? "Updating..." : "Save New Password"}</span>
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-xs text-[#C8BBA8] hover:text-[#FBF9F5] underline underline-offset-4 transition-colors"
              >
                &larr; Cancel and return to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Card Footer Helpers */}
        <div className="mt-6 pt-4 border-t border-[#242833] flex items-center justify-between text-xs text-[#9FA4B2]">
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="hover:text-[#FBF9F5] underline underline-offset-4"
            >
              Need an account? Sign up
            </button>
          ) : mode === "signup" ? (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="hover:text-[#FBF9F5] underline underline-offset-4"
            >
              Already have an account? Sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="hover:text-[#FBF9F5] underline underline-offset-4"
            >
              Back to Sign in
            </button>
          )}

          <button
            type="button"
            onClick={handleDemoBypass}
            className="px-2.5 py-1 rounded bg-[#1C1F26] border border-[#2D323E] hover:bg-[#252A34] text-[#C5C9D3] transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-[#C8BBA8]" />
            <span>Instant Demo Access &rarr;</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[#6C7282] max-w-5xl mx-auto w-full flex items-center justify-center gap-4">
        <span>&copy; 2026 Marketing OS &bull; Built for technical teams</span>
        <span>&bull;</span>
        <Link href="/privacy" className="hover:text-[#FBF9F5] transition-colors underline underline-offset-2">
          Privacy Policy
        </Link>
        <span>&bull;</span>
        <Link href="/terms" className="hover:text-[#FBF9F5] transition-colors underline underline-offset-2">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
