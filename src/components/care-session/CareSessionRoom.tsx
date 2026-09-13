"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Video,
  PhoneOff,
  MessageSquare,
  X,
  Send,
  ExternalLink,
  CheckCircle,
  LogIn,
  RotateCcw,
  Loader2,
} from "lucide-react";
import {
  updateCareSessionStatusAction,
  updateCareSessionNotesAction,
  joinCareSessionAsNutritionistAction,
  joinCareSessionAsPatientAction,
  getCareSessionMessagesAction,
  sendNutritionistCareMessageAction,
  sendPatientCareMessageAction,
} from "@/actions/care-session.action";
import { CareSessionStatus } from "@prisma/client";
import { CareSessionRoomRouter, ProviderType } from "./CareSessionRoomRouter";
import { CareSessionPatientLinkCard } from "./CareSessionPatientLinkCard";
import { TranscriptionPanel } from "@/components/transcriptions/TranscriptionPanel";
import { RealtimeTranscriptionController } from "@/components/transcriptions/RealtimeTranscriptionController";
import { PatientRealtimeTranscriptionCapture } from "@/components/transcriptions/PatientRealtimeTranscriptionCapture";
import { LiveCaptionOverlay } from "@/components/transcriptions/realtime";
import { useI18n } from "@/lib/i18n/I18nContext";
import { CareSessionClinicalTabs } from "./CareSessionClinicalTabs";
import { AsyncButton } from "@/components/ui/AsyncButton";

type Message = {
  id: string;
  sender: string;
  body: string;
  createdAt: Date | string;
};

export type CareSessionData = {
  id: string;
  appointmentId?: string | null;
  mode?: "VIDEO" | "AUDIO" | "IN_PERSON";
  status: CareSessionStatus;
  roomUrl: string | null;
  provider?: string | null;
  externalMeetingUrl?: string | null;
  googleMeetUri?: string | null;
  nativeRoomName?: string | null;
  patientId: string;
  notes: string | null;
  clinicalSummary: string | null;
  patientInstructions: string | null;
  patientJoinTokenHash: string | null;
  messages: Message[];
  patient: { id: string; name: string };
};

interface Props {
  tenantSlug: string;
  careSession: CareSessionData;
  role: "NUTRITIONIST" | "PATIENT";
  patientJoinToken?: string | null;
  initialTranscriptions?: unknown[];
  latestAnamnese?: {
    id: string;
    status: string;
    submittedAt: string;
  } | null;
  latestMeasurement?: {
    id: string;
    measuredAt: string;
    weight: number | null;
    bmi: number | null;
    bodyFatPercentage: number | null;
  } | null;
  transcriptionSettings?: React.ComponentProps<typeof RealtimeTranscriptionController>["settings"] | null;
  initialRealtimeTranscript?: React.ComponentProps<typeof RealtimeTranscriptionController>["initialTranscript"] | null;
  patientTranscriptionActive?: boolean;
}

export function CareSessionRoom({
  tenantSlug,
  careSession,
  role,
  patientJoinToken,
  initialTranscriptions,
  latestAnamnese,
  latestMeasurement,
  transcriptionSettings,
  initialRealtimeTranscript,
  patientTranscriptionActive = false,
}: Props) {
  const { t } = useI18n();
  const [status, setStatus] = useState<CareSessionStatus>(careSession.status);
  const [callJoined, setCallJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>(careSession.messages);
  const [chatOpen, setChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [notes, setNotes] = useState(careSession.notes ?? "");
  const [clinicalSummary, setClinicalSummary] = useState(careSession.clinicalSummary ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [ending, setEnding] = useState(false);
  const [reopening, setReopening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sendingMsgRef = useRef(false);
  const [liveCaption, setLiveCaption] = useState<
    React.ComponentProps<typeof LiveCaptionOverlay>["segment"]
  >(null);

  const pollMessages = useCallback(async () => {
    const res = await getCareSessionMessagesAction(tenantSlug, careSession.id);
    if (res.success && res.messages) setMessages(res.messages as Message[]);
  }, [tenantSlug, careSession.id]);

  useEffect(() => {
    if (status !== "IN_PROGRESS" && status !== "WAITING") return;
    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, [status, pollMessages]);

  useEffect(() => {
    const chatContainer = document.getElementById("chat-container-scroll");
    if (chatContainer) {
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  const handleJoin = async () => {
    // Update session status in DB only if not already active
    if (status === "SCHEDULED" || status === "NO_SHOW") {
      if (role === "NUTRITIONIST") {
        const res = await joinCareSessionAsNutritionistAction(tenantSlug, careSession.id);
        if (res.success) setStatus("IN_PROGRESS");
        else return;
      } else {
        const res = await joinCareSessionAsPatientAction(tenantSlug, careSession.id);
        if (res.success) setStatus("WAITING");
        else return;
      }
    }
    setCallJoined(true);
  };

  // Just leaves the video call — session stays active in DB
  const handleLeaveCall = () => {
    setCallJoined(false);
  };

  // Definitively ends the session and marks it COMPLETED in DB
  const handleEnd = async () => {
    if (role !== "NUTRITIONIST") return;
    setEnding(true);
    const res = await updateCareSessionStatusAction(tenantSlug, careSession.id, "COMPLETED");
    if (res.success) {
      setStatus("COMPLETED");
      setCallJoined(false);
      toast.success(t("care_session.ended_toast"));
    }
    setEnding(false);
  };

  // Reopen a completed session (e.g. nutritionist ended by accident)
  const handleReopen = async () => {
    if (role !== "NUTRITIONIST") return;
    setReopening(true);
    const res = await updateCareSessionStatusAction(tenantSlug, careSession.id, "IN_PROGRESS");
    if (res.success) {
      setStatus("IN_PROGRESS");
      toast.success(t("care_session.reopened_toast"));
    }
    setReopening(false);
  };

  const handleSendMessage = async () => {
    const message = newMessage.trim();
    if (!message || sendingMsgRef.current) return;

    sendingMsgRef.current = true;
    setSendingMsg(true);
    try {
      const action =
        role === "NUTRITIONIST"
          ? sendNutritionistCareMessageAction(tenantSlug, careSession.id, careSession.patientId, message)
          : sendPatientCareMessageAction(tenantSlug, careSession.id, message);
      const res = await action;
      if (res.success) {
        setNewMessage("");
        await pollMessages();
      }
    } finally {
      sendingMsgRef.current = false;
      setSendingMsg(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const res = await updateCareSessionNotesAction(tenantSlug, careSession.id, {
      notes,
      clinicalSummary,
    });
    if (res.success) toast.success(t("care_session.notes_saved_toast"));
    else toast.error(t("care_session.notes_save_error"));
    setSavingNotes(false);
  };

  const isActive = status === "IN_PROGRESS" || status === "WAITING";
  const isCompleted = status === "COMPLETED" || status === "CANCELED";
  const provider = (careSession.provider as ProviderType | null) ?? "JITSI_LEGACY";

  const statusLabel = {
    SCHEDULED: t("appointments.status.scheduled"),
    WAITING: t("appointments.status.waiting"),
    IN_PROGRESS: t("appointments.status.in_progress"),
    COMPLETED: t("appointments.status.completed"),
    CANCELED: t("appointments.status.canceled"),
    NO_SHOW: t("appointments.status.no_show"),
  }[status] ?? status;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
              status === "IN_PROGRESS"
                ? "bg-green-100 text-green-700"
                : status === "COMPLETED"
                ? "bg-gray-100 text-gray-600"
                : status === "WAITING"
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {status === "IN_PROGRESS" && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Session not started yet */}
          {!isActive && !isCompleted && (
            <AsyncButton
              onClick={handleJoin}
              pendingLabel={role === "NUTRITIONIST" ? "Iniciando..." : "Entrando..."}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Video className="w-4 h-4" />
              {role === "NUTRITIONIST" ? t("care_session.start_session") : t("care_session.enter_session")}
            </AsyncButton>
          )}

          {/* Session active */}
          {isActive && (
            <>
              {/* Chat toggle */}
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-border-neutral hover:bg-gray-50 text-text-secondary text-sm font-medium rounded-lg transition-colors relative"
              >
                <MessageSquare className="w-4 h-4" />
                Chat
                {messages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-blue text-white text-xs rounded-full flex items-center justify-center">
                    {messages.length > 9 ? "9+" : messages.length}
                  </span>
                )}
              </button>

              {/* Rejoin call when out of video */}
              {!callJoined && (
                <button
                  onClick={() => setCallJoined(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  {t("care_session.rejoin_call")}
                </button>
              )}

              {/* End session — only nutritionist, clearly separated from end-call */}
              {role === "NUTRITIONIST" && (
                <button
                  onClick={handleEnd}
                  disabled={ending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
                  {ending ? "..." : t("care_session.end_session")}
                </button>
              )}
            </>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle className="w-4 h-4" />
                {t("care_session.session_finished")}
              </span>
              {role === "NUTRITIONIST" && (
                <button
                  onClick={handleReopen}
                  disabled={reopening}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-neutral rounded-lg hover:bg-warm-surface transition-colors disabled:opacity-60"
                >
                  {reopening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  {reopening ? "..." : t("care_session.reopen_session")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video area — fixed height so h-full resolves correctly inside NativeVideoRoom */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900 rounded-2xl overflow-hidden h-[500px] md:h-[600px] flex flex-col relative w-full">
            {isActive && callJoined ? (
              <div className="flex-1 flex flex-col min-h-0">
                <CareSessionRoomRouter
                  provider={provider}
                  careSessionId={careSession.id}
                  tenantSlug={tenantSlug}
                  role={role}
                  patientName={careSession.patient.name}
                  roomUrl={careSession.roomUrl}
                  googleMeetUri={careSession.googleMeetUri}
                  externalMeetingUrl={careSession.externalMeetingUrl}
                  nativeRoomName={careSession.nativeRoomName}
                  patientJoinToken={patientJoinToken}
                  onEnd={handleLeaveCall}
                />
              </div>
            ) : (
              <div className="text-center text-white p-6 m-auto">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm opacity-60">
                  {isCompleted
                    ? t("care_session.session_ended_msg")
                    : isActive
                    ? t("care_session.rejoin_call")
                    : t("care_session.start_cta")}
                </p>
                {isActive && (
                  <button
                    onClick={() => setCallJoined(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
                  >
                    <LogIn className="w-4 h-4" />
                    {t("care_session.rejoin_call")}
                  </button>
                )}
                {!isCompleted && !isActive && careSession.roomUrl && (
                  <a
                    href={careSession.roomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t("care_session.external_room")}
                  </a>
                )}
              </div>
            )}
            {role === "NUTRITIONIST" && (
              <LiveCaptionOverlay
                segment={liveCaption}
                visible={Boolean(liveCaption)}
                onOpenPanel={() =>
                  document
                    .getElementById("realtime-transcription-panel")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              />
            )}
            {role === "PATIENT" && (
              <LiveCaptionOverlay
                segment={liveCaption}
                visible={Boolean(liveCaption)}
                compact
              />
            )}
            {role === "PATIENT" && patientTranscriptionActive && (
              <div className="absolute left-3 top-3 z-30 max-w-sm rounded-lg border border-white/15 bg-black/80 px-3 py-2 text-xs text-white shadow-lg">
                {t("transcription.patientNotice")}
              </div>
            )}
          </div>

          {role === "PATIENT" && (
            <PatientRealtimeTranscriptionCapture
              careSessionId={careSession.id}
              joinToken={patientJoinToken}
              sessionActive={isActive}
              onPartialSegmentChange={setLiveCaption}
            />
          )}

          {role === "NUTRITIONIST" && (
            <CareSessionPatientLinkCard
              tenantSlug={tenantSlug}
              sessionId={careSession.id}
              hasExistingToken={!!careSession.patientJoinTokenHash}
            />
          )}

          {/* Transcription panel */}
          {role === "NUTRITIONIST" && (
            <TranscriptionPanel
              tenantSlug={tenantSlug}
              careSessionId={careSession.id}
              patientId={careSession.patientId}
              initialTranscriptions={(initialTranscriptions ?? []) as React.ComponentProps<typeof TranscriptionPanel>["initialTranscriptions"]}
            />
          )}
        </div>

        {/* Chat panel */}
        <div className={`${chatOpen || !isActive ? "block" : "hidden lg:block"} flex flex-col gap-4`}>
          <div className="bg-card-bg border border-border-neutral rounded-xl flex flex-col min-h-80 lg:h-[430px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-neutral">
              <h3 className="font-semibold text-text-primary text-sm">{t("care_session.chat_title")}</h3>
              {chatOpen && (
                <button onClick={() => setChatOpen(false)} className="lg:hidden text-text-secondary">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" id="chat-container-scroll">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-text-secondary pt-8">
                  {t("care_session.chat_no_messages")}
                </p>
              ) : (
                messages.map((msg) => {
                  const isMe =
                    (role === "NUTRITIONIST" && msg.sender === "NUTRITIONIST") ||
                    (role === "PATIENT" && msg.sender === "PATIENT");
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                          isMe ? "bg-brand-blue text-white" : "bg-surface-warm text-text-primary"
                        }`}
                      >
                        {!isMe && (
                          <p className="text-xs font-semibold mb-0.5 opacity-70">
                            {msg.sender === "NUTRITIONIST" ? t("care_session.role_nutritionist") : careSession.patient.name}
                          </p>
                        )}
                        <p>{msg.body}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {(isActive || !isCompleted) && (
              <div className="border-t border-border-neutral p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !sendingMsg) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  disabled={sendingMsg}
                  aria-busy={sendingMsg || undefined}
                  placeholder={t("care_session.chat_placeholder")}
                  className="flex-1 text-sm bg-transparent text-text-primary border border-border-neutral rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <AsyncButton
                  onClick={handleSendMessage}
                  pending={sendingMsg}
                  pendingLabel={null}
                  disabled={!newMessage.trim()}
                  aria-label={sendingMsg ? "Enviando mensagem" : "Enviar mensagem"}
                  className="p-2 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </AsyncButton>
              </div>
            )}
          </div>
          {role === "NUTRITIONIST" && (
            <CareSessionClinicalTabs
              tenantSlug={tenantSlug}
              patientId={careSession.patientId}
              patientName={careSession.patient.name}
              notes={notes}
              clinicalSummary={clinicalSummary}
              savingNotes={savingNotes}
              onNotesChange={setNotes}
              onClinicalSummaryChange={setClinicalSummary}
              onSaveNotes={handleSaveNotes}
              latestAnamnese={latestAnamnese}
              latestMeasurement={latestMeasurement}
              transcriptionContent={
                transcriptionSettings ? (
                  <div id="realtime-transcription-panel">
                    <RealtimeTranscriptionController
                      tenantSlug={tenantSlug}
                      careSessionId={careSession.id}
                      appointmentId={careSession.appointmentId}
                      patientId={careSession.patientId}
                      patientName={careSession.patient.name}
                      mode={careSession.mode === "IN_PERSON" ? "in_person" : "online"}
                      sessionActive={isActive}
                      settings={transcriptionSettings}
                      initialTranscript={initialRealtimeTranscript}
                      onPartialSegmentChange={setLiveCaption}
                    />
                  </div>
                ) : null
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
