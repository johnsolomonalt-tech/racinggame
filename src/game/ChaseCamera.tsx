import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { vehicleState } from './vehicleState';
import { controlState } from './controls';

export default function ChaseCamera() {
  const { camera } = useThree();

  const currentPos = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  const currentFov = useRef(60);
  const shakeOffset = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!vehicleState.ready) return;

    const dt = Math.min(delta, 0.05);
    const mode = controlState.cameraMode;

    const carPos = vehicleState.position;
    const carQuat = vehicleState.quaternion;
    const speedKmh = Math.abs(vehicleState.speedKmh);

    // Dynamic FOV widening during high speed acceleration (Section 4)
    const targetFov = THREE.MathUtils.lerp(60, 85, THREE.MathUtils.clamp(speedKmh / 220, 0, 1));
    currentFov.current = THREE.MathUtils.damp(currentFov.current, targetFov, 4.0, dt);

    if ('fov' in camera) {
      (camera as THREE.PerspectiveCamera).fov = currentFov.current;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }

    // Camera offset based on selected mode
    let offset: THREE.Vector3;
    let lookOffset: THREE.Vector3;

    if (mode === 'hood') {
      offset = new THREE.Vector3(0, 0.9, -0.4);
      lookOffset = new THREE.Vector3(0, 0.7, -15);
    } else if (mode === 'far') {
      offset = new THREE.Vector3(0, 3.0, 7.5);
      lookOffset = new THREE.Vector3(0, 1.0, -6);
    } else {
      // Default Chase mode: framed right behind the vehicle
      offset = new THREE.Vector3(0, 1.75, 4.6);
      lookOffset = new THREE.Vector3(0, 0.85, -6.0);
    }

    // World target position
    const worldOffset = offset.clone().applyQuaternion(carQuat);
    const targetCamPos = carPos.clone().add(worldOffset);

    const worldLookTarget = lookOffset.clone().applyQuaternion(carQuat);
    const targetLookAt = carPos.clone().add(worldLookTarget);

    // Snap directly to car on first frame or when respawning
    if (!currentPos.current.lengthSq() || vehicleState.respawn) {
      currentPos.current.copy(targetCamPos);
      currentLookAt.current.copy(targetLookAt);
    } else {
      // Spring interpolation behind car
      const posStiffness = mode === 'hood' ? 24 : 8.5;
      currentPos.current.lerp(targetCamPos, 1.0 - Math.exp(-posStiffness * dt));

      const lookStiffness = mode === 'hood' ? 28 : 12;
      currentLookAt.current.lerp(targetLookAt, 1.0 - Math.exp(-lookStiffness * dt));
    }

    // Subtle shaking artifacts during drift or collision states (Section 4)
    const driftShake = vehicleState.drift * 0.08;
    const impactShake = vehicleState.impact * 0.35;
    const totalShake = driftShake + impactShake;

    if (totalShake > 0.005) {
      shakeOffset.current.set(
        (Math.random() - 0.5) * totalShake,
        (Math.random() - 0.5) * totalShake,
        (Math.random() - 0.5) * totalShake
      );
    } else {
      shakeOffset.current.set(0, 0, 0);
    }

    camera.position.copy(currentPos.current).add(shakeOffset.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
