import { useEffect } from 'react';
import { type TrackDef } from './vehicleState';
import { setTrack, FALLBACK_TRACK } from './trackRuntime';

export default function Track() {
  // Load default spawn points from track definition if available
  useEffect(() => {
    fetch('/city/track.json')
      .then((r) => r.json())
      .then((data: TrackDef) => {
        setTrack(data);
      })
      .catch(() => {
        setTrack(FALLBACK_TRACK);
      });
  }, []);

  // Open-world free roam: clear roads with no racing arches or lap blockers
  return null;
}
