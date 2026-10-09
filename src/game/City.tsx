import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { vehicleState } from './vehicleState';
import { useGame } from '../state/store';
import { trackRuntime } from './trackRuntime';

interface TileMeta {
  id: string;
  center: [number, number];
  tris: number;
}

interface CityManifest {
  tileSize: number;
  bounds: [number, number, number, number];
  tiles: TileMeta[];
}

function CityTile({ id }: { id: string }) {
  const { scene } = useGLTF(`/city/${id}.glb`, '/draco/');
  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={scene} />
    </RigidBody>
  );
}

export default function City() {
  const [manifest, setManifest] = useState<CityManifest | null>(null);
  const [activeTileIds, setActiveTileIds] = useState<string[]>([]);
  const setGame = useGame((s) => s.set);

  // Fetch manifest
  useEffect(() => {
    fetch('/city/manifest.json')
      .then((r) => r.json())
      .then((data: CityManifest) => {
        setManifest(data);
        const sx = trackRuntime.track.start.x;
        const sz = trackRuntime.track.start.z;
        const initial = data.tiles
          .filter((t) => {
            const dx = t.center[0] - sx;
            const dz = t.center[1] - sz;
            return Math.sqrt(dx * dx + dz * dz) <= 650;
          })
          .map((t) => t.id);
        setActiveTileIds(initial);
        setGame({ loadProgress: 1.0 });
      })
      .catch((err) => console.error('Failed to load city manifest:', err));
  }, [setGame]);

  // Dynamic distance-based tile streaming & LOD swapping
  const lastUpdatePos = React.useRef(new THREE.Vector2(-9999, -9999));
  const VISIBILITY_RADIUS = 650; // Load tiles within 650m for open-world exploration

  useFrame(() => {
    if (!manifest) return;
    const px = vehicleState.position.x;
    const pz = vehicleState.position.z;

    // Only recompute active tiles if the vehicle moved more than 20m
    if (lastUpdatePos.current.distanceTo(new THREE.Vector2(px, pz)) > 20) {
      lastUpdatePos.current.set(px, pz);

      const visible = manifest.tiles
        .filter((t) => {
          const dx = t.center[0] - px;
          const dz = t.center[1] - pz;
          return Math.sqrt(dx * dx + dz * dz) <= VISIBILITY_RADIUS;
        })
        .map((t) => t.id);

      setActiveTileIds(visible);
    }
  });

  return (
    <group>
      {/* Wet asphalt ground plane receiving dynamic vehicle shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial
          color="#0c1018"
          roughness={0.28}
          metalness={0.25}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Global Ground Physical Collider (Solid everywhere across the open world) */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2500, 1, 2500]} position={[0, -1, 0]} friction={0.9} restitution={0.0} />
      </RigidBody>

      {/* Streamed 3D GLB City Tiles with Physical Trimesh Colliders (100% Solid Buildings, Zero Phantom Boxes) */}
      {activeTileIds.map((id) => (
        <React.Suspense key={id} fallback={null}>
          <CityTile id={id} />
        </React.Suspense>
      ))}
    </group>
  );
}
