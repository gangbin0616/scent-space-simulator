# Scent Space Simulator

ScentMaze is a static web app for testing scent flow inside a perfume popup space. It combines one shared floorplan model, a scent diffusion simulator, and a real Three.js 3D walkthrough.

Older viewer notes were obsolete and have been consolidated around the current Three.js implementation.

## Current Features

- Floorplan-driven scent diffusion simulator
- Multiple scent sources and target points
- Movable partitions, fans, heaters, and coolers
- Toggleable floorplan walls that affect scent spread
- Budget, timer, target success state, and scent contribution readouts
- Three.js 3D walkthrough using the same floorplan coordinates
- WASD movement, mouse drag look, preset camera positions, minimap, and clickable 3D objects

## Run Locally

```powershell
python -m http.server 4173
```

Open:

```txt
http://127.0.0.1:4173/#home
http://127.0.0.1:4173/#simulator
http://127.0.0.1:4173/#viewer
```

## Project Structure

```txt
index.html
src/
  app.js          Main UI, simulator controls, Three.js viewer
  floorplan.js    Single source of truth for floorplan geometry
  simulation.js   Grid-based scent diffusion engine
  styles.css
  assets/
docs/
  ARCHITECTURE.md
  THREE_D_ROADMAP.md
  WEB_3D_REFERENCES.md
FLOORPLAN_SPEC.md
```

## Development Checks

```powershell
node --check src\floorplan.js
node --check src\simulation.js
node --check src\app.js
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md): current code structure and data flow
- [3D Roadmap](docs/THREE_D_ROADMAP.md): what to improve next in the Three.js viewer
- [Web 3D References](docs/WEB_3D_REFERENCES.md): official/reference links and project-specific guidance
- [Floorplan Spec](FLOORPLAN_SPEC.md): coordinate system and floorplan rules
