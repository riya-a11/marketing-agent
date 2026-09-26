import Link from "next/link";
import { ArrowLeft, Scale, CheckCircle2, FileText, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Marketing OS",
  description: "Terms and conditions for using Marketing OS AI content generation and multi-channel publishing.",
};

export default function TermsOfServicePage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-mono uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5" /> Last Updated: September 2026
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-[#A0A5B5] text-base leading-relaxed">
            By accessing or using Marketing OS, you agree to comply with and be bound by these Terms of Service.
          </p>
        </header>

        <section className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-[#1B1D24] text-indigo-400 border border-[#262833]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-2">1. Use of Service & Content Ownership</h2>
              <p className="text-[#A0A5B5] text-sm leading-relaxed">
                You retain 100% intellectual property ownership of all raw company updates, brand voice guidelines, and marketing copy generated using Marketing OS. You grant Marketing OS the limited technical license required to render, preview, and dispatch your scheduled content to your connected social channels upon your approval.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-[#1B1D24] text-emerald-400 border border-[#262833]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-2">2. Compliance & Platform Guidelines</h2>
              <p className="text-[#A0A5B5] text-sm leading-relaxed">
                You agree not to use the automated publishing or generative capabilities to produce deceptive, spammy, or defamatory content. You must comply with all upstream social network terms, including LinkedIn’s Community Policies, X’s Developer Agreement, and Meta’s Platform Terms.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-[#1B1D24] text-amber-400 border border-[#262833]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-2">3. Human Review & Verification Gate</h2>
              <p className="text-[#A0A5B5] text-sm leading-relaxed">
                Marketing OS incorporates automated claims checking (Otto AI) and mandatory human sign-off gates prior to scheduled publication. You are ultimately responsible for reviewing and verifying the accuracy of any content dispatched from your accounts.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#262833] bg-[#16181F] p-6 space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">Service Availability</h3>
            <p className="text-[#A0A5B5] text-sm">
              We strive for 99.9% uptime across all API services and scheduled workers. Scheduled dispatch timestamps may vary slightly due to upstream provider rate limits and network reconciliation.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}


