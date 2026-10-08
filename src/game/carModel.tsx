import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

export interface CarManifestEntry {
  id: string;
  name: string;
  file: string;
  credit?: string;
  hitbox: {
    halfExtents: [number, number, number];
    center: [number, number, number];
  };
  wheels: {
    radius: number;
    positions: {
      fl: [number, number, number];
      fr: [number, number, number];
      rl: [number, number, number];
      rr: [number, number, number];
    };
  };
  scale?: number;
}

export interface ResolvedCarModel {
  chassis: THREE.Object3D;
  wheelFL: THREE.Object3D;
  wheelFR: THREE.Object3D;
  wheelRL: THREE.Object3D;
  wheelRR: THREE.Object3D;
  hitbox: {
    halfExtents: [number, number, number];
    center: [number, number, number];
  };
  wheels: {
    radius: number;
    positions: {
      fl: [number, number, number];
      fr: [number, number, number];
      rl: [number, number, number];
      rr: [number, number, number];
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedural fallback car: high-end modern coupe built from primitives.
// Strict 5-part hierarchy: chassis + 4 wheels, proper clearcoat materials.
// ─────────────────────────────────────────────────────────────────────────────

export const PROCEDURAL_CAR_META: CarManifestEntry = {
  id: 'procedural-gt',
  name: 'Apex GT Prototype',
  file: '',
  credit: 'Built-in procedural vehicle',
  hitbox: {
    halfExtents: [0.98, 0.45, 2.2],
    center: [0, 0.58, 0],
  },
  wheels: {
    radius: 0.35,
    positions: {
      fl: [-0.88, 0.35, -1.35],
      fr: [0.88, 0.35, -1.35],
      rl: [-0.88, 0.35, 1.35],
      rr: [0.88, 0.35, 1.35],
    },
  },
};

function buildWheelMesh(): THREE.Group {
  const group = new THREE.Group();

  // Tyre
  const tyreGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 24);
  tyreGeo.rotateZ(Math.PI / 2);
  const tyreMat = new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    roughness: 0.85,
    metalness: 0.05,
  });
  const tyre = new THREE.Mesh(tyreGeo, tyreMat);
  tyre.castShadow = true;
  group.add(tyre);

  // Rim
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.29, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#d0d4dc',
    roughness: 0.2,
    metalness: 0.9,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  group.add(rim);

  // Brake disc
  const discGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
  discGeo.rotateZ(Math.PI / 2);
  const discMat = new THREE.MeshStandardMaterial({
    color: '#666666',
    roughness: 0.3,
    metalness: 0.8,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  group.add(disc);

  return group;
}

export function buildProceduralCar(): ResolvedCarModel {
  const chassis = new THREE.Group();
  chassis.name = 'chassis';

  // Body paint material — section 3 requirement
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: '#e62434',
    roughness: 0.18,
    metalness: 0.75,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 0.9,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: '#151518',
    roughness: 0.45,
    metalness: 0.3,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#080d14',
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.7,
    transparent: true,
    opacity: 0.85,
  });

  // Lower chassis body
  const lowerGeo = new THREE.BoxGeometry(1.9, 0.42, 4.3);
  const lower = new THREE.Mesh(lowerGeo, paintMat);
  lower.position.set(0, 0.46, 0);
  lower.castShadow = true;
  chassis.add(lower);

  // Cabin / greenhouse
  const cabinGeo = new THREE.BoxGeometry(1.5, 0.48, 2.1);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 0.85, -0.15);
  cabin.castShadow = true;
  chassis.add(cabin);

  // Roof cap
  const roofGeo = new THREE.BoxGeometry(1.42, 0.08, 1.95);
  const roof = new THREE.Mesh(roofGeo, paintMat);
  roof.position.set(0, 1.1, -0.15);
  roof.castShadow = true;
  chassis.add(roof);

  // Front splitter
  const splitterGeo = new THREE.BoxGeometry(1.94, 0.06, 0.4);
  const splitter = new THREE.Mesh(splitterGeo, carbonMat);
  splitter.position.set(0, 0.24, -2.15);
  splitter.castShadow = true;
  chassis.add(splitter);

  // Rear diffuser
  const diffuserGeo = new THREE.BoxGeometry(1.88, 0.16, 0.5);
  const diffuser = new THREE.Mesh(diffuserGeo, carbonMat);
  diffuser.position.set(0, 0.32, 2.1);
  diffuser.castShadow = true;
  chassis.add(diffuser);

  // Rear spoiler
  const wingGeo = new THREE.BoxGeometry(1.7, 0.05, 0.35);
  const wing = new THREE.Mesh(wingGeo, carbonMat);
  wing.position.set(0, 0.95, 2.05);
  wing.castShadow = true;
  chassis.add(wing);

  const wingPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.15), carbonMat);
  wingPillarL.position.set(-0.55, 0.81, 2.05);
  chassis.add(wingPillarL);
  const wingPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.15), carbonMat);
  wingPillarR.position.set(0.55, 0.81, 2.05);
  chassis.add(wingPillarR);

  // Emissive Headlights
  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#cce6ff',
    emissive: '#b8e2ff',
    emissiveIntensity: 4.0,
    roughness: 0.1,
  });
  const hlGeo = new THREE.BoxGeometry(0.38, 0.1, 0.1);
  const hlL = new THREE.Mesh(hlGeo, headlightMat);
  hlL.position.set(-0.68, 0.54, -2.14);
  chassis.add(hlL);
  const hlR = new THREE.Mesh(hlGeo, headlightMat);
  hlR.position.set(0.68, 0.54, -2.14);
  chassis.add(hlR);

  // Emissive Taillights
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#ff2222',
    emissive: '#ff1111',
    emissiveIntensity: 3.0,
    roughness: 0.1,
  });
  const tlGeo = new THREE.BoxGeometry(1.6, 0.08, 0.08);
  const tl = new THREE.Mesh(tlGeo, tailMat);
  tl.position.set(0, 0.62, 2.15);
  chassis.add(tl);

  return {
    chassis,
    wheelFL: buildWheelMesh(),
    wheelFR: buildWheelMesh(),
    wheelRL: buildWheelMesh(),
    wheelRR: buildWheelMesh(),
    hitbox: PROCEDURAL_CAR_META.hitbox,
    wheels: PROCEDURAL_CAR_META.wheels,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Standardising imported GLB models from Section 3 guidelines.
// ─────────────────────────────────────────────────────────────────────────────

const WHEEL_ALIASES = {
  fl: ['wheel_fl', 'wheelfl', 'wheel_front_left', 'wheel_l_front', 'wheel_l0', 'fl'],
  fr: ['wheel_fr', 'wheelfr', 'wheel_front_right', 'wheel_r_front', 'wheel_r0', 'fr'],
  rl: ['wheel_rl', 'wheelrl', 'wheel_rear_left', 'wheel_back_left', 'wheel_l1', 'rl'],
  rr: ['wheel_rr', 'wheelrr', 'wheel_rear_right', 'wheel_back_right', 'wheel_r1', 'rr'],
};

function matchesAlias(name: string, list: string[]): boolean {
  const lower = name.toLowerCase().replace(/[-_.]/g, '');
  return list.some((a) => lower.includes(a.replace(/[-_.]/g, '')));
}

export function standardizeMaterials(root: THREE.Object3D) {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = false;

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const newMats = mats.map((mat) => {
        if (!mat) return mat;
        const name = (mat.name || '').toLowerCase();
        const objName = mesh.name.toLowerCase();

        // Tyres & rubbers
        if (name.includes('tire') || name.includes('tyre') || name.includes('rubber') || objName.includes('wheel')) {
          return new THREE.MeshStandardMaterial({
            color: (mat as THREE.MeshStandardMaterial).color || '#1b1b1c',
            roughness: 0.8,
            metalness: 0.05,
            map: (mat as THREE.MeshStandardMaterial).map || null,
          });
        }

        // Glass
        if (name.includes('glass') || name.includes('window') || name.includes('windshield')) {
          return new THREE.MeshPhysicalMaterial({
            color: '#0e1620',
            roughness: 0.05,
            metalness: 0.1,
            transmission: 0.75,
            transparent: true,
            opacity: 0.85,
          });
        }

        // Body paint
        if (name.includes('paint') || name.includes('body') || name.includes('car') || objName.includes('chassis')) {
          const std = mat as THREE.MeshStandardMaterial;
          return new THREE.MeshPhysicalMaterial({
            color: std.color || '#e62434',
            roughness: THREE.MathUtils.clamp(std.roughness ?? 0.25, 0.15, 0.4),
            metalness: THREE.MathUtils.clamp(std.metalness ?? 0.7, 0.5, 0.95),
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            map: std.map || null,
            normalMap: std.normalMap || null,
          });
        }

        return mat;
      });

      mesh.material = Array.isArray(mesh.material) ? newMats : newMats[0];
    }
  });
}

/** Hook loading a manifest entry or falling back to the procedural car. */
export function useResolvedCar(entry: CarManifestEntry | null): ResolvedCarModel {
  const gltf = useGLTF(entry && entry.file ? entry.file : '/cars/empty.glb', '/draco/', undefined, () => null);

  return useMemo(() => {
    if (!entry || !entry.file || !gltf || !gltf.scene) {
      return buildProceduralCar();
    }

    const cloned = gltf.scene.clone(true);
    standardizeMaterials(cloned);

    let chassis: THREE.Object3D | null = null;
    let wheelFL: THREE.Object3D | null = null;
    let wheelFR: THREE.Object3D | null = null;
    let wheelRL: THREE.Object3D | null = null;
    let wheelRR: THREE.Object3D | null = null;

    cloned.traverse((child) => {
      const n = child.name;
      if (!wheelFL && matchesAlias(n, WHEEL_ALIASES.fl)) wheelFL = child;
      else if (!wheelFR && matchesAlias(n, WHEEL_ALIASES.fr)) wheelFR = child;
      else if (!wheelRL && matchesAlias(n, WHEEL_ALIASES.rl)) wheelRL = child;
      else if (!wheelRR && matchesAlias(n, WHEEL_ALIASES.rr)) wheelRR = child;
      else if (!chassis && (matchesAlias(n, ['chassis', 'body', 'car_body']) || child === cloned)) {
        chassis = child;
      }
    });

    // If wheels weren't split in the source, use procedural wheels as fallback
    const fallback = buildProceduralCar();
    return {
      chassis: chassis || cloned,
      wheelFL: wheelFL || fallback.wheelFL,
      wheelFR: wheelFR || fallback.wheelFR,
      wheelRL: wheelRL || fallback.wheelRL,
      wheelRR: wheelRR || fallback.wheelRR,
      hitbox: entry.hitbox,
      wheels: entry.wheels,
    };
  }, [entry, gltf]);
}
