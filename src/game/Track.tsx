import { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { vehicleState, type TrackDef } from './vehicleState';
import { trackRuntime, setTrack } from './trackRuntime';
import { useGame } from '../state/store';

export const FALLBACK_TRACK: TrackDef = {
  checkpoints: [
    [-512.92, 417.58],
    [-441.62, 460.88],
    [-310.5, 540.5],
    [-179.38, 620.12],
    [-48.25, 699.75],
    [34.82, 545.25],
    [117.89, 390.75],
    [200.95, 236.25],
    [284.02, 81.75],
    [139.11, 4.41],
    [-5.8, -72.93],
    [-89.15, 83.17],
    [-172.5, 239.27],
  ],
  gateRadius: 18,
  start: {
    x: -534.56,
    y: 1.2,
    z: 404.4,
    yaw: 0.54,
  },
};

export default function Track() {
  const [trackDef, setTrackDef] = useState<TrackDef>(FALLBACK_TRACK);
  const phase = useGame((s) => s.phase);
  const nextCheckpoint = useGame((s) => s.nextCheckpoint);
  const setGame = useGame((s) => s.set);

  // Load track definition from /city/track.json
  useEffect(() => {
    fetch('/city/track.json')
      .then((r) => r.json())
      .then((data: TrackDef) => {
        setTrackDef(data);
        setTrack(data);
        setGame({ checkpointCount: data.checkpoints.length });
      })
      .catch(() => {
        setTrack(FALLBACK_TRACK);
        setGame({ checkpointCount: FALLBACK_TRACK.checkpoints.length });
      });
  }, [setGame]);

  const lastPassedIndex = useRef(0);

  useFrame(() => {
    if (phase !== 'racing') return;

    const px = vehicleState.position.x;
    const pz = vehicleState.position.z;
    const cps = trackDef.checkpoints;
    const targetIdx = nextCheckpoint % cps.length;
    const cp = cps[targetIdx];

    const dx = cp[0] - px;
    const dz = cp[1] - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= trackDef.gateRadius) {
      // Passed next checkpoint
      const store = useGame.getState();
      const isStartFinish = targetIdx === 0;

      // Update respawn checkpoint point
      const nextIdx = (targetIdx + 1) % cps.length;
      const nextCp = cps[nextIdx];
      const yaw = Math.atan2(cp[0] - nextCp[0], cp[1] - nextCp[1]);
      trackRuntime.lastCheckpoint = {
        position: [cp[0], 1.2, cp[1]],
        yaw,
      };

      if (isStartFinish && lastPassedIndex.current !== 0) {
        // Completed a lap!
        const now = performance.now();
        const lapDuration = now - store.lapStartedAt;
        const newTimes = [...store.lapTimes, lapDuration];
        const newBest = store.bestLap ? Math.min(store.bestLap, lapDuration) : lapDuration;
        const nextLap = store.lap + 1;

        if (nextLap >= store.totalLaps) {
          // Finished race!
          store.set({
            lap: nextLap,
            phase: 'finished',
            lapTimes: newTimes,
            bestLap: newBest,
          });
        } else {
          store.set({
            lap: nextLap,
            lapStartedAt: now,
            lapTimes: newTimes,
            bestLap: newBest,
            nextCheckpoint: 1,
          });
        }
      } else {
        store.set({ nextCheckpoint: (targetIdx + 1) % cps.length });
      }

      lastPassedIndex.current = targetIdx;
    }
  });

  return (
    <group>
      {/* Visual neon checkpoint gates */}
      {trackDef.checkpoints.map((pt, idx) => {
        const isFinish = idx === 0;
        const isNext = idx === nextCheckpoint % trackDef.checkpoints.length;
        const color = isFinish ? '#ff0077' : isNext ? '#00f0ff' : '#334466';

        return (
          <group key={idx} position={[pt[0], 4, pt[1]]}>
            {/* Gate Arch */}
            <mesh>
              <torusGeometry args={[trackDef.gateRadius, 0.25, 8, 24, Math.PI]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isNext || isFinish ? 2.5 : 0.4}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
