/**
 * Realistic and arcade-tuned vehicle physics configurations.
 * Real-world specifications: mass (kg), horsepower / engine force (N),
 * top speed (km/h), drivetrain (RWD vs AWD), suspension rates, and tire friction.
 * Tuned for grounded, stable, high-speed street driving without launching.
 */

export interface CarPhysicsProfile {
  mass: number;
  engineForce: number;
  topSpeedKmh: number;
  drive: 'rwd' | 'awd';
  gearTopKmh: number[];
  gearTorque: number[];
  suspensionStiffness: number;
  suspensionCompression: number;
  suspensionRelaxation: number;
  suspensionRestLength: number;
  maxSuspensionTravel: number;
  frictionSlipFront: number;
  frictionSlipRear: number;
  sideFrictionFront: number;
  sideFrictionRear: number;
  downforceK: number;
  dragK: number;
  brakeImpulse: number;
  handbrakeImpulse: number;
  maxSuspensionForce?: number;
}

export const CAR_PROFILES: Record<string, Partial<CarPhysicsProfile>> = {
  // 1. FIA GT3 Race Car — High downforce, racing slicks, lightning acceleration
  'bmw-m4-gt3': {
    mass: 1260,
    engineForce: 6800,
    topSpeedKmh: 295,
    drive: 'rwd',
    gearTopKmh: [75, 120, 165, 210, 255, 295],
    gearTorque: [1.0, 0.85, 0.72, 0.60, 0.50, 0.42],
    suspensionStiffness: 38,
    suspensionCompression: 4.2,
    suspensionRelaxation: 7.8,
    suspensionRestLength: 0.32,
    maxSuspensionTravel: 0.20,
    maxSuspensionForce: 24000,
    frictionSlipFront: 3.2,
    frictionSlipRear: 3.0,
    sideFrictionFront: 1.5,
    sideFrictionRear: 1.45,
    downforceK: 2.2,
    dragK: 0.38,
    brakeImpulse: 46,
    handbrakeImpulse: 28,
  },

  // 2. LB-Works Ferrari F40 — Ultra-lightweight twin-turbo V8, blistering top speed
  'ferrari-f40': {
    mass: 1100,
    engineForce: 6600,
    topSpeedKmh: 324,
    drive: 'rwd',
    gearTopKmh: [85, 140, 205, 265, 325],
    gearTorque: [1.0, 0.86, 0.74, 0.62, 0.52],
    suspensionStiffness: 36,
    suspensionCompression: 4.0,
    suspensionRelaxation: 7.4,
    suspensionRestLength: 0.30,
    maxSuspensionTravel: 0.18,
    maxSuspensionForce: 22000,
    frictionSlipFront: 3.0,
    frictionSlipRear: 2.8,
    sideFrictionFront: 1.40,
    sideFrictionRear: 1.30,
    downforceK: 1.8,
    dragK: 0.34,
    brakeImpulse: 42,
    handbrakeImpulse: 26,
  },

  // 3. Nissan Skyline GT-R R34 V-Spec — ATTESA AWD, legendary grip and launch
  'nissan-skyline-r34': {
    mass: 1560,
    engineForce: 6800,
    topSpeedKmh: 285,
    drive: 'awd',
    gearTopKmh: [65, 105, 150, 195, 240, 285],
    gearTorque: [1.0, 0.84, 0.70, 0.58, 0.48, 0.40],
    suspensionStiffness: 40,
    suspensionCompression: 4.2,
    suspensionRelaxation: 7.8,
    suspensionRestLength: 0.31,
    maxSuspensionTravel: 0.20,
    maxSuspensionForce: 28000,
    frictionSlipFront: 3.1,
    frictionSlipRear: 3.1,
    sideFrictionFront: 1.48,
    sideFrictionRear: 1.44,
    downforceK: 1.4,
    dragK: 0.40,
    brakeImpulse: 40,
    handbrakeImpulse: 25,
  },

  // 4. Porsche 911 Turbo 1975 (930) — Rear-engine, high turbo punch, responsive oversteer
  'porsche-911-turbo': {
    mass: 1195,
    engineForce: 5800,
    topSpeedKmh: 255,
    drive: 'rwd',
    gearTopKmh: [80, 145, 205, 255],
    gearTorque: [1.0, 0.82, 0.68, 0.54],
    suspensionStiffness: 35,
    suspensionCompression: 3.8,
    suspensionRelaxation: 7.2,
    suspensionRestLength: 0.31,
    maxSuspensionTravel: 0.18,
    maxSuspensionForce: 22000,
    frictionSlipFront: 2.8,
    frictionSlipRear: 2.7,
    sideFrictionFront: 1.35,
    sideFrictionRear: 1.25,
    downforceK: 1.1,
    dragK: 0.42,
    brakeImpulse: 38,
    handbrakeImpulse: 23,
  },

  // 5. Porsche 996 GT300 — Super GT high-revving flat-6 track weapon
  'porsche-996-gt300': {
    mass: 1150,
    engineForce: 6400,
    topSpeedKmh: 305,
    drive: 'rwd',
    gearTopKmh: [72, 115, 160, 210, 260, 305],
    gearTorque: [1.0, 0.85, 0.72, 0.60, 0.50, 0.42],
    suspensionStiffness: 38,
    suspensionCompression: 4.2,
    suspensionRelaxation: 7.6,
    suspensionRestLength: 0.30,
    maxSuspensionTravel: 0.18,
    maxSuspensionForce: 23000,
    frictionSlipFront: 3.2,
    frictionSlipRear: 3.1,
    sideFrictionFront: 1.45,
    sideFrictionRear: 1.40,
    downforceK: 2.0,
    dragK: 0.36,
    brakeImpulse: 44,
    handbrakeImpulse: 27,
  },

  // 6. Ford F-150 Raptor R — Supercharged V8 monster truck, massive travel & torque
  'ford-raptor-r': {
    mass: 2690,
    engineForce: 8500,
    topSpeedKmh: 195,
    drive: 'awd',
    gearTopKmh: [45, 75, 110, 145, 175, 195],
    gearTorque: [1.0, 0.88, 0.76, 0.64, 0.54, 0.46],
    suspensionStiffness: 42,
    suspensionCompression: 4.2,
    suspensionRelaxation: 7.8,
    suspensionRestLength: 0.50,
    maxSuspensionTravel: 0.30,
    maxSuspensionForce: 44000,
    frictionSlipFront: 2.8,
    frictionSlipRear: 2.8,
    sideFrictionFront: 1.30,
    sideFrictionRear: 1.30,
    downforceK: 0.6,
    dragK: 0.60,
    brakeImpulse: 52,
    handbrakeImpulse: 32,
  },

  // 7. DeLorean DMC-12 — Iconic stainless steel GT
  'delorean-dmc12': {
    mass: 1230,
    engineForce: 5200,
    topSpeedKmh: 215,
    drive: 'rwd',
    gearTopKmh: [55, 95, 140, 180, 215],
    gearTorque: [1.0, 0.80, 0.65, 0.52, 0.42],
    suspensionStiffness: 35,
    suspensionCompression: 3.8,
    suspensionRelaxation: 7.0,
    suspensionRestLength: 0.31,
    maxSuspensionTravel: 0.20,
    maxSuspensionForce: 22000,
    frictionSlipFront: 2.7,
    frictionSlipRear: 2.6,
    sideFrictionFront: 1.30,
    sideFrictionRear: 1.25,
    downforceK: 1.0,
    dragK: 0.42,
    brakeImpulse: 36,
    handbrakeImpulse: 23,
  },

  // 8. Built-in Apex GT Prototype
  'procedural-gt': {
    mass: 1200,
    engineForce: 6200,
    topSpeedKmh: 320,
    drive: 'rwd',
    gearTopKmh: [70, 115, 165, 215, 270, 320],
    gearTorque: [1.0, 0.84, 0.70, 0.58, 0.48, 0.40],
    suspensionStiffness: 36,
    suspensionCompression: 4.0,
    suspensionRelaxation: 7.5,
    suspensionRestLength: 0.31,
    maxSuspensionTravel: 0.18,
    maxSuspensionForce: 23000,
    frictionSlipFront: 3.0,
    frictionSlipRear: 2.9,
    sideFrictionFront: 1.40,
    sideFrictionRear: 1.35,
    downforceK: 1.8,
    dragK: 0.36,
    brakeImpulse: 42,
    handbrakeImpulse: 26,
  },
};

/** Default base configuration */
export const carConfig = {
  mass: 1200,
  comOffsetY: -0.38,
  inertiaScale: 1.5,
  linearDamping: 0.05,
  angularDamping: 2.8,
  chassisFriction: 0.01,
  chassisRestitution: 0.0,

  topSpeedKmh: 280,
  reverseMaxKmh: 45,
  engineForce: 6200,
  gearTopKmh: [65, 110, 160, 210, 255, 280],
  gearTorque: [1.0, 0.84, 0.70, 0.58, 0.48, 0.40],
  shiftTime: 0.12,
  downshiftRpm: 0.42,
  upshiftRpm: 0.95,
  idleRpm: 0.15,
  reverseForce: 3500,
  drive: 'rwd' as 'rwd' | 'awd',

  dragK: 0.36,
  downforceK: 1.6,
  coastBrake: 1.2,

  brakeImpulse: 40,
  handbrakeImpulse: 25,

  // Speed-sensitive steering
  maxSteerLow: 0.52,
  maxSteerHigh: 0.09,
  steerFalloffKmh: 210,
  steerRate: 7.5,
  steerReturnRate: 12.0,

  // Suspension
  suspensionRestLength: 0.30,
  maxSuspensionTravel: 0.18,
  suspensionStiffness: 36,
  suspensionCompression: 4.0,
  suspensionRelaxation: 7.5,
  maxSuspensionForce: 23000,

  // Tyres
  frictionSlipFront: 2.9,
  frictionSlipRear: 2.8,
  sideFrictionFront: 1.38,
  sideFrictionRear: 1.32,
  handbrakeRearSlip: 0.85,
  handbrakeRearSide: 0.35,
  gripRecoverTime: 0.4,

  flipRespawnTime: 2.5,
  killY: -30,

  driftMinKmh: 30,
  driftLatStart: 1.5,
  driftLatFull: 6.5,
  driftPointsRate: 150,
  driftBankDelay: 0.85,
  driftCrashImpact: 0.35,
};

export type CarConfig = typeof carConfig;

/** Return the exact tailored physics config for a specific car */
export function getCarConfig(carId?: string | null): CarConfig {
  if (!carId) return { ...carConfig };
  const profile = CAR_PROFILES[carId];
  if (!profile) return { ...carConfig };
  return {
    ...carConfig,
    ...profile,
  };
}
