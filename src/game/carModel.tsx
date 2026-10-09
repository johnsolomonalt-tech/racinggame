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
  rotationY?: number;
}

export interface ResolvedCarModel {
  chassis: THREE.Object3D;
  wheelFL: THREE.Object3D;
  wheelFR: THREE.Object3D;
  wheelRL: THREE.Object3D;
  wheelRR: THREE.Object3D;
  hasSeparateWheels: boolean;
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
    halfExtents: [0.96, 0.44, 2.20],
    center: [0, 0.74, 0],
  },
  wheels: {
    radius: 0.35,
    positions: {
      fl: [-0.88, 0.58, -1.35],
      fr: [0.88, 0.58, -1.35],
      rl: [-0.88, 0.58, 1.35],
      rr: [0.88, 0.58, 1.35],
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
    hasSeparateWheels: true,
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
      mats.forEach((mat) => {
        if (!mat) return;
        const name = (mat.name || '').toLowerCase();
        const objName = mesh.name.toLowerCase();

        // Ensure reflection probe reacts strongly
        if ('envMapIntensity' in mat) {
          (mat as THREE.MeshStandardMaterial).envMapIntensity = 1.35;
        }

        // Tyres & rubbers
        if (name.includes('tire') || name.includes('tyre') || name.includes('rubber') || objName.includes('wheel')) {
          if ('roughness' in mat) (mat as THREE.MeshStandardMaterial).roughness = 0.85;
          if ('metalness' in mat) (mat as THREE.MeshStandardMaterial).metalness = 0.05;
          return;
        }

        // Glass & windshields
        if (name.includes('glass') || name.includes('window') || name.includes('windshield')) {
          mat.transparent = true;
          mat.opacity = 0.75;
          if ('roughness' in mat) (mat as THREE.MeshStandardMaterial).roughness = 0.05;
          if ('metalness' in mat) (mat as THREE.MeshStandardMaterial).metalness = 0.1;
          return;
        }

        // Body paint: boost clearcoat and depth while preserving all decals/maps
        if (
          name.includes('paint') ||
          name.includes('body') ||
          name.includes('car') ||
          objName.includes('chassis') ||
          name.includes('exterior') ||
          name.includes('ext_')
        ) {
          if ('clearcoat' in mat) {
            (mat as THREE.MeshPhysicalMaterial).clearcoat = 1.0;
            (mat as THREE.MeshPhysicalMaterial).clearcoatRoughness = 0.06;
          }
          if ('roughness' in mat) {
            const curR = (mat as THREE.MeshStandardMaterial).roughness ?? 0.3;
            (mat as THREE.MeshStandardMaterial).roughness = THREE.MathUtils.clamp(curR, 0.12, 0.38);
          }
          if ('metalness' in mat) {
            const curM = (mat as THREE.MeshStandardMaterial).metalness ?? 0.6;
            (mat as THREE.MeshStandardMaterial).metalness = THREE.MathUtils.clamp(curM, 0.5, 0.92);
          }
        }
      });
    }
  });
}

function isolateWheel(wheelObj: THREE.Object3D): { pivot: THREE.Group; center: THREE.Vector3; radius: number } {
  const pivot = new THREE.Group();
  wheelObj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wheelObj);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = Math.max(0.25, Math.min(0.48, Math.min(size.y, size.z) / 2 || 0.35));

  if (wheelObj.parent) {
    wheelObj.parent.remove(wheelObj);
  }

  // Position wheel mesh relative to pivot center so it rotates cleanly
  wheelObj.position.sub(center);
  pivot.add(wheelObj);

  return { pivot, center, radius };
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

    // 1. Compute bounding box and normalize orientation
    cloned.updateMatrixWorld(true);
    const initialBox = new THREE.Box3().setFromObject(cloned);
    const initialSize = new THREE.Vector3();
    initialBox.getSize(initialSize);

    // Handle Blender Z-up vs Y-up export
    if (initialSize.y > initialSize.z * 1.2 && initialSize.y > initialSize.x * 1.2) {
      cloned.rotation.x = -Math.PI / 2;
      cloned.updateMatrixWorld(true);
    } else if (initialSize.x > initialSize.z * 1.3 && initialSize.x > initialSize.y * 1.3) {
      cloned.rotation.y = Math.PI / 2;
      cloned.updateMatrixWorld(true);
    }

    // Apply per-car manifest yaw rotation (to face Three.js forward -Z)
    if (entry.rotationY) {
      cloned.rotation.y += entry.rotationY;
      cloned.updateMatrixWorld(true);
    }

    // 2. Scale normalization based on authentic car length (entry.hitbox.halfExtents[2] * 2)
    const orientedBox = new THREE.Box3().setFromObject(cloned);
    const orientedSize = new THREE.Vector3();
    orientedBox.getSize(orientedSize);

    const targetLength = entry.hitbox.halfExtents[2] * 2;
    const currentLength = Math.max(0.1, orientedSize.z);
    const s = targetLength / currentLength;
    cloned.scale.set(s, s, s);
    cloned.updateMatrixWorld(true);

    // 3. Ground and Center chassis
    // Center at (0, 0) and place bottom of tires at Y = 0
    const finalBox = new THREE.Box3().setFromObject(cloned);
    const currentCenter = new THREE.Vector3();
    finalBox.getCenter(currentCenter);

    const chassisContainer = new THREE.Group();
    cloned.position.set(-currentCenter.x, -finalBox.min.y, -currentCenter.z);
    chassisContainer.add(cloned);
    chassisContainer.updateMatrixWorld(true);

    return {
      chassis: chassisContainer,
      wheelFL: new THREE.Group(),
      wheelFR: new THREE.Group(),
      wheelRL: new THREE.Group(),
      wheelRR: new THREE.Group(),
      hasSeparateWheels: false,
      hitbox: entry.hitbox,
      wheels: entry.wheels,
    };
  }, [entry, gltf]);
}
