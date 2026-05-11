# Web 3D References

This file collects reference material for improving the ScentMaze 3D viewer.

## Project Direction

Use Three.js for the current viewer. The app already has a `THREE.WebGLRenderer`, `THREE.Scene`, `THREE.PerspectiveCamera`, mesh geometry, lights, materials, and raycasting. The right next step is to improve controls, resource cleanup, visual quality, and simulator sync on top of that 3D foundation.

## Official References

- Three.js WebGLRenderer: https://threejs.org/docs/pages/WebGLRenderer.html
- Three.js PerspectiveCamera: https://threejs.org/docs/pages/PerspectiveCamera.html
- Three.js PointerLockControls: https://threejs.org/docs/pages/PointerLockControls.html
- Three.js cleanup guide: https://threejs.org/manual/en/cleanup.html
- Three.js object disposal guide: https://threejs.org/manual/en/how-to-dispose-of-objects.html
- MDN WebGL best practices: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

## Notes For This Project

### WebGLRenderer

Three.js `WebGLRenderer` renders a scene through WebGL. Current Three.js documentation notes that the renderer uses WebGL 2. For ScentMaze, keep the renderer attached to `#viewerCanvas`, keep pixel ratio capped, and watch draw calls as the scene gets richer.

### PerspectiveCamera

`PerspectiveCamera` is appropriate for the walkthrough because it mimics normal human perspective. The current viewer uses a 74 degree FOV. Tune FOV carefully: too narrow feels cramped, too wide distorts the shop.

### PointerLockControls

Three.js recommends `PointerLockControls` for first-person 3D movement. It would fit the walkthrough, but it changes interaction expectations because the pointer becomes captured after a user action. Keep visible UI affordances and an escape path if this is added.

### Cleanup And Disposal

Three.js does not automatically free many GPU resources while the page is alive. When rebuilding generated walls or props, dispose unused geometries, materials, and textures. This matters if wall toggles or simulator edits trigger frequent 3D scene rebuilds.

### WebGL Performance

MDN recommends batching draw calls, avoiding blocking WebGL reads in production, checking errors during development, and managing GPU resources explicitly. In this project that means:

- Merge simple static wall/floor geometry when practical.
- Avoid per-frame scene rebuilds.
- Avoid unnecessary `readPixels` or sync GPU operations.
- Track `renderer.info` during 3D work.
- Cap pixel ratio for high-DPI screens.

## Candidate Future Libraries

These are not needed immediately, but useful if scope expands:

- `lil-gui`: quick internal tuning panels for lights, camera FOV, material colors
- `stats.js`: lightweight FPS and frame timing monitor
- `GLTFLoader`: only if local 3D assets become necessary
- `postprocessing` or Three.js examples postprocessing: only after base scene quality and performance are stable

Avoid adding a library before it solves a current, concrete problem.
