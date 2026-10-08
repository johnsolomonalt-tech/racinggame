import { create } from 'zustand';

export type Phase = 'menu' | 'loading' | 'countdown' | 'racing' | 'finished';

export interface GameStore {
  phase: Phase;
  /** Index into the car manifest (or -1 = procedural fallback car). */
  carIndex: number;
  /** 0-based current lap. */
  lap: number;
  totalLaps: number;
  /** performance.now() timestamp when current lap started (ms). */
  lapStartedAt: number;
  /** performance.now() timestamp when race started (ms). */
  raceStartedAt: number;
  lapTimes: number[];
  bestLap: number | null;
  /** Next checkpoint index the player must pass. */
  nextCheckpoint: number;
  checkpointCount: number;
  /** Banked drift score + current running combo. */
  driftScore: number;
  driftCombo: number;
  /** City streaming progress 0..1 (for loading screen). */
  loadProgress: number;
  setPhase: (p: Phase) => void;
  set: (partial: Partial<GameStore>) => void;
}

export const useGame = create<GameStore>((set) => ({
  phase: 'menu',
  carIndex: -1,
  lap: 0,
  totalLaps: 3,
  lapStartedAt: 0,
  raceStartedAt: 0,
  lapTimes: [],
  bestLap: null,
  nextCheckpoint: 1,
  checkpointCount: 0,
  driftScore: 0,
  driftCombo: 0,
  loadProgress: 0,
  setPhase: (phase) => set({ phase }),
  set: (partial) => set(partial),
}));
