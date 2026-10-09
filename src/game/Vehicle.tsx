import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  RigidBody,
  CuboidCollider,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import { getCarConfig } from './carConfig';
import { vehicleState } from './vehicleState';
import { readInput } from './controls';
import { useGame } from '../state/store';
import { useResolvedCar, type CarManifestEntry } from './carModel';
import { trackRuntime } from './trackRuntime';
import { audioEngine } from './audio';

interface VehicleProps {
  manifestEntry?: CarManifestEntry | null;
}

export default function Vehicle({ manifestEntry = null }: VehicleProps) {
  const { rapier, world } = useRapier();
  const car = useResolvedCar(manifestEntry);
  const config = getCarConfig(manifestEntry ? manifestEntry.id : null);
  const chassisRef = useRef<RapierRigidBody>(null);

  // Wheel transform visual groups
  const wheelFLRef = useRef<THREE.Group>(null);
  const wheelFRRef = useRef<THREE.Group>(null);
  const wheelRLRef = useRef<THREE.Group>(null);
  const wheelRRRef = useRef<THREE.Group>(null);

  // Raycast vehicle controller instance
  const vehicleControllerRef = useRef<any>(null);

  // Dynamic driving state
  const currentSteer = useRef(0);
  const currentGear = useRef<number | 'R' | 'N'>(1);
  const currentRpm = useRef(0.2);
  const shiftTimer = useRef(0);
  const upsideDownTimer = useRef(0);
  const driftComboAcc = useRef(0);
  const driftGraceTimer = useRef(0);
  const wheelRoll = useRef(0);
  const tailLightRef = useRef<THREE.Group>(null);
  const headlightTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0, -0.4, -30);
    return obj;
  }, []);

  // Initialise Raycast Vehicle Controller
  useEffect(() => {
    if (!chassisRef.current) return;
    const body = chassisRef.current;

    // Create Rapier Raycast Vehicle Controller
    const controller = (world as any).createVehicleController(body);
    controller.setIndexForwardAxis = 2; // Z-axis forward in Three.js
    vehicleControllerRef.current = controller;

    const w = car.wheels;
    const radius = w.radius;

    const wheelIndices = [
      { key: 'fl', pos: w.positions.fl, isFront: true },
      { key: 'fr', pos: w.positions.fr, isFront: true },
      { key: 'rl', pos: w.positions.rl, isFront: false },
      { key: 'rr', pos: w.positions.rr, isFront: false },
    ];

    wheelIndices.forEach(({ pos, isFront }) => {
      const connection = new rapier.Vector3(pos[0], pos[1], pos[2]);
      const dir = new rapier.Vector3(0, -1, 0);
      // Axle points along right (+X) axis: (0,-1,0) x (1,0,0) produces (0,0,-1) forward in Three.js (-Z)
      const axle = new rapier.Vector3(1, 0, 0);

      controller.addWheel(connection, dir, axle, config.suspensionRestLength, radius);
      const i = controller.numWheels() - 1;

      controller.setWheelSuspensionStiffness(i, config.suspensionStiffness);
      controller.setWheelMaxSuspensionTravel(i, config.maxSuspensionTravel);
      controller.setWheelSuspensionCompression(i, config.suspensionCompression);
      controller.setWheelSuspensionRelaxation(i, config.suspensionRelaxation);
      controller.setWheelMaxSuspensionForce(i, config.maxSuspensionForce ?? Math.max(120000, config.mass * 35));
      controller.setWheelFrictionSlip(i, isFront ? config.frictionSlipFront : config.frictionSlipRear);
      controller.setWheelSideFrictionStiffness(i, isFront ? config.sideFrictionFront : config.sideFrictionRear);
    });

    vehicleState.ready = true;

    return () => {
      vehicleState.ready = false;
      try {
        if (vehicleControllerRef.current && (world as any).removeVehicleController) {
          (world as any).removeVehicleController(vehicleControllerRef.current);
        }
      } catch (e) {
        // cleanup
      }
      vehicleControllerRef.current = null;
    };
  }, [world, rapier, car, config]);

  // Frame simulation and synchronization
  useFrame((_, delta) => {
    const body = chassisRef.current;
    const controller = vehicleControllerRef.current;
    if (!body || !controller) return;

    const dt = Math.min(delta, 0.05);

    // 1. Handle Respawn requests
    if (vehicleState.respawn) {
      const { position, yaw } = vehicleState.respawn;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
      body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      vehicleState.respawn = null;
      upsideDownTimer.current = 0;
      return;
    }

    // 2. Fetch velocities & transform
    const t = body.translation();
    const r = body.rotation();
    const v = body.linvel();

    vehicleState.position.set(t.x, t.y, t.z);
    vehicleState.quaternion.set(r.x, r.y, r.z, r.w);
    vehicleState.velocity.set(v.x, v.y, v.z);

    // Chassis local forward and right vectors
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(vehicleState.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(vehicleState.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(vehicleState.quaternion);

    const speedMs = vehicleState.velocity.dot(fwd);
    const speedKmh = speedMs * 3.6;
    vehicleState.speedKmh = speedKmh;

    const lateralMs = vehicleState.velocity.dot(right);

    // 3. Auto anti-flip check (if upside-down or out of bounds)
    if (up.y < 0.25) {
      upsideDownTimer.current += dt;
      if (upsideDownTimer.current > config.flipRespawnTime) {
        if (trackRuntime.lastCheckpoint) {
          const cpPos = trackRuntime.lastCheckpoint.position;
          const posVec = cpPos instanceof THREE.Vector3
            ? cpPos
            : Array.isArray(cpPos)
            ? new THREE.Vector3(cpPos[0], cpPos[1], cpPos[2])
            : new THREE.Vector3(cpPos.x, cpPos.y, cpPos.z);
          vehicleState.respawn = {
            position: posVec,
            yaw: trackRuntime.lastCheckpoint.yaw,
          };
        } else {
          vehicleState.respawn = {
            position: new THREE.Vector3(trackRuntime.track.start.x, trackRuntime.track.start.y, trackRuntime.track.start.z),
            yaw: trackRuntime.track.start.yaw,
          };
        }
        upsideDownTimer.current = 0;
      }
    } else {
      upsideDownTimer.current = 0;
    }

    if (t.y < -15) {
      vehicleState.respawn = {
        position: new THREE.Vector3(trackRuntime.track.start.x, 1.2, trackRuntime.track.start.z),
        yaw: trackRuntime.track.start.yaw,
      };
    }

    // 4. Input handling
    const input = readInput();

    // Instant player reset / unflip on the road with R key
    if (input.respawn) {
      vehicleState.respawn = {
        position: new THREE.Vector3(t.x, 0.8, t.z),
        yaw: Math.atan2(fwd.x, fwd.z),
      };
    }

    // Speed-dependent steering angle (tight low-speed radius, stable high-speed taper)
    const speedRatio = THREE.MathUtils.clamp(Math.abs(speedKmh) / config.steerFalloffKmh, 0, 1);
    const maxSteer = THREE.MathUtils.lerp(config.maxSteerLow, config.maxSteerHigh, speedRatio * speedRatio);
    // steer: +1 for left (KeyA), -1 for right (KeyD).
    // In Rapier with dir=(0,-1,0) and axle=(1,0,0), positive angle turns LEFT (-X), negative angle turns RIGHT (+X).
    const targetSteer = input.steer * maxSteer;
    const steerRate = input.steer !== 0 ? config.steerRate : config.steerReturnRate;
    currentSteer.current = THREE.MathUtils.damp(currentSteer.current, targetSteer, steerRate, dt);

    controller.setWheelSteering(0, currentSteer.current);
    controller.setWheelSteering(1, currentSteer.current);

    // 5. Gearbox and engine force calculation
    if (shiftTimer.current > 0) {
      shiftTimer.current -= dt;
    }

    let gear = currentGear.current;
    if (input.throttle > 0 && speedKmh >= -2) {
      if (gear === 'R') gear = 1;
      const gearIdx = typeof gear === 'number' ? gear - 1 : 0;
      const topOfGear = config.gearTopKmh[gearIdx] || config.topSpeedKmh;
      const bottomOfGear = gearIdx > 0 ? config.gearTopKmh[gearIdx - 1] : 0;
      const rpm = (Math.abs(speedKmh) - bottomOfGear) / Math.max(1, topOfGear - bottomOfGear);
      currentRpm.current = THREE.MathUtils.clamp(rpm, config.idleRpm, 1.0);

      const maxGears = config.gearTopKmh.length;
      if (gearIdx < maxGears - 1 && rpm > config.upshiftRpm && shiftTimer.current <= 0) {
        currentGear.current = (gearIdx + 2);
        shiftTimer.current = config.shiftTime;
      } else if (gearIdx > 0 && rpm < config.downshiftRpm && shiftTimer.current <= 0) {
        currentGear.current = (gearIdx);
        shiftTimer.current = config.shiftTime;
      }
    } else if (input.brake > 0 && speedKmh < 2) {
      currentGear.current = 'R';
      currentRpm.current = THREE.MathUtils.clamp(Math.abs(speedKmh) / config.reverseMaxKmh, 0.2, 1.0);
    } else {
      currentRpm.current = THREE.MathUtils.damp(currentRpm.current, config.idleRpm, 4.0, dt);
    }

    vehicleState.gear = currentGear.current;
    vehicleState.rpm = currentRpm.current;

    // Apply Drive Forces & Braking
    const isShifting = shiftTimer.current > 0;
    const gearIdx = typeof currentGear.current === 'number' ? currentGear.current - 1 : 0;
    const torqueMult = currentGear.current === 'R' ? 0.7 : (config.gearTorque[gearIdx] ?? 0.5);
    const totalEngineForce = isShifting ? 0 : config.engineForce * torqueMult * input.throttle;

    const isBraking = input.brake > 0 && speedKmh > 2;
    const isReversing = input.brake > 0 && speedKmh <= 2;

    if (tailLightRef.current) {
      const brakeInt = input.brake > 0 ? 5.0 : 1.2;
      tailLightRef.current.children.forEach((c) => {
        if ('intensity' in c) (c as THREE.Light).intensity = brakeInt;
      });
    }

    for (let i = 0; i < 4; i++) {
      const isRear = i >= 2;
      const isDriven = config.drive === 'awd' ? true : isRear;
      const numDriven = config.drive === 'awd' ? 4 : 2;

      // Throttle application
      if (isDriven) {
        if (currentGear.current === 'R' && isReversing) {
          controller.setWheelEngineForce(i, -config.reverseForce / numDriven);
        } else if (input.throttle > 0 && speedKmh < config.topSpeedKmh) {
          controller.setWheelEngineForce(i, totalEngineForce / numDriven);
        } else {
          controller.setWheelEngineForce(i, 0);
        }
      } else {
        controller.setWheelEngineForce(i, 0);
      }

      // Brakes
      let brakeForce = 0;
      if (isBraking) {
        brakeForce = config.brakeImpulse;
      } else if (input.handbrake && isRear) {
        brakeForce = config.handbrakeImpulse;
      } else if (input.throttle === 0 && !isBraking) {
        brakeForce = config.coastBrake;
      }
      controller.setWheelBrake(i, brakeForce);

      // Drift physics & Aerodynamic High-Speed Grip (Authentic grip without suspension collapse)
      const speedRatio = Math.min(2.0, Math.abs(speedKmh) / 140);
      const aeroGrip = 1 + (config.downforceK * 0.12) * speedRatio;

      if (isRear) {
        if (input.handbrake) {
          controller.setWheelFrictionSlip(i, config.frictionSlipRear * config.handbrakeRearSlip);
          controller.setWheelSideFrictionStiffness(i, config.sideFrictionRear * config.handbrakeRearSide);
        } else {
          controller.setWheelFrictionSlip(i, config.frictionSlipRear * aeroGrip);
          controller.setWheelSideFrictionStiffness(i, config.sideFrictionRear * aeroGrip);
        }
      } else {
        controller.setWheelFrictionSlip(i, config.frictionSlipFront * aeroGrip);
        controller.setWheelSideFrictionStiffness(i, config.sideFrictionFront * aeroGrip);
      }
    }

    // 6. Aerodynamic Drag (Horizontal air resistance opposing velocity)
    const speedSq = speedMs * speedMs;
    const drag = config.dragK * speedSq * Math.sign(speedMs);
    body.applyImpulse({ x: -fwd.x * drag * dt, y: 0, z: -fwd.z * drag * dt }, true);

    // 7. Drift scoring calculation
    const isDrifting =
      Math.abs(speedKmh) > config.driftMinKmh &&
      Math.abs(lateralMs) > config.driftLatStart;

    const driftIntensity = isDrifting
      ? THREE.MathUtils.clamp((Math.abs(lateralMs) - config.driftLatStart) / (config.driftLatFull - config.driftLatStart), 0, 1)
      : 0;

    vehicleState.drift = THREE.MathUtils.damp(vehicleState.drift, driftIntensity, 6.0, dt);

    const store = useGame.getState();
    if (store.phase === 'racing' || store.phase === 'roam') {
      if (driftIntensity > 0.1) {
        driftGraceTimer.current = config.driftBankDelay;
        const pts = Math.round(driftIntensity * (Math.abs(speedKmh) / 100) * config.driftPointsRate * dt);
        driftComboAcc.current += pts;
        store.set({ driftCombo: Math.round(driftComboAcc.current) });
      } else if (driftComboAcc.current > 0) {
        driftGraceTimer.current -= dt;
        if (driftGraceTimer.current <= 0) {
          store.set({
            driftScore: store.driftScore + Math.round(driftComboAcc.current),
            driftCombo: 0,
          });
          driftComboAcc.current = 0;
        }
      }
    }

    // 8. Update Rapier Vehicle Simulation
    controller.updateVehicle(dt);

    // 9. Sync Wheel Visual Transformations (for procedural cars with separate wheels)
    if (car.hasSeparateWheels) {
      wheelRoll.current += (speedMs / Math.max(0.1, car.wheels.radius)) * dt;
      const wheelRefs = [wheelFLRef, wheelFRRef, wheelRLRef, wheelRRRef];
      wheelRefs.forEach((ref, idx) => {
        if (!ref.current) return;
        const steer = controller.wheelSteering(idx);
        const susp = controller.wheelSuspensionLength(idx);
        const origin = car.wheels.positions[idx === 0 ? 'fl' : idx === 1 ? 'fr' : idx === 2 ? 'rl' : 'rr'];

        ref.current.position.set(origin[0], origin[1] - susp, origin[2]);
        ref.current.rotation.y = idx < 2 ? steer : 0;
        ref.current.rotation.x = -wheelRoll.current;
      });
    }

    // Impact decay for camera shake
    if (vehicleState.impact > 0) {
      vehicleState.impact = Math.max(0, vehicleState.impact - dt * 2.5);
    }

    // Audio engine dynamic synthesis update
    audioEngine.update(speedKmh, currentRpm.current, input.throttle, vehicleState.drift);

    // Debug hook
    (window as any).__VEHICLE_DEBUG__ = {
      pos: [t.x.toFixed(2), t.y.toFixed(2), t.z.toFixed(2)],
      speed: Math.round(speedKmh),
      gear: currentGear.current,
      steer: currentSteer.current.toFixed(2),
      carId: manifestEntry ? manifestEntry.id : 'procedural-gt',
    };
  });

  return (
    <RigidBody
      ref={chassisRef}
      colliders={false}
      type="dynamic"
      ccd={true}
      canSleep={false}
      mass={config.mass}
      linearDamping={config.linearDamping}
      angularDamping={config.angularDamping}
      additionalMassProperties={{
        mass: config.mass,
        centerOfMass: { x: 0, y: config.comOffsetY, z: 0 },
      }}
      position={[trackRuntime.track.start.x, trackRuntime.track.start.y, trackRuntime.track.start.z]}
      rotation={[0, trackRuntime.track.start.yaw, 0]}
      onContactForce={(payload) => {
        const force = payload.totalForceMagnitude;
        if (force > 3000) {
          const norm = THREE.MathUtils.clamp((force - 3000) / 25000, 0, 1);
          vehicleState.impact = Math.max(vehicleState.impact, norm);
          if (norm > config.driftCrashImpact) {
            driftComboAcc.current = 0;
            useGame.getState().set({ driftCombo: 0 });
          }
        }
      }}
    >
      {/* Chassis Physical Cuboid Collider with Ground Clearance (will NEVER scrape the road) */}
      <CuboidCollider
        args={car.hitbox.halfExtents}
        position={car.hitbox.center}
        friction={config.chassisFriction}
        restitution={config.chassisRestitution}
      />

      {/* Car Visual Mesh */}
      <primitive object={car.chassis} />

      {/* Headlight Forward Focus Target (moves with vehicle chassis) */}
      <primitive object={headlightTarget} />

      {/* Dynamic Front Road Illumination (Dual Focused Spotlights) */}
      <spotLight
        target={headlightTarget}
        position={[-car.hitbox.halfExtents[0] * 0.72, 0.45, -car.hitbox.halfExtents[2] - 0.15]}
        angle={0.42}
        penumbra={0.65}
        intensity={22.0}
        distance={60}
        color="#edf5ff"
        decay={1.6}
      />
      <spotLight
        target={headlightTarget}
        position={[car.hitbox.halfExtents[0] * 0.72, 0.45, -car.hitbox.halfExtents[2] - 0.15]}
        angle={0.42}
        penumbra={0.65}
        intensity={22.0}
        distance={60}
        color="#edf5ff"
        decay={1.6}
      />

      {/* Reactive Red Taillight Glow (Dual Soft Taillights) */}
      <group ref={tailLightRef} position={[0, car.hitbox.center[1] * 0.65, car.hitbox.halfExtents[2]]}>
        <pointLight position={[-car.hitbox.halfExtents[0] * 0.7, 0, 0.35]} intensity={1.2} distance={8} color="#ff0028" decay={2.0} />
        <pointLight position={[car.hitbox.halfExtents[0] * 0.7, 0, 0.35]} intensity={1.2} distance={8} color="#ff0028" decay={2.0} />
      </group>

      {/* Visual Wheels (only rendered for vehicles with separate wheel sub-meshes) */}
      {car.hasSeparateWheels && (
        <>
          <group ref={wheelFLRef}>
            <primitive object={car.wheelFL} />
          </group>
          <group ref={wheelFRRef}>
            <primitive object={car.wheelFR} />
          </group>
          <group ref={wheelRLRef}>
            <primitive object={car.wheelRL} />
          </group>
          <group ref={wheelRRRef}>
            <primitive object={car.wheelRR} />
          </group>
        </>
      )}
    </RigidBody>
  );
}
