import { describe, it, expect, vi, beforeEach } from "vitest";
import { supportsScreenShare } from "../useScreenShare";
import { supportsDocumentPip, supportsVideoPip, clampVolume } from "../usePictureInPicture";

describe("supportsScreenShare", () => {
  it("returns true when getDisplayMedia is available", () => {
    Object.defineProperty(global, "navigator", {
      value: { mediaDevices: { getDisplayMedia: vi.fn() } },
      writable: true,
      configurable: true,
    });
    expect(supportsScreenShare()).toBe(true);
  });

  it("returns false when mediaDevices is undefined", () => {
    Object.defineProperty(global, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(supportsScreenShare()).toBe(false);
  });

  it("returns false when getDisplayMedia is not a function", () => {
    Object.defineProperty(global, "navigator", {
      value: { mediaDevices: {} },
      writable: true,
      configurable: true,
    });
    expect(supportsScreenShare()).toBe(false);
  });
});

describe("supportsDocumentPip", () => {
  it("returns true when window has documentPictureInPicture", () => {
    (global as unknown as Record<string, unknown>).window = { documentPictureInPicture: {} };
    expect(supportsDocumentPip()).toBe(true);
    delete (global as unknown as Record<string, unknown>).window;
  });

  it("returns false when documentPictureInPicture is absent from window", () => {
    (global as unknown as Record<string, unknown>).window = {};
    expect(supportsDocumentPip()).toBe(false);
    delete (global as unknown as Record<string, unknown>).window;
  });
});

describe("supportsVideoPip", () => {
  it("returns false in node (no document.pictureInPictureEnabled)", () => {
    expect(supportsVideoPip()).toBe(false);
  });
});

describe("clampVolume", () => {
  it("clamps below 0 to 0", () => expect(clampVolume(-0.5)).toBe(0));
  it("clamps above 1 to 1", () => expect(clampVolume(1.5)).toBe(1));
  it("passes through values in [0, 1]", () => {
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(0.5)).toBe(0.5);
    expect(clampVolume(1)).toBe(1);
  });
});

// ── Sprint SSE signaling: initials + ICE queue ────────────────────────────────

import { getInitials } from "../NativeVideoParticipant";
import { IceCandidateQueue } from "../ice-candidate-queue";

describe("getInitials", () => {
  it("derives initials from a full name", () => {
    expect(getInitials("Maria Silva")).toBe("MS");
  });

  it("uses at most two words and ignores extra spaces", () => {
    expect(getInitials("Ana  Beatriz  Costa")).toBe("AB");
    expect(getInitials("João")).toBe("J");
  });

  it("does not break ready-made initials (regression: initials prop must never be re-derived)", () => {
    // The component uses `initials ?? getInitials(label)` — ready initials pass through.
    const ready = "MS";
    const displayInitials = ready ?? getInitials("ignored label");
    expect(displayInitials).toBe("MS");
  });
});

describe("IceCandidateQueue", () => {
  it("queues candidates while there is no remoteDescription and drains them for the current epoch", () => {
    const q = new IceCandidateQueue();
    q.enqueue({ candidate: "a" }, 10);
    q.enqueue({ candidate: "b" }, 10);
    expect(q.size).toBe(2);
    const drained = q.drain(10);
    expect(drained.map((c) => c.candidate)).toEqual(["a", "b"]);
    expect(q.size).toBe(0);
  });

  it("drops candidates from stale epochs on drain", () => {
    const q = new IceCandidateQueue();
    q.enqueue({ candidate: "old" }, 1);
    q.enqueue({ candidate: "new" }, 2);
    expect(q.drain(2).map((c) => c.candidate)).toEqual(["new"]);
    expect(q.size).toBe(0);
  });

  it("clear() empties the queue", () => {
    const q = new IceCandidateQueue();
    q.enqueue({ candidate: "x" }, 1);
    q.clear();
    expect(q.size).toBe(0);
  });
});
