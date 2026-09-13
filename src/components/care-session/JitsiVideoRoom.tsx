"use client";

import { useEffect, useRef } from "react";

interface JitsiVideoRoomProps {
  roomName: string;
  displayName: string;
  email?: string;
  onReadyToClose?: () => void;
}

type JitsiInstance = {
  addListener: (event: string, handler: () => void) => void;
  dispose: () => void;
};

type JitsiConstructor = new (domain: string, options: Record<string, unknown>) => JitsiInstance;

function getJitsiAPI(): JitsiConstructor | undefined {
  return (window as unknown as { JitsiMeetExternalAPI?: JitsiConstructor }).JitsiMeetExternalAPI;
}

export function JitsiVideoRoom({ roomName, displayName, email, onReadyToClose }: JitsiVideoRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiInstance | null>(null);

  useEffect(() => {
    const DOMAIN = "meet.jit.si";
    const ROOM = `nutriopus-${roomName}`;

    function startMeeting() {
      const JitsiMeetExternalAPI = getJitsiAPI();
      if (!containerRef.current || apiRef.current || !JitsiMeetExternalAPI) return;

      apiRef.current = new JitsiMeetExternalAPI(DOMAIN, {
        roomName: ROOM,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          disableModeratorIndicator: true,
          enableEmailInStats: false,
          requireDisplayName: false,
          disableDeepLinking: true,
          disableInviteFunctions: true,
        },
        interfaceConfigOverwrite: {
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          SHOW_JITSI_WATERMARK: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          HIDE_DEEP_LINKING_LOGO: true,
          TOOLBAR_ALWAYS_VISIBLE: false,
        },
        userInfo: {
          displayName,
          email: email ?? "",
        },
      });

      apiRef.current.addListener("videoConferenceLeft", () => onReadyToClose?.());
    }

    const SCRIPT_ID = "jitsi-external-api";

    if (getJitsiAPI()) {
      startMeeting();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (!existing) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `https://${DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = () => startMeeting();
      document.head.appendChild(script);
    } else {
      existing.addEventListener("load", startMeeting, { once: true });
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName]);

  return (
    <div className="w-full h-full min-h-[480px] rounded-xl overflow-hidden bg-slate-900">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
