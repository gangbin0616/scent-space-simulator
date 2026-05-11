# Floorplan Spec

This project uses one shared floorplan coordinate system for the simulator, minimap, collision checks, and Three.js 3D scene generation.

## Coordinate System

- Canvas size: `744 x 960`
- Origin: top-left of the source floorplan image
- `x`: increases to the right
- `y`: increases downward
- 3D conversion happens in `src/app.js` through `planToWorld(x, y, height)`
- Current world scale: `VIEWER_WORLD_SCALE = 0.045`

## Source Of Truth

`src/floorplan.js` is the source of truth for:

- Plan dimensions
- Outer polygon
- Fixed wall segments
- Curved wall segments
- Wall blocks
- Toggleable walls
- Dynamic partition collision
- Walkable checks
- Wall line extraction for the 3D viewer

Do not create a second wall model for the simulator or viewer. Use these APIs instead:

- `isWalkable(x, y, devices)`
- `getWallLines(devices)`
- `drawFloorPlan(ctx, devices)`
- `partitionEndpoints(device)`
- `snapToWalkable(point, devices)`

## Walkable Area

The base walkable area is an L-shaped polygon:

```txt
(210, 7)
  -> (480, 7)
  -> (480, 725)
  -> (680, 725)
  -> (680, 949)
  -> (50, 949)
  -> (50, 307)
  -> (210, 307)
  -> close
```

Any point outside this polygon is blocked. Fixed walls, curved walls, wall blocks, and user-added partitions are also blocked.

## Implementation Rules

- Simulator diffusion must not cross walls or active partitions.
- 3D viewer collision must use the same walkable logic as the simulator.
- User-added partitions must appear in both simulator and 3D viewer.
- Toggleable walls must affect simulator masks, minimap drawing, and 3D wall mesh generation.
- Keep floorplan changes small and verified. A coordinate change can affect movement, scent spread, and 3D geometry at the same time.

## Verification

Run:

```powershell
node --check src\floorplan.js
node --check src\simulation.js
node --check src\app.js
```

Manual checks:

- `#simulator`: scent does not pass through active walls or partitions
- `#viewer`: camera cannot walk through active walls or partitions
- `#viewer`: minimap and 3D wall geometry match the same floorplan
