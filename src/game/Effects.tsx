import { useMemo } from 'react';
import * as THREE from 'three';
import {
  EffectComposer,
  Bloom,
  SSR,
  LUT,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

interface EffectsProps {
  enableSSR?: boolean;
}

/** Generate a custom cinematic teal-and-orange 3D LUT DataTexture */
function createCinematicLUT(size = 16): THREE.Data3DTexture {
  const data = new Float32Array(size * size * size * 4);
  let idx = 0;

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let r = x / (size - 1);
        let g = y / (size - 1);
        let b = z / (size - 1);

        // Teal shadows, warm orange highlights
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum < 0.5) {
          const t = 1.0 - lum / 0.5;
          r = Math.max(0, r - 0.08 * t);
          g = Math.min(1, g + 0.02 * t);
          b = Math.min(1, b + 0.12 * t);
        } else {
          const t = (lum - 0.5) / 0.5;
          r = Math.min(1, r + 0.12 * t);
          g = Math.min(1, g + 0.04 * t);
          b = Math.max(0, b - 0.06 * t);
        }

        r = r * r * (3 - 2 * r);
        g = g * g * (3 - 2 * g);
        b = b * b * (3 - 2 * b);

        data[idx++] = THREE.MathUtils.clamp(r, 0, 1);
        data[idx++] = THREE.MathUtils.clamp(g, 0, 1);
        data[idx++] = THREE.MathUtils.clamp(b, 0, 1);
        data[idx++] = 1.0;
      }
    }
  }

  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.FloatType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

export default function Effects({ enableSSR = true }: EffectsProps) {
  const lutTexture = useMemo(() => createCinematicLUT(16), []);

  return (
    <EffectComposer multisampling={0} enableNormalPass={enableSSR}>
      <ToneMapping mode={THREE.ACESFilmicToneMapping} />
      <LUT lut={lutTexture} />
      <Bloom
        luminanceThreshold={1.1}
        luminanceSmoothing={0.3}
        intensity={0.65}
        mipmapBlur
      />
      {enableSSR ? (
        <SSR
          intensity={0.3}
          maxRoughness={0.55}
          thickness={4.0}
          ior={1.4}
          maxDepthDifference={6}
          STRETCH_MISSED_RAYS={false}
          ENABLE_BLUR={true}
          blurMix={0.75}
          blurSharpness={3}
          blurKernelSize={8}
          MAX_STEPS={24}
          NUM_BINARY_SEARCH_STEPS={4}
        />
      ) : (
        <></>
      )}
      <Vignette eskil={false} offset={0.25} darkness={0.4} />
    </EffectComposer>
  );
}
