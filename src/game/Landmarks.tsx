import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// ─────────────────────────────────────────────────────────────────────────────
// 1. EMPIRE STATE BUILDING — Iconic Midtown Art-Deco Landmark (Height ~380m)
// ─────────────────────────────────────────────────────────────────────────────
function EmpireStateBuilding({ position = [90, 0, 220] }: { position?: [number, number, number] }) {
  const beaconRef = React.useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (beaconRef.current) {
      // Beacon pulse on spire
      const t = clock.getElapsedTime();
      beaconRef.current.intensity = Math.sin(t * 3.0) > 0.4 ? 4.0 : 0.5;
    }
  });

  return (
    <group position={position}>
      {/* 1. Base Grand Colonnade & Podium (Floors 1-6) */}
      <mesh position={[0, 16, 0]} castShadow receiveShadow>
        <boxGeometry args={[68, 32, 60]} />
        <meshStandardMaterial color="#222834" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* 2. Main Tower Lower Shaft (Floors 6-30) */}
      <mesh position={[0, 72, 0]} castShadow>
        <boxGeometry args={[52, 80, 46]} />
        <meshStandardMaterial color="#2d3546" roughness={0.65} metalness={0.3} />
      </mesh>

      {/* 3. First Major Architectural Setback (Floors 30-72) */}
      <mesh position={[0, 150, 0]} castShadow>
        <boxGeometry args={[40, 76, 36]} />
        <meshStandardMaterial color="#323c4e" roughness={0.6} metalness={0.35} />
      </mesh>

      {/* 4. Upper Tower Shaft (Floors 72-86) */}
      <mesh position={[0, 218, 0]}>
        <boxGeometry args={[30, 60, 28]} />
        <meshStandardMaterial color="#384358" roughness={0.55} metalness={0.4} />
      </mesh>

      {/* 5. 86th Floor Observatory Deck */}
      <mesh position={[0, 250, 0]}>
        <boxGeometry args={[26, 4, 24]} />
        <meshStandardMaterial color="#1f242e" roughness={0.8} />
      </mesh>

      {/* 6. Mooring Mast (Floors 86-102) */}
      <mesh position={[0, 276, 0]}>
        <cylinderGeometry args={[8, 12, 48, 16]} />
        <meshStandardMaterial color="#505e78" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* 7. Illuminated Art-Deco Crown Floodlight Bands */}
      <mesh position={[0, 252, 0]}>
        <cylinderGeometry args={[11, 13, 3, 16]} />
        <meshBasicMaterial color="#ff0055" />
      </mesh>
      <mesh position={[0, 275, 0]}>
        <cylinderGeometry args={[9, 10, 2.5, 16]} />
        <meshBasicMaterial color="#00f0ff" />
      </mesh>

      {/* 8. Iconic Steel Spire & Lightning Rod */}
      <mesh position={[0, 328, 0]}>
        <cylinderGeometry args={[0.6, 3.5, 56, 12]} />
        <meshStandardMaterial color="#ccd4e0" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* 9. Top Warning Beacon Light */}
      <mesh position={[0, 356, 0]}>
        <sphereGeometry args={[1.2, 12, 12]} />
        <meshBasicMaterial color="#ff2222" />
      </mesh>
      <pointLight ref={beaconRef} position={[0, 356, 0]} color="#ff2222" intensity={3.5} distance={150} decay={1.5} />

      {/* Spire Architectural Crown Glow */}
      <pointLight position={[0, 280, 0]} color="#00f0ff" intensity={4.5} distance={120} decay={1.8} />
      <pointLight position={[0, 252, 0]} color="#ff0055" intensity={4.5} distance={120} decay={1.8} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHRYSLER BUILDING — Art-Deco Terraced Crown & Spire (Height ~319m)
// ─────────────────────────────────────────────────────────────────────────────
function ChryslerBuilding({ position = [220, 0, 150] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main Art-Deco Tower Shaft */}
      <mesh position={[0, 100, 0]}>
        <boxGeometry args={[44, 200, 44]} />
        <meshStandardMaterial color="#2b3342" roughness={0.7} metalness={0.25} />
      </mesh>

      {/* Upper Setback */}
      <mesh position={[0, 218, 0]}>
        <boxGeometry args={[32, 36, 32]} />
        <meshStandardMaterial color="#353e4f" roughness={0.6} metalness={0.35} />
      </mesh>

      {/* Terraced Sunburst Crown Tiers (Iconic Stainless Steel Arches) */}
      <mesh position={[0, 244, 0]}>
        <cylinderGeometry args={[12, 15, 16, 8]} />
        <meshStandardMaterial color="#d4dde8" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 258, 0]}>
        <cylinderGeometry args={[8, 12, 12, 8]} />
        <meshStandardMaterial color="#e0e8f2" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, 270, 0]}>
        <cylinderGeometry args={[4, 8, 12, 8]} />
        <meshStandardMaterial color="#e8eff7" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Crown Glowing Triangular Neon Windows */}
      <mesh position={[0, 252, 0]}>
        <cylinderGeometry args={[11.5, 14.5, 2, 8]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
      <mesh position={[0, 264, 0]}>
        <cylinderGeometry args={[7.5, 11.5, 2, 8]} />
        <meshBasicMaterial color="#ff0077" />
      </mesh>

      {/* Needle Spire */}
      <mesh position={[0, 296, 0]}>
        <cylinderGeometry args={[0.4, 2.8, 40, 10]} />
        <meshStandardMaterial color="#f0f5fa" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Crown Lighting */}
      <pointLight position={[0, 265, 0]} color="#00e5ff" intensity={3.5} distance={90} decay={2.0} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TIMES SQUARE MEGA-BILLBOARDS & NEON AD DISPLAYS (Broadway & 45th)
// ─────────────────────────────────────────────────────────────────────────────
function TimesSquareBillboards() {
  const tickerMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: '#ffea00' });
  }, []);

  const videoScreenMat1 = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: '#00f0ff' });
  }, []);

  const videoScreenMat2 = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: '#ff0077' });
  }, []);

  const videoScreenMat3 = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: '#7928ca' });
  }, []);

  return (
    <group position={[-50, 0, 120]}>
      {/* 1. Curved Mega-LED Billboard Screen (West Broadway Corner) */}
      <group position={[-22, 28, 0]} rotation={[0, 0.45, 0]}>
        {/* Support structure */}
        <mesh position={[0, 0, -1]}>
          <boxGeometry args={[26, 38, 2]} />
          <meshStandardMaterial color="#111622" roughness={0.9} />
        </mesh>
        {/* Glowing High-Definition Screen */}
        <mesh position={[0, 0, 0.1]}>
          <planeGeometry args={[24, 36]} />
          <primitive object={videoScreenMat1} />
        </mesh>
        <pointLight position={[0, 0, 8]} color="#00f0ff" intensity={4.5} distance={45} decay={1.8} />
      </group>

      {/* 2. Towering Vertical Advertising Screen (East Broadway Corner) */}
      <group position={[24, 32, -8]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0, -1]}>
          <boxGeometry args={[18, 46, 2]} />
          <meshStandardMaterial color="#111622" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <planeGeometry args={[16, 44]} />
          <primitive object={videoScreenMat2} />
        </mesh>
        <pointLight position={[0, 0, 8]} color="#ff0077" intensity={4.5} distance={45} decay={1.8} />
      </group>

      {/* 3. Horizontal Ribbon Nasdaq Stock Ticker Screen */}
      <group position={[0, 12, -26]}>
        <mesh position={[0, 0, -0.6]}>
          <boxGeometry args={[42, 5, 1.2]} />
          <meshStandardMaterial color="#0c1018" />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <planeGeometry args={[40, 4]} />
          <primitive object={tickerMat} />
        </mesh>
        <pointLight position={[0, 0, 6]} color="#ffea00" intensity={3.0} distance={35} decay={2.0} />
      </group>

      {/* 4. Broadway Theater Marquee Sign */}
      <group position={[-18, 8, 32]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.5]}>
          <boxGeometry args={[22, 6, 1]} />
          <meshStandardMaterial color="#201a08" />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <planeGeometry args={[20, 5]} />
          <primitive object={videoScreenMat3} />
        </mesh>
        <pointLight position={[0, 0, 5]} color="#b829ea" intensity={3.0} distance={30} decay={2.0} />
      </group>

      {/* Times Square Ambient Street Illumination */}
      <pointLight position={[0, 16, 0]} color="#ffffff" intensity={2.5} distance={60} decay={2.0} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AUTHENTIC NYC STREET PROPS: Streetlamps, Traffic Lights, Subway Entrances
// ─────────────────────────────────────────────────────────────────────────────
function NYCStreetProps() {
  // Streetlamp model template
  const lampGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 0.18, 6.5, 8), []);
  const armGeo = useMemo(() => new THREE.BoxGeometry(2.4, 0.15, 0.15), []);
  const headGeo = useMemo(() => new THREE.CylinderGeometry(0.35, 0.45, 0.3, 10), []);
  const postMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#16221c', roughness: 0.6, metalness: 0.5 }), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffeaae' }), []);

  // Subway entrance kiosk template
  const subwayRailingMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#123321', roughness: 0.5, metalness: 0.7 }), []);
  const subwayGlobeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#00ff88' }), []);

  // Defined avenue streetlight positions along 8th Ave, Broadway, and 42nd St
  const streetlampPositions: [number, number, number][] = useMemo(() => [
    [-542, 0, 380],
    [-542, 0, 410],
    [-542, 0, 440],
    [-542, 0, 470],
    [-526, 0, 380],
    [-526, 0, 410],
    [-526, 0, 440],
    [-526, 0, 470],
    [-65, 0, 95],
    [-65, 0, 125],
    [-65, 0, 155],
    [-35, 0, 95],
    [-35, 0, 125],
    [-35, 0, 155],
    [-135, 0, 260],
    [-135, 0, 290],
    [-105, 0, 260],
    [-105, 0, 290],
  ], []);

  // Subway entrances at major subway stations
  const subwayPositions: [number, number, number, number][] = useMemo(() => [
    [-530, 0, 395, 0], // 8th Ave / 42nd St Port Authority Subway
    [-62, 0, 110, 0.4], // Times Square - 42nd St Station
    [-110, 0, 275, -0.5], // Broadway & 42nd St Station
    [90, 0, -435, 1.57], // 59th St - Columbus Circle Station
  ], []);

  // Zebra crosswalk stripes positions
  const crosswalkPositions: [number, number, number, number][] = useMemo(() => [
    [-534, 0.02, 395, 0],
    [-534, 0.02, 455, 0],
    [-50, 0.02, 105, 0.4],
    [-50, 0.02, 140, 0.4],
    [-120, 0.02, 270, -0.5],
  ], []);

  return (
    <group>
      {/* 1. Realistic NYC Streetlamps */}
      {streetlampPositions.map((pos, idx) => (
        <group key={`lamp-${idx}`} position={pos}>
          {/* Vertical Pole */}
          <mesh geometry={lampGeo} material={postMat} position={[0, 3.25, 0]} />
          {/* Overhanging Arm */}
          <mesh geometry={armGeo} material={postMat} position={[0.9, 6.3, 0]} />
          {/* Lamp Luminaire Head */}
          <mesh geometry={headGeo} material={postMat} position={[1.8, 6.1, 0]} />
          {/* Glowing Lens */}
          <mesh position={[1.8, 5.9, 0]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <primitive object={glowMat} />
          </mesh>
          {/* Warm Street Pool Light (every 2nd lamp casts real light for high performance) */}
          {idx % 2 === 0 && (
            <pointLight position={[1.8, 5.8, 0]} color="#ffe099" intensity={2.8} distance={22} decay={2.0} />
          )}
        </group>
      ))}

      {/* 2. MTA NYC Subway Entrance Railings & Green Globes */}
      {subwayPositions.map(([x, y, z, rot], idx) => (
        <group key={`subway-${idx}`} position={[x, y, z]} rotation={[0, rot, 0]}>
          {/* Cast-Iron Staircase Railing Enclosure */}
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[4.2, 1.2, 2.2]} />
            <primitive object={subwayRailingMat} />
          </mesh>
          {/* Black interior stairwell hole */}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.8, 1.8]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          {/* Subway Station Nameplate Sign */}
          <mesh position={[0, 1.3, 1.1]}>
            <boxGeometry args={[2.5, 0.4, 0.1]} />
            <meshStandardMaterial color="#080808" />
          </mesh>
          {/* Iconic Dual Glowing Green Globes */}
          <mesh position={[-1.9, 1.5, 1.0]}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <primitive object={subwayGlobeMat} />
          </mesh>
          <pointLight position={[-1.9, 1.5, 1.0]} color="#00ff88" intensity={1.8} distance={6} decay={2.0} />

          <mesh position={[1.9, 1.5, 1.0]}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <primitive object={subwayGlobeMat} />
          </mesh>
          <pointLight position={[1.9, 1.5, 1.0]} color="#00ff88" intensity={1.8} distance={6} decay={2.0} />
        </group>
      ))}

      {/* 3. Road Markings: Bold White NYC Crosswalk Stripes */}
      {crosswalkPositions.map(([x, y, z, rot], idx) => (
        <group key={`crosswalk-${idx}`} position={[x, y, z]} rotation={[0, rot, 0]}>
          {[-5, -3, -1, 1, 3, 5].map((offset) => (
            <mesh key={offset} position={[offset * 1.5, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.9, 5.0]} />
              <meshBasicMaterial color="#dfebf5" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CENTRAL PARK SOUTH PERIMETER (Trees, Stone Wall, Nature Transition)
// ─────────────────────────────────────────────────────────────────────────────
function CentralParkSouth() {
  const foliageMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#132818', roughness: 0.9 }), []);
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2c1e14', roughness: 0.9 }), []);
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#383b42', roughness: 0.8 }), []);

  const treeX = useMemo(() => [-120, -80, -40, 0, 40, 80, 120, 160, 200, 240], []);

  return (
    <group position={[50, 0, -450]}>
      {/* Historic Schist Stone Perimeter Wall along 59th St */}
      <mesh position={[60, 0.75, -5]}>
        <boxGeometry args={[400, 1.5, 1.2]} />
        <primitive object={wallMat} />
      </mesh>

      {/* Central Park Tree Line */}
      {treeX.map((tx, idx) => (
        <group key={`tree-${idx}`} position={[tx, 0, -14 - (idx % 3) * 6]}>
          {/* Tree Trunk */}
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.35, 0.55, 6, 8]} />
            <primitive object={trunkMat} />
          </mesh>
          {/* Foliage Canopy */}
          <mesh position={[0, 7.5, 0]}>
            <sphereGeometry args={[4.2 + (idx % 2), 10, 10]} />
            <primitive object={foliageMat} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LANDMARKS EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function Landmarks() {
  return (
    <group>
      {/* 1. Empire State Building (Midtown 5th Ave) */}
      <EmpireStateBuilding />

      {/* 2. Chrysler Building (Lexington & 42nd) */}
      <ChryslerBuilding />

      {/* 3. Times Square Mega-Billboards (Broadway & 45th) */}
      <TimesSquareBillboards />

      {/* 4. NYC Streetlamps, Subway Entrances, & Crosswalks */}
      <NYCStreetProps />

      {/* 5. Central Park South (59th St Promenade) */}
      <CentralParkSouth />
    </group>
  );
}
