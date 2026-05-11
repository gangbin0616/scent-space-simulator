# 3D Viewer Roadmap

## Current State

The viewer is now a Three.js 3D walkthrough generated from the project floorplan. It uses the same wall and walkable data as the simulator.

Implemented:

- Perspective camera at human eye height
- WASD movement and mouse drag look
- Collision through `isWalkable()`
- Floor, ceiling, walls, lights, fog, and simple material textures
- Props for entrance, mural, shelf, fan, heater, cooler, route marker, and partitions
- Clickable objects through `THREE.Raycaster`
- Minimap synced with camera position and direction

## Next Priorities

1. Viewer controls

- Replace custom drag-look with `PointerLockControls` or a clear click-to-enter first-person mode.
- Keep fallback drag controls for casual browsing.
- Add mobile touch controls or disable unsupported interactions cleanly.

2. Scene lifecycle

- Track generated geometries, materials, and textures.
- Dispose old resources when rebuilding the scene after wall/device changes.
- Monitor `renderer.info.render.calls`, triangles, geometries, and textures during development.

3. Visual quality

- Improve wall and floor materials with repeated texture details.
- Add better scale cues: door frames, baseboards, ceiling lights, shelf depth, display fixtures.
- Make heater/cooler/fan effects visible in 3D without confusing them with simulator data.
- Improve prop placement so it reads as a perfume retail space, not abstract markers.

4. Simulator-to-3D sync

- Show active scent source and target markers in the 3D scene.
- Reflect user-added devices immediately in 3D after simulator edits.
- Add optional scent overlay preview in 3D, but keep the simulator canvas as the authoritative analysis view.

5. Asset strategy

- Keep procedural geometry for walls, floor, and simple fixtures.
- Add lightweight local image textures only where they improve recognition.
- Avoid remote hotlinked images.
- Consider GLTF only after the procedural scene feels correct and the asset pipeline is justified.

6. QA

- Verify `#viewer` on desktop and mobile widths.
- Confirm WebGL canvas is nonblank.
- Confirm movement cannot cross walls.
- Confirm minimap direction matches camera view.
- Confirm object click targets update the info panel.
- Confirm simulator still works after viewer changes.

## Non-Goals For Now

- Real photorealistic 360 panorama
- WebXR/VR
- Physics engine
- Full architectural CAD import
- Heavy GLTF scene replacement

Those can be revisited after the floorplan-generated 3D experience is stable.
