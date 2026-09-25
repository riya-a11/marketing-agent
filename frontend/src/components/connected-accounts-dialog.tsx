"use client";

import React, { useState, useEffect } from "react";
import {
  X as CloseIcon,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Trash2,
  Shield,
  AlertCircle
} from "lucide-react";
import {
  getSocialAccounts,
  getSocialAuthorizeUrl,
  disconnectSocialAccount,
  directConnectSocialAccount,
  type ConnectedAccount
} from "@/lib/api-client";

interface ConnectedAccountsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export function ConnectedAccountsDialog({
  isOpen,
  onClose,
  isDark = true,
}: ConnectedAccountsDialogProps) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [manualPlatform, setManualPlatform] = useState<"linkedin" | "x" | "instagram" | null>(null);
  const [manualHandle, setManualHandle] = useState("");
  const [manualDisplayName, setManualDisplayName] = useState("");

  const cardBg = isDark ? "bg-[#16181D]" : "bg-[#FFFFFF]";
  const cardElevated = isDark ? "bg-[#1C1F26] border-[#2D323E]" : "bg-[#F3EFE7] border-[#DDD8CE]";
  const textPrimary = isDark ? "text-[#FBF9F5]" : "text-[#16181D]";
  const textSecondary = isDark ? "text-[#8E95A5]" : "text-[#6B665E]";
  const borderSubtle = isDark ? "border-[#242833]" : "border-[#E5E0D5]";

  const fetchAccounts = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getSocialAccounts();
      if (res && res.accounts) {
        setAccounts(res.accounts);
      }
    } catch {
      setErrorMessage("Could not load connected social accounts. Running offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void Promise.resolve().then(() => fetchAccounts());
    }
  }, [isOpen]);

  const handleOAuthConnect = async (platform: string) => {
    setActionLoading("oauth_" + platform);
    setErrorMessage(null);
    try {
      const data = await getSocialAuthorizeUrl(platform);
      if (data && data.authorization_url && typeof window !== "undefined") {
        window.location.assign(data.authorization_url);
      }
    } catch {
      setErrorMessage("Failed to initiate OAuth for " + platform.toUpperCase() + ".");
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    setActionLoading("disconnect_" + platform);
    setErrorMessage(null);
    try {
      await disconnectSocialAccount(platform);
      setSuccessMessage("Disconnected " + platform.toUpperCase() + " account successfully.");
      await fetchAccounts();
    } catch {
      setErrorMessage("Failed to disconnect " + platform.toUpperCase() + " account.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDirectConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPlatform || !manualHandle.trim()) return;

    setActionLoading("direct_" + manualPlatform);
    setErrorMessage(null);
    try {
      await directConnectSocialAccount(manualPlatform, {
        account_handle: manualHandle.trim(),
        display_name: manualDisplayName.trim() || undefined,
      });
      setSuccessMessage("Successfully connected " + manualPlatform.toUpperCase() + " account!");
      setManualPlatform(null);
      setManualHandle("");
      setManualDisplayName("");
      await fetchAccounts();
    } catch {
      setErrorMessage("Failed to link " + manualPlatform.toUpperCase() + " account.");
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  const platforms = [
    {
      id: "linkedin",
      name: "LinkedIn",
      tag: "in",
      color: "text-[#0A66C2]",
      badge: "Professional Network",
      description: "Post executive updates, technical stories, and company milestones.",
    },
    {
      id: "x",
      name: "X (Twitter)",
      tag: "X",
      color: textPrimary,
      badge: "Real-time Pulse",
      description: "Distribute threads, launch announcements, and engineering breakthroughs.",
    },
    {
      id: "instagram",
      name: "Instagram",
      tag: "IG",
      color: "text-[#E1306C]",
      badge: "Visual Brand",
      description: "Publish carousels, behind-the-scenes engineering, and product graphics.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-2xl rounded-2xl border ${borderSubtle} ${cardBg} shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
      >
        <div className={`p-6 border-b ${borderSubtle} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isDark ? "bg-[#1C1F26] border-[#2D323E] text-emerald-400" : "bg-[#F3EFE7] border-[#DDD8CE] text-emerald-600"
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`font-serif text-lg font-semibold ${textPrimary}`}>
                Connected Channels & OAuth
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                Authorize official channels to publish approved marketing campaigns.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${textSecondary} hover:${textPrimary} transition-colors`}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            {platforms.map((plat) => {
              const connected = accounts.find(
                (a) => a.platform.toLowerCase() === plat.id.toLowerCase() && a.status === "connected"
              );
              const isConnecting = actionLoading === ("oauth_" + plat.id);
              const isDisconnecting = actionLoading === ("disconnect_" + plat.id);

              return (
                <div
                  key={plat.id}
                  className={`p-5 rounded-xl border ${cardElevated} transition-all space-y-3`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg border ${borderSubtle} ${cardBg} font-bold text-sm flex items-center justify-center ${plat.color}`}
                      >
                        {plat.tag}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-semibold ${textPrimary}`}>{plat.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${borderSubtle} ${textSecondary}`}>
                            {plat.badge}
                          </span>
                        </div>
                        <p className={`text-xs ${textSecondary} mt-0.5`}>{plat.description}</p>
                      </div>
                    </div>

                    {connected ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-500 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Connected
                        </span>
                        <button
                          onClick={() => handleDisconnect(plat.id)}
                          disabled={isDisconnecting}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors"
                          title="Disconnect account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setManualPlatform(plat.id as "linkedin" | "x" | "instagram")}
                          className={`px-3 py-1.5 rounded-md text-xs font-mono border ${borderSubtle} hover:${textPrimary} ${textSecondary} transition-colors`}
                        >
                          Manual Handle
                        </button>
                        <button
                          onClick={() => handleOAuthConnect(plat.id)}
                          disabled={isConnecting}
                          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isDark
                              ? "bg-[#FBF9F5] text-[#16181D] hover:bg-white"
                              : "bg-[#16181D] text-[#FBF9F5] hover:bg-black"
                          }`}
                        >
                          {isConnecting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5" />
                          )}
                          <span>OAuth Connect</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {connected && (
                    <div
                      className={`pt-3 border-t ${borderSubtle} flex items-center justify-between text-xs font-mono ${textSecondary}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={textPrimary}>@{connected.account_handle.replace(/^@/, "")}</span>
                        {connected.display_name && (
                          <span>&bull; {connected.display_name}</span>
                        )}
                      </div>
                      <span>Updated: {connected.updated_at || "Recent"}</span>
                    </div>
                  )}

                  {manualPlatform === plat.id && !connected && (
                    <form
                      onSubmit={handleDirectConnectSubmit}
                      className={`mt-3 pt-3 border-t ${borderSubtle} space-y-3`}
                    >
                      <p className={`text-xs ${textSecondary}`}>
                        Enter account handle for quick simulation or test publishing:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={manualHandle}
                          onChange={(e) => setManualHandle(e.target.value)}
                          placeholder="@account_handle"
                          className={`px-3 py-1.5 rounded-md text-xs border ${borderSubtle} ${cardBg} ${textPrimary} focus:outline-hidden`}
                        />
                        <input
                          type="text"
                          value={manualDisplayName}
                          onChange={(e) => setManualDisplayName(e.target.value)}
                          placeholder="Display Name (Optional)"
                          className={`px-3 py-1.5 rounded-md text-xs border ${borderSubtle} ${cardBg} ${textPrimary} focus:outline-hidden`}
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setManualPlatform(null)}
                          className={`px-2.5 py-1 text-xs ${textSecondary} hover:${textPrimary}`}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading === ("direct_" + plat.id)}
                          className={`px-3 py-1 rounded-md text-xs font-medium ${
                            isDark ? "bg-[#FBF9F5] text-[#16181D]" : "bg-[#16181D] text-[#FBF9F5]"
                          }`}
                        >
                          {actionLoading === ("direct_" + plat.id) ? "Saving..." : "Save Handle"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`p-4 border-t ${borderSubtle} ${cardElevated} flex items-center justify-between text-xs`}>
          <div className="flex items-center gap-2 text-emerald-500 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Encrypted OAuth Storage (Multi-Tenant Isolated)</span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-md border ${borderSubtle} font-medium ${textPrimary} hover:opacity-80 transition-opacity`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
