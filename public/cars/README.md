# Car Asset Directory

Drop `.glb` / `.gltf` car models here, or in `asset-src/cars/`, then run:

```bash
npm run car -- asset-src/cars/mycar.glb --id mycar --name "My Car"
```

## Model Requirements (Section 3 of Specification)
1. **Mesh Separation:** The car must be structured into 5 independent sub-meshes:
   - `chassis` (or `body`, `car_body`, `chassis_mesh`)
   - `wheel_fl` (front-left wheel)
   - `wheel_fr` (front-right wheel)
   - `wheel_rl` (rear-left wheel)
   - `wheel_rr` (rear-right wheel)
2. **Size:** Output `.glb` must be under **5 MB** (enforced by `prepare-car.mjs` via Draco compression and texture resizing).
3. **Materials:** Body paint is automatically mapped to `MeshPhysicalMaterial` with clearcoat reflections reacting to the scene environment.

If `cars.json` is empty, the game automatically uses the built-in procedural sports car.
