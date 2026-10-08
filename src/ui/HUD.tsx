import { useEffect, useRef } from 'react';
import { vehicleState } from '../game/vehicleState';
import { useGame } from '../state/store';
import './hud.css';

export default function HUD() {
  const phase = useGame((s) => s.phase);
  const lap = useGame((s) => s.lap);
  const totalLaps = useGame((s) => s.totalLaps);
  const bestLap = useGame((s) => s.bestLap);
  const driftScore = useGame((s) => s.driftScore);
  const driftCombo = useGame((s) => s.driftCombo);
  const lapStartedAt = useGame((s) => s.lapStartedAt);

  // Direct DOM refs for zero-re-render high frequency HUD updates
  const speedRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLDivElement>(null);
  const rpmBarRef = useRef<HTMLDivElement>(null);
  const lapTimerRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId: number;

    const updateHUD = () => {
      // 1. Speedometer
      const speed = Math.round(Math.abs(vehicleState.speedKmh));
      if (speedRef.current) {
        speedRef.current.textContent = String(speed);
      }

      // 2. Needle rotation
      if (needleRef.current) {
        const deg = Math.min(240, (speed / 240) * 240) - 120;
        needleRef.current.style.transform = `rotate(${deg}deg)`;
      }

      // 3. Gear
      if (gearRef.current) {
        gearRef.current.textContent = String(vehicleState.gear);
      }

      // 4. RPM bar
      if (rpmBarRef.current) {
        rpmBarRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, vehicleState.rpm))})`;
      }

      // 5. Lap Timer
      if (lapTimerRef.current && lapStartedAt > 0 && phase === 'racing') {
        const elapsed = Math.max(0, performance.now() - lapStartedAt);
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        const ms = Math.floor((elapsed % 1000) / 10);
        lapTimerRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
      }

      animId = requestAnimationFrame(updateHUD);
    };

    animId = requestAnimationFrame(updateHUD);
    return () => cancelAnimationFrame(animId);
  }, [phase, lapStartedAt]);

  const formatTime = (ms: number | null) => {
    if (!ms) return '--:--.--';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const msec = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(msec).padStart(2, '0')}`;
  };

  if (phase !== 'racing' && phase !== 'countdown') return null;

  return (
    <div className="hud-container">
      {/* Top Bar: Lap Counter & Lap Timers */}
      <div className="hud-top">
        <div className="hud-card">
          <span className="hud-label">LAP</span>
          <span className="hud-value-accent">
            {Math.min(lap + 1, totalLaps)} / {totalLaps}
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-label">CURRENT</span>
          <span ref={lapTimerRef} className="hud-value">
            00:00.00
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-label">BEST</span>
          <span className="hud-value">{formatTime(bestLap)}</span>
        </div>
      </div>

      {/* Center Top: Drift Score & Live Combo */}
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

      {/* Bottom Right: High-tech Speedometer & Tachometer */}
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

      {/* Controls Hint */}
      <div className="hud-controls-hint">
        WASD / Arrows: Drive | Space: Drift Handbrake | R: Respawn | C: Camera
      </div>
    </div>
  );
}
