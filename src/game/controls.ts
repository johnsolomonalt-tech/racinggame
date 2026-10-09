/**
 * Keyboard input as a module-level mutable object — reading it never triggers
 * React re-renders. Call `initControls()` once (App does this).
 */
import { respawnAtCheckpoint } from './trackRuntime';
import { audioEngine } from './audio';

export const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  handbrake: false,
};

/** Camera modes cycled with C. */
export const cameraModes = ['chase', 'far', 'hood'] as const;
export type CameraMode = (typeof cameraModes)[number];
export const controlState = {
  cameraMode: 'chase' as CameraMode,
  /** Set false outside of the 'racing' phase (App keeps this in sync). */
  enabled: false,
  /** Forced handbrake (countdown). */
  forceHandbrake: true,
};

const map: Record<string, keyof typeof keys> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'handbrake',
};

let initialised = false;

function onKey(e: KeyboardEvent, down: boolean) {
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
  const k = map[e.code];
  if (k) {
    keys[k] = down;
    e.preventDefault();
    return;
  }
  // Only trigger action commands on keydown, not on keyup
  if (!down) return;

  if (e.code === 'KeyR' && controlState.enabled) respawnAtCheckpoint();
  if (e.code === 'KeyM') {
    audioEngine.toggleMute();
    window.dispatchEvent(new CustomEvent('toggle-mute'));
  }
  if (e.code === 'KeyG') window.dispatchEvent(new CustomEvent('toggle-garage'));
  if (e.code === 'KeyT') window.dispatchEvent(new CustomEvent('toggle-fast-travel'));
  if (e.code === 'KeyC') {
    const i = cameraModes.indexOf(controlState.cameraMode);
    controlState.cameraMode = cameraModes[(i + 1) % cameraModes.length];
  }
}

function clearAll() {
  for (const k of Object.keys(keys) as (keyof typeof keys)[]) keys[k] = false;
}

export function initControls() {
  if (initialised) return;
  initialised = true;
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  window.addEventListener('blur', clearAll);
}

/** Effective driver input after the phase gate. */
export function readInput() {
  const on = controlState.enabled;
  return {
    throttle: on && keys.forward ? 1 : 0,
    brake: on && keys.backward ? 1 : 0,
    steer: on ? (keys.left ? 1 : 0) - (keys.right ? 1 : 0) : 0,
    handbrake: controlState.forceHandbrake || (on && keys.handbrake),
  };
}
