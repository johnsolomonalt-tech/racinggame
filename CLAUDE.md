# Project Brief: High-Fidelity Web-Native 3D Racing Game

## Target Stack & Architecture
- **Hosting & Deployment Target:** Vercel (`vercel.json` already configured with 1-year immutable edge asset caching and security headers).
- **Core Technology Stack:**
  - React 18 + Vite + TypeScript
  - React Three Fiber (`@react-three/fiber`) & Three.js
  - `@react-three/drei` (loaders, camera helpers, environment)
  - Rapier Physics (`@react-three/rapier`) for rigid-body simulation & raycast vehicle physics
  - Postprocessing (`@react-three/postprocessing`)
  - State & UI: Zustand + HTML/CSS Overlay (Separated from WebGL canvas)

---

## 1. Performance Budget & File Constraints
- **Initial Web Bundle:** < 5 MB (JS/CSS code-split via Vite `manualChunks`).
- **Environment Asset Bundle (`.glb`):** Max 35 MB total.
- **Vehicle Asset Bundle (`.glb`):** Max 5 MB per vehicle (including textures).
- **Runtime Memory:** Max 1.5 GB single tab memory footprint.
- **Compression:** Apply Draco compression via `gltf-pipeline` or `gltf-transform`.

---

## 2. Rendering, Shading & Lighting Pipeline
- **Baked Lighting:**
  - Bake GI, AO, bounce lighting, and sky shadows directly into environment texture sheets.
  - Do NOT use massive cascading shadow maps for the environment.
- **Dynamic Lighting:**
  - 1 directional sun casting low-res shadow maps strictly on vehicles.
  - Dynamic headlights for vehicles.
- **Post-Processing Pass:**
  - Single shared merge pass via `@react-three/postprocessing`.
  - Gated Bloom for baked neon emissives.
  - SSR tuned for asphalt/wet road.
  - Cinematic LUT / color-grading.

---

## 3. Vehicle & Physics Implementation Details
- **Mesh Hierarchy Requirement:**
  - `chassis` (main car body)
  - `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`
- **Materials:** `MeshPhysicalMaterial` or `MeshStandardMaterial` with tuned roughness, metalness, and clearcoat.
- **Physics Controller:**
  - Arcade-style Raycast Vehicle Controller via `@react-three/rapier`.
  - Tuned acceleration curves, top speed, braking, corner drifting friction, suspension stiffness, and damping.
- **Chase Camera:**
  - Spring-arm interpolation behind active car.
  - Speed-dependent dynamic FOV widening.
  - Camera shake during drift/impact.

---

## 4. UI / HUD Layer
- Zero HUD rendering inside WebGL.
- HTML/CSS overlay placed cleanly on top of the `<canvas>` (speedometer, lap timer, drift counter, gear indicator).

---

## 5. Deployment & Vercel Automation (CRITICAL FOR CLAUDE)
- **Repository Remote:** `origin` is mapped to `https://github.com/johnsolomonalt-tech/racinggame.git`.
- **Branch:** `main` (tracked with upstream).
- **Vercel Hook:** Vercel is connected to this repository. Pushing to `main` triggers an automatic edge deployment.
- **Completion Protocol:**
  Once you have built, tested (`npm run build`), and verified the racing game:
  ```bash
  git add .
  git commit -m "feat: complete web 3d racing game implementation"
  git push origin main
  ```
  This will immediately trigger Vercel to build and publish the live production URL.

---

## 6. Ready Configuration Files
- [`vercel.json`](file:///Users/solomon/Downloads/racing%20game/vercel.json): Edge caching rules for `.glb`, `.gltf`, `.wasm`, `.png`, `.jpg`, `.hdr` files.
- [`package.json`](file:///Users/solomon/Downloads/racing%20game/package.json): Prescribed versions of R3F, Rapier, Postprocessing, and Three.js.
- [`vite.config.ts`](file:///Users/solomon/Downloads/racing%20game/vite.config.ts): Chunk-splitting for `three`, `r3f`, `rapier`, and `postprocessing` + asset inclusion.
- [`tsconfig.json`](file:///Users/solomon/Downloads/racing%20game/tsconfig.json): Strict bundler configuration for Vite + React.
