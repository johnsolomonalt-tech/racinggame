import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { vehicleState } from './vehicleState';
import { readInput } from './controls';

// ─────────────────────────────────────────────────────────────────────────────
// 1. TIRE SMOKE & DRIFT PARTICLES (GPU Instanced Particle Cloud)
// ─────────────────────────────────────────────────────────────────────────────
const MAX_SMOKE_PARTICLES = 64;

interface SmokeParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
}

export function TireSmoke() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useRef<SmokeParticle[]>(
    Array.from({ length: MAX_SMOKE_PARTICLES }, () => ({
      pos: new THREE.Vector3(0, -999, 0),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 1.0,
      scale: 0.2,
    }))
  );

  const spawnIndex = useRef(0);
  const spawnTimer = useRef(0);

  const mat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#e2e8f0',
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
  }, []);

  const geo = useMemo(() => new THREE.SphereGeometry(0.3, 6, 6), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);

    const isDrifting = vehicleState.drift > 0.12 && vehicleState.speedKmh > 25;
    const carPos = vehicleState.position;
    const carQuat = vehicleState.quaternion;

    // Spawn new smoke puffs while drifting
    if (isDrifting) {
      spawnTimer.current += dt;
      if (spawnTimer.current > 0.04) {
        spawnTimer.current = 0;

        // Rear left & right wheel contact positions
        const leftRear = new THREE.Vector3(-0.85, -0.3, 1.3).applyQuaternion(carQuat).add(carPos);
        const rightRear = new THREE.Vector3(0.85, -0.3, 1.3).applyQuaternion(carQuat).add(carPos);

        const targets = [leftRear, rightRear];
        targets.forEach((origin) => {
          const p = particles.current[spawnIndex.current % MAX_SMOKE_PARTICLES];
          p.pos.copy(origin);
          p.vel.set(
            (Math.random() - 0.5) * 1.5,
            0.6 + Math.random() * 0.8,
            (Math.random() - 0.5) * 1.5
          );
          p.life = 1.0;
          p.maxLife = 0.8 + Math.random() * 0.4;
          p.scale = 0.25;
          spawnIndex.current++;
        });
      }
    }

    // Update particles
    particles.current.forEach((p, idx) => {
      if (p.life > 0) {
        p.life -= dt / p.maxLife;
        p.pos.addScaledVector(p.vel, dt);
        p.vel.y += 0.4 * dt; // gentle rise
        p.scale += dt * 1.8; // expand cloud

        dummy.position.copy(p.pos);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(idx, dummy.matrix);
      } else {
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0.001);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(idx, dummy.matrix);
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, MAX_SMOKE_PARTICLES]}
      frustumCulled={false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXHAUST BACKFIRE FLAMES & CRACKLE SPARKS
// ─────────────────────────────────────────────────────────────────────────────
export function ExhaustBackfire() {
  const flameLeftRef = useRef<THREE.Mesh>(null);
  const flameRightRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const flameLife = useRef(0);
  const lastRpm = useRef(0);
  const lastThrottle = useRef(0);

  const flameMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#00f0ff', // High-octane turbo blue flame core
    });
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const rpm = vehicleState.rpm;
    const input = readInput();

    // Trigger backfire pop on gear shift or abrupt throttle lift-off at high RPM
    const throttleDropped = lastThrottle.current > 0.8 && input.throttle < 0.2 && lastRpm.current > 0.75;
    const gearShiftPop = lastRpm.current > 0.92 && rpm < 0.7;

    if (throttleDropped || gearShiftPop) {
      flameLife.current = 0.12; // 120ms burst
    }

    lastRpm.current = rpm;
    lastThrottle.current = input.throttle;

    if (flameLife.current > 0) {
      flameLife.current -= dt;
      const visible = true;
      if (flameLeftRef.current) flameLeftRef.current.visible = visible;
      if (flameRightRef.current) flameRightRef.current.visible = visible;
      if (lightRef.current) lightRef.current.intensity = 3.5;
    } else {
      if (flameLeftRef.current) flameLeftRef.current.visible = false;
      if (flameRightRef.current) flameRightRef.current.visible = false;
      if (lightRef.current) lightRef.current.intensity = 0;
    }
  });

  return (
    <group>
      {/* Attached to Vehicle chassis coordinate space */}
      <mesh
        ref={flameLeftRef}
        position={[-0.45, 0.22, 2.35]}
        rotation={[Math.PI / 2, 0, 0]}
        material={flameMat}
        visible={false}
      >
        <coneGeometry args={[0.08, 0.45, 8]} />
      </mesh>
      <mesh
        ref={flameRightRef}
        position={[0.45, 0.22, 2.35]}
        rotation={[Math.PI / 2, 0, 0]}
        material={flameMat}
        visible={false}
      >
        <coneGeometry args={[0.08, 0.45, 8]} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.25, 2.4]}
        color="#00f0ff"
        intensity={0}
        distance={6}
        decay={2}
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HIGH-SPEED WIND STREAKS (Visual Sensation of Speed)
// ─────────────────────────────────────────────────────────────────────────────
export function SpeedStreaks() {
  const groupRef = useRef<THREE.Group>(null);
  const streakCount = 24;

  const streaks = useMemo(() => {
    return Array.from({ length: streakCount }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        0.5 + Math.random() * 4,
        (Math.random() - 0.5) * 20
      ),
      len: 3 + Math.random() * 5,
    }));
  }, [streakCount]);

  const mat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#00f0ff',
      transparent: true,
      opacity: 0.25,
    });
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    const speed = Math.abs(vehicleState.speedKmh);
    const visible = speed > 130;

    groupRef.current.visible = visible;
    if (!visible) return;

    // Align with vehicle position and heading
    groupRef.current.position.copy(vehicleState.position);
    groupRef.current.quaternion.copy(vehicleState.quaternion);
  });

  return (
    <group ref={groupRef} visible={false}>
      {streaks.map((s, idx) => (
        <line key={idx} position={s.pos}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, -s.len, 0, 0, 0])}
              itemSize={3}
            />
          </bufferGeometry>
          <primitive object={mat} />
        </line>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. NIGHTTIME CELESTIAL SKY DOME & MOONLIGHT
// ─────────────────────────────────────────────────────────────────────────────
export function NightSkyDome() {
  const moonMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f0f6ff' }), []);
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#4477bb',
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      }),
    []
  );

  return (
    <group>
      {/* Luminous High Moon in the Manhattan Sky */}
      <mesh position={[-600, 480, -700]}>
        <sphereGeometry args={[28, 16, 16]} />
        <primitive object={moonMat} />
      </mesh>
      {/* Soft Moon Glow Halo */}
      <mesh position={[-600, 480, -700]}>
        <sphereGeometry args={[56, 16, 16]} />
        <primitive object={haloMat} />
      </mesh>

      {/* Directional moonlight beam */}
      <directionalLight
        position={[-600, 480, -700]}
        color="#88b0ea"
        intensity={0.65}
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITE VISUAL EFFECTS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VisualEffects() {
  return (
    <group>
      {/* 1. Dynamic Tire Smoke Particles */}
      <TireSmoke />

      {/* 2. High-Speed Motion Streaks */}
      <SpeedStreaks />

      {/* 3. Celestial Night Sky & Moon */}
      <NightSkyDome />
    </group>
  );
}
