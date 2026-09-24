"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarEvent,
  VerificationAuditLog,
  IngestParseResponse,
  IngestionRow,
  ProposedEventItem,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  duplicateCalendarEvent,
  approveCalendarEvent,
  rejectCalendarEvent,
  bulkApproveCalendarEvents,
  ingestConfirmSchedule,
  getCalendarEventAuditLogs,
  runSchedulerCycle
} from "@/lib/api-client";
import { CalendarToolbar } from "./calendar-toolbar";
import { CalendarGrid } from "./calendar-grid";
import { PendingVerificationQueue } from "./pending-verification-queue";
import { VerificationModal } from "./verification-modal";
import { CalendarEventEditor } from "./calendar-event-editor";
import { FileUploader } from "./schedule-ingestion/file-uploader";
import { IngestionPreviewTable } from "./schedule-ingestion/ingestion-preview-table";
import { NLSchedulerPrompt } from "./schedule-ingestion/nl-scheduler-prompt";
import { toast } from "sonner";
import { Zap, Play } from "lucide-react";

interface MarketingCalendarProps {
  brandId: string;
  brandName: string;
  orgId: string;
}

export function MarketingCalendar({ brandId, brandName, orgId }: MarketingCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda">("month");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [verifyEvent, setVerifyEvent] = useState<CalendarEvent | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isIngestPreviewOpen, setIsIngestPreviewOpen] = useState(false);
  const [isAIPromptOpen, setIsAIPromptOpen] = useState(false);
  const [parsedIngestData, setParsedIngestData] = useState<IngestParseResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<VerificationAuditLog[]>([]);

  // Fetch events
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCalendarEvents({
        org_id: orgId,
        brand_id: brandId,
        channel: channelFilter !== "all" ? channelFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setEvents(data);
    } catch (e) {
      toast.error(`Failed to load calendar: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [orgId, brandId, channelFilter, statusFilter]);

  useEffect(() => {
    let ignore = false;
    async function fetchCalendar() {
      try {
        const data = await getCalendarEvents({
          org_id: orgId,
          brand_id: brandId,
          channel: channelFilter !== "all" ? channelFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        });
        if (!ignore) {
          setEvents(data);
        }
      } catch (e) {
        if (!ignore) {
          toast.error(`Failed to load calendar: ${(e as Error).message}`);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchCalendar();
    return () => {
      ignore = true;
    };
  }, [orgId, brandId, channelFilter, statusFilter]);

  // Date Navigation
  const handlePrevDate = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNextDate = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Event Selection & Audit Log Fetching
  const handleSelectEvent = async (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditorOpen(true);
    try {
      const logs = await getCalendarEventAuditLogs(event.id);
      setAuditLogs(logs.logs || []);
    } catch {
      setAuditLogs([]);
    }
  };

  // Human Verification Sign-Off
  const handleApprove = async (params: {
    eventId: string;
    contentVersion: number;
    contentHash: string;
    immediateAction?: string;
    rescheduledAt?: string;
    notes?: string;
  }) => {
    try {
      const res = await approveCalendarEvent(params.eventId, {
        content_version: params.contentVersion,
        content_hash: params.contentHash,
        immediate_action: params.immediateAction,
        rescheduled_at: params.rescheduledAt,
        notes: params.notes,
        user_id: "founder@velodynamics.com",
        user_role: "reviewer",
      });
      toast.success("Event verified & armed with cryptographic seal!");
      loadEvents();
    } catch (e) {
      toast.error(`Approval failed: ${(e as Error).message}`);
    }
  };

  // Bulk Approval
  const handleBulkApprove = async (selectedEvents: CalendarEvent[]) => {
    try {
      const items = selectedEvents.map((e) => ({
        event_id: e.id,
        content_version: e.content_version,
        content_hash: e.current_content_hash,
      }));
      const res = await bulkApproveCalendarEvents({ items });
      toast.success(`Successfully verified and armed ${res.success_count} posts!`);
      if (res.failed_count > 0) {
        toast.warning(`${res.failed_count} items could not be verified due to version changes.`);
      }
      loadEvents();
    } catch (e) {
      toast.error(`Bulk verification error: ${(e as Error).message}`);
    }
  };

  // Rejection
  const handleReject = async (eventId: string, reason: string) => {
    try {
      await rejectCalendarEvent(eventId, { reason });
      toast.info("Event marked as REJECTED with feedback logged.");
      loadEvents();
    } catch (e) {
      toast.error(`Rejection error: ${(e as Error).message}`);
    }
  };

  // Event Mutations
  const handleSaveEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      await updateCalendarEvent(eventId, updates);
      toast.success("Event updated!");
      loadEvents();
    } catch (e) {
      toast.error(`Failed to update: ${(e as Error).message}`);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteCalendarEvent(eventId);
      toast.success("Event deleted.");
      loadEvents();
    } catch (e) {
      toast.error(`Failed to delete: ${(e as Error).message}`);
    }
  };

  const handleDuplicateEvent = async (eventId: string) => {
    try {
      const res = await duplicateCalendarEvent(eventId);
      toast.success("Duplicated into a fresh draft!");
      loadEvents();
    } catch (e) {
      toast.error(`Failed to duplicate: ${(e as Error).message}`);
    }
  };

  // Ingestion Commit
  const handleConfirmIngested = async (rows: IngestionRow[]) => {
    try {
      const res = await ingestConfirmSchedule({
        org_id: orgId,
        brand_id: brandId,
        rows,
      });
      toast.success(`Committed ${res.total_committed} events into Verification Queue!`);
      loadEvents();
    } catch (e) {
      toast.error(`Failed to commit rows: ${(e as Error).message}`);
    }
  };

  // AI Proposal Commit
  const handleAcceptAIProposal = async (proposed: ProposedEventItem[]) => {
    try {
      for (const p of proposed) {
        await createCalendarEvent({
          org_id: orgId,
          brand_id: brandId,
          title: p.title,
          channel: p.channel,
          scheduled_at: p.scheduled_at,
          timezone: "Asia/Kolkata",
          status: "PENDING_VERIFICATION",
          channel_payload: {
            post_text: p.draft_hook,
            source_body: p.draft_hook,
            cta: p.cta || "Learn more",
          },
        });
      }
      toast.success(`Created ${proposed.length} scheduled events from AI Proposal!`);
      loadEvents();
    } catch (e) {
      toast.error(`Failed to create proposal events: ${(e as Error).message}`);
    }
  };

  // Worker Test Dispatcher Trigger
  const handleTriggerWorkerCycle = async () => {
    try {
      const res = await runSchedulerCycle();
      toast.success(`Scheduler cycle finished: ${res.processed_count} posts processed.`);
      loadEvents();
    } catch (e) {
      toast.error(`Worker error: ${(e as Error).message}`);
    }
  };

  const pendingEvents = events.filter((e) => e.status === "PENDING_VERIFICATION");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-white font-sans">
            Marketing Calendar & Autopilot
          </h1>
          <p className="text-[#c7c4d7] text-sm mt-1">
            Grounded multi-channel scheduling & safe Human-in-the-Loop publishing engine for {brandName}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerWorkerCycle}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#292932] hover:bg-[#34343d] text-white text-xs font-mono font-bold border border-white/10 transition-colors pressable"
            title="Poll and publish due items right now"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>RUN SCHEDULER CYCLE</span>
          </button>
        </div>
      </div>

      {/* Top Pending Verification Safety Queue */}
      <PendingVerificationQueue
        pendingEvents={pendingEvents}
        onOpenVerifyModal={(ev) => {
          setVerifyEvent(ev);
          setIsVerifyOpen(true);
        }}
        onBulkApprove={handleBulkApprove}
      />

      {/* Calendar Toolbar */}
      <CalendarToolbar
        currentDate={currentDate}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onPrevDate={handlePrevDate}
        onNextDate={handleNextDate}
        onToday={handleToday}
        selectedChannelFilter={channelFilter}
        onSelectChannelFilter={setChannelFilter}
        selectedStatusFilter={statusFilter}
        onSelectStatusFilter={setStatusFilter}
        onOpenCreateModal={() => {
          setSelectedEvent({
            id: "",
            org_id: orgId,
            brand_id: brandId,
            title: "New Marketing Event",
            channel: "linkedin",
            scheduled_at: new Date().toISOString(),
            timezone: "Asia/Kolkata",
            status: "DRAFT",
            content_version: 1,
            current_content_hash: "",
            retry_count: 0,
            created_by: "founder",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            channel_payload: { post_text: "", cta: "" },
          });
          setIsEditorOpen(true);
        }}
        onOpenUploadModal={() => setIsUploaderOpen(true)}
        onOpenAISchedulerModal={() => setIsAIPromptOpen(true)}
        onRefresh={loadEvents}
        pendingCount={pendingEvents.length}
      />

      {/* Calendar View Grid */}
      <CalendarGrid
        currentDate={currentDate}
        viewMode={viewMode}
        events={events}
        onSelectEvent={handleSelectEvent}
        onOpenVerifyModal={(ev) => {
          setVerifyEvent(ev);
          setIsVerifyOpen(true);
        }}
      />

      {/* Modals Suite */}
      <VerificationModal
        event={verifyEvent}
        isOpen={isVerifyOpen}
        onClose={() => {
          setIsVerifyOpen(false);
          setVerifyEvent(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <CalendarEventEditor
        event={selectedEvent}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        onDuplicate={handleDuplicateEvent}
        auditLogs={auditLogs}
      />

      <FileUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onParsed={(data) => {
          setParsedIngestData(data);
          setIsIngestPreviewOpen(true);
        }}
      />

      <IngestionPreviewTable
        data={parsedIngestData}
        isOpen={isIngestPreviewOpen}
        onClose={() => {
          setIsIngestPreviewOpen(false);
          setParsedIngestData(null);
        }}
        onConfirm={handleConfirmIngested}
      />

      <NLSchedulerPrompt
        isOpen={isAIPromptOpen}
        onClose={() => setIsAIPromptOpen(false)}
        onAcceptProposal={handleAcceptAIProposal}
        brandName={brandName}
      />
    </div>
  );
}
