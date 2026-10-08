/**
 * Module-level (non-React) track runtime shared between Track (lap logic, owned
 * by the city pipeline) and the gameplay layer (spawn / respawn).
 *
 * Track.tsx should overwrite `trackRuntime.track` (e.g. after loading
 * /city/track.json) BEFORE the race starts, and update `lastCheckpoint`
 * whenever the player passes a gate so the R key respawns there.
 */
import * as THREE from 'three';
import type { TrackDef } from './vehicleState';
import { vehicleState } from './vehicleState';
import { FALLBACK_TRACK } from './Track';

export interface SpawnTransform {
  position: THREE.Vector3 | [number, number, number] | { x: number; y: number; z: number };
  /** Rotation about +Y (radians). yaw 0 faces -Z. */
  yaw: number;
}

export const trackRuntime: {
  track: TrackDef;
  lastCheckpoint?: SpawnTransform;
  /**
   * When true, the loading screen waits for `useGame.loadProgress >= 1`
   * (set by the city streamer) before starting the countdown.
   */
  requireCityLoad: boolean;
} = {
  track: FALLBACK_TRACK,
  lastCheckpoint: undefined,
  requireCityLoad: false,
};

export function setTrack(track: TrackDef) {
  trackRuntime.track = track;
}

function toVec3(p: SpawnTransform['position']): THREE.Vector3 {
  if (p instanceof THREE.Vector3) return p.clone();
  if (Array.isArray(p)) return new THREE.Vector3(p[0], p[1], p[2]);
  return new THREE.Vector3(p.x, p.y, p.z);
}

/** Spawn transform at the track start. */
export function getStartTransform(): { position: THREE.Vector3; yaw: number } {
  const s = trackRuntime.track.start;
  return { position: new THREE.Vector3(s.x, s.y, s.z), yaw: s.yaw };
}

/** Request a respawn at the start line. */
export function respawnAtStart() {
  vehicleState.respawn = getStartTransform();
}

/** Request a respawn at the last checkpoint (fallback: start). */
export function respawnAtCheckpoint() {
  const cp = trackRuntime.lastCheckpoint;
  if (cp) {
    const position = toVec3(cp.position);
    position.y = Math.max(position.y, trackRuntime.track.start.y);
    vehicleState.respawn = { position, yaw: cp.yaw };
  } else {
    respawnAtStart();
  }
}
