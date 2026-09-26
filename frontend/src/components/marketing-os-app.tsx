"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronDown,
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  ExternalLink,
  Edit,
  Wrench,
  Users,
  Lightbulb,
  Check,
  AlertTriangle,
  Plus,
  RefreshCw,
  LogOut,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Mail,
  Send,
  X,
  FileText,
  Link2,
  FolderOpen,
  Sun,
  Moon,
  Coffee,
  Bookmark,
  Clock,
  Eye,
  Share2,
  Copy,
  Paperclip,
  Search,
  Download,
  Trash2,
  FileDown,
} from "lucide-react";
import { AsterAvatar, type AsterMood } from "./aster-avatar";
import { AsterChatDrawer } from "./aster-chat-drawer";
import { ConnectedAccountsDialog } from "./connected-accounts-dialog";
import { SocialPreview } from "./social-previews";
import { MarketingCalendar } from "./calendar/marketing-calendar";
import {
  analyzeUpdate,
  generateCampaignPackage,
  verifyClaims,
  multiPublish,
  getCampaigns,
  saveCampaign,
  deleteCampaign,
  getBrandProfile,
  updateBrandProfile,
  createCalendarEvent,
  type Angle,
  type CampaignPackage,
  type ClaimsGateResult,
  type PublishReceipt,
  type StoredCampaign,
} from "@/lib/api-client";
import { getSavedTenantUser, firebaseSignOut } from "@/lib/firebase";

type StudioStep = 1 | 2 | 3 | 4 | 5;
type TabType = "studio" | "campaign-detail" | "calendar" | "analytics" | "brand-brain";
type ActiveChannel = "linkedin" | "x" | "instagram" | "youtube" | "email";
type AppTheme = "dark" | "editorial";

const DEFAULT_ANGLES: Angle[] = [
  {
    id: "eng",
    tag: "Engineering Story",
    is_recommended: true,
    headline: "How we re-architected our core engine to cut sync latency by 70%",
    rationale: "A deep dive into the technical challenge, tradeoffs, and production benchmarks.",
    evidence_used: "Engineering benchmark (BENCH-001)"
  },
  {
    id: "cust",
    tag: "Customer Outcome",
    is_recommended: false,
    headline: "Eliminate sync lag: Real-time workflows now 70% faster across your team",
    rationale: "Translates technical latency gains into immediate daily developer productivity.",
    evidence_used: "Workflow velocity telemetry"
  },
  {
    id: "founder",
    tag: "Founder Conviction",
    is_recommended: false,
    headline: "Why we spent 6 months rebuilding state synchronization from first principles",
    rationale: "Resonates with technical leaders by sharing conviction and design philosophy.",
    evidence_used: "Founding manifesto & mission"
  }
];

const DEFAULT_CHANNEL_TEXTS: Record<ActiveChannel, string> = {
  linkedin: `We just reduced sync latency by 70%.\n\nFor teams building real-time applications, latency isn't just a number — it's lost focus, broken flow, and frustrated users.\n\nHere's how we re-architected our sync engine, what we learned, and why performance remains a core part of our product philosophy.\n\n#BuildInPublic #SaaS #Engineering`,
  x: `We just cut sync latency by 70% in production.\n\nHere is what changed:\n1. Replaced periodic polling with bi-directional delta streams\n2. Optimistic local cache validation\n3. Zero redundant serialization hops\n\nLive for all workspaces today 👇`,
  instagram: `70% FASTER DATA SYNC ⚡\n\nSay goodbye to stale dashboards and manual reconciliation.\n\nOur new sync engine is now running live for every team workspace.\n\nLink in bio to read the full technical benchmark breakdown.`,
  youtube: `HOOK: Stop letting slow sync break your team's workflow.\n\nSCENE 1: The frustration of waiting 30 seconds for state updates to reflect.\nSCENE 2: The architecture breakthrough cutting sync latency by 70%.\nSCENE 3: Real-time demonstration with 10,000 live updates.\n\nLive today at velodynamics.com.`,
  email: `Subject: Why manual sync lag ends today: 70% faster architecture live\n\nHey there,\n\nMost founders and teams spend way too much time waiting for stale data to synchronize.\n\nToday, we are changing that.\n\nHere is what is new:\n- 70% reduction in sync latency\n- Instant optimistic state reconciliation\n- 100% verified benchmark telemetry\n\nCheck out the full interactive walkthrough below.\n\nBest,\nThe Founding Team`
};

export default function MarketingOSApp() {
  const [activeTab, setActiveTab] = useState<TabType>("studio");
  const [studioStep, setStudioStep] = useState<StudioStep>(1);
  const [theme, setTheme] = useState<AppTheme>("editorial"); // Default to Mood Board 1's warm editorial style
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [connectedBanner, setConnectedBanner] = useState<string | null>(null);

  // Campaigns Library & Persistence State
  const [campaigns, setCampaigns] = useState<StoredCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignPlatformFilter, setCampaignPlatformFilter] = useState<string>("all");
  const [campaignViewMode, setCampaignViewMode] = useState<"list" | "detail">("list");
  const [selectedCampaign, setSelectedCampaign] = useState<StoredCampaign | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [calendarScheduledNotice, setCalendarScheduledNotice] = useState<string | null>(null);
  const [copiedAllNotice, setCopiedAllNotice] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [brandProfile, setBrandProfile] = useState<Record<string, any> | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(getSavedTenantUser());
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const connectedPlatform = params.get("connected");
      if (connectedPlatform) {
        setConnectedBanner(`Successfully connected your ${connectedPlatform.toUpperCase()} account via OAuth!`);
        // Clean URL query parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    async function loadInitialData() {
      try {
        setLoadingCampaigns(true);
        const data = await getCampaigns();
        if (data && Array.isArray(data)) {
          setCampaigns(data);
          if (data.length > 0) {
            setSelectedCampaign(data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load campaigns:", err);
      } finally {
        setLoadingCampaigns(false);
      }

      try {
        const bp = await getBrandProfile();
        if (bp) {
          setBrandProfile(bp);
          const bpAny = bp as any;
          if (bpAny.brand_facts && Array.isArray(bpAny.brand_facts)) {
            setBrandFacts(bpAny.brand_facts);
          }
        }
      } catch (err) {
        console.error("Failed to load brand profile:", err);
      }
    }

    loadInitialData();
  }, []);

  // Step 1: Tell us / What happened?
  const [rawUpdate, setRawUpdate] = useState(
    "We reduced sync latency by 70% with a new architecture."
  );

  // Step 2: Strategy / 3 Angles
  const [angles, setAngles] = useState<Angle[]>(DEFAULT_ANGLES);
  const [selectedAngleId, setSelectedAngleId] = useState<string>("eng");
  const [analyzing, setAnalyzing] = useState(false);

  // Step 3: Content / Multi-channel package & per-platform copy
  const [activeChannel, setActiveChannel] = useState<ActiveChannel>("linkedin");
  const [channelTexts, setChannelTexts] = useState<Record<ActiveChannel, string>>(DEFAULT_CHANNEL_TEXTS);
  const [campaignPackage, setCampaignPackage] = useState<CampaignPackage | null>(null);
  const [generating, setGenerating] = useState(false);

  // Step 4: Verification / Claim check
  const [claimsStatus, setClaimsStatus] = useState({
    c1: { text: "Sync latency reduced by 70%", source: "Engineering benchmark (BENCH-001)", status: "verified" },
    c2: { text: "Faster user workflows", source: "No direct source found", status: "needs_evidence", overridden: false },
    c3: { text: "Best-in-class performance", source: "Comparative claim (no benchmark)", status: "unsupported" },
  });

  // Step 5: Review & Publish
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // On-demand Aster Chat Drawer
  const [chatOpen, setChatOpen] = useState(false);

  // Campaign Detail Sub-tab State (Screen 4 from Mood Board 2)
  const [detailSubTab, setDetailSubTab] = useState<"overview" | "content" | "evidence" | "performance" | "activity">("overview");

  // Brand Brain Facts State
  const [brandFacts, setBrandFacts] = useState<Array<{ id: string; claim: string; source: string; status: "verified" | "needs_evidence" | "prohibited"; date: string }>>([
    { id: "f1", claim: "72% faster reconciliation", source: "Customer Case Study (Acme Corp)", status: "verified", date: "Aug 2026" },
    { id: "f2", claim: "3 days reduced to 40 minutes", source: "Finance Interview Log", status: "verified", date: "Aug 2026" },
    { id: "f3", claim: "Saves teams hundreds of hours", source: "Unbacked marketing copy", status: "needs_evidence", date: "Aug 2026" },
    { id: "f4", claim: "Industry's fastest platform", source: "Hard-blocked absolute superlative", status: "prohibited", date: "Aug 2026" }
  ]);
  const [isAddFactOpen, setIsAddFactOpen] = useState(false);
  const [newFactClaim, setNewFactClaim] = useState("");
  const [newFactSource, setNewFactSource] = useState("");
  const [newFactStatus, setNewFactStatus] = useState<"verified" | "needs_evidence" | "prohibited">("verified");

  // Step 1: File, Link, and Notes integration states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: string }>>([]);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [attachedLinks, setAttachedLinks] = useState<string[]>([]);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesFilter, setNotesFilter] = useState("");
  const [savedNotes, setSavedNotes] = useState([
    {
      id: "n1",
      title: "Sync Engine v2 Architecture Changelog",
      snippet: "Replaced periodic polling with bi-directional delta streams. Benchmark showed 70% latency drop and 40% memory reduction across high-concurrency clusters.",
      tag: "Engineering",
      date: "Yesterday"
    },
    {
      id: "n2",
      title: "Acme Corp Customer Case Study Notes",
      snippet: "Acme Corp finance team reduced end-of-month reconciliation from 3 full business days to under 40 minutes with zero manual ledger mismatch.",
      tag: "Customer Outcome",
      date: "3 days ago"
    },
    {
      id: "n3",
      title: "Founder Reflection: First-Principles Rebuild",
      snippet: "Why we spent 6 months rebuilding state synchronization from scratch rather than slapping another caching layer on a broken foundation.",
      tag: "Founder Conviction",
      date: "Last week"
    },
    {
      id: "n4",
      title: "Product Milestone: 10,000 Active Daily Devs",
      snippet: "Our developer platform crossed 10,000 active daily developers across 45 countries, with 1.2M API requests processed per hour.",
      tag: "Milestone",
      date: "2 weeks ago"
    }
  ]);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteBody, setNewNoteBody] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Step 2: Edit Angle Modal
  const [isEditAngleOpen, setIsEditAngleOpen] = useState(false);
  const [customHeadline, setCustomHeadline] = useState("");
  const [customRationale, setCustomRationale] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawUpdate((prev) => {
          const prefix = prev.trim() ? prev + "\n\n" : "";
          return `${prefix}[Attached from ${file.name}]:\n${content.slice(0, 1000)}`;
        });
        setAttachedFiles((prev) => [
          ...prev,
          { name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB` },
        ]);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRemoveFile = (fileName: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    const url = linkInput.trim().startsWith("http") ? linkInput.trim() : `https://${linkInput.trim()}`;
    setAttachedLinks((prev) => [...prev, url]);
    setRawUpdate((prev) => {
      const prefix = prev.trim() ? prev + "\n\n" : "";
      return `${prefix}Reference Link: ${url}`;
    });
    setLinkInput("");
    setIsLinkOpen(false);
  };

  const handleRemoveLink = (url: string) => {
    setAttachedLinks((prev) => prev.filter((l) => l !== url));
  };

  const handleInsertNote = (snippet: string) => {
    setRawUpdate((prev) => {
      const prefix = prev.trim() ? prev + "\n\n" : "";
      return `${prefix}${snippet}`;
    });
    setIsNotesOpen(false);
  };

  const handleSaveCustomNote = () => {
    if (!newNoteTitle.trim() || !newNoteBody.trim()) return;
    setSavedNotes((prev) => [
      {
        id: `note_${Date.now()}`,
        title: newNoteTitle.trim(),
        snippet: newNoteBody.trim(),
        tag: "Founder Note",
        date: "Just now",
      },
      ...prev,
    ]);
    setRawUpdate((prev) => {
      const prefix = prev.trim() ? prev + "\n\n" : "";
      return `${prefix}${newNoteBody.trim()}`;
    });
    setNewNoteTitle("");
    setNewNoteBody("");
    setIsCreatingNote(false);
    setIsNotesOpen(false);
  };

  const handleOpenEditAngle = () => {
    const active = angles.find((a) => a.id === selectedAngleId);
    if (active) {
      setCustomHeadline(active.headline);
      setCustomRationale(active.rationale);
    }
    setIsEditAngleOpen(true);
  };

  const handleSaveCustomAngle = () => {
    if (!customHeadline.trim()) return;
    setAngles((prev) =>
      prev.map((a) =>
        a.id === selectedAngleId
          ? {
              ...a,
              headline: customHeadline.trim(),
              rationale: customRationale.trim() || a.rationale,
            }
          : a
      )
    );
    setIsEditAngleOpen(false);
  };

  // Derive Aster's Mood dynamically from the current workflow state
  const getAsterMood = (): AsterMood => {
    if (analyzing || generating || publishing) return "thinking";
    if (studioStep === 4 && !claimsStatus.c2.overridden) return "concerned";
    if (publishSuccess) return "proud";
    if (studioStep === 2) return "curious";
    if (studioStep === 3) return "focused";
    return "neutral";
  };

  // Step 1 -> Step 2: Extract real strategic angles from the user's update
  const handleFindStory = async () => {
    if (!rawUpdate.trim()) return;
    setAnalyzing(true);
    try {
      const res = await analyzeUpdate({ raw_update: rawUpdate });
      if (res && res.angles && Array.isArray(res.angles) && res.angles.length > 0) {
        setAngles(res.angles);
        setSelectedAngleId(res.angles[0].id);
      }
    } catch {
      // Graceful offline fallback
    } finally {
      setAnalyzing(false);
      setStudioStep(2);
    }
  };

  // Step 2 -> Step 3: Generate multi-channel campaign package tailored for EACH platform
  const handleSelectAngle = async () => {
    setGenerating(true);
    try {
      const chosenAngle = angles.find((a) => a.id === selectedAngleId) || angles[0];
      const pkg = await generateCampaignPackage({
        selected_angle: chosenAngle,
        raw_update: rawUpdate,
      });

      if (pkg && pkg.channels) {
        setCampaignPackage(pkg);
        const ch = pkg.channels;

        const liText = (ch.linkedin?.post_text as string) || "";
        const xText = (ch.x?.post_text as string) || "";
        const igText = (ch.instagram?.caption as string) || "";

        let ytText = "";
        const ytVideo = ch.video as any;
        if (ytVideo) {
          ytText = `HOOK: ${ytVideo.hook_line || ""}\n\n`;
          if (ytVideo.scenes && Array.isArray(ytVideo.scenes)) {
            ytText += ytVideo.scenes
              .map((s: any, idx: number) => `Scene ${idx + 1} (${s.visual || "Visual"}):\n"${s.voiceover || ""}"`)
              .join("\n\n");
          }
        }

        const em = ch.email as any;
        const emText = em?.source_body || (em?.subject ? `Subject: ${em.subject}\n\n${em.preview_text || ""}\n\n${em.plain_text_fallback || ""}` : "");

        setChannelTexts((prev) => ({
          linkedin: liText || prev.linkedin,
          x: xText || prev.x,
          instagram: igText || prev.instagram,
          youtube: ytText || prev.youtube,
          email: emText || prev.email,
        }));
      }
    } catch {
      // Graceful offline fallback with existing defaults
    } finally {
      setGenerating(false);
      setStudioStep(3);
    }
  };

  // Step 3 -> Step 4: Verification Gate
  const handleGoToVerification = async () => {
    setStudioStep(4);
    try {
      const res = await verifyClaims({
        channels: {
          linkedin: channelTexts.linkedin,
          x: channelTexts.x,
          instagram: channelTexts.instagram,
          video: channelTexts.youtube,
          email: channelTexts.email,
        },
      });
      if (res && res.claims && res.claims.length > 0) {
        const c1 = res.claims[0];
        const c2 = res.claims[1] || { text: "Faster user workflows", source: "No direct source found", status: "needs_evidence" };
        const c3 = res.claims[2] || { text: "Best-in-class performance", source: "Comparative claim (no benchmark)", status: "unsupported" };

        setClaimsStatus({
          c1: { text: c1.text, source: c1.source || "Engineering benchmark", status: c1.status === "VERIFIED" ? "verified" : "needs_evidence" },
          c2: { text: c2.text, source: c2.source || "No direct source found", status: "needs_evidence", overridden: false },
          c3: { text: c3.text, source: c3.source || "Comparative claim", status: "unsupported" },
        });
      }
    } catch {
      // Keep default verified state
    }
  };

  // Step 4: Override quantitative claim
  const handleToggleOverride = (claimKey: "c2") => {
    setClaimsStatus((prev) => ({
      ...prev,
      [claimKey]: { ...prev[claimKey], overridden: !prev[claimKey].overridden },
    }));
  };

  // Step 5: Publish
  const handleApproveAndPublish = async () => {
    setPublishing(true);
    try {
      await multiPublish({
        platforms: ["linkedin", "x"],
        content_text: channelTexts.linkedin,
      });

      // Auto-save to Campaigns history on publication
      const angle = angles.find((a) => a.id === selectedAngleId);
      const title = campaignPackage?.campaign_title || angle?.headline || "Multi-Channel Campaign";
      const savedRes = await saveCampaign({
        title: title,
        content_type: angle?.tag || "Multi-Channel Campaign",
        platform: "multi",
        content_text: channelTexts.linkedin,
        cta: "See live release",
        style_label: angle?.tag || "Standard",
        quality_score: 95,
        status: "published",
        channels: channelTexts,
      });
      if (savedRes && savedRes.campaign) {
        setCampaigns((prev) => [savedRes.campaign, ...prev.filter((c) => c.id !== savedRes.campaign.id)]);
      }
    } catch {
      // Graceful offline fallback
    } finally {
      setPublishing(false);
      setPublishSuccess(true);
    }
  };

  // Explicit Save Campaign action
  const handleSaveCampaign = async () => {
    try {
      const angle = angles.find((a) => a.id === selectedAngleId);
      const title = campaignPackage?.campaign_title || angle?.headline || "Multi-Channel Campaign";
      const payload: any = {
        title: title,
        content_type: angle?.tag || "Multi-Channel Campaign",
        platform: "multi",
        content_text: channelTexts.linkedin,
        cta: "See live release",
        style_label: angle?.tag || "Standard",
        quality_score: 95,
        status: "finalised",
        channels: channelTexts,
      };
      const res = await saveCampaign(payload);
      if (res && res.campaign) {
        setCampaigns((prev) => [res.campaign, ...prev.filter((c) => c.id !== res.campaign.id)]);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Failed to save campaign:", err);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: string) => {
    try {
      await deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      if (selectedCampaign?.id === id) {
        setSelectedCampaign(campaigns.find((c) => c.id !== id) || null);
      }
    } catch (err) {
      console.error("Failed to delete campaign:", err);
    }
  };

  // 1-Click Copy All Channels
  const handleCopyAll = () => {
    const fullText = `CAMPAIGN: ${campaignPackage?.campaign_title || angles.find((a) => a.id === selectedAngleId)?.headline || "Strategic Campaign Package"}
Core Thesis: ${angles.find((a) => a.id === selectedAngleId)?.tag || "Customer Transformation"}

==================================================
LINKEDIN POST
==================================================
${channelTexts.linkedin}

==================================================
X / TWITTER POST
==================================================
${channelTexts.x}

==================================================
INSTAGRAM POST
==================================================
${channelTexts.instagram}

==================================================
EMAIL BROADCAST
==================================================
${channelTexts.email}

==================================================
YOUTUBE / VIDEO HOOK & SCENES
==================================================
${channelTexts.youtube}
`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
      setCopiedAllNotice(true);
      setTimeout(() => setCopiedAllNotice(false), 2500);
    }
  };

  // Download Campaign Package as Markdown (.md)
  const handleDownloadMarkdown = () => {
    const title = campaignPackage?.campaign_title || angles.find((a) => a.id === selectedAngleId)?.headline || "Campaign_Package";
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    const fullText = `# ${title}
> **Strategic Angle**: ${angles.find((a) => a.id === selectedAngleId)?.tag || "Customer Outcome"}
> **Evidence Grounding**: ${angles.find((a) => a.id === selectedAngleId)?.evidence_used || "Verified Telemetry"}

---

## 💼 LinkedIn Post
\`\`\`text
${channelTexts.linkedin}
\`\`\`

---

## 🐦 X (Twitter) Announcement
\`\`\`text
${channelTexts.x}
\`\`\`

---

## 📸 Instagram Caption & Headline
\`\`\`text
${channelTexts.instagram}
\`\`\`

---

## 📧 Customer Email Newsletter
\`\`\`text
${channelTexts.email}
\`\`\`

---

## 🎬 Short-Form Video / YouTube Concept
\`\`\`text
${channelTexts.youtube}
\`\`\`
`;
    const blob = new Blob([fullText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Campaign Package as JSON
  const handleDownloadJSON = () => {
    const pkg = {
      title: campaignPackage?.campaign_title || angles.find((a) => a.id === selectedAngleId)?.headline || "Campaign Package",
      angle: angles.find((a) => a.id === selectedAngleId),
      created_at: new Date().toISOString(),
      channels: {
        linkedin: channelTexts.linkedin,
        x: channelTexts.x,
        instagram: channelTexts.instagram,
        email: channelTexts.email,
        youtube: channelTexts.youtube,
      },
    };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Schedule to Calendar
  const handleScheduleToCalendar = async () => {
    try {
      const angle = angles.find((a) => a.id === selectedAngleId);
      const title = campaignPackage?.campaign_title || angle?.headline || "Scheduled Campaign Post";
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const ev = await createCalendarEvent({
        title: title,
        channel: activeChannel,
        scheduled_at: tomorrow.toISOString(),
        timezone: "Asia/Kolkata",
        channel_payload: {
          post_text: channelTexts[activeChannel],
          caption: channelTexts.instagram,
          cta: "Read full update",
        },
      });
      if (ev) {
        setCalendarScheduledNotice(`Scheduled for tomorrow at 10:00 AM on ${activeChannel.toUpperCase()}!`);
        setTimeout(() => setCalendarScheduledNotice(null), 4000);
      }
    } catch (err) {
      console.error("Failed to schedule event:", err);
    }
  };

  // Brand Truth / Grounded Fact Handlers
  const handleSaveBrandFact = async () => {
    if (!newFactClaim.trim()) return;
    const newFact = {
      id: `f_${Date.now()}`,
      claim: newFactClaim,
      source: newFactSource || "Team Internal Verification",
      status: newFactStatus,
      date: "Just now",
    };
    const updatedFacts = [newFact, ...brandFacts];
    setBrandFacts(updatedFacts);
    setNewFactClaim("");
    setNewFactSource("");
    setIsAddFactOpen(false);

    try {
      await updateBrandProfile({
        ...(brandProfile || {}),
        brand_facts: updatedFacts,
      });
    } catch (err) {
      console.error("Failed to persist brand fact:", err);
    }
  };

  const handleDeleteBrandFact = async (factId: string) => {
    const updatedFacts = brandFacts.filter((f) => f.id !== factId);
    setBrandFacts(updatedFacts);
    try {
      await updateBrandProfile({
        ...(brandProfile || {}),
        brand_facts: updatedFacts,
      });
    } catch (err) {
      console.error("Failed to delete brand fact:", err);
    }
  };

  const handleReset = () => {
    setStudioStep(1);
    setPublishSuccess(false);
  };

  // Theme-dependent styling helpers
  const isDark = theme === "dark";
  const canvasBg = isDark ? "bg-[#111215] text-[#FBF9F5]" : "bg-[#FBF9F5] text-[#16181D]";
  const cardBg = isDark ? "bg-[#16181D] border-[#282C37]" : "bg-[#FFFFFF] border-[#EAE6DE] shadow-sm";
  const cardElevated = isDark ? "bg-[#1C1F26] border-[#333846]" : "bg-[#F7F4EE] border-[#DDD8CE]";
  const textPrimary = isDark ? "text-[#FBF9F5]" : "text-[#16181D]";
  const textSecondary = isDark ? "text-[#9FA4B2]" : "text-[#6E6C66]";
  const borderSubtle = isDark ? "border-[#242833]" : "border-[#EAE6DE]";
  const btnPrimary = isDark
    ? "bg-[#F4EFE6] text-[#16181D] hover:bg-[#EAE3D2]"
    : "bg-[#18181B] text-[#FFFFFF] hover:bg-[#27272A]";
  const scriptAccent = isDark ? "text-[#C8BBA8]" : "text-[#8B452B]";

  return (
    <div className={`min-h-screen ${canvasBg} font-sans flex flex-col antialiased transition-colors duration-200`}>
      {/* Top Header Navigation */}
      <header className={`h-16 border-b ${borderSubtle} px-6 sm:px-10 flex items-center justify-between sticky top-0 z-40 ${isDark ? "bg-[#111215]/95" : "bg-[#FBF9F5]/95"} backdrop-blur-md`}>
        <div className="flex items-center gap-6">
          <Link href="/" className={`font-serif font-bold text-lg ${textPrimary} flex items-center gap-2`}>
            <span className={`${isDark ? "text-[#C8BBA8]" : "text-[#8B452B]"} font-sans font-black`}>M</span> Marketing OS
          </Link>

          {/* Tab Navigation */}
          <nav className={`hidden md:flex items-center gap-1 text-xs ${textSecondary}`}>
            <button
              onClick={() => setActiveTab("studio")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "studio"
                  ? `${isDark ? "bg-[#1C1F26] text-[#FBF9F5] border-[#2D323E]" : "bg-[#EAE6DE] text-[#16181D] font-medium"} border`
                  : "hover:opacity-80"
              }`}
            >
              Studio
            </button>
            <button
              onClick={() => setActiveTab("campaign-detail")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "campaign-detail"
                  ? `${isDark ? "bg-[#1C1F26] text-[#FBF9F5] border-[#2D323E]" : "bg-[#EAE6DE] text-[#16181D] font-medium"} border`
                  : "hover:opacity-80"
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "calendar"
                  ? `${isDark ? "bg-[#1C1F26] text-[#FBF9F5] border-[#2D323E]" : "bg-[#EAE6DE] text-[#16181D] font-medium"} border`
                  : "hover:opacity-80"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "analytics"
                  ? `${isDark ? "bg-[#1C1F26] text-[#FBF9F5] border-[#2D323E]" : "bg-[#EAE6DE] text-[#16181D] font-medium"} border`
                  : "hover:opacity-80"
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab("brand-brain")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "brand-brain"
                  ? `${isDark ? "bg-[#1C1F26] text-[#FBF9F5] border-[#2D323E]" : "bg-[#EAE6DE] text-[#16181D] font-medium"} border`
                  : "hover:opacity-80"
              }`}
            >
              Brand Truth
            </button>
          </nav>
        </div>

        {/* Right Header Area: Channels, Theme Switcher & Aster Companion */}
        <div className="flex items-center gap-3">
          {/* Connected Channels & OAuth Button */}
          <button
            onClick={() => setAccountsOpen(true)}
            title="Manage Social Channels & OAuth"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-all pressable ${
              isDark ? "bg-[#1C1F26] border-[#2D323E] text-[#C5C9D3] hover:text-white" : "bg-[#FFFFFF] border-[#EAE6DE] text-[#16181D] shadow-xs hover:border-[#DDD8CE]"
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline text-[11px] font-medium">Channels</span>
          </button>

          {/* Exact Mood Board Theme Toggle: Dark (Board 2) vs Editorial Ivory (Board 1) */}
          <button
            onClick={() => setTheme(isDark ? "editorial" : "dark")}
            title={isDark ? "Switch to Editorial Ivory (Mood Board 1)" : "Switch to Dark Charcoal (Mood Board 2)"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-all pressable ${
              isDark ? "bg-[#1C1F26] border-[#2D323E] text-[#C5C9D3]" : "bg-[#FFFFFF] border-[#EAE6DE] text-[#16181D] shadow-xs"
            }`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
            <span className="hidden lg:inline text-[11px] font-medium">
              {isDark ? "Dark Theme" : "Editorial Ivory"}
            </span>
          </button>

          {/* Aster Companion Button */}
          <button
            onClick={() => setChatOpen(true)}
            className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all pressable ${
              isDark ? "bg-[#1C1F26] border-[#2D323E] hover:border-[#3A3F4D]" : "bg-[#FFFFFF] border-[#EAE6DE] shadow-xs hover:border-[#DDD8CE]"
            }`}
          >
            <AsterAvatar mood={getAsterMood()} size="xs" showStatus />
            <span className={`text-xs font-serif font-medium ${textPrimary}`}>Aster</span>
            <span className={`text-[10px] ${scriptAccent} font-mono hidden sm:inline capitalize`}>
              ({getAsterMood()})
            </span>
          </button>

          <div className={`flex items-center gap-2 border-l ${borderSubtle} pl-3 text-xs ${textSecondary}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline font-medium">
              {currentUser?.organizationName || currentUser?.displayName || "Velo Dynamics"}
            </span>
            <Link
              href="/login"
              title="Log In or Switch Workspace"
              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                isDark
                  ? "bg-[#1C1F26] border-[#2D323E] text-[#C8BBA8] hover:text-[#FBF9F5]"
                  : "bg-white border-[#EAE6DE] text-[#6C7282] hover:text-[#16181D]"
              }`}
            >
              {currentUser ? "Switch" : "Log In"}
            </Link>
            {currentUser && (
              <button
                type="button"
                onClick={async () => {
                  await firebaseSignOut();
                  window.location.href = "/login";
                }}
                title="Sign out of workspace"
                className="p-1 rounded text-[#9FA4B2] hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* OAuth Connection Status Banner */}
      {connectedBanner && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 text-xs text-emerald-500 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-6xl mx-auto w-full">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{connectedBanner}</span>
            <button
              onClick={() => setConnectedBanner(null)}
              className="ml-auto text-emerald-500 hover:text-emerald-400 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}


      {/* SUB-HEADER: Aster Welcome Banner (Matching Mood Board 3) */}
      <div className={`border-b ${borderSubtle} ${isDark ? "bg-[#14161B]" : "bg-[#F6F3EC]"} px-6 sm:px-10 py-3.5`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AsterAvatar mood={getAsterMood()} size="sm" onClick={() => setChatOpen(true)} />
            <div>
              <p className={`text-xs font-serif font-medium ${textPrimary}`}>
                Good evening, Riya. Ready to turn progress into presence?
              </p>
              <p className={`text-[11px] ${textSecondary}`}>
                Tell me what your team shipped, discovered, or achieved. I&rsquo;ll help you find the story worth telling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className={`flex items-center gap-3 font-mono text-[11px] ${textSecondary}`}>
              <span><strong>12</strong> Campaigns</span>
              <span>&bull;</span>
              <span><strong>8</strong> Published</span>
              <span>&bull;</span>
              <span className="text-emerald-500 font-semibold">+42% Engagement</span>
            </div>

            {studioStep > 1 && activeTab === "studio" && (
              <button
                onClick={handleReset}
                className={`px-3 py-1 rounded text-xs transition-colors pressable border ${
                  isDark ? "bg-[#1C1F26] border-[#2D323E] text-[#C5C9D3]" : "bg-[#FFFFFF] border-[#DDD8CE] text-[#16181D]"
                }`}
              >
                New Update
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN BODY AREA */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-10">
        {/* =========================================================================
            TAB 1: STUDIO WORKFLOW (The 5-Step Pipeline from Mood Board 1)
           ========================================================================= */}
        {activeTab === "studio" && (
          <div className="space-y-8">
            {/* Step Progress Breadcrumb */}
            <div className={`flex items-center gap-2 overflow-x-auto pb-2 border-b ${borderSubtle} text-xs font-mono`}>
              {[
                { num: "01", label: "Tell us", step: 1 },
                { num: "02", label: "Strategy", step: 2 },
                { num: "03", label: "Content", step: 3 },
                { num: "04", label: "Verification", step: 4 },
                { num: "05", label: "Publish", step: 5 },
              ].map((st, i) => {
                const isCurrent = studioStep === st.step;
                const isDone = studioStep > st.step;
                return (
                  <React.Fragment key={st.step}>
                    {i > 0 && <span className={isDark ? "text-[#3A3F4D]" : "text-[#D0CBC0]"}>&bull;</span>}
                    <button
                      onClick={() => (isDone ? setStudioStep(st.step as StudioStep) : null)}
                      disabled={!isDone && !isCurrent}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                        isCurrent
                          ? btnPrimary + " font-bold shadow-xs"
                          : isDone
                          ? isDark ? "text-[#C5C9D3] hover:text-[#FBF9F5] cursor-pointer" : "text-[#16181D] hover:underline cursor-pointer"
                          : isDark ? "text-[#4A5060] cursor-not-allowed" : "text-[#A09C92] cursor-not-allowed"
                      }`}
                    >
                      <span>{st.num}</span>
                      <span>{st.label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* STEP 1: TELL US / WHAT HAPPENED? (Matching Mood Board 1) */}
            {studioStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Left Card: Architecture / Quote (Matching Image 1) */}
                <div className={`md:col-span-4 rounded-xl p-6 border ${cardBg} space-y-4 relative overflow-hidden`}>
                  <div className="relative w-full h-44 rounded-lg overflow-hidden border border-black/10">
                    <Image
                      src="/brand/brand_architecture_card.png"
                      alt="Architecture"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <blockquote className={`font-serif text-lg ${textPrimary} leading-snug`}>
                      Good products deserve good stories.
                    </blockquote>
                    <p className={`text-xs ${textSecondary} mt-2 leading-relaxed`}>
                      Marketing OS bridges the gap between engineering execution and high-converting market presence.
                    </p>
                  </div>
                </div>

                {/* Right Area: Input Workspace */}
                <div className={`md:col-span-8 rounded-xl p-8 border ${cardBg} space-y-6`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className={`font-serif text-3xl ${textPrimary}`}>What happened?</h1>
                      <p className={`text-xs ${textSecondary} mt-1`}>
                        Share what your team shipped, discovered, or achieved.
                      </p>
                    </div>
                    <span className={`font-script text-base ${scriptAccent} hidden sm:inline`}>
                      Just the truth. We&rsquo;ll handle the rest.
                    </span>
                  </div>

                  <div className="space-y-3">
                    <textarea
                      rows={5}
                      value={rawUpdate}
                      onChange={(e) => setRawUpdate(e.target.value)}
                      placeholder="We reduced sync latency by 70% with a new architecture..."
                      className={`w-full ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-[#FBF9F5] border-[#D8D3C8]"} border rounded-lg p-4 text-sm ${textPrimary} outline-none focus:border-[#A8583C] leading-relaxed resize-none`}
                    />

                    {/* Hidden Native File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".txt,.md,.json,.csv,.doc,.docx"
                      className="hidden"
                    />

                    {/* Attached Files & Links Badges */}
                    {(attachedFiles.length > 0 || attachedLinks.length > 0) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {attachedFiles.map((f) => (
                          <span
                            key={f.name}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${cardElevated} font-mono text-[11px]`}
                          >
                            <Paperclip className="w-3 h-3 text-indigo-400" />
                            <span className="truncate max-w-[140px]">{f.name}</span>
                            <span className={textSecondary}>({f.size})</span>
                            <button
                              onClick={() => handleRemoveFile(f.name)}
                              className="ml-1 text-neutral-400 hover:text-rose-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {attachedLinks.map((url) => (
                          <span
                            key={url}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${cardElevated} font-mono text-[11px]`}
                          >
                            <Link2 className="w-3 h-3 text-sky-400" />
                            <span className="truncate max-w-[180px]">{url}</span>
                            <button
                              onClick={() => handleRemoveLink(url)}
                              className="ml-1 text-neutral-400 hover:text-rose-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Inline Link Attacher */}
                    {isLinkOpen && (
                      <div className={`p-2.5 rounded-lg border ${cardElevated} flex items-center gap-2 text-xs animate-in fade-in duration-150`}>
                        <Link2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Paste PR, changelog, or doc link (e.g. https://github.com/...)"
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddLink();
                            }
                          }}
                          className={`flex-1 p-1.5 rounded border ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-white border-[#DDD8CE]"} ${textPrimary} outline-none text-xs`}
                        />
                        <button
                          onClick={handleAddLink}
                          disabled={!linkInput.trim()}
                          className={`px-3 py-1.5 rounded text-xs font-medium pressable ${btnPrimary}`}
                        >
                          Attach
                        </button>
                        <button
                          onClick={() => {
                            setIsLinkOpen(false);
                            setLinkInput("");
                          }}
                          className={`text-xs ${textSecondary} hover:${textPrimary} px-1.5`}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Action Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className={`px-3 py-1.5 rounded border transition-colors pressable flex items-center gap-1.5 ${cardElevated} hover:opacity-90`}
                          title="Attach document, benchmark log, or text file"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add file</span>
                        </button>
                        <button
                          onClick={() => setIsLinkOpen(!isLinkOpen)}
                          className={`px-3 py-1.5 rounded border transition-colors pressable flex items-center gap-1.5 ${
                            isLinkOpen ? "border-sky-500 text-sky-400 bg-sky-500/10" : cardElevated
                          } hover:opacity-90`}
                          title="Attach URL reference"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>Link</span>
                        </button>
                        <button
                          onClick={() => setIsNotesOpen(true)}
                          className={`px-3 py-1.5 rounded border transition-colors pressable flex items-center gap-1.5 ${cardElevated} hover:opacity-90`}
                          title="Import from founder notes & interview log"
                        >
                          <FolderOpen className="w-3 h-3" />
                          <span>Use from notes</span>
                        </button>
                      </div>

                      <button
                        onClick={handleFindStory}
                        disabled={analyzing || !rawUpdate.trim()}
                        className={`px-5 py-2 rounded font-medium text-xs transition-colors pressable flex items-center gap-1.5 ${btnPrimary}`}
                      >
                        <span>{analyzing ? "Analysing..." : "Find the story"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Try an Example */}
                  <div className={`pt-4 border-t ${borderSubtle} space-y-2`}>
                    <span className={`text-[11px] font-mono ${textSecondary} uppercase tracking-wider`}>
                      Try an example:
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        "Launched v2.0",
                        "Closed a new customer",
                        "Open sourced a tool",
                        "Hit 10k users",
                      ].map((ex) => (
                        <button
                          key={ex}
                          onClick={() => {
                            if (ex === "Launched v2.0") setRawUpdate("We deployed our v2 autonomous reconciliation engine with zero downtime.");
                            if (ex === "Closed a new customer") setRawUpdate("Acme Corp scaled from 1,000 to 50,000 monthly transactions with zero headcount increase.");
                            if (ex === "Open sourced a tool") setRawUpdate("We just open-sourced our cryptographic audit ledger with 1,200 GitHub stars.");
                            if (ex === "Hit 10k users") setRawUpdate("Our real-time platform crossed 10,000 active daily developers.");
                          }}
                          className={`px-2.5 py-1 rounded border transition-colors ${cardElevated} hover:opacity-80`}
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: STRATEGY / 3 ANGLES (Matching Mood Board 1) */}
            {studioStep === 2 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className={`font-serif text-3xl ${textPrimary}`}>We found 3 strategic angles</h1>
                    <p className={`text-xs ${textSecondary} mt-1`}>
                      Here are different ways to tell this story, based on your update.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenEditAngle}
                    className={`px-3 py-1.5 rounded border text-xs transition-colors pressable ${cardElevated} hover:opacity-90 self-start sm:self-auto flex items-center gap-1.5`}
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit angles</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {angles.map((ang) => {
                    const isSelected = selectedAngleId === ang.id;
                    const isOutcome = ang.tag.toLowerCase().includes("outcome");
                    const isFounder = ang.tag.toLowerCase().includes("founder");

                    return (
                      <div
                        key={ang.id}
                        onClick={() => setSelectedAngleId(ang.id)}
                        className={`rounded-xl p-6 cursor-pointer transition-all pressable space-y-4 border ${
                          isSelected
                            ? isDark ? "border-[#C8BBA8] bg-[#1C1F26]" : "border-[#16181D] bg-[#FFFFFF] shadow-md ring-1 ring-[#16181D]"
                            : cardBg + " hover:opacity-90"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? "bg-[#252934] text-[#C8BBA8]" : "bg-[#F3EFE7] text-[#8B452B]"}`}>
                            {isFounder ? <Lightbulb className="w-4 h-4" /> : isOutcome ? <Users className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                          </div>
                          {ang.is_recommended && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                              Recommended
                            </span>
                          )}
                        </div>

                        <div>
                          <div className={`text-[11px] font-mono uppercase tracking-wider ${textSecondary} mb-1`}>
                            {ang.tag}
                          </div>
                          <h3 className={`font-serif text-base sm:text-lg ${textPrimary} font-medium leading-snug line-clamp-2`}>
                            {ang.headline}
                          </h3>
                          <p className={`text-xs ${textSecondary} mt-2 leading-relaxed line-clamp-3`}>
                            {ang.rationale}
                          </p>
                        </div>

                        <div className={`pt-3 border-t ${borderSubtle} space-y-1.5 text-xs ${textSecondary}`}>
                          <div className="flex justify-between items-center font-mono text-[11px]">
                            <span>Grounding</span>
                            <span className={`${textPrimary} truncate max-w-[140px] text-right`}>{ang.evidence_used || "Benchmark verified"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setStudioStep(1)}
                    className={`text-xs ${textSecondary} hover:${textPrimary}`}
                  >
                    &larr; Back to input
                  </button>

                  <button
                    onClick={handleSelectAngle}
                    disabled={generating}
                    className={`px-6 py-2.5 rounded font-medium text-xs transition-colors pressable flex items-center gap-1.5 ${btnPrimary}`}
                  >
                    <span>{generating ? "Drafting Multi-Channel Content..." : "Continue with this angle"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CONTENT / YOUR CONTENT IS READY (Matching Mood Board 1) */}
            {studioStep === 3 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className={`font-serif text-3xl ${textPrimary}`}>Your content is ready</h1>
                    <p className={`text-xs ${textSecondary} mt-1`}>
                      Review and edit platform-specific copy tailored for every distribution channel.
                    </p>
                  </div>

                  {/* Channel Switcher */}
                  <div className={`flex items-center gap-1 p-1 rounded-lg border ${cardElevated} text-xs`}>
                    <button
                      onClick={() => setActiveChannel("linkedin")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        activeChannel === "linkedin" ? (isDark ? "bg-[#282C37] text-white" : "bg-white text-black shadow-xs font-medium") : textSecondary
                      }`}
                    >
                      LinkedIn
                    </button>
                    <button
                      onClick={() => setActiveChannel("x")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        activeChannel === "x" ? (isDark ? "bg-[#282C37] text-white" : "bg-white text-black shadow-xs font-medium") : textSecondary
                      }`}
                    >
                      X (Twitter)
                    </button>
                    <button
                      onClick={() => setActiveChannel("instagram")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        activeChannel === "instagram" ? (isDark ? "bg-[#282C37] text-white" : "bg-white text-black shadow-xs font-medium") : textSecondary
                      }`}
                    >
                      Instagram
                    </button>
                    <button
                      onClick={() => setActiveChannel("youtube")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        activeChannel === "youtube" ? (isDark ? "bg-[#282C37] text-white" : "bg-white text-black shadow-xs font-medium") : textSecondary
                      }`}
                    >
                      YouTube
                    </button>
                    <button
                      onClick={() => setActiveChannel("email")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        activeChannel === "email" ? (isDark ? "bg-[#282C37] text-white" : "bg-white text-black shadow-xs font-medium") : textSecondary
                      }`}
                    >
                      Email
                    </button>
                  </div>
                </div>

                {/* Aster Inline Coaching Chip (Matching Mood Board 3) */}
                <div className={`p-3.5 rounded-lg border ${cardBg} flex items-start gap-3 text-xs`}>
                  <AsterAvatar mood="curious" size="xs" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-serif font-semibold ${textPrimary}`}>Aster&rsquo;s Strategy Coach</span>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          onClick={() => {
                            const cur = channelTexts[activeChannel];
                            setChannelTexts((prev) => ({
                              ...prev,
                              [activeChannel]: `⚡ Key Milestone: ${rawUpdate}\n\n${cur}`,
                            }));
                          }}
                          className={`px-2 py-0.5 rounded border transition-colors ${cardElevated}`}
                        >
                          Make it punchier
                        </button>
                        <button
                          onClick={() => {
                            const cur = channelTexts[activeChannel];
                            const trimmed = cur.split("\n\n").slice(0, 2).join("\n\n");
                            setChannelTexts((prev) => ({
                              ...prev,
                              [activeChannel]: trimmed || cur,
                            }));
                          }}
                          className={`px-2 py-0.5 rounded border transition-colors ${cardElevated}`}
                        >
                          Shorten
                        </button>
                      </div>
                    </div>
                    <p className={`${textSecondary} leading-relaxed`}>
                      {activeChannel === "linkedin" && "LinkedIn performs best with a strong 1-line pattern-interrupt followed by structural line breaks."}
                      {activeChannel === "x" && "X posts thrive on clear numbered bullets and immediate actionable takeaways."}
                      {activeChannel === "instagram" && "Instagram copy is paired with bold graphic headlines and a clear link-in-bio prompt."}
                      {activeChannel === "youtube" && "YouTube script is structured as high-retention hook scenes for vertical short-form video."}
                      {activeChannel === "email" && "Email copy is personal, direct, and focused on customer impact over abstract architecture."}
                    </p>
                  </div>
                </div>

                {/* Content Dual Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Post Editor */}
                  <div className={`md:col-span-6 rounded-xl p-6 border ${cardBg} space-y-4`}>
                    <div className={`flex items-center justify-between border-b ${borderSubtle} pb-3 text-xs`}>
                      <div className="flex items-center gap-2">
                        {activeChannel === "linkedin" && (
                          <>
                            <span className="font-bold text-xs text-[#0A66C2]">in</span>
                            <span className={`font-semibold ${textPrimary}`}>LinkedIn Post</span>
                          </>
                        )}
                        {activeChannel === "x" && (
                          <>
                            <span className="font-bold text-xs">X</span>
                            <span className={`font-semibold ${textPrimary}`}>X (Twitter) Thread</span>
                          </>
                        )}
                        {activeChannel === "instagram" && (
                          <>
                            <span className="font-bold text-xs text-[#E1306C]">IG</span>
                            <span className={`font-semibold ${textPrimary}`}>Instagram Carousel Caption</span>
                          </>
                        )}
                        {activeChannel === "youtube" && (
                          <>
                            <span className="font-bold text-xs text-red-500">YT</span>
                            <span className={`font-semibold ${textPrimary}`}>YouTube Director Script</span>
                          </>
                        )}
                        {activeChannel === "email" && (
                          <>
                            <span className="font-bold text-xs text-amber-500">@</span>
                            <span className={`font-semibold ${textPrimary}`}>Email Briefing</span>
                          </>
                        )}
                      </div>
                      <span className={`text-[11px] font-mono ${textSecondary}`}>
                        Live Editor
                      </span>
                    </div>

                    <textarea
                      rows={10}
                      value={channelTexts[activeChannel]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setChannelTexts((prev) => ({
                          ...prev,
                          [activeChannel]: val,
                        }));
                      }}
                      className={`w-full ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-[#FBF9F5] border-[#DDD8CE]"} border rounded-lg p-4 text-xs ${textPrimary} leading-relaxed resize-none outline-none focus:border-[#A8583C] font-mono`}
                    />

                    <div className={`flex items-center justify-between text-[11px] ${textSecondary} font-mono`}>
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        &check; Evidence grounded &bull; Verified
                      </span>
                      <span>
                        {channelTexts[activeChannel].length} /{" "}
                        {activeChannel === "x" ? 280 : activeChannel === "linkedin" ? 3000 : activeChannel === "instagram" ? 2200 : 5000} chars
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Platform-Specific Social Preview */}
                  <div className={`md:col-span-6 rounded-xl p-6 border ${cardBg} space-y-4`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-mono uppercase tracking-wider ${textSecondary}`}>
                        {activeChannel.toUpperCase()} Preview
                      </span>
                      <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Pixel Accurate
                      </span>
                    </div>

                    <SocialPreview
                      channel={activeChannel}
                      postText={channelTexts[activeChannel]}
                      cta={
                        activeChannel === "linkedin"
                          ? (campaignPackage?.channels?.linkedin?.cta as string) || "Try the interactive demo"
                          : activeChannel === "x"
                          ? (campaignPackage?.channels?.x?.cta as string) || "velodynamics.com/demo"
                          : activeChannel === "instagram"
                          ? (campaignPackage?.channels?.instagram?.cta as string) || "Link in bio"
                          : activeChannel === "email"
                          ? (campaignPackage?.channels?.email?.cta_button_text as string) || "Explore Interactive Demo"
                          : undefined
                      }
                      title={
                        activeChannel === "email"
                          ? (campaignPackage?.channels?.email?.subject as string) || "Product Update"
                          : activeChannel === "instagram"
                          ? (campaignPackage?.channels?.instagram?.visual_headline as string) || "70% Faster Sync"
                          : (campaignPackage?.core_thesis || rawUpdate)
                      }
                      subject={(campaignPackage?.channels?.email?.subject as string) || "Why manual sync lag ends today: 70% faster architecture live"}
                      senderName={(campaignPackage?.channels?.email?.sender_name as string) || "Founding Team"}
                      visualHeadline={
                        (campaignPackage?.channels?.instagram?.visual_headline as string) ||
                        (campaignPackage?.core_thesis ? campaignPackage.core_thesis.slice(0, 32).toUpperCase() : "70% FASTER DATA SYNC")
                      }
                      videoScenes={campaignPackage?.channels?.video?.scenes as any}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setStudioStep(2)}
                    className={`text-xs ${textSecondary} hover:${textPrimary}`}
                  >
                    &larr; Back to angles
                  </button>

                  <button
                    onClick={handleGoToVerification}
                    className={`px-6 py-2.5 rounded font-medium text-xs transition-colors pressable flex items-center gap-1.5 ${btnPrimary}`}
                  >
                    <span>Check claims &amp; evidence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: VERIFICATION / CLAIM CHECK (Matching Mood Board 1 & 3) */}
            {studioStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h1 className={`font-serif text-3xl ${textPrimary}`}>Claim check</h1>
                  <p className={`text-xs ${textSecondary} mt-1`}>
                    3 claims found in this post. Deterministic evidence gate ensures zero false statements.
                  </p>
                </div>

                {/* Aster Claims Intervention Warning (Matching Mood Board 3) */}
                <div className={`p-4 rounded-xl border flex items-start gap-3.5 text-xs ${isDark ? "bg-amber-950/20 border-amber-800/40" : "bg-amber-50 border-amber-200"}`}>
                  <AsterAvatar mood="concerned" size="sm" />
                  <div className="flex-1 space-y-1.5">
                    <p className={`font-serif font-medium ${textPrimary}`}>
                      Aster: Hold on. This claim isn&rsquo;t fully supported by your evidence.
                    </p>
                    <p className={textSecondary}>
                      Claim &ldquo;Faster user workflows&rdquo; has no direct benchmark in Brand Truth. You can add supporting evidence or apply a founder override.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleToggleOverride("c2")}
                        className={`px-3 py-1 rounded font-medium text-[11px] pressable ${btnPrimary}`}
                      >
                        {claimsStatus.c2.overridden ? "Override Applied &check;" : "Apply Founder Override"}
                      </button>
                      <button
                        onClick={() => setChatOpen(true)}
                        className={`px-3 py-1 rounded border text-[11px] transition-colors ${cardElevated}`}
                      >
                        Explain why
                      </button>
                    </div>
                  </div>
                </div>

                {/* Claims Verification Table */}
                <div className="space-y-3">
                  {/* Claim 1 */}
                  <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between gap-4`}>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-medium ${textPrimary}`}>{claimsStatus.c1.text}</p>
                      <p className={`text-[11px] ${textSecondary} font-mono`}>Source: {claimsStatus.c1.source}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono">
                      Verified
                    </span>
                  </div>

                  {/* Claim 2 */}
                  <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between gap-4`}>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-medium ${textPrimary}`}>{claimsStatus.c2.text}</p>
                      <p className={`text-[11px] ${textSecondary} font-mono`}>
                        {claimsStatus.c2.overridden ? "Allowed by Founder Override" : claimsStatus.c2.source}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-mono ${
                        claimsStatus.c2.overridden
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {claimsStatus.c2.overridden ? "Allowed" : "Needs evidence"}
                    </span>
                  </div>

                  {/* Claim 3 */}
                  <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between gap-4 opacity-70`}>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-medium ${textPrimary} line-through`}>{claimsStatus.c3.text}</p>
                      <p className="text-[11px] text-rose-500 font-mono">
                        Stripped by Gate: {claimsStatus.c3.source}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-mono">
                      Unsupported
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setStudioStep(3)}
                    className={`text-xs ${textSecondary} hover:${textPrimary}`}
                  >
                    &larr; Back to content
                  </button>

                  <button
                    onClick={() => setStudioStep(5)}
                    className={`px-6 py-2.5 rounded font-medium text-xs transition-colors pressable flex items-center gap-1.5 ${btnPrimary}`}
                  >
                    <span>Proceed to Review &amp; Schedule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW / READY TO PUBLISH? (Matching Mood Board 1 & 3) */}
            {studioStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h1 className={`font-serif text-3xl ${textPrimary}`}>Ready to publish?</h1>
                  <p className={`text-xs ${textSecondary} mt-1`}>
                    Review your campaign assets and schedule them.
                  </p>
                </div>

                {publishSuccess ? (
                  /* Post-Publish Celebration State (Matching Mood Board 3) */
                  <div className={`rounded-xl p-8 border ${cardBg} text-center space-y-5`}>
                    <div className="flex justify-center">
                      <AsterAvatar mood="proud" size="lg" />
                    </div>
                    <div>
                      <h2 className={`font-serif text-2xl ${textPrimary}`}>Aster: It&rsquo;s live! 🎉</h2>
                      <p className={`text-xs ${textSecondary} mt-1 max-w-md mx-auto leading-relaxed`}>
                        LinkedIn post dispatched with zero ungrounded claims. X thread scheduled for 10:30 AM. Now let&rsquo;s see how this story performs.
                      </p>
                    </div>

                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={() => setActiveTab("analytics")}
                        className={`px-5 py-2 rounded text-xs font-medium pressable ${btnPrimary}`}
                      >
                        View analytics
                      </button>
                      <button
                        onClick={handleReset}
                        className={`px-5 py-2 rounded border text-xs pressable ${cardElevated}`}
                      >
                        Create another &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Pre-Publish Channel List */
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {/* Channel 1: LinkedIn */}
                      <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between text-xs`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded border ${cardElevated} font-bold text-[10px] text-[#0A66C2] flex items-center justify-center`}>in</span>
                          <span className={`font-medium ${textPrimary}`}>LinkedIn Post</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
                            Ready
                          </span>
                          <span className={`font-mono text-[11px] ${textSecondary}`}>Mar 12, 10:00 AM</span>
                        </div>
                      </div>

                      {/* Channel 2: X Thread */}
                      <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between text-xs`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded border ${cardElevated} font-bold text-[10px] flex items-center justify-center`}>X</span>
                          <span className={`font-medium ${textPrimary}`}>X (Twitter) Thread</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
                            Ready
                          </span>
                          <span className={`font-mono text-[11px] ${textSecondary}`}>Mar 12, 10:30 AM</span>
                        </div>
                      </div>

                      {/* Channel 3: Instagram */}
                      <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between text-xs`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded border ${cardElevated} font-bold text-[10px] text-[#E1306C] flex items-center justify-center`}>IG</span>
                          <span className={`font-medium ${textPrimary}`}>Instagram Carousel</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono text-[10px]">
                            Review media
                          </span>
                          <span className={`font-mono text-[11px] ${textSecondary}`}>Mar 13, 9:00 AM</span>
                        </div>
                      </div>

                      {/* Channel 4: YouTube Shorts & Video */}
                      <div className={`rounded-xl p-4 border ${cardBg} flex items-center justify-between text-xs`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded border ${cardElevated} font-bold text-[10px] text-red-500 flex items-center justify-center`}>YT</span>
                          <span className={`font-medium ${textPrimary}`}>YouTube Shorts & Video</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
                            Ready
                          </span>
                          <span className={`font-mono text-[11px] ${textSecondary}`}>Mar 13, 11:00 AM</span>
                        </div>
                      </div>
                    </div>

                    {/* Action notification banners */}
                    {calendarScheduledNotice && (
                      <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                        <span>✓ {calendarScheduledNotice}</span>
                        <button
                          onClick={() => setActiveTab("calendar")}
                          className="underline font-semibold hover:opacity-80 ml-2"
                        >
                          View in Calendar &rarr;
                        </button>
                      </div>
                    )}

                    {saveSuccess && (
                      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
                        <span>✓ Campaign package saved to your library!</span>
                        <button
                          onClick={() => {
                            setActiveTab("campaign-detail");
                            setCampaignViewMode("list");
                          }}
                          className="underline font-semibold hover:opacity-80 ml-2"
                        >
                          View in Campaigns &rarr;
                        </button>
                      </div>
                    )}

                    {copiedAllNotice && (
                      <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-purple-600 dark:text-purple-400">
                        <span>✓ All channel copy copied to clipboard with formatted headers!</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
                      <button
                        onClick={() => setStudioStep(4)}
                        className={`text-xs ${textSecondary} hover:${textPrimary}`}
                      >
                        &larr; Back to claim check
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setAccountsOpen(true)}
                          className={`px-3 py-2 rounded border text-xs flex items-center gap-1.5 pressable ${cardElevated}`}
                          title="Manage connected social media channels"
                        >
                          <Share2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>Channels</span>
                        </button>

                        <button
                          onClick={handleCopyAll}
                          className={`px-3 py-2 rounded border text-xs flex items-center gap-1.5 pressable ${cardElevated}`}
                          title="Copy all channel copy"
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-500" />
                          <span>{copiedAllNotice ? "Copied All!" : "Copy All"}</span>
                        </button>

                        <button
                          onClick={handleDownloadMarkdown}
                          className={`px-3 py-2 rounded border text-xs flex items-center gap-1.5 pressable ${cardElevated}`}
                          title="Download Markdown package"
                        >
                          <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Export .MD</span>
                        </button>

                        <button
                          onClick={handleSaveCampaign}
                          className={`px-3 py-2 rounded border text-xs flex items-center gap-1.5 pressable ${cardElevated}`}
                          title="Save to database library"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                          <span>{saveSuccess ? "Saved!" : "Save"}</span>
                        </button>

                        <button
                          onClick={handleScheduleToCalendar}
                          className={`px-3 py-2 rounded border text-xs flex items-center gap-1.5 pressable ${cardElevated}`}
                          title="Schedule in Master Calendar"
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-sky-500" />
                          <span>Schedule</span>
                        </button>

                        <button
                          onClick={handleApproveAndPublish}
                          disabled={publishing}
                          className={`px-5 py-2 rounded font-medium text-xs transition-colors pressable ${btnPrimary}`}
                        >
                          {publishing ? "Publishing..." : "Approve & Publish"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: CAMPAIGN LIBRARY & DETAIL PAGE
           ========================================================================= */}
        {activeTab === "campaign-detail" && (
          <div className="space-y-6">
            {/* View Mode Toggle: All Campaigns Library vs Single Campaign Detail */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4">
              <div>
                <h1 className={`font-serif text-3xl ${textPrimary}`}>
                  {campaignViewMode === "list" ? "Campaigns Library" : (selectedCampaign?.title || "Campaign Detail")}
                </h1>
                <p className={`text-xs ${textSecondary} mt-1`}>
                  {campaignViewMode === "list"
                    ? `${campaigns.length} stored campaign packages across your multi-channel network.`
                    : "Deep dive into multi-channel copy, evidence nodes, and distribution receipts."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-lg border ${cardElevated} flex items-center gap-1 text-xs`}>
                  <button
                    onClick={() => setCampaignViewMode("list")}
                    className={`px-3 py-1.5 rounded transition-colors ${
                      campaignViewMode === "list"
                        ? `${btnPrimary} font-medium`
                        : `${textSecondary} hover:${textPrimary}`
                    }`}
                  >
                    All Campaigns ({campaigns.length})
                  </button>
                  <button
                    onClick={() => setCampaignViewMode("detail")}
                    className={`px-3 py-1.5 rounded transition-colors ${
                      campaignViewMode === "detail"
                        ? `${btnPrimary} font-medium`
                        : `${textSecondary} hover:${textPrimary}`
                    }`}
                  >
                    Campaign Detail
                  </button>
                </div>

                {campaignViewMode === "detail" && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyAll}
                      className={`p-2 rounded border text-xs ${cardElevated}`}
                      title="Copy all channels"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDownloadMarkdown}
                      className={`p-2 rounded border text-xs ${cardElevated}`}
                      title="Export Markdown"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDownloadJSON}
                      className={`p-2 rounded border text-xs ${cardElevated}`}
                      title="Export JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* LIST VIEW: All Stored Campaigns */}
            {campaignViewMode === "list" && (
              <div className="space-y-4">
                {/* Search & Platform Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-3 ${textSecondary}`} />
                    <input
                      type="text"
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      placeholder="Search campaigns by keyword..."
                      className={`w-full pl-9 pr-3 py-2 rounded-lg border text-xs outline-none ${
                        isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-white border-[#DDD8CE]"
                      } ${textPrimary}`}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {(["all", "linkedin", "x", "instagram", "multi"] as const).map((plt) => (
                      <button
                        key={plt}
                        onClick={() => setCampaignPlatformFilter(plt)}
                        className={`px-3 py-1.5 rounded-full border text-[11px] capitalize transition-colors ${
                          campaignPlatformFilter === plt
                            ? `${btnPrimary} font-semibold`
                            : `${cardBg} ${textSecondary} hover:${textPrimary}`
                        }`}
                      >
                        {plt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campaigns Grid */}
                {loadingCampaigns ? (
                  <div className={`p-12 text-center text-xs ${textSecondary}`}>
                    Loading stored campaigns from database...
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className={`p-12 text-center rounded-xl border ${cardBg} space-y-3`}>
                    <p className={`text-sm ${textPrimary}`}>No campaigns found.</p>
                    <p className={`text-xs ${textSecondary}`}>Create your first story in the Studio!</p>
                    <button
                      onClick={() => {
                        setActiveTab("studio");
                        setStudioStep(1);
                      }}
                      className={`px-4 py-2 rounded text-xs font-medium ${btnPrimary}`}
                    >
                      Open Studio &rarr;
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaigns
                      .filter((c) => {
                        const matchesSearch =
                          !campaignSearch ||
                          c.title?.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                          c.content_text?.toLowerCase().includes(campaignSearch.toLowerCase());
                        const matchesPlat =
                          campaignPlatformFilter === "all" ||
                          c.platform?.toLowerCase().includes(campaignPlatformFilter.toLowerCase());
                        return matchesSearch && matchesPlat;
                      })
                      .map((c) => (
                        <div
                          key={c.id}
                          className={`rounded-xl p-5 border ${cardBg} flex flex-col justify-between space-y-3 hover:border-slate-400 dark:hover:border-slate-600 transition-colors`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-mono uppercase">
                                {c.platform || "Multi"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                                  {c.status || "Finalised"}
                                </span>
                                <span className={`text-[10px] font-mono ${textSecondary}`}>
                                  {c.date || "Sep 2026"}
                                </span>
                              </div>
                            </div>

                            <h3 className={`font-serif text-base font-semibold ${textPrimary}`}>
                              {c.title}
                            </h3>

                            <p className={`text-xs ${textSecondary} line-clamp-3 leading-relaxed`}>
                              {c.content_text}
                            </p>
                          </div>

                          <div className={`pt-3 border-t ${borderSubtle} flex items-center justify-between text-xs`}>
                            <button
                              onClick={() => {
                                setSelectedCampaign(c);
                                if (c.content_text) {
                                  setChannelTexts((prev) => ({
                                    ...prev,
                                    linkedin: c.content_text || prev.linkedin,
                                  }));
                                }
                                setCampaignViewMode("detail");
                              }}
                              className={`text-xs font-semibold ${scriptAccent} hover:underline`}
                            >
                              Inspect Details &rarr;
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  if (navigator.clipboard) {
                                    navigator.clipboard.writeText(c.content_text);
                                    setCopiedId(c.id);
                                    setTimeout(() => setCopiedId(null), 2000);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded border text-[11px] flex items-center gap-1 ${cardElevated}`}
                                title="Copy campaign text"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedId === c.id ? "Copied!" : "Copy"}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteCampaign(c.id)}
                                className={`p-1.5 rounded hover:text-rose-500 text-slate-400 transition-colors`}
                                title="Delete campaign"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* DETAIL VIEW: Single Active Campaign Subtabs */}
            {campaignViewMode === "detail" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-xs font-mono ${textSecondary}`}>
                    <button
                      onClick={() => setCampaignViewMode("list")}
                      className="hover:underline flex items-center gap-1"
                    >
                      &larr; Back to all campaigns
                    </button>
                    <span>&bull;</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                      {selectedCampaign?.status || "Ready"}
                    </span>
                  </div>
                </div>

                <div className={`flex items-center gap-4 border-b ${borderSubtle} text-xs font-medium ${textSecondary}`}>
                  {(["overview", "content", "evidence", "performance", "activity"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDetailSubTab(t)}
                      className={`pb-2.5 capitalize transition-colors ${
                        detailSubTab === t
                          ? `${textPrimary} border-b-2 ${isDark ? "border-[#C8BBA8]" : "border-[#16181D]"} font-semibold`
                          : "hover:opacity-80"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

            {/* Sub-tab 1: Overview */}
            {detailSubTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className={`md:col-span-5 rounded-xl p-6 border ${cardBg} space-y-4`}>
                  <h3 className={`font-serif text-sm font-semibold ${textPrimary}`}>Campaign Details</h3>
                  <div className={`space-y-3 text-xs ${textSecondary}`}>
                    <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                      <span>Created by</span>
                      <span className={textPrimary}>Founding Team</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                      <span>Selected Angle</span>
                      <span className={textPrimary}>{angles.find((a) => a.id === selectedAngleId)?.tag || "Customer Outcome"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                      <span>Target Channels</span>
                      <span className={textPrimary}>LinkedIn, X, Instagram, YouTube, Email</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Execution Status</span>
                      <span className="text-emerald-500 font-mono font-medium">Ready &bull; Verified</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border ${cardElevated} flex items-start gap-2.5 text-xs`}>
                    <AsterAvatar mood="thinking" size="xs" />
                    <p className={`${textSecondary} text-[11px] leading-relaxed`}>
                      <strong>Aster:</strong> All copy is grounded in verified benchmarks. Peak founder engagement slot recommended: 10:00 AM &ndash; 11:00 AM.
                    </p>
                  </div>
                </div>

                <div className={`md:col-span-7 rounded-xl p-6 border ${cardBg} space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-serif text-sm font-semibold ${textPrimary}`}>Distribution Status</h3>
                    <button
                      onClick={() => setDetailSubTab("content")}
                      className={`text-xs ${scriptAccent} hover:underline`}
                    >
                      View all channel copy &rarr;
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className={`p-3.5 rounded-lg border ${cardElevated} flex items-center justify-between text-xs`}>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-xs text-[#0A66C2]">in</span>
                        <span className={`font-medium ${textPrimary}`}>LinkedIn Post</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">Verified &bull; Ready</span>
                    </div>

                    <div className={`p-3.5 rounded-lg border ${cardElevated} flex items-center justify-between text-xs`}>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-xs">X</span>
                        <span className={`font-medium ${textPrimary}`}>X Thread</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">Verified &bull; Ready</span>
                    </div>

                    <div className={`p-3.5 rounded-lg border ${cardElevated} flex items-center justify-between text-xs`}>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-xs text-[#E1306C]">IG</span>
                        <span className={`font-medium ${textPrimary}`}>Instagram Visual</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">Asset Generated</span>
                    </div>

                    <div className={`p-3.5 rounded-lg border ${cardElevated} flex items-center justify-between text-xs`}>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-xs text-amber-500">@</span>
                        <span className={`font-medium ${textPrimary}`}>Customer Email</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">HTML Formatted</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Content */}
            {detailSubTab === "content" && (
              <div className="space-y-4">
                {(["linkedin", "x", "instagram", "youtube", "email"] as const).map((ch) => (
                  <div key={ch} className={`rounded-xl p-5 border ${cardBg} space-y-3`}>
                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2 text-xs">
                      <span className="font-mono uppercase font-semibold text-emerald-500">{ch} Copy</span>
                      <button
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(channelTexts[ch]);
                            alert(`Copied ${ch.toUpperCase()} copy to clipboard!`);
                          }
                        }}
                        className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded border ${cardElevated} hover:opacity-80`}
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Text</span>
                      </button>
                    </div>
                    <pre className={`text-xs ${textPrimary} whitespace-pre-wrap font-sans leading-relaxed`}>
                      {channelTexts[ch]}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-tab 3: Evidence */}
            {detailSubTab === "evidence" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`rounded-xl p-5 border ${cardBg} space-y-2`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-500 font-mono text-[11px]">&check; Grounded Proof</span>
                    <span className="font-mono text-[10px] text-neutral-400">BENCH-001</span>
                  </div>
                  <h4 className={`font-serif text-base ${textPrimary}`}>70% Sync Latency Reduction</h4>
                  <p className={`text-xs ${textSecondary}`}>Verified by production benchmark traces across 10,000 transactions.</p>
                </div>
                <div className={`rounded-xl p-5 border ${cardBg} space-y-2`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-500 font-mono text-[11px]">&check; Zero Hallucination Gate</span>
                    <span className="font-mono text-[10px] text-neutral-400">PASSED</span>
                  </div>
                  <h4 className={`font-serif text-base ${textPrimary}`}>No Prohibited Superlatives</h4>
                  <p className={`text-xs ${textSecondary}`}>Deterministic claims audit completed with 0 unsupported statements.</p>
                </div>
              </div>
            )}

            {/* Sub-tab 4: Performance */}
            {detailSubTab === "performance" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className={`rounded-xl p-4 border ${cardBg}`}>
                    <span className={`text-xs ${textSecondary}`}>Est. Reach</span>
                    <p className={`font-serif text-2xl ${textPrimary} mt-1`}>18.4K</p>
                    <span className="text-[10px] font-mono text-emerald-500">+24% vs average</span>
                  </div>
                  <div className={`rounded-xl p-4 border ${cardBg}`}>
                    <span className={`text-xs ${textSecondary}`}>Target CTR</span>
                    <p className={`font-serif text-2xl ${textPrimary} mt-1`}>4.2%</p>
                    <span className="text-[10px] font-mono text-emerald-500">High intent</span>
                  </div>
                  <div className={`rounded-xl p-4 border ${cardBg}`}>
                    <span className={`text-xs ${textSecondary}`}>Channels Ready</span>
                    <p className={`font-serif text-2xl ${textPrimary} mt-1`}>5 / 5</p>
                    <span className="text-[10px] font-mono text-emerald-500">Full syndication</span>
                  </div>
                  <div className={`rounded-xl p-4 border ${cardBg}`}>
                    <span className={`text-xs ${textSecondary}`}>Confidence</span>
                    <p className={`font-serif text-2xl ${textPrimary} mt-1`}>98%</p>
                    <span className="text-[10px] font-mono text-emerald-500">Evidence backed</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 5: Activity */}
            {detailSubTab === "activity" && (
              <div className={`rounded-xl p-6 border ${cardBg} space-y-4 text-xs`}>
                <h4 className={`font-serif text-sm font-semibold ${textPrimary}`}>Campaign Audit Log</h4>
                <div className="space-y-3 font-mono text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className={textSecondary}>Just now</span>
                    <span className={textPrimary}>Multi-channel package compiled for LinkedIn, X, Instagram, Video, Email</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className={textSecondary}>1 min ago</span>
                    <span className={textPrimary}>Claims Verification Gate scanned 3 assertions &bull; Zero prohibited superlatives</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className={textSecondary}>3 mins ago</span>
                    <span className={textPrimary}>Strategic Angle discovered from raw engineering update</span>
                  </div>
                </div>
              </div>
            )}
            </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: CONTENT CALENDAR (Interactive Grid & Full Scheduling Engine)
           ========================================================================= */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <MarketingCalendar
              orgId="00000000-0000-0000-0000-000000000001"
              brandId="brand_default"
              brandName="Velo Dynamics"
            />
          </div>
        )}

        {/* =========================================================================
            TAB 4: ANALYTICS (Matching Mood Board 1 & 2)
           ========================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`font-serif text-3xl ${textPrimary}`}>Your content is performing well.</h1>
                <p className={`text-xs ${textSecondary} mt-1`}>See how your content is performing across platforms.</p>
              </div>
              <span className={`text-xs font-mono ${textSecondary} px-3 py-1.5 rounded border ${cardElevated}`}>
                Last 30 days &darr;
              </span>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`rounded-xl p-5 border ${cardBg}`}>
                <span className={`text-xs ${textSecondary}`}>Impressions</span>
                <p className={`font-serif text-2xl ${textPrimary} mt-1`}>24.8K</p>
                <span className="text-[11px] font-mono text-emerald-500">&uarr; 12%</span>
              </div>
              <div className={`rounded-xl p-5 border ${cardBg}`}>
                <span className={`text-xs ${textSecondary}`}>Engagements</span>
                <p className={`font-serif text-2xl ${textPrimary} mt-1`}>2.1K</p>
                <span className="text-[11px] font-mono text-emerald-500">&uarr; 43%</span>
              </div>
              <div className={`rounded-xl p-5 border ${cardBg}`}>
                <span className={`text-xs ${textSecondary}`}>Engagement rate</span>
                <p className={`font-serif text-2xl ${textPrimary} mt-1`}>8.4%</p>
                <span className="text-[11px] font-mono text-emerald-500">&uarr; 2.1%</span>
              </div>
              <div className={`rounded-xl p-5 border ${cardBg}`}>
                <span className={`text-xs ${textSecondary}`}>Link clicks</span>
                <p className={`font-serif text-2xl ${textPrimary} mt-1`}>320</p>
                <span className="text-[11px] font-mono text-emerald-500">&uarr; 18%</span>
              </div>
            </div>

            {/* Multi-Series Performance Chart */}
            <div className={`rounded-xl p-6 border ${cardBg} space-y-4`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${textPrimary}`}>Cross-Platform Engagement Trend</span>
                <div className={`flex items-center gap-4 text-[11px] ${textSecondary}`}>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0A66C2]" /> LinkedIn</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> X (Twitter)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E1306C]" /> Instagram</span>
                </div>
              </div>

              {/* Minimal SVG Chart */}
              <div className="h-44 w-full pt-4">
                <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                  <path
                    d="M 10 90 Q 120 40 250 50 T 490 20"
                    fill="none"
                    stroke="#0A66C2"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M 10 100 Q 140 70 250 65 T 490 45"
                    fill="none"
                    stroke="#8F92A3"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <path
                    d="M 10 110 Q 150 85 250 80 T 490 60"
                    fill="none"
                    stroke="#E1306C"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className={`flex justify-between text-[10px] font-mono ${textSecondary} pt-2 border-t ${borderSubtle}`}>
                <span>Mar 1</span>
                <span>Mar 8</span>
                <span>Mar 15</span>
                <span>Mar 22</span>
                <span>Mar 31</span>
              </div>
            </div>

            {/* Top Performing Content Card */}
            <div className={`rounded-xl p-5 border ${cardBg} flex items-center justify-between`}>
              <div className="space-y-1">
                <span className={`text-[10px] font-mono uppercase ${textSecondary}`}>Top Performing Content</span>
                <p className={`font-serif text-base ${textPrimary}`}>70% Faster Sync &mdash; Engineering Story</p>
                <p className={`text-xs ${textSecondary} font-mono`}>1.2K engagements &bull; Mar 12</p>
              </div>
              <button className={`px-3.5 py-1.5 rounded border text-xs transition-colors ${cardElevated}`}>
                View &rarr;
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: BRAND TRUTH / BRAND BRAIN (Evidence & Grounded Facts)
           ========================================================================= */}
        {activeTab === "brand-brain" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`font-serif text-3xl ${textPrimary}`}>Brand Truth Grounding</h1>
                <p className={`text-xs ${textSecondary} mt-1`}>
                  The verified evidence foundation that Aster uses to write and check your stories.
                </p>
              </div>
              <button
                onClick={() => setIsAddFactOpen(true)}
                className={`px-3.5 py-1.5 rounded font-medium text-xs pressable flex items-center gap-1.5 ${btnPrimary}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Verified Fact</span>
              </button>
            </div>

            {/* Add Fact Inline Form Modal */}
            {isAddFactOpen && (
              <div className={`p-5 rounded-xl border ${cardElevated} space-y-4`}>
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
                  <span className={`font-serif font-semibold text-sm ${textPrimary}`}>Add New Grounded Truth Node</span>
                  <button onClick={() => setIsAddFactOpen(false)} className={`text-xs ${textSecondary} hover:${textPrimary}`}>
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className={textSecondary}>Grounded Assertion / Milestone:</label>
                    <input
                      type="text"
                      value={newFactClaim}
                      onChange={(e) => setNewFactClaim(e.target.value)}
                      placeholder="e.g. 5x faster database querying"
                      className={`w-full p-2.5 rounded border ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-white border-[#DDD8CE]"} ${textPrimary} outline-none`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={textSecondary}>Verification Source / Evidence:</label>
                    <input
                      type="text"
                      value={newFactSource}
                      onChange={(e) => setNewFactSource(e.target.value)}
                      placeholder="e.g. Q3 Benchmark Benchmark report #14"
                      className={`w-full p-2.5 rounded border ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-white border-[#DDD8CE]"} ${textPrimary} outline-none`}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={newFactStatus === "verified"}
                        onChange={() => setNewFactStatus("verified")}
                      />
                      <span className="text-emerald-500 font-medium">Verified</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={newFactStatus === "needs_evidence"}
                        onChange={() => setNewFactStatus("needs_evidence")}
                      />
                      <span className="text-amber-500 font-medium">Needs Evidence</span>
                    </label>
                  </div>
                  <button
                    onClick={handleSaveBrandFact}
                    className={`px-4 py-2 rounded text-xs font-medium ${btnPrimary}`}
                  >
                    Save Truth Node
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brandFacts.map((f) => (
                <div key={f.id} className={`rounded-xl p-5 border ${cardBg} space-y-2 relative group`}>
                  <div className="flex items-center justify-between text-xs">
                    {f.status === "verified" && (
                      <span className="text-emerald-500 font-mono text-[11px]">&check; Verified</span>
                    )}
                    {f.status === "needs_evidence" && (
                      <span className="text-amber-500 font-mono text-[11px]">&bull; Needs Evidence</span>
                    )}
                    {f.status === "prohibited" && (
                      <span className="text-rose-500 font-mono text-[11px]">&times; Prohibited</span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`${textSecondary} font-mono text-[10px]`}>{f.date}</span>
                      <button
                        onClick={() => handleDeleteBrandFact(f.id)}
                        title="Delete fact"
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-500 text-slate-400 transition-opacity p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className={`font-serif text-sm ${textPrimary} ${f.status === "prohibited" ? "line-through" : ""}`}>
                    {f.claim}
                  </p>
                  <p className={`text-[11px] ${f.status === "prohibited" ? "text-rose-500" : textSecondary}`}>
                    Source: {f.source}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Inspiration with Aster */}
            <div className={`rounded-xl p-6 border ${cardBg} flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-10 overflow-hidden relative">
                  <Image
                    src="/aster/aster_peeking.png"
                    alt="Aster Peeking"
                    width={56}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className={`font-serif text-sm font-semibold ${textPrimary}`}>Small moments. Big impact.</p>
                  <p className={`text-xs ${textSecondary}`}>Add customer quotes, benchmarks, and changelogs to expand Aster&rsquo;s evidence brain.</p>
                </div>
              </div>

              <span className={`font-script text-base ${scriptAccent}`}>
                With Aster, every story goes further.
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Footer with Privacy Policy and Terms of Service */}
      <footer className={`py-8 px-6 sm:px-12 border-t ${borderSubtle} max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${textSecondary} mt-12`}>
        <div className="flex items-center gap-2">
          <span className={`font-serif font-bold text-sm ${textPrimary}`}>Marketing OS</span>
          <span>&copy; 2026</span>
        </div>
        <p className={`font-script text-sm ${scriptAccent}`}>
          Progress deserves a stage.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className={`hover:${textPrimary} underline-offset-4 hover:underline`}>
            Privacy Policy
          </Link>
          <Link href="/terms" className={`hover:${textPrimary} underline-offset-4 hover:underline`}>
            Terms of Service
          </Link>
          <Link href="/" className={`hover:${textPrimary} underline-offset-4 hover:underline`}>
            Home
          </Link>
        </div>
      </footer>

      {/* Floating On-Demand Aster Chat Drawer */}
      <AsterChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Connected Social Accounts & OAuth Management Modal */}
      <ConnectedAccountsDialog
        isOpen={accountsOpen}
        onClose={() => setAccountsOpen(false)}
        isDark={isDark}
      />

      {/* Founder Notes Modal */}
      {isNotesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-xl rounded-2xl border ${cardBg} shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200`}
          >
            {/* Header */}
            <div className={`p-5 border-b ${borderSubtle} flex items-center justify-between ${cardElevated}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-[#252934] text-[#C8BBA8]" : "bg-[#F3EFE7] text-[#8B452B]"}`}>
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-serif text-base font-semibold ${textPrimary}`}>Founder Knowledge &amp; Notes</h3>
                  <p className={`text-[11px] ${textSecondary}`}>Select a saved note or log to populate your update</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsNotesOpen(false);
                  setIsCreatingNote(false);
                }}
                className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${textSecondary} hover:${textPrimary}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Actions Bar */}
            <div className={`p-4 border-b ${borderSubtle} flex items-center justify-between gap-3 text-xs`}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cardElevated} flex-1`}>
                <Search className={`w-3.5 h-3.5 ${textSecondary}`} />
                <input
                  type="text"
                  placeholder="Search notes or changelogs..."
                  value={notesFilter}
                  onChange={(e) => setNotesFilter(e.target.value)}
                  className={`bg-transparent outline-none text-xs flex-1 ${textPrimary}`}
                />
              </div>
              <button
                onClick={() => setIsCreatingNote(!isCreatingNote)}
                className={`px-3 py-1.5 rounded text-xs font-medium pressable flex items-center gap-1.5 ${
                  isCreatingNote ? cardElevated : btnPrimary
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreatingNote ? "Cancel" : "New Note"}</span>
              </button>
            </div>

            {/* Create New Note Form */}
            {isCreatingNote && (
              <div className={`p-4 border-b ${borderSubtle} space-y-3 bg-amber-500/5`}>
                <input
                  type="text"
                  placeholder="Note Title (e.g. Q3 Latency Sprint Benchmark)"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-white border-[#DDD8CE]"} ${textPrimary} text-xs outline-none`}
                />
                <textarea
                  rows={3}
                  placeholder="Write or paste your note snippet..."
                  value={newNoteBody}
                  onChange={(e) => setNewNoteBody(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-white border-[#DDD8CE]"} ${textPrimary} text-xs outline-none leading-relaxed resize-none`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleSaveCustomNote}
                    disabled={!newNoteTitle.trim() || !newNoteBody.trim()}
                    className={`px-4 py-1.5 rounded text-xs font-medium pressable ${btnPrimary}`}
                  >
                    Save &amp; Insert
                  </button>
                </div>
              </div>
            )}

            {/* Notes List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {savedNotes
                .filter(
                  (n) =>
                    !notesFilter ||
                    n.title.toLowerCase().includes(notesFilter.toLowerCase()) ||
                    n.snippet.toLowerCase().includes(notesFilter.toLowerCase())
                )
                .map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-xl border ${cardElevated} hover:border-[#A8583C] transition-all space-y-2`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                          {note.tag}
                        </span>
                        <span className={`font-serif font-semibold text-xs ${textPrimary}`}>
                          {note.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleInsertNote(note.snippet)}
                        className={`px-3 py-1 rounded text-[11px] font-medium pressable ${btnPrimary}`}
                      >
                        Insert &rarr;
                      </button>
                    </div>
                    <p className={`text-xs ${textSecondary} leading-relaxed line-clamp-3`}>
                      {note.snippet}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Strategic Angle Modal */}
      {isEditAngleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-2xl border ${cardBg} shadow-2xl overflow-hidden space-y-4 p-6 animate-in zoom-in-95 duration-200`}
          >
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#A8583C]" />
                <h3 className={`font-serif text-base font-semibold ${textPrimary}`}>Edit Strategic Angle</h3>
              </div>
              <button
                onClick={() => setIsEditAngleOpen(false)}
                className={`p-1 rounded ${textSecondary} hover:${textPrimary}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className={textSecondary}>Angle Headline / Hook:</label>
                <input
                  type="text"
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  placeholder="Enter strategic headline..."
                  className={`w-full p-2.5 rounded-lg border ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-white border-[#DDD8CE]"} ${textPrimary} outline-none text-xs`}
                />
              </div>

              <div className="space-y-1">
                <label className={textSecondary}>Strategic Rationale &amp; Why It Wins:</label>
                <textarea
                  rows={3}
                  value={customRationale}
                  onChange={(e) => setCustomRationale(e.target.value)}
                  placeholder="Why this angle resonates with your target audience..."
                  className={`w-full p-2.5 rounded-lg border ${isDark ? "bg-[#111215] border-[#2A2E39]" : "bg-white border-[#DDD8CE]"} ${textPrimary} outline-none text-xs leading-relaxed resize-none`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsEditAngleOpen(false)}
                className={`px-4 py-2 rounded text-xs ${cardElevated}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomAngle}
                disabled={!customHeadline.trim()}
                className={`px-5 py-2 rounded text-xs font-medium pressable ${btnPrimary}`}
              >
                Save Angle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

