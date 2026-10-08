import React, { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { vehicleState } from './vehicleState';
import { useGame } from '../state/store';

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
  return <primitive object={scene} />;
}

export default function City() {
  const [manifest, setManifest] = useState<CityManifest | null>(null);
  const [footprints, setFootprints] = useState<number[][][] | null>(null);
  const [activeTileIds, setActiveTileIds] = useState<string[]>([]);
  const setGame = useGame((s) => s.set);

  // Fetch manifest and footprints
  useEffect(() => {
    fetch('/city/manifest.json')
      .then((r) => r.json())
      .then((data: CityManifest) => {
        setManifest(data);
        setGame({ loadProgress: 0.5 });
      })
      .catch((err) => console.error('Failed to load city manifest:', err));

    fetch('/city/footprints.json')
      .then((r) => r.json())
      .then((data: number[][][]) => {
        setFootprints(data);
        setGame({ loadProgress: 1.0 });
      })
      .catch((err) => console.error('Failed to load footprints:', err));
  }, [setGame]);

  // Dynamic distance-based tile streaming & LOD swapping (Section 2)
  const lastUpdatePos = React.useRef(new THREE.Vector2(-9999, -9999));
  const VISIBILITY_RADIUS = 600; // Load tiles within 600m

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

  // Nearby building collision boxes generated dynamically from footprints
  const activeColliders = useMemo(() => {
    if (!footprints) return [];
    // Approximate footprint polygons as bounding cuboid colliders
    return footprints.map((poly) => {
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      for (const [x, z] of poly) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
      const hx = (maxX - minX) / 2;
      const hz = (maxZ - minZ) / 2;
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const height = 45; // average building height
      return {
        halfExtents: [hx, height / 2, hz] as [number, number, number],
        position: [cx, height / 2, cz] as [number, number, number],
      };
    });
  }, [footprints]);

  return (
    <group>
      {/* Ground Physical Collider */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2500, 1, 2500]} position={[0, -1, 0]} friction={0.9} restitution={0.0} />

        {/* Building Colliders */}
        {activeColliders.map((b, idx) => (
          <CuboidCollider
            key={idx}
            args={b.halfExtents}
            position={b.position}
            friction={0.2}
            restitution={0.1}
          />
        ))}
      </RigidBody>

      {/* Streamed 3D GLB City Tiles with per-tile Suspense */}
      {activeTileIds.map((id) => (
        <React.Suspense key={id} fallback={null}>
          <CityTile id={id} />
        </React.Suspense>
      ))}
    </group>
  );
}
