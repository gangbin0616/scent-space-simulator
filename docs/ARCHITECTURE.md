# Architecture

## Product

ScentMaze helps plan a perfume popup space. Users place scent sources, target points, partitions, fans, heaters, and coolers on a floorplan, then inspect scent spread and walk through the same space in 3D.

## Runtime

This is a static app. There is no bundler, backend, database, or install step.

```txt
python -m http.server 4173
```

The app imports Three.js directly from jsDelivr in `src/app.js`.

## Main Files

- `index.html`: page shell and route sections for home, simulator, and viewer
- `src/app.js`: UI state, route switching, simulator controls, canvas drawing, and Three.js viewer
- `src/floorplan.js`: floorplan geometry and collision APIs
- `src/simulation.js`: grid-based multi-source scent diffusion engine
- `src/styles.css`: layout and visual styling

## Data Flow

`src/floorplan.js` provides the shared floorplan model. The simulator builds a grid mask from `isWalkable()`. The 3D viewer builds wall meshes from `getWallLines()` and constrains camera movement with `isWalkable()`.

The important invariant is:

```txt
floorplan.js -> simulator mask
floorplan.js -> 3D wall meshes
floorplan.js -> minimap
floorplan.js -> viewer collision
```

Do not duplicate floorplan geometry in another file.

## Simulator

`src/simulation.js` uses one `Float32Array` field per scent source and one reusable buffer per field. Diffusion runs on a `CELL = 6` grid. Devices modify the field:

- `partition`: dynamic wall
- `fan`: suction from behind and forward push
- `heater`: increases local diffusion
- `cooler`: reduces local diffusion
- `floorplan-wall-toggle`: enables or disables selected fixed wall groups

Targets sample nearby grid values and report total scent plus per-source contribution.

## 3D Viewer

The viewer is a real Three.js scene:

- `THREE.WebGLRenderer`
- `THREE.Scene`
- `THREE.PerspectiveCamera`
- mesh walls generated from floorplan wall lines
- shape-based floor and ceiling
- mesh props for door, shelf, mural, fan, heater, cooler, and markers
- `THREE.Raycaster` for clickable viewer objects

The current viewer is not a panorama viewer. It is a floorplan-generated Three.js 3D walkthrough.

## Known Risks

- `src/app.js` is large and owns too many concerns.
- Three.js resources are rebuilt when the scene key changes; future work should add explicit geometry/material disposal if scene churn increases.
- UI text has had encoding issues before. Keep files saved as UTF-8.
- Since Three.js is loaded from a CDN, offline use depends on network availability unless the dependency is vendored or bundled.
