// Pure ICE candidate queue — extracted from useNativeWebRTC so the
// "candidates arriving before the remote description" logic is unit-testable.

export type QueuedIceCandidate = {
  candidate: RTCIceCandidateInit;
  epoch: number;
};

export class IceCandidateQueue {
  private pending: QueuedIceCandidate[] = [];

  get size(): number {
    return this.pending.length;
  }

  enqueue(candidate: RTCIceCandidateInit, epoch: number): void {
    this.pending.push({ candidate, epoch });
  }

  /**
   * Removes and returns the candidates belonging to `currentEpoch`.
   * Candidates from other (stale) epochs are dropped.
   */
  drain(currentEpoch: number): RTCIceCandidateInit[] {
    const ready = this.pending
      .filter((p) => p.epoch === currentEpoch)
      .map((p) => p.candidate);
    this.pending = [];
    return ready;
  }

  clear(): void {
    this.pending = [];
  }
}
