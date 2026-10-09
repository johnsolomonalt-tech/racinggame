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

export const FALLBACK_TRACK: TrackDef = {
  checkpoints: [
    [-512.92, 417.58],
    [-441.62, 460.88],
    [-310.5, 540.5],
    [-179.38, 620.12],
    [-48.25, 699.75],
    [34.82, 545.25],
    [117.89, 390.75],
    [200.95, 236.25],
    [284.02, 81.75],
    [139.11, 4.41],
    [-5.8, -72.93],
    [-89.15, 83.17],
    [-172.5, 239.27],
  ],
  gateRadius: 18,
  start: {
    x: -534.56,
    y: 1.2,
    z: 404.4,
    yaw: 0.54,
  },
};

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

/** Open-world iconic NYC spawn locations. */
export const OPEN_WORLD_SPAWNS = [
  { id: 'times-square', name: 'Times Square (Broadway & 45th)', pos: [-50, 1.2, 120], yaw: 0 },
  { id: '8th-ave', name: '8th Avenue Strip', pos: [-534, 1.2, 404], yaw: -2.1 },
  { id: 'central-park', name: 'Central Park South (59th St)', pos: [100, 1.2, -450], yaw: 1.57 },
  { id: 'broadway-42', name: 'Broadway & 42nd St Intersection', pos: [-120, 1.2, 280], yaw: -0.5 },
];

export function teleportTo(spawnIndex: number) {
  const s = OPEN_WORLD_SPAWNS[spawnIndex] || OPEN_WORLD_SPAWNS[0];
  vehicleState.respawn = {
    position: new THREE.Vector3(s.pos[0], s.pos[1], s.pos[2]),
    yaw: s.yaw,
  };
}

/** Immediate unflip right on the road where the car currently is. */
export function unflipOrResetCar() {
  const p = vehicleState.position;
  const q = vehicleState.quaternion;
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  vehicleState.respawn = {
    position: new THREE.Vector3(p.x, 0.8, p.z),
    yaw: Math.atan2(fwd.x, fwd.z),
  };
}

/** Request a respawn at the start line. */
export function respawnAtStart() {
  vehicleState.respawn = getStartTransform();
}

/** Request a respawn at the last checkpoint (fallback: unflip/reset). */
export function respawnAtCheckpoint() {
  unflipOrResetCar();
}

