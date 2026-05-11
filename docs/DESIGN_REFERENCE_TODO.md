# Design Reference TODO

## Core Correction

The reference image is primarily a **site design direction**, not only a 3D viewer direction.

Use the image to make the whole website feel like a warm boutique perfume space: soft beige surfaces, terracotta accents, dark navy framing, brass details, calm spacing, editorial composition, and curated retail atmosphere.

The 3D viewer should inherit that site design language after the UI direction is established. Do not let the 3D work become the main design brief.

## Reference Image Read

Use:

- color mood
- material feeling
- warmth and lighting
- premium perfume-shop atmosphere
- visual rhythm of beige, terracotta, dark navy, brass, and muted green
- careful object curation and spacing

Do not use:

- the exact floorplan structure
- the exact camera angle as a requirement
- the exact object positions
- the reference image as a literal blueprint

## Visual Thesis

The site should feel like a quiet editorial page for a boutique scent-space simulator: warm plaster, light stone, terracotta focus points, dark navy architectural framing, and restrained product-tool clarity.

## Site Design Direction

### Overall Mood

- warm boutique perfume shop
- premium but not luxury-heavy
- calm, curated, and tactile
- soft editorial illustration quality
- fewer hard borders and fewer generic SaaS cards
- clear simulator/product utility without feeling like an engineering demo

### Palette For Website UI

Use these across the site first:

- page background: `#f7efe2`, `#efe3d2`
- warm surface: `#eadcc6`, `#dcc6a8`
- soft plaster shadow: `#c9ad8d`
- dark architectural text/frame: `#172132`, `#20293a`
- terracotta accent: `#b56f4d`, `#c8835d`, `#a45f42`
- brass highlight: `#c7a15b`
- muted foliage support: `#6f7653`, `#828a61`
- glass/white highlight: `#fffaf1`, `#ffffff`

Avoid:

- cold gray dashboards
- saturated blue/purple gradients
- dark brown maze feeling
- too many boxed panels
- many competing accent colors
- technical-demo copy or visuals

## Website TODO

### 1. Global Site Skin

- Replace the current generic dark/product UI tone with the reference palette.
- Make the background feel like warm paper/plaster, not a dark app shell.
- Use dark navy for navigation, key text, outlines, and architectural emphasis.
- Use terracotta for primary actions, active states, hover states, markers, and important accents.
- Use brass only as a small highlight, not as a dominant color.
- Keep text crisp and utilitarian so the site still reads as a simulator tool.

### 2. Header And Navigation

- Keep the site name as `scent-space-simulator`.
- Make the header feel like a slim architectural frame: dark navy text/line on warm background.
- Active navigation should use terracotta or dark navy underline/fill.
- Remove any visual treatment that feels like a generic black SaaS navbar.

### 3. Home Section

- The removed right-side floorplan image should stay removed.
- Rebuild the first viewport so it does not feel empty after removing the image.
- Use a strong editorial composition: large brand/title, short product sentence, warm background, and a subtle boutique-inspired visual layer made from color/material blocks if needed.
- The hero should communicate the product quickly: scent, wall, wind, and temperature are controlled from one shared floorplan.
- Keep the CTA buttons visible and polished.
- Make the lower content peek naturally below the first viewport on desktop.

### 4. Feature/Guide Sections

- Replace heavy card-grid feeling with cleaner editorial bands or restrained panels.
- Use beige surfaces, thin dark navy dividers, terracotta section accents, and generous spacing.
- Keep headings smaller and tighter than the hero.
- The content should explain the simulator workflow without becoming marketing copy.

### 5. Simulator UI

- Preserve usability first.
- Restyle controls, labels, toggles, and panels with the same warm palette.
- Use terracotta for selected scent/source states and active controls where appropriate.
- Use muted greens or brass sparingly for secondary status.
- Keep dense controls readable; this is a working tool, not a landing-only page.

### 6. Viewer Page UI

- Rename visible copy away from "360"; use "3D 워크스루" or "공간 둘러보기".
- Treat the viewer page as part of the same boutique design system.
- Controls should look warmer and more intentional.
- The minimap should be useful but less visually loud.
- The canvas frame should feel like a designed viewing window, not a raw WebGL demo.

## 3D Viewer TODO

This comes after the site design language is corrected.

### 1. Color And Materials

- Match the website palette.
- Use warm plaster walls, light stone floor, terracotta/coral panels, dark navy trim, brass highlights, and muted plant greens.
- Keep lighting warm and soft.

### 2. Object Placement

- Treat objects as boutique fixtures, not random simulation props.
- Place shelves and counters against walls or display zones.
- Place perfume bottles in organized rows or clusters.
- Use plants in corners and near entry/glass areas.
- Keep HVAC/fan/heater/cooler devices as background environmental elements.
- Reduce abstract markers unless they serve orientation.

### 3. Object Modeling

- Add reusable perfume bottle groups.
- Add reusable ribbed counter/shelf groups.
- Add simple potted plants.
- Add flat niche/display panels if full arch geometry is too expensive.
- Add round terracotta hotspot markers with white rings where interaction is needed.

### 4. Camera And Composition

- Default view should look curated and calm.
- Keep walkthrough controls, but make presets feel like designed shop views.
- Use a less distorted FOV if the current camera feels wide or chaotic.
- First loaded view should include a display fixture, warm wall/floor materials, and depth.

## Implementation Order

1. Update this TODO so the site design direction is the source of truth.
2. Restyle global CSS variables, background, header, hero, buttons, and section rhythm.
3. Restyle guide/simulator/viewer panels to match the reference palette.
4. Rename remaining visible "360" copy to "3D 워크스루" or "공간 둘러보기".
5. Then update 3D palette/materials and reduce visual clutter.
6. Then improve 3D object placement and fixture modeling.
7. Run desktop visual QA for `#home`, `#simulator`, and `#viewer`.

## Verification

Run:

```powershell
node --check src\floorplan.js
node --check src\simulation.js
node --check src\app.js
```

Visual checks:

- `#home`: no right-side floorplan image, but first viewport still feels intentionally designed
- `#home`: reference mood appears in the website itself, not only in 3D
- `#simulator`: controls remain readable and usable after palette changes
- `#viewer`: visible copy says 3D, not 360
- `#viewer`: 3D inherits the same boutique palette after the site UI is restyled
- whole site: beige/terracotta/navy/brass palette feels consistent and not overdone
