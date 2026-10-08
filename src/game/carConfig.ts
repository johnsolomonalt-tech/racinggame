/**
 * Tunable arcade handling parameters for the raycast vehicle.
 * Units: meters, kilograms, seconds, Newtons. Brake values are rapier
 * "max impulse per wheel per step" (N·s).
 */
export const carConfig = {
  mass: 1200,
  /** Centre of mass offset relative to the hitbox centre (negative = lower). */
  comOffsetY: -0.35,
  /** Angular inertia multiplier vs a uniform box (higher = more stable). */
  inertiaScale: 1.4,
  linearDamping: 0.05,
  angularDamping: 0.6,
  chassisFriction: 0.2,
  chassisRestitution: 0.1,

  // ── Engine / gearbox ──────────────────────────────────────────────
  topSpeedKmh: 240,
  reverseMaxKmh: 40,
  /** Peak total drive force at the wheels in 1st gear (N). */
  engineForce: 9500,
  /** Upper speed (km/h) of each forward gear. Last one = rev limiter. */
  gearTopKmh: [55, 92, 128, 165, 205, 245],
  /** Torque multiplier per gear (gear ratio feel). */
  gearTorque: [1.0, 0.82, 0.68, 0.56, 0.46, 0.38],
  /** Engine cut while shifting (s). */
  shiftTime: 0.14,
  /** Downshift when rpm (0..1 within gear) falls below this. */
  downshiftRpm: 0.45,
  upshiftRpm: 0.96,
  idleRpm: 0.12,
  reverseForce: 5000,
  /** Which wheels are driven. 'rwd' gives easier drifting. */
  drive: 'rwd' as 'rwd' | 'awd',

  // ── Resistances ───────────────────────────────────────────────────
  /** Aerodynamic drag coefficient: F = k * v² (N). */
  dragK: 0.42,
  /** Downforce: F = k * v² (N), pushes the chassis down. */
  downforceK: 1.1,
  /** Engine braking when coasting (brake impulse per wheel). */
  coastBrake: 1.2,

  // ── Brakes ────────────────────────────────────────────────────────
  brakeImpulse: 32,
  handbrakeImpulse: 22,

  // ── Steering ──────────────────────────────────────────────────────
  maxSteerLow: 0.6,
  maxSteerHigh: 0.14,
  /** Speed (km/h) at which max steer reaches maxSteerHigh. */
  steerFalloffKmh: 190,
  /** Steering smoothing rates (1/s). */
  steerRate: 6,
  steerReturnRate: 9,

  // ── Suspension (per wheel) ────────────────────────────────────────
  suspensionRestLength: 0.32,
  maxSuspensionTravel: 0.28,
  suspensionStiffness: 32,
  suspensionCompression: 3.6,
  suspensionRelaxation: 4.6,
  maxSuspensionForce: 100000,

  // ── Tyres ─────────────────────────────────────────────────────────
  frictionSlipFront: 2.6,
  frictionSlipRear: 2.4,
  sideFrictionFront: 1.2,
  sideFrictionRear: 1.15,
  /** Rear grip multipliers while the handbrake is held (drift). */
  handbrakeRearSlip: 0.9,
  handbrakeRearSide: 0.38,
  /** Grip recovers over this many seconds after releasing the handbrake. */
  gripRecoverTime: 0.45,

  // ── Assists ───────────────────────────────────────────────────────
  /** Seconds upside-down before auto respawn. */
  flipRespawnTime: 2,
  /** Respawn if the car falls below this height. */
  killY: -30,

  // ── Drift scoring ─────────────────────────────────────────────────
  driftMinKmh: 30,
  /** Lateral speed (m/s) where drift starts / saturates. */
  driftLatStart: 1.6,
  driftLatFull: 7,
  /** Points per second at drift=1 and 100 km/h. */
  driftPointsRate: 120,
  /** Grace time (s) before a combo is banked after drifting stops. */
  driftBankDelay: 0.9,
  /** Impact (0..1) that kills the combo. */
  driftCrashImpact: 0.35,
};

export type CarConfig = typeof carConfig;
