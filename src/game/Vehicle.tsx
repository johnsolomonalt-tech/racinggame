import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  RigidBody,
  CuboidCollider,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import { carConfig } from './carConfig';
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
      const axle = new rapier.Vector3(1, 0, 0);

      controller.addWheel(connection, dir, axle, carConfig.suspensionRestLength, radius);
      const i = controller.numWheels() - 1;

      controller.setWheelSuspensionStiffness(i, carConfig.suspensionStiffness);
      controller.setWheelMaxSuspensionTravel(i, carConfig.maxSuspensionTravel);
      controller.setWheelSuspensionCompression(i, carConfig.suspensionCompression);
      controller.setWheelSuspensionRelaxation(i, carConfig.suspensionRelaxation);
      controller.setWheelFrictionSlip(i, isFront ? carConfig.frictionSlipFront : carConfig.frictionSlipRear);
      controller.setWheelSideFrictionStiffness(i, isFront ? carConfig.sideFrictionFront : carConfig.sideFrictionRear);
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
  }, [world, rapier, car]);

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
    if (up.y < 0.2) {
      upsideDownTimer.current += dt;
      if (upsideDownTimer.current > carConfig.flipRespawnTime) {
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

    if (t.y < carConfig.killY) {
      vehicleState.respawn = {
        position: new THREE.Vector3(trackRuntime.track.start.x, trackRuntime.track.start.y, trackRuntime.track.start.z),
        yaw: trackRuntime.track.start.yaw,
      };
    }

    // 4. Input handling
    const input = readInput();

    // Speed-dependent steering angle
    const steerFactor = THREE.MathUtils.clamp(1.0 - Math.abs(speedKmh) / carConfig.steerFalloffKmh, 0.15, 1.0);
    const targetSteer = input.steer * (carConfig.maxSteerLow * steerFactor);
    const steerRate = input.steer !== 0 ? carConfig.steerRate : carConfig.steerReturnRate;
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
      const topOfGear = carConfig.gearTopKmh[gearIdx];
      const bottomOfGear = gearIdx > 0 ? carConfig.gearTopKmh[gearIdx - 1] : 0;
      const rpm = (Math.abs(speedKmh) - bottomOfGear) / Math.max(1, topOfGear - bottomOfGear);
      currentRpm.current = THREE.MathUtils.clamp(rpm, carConfig.idleRpm, 1.0);

      if (gearIdx < 5 && rpm > carConfig.upshiftRpm && shiftTimer.current <= 0) {
        currentGear.current = (gearIdx + 2);
        shiftTimer.current = carConfig.shiftTime;
      } else if (gearIdx > 0 && rpm < carConfig.downshiftRpm && shiftTimer.current <= 0) {
        currentGear.current = (gearIdx);
        shiftTimer.current = carConfig.shiftTime;
      }
    } else if (input.brake > 0 && speedKmh < 2) {
      currentGear.current = 'R';
      currentRpm.current = THREE.MathUtils.clamp(Math.abs(speedKmh) / carConfig.reverseMaxKmh, 0.2, 1.0);
    } else {
      currentRpm.current = THREE.MathUtils.damp(currentRpm.current, carConfig.idleRpm, 4.0, dt);
    }

    vehicleState.gear = currentGear.current;
    vehicleState.rpm = currentRpm.current;

    // Apply Drive Forces & Braking
    const isShifting = shiftTimer.current > 0;
    const gearIdx = typeof currentGear.current === 'number' ? currentGear.current - 1 : 0;
    const torqueMult = currentGear.current === 'R' ? 0.7 : carConfig.gearTorque[gearIdx];
    const engineForce = (isShifting ? 0 : carConfig.engineForce * torqueMult * input.throttle) / 2;

    const isBraking = input.brake > 0 && speedKmh > 2;
    const isReversing = input.brake > 0 && speedKmh <= 2;

    for (let i = 0; i < 4; i++) {
      const isRear = i >= 2;

      // Throttle
      if (carConfig.drive === 'rwd' ? isRear : true) {
        if (currentGear.current === 'R' && isReversing) {
          controller.setWheelEngineForce(i, -carConfig.reverseForce / 2);
        } else if (input.throttle > 0 && speedKmh < carConfig.topSpeedKmh) {
          controller.setWheelEngineForce(i, engineForce);
        } else {
          controller.setWheelEngineForce(i, 0);
        }
      }

      // Brakes
      let brakeForce = 0;
      if (isBraking) {
        brakeForce = carConfig.brakeImpulse;
      } else if (input.handbrake && isRear) {
        brakeForce = carConfig.handbrakeImpulse;
      } else if (input.throttle === 0 && !isBraking) {
        brakeForce = carConfig.coastBrake;
      }
      controller.setWheelBrake(i, brakeForce);

      // Drift physics (tweak rear friction)
      if (isRear) {
        if (input.handbrake) {
          controller.setWheelFrictionSlip(i, carConfig.frictionSlipRear * carConfig.handbrakeRearSlip);
          controller.setWheelSideFrictionStiffness(i, carConfig.sideFrictionRear * carConfig.handbrakeRearSide);
        } else {
          controller.setWheelFrictionSlip(i, carConfig.frictionSlipRear);
          controller.setWheelSideFrictionStiffness(i, carConfig.sideFrictionRear);
        }
      }
    }

    // 6. Aerodynamic Downforce & Drag
    const speedSq = speedMs * speedMs;
    const downforce = carConfig.downforceK * speedSq;
    body.applyImpulse({ x: 0, y: -downforce * dt, z: 0 }, true);

    const drag = carConfig.dragK * speedSq * Math.sign(speedMs);
    body.applyImpulse({ x: -fwd.x * drag * dt, y: 0, z: -fwd.z * drag * dt }, true);

    // 7. Drift scoring calculation
    const isDrifting =
      Math.abs(speedKmh) > carConfig.driftMinKmh &&
      Math.abs(lateralMs) > carConfig.driftLatStart;

    const driftIntensity = isDrifting
      ? THREE.MathUtils.clamp((Math.abs(lateralMs) - carConfig.driftLatStart) / (carConfig.driftLatFull - carConfig.driftLatStart), 0, 1)
      : 0;

    vehicleState.drift = driftIntensity;

    const store = useGame.getState();
    if (store.phase === 'racing') {
      if (driftIntensity > 0.1) {
        driftGraceTimer.current = carConfig.driftBankDelay;
        const pts = Math.round(driftIntensity * (Math.abs(speedKmh) / 100) * carConfig.driftPointsRate * dt);
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

    // 9. Sync Wheel Visual Transformations
    const wheelRefs = [wheelFLRef, wheelFRRef, wheelRLRef, wheelRRRef];
    wheelRefs.forEach((ref, idx) => {
      if (!ref.current) return;
      const rot = controller.wheelRotation(idx);
      const steer = controller.wheelSteering(idx);
      const susp = controller.wheelSuspensionLength(idx);
      const origin = car.wheels.positions[idx === 0 ? 'fl' : idx === 1 ? 'fr' : idx === 2 ? 'rl' : 'rr'];

      ref.current.position.set(origin[0], origin[1] - susp, origin[2]);
      ref.current.rotation.y = steer;
      ref.current.rotation.x = -rot;
    });

    // Impact decay for camera shake
    if (vehicleState.impact > 0) {
      vehicleState.impact = Math.max(0, vehicleState.impact - dt * 2.5);
    }

    // Audio engine dynamic synthesis update
    audioEngine.update(speedKmh, currentRpm.current, input.throttle, vehicleState.drift);
  });

  return (
    <RigidBody
      ref={chassisRef}
      colliders={false}
      type="dynamic"
      mass={carConfig.mass}
      linearDamping={carConfig.linearDamping}
      angularDamping={carConfig.angularDamping}
      position={[trackRuntime.track.start.x, trackRuntime.track.start.y, trackRuntime.track.start.z]}
      rotation={[0, trackRuntime.track.start.yaw, 0]}
      onContactForce={(payload) => {
        const force = payload.totalForceMagnitude;
        if (force > 3000) {
          const norm = THREE.MathUtils.clamp((force - 3000) / 25000, 0, 1);
          vehicleState.impact = Math.max(vehicleState.impact, norm);
          if (norm > carConfig.driftCrashImpact) {
            driftComboAcc.current = 0;
            useGame.getState().set({ driftCombo: 0 });
          }
        }
      }}
    >
      {/* Chassis Cuboid Collider */}
      <CuboidCollider
        args={car.hitbox.halfExtents}
        position={car.hitbox.center}
        friction={carConfig.chassisFriction}
        restitution={carConfig.chassisRestitution}
      />

      {/* Car Visual Mesh & Headlights */}
      <primitive object={car.chassis} />

      {/* Dynamic Headlights (night driving) */}
      <spotLight
        position={[-0.6, 0.55, -2.1]}
        target-position={[-0.6, 0, -35]}
        angle={0.45}
        penumbra={0.5}
        intensity={8.0}
        color="#e0f0ff"
        castShadow={false}
      />
      <spotLight
        position={[0.6, 0.55, -2.1]}
        target-position={[0.6, 0, -35]}
        angle={0.45}
        penumbra={0.5}
        intensity={8.0}
        color="#e0f0ff"
        castShadow={false}
      />

      {/* Visual Wheels */}
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
    </RigidBody>
  );
}
