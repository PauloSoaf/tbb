"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  groupDevices,
  mapGetUserMediaError,
  supportsUserMedia,
  type MediaDevice,
  type MediaErrorCode,
} from "./media-device-helpers";

export type { MediaDevice, MediaErrorCode } from "./media-device-helpers";

export type MediaState = {
  stream: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  error: MediaErrorCode;
  loading: boolean;
  // Device lists
  audioInputs: MediaDevice[];
  videoInputs: MediaDevice[];
  audioOutputs: MediaDevice[];
  // Selected device IDs
  selectedAudioInput: string;
  selectedVideoInput: string;
  selectedAudioOutput: string;
};

/**
 * Local media (camera/microphone/speaker) management.
 *
 * Safety rules implemented here:
 * - the previous stream is NEVER stopped before the new one is working;
 * - device switching hands the new track to the caller (WebRTC replaceTrack)
 *   BEFORE the old track is stopped;
 * - camera/mic enabled state is preserved across device switches.
 */
export function useMediaDevices() {
  const [state, setState] = useState<MediaState>({
    stream: null,
    cameraOn: true,
    micOn: true,
    error: null,
    loading: false,
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
    selectedAudioInput: "",
    selectedVideoInput: "",
    selectedAudioOutput: "",
  });

  // Refs mirror the pieces of state that async flows must read fresh
  // (React state is stale right after an await).
  const streamRef = useRef<MediaStream | null>(null);
  const cameraOnRef = useRef(true);
  const micOnRef = useRef(true);

  const enumerateDevices = useCallback(async () => {
    if (!supportsUserMedia()) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const grouped = groupDevices(devices, {
        audioinput: "Microphone",
        videoinput: "Camera",
        audiooutput: "Speaker",
      });
      setState((s) => ({ ...s, ...grouped }));
    } catch {
      // enumerateDevices can fail without permissions — ignore
    }
  }, []);

  const start = useCallback(
    async (deviceIds?: { audioInput?: string; videoInput?: string }): Promise<MediaStream | null> => {
      if (!supportsUserMedia()) {
        setState((s) => ({ ...s, error: "unsupported", loading: false }));
        return null;
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        // 1. Acquire the NEW stream first…
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceIds?.videoInput ? { deviceId: { exact: deviceIds.videoInput } } : true,
          audio: deviceIds?.audioInput ? { deviceId: { exact: deviceIds.audioInput } } : true,
        });

        // Preserve current camera/mic toggles on the new tracks.
        stream.getVideoTracks().forEach((t) => { t.enabled = cameraOnRef.current; });
        stream.getAudioTracks().forEach((t) => { t.enabled = micOnRef.current; });

        // 2. …then stop the old one (never the other way around).
        const old = streamRef.current;
        streamRef.current = stream;
        old?.getTracks().forEach((t) => t.stop());

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        setState((s) => ({
          ...s,
          stream,
          loading: false,
          error: null,
          selectedVideoInput: videoTrack?.getSettings().deviceId ?? s.selectedVideoInput,
          selectedAudioInput: audioTrack?.getSettings().deviceId ?? s.selectedAudioInput,
        }));
        void enumerateDevices();
        return stream;
      } catch (err) {
        // Acquisition failed — the previous stream (if any) stays alive.
        setState((s) => ({ ...s, error: mapGetUserMediaError(err), loading: false }));
        return null;
      }
    },
    [enumerateDevices]
  );

  /**
   * Acquires a replacement track for a device switch WITHOUT touching the
   * current stream. Caller flow:
   *   1. newTrack = await getReplacementTrack(kind, deviceId)
   *   2. await replaceTrack(newTrack)   // on the RTCPeerConnection sender
   *   3. commitReplacementTrack(kind, newTrack)  // swaps + stops old track
   */
  const getReplacementTrack = useCallback(
    async (kind: "video" | "audio", deviceId: string): Promise<MediaStreamTrack | null> => {
      if (!supportsUserMedia()) {
        setState((s) => ({ ...s, error: "unsupported" }));
        return null;
      }
      try {
        const constraints: MediaStreamConstraints =
          kind === "video"
            ? { video: { deviceId: { exact: deviceId } }, audio: false }
            : { audio: { deviceId: { exact: deviceId } }, video: false };
        const tempStream = await navigator.mediaDevices.getUserMedia(constraints);
        const track = kind === "video"
          ? tempStream.getVideoTracks()[0] ?? null
          : tempStream.getAudioTracks()[0] ?? null;
        if (!track) {
          tempStream.getTracks().forEach((t) => t.stop());
          return null;
        }
        // Preserve the current on/off state (a switched camera that was off
        // must stay off — locally AND for the remote side).
        track.enabled = kind === "video" ? cameraOnRef.current : micOnRef.current;
        return track;
      } catch (err) {
        setState((s) => ({ ...s, error: mapGetUserMediaError(err, kind) }));
        return null;
      }
    },
    []
  );

  /** Swaps the new track into the local stream and stops the old one. */
  const commitReplacementTrack = useCallback(
    (kind: "video" | "audio", newTrack: MediaStreamTrack) => {
      const stream = streamRef.current;
      if (!stream) return;
      const oldTrack = kind === "video" ? stream.getVideoTracks()[0] : stream.getAudioTracks()[0];
      if (oldTrack) {
        stream.removeTrack(oldTrack);
        oldTrack.stop();
      }
      stream.addTrack(newTrack);
      const deviceId = newTrack.getSettings().deviceId ?? "";
      setState((s) => ({
        ...s,
        stream,
        ...(kind === "video"
          ? { selectedVideoInput: deviceId || s.selectedVideoInput }
          : { selectedAudioInput: deviceId || s.selectedAudioInput }),
      }));
    },
    []
  );

  /**
   * Full device switch: replaceTrack on the peer FIRST, stop old track AFTER.
   * If any step fails, the old track keeps flowing and the peer is untouched.
   */
  const switchDevice = useCallback(
    async (
      kind: "video" | "audio",
      deviceId: string,
      replaceTrackFn: (track: MediaStreamTrack | null) => Promise<void>
    ): Promise<boolean> => {
      const newTrack = await getReplacementTrack(kind, deviceId);
      if (!newTrack) return false;
      try {
        await replaceTrackFn(newTrack);
      } catch {
        newTrack.stop();
        return false;
      }
      commitReplacementTrack(kind, newTrack);
      return true;
    },
    [getReplacementTrack, commitReplacementTrack]
  );

  const setAudioOutput = useCallback((deviceId: string) => {
    setState((s) => ({ ...s, selectedAudioOutput: deviceId }));
  }, []);

  const toggleCamera = useCallback(() => {
    setState((prev) => {
      if (!prev.stream) return prev;
      const next = !prev.cameraOn;
      prev.stream.getVideoTracks().forEach((t) => { t.enabled = next; });
      cameraOnRef.current = next;
      return { ...prev, cameraOn: next };
    });
  }, []);

  const toggleMic = useCallback(() => {
    setState((prev) => {
      if (!prev.stream) return prev;
      const next = !prev.micOn;
      prev.stream.getAudioTracks().forEach((t) => { t.enabled = next; });
      micOnRef.current = next;
      return { ...prev, micOn: next };
    });
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState((prev) => ({ ...prev, stream: null }));
  }, []);

  // Refresh device lists when hardware is (un)plugged.
  useEffect(() => {
    if (!supportsUserMedia()) return;
    const md = navigator.mediaDevices;
    const handler = () => void enumerateDevices();
    md.addEventListener?.("devicechange", handler);
    return () => md.removeEventListener?.("devicechange", handler);
  }, [enumerateDevices]);

  // Stop everything on unmount — never leave camera/mic active after leaving.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  return {
    ...state,
    start,
    stop,
    toggleCamera,
    toggleMic,
    enumerateDevices,
    getReplacementTrack,
    commitReplacementTrack,
    switchDevice,
    setAudioOutput,
  };
}
