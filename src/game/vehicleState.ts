/**
 * Shared, allocation-free runtime state written by the Vehicle every frame and
 * read by the camera, track/lap logic and HUD. Deliberately NOT React state so
 * per-frame updates never trigger React re-renders.
 *
 * World convention: meters, +Y up. The city pipeline outputs geometry in this
 * same space (origin = Midtown track centre).
 */
import * as THREE from 'three';

export const vehicleState = {
  /** Chassis world position (m). */
  position: new THREE.Vector3(),
  /** Chassis world orientation. */
  quaternion: new THREE.Quaternion(),
  /** Linear velocity (m/s). */
  velocity: new THREE.Vector3(),
  /** Forward speed in km/h (signed, negative when reversing). */
  speedKmh: 0,
  /** Current gear: 'R' | 'N' | 1..6 */
  gear: 'N' as 'R' | 'N' | number,
  /** 0..1 normalised engine rpm, for HUD. */
  rpm: 0,
  /** 0..1 how hard the car is drifting (lateral slip). */
  drift: 0,
  /** Last collision impulse magnitude, decays to 0 (camera shake). */
  impact: 0,
  /** True once the chassis rigid body exists. */
  ready: false,
  /** Request a respawn at the given transform (set by Track / R key). */
  respawn: null as null | { position: THREE.Vector3; yaw: number },
};

/** Spawn / track definition shape, loaded from /city/track.json. */
export interface TrackDef {
  /** Checkpoint gate centres [x, z] in order; index 0 is the start/finish line. */
  checkpoints: [number, number][];
  /** Gate half-width in meters. */
  gateRadius: number;
  /** Spawn point + yaw (radians, rotation about +Y; yaw 0 faces -Z). */
  start: { x: number; y: number; z: number; yaw: number };
}
