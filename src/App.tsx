import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

import City from './game/City';
import Track from './game/Track';
import Vehicle from './game/Vehicle';
import ChaseCamera from './game/ChaseCamera';
import Lights from './game/Lights';
import Effects from './game/Effects';
import HUD from './ui/HUD';
import { initControls, controlState } from './game/controls';
import { useGame } from './state/store';
import { respawnAtStart } from './game/trackRuntime';
import { useProgress } from '@react-three/drei';
import type { CarManifestEntry } from './game/carModel';
import { audioEngine } from './game/audio';

function AssetLoadingIndicator() {
  const { active, progress } = useProgress();
  if (!active && progress >= 100) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        background: 'rgba(10, 15, 25, 0.9)',
        border: '1px solid rgba(0, 240, 255, 0.5)',
        boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
        borderRadius: '8px',
        padding: '10px 20px',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#00f0ff', letterSpacing: '0.15em' }}>
        {progress < 100 ? `STREAMING 3D ASSETS... ${Math.round(progress)}%` : 'READY'}
      </div>
      <div
        style={{
          width: '220px',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(5, progress)}%`,
            background: 'linear-gradient(90deg, #00f0ff, #ff0077)',
            transition: 'width 0.15s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function App() {
  const phase = useGame((s) => s.phase);
  const setGame = useGame((s) => s.set);
  const bestLap = useGame((s) => s.bestLap);
  const driftScore = useGame((s) => s.driftScore);

  const [availableCars, setAvailableCars] = useState<CarManifestEntry[]>([]);
  const [selectedCarIndex, setSelectedCarIndex] = useState<number>(-1);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [enableSSR, setEnableSSR] = useState<boolean>(false);

  // Initialize controls once
  useEffect(() => {
    initControls();
  }, []);

  // Fetch cars manifest
  useEffect(() => {
    fetch('/cars/cars.json')
      .then((r) => r.json())
      .then((data: CarManifestEntry[]) => {
        setAvailableCars(data);
      })
      .catch(() => {});
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (phase === 'countdown') {
      controlState.enabled = false;
      controlState.forceHandbrake = true;
      setCountdownNum(3);

      const t1 = setTimeout(() => setCountdownNum(2), 1000);
      const t2 = setTimeout(() => setCountdownNum(1), 2000);
      const t3 = setTimeout(() => {
        const now = performance.now();
        setGame({
          phase: 'racing',
          raceStartedAt: now,
          lapStartedAt: now,
          lap: 0,
          lapTimes: [],
          bestLap: null,
          driftScore: 0,
          driftCombo: 0,
          nextCheckpoint: 1,
        });
        controlState.enabled = true;
        controlState.forceHandbrake = false;
      }, 3000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else if (phase === 'racing') {
      controlState.enabled = true;
      controlState.forceHandbrake = false;
    } else {
      controlState.enabled = false;
      controlState.forceHandbrake = true;
    }
  }, [phase, setGame]);

  const handleStartRace = () => {
    audioEngine.init();
    respawnAtStart();
    setGame({ phase: 'countdown' });
  };

  const handleRestart = () => {
    respawnAtStart();
    setGame({ phase: 'menu' });
  };

  const currentCar = selectedCarIndex >= 0 && availableCars[selectedCarIndex]
    ? availableCars[selectedCarIndex]
    : null;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{
          powerPreference: 'high-performance',
          antialias: false,
        }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.NoToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          scene.background = new THREE.Color('#090f1d');
          scene.fog = new THREE.FogExp2('#090f1d', 0.0007);
        }}
        camera={{ position: [0, 4, 10], fov: 60, near: 0.2, far: 2000 }}
      >
        <Suspense fallback={null}>
          <Physics timeStep={1 / 60} interpolate>
            <City />
            <Track />
            <Vehicle key={currentCar ? currentCar.id : 'procedural'} manifestEntry={currentCar} />
          </Physics>

          <ChaseCamera />
          <Lights />
          <Effects enableSSR={enableSSR} />
        </Suspense>
      </Canvas>

      {/* HTML / CSS HUD Layer (Outside Canvas) */}
      <HUD />

      {/* Asset Loading Progress Bar */}
      <AssetLoadingIndicator />

      {/* Countdown Overlay */}
      {phase === 'countdown' && (
        <div style={styles.overlay}>
          <div style={styles.countdown}>{countdownNum}</div>
        </div>
      )}

      {/* Main Menu Overlay */}
      {phase === 'menu' && (
        <div style={styles.overlay}>
          <div style={styles.menuBox}>
            <h1 style={styles.title}>NYC MIDTOWN GP</h1>
            <p style={styles.subtitle}>HIGH-PERFORMANCE WEB RACER</p>

            <div style={styles.section}>
              <div style={styles.label}>SELECT VEHICLE:</div>
              <div style={styles.carList}>
                <button
                  style={{
                    ...styles.carButton,
                    borderColor: selectedCarIndex === -1 ? '#00f0ff' : 'rgba(255,255,255,0.2)',
                  }}
                  onClick={() => setSelectedCarIndex(-1)}
                >
                  🏎️ Apex GT Prototype (Built-in)
                </button>
                {availableCars.map((c, i) => (
                  <button
                    key={c.id}
                    style={{
                      ...styles.carButton,
                      borderColor: selectedCarIndex === i ? '#00f0ff' : 'rgba(255,255,255,0.2)',
                    }}
                    onClick={() => setSelectedCarIndex(i)}
                  >
                    🚗 {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.label}>GRAPHICS QUALITY:</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  style={{
                    ...styles.qualityBtn,
                    borderColor: enableSSR ? '#00f0ff' : 'rgba(255,255,255,0.2)',
                  }}
                  onClick={() => setEnableSSR(true)}
                >
                  HIGH (SSR Reflections)
                </button>
                <button
                  style={{
                    ...styles.qualityBtn,
                    borderColor: !enableSSR ? '#00f0ff' : 'rgba(255,255,255,0.2)',
                  }}
                  onClick={() => setEnableSSR(false)}
                >
                  PERFORMANCE (Fast)
                </button>
              </div>
            </div>

            <button style={styles.startBtn} onClick={handleStartRace}>
              START RACE
            </button>
          </div>
        </div>
      )}

      {/* Results / Finished Overlay */}
      {phase === 'finished' && (
        <div style={styles.overlay}>
          <div style={styles.menuBox}>
            <h1 style={{ ...styles.title, color: '#00f0ff' }}>RACE FINISHED!</h1>
            <div style={{ margin: '16px 0', fontSize: '18px' }}>
              <div>Best Lap: {bestLap ? (bestLap / 1000).toFixed(2) + 's' : '--'}</div>
              <div style={{ marginTop: '8px' }}>Total Drift Score: {driftScore} pts</div>
            </div>

            <button style={styles.startBtn} onClick={handleRestart}>
              RACE AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(5, 8, 16, 0.75)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    color: '#fff',
    userSelect: 'none',
  },
  menuBox: {
    background: 'rgba(15, 20, 32, 0.95)',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)',
    borderRadius: '12px',
    padding: '36px 48px',
    textAlign: 'center',
    maxWidth: '480px',
    width: '90%',
  },
  title: {
    fontSize: '32px',
    fontWeight: 900,
    letterSpacing: '0.1em',
    margin: 0,
    color: '#fff',
  },
  subtitle: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: '#00f0ff',
    marginTop: '6px',
    marginBottom: '24px',
  },
  section: {
    marginBottom: '20px',
    textAlign: 'left',
  },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#8899aa',
    letterSpacing: '0.1em',
    marginBottom: '8px',
  },
  carList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  carButton: {
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  qualityBtn: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    padding: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
  },
  startBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(90deg, #00f0ff, #0088ff)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '16px',
    fontWeight: 900,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    marginTop: '12px',
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
  },
  countdown: {
    fontSize: '120px',
    fontWeight: 900,
    color: '#00f0ff',
    textShadow: '0 0 30px #00f0ff',
  },
};
