import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { vehicleState } from './vehicleState';

export default function Lights() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (dirLightRef.current && targetRef.current) {
      dirLightRef.current.target = targetRef.current;
    }
  }, []);

  useFrame(() => {
    // Keep directional sun shadow frustum centered tightly on active car (Section 2)
    if (dirLightRef.current && targetRef.current) {
      const p = vehicleState.position;
      dirLightRef.current.position.set(p.x + 14, p.y + 28, p.z + 12);
      targetRef.current.position.set(p.x, p.y, p.z);
      targetRef.current.updateMatrixWorld();
    }
  });

  return (
    <>
      {/* Target object for sun */}
      <primitive object={targetRef.current || new THREE.Object3D()} ref={targetRef} />

      {/* Atmospheric hemisphere sky & ground bounce illumination */}
      <hemisphereLight args={['#8ea9d6', '#141d2e', 0.9]} />
      <ambientLight intensity={0.4} color="#304060" />

      {/* Global directional sun with low-res tight shadow map strictly on vehicles */}
      <directionalLight
        ref={dirLightRef}
        castShadow
        intensity={1.4}
        color="#edf4ff"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={65}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0002}
      />

      {/* Procedural reflection probe giving neon reflections to car clearcoat */}
      <Environment resolution={128} frames={1}>
        <group rotation={[-Math.PI / 4, -0.6, 0]}>
          <Lightformer
            form="ring"
            color="#ff007f"
            intensity={2.2}
            scale={12}
            position={[-15, 8, -10]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            color="#00e5ff"
            intensity={2.2}
            scale={14}
            position={[15, 10, -8]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            color="#ffffff"
            intensity={1.0}
            scale={18}
            position={[0, 16, 5]}
            target={[0, 0, 0]}
          />
        </group>
      </Environment>
    </>
  );
}
