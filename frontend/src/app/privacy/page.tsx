import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, EyeOff, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Marketing OS",
  description: "How Marketing OS handles your data, connected social accounts, and OAuth credentials.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#111215] text-[#FBF9F5] py-16 px-6 md:px-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#A0A5B5] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketing OS
        </Link>

        <header className="space-y-4 border-b border-[#262833] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Effective Date: September 2026
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-[#A0A5B5] text-base leading-relaxed">
            Marketing OS is built with privacy-first and tenant-isolated engineering principles. This document outlines how we collect, handle, encrypt, and respect your data.
          </p>
        </header>

        <section className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-[#1B1D24] text-indigo-400 border border-[#262833]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-2">1. Social Account Credentials & Token Encryption</h2>
              <p className="text-[#A0A5B5] text-sm leading-relaxed">
                When you connect your LinkedIn, X (Twitter), Instagram, or YouTube accounts via OAuth 2.0, we never store or see your raw passwords. Access tokens and refresh tokens are encrypted at rest using industry-standard AES-256-GCM envelope encryption. Tokens are only decrypted in transient memory during scheduled dispatch operations.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-[#1B1D24] text-emerald-400 border border-[#262833]">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-2">2. Data We Collect & How We Use It</h2>
              <p className="text-[#A0A5B5] text-sm leading-relaxed">
                We only collect the minimum information required to operate the service: your email address, workspace identifiers, brand knowledge snippets you upload, and social account handles/avatars so you can identify connected profiles. We do not sell, rent, or trade your data or content to third-party data brokers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-[#1B1D24] text-amber-400 border border-[#262833]">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-2">3. Token Revocation & Deletion</h2>
              <p className="text-[#A0A5B5] text-sm leading-relaxed">
                You can disconnect your social media accounts at any time from the Connected Accounts settings page. Disconnecting an account immediately revokes the provider grant and permanently deletes your encrypted credentials from our database.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#262833] bg-[#16181F] p-6 space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">Contact Us</h3>
            <p className="text-[#A0A5B5] text-sm">
              If you have any questions or data removal requests regarding this Privacy Policy, please contact our compliance team at{" "}
              <span className="text-indigo-400 underline">support@marketingos.com</span>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}


