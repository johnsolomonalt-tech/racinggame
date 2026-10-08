import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { vehicleState } from './vehicleState';

export default function Lights() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useFrame(() => {
    // Keep directional sun shadow frustum centered tightly on active car (Section 2)
    if (dirLightRef.current && targetRef.current) {
      const p = vehicleState.position;
      dirLightRef.current.position.set(p.x + 12, p.y + 24, p.z + 10);
      targetRef.current.position.set(p.x, p.y, p.z);
    }
  });

  return (
    <>
      {/* Target object for sun */}
      <object3D ref={targetRef} />

      {/* Ambient dusk sky illumination */}
      <ambientLight intensity={0.4} color="#3d4966" />

      {/* Global directional sun with low-res tight shadow map strictly on vehicles */}
      <directionalLight
        ref={dirLightRef}
        castShadow
        intensity={1.2}
        color="#ffe2b8"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />

      {/* Procedural reflection probe giving neon reflections to car clearcoat */}
      <Environment resolution={128} frames={1}>
        <group rotation={[-Math.PI / 4, -0.6, 0]}>
          <Lightformer
            form="ring"
            color="#ff007f"
            intensity={4}
            scale={12}
            position={[-15, 8, -10]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            color="#00e5ff"
            intensity={4}
            scale={14}
            position={[15, 10, -8]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            color="#ffffff"
            intensity={2}
            scale={20}
            position={[0, 16, 5]}
            target={[0, 0, 0]}
          />
        </group>
      </Environment>
    </>
  );
}
