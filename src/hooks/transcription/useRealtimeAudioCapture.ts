"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { LiveTranscriptionProvider } from "@/services/transcription/providers/transcription-provider.interface";

const AUDIO_WORKLET_PROCESSOR_NAME = "nutriopus-realtime-pcm16";
const DEFAULT_SAMPLE_RATE = 16_000;
const DEFAULT_CHUNK_MS = 250;
const DEFAULT_VOICE_ACTIVITY_THRESHOLD = 0.04;

const AUDIO_WORKLET_SOURCE = `
class NutriOpusRealtimePcm16Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const processorOptions = options.processorOptions || {};
    this.targetSampleRate = Math.max(8000, processorOptions.targetSampleRate || 16000);
    this.chunkMs = Math.max(20, processorOptions.chunkMs || 250);
    this.targetChunkSamples = Math.max(
      1,
      Math.round(this.targetSampleRate * this.chunkMs / 1000)
    );
    this.sourceChunkSamples = Math.max(
      1,
      Math.round(sampleRate * this.chunkMs / 1000)
    );
    this.pending = [];
    this.enabled = true;
    this.volumeFrame = 0;
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === "pause") {
        this.enabled = false;
        this.pending.length = 0;
      } else if (event.data && event.data.type === "resume") {
        this.enabled = true;
      } else if (event.data && event.data.type === "clear") {
        this.pending.length = 0;
      }
    };
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels || channels.length === 0 || channels[0].length === 0) {
      return true;
    }

    const frameLength = channels[0].length;
    let sumSquares = 0;
    for (let index = 0; index < frameLength; index += 1) {
      let sample = 0;
      for (let channel = 0; channel < channels.length; channel += 1) {
        sample += channels[channel][index] || 0;
      }
      sample /= channels.length;
      sumSquares += sample * sample;
      if (this.enabled) {
        this.pending.push(sample);
      }
    }

    this.volumeFrame += 1;
    if (this.volumeFrame >= 8) {
      this.volumeFrame = 0;
      const rms = Math.sqrt(sumSquares / frameLength);
      this.port.postMessage({
        type: "volume",
        volume: Math.min(1, rms * 4),
      });
    }

    while (this.enabled && this.pending.length >= this.sourceChunkSamples) {
      const source = this.pending.splice(0, this.sourceChunkSamples);
      const pcm16 = new Int16Array(this.targetChunkSamples);
      const scale = this.sourceChunkSamples > 1 && this.targetChunkSamples > 1
        ? (this.sourceChunkSamples - 1) / (this.targetChunkSamples - 1)
        : 0;

      for (let index = 0; index < this.targetChunkSamples; index += 1) {
        const position = index * scale;
        const lower = Math.floor(position);
        const upper = Math.min(source.length - 1, lower + 1);
        const fraction = position - lower;
        const value = source[lower] + (source[upper] - source[lower]) * fraction;
        const clamped = Math.max(-1, Math.min(1, value));
        pcm16[index] = clamped < 0
          ? Math.round(clamped * 32768)
          : Math.round(clamped * 32767);
      }

      this.port.postMessage(
        { type: "audio", pcm16 },
        [pcm16.buffer]
      );
    }

    return true;
  }
}

registerProcessor("${AUDIO_WORKLET_PROCESSOR_NAME}", NutriOpusRealtimePcm16Processor);
`;

export type RealtimeAudioCaptureStatus =
  | "idle"
  | "requesting_permission"
  | "ready"
  | "capturing"
  | "paused"
  | "stopping"
  | "stopped"
  | "permission_denied"
  | "device_not_found"
  | "unsupported"
  | "error";

export type RealtimeAudioCaptureMode =
  | "audio_worklet"
  | "media_recorder";

export interface UseRealtimeAudioCaptureOptions {
  provider: Pick<LiveTranscriptionProvider, "sendAudioChunk">;
  existingStream?: MediaStream | null;
  deviceId?: string;
  sampleRate?: number;
  chunkMs?: number;
  autoStart?: boolean;
  preferAudioWorklet?: boolean;
  voiceActivityThreshold?: number;
  audioConstraints?: MediaTrackConstraints;
  stopExistingStreamTracksOnCleanup?: boolean;
  onError?: (error: Error) => void;
}

export interface UseRealtimeAudioCaptureResult {
  status: RealtimeAudioCaptureStatus;
  mode: RealtimeAudioCaptureMode | null;
  error: Error | null;
  volume: number;
  isVoiceActive: boolean;
  stream: MediaStream | null;
  devices: MediaDeviceInfo[];
  activeDeviceId: string | null;
  prepare: () => Promise<MediaStream>;
  start: () => Promise<boolean>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  switchDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<MediaDeviceInfo[]>;
}

interface CaptureResources {
  audioContext: AudioContext | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  workletNode: AudioWorkletNode | null;
  analyserNode: AnalyserNode | null;
  silentGainNode: GainNode | null;
  mediaRecorder: MediaRecorder | null;
  animationFrameId: number | null;
}

interface NamedError {
  name?: unknown;
  message?: unknown;
}

const MEDIA_RECORDER_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/webm",
  "audio/mp4",
] as const;

function emptyResources(): CaptureResources {
  return {
    audioContext: null,
    sourceNode: null,
    workletNode: null,
    analyserNode: null,
    silentGainNode: null,
    mediaRecorder: null,
    animationFrameId: null,
  };
}

function asError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  return new Error("Unknown realtime audio capture error.");
}

export function classifyRealtimeAudioCaptureError(
  error: unknown,
): RealtimeAudioCaptureStatus {
  const name =
    typeof error === "object" && error !== null
      ? (error as NamedError).name
      : undefined;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "permission_denied";
  }
  if (
    name === "NotFoundError" ||
    name === "DevicesNotFoundError" ||
    name === "OverconstrainedError"
  ) {
    return "device_not_found";
  }
  if (name === "NotSupportedError") {
    return "unsupported";
  }
  return "error";
}

export function selectMediaRecorderMimeType(
  isTypeSupported: (mimeType: string) => boolean,
): string | undefined {
  return MEDIA_RECORDER_MIME_TYPES.find((mimeType) =>
    isTypeSupported(mimeType),
  );
}

export function buildRealtimeAudioConstraints(
  deviceId: string | undefined,
  sampleRate: number,
  overrides: MediaTrackConstraints = {},
): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: { ideal: sampleRate },
    ...overrides,
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  };
}

function hasLiveAudioTrack(stream: MediaStream | null): boolean {
  return Boolean(
    stream?.getAudioTracks().some((track) => track.readyState === "live"),
  );
}

export function useRealtimeAudioCapture(
  options: UseRealtimeAudioCaptureOptions,
): UseRealtimeAudioCaptureResult {
  const {
    provider,
    existingStream = null,
    deviceId,
    sampleRate = DEFAULT_SAMPLE_RATE,
    chunkMs = DEFAULT_CHUNK_MS,
    autoStart = false,
    preferAudioWorklet = true,
    voiceActivityThreshold = DEFAULT_VOICE_ACTIVITY_THRESHOLD,
    audioConstraints,
    stopExistingStreamTracksOnCleanup = false,
    onError,
  } = options;

  const [status, setStatus] = useState<RealtimeAudioCaptureStatus>("idle");
  const [mode, setMode] = useState<RealtimeAudioCaptureMode | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [volume, setVolume] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(
    deviceId ?? null,
  );

  const mountedRef = useRef(true);
  const statusRef = useRef<RealtimeAudioCaptureStatus>("idle");
  const streamRef = useRef<MediaStream | null>(null);
  const ownsStreamRef = useRef(false);
  const resourcesRef = useRef<CaptureResources>(emptyResources());
  const providerRef = useRef(provider);
  const existingStreamRef = useRef(existingStream);
  const onErrorRef = useRef(onError);
  const operationRef = useRef(0);
  const startingRef = useRef(false);
  const intentionalTrackStopRef = useRef(false);
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
  const trackEndedHandlersRef = useRef(
    new Map<MediaStreamTrack, EventListener>(),
  );

  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

  useEffect(() => {
    existingStreamRef.current = existingStream;
  }, [existingStream]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const updateStatus = useCallback((next: RealtimeAudioCaptureStatus) => {
    statusRef.current = next;
    if (mountedRef.current) {
      setStatus(next);
    }
  }, []);

  const updateVolume = useCallback((next: number) => {
    if (mountedRef.current) {
      setVolume(Math.min(1, Math.max(0, next)));
    }
  }, []);

  const reportError = useCallback(
    (cause: unknown, terminalStatus?: RealtimeAudioCaptureStatus) => {
      const nextError = asError(cause);
      if (mountedRef.current) {
        setError(nextError);
      }
      onErrorRef.current?.(nextError);
      if (terminalStatus) {
        updateStatus(terminalStatus);
      }
    },
    [updateStatus],
  );

  const enqueueAudioChunk = useCallback(
    (chunk: ArrayBuffer | Blob) => {
      const pending = sendQueueRef.current.then(() =>
        providerRef.current.sendAudioChunk(chunk),
      );
      sendQueueRef.current = pending.catch((cause) => {
        reportError(cause);
      });
    },
    [reportError],
  );

  const detachTrackEndedHandlers = useCallback(() => {
    for (const [track, handler] of trackEndedHandlersRef.current) {
      track.removeEventListener("ended", handler);
    }
    trackEndedHandlersRef.current.clear();
  }, []);

  const attachTrackEndedHandlers = useCallback(
    (nextStream: MediaStream) => {
      detachTrackEndedHandlers();
      for (const track of nextStream.getAudioTracks()) {
        const handler: EventListener = () => {
          if (intentionalTrackStopRef.current) {
            return;
          }
          reportError(
            new Error("The active microphone is no longer available."),
            "device_not_found",
          );
        };
        track.addEventListener("ended", handler, { once: true });
        trackEndedHandlersRef.current.set(track, handler);
      }
    },
    [detachTrackEndedHandlers, reportError],
  );

  const publishStream = useCallback(
    (nextStream: MediaStream, owned: boolean) => {
      streamRef.current = nextStream;
      ownsStreamRef.current = owned;
      attachTrackEndedHandlers(nextStream);
      const nextDeviceId =
        nextStream.getAudioTracks()[0]?.getSettings().deviceId ?? null;
      if (mountedRef.current) {
        setStream(nextStream);
        setActiveDeviceId(nextDeviceId);
      }
    },
    [attachTrackEndedHandlers],
  );

  const refreshDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return [];
    }
    try {
      const available = (await navigator.mediaDevices.enumerateDevices()).filter(
        (candidate) => candidate.kind === "audioinput",
      );
      if (mountedRef.current) {
        setDevices(available);
      }
      return available;
    } catch (cause) {
      reportError(cause);
      return [];
    }
  }, [reportError]);

  const acquireStream = useCallback(
    async (
      requestedDeviceId?: string,
      forceNew = false,
    ): Promise<MediaStream> => {
      const currentStream = streamRef.current;
      if (!forceNew && hasLiveAudioTrack(currentStream)) {
        return currentStream as MediaStream;
      }
      const suppliedStream = existingStreamRef.current;
      if (!forceNew && hasLiveAudioTrack(suppliedStream)) {
        publishStream(suppliedStream as MediaStream, false);
        updateStatus("ready");
        return suppliedStream as MediaStream;
      }
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        const unsupported = new Error(
          "Microphone capture is unavailable in this browser.",
        );
        reportError(unsupported, "unsupported");
        throw unsupported;
      }

      updateStatus("requesting_permission");
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          audio: buildRealtimeAudioConstraints(
            requestedDeviceId ?? deviceId,
            sampleRate,
            audioConstraints,
          ),
          video: false,
        });
        if (!hasLiveAudioTrack(nextStream)) {
          nextStream.getTracks().forEach((track) => track.stop());
          throw Object.assign(
            new Error("No active microphone track was returned."),
            { name: "NotFoundError" },
          );
        }
        publishStream(nextStream, true);
        updateStatus("ready");
        void refreshDevices();
        return nextStream;
      } catch (cause) {
        const nextStatus = classifyRealtimeAudioCaptureError(cause);
        reportError(cause, nextStatus);
        throw asError(cause);
      }
    },
    [
      audioConstraints,
      deviceId,
      publishStream,
      refreshDevices,
      reportError,
      sampleRate,
      updateStatus,
    ],
  );

  const stopMediaRecorder = useCallback(
    async (
      mediaRecorder: MediaRecorder,
      preserveFinalChunk: boolean,
    ): Promise<void> => {
      if (!preserveFinalChunk) {
        mediaRecorder.ondataavailable = null;
      }
      mediaRecorder.onerror = null;
      if (mediaRecorder.state === "inactive") {
        mediaRecorder.ondataavailable = null;
        return;
      }
      await new Promise<void>((resolve) => {
        let settled = false;
        const fallbackTimer = setTimeout(() => finish(), 1_000);
        const finish = () => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(fallbackTimer);
          mediaRecorder.removeEventListener("stop", finish);
          resolve();
        };
        mediaRecorder.addEventListener("stop", finish, { once: true });
        mediaRecorder.stop();
      });
      mediaRecorder.ondataavailable = null;
    },
    [],
  );

  const teardownPipeline = useCallback(
    async (flushPendingAudio: boolean): Promise<void> => {
      const resources = resourcesRef.current;
      resourcesRef.current = emptyResources();

      if (
        resources.animationFrameId !== null &&
        typeof cancelAnimationFrame === "function"
      ) {
        cancelAnimationFrame(resources.animationFrameId);
      }
      if (resources.workletNode) {
        resources.workletNode.port.onmessage = null;
        resources.workletNode.port.postMessage({ type: "clear" });
      }
      resources.sourceNode?.disconnect();
      resources.workletNode?.disconnect();
      resources.analyserNode?.disconnect();
      resources.silentGainNode?.disconnect();
      if (resources.mediaRecorder) {
        await stopMediaRecorder(resources.mediaRecorder, flushPendingAudio);
      }
      if (resources.audioContext && resources.audioContext.state !== "closed") {
        await resources.audioContext.close().catch(() => undefined);
      }
      if (flushPendingAudio) {
        await sendQueueRef.current;
      }
      updateVolume(0);
      if (mountedRef.current) {
        setMode(null);
      }
    },
    [stopMediaRecorder, updateVolume],
  );

  const releaseCurrentStream = useCallback(
    (includeExternalStream: boolean) => {
      const current = streamRef.current;
      const shouldStopTracks =
        ownsStreamRef.current ||
        (includeExternalStream && stopExistingStreamTracksOnCleanup);
      detachTrackEndedHandlers();
      if (current && shouldStopTracks) {
        intentionalTrackStopRef.current = true;
        current.getTracks().forEach((track) => track.stop());
        intentionalTrackStopRef.current = false;
      }
      streamRef.current = null;
      ownsStreamRef.current = false;
      if (mountedRef.current) {
        setStream(null);
      }
    },
    [detachTrackEndedHandlers, stopExistingStreamTracksOnCleanup],
  );

  const prepare = useCallback(async (): Promise<MediaStream> => {
    const operation = ++operationRef.current;
    const preparedStream = await acquireStream(deviceId);
    if (operation !== operationRef.current) {
      if (
        streamRef.current === preparedStream &&
        (!mountedRef.current ||
          statusRef.current === "stopping" ||
          statusRef.current === "stopped")
      ) {
        releaseCurrentStream(false);
      }
      throw Object.assign(
        new Error("Microphone preparation was cancelled."),
        { name: "AbortError" },
      );
    }
    return preparedStream;
  }, [acquireStream, deviceId, releaseCurrentStream]);

  const startVolumeMeter = useCallback(
    (
      analyser: AnalyserNode,
      resources: CaptureResources,
    ) => {
      const samples = new Float32Array(analyser.fftSize);
      const measure = () => {
        if (
          resourcesRef.current !== resources ||
          typeof requestAnimationFrame !== "function"
        ) {
          return;
        }
        if (statusRef.current === "capturing") {
          analyser.getFloatTimeDomainData(samples);
          let sumSquares = 0;
          for (const sample of samples) {
            sumSquares += sample * sample;
          }
          updateVolume(
            Math.min(1, Math.sqrt(sumSquares / samples.length) * 4),
          );
        }
        resources.animationFrameId = requestAnimationFrame(measure);
      };
      resources.animationFrameId = requestAnimationFrame(measure);
    },
    [updateVolume],
  );

  const startAudioWorklet = useCallback(
    async (activeStream: MediaStream): Promise<void> => {
      if (
        typeof window === "undefined" ||
        typeof window.AudioContext === "undefined" ||
        typeof AudioWorkletNode === "undefined" ||
        typeof URL.createObjectURL !== "function"
      ) {
        throw Object.assign(new Error("AudioWorklet is unavailable."), {
          name: "NotSupportedError",
        });
      }

      const audioContext = new AudioContext({
        latencyHint: "interactive",
        sampleRate,
      });
      let moduleUrl: string | null = null;
      try {
        moduleUrl = URL.createObjectURL(
          new Blob([AUDIO_WORKLET_SOURCE], { type: "text/javascript" }),
        );
        await audioContext.audioWorklet.addModule(moduleUrl);
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const sourceNode = audioContext.createMediaStreamSource(activeStream);
        const workletNode = new AudioWorkletNode(
          audioContext,
          AUDIO_WORKLET_PROCESSOR_NAME,
          {
            channelCount: 1,
            channelCountMode: "explicit",
            processorOptions: {
              targetSampleRate: sampleRate,
              chunkMs,
            },
          },
        );
        const silentGainNode = audioContext.createGain();
        silentGainNode.gain.value = 0;
        sourceNode.connect(workletNode);
        workletNode.connect(silentGainNode);
        silentGainNode.connect(audioContext.destination);

        const resources: CaptureResources = {
          ...emptyResources(),
          audioContext,
          sourceNode,
          workletNode,
          silentGainNode,
        };
        workletNode.port.onmessage = (
          event: MessageEvent<
            | { type: "volume"; volume: number }
            | { type: "audio"; pcm16: Int16Array }
          >,
        ) => {
          if (event.data.type === "volume") {
            updateVolume(event.data.volume);
            return;
          }
          if (
            event.data.type === "audio" &&
            statusRef.current === "capturing"
          ) {
            const pcmCopy = new Int16Array(event.data.pcm16).buffer;
            enqueueAudioChunk(pcmCopy);
          }
        };
        workletNode.onprocessorerror = () => {
          reportError(new Error("AudioWorklet processor stopped unexpectedly."));
        };
        resourcesRef.current = resources;
        if (mountedRef.current) {
          setMode("audio_worklet");
        }
      } catch (cause) {
        await audioContext.close().catch(() => undefined);
        throw cause;
      } finally {
        if (moduleUrl) {
          URL.revokeObjectURL(moduleUrl);
        }
      }
    },
    [
      chunkMs,
      enqueueAudioChunk,
      reportError,
      sampleRate,
      updateVolume,
    ],
  );

  const startMediaRecorder = useCallback(
    async (activeStream: MediaStream): Promise<void> => {
      if (typeof MediaRecorder === "undefined") {
        throw Object.assign(new Error("MediaRecorder is unavailable."), {
          name: "NotSupportedError",
        });
      }
      const mimeType = selectMediaRecorderMimeType((candidate) =>
        MediaRecorder.isTypeSupported(candidate),
      );
      const mediaRecorder = new MediaRecorder(
        new MediaStream(activeStream.getAudioTracks()),
        mimeType ? { mimeType } : undefined,
      );
      const resources = emptyResources();
      resources.mediaRecorder = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (
          event.data.size > 0 &&
          (statusRef.current === "capturing" ||
            statusRef.current === "stopping")
        ) {
          enqueueAudioChunk(event.data);
        }
      };
      mediaRecorder.onerror = (event) => {
        const recorderError =
          "error" in event && event.error instanceof Error
            ? event.error
            : new Error("MediaRecorder capture failed.");
        reportError(recorderError, "error");
      };

      if (typeof AudioContext !== "undefined") {
        let meterContext: AudioContext | null = null;
        try {
          meterContext = new AudioContext({ latencyHint: "interactive" });
          const sourceNode = meterContext.createMediaStreamSource(activeStream);
          const analyserNode = meterContext.createAnalyser();
          const silentGainNode = meterContext.createGain();
          analyserNode.fftSize = 256;
          analyserNode.smoothingTimeConstant = 0.75;
          silentGainNode.gain.value = 0;
          sourceNode.connect(analyserNode);
          analyserNode.connect(silentGainNode);
          silentGainNode.connect(meterContext.destination);
          if (meterContext.state === "suspended") {
            await meterContext.resume();
          }
          resources.audioContext = meterContext;
          resources.sourceNode = sourceNode;
          resources.analyserNode = analyserNode;
          resources.silentGainNode = silentGainNode;
        } catch {
          await meterContext?.close().catch(() => undefined);
          // MediaRecorder remains usable even when the optional volume meter fails.
        }
      }

      resourcesRef.current = resources;
      if (resources.analyserNode && typeof requestAnimationFrame === "function") {
        startVolumeMeter(resources.analyserNode, resources);
      }
      mediaRecorder.start(chunkMs);
      if (mountedRef.current) {
        setMode("media_recorder");
      }
    },
    [
      chunkMs,
      enqueueAudioChunk,
      reportError,
      startVolumeMeter,
    ],
  );

  const startPipeline = useCallback(
    async (activeStream: MediaStream): Promise<void> => {
      if (preferAudioWorklet) {
        try {
          await startAudioWorklet(activeStream);
          return;
        } catch {
          await teardownPipeline(false);
        }
      }
      await startMediaRecorder(activeStream);
    },
    [
      preferAudioWorklet,
      startAudioWorklet,
      startMediaRecorder,
      teardownPipeline,
    ],
  );

  const start = useCallback(async (): Promise<boolean> => {
    if (
      startingRef.current ||
      statusRef.current === "capturing" ||
      statusRef.current === "paused" ||
      statusRef.current === "requesting_permission" ||
      statusRef.current === "stopping"
    ) {
      return statusRef.current === "capturing";
    }
    startingRef.current = true;
    const operation = ++operationRef.current;
    if (mountedRef.current) {
      setError(null);
    }
    try {
      const activeStream = await acquireStream(deviceId);
      if (operation !== operationRef.current) {
        if (streamRef.current === activeStream) {
          releaseCurrentStream(false);
        }
        return false;
      }
      await teardownPipeline(false);
      await startPipeline(activeStream);
      if (operation !== operationRef.current) {
        await teardownPipeline(false);
        return false;
      }
      updateStatus("capturing");
      return true;
    } catch (cause) {
      if (operation !== operationRef.current) {
        return false;
      }
      const nextStatus = classifyRealtimeAudioCaptureError(cause);
      reportError(cause, nextStatus);
      return false;
    } finally {
      startingRef.current = false;
    }
  }, [
    acquireStream,
    deviceId,
    releaseCurrentStream,
    reportError,
    startPipeline,
    teardownPipeline,
    updateStatus,
  ]);

  const pause = useCallback(() => {
    if (statusRef.current !== "capturing") {
      return;
    }
    const resources = resourcesRef.current;
    if (resources.workletNode) {
      resources.workletNode.port.postMessage({ type: "pause" });
    }
    if (resources.mediaRecorder?.state === "recording") {
      resources.mediaRecorder.pause();
    }
    updateVolume(0);
    updateStatus("paused");
  }, [updateStatus, updateVolume]);

  const resume = useCallback(async (): Promise<void> => {
    if (statusRef.current !== "paused") {
      return;
    }
    const resources = resourcesRef.current;
    if (resources.audioContext?.state === "suspended") {
      await resources.audioContext.resume();
    }
    if (resources.workletNode) {
      resources.workletNode.port.postMessage({ type: "resume" });
    }
    if (resources.mediaRecorder?.state === "paused") {
      resources.mediaRecorder.resume();
    }
    updateStatus("capturing");
  }, [updateStatus]);

  const stop = useCallback(async (): Promise<void> => {
    if (
      statusRef.current === "stopped" ||
      statusRef.current === "idle"
    ) {
      releaseCurrentStream(true);
      updateStatus("stopped");
      return;
    }
    operationRef.current += 1;
    updateStatus("stopping");
    await teardownPipeline(true);
    releaseCurrentStream(true);
    updateStatus("stopped");
  }, [releaseCurrentStream, teardownPipeline, updateStatus]);

  const switchDevice = useCallback(
    async (nextDeviceId: string): Promise<void> => {
      if (!nextDeviceId.trim()) {
        throw new Error("A microphone deviceId is required.");
      }
      const previousStatus = statusRef.current;
      const shouldRestart =
        previousStatus === "capturing" || previousStatus === "paused";
      const operation = ++operationRef.current;
      updateStatus("requesting_permission");
      await teardownPipeline(true);
      releaseCurrentStream(false);

      try {
        const nextStream = await acquireStream(nextDeviceId, true);
        if (operation !== operationRef.current) {
          if (streamRef.current === nextStream) {
            releaseCurrentStream(false);
          }
          return;
        }
        if (shouldRestart) {
          await startPipeline(nextStream);
          updateStatus("capturing");
          if (previousStatus === "paused") {
            const resources = resourcesRef.current;
            resources.workletNode?.port.postMessage({ type: "pause" });
            if (resources.mediaRecorder?.state === "recording") {
              resources.mediaRecorder.pause();
            }
            updateStatus("paused");
          }
        } else {
          updateStatus("ready");
        }
      } catch (cause) {
        if (operation !== operationRef.current) {
          return;
        }
        const nextStatus = classifyRealtimeAudioCaptureError(cause);
        reportError(cause, nextStatus);
        throw asError(cause);
      }
    },
    [
      acquireStream,
      releaseCurrentStream,
      reportError,
      startPipeline,
      teardownPipeline,
      updateStatus,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      void teardownPipeline(false);
      releaseCurrentStream(true);
    };
  }, [releaseCurrentStream, teardownPipeline]);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.addEventListener
    ) {
      return;
    }
    const handleDeviceChange = () => {
      void refreshDevices();
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      );
    };
  }, [refreshDevices]);

  useEffect(() => {
    if (autoStart) {
      void start();
    }
  }, [autoStart, start]);

  return {
    status,
    mode,
    error,
    volume,
    isVoiceActive:
      status === "capturing" && volume >= voiceActivityThreshold,
    stream,
    devices,
    activeDeviceId,
    prepare,
    start,
    pause,
    resume,
    stop,
    switchDevice,
    refreshDevices,
  };
}
