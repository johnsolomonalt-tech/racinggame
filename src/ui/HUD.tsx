import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { vehicleState } from '../game/vehicleState';
import { useGame } from '../state/store';
import { OPEN_WORLD_SPAWNS, teleportTo } from '../game/trackRuntime';
import type { CarManifestEntry } from '../game/carModel';
import './hud.css';

interface HUDProps {
  cars: CarManifestEntry[];
  selectedCarIndex: number;
  onSelectCar: (index: number) => void;
}

export default function HUD({ cars, selectedCarIndex, onSelectCar }: HUDProps) {
  const phase = useGame((s) => s.phase);
  const driftScore = useGame((s) => s.driftScore);
  const driftCombo = useGame((s) => s.driftCombo);

  // Modals state
  const [garageOpen, setGarageOpen] = useState(false);
  const [fastTravelOpen, setFastTravelOpen] = useState(false);

  // Direct DOM refs for 60fps zero-react-render updates
  const speedRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLDivElement>(null);
  const rpmBarRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const streetRef = useRef<HTMLSpanElement>(null);
  const compassRef = useRef<HTMLSpanElement>(null);

  // Listen for G and T hotkeys
  useEffect(() => {
    const handleToggleGarage = () => setGarageOpen((prev) => !prev);
    const handleToggleFastTravel = () => setFastTravelOpen((prev) => !prev);

    window.addEventListener('toggle-garage', handleToggleGarage);
    window.addEventListener('toggle-fast-travel', handleToggleFastTravel);

    return () => {
      window.removeEventListener('toggle-garage', handleToggleGarage);
      window.removeEventListener('toggle-fast-travel', handleToggleFastTravel);
    };
  }, []);

  // High-frequency 60 FPS update loop
  useEffect(() => {
    let animId: number;

    const fwdVec = new THREE.Vector3();
    const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    const updateHUD = () => {
      // 1. Speedometer
      const speed = Math.round(Math.abs(vehicleState.speedKmh));
      if (speedRef.current) {
        speedRef.current.textContent = String(speed);
      }

      // 2. Needle rotation (-120deg to +120deg)
      if (needleRef.current) {
        const deg = Math.min(240, (speed / 240) * 240) - 120;
        needleRef.current.style.transform = `rotate(${deg}deg)`;
      }

      // 3. Gear
      if (gearRef.current) {
        gearRef.current.textContent = String(vehicleState.gear);
      }

      // 4. Tachometer / RPM bar
      if (rpmBarRef.current) {
        rpmBarRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, vehicleState.rpm))})`;
      }

      // 5. GPS Street Location & Compass Heading
      const p = vehicleState.position;
      let street = 'MIDTOWN MANHATTAN';

      if (p.x < -320 && p.z > 250) {
        street = '8TH AVENUE STRIP • MIDTOWN WEST';
      } else if (p.x >= -320 && p.x <= 20 && p.z > 150) {
        street = 'TIMES SQUARE • BROADWAY & 7TH AVE';
      } else if (p.x > 20 && p.z > 150) {
        street = 'GRAND CENTRAL • 42ND STREET';
      } else if (p.z < -300) {
        street = 'CENTRAL PARK SOUTH • 59TH STREET';
      } else if (p.z >= -300 && p.z <= 150) {
        street = 'ROCKEFELLER PLAZA • 5TH AVENUE';
      }

      if (streetRef.current && streetRef.current.textContent !== street) {
        streetRef.current.textContent = street;
      }

      // Compass heading
      if (compassRef.current) {
        fwdVec.set(0, 0, -1).applyQuaternion(vehicleState.quaternion);
        const headingRad = Math.atan2(fwdVec.x, fwdVec.z); // -PI..PI
        const headingNorm = (headingRad + Math.PI) / (Math.PI * 2); // 0..1
        const dirIndex = Math.round(headingNorm * 8) % 8;
        compassRef.current.textContent = DIRECTIONS[dirIndex];
      }

      animId = requestAnimationFrame(updateHUD);
    };

    animId = requestAnimationFrame(updateHUD);
    return () => cancelAnimationFrame(animId);
  }, []);

  if (phase !== 'racing' && phase !== 'roam') return null;

  const activeCarName =
    selectedCarIndex >= 0 && cars[selectedCarIndex]
      ? cars[selectedCarIndex].name
      : 'Apex GT Prototype';

  return (
    <div className="hud-container">
      {/* Top Left: Open World Street & Compass Indicator */}
      <div className="hud-top">
        <div className="hud-card location-card">
          <div className="location-header">
            <span className="location-pin">📍</span>
            <span ref={streetRef} className="location-name">
              TIMES SQUARE • BROADWAY & 7TH AVE
            </span>
            <span ref={compassRef} className="compass-badge">
              N
            </span>
          </div>
          <span className="location-sub">OPEN WORLD FREE ROAM</span>
        </div>
      </div>

      {/* Top Center: Drift Points Counter */}
      <div className="hud-drift">
        <div className="hud-drift-score">
          DRIFT: <span>{driftScore}</span>
        </div>
        {driftCombo > 0 && (
          <div className="hud-drift-combo">
            +{driftCombo} PTS
          </div>
        )}
      </div>

      {/* Top Right: Quick Toolbar (Garage & Fast Travel) */}
      <div className="hud-top-right">
        <div className="hud-vehicle-badge">
          <span className="badge-label">VEHICLE</span>
          <span className="badge-car">{activeCarName}</span>
        </div>
        <button
          className="hud-action-btn"
          onClick={() => {
            setGarageOpen(true);
            setFastTravelOpen(false);
          }}
        >
          🚗 GARAGE <span className="key-hint">[G]</span>
        </button>
        <button
          className="hud-action-btn"
          onClick={() => {
            setFastTravelOpen(true);
            setGarageOpen(false);
          }}
        >
          🗽 MAP / TRAVEL <span className="key-hint">[T]</span>
        </button>
      </div>

      {/* Bottom Right: Cockpit Speedometer & Tachometer */}
      <div className="hud-gauge">
        <div className="gauge-dial">
          <div ref={needleRef} className="gauge-needle" />
          <div className="gauge-inner">
            <div ref={gearRef} className="gear-display">
              1
            </div>
            <div ref={speedRef} className="speed-digits">
              0
            </div>
            <div className="speed-unit">KM/H</div>
          </div>
        </div>
        <div className="rpm-bar-container">
          <div ref={rpmBarRef} className="rpm-bar" />
        </div>
      </div>

      {/* Bottom Center: Controls Legend */}
      <div className="hud-controls-hint">
        WASD / Arrows: Drive | Space: Drift | R: Reset Car | C: Camera | G: Garage | T: Fast Travel | M: Audio
      </div>

      {/* Slide-out Garage Modal */}
      {garageOpen && (
        <div className="modal-backdrop" onClick={() => setGarageOpen(false)}>
          <div className="garage-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏎️ MANHATTAN GARAGE</h2>
              <button className="close-btn" onClick={() => setGarageOpen(false)}>✕</button>
            </div>
            <p className="modal-sub">SELECT A VEHICLE TO DRIVE INSTANTLY</p>

            <div className="garage-car-grid">
              <div
                className={`garage-car-card ${selectedCarIndex === -1 ? 'active' : ''}`}
                onClick={() => {
                  onSelectCar(-1);
                  setGarageOpen(false);
                }}
              >
                <div className="car-title">Apex GT Prototype</div>
                <div className="car-specs">520 HP • RWD • 1,200 KG • 280 KM/H</div>
                <div className="car-desc">Built-in high downforce concept prototype.</div>
              </div>

              {cars.map((car, idx) => (
                <div
                  key={car.id}
                  className={`garage-car-card ${selectedCarIndex === idx ? 'active' : ''}`}
                  onClick={() => {
                    onSelectCar(idx);
                    setGarageOpen(false);
                  }}
                >
                  <div className="car-title">{car.name}</div>
                  <div className="car-specs">
                    {car.id === 'bmw-m4-gt3' && '590 HP • RWD • 1,260 KG • 295 KM/H'}
                    {car.id === 'ferrari-f40' && '478 HP • RWD • 1,100 KG • 324 KM/H'}
                    {car.id === 'nissan-skyline-r34' && '600 HP • AWD • 1,420 KG • 310 KM/H'}
                    {car.id === 'delorean-dmc12' && '280 HP • RWD • 1,230 KG • 220 KM/H'}
                    {car.id === 'porsche-996-gt300' && '450 HP • RWD • 1,150 KG • 290 KM/H'}
                    {car.id === 'porsche-911-turbo' && '330 HP • RWD • 1,195 KG • 260 KM/H'}
                    {car.id === 'ford-raptor-r' && '700 HP • AWD • 2,700 KG • 210 KM/H'}
                  </div>
                  <div className="car-desc">{car.credit || 'High performance vehicle'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fast Travel Modal */}
      {fastTravelOpen && (
        <div className="modal-backdrop" onClick={() => setFastTravelOpen(false)}>
          <div className="travel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🗽 MANHATTAN FAST TRAVEL</h2>
              <button className="close-btn" onClick={() => setFastTravelOpen(false)}>✕</button>
            </div>
            <p className="modal-sub">TELEPORT TO ICONIC NYC DRIVING LOCATIONS</p>

            <div className="travel-grid">
              {OPEN_WORLD_SPAWNS.map((spawn, idx) => (
                <button
                  key={spawn.id}
                  className="travel-btn"
                  onClick={() => {
                    teleportTo(idx);
                    setFastTravelOpen(false);
                  }}
                >
                  <div className="travel-name">{spawn.name}</div>
                  <div className="travel-coord">Coords: [{spawn.pos[0]}, {spawn.pos[2]}]</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
