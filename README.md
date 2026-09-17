# Ghayas Sher — 3D Portfolio

A first-person, walkable 3D portfolio. You spawn outside a cabin, walk in with WASD,
and explore two levels — a surface cabin and an underground "tech bunker" — each
with interactive objects that open resume content. One object (the bunker's video
wall / desk monitors) opens a fake Linux desktop instead of a content panel.

Built with **React 19 + TypeScript + Vite**, with the actual 3D scene running in
**Three.js** underneath React (React owns the UI chrome; Three.js owns the canvas).

## Quick start

```bash
npm install
npm run dev       # starts Vite on http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build locally
npx tsc --noEmit   # type-check without emitting (run this before committing)
```

There is no test suite. Type-checking + manually walking through the scene in a
browser is the verification loop for this project.

## Project structure

```
src/
  App.tsx                     — top-level layout: mounts Experience + overlays
  main.tsx, style.css         — entry point, all CSS (single global stylesheet)

  components/
    Experience.tsx            — React wrapper around the Three.js scene (see below)
    Chrome.tsx                — persistent UI chrome (nav dots, etc.)
    ContentPanel.tsx          — the resume-content overlay (education/experience/
                                 projects/skills panels — reads from data/resume.ts)
    Loader.tsx                — loading screen shown while glTF models load
    desktop/
      LinuxDesktop.tsx        — fake Kali-styled desktop shown for the "contact"
                                 section instead of a ContentPanel
      FilesApp.tsx            — file manager window inside LinuxDesktop
      TerminalApp.tsx         — terminal window inside LinuxDesktop

  data/
    resume.ts                 — ALL resume content lives here (see "Editing content")
    filesystem.ts             — the fake filesystem FilesApp/TerminalApp browse

  three/
    RoomScene.ts               — the engine: renderer, camera, first-person
                                  controller, level transitions, raycasting,
                                  per-frame animation. Framework-agnostic (no React).
    layout.ts                  — spawn points, movement bounds, collision obstacles,
                                  and the (now mostly unused) generic prop-layout system
    simpleCabin.ts              — builds the surface cabin + the exterior establishing shot
    techBunker.ts               — builds the underground bunker (see below — this is
                                  the biggest and most special-cased file in the project)
    props.ts                    — leftover shared prop builder(s) (currently just the
                                  cabin's study nook, which uses real glTF models)
    assets.ts                   — loads the glTF model kit used by props.ts
    palette.ts                  — shared color constants

public/models/*.glb            — the low-poly furniture kit (glTF), used only by
                                  props.ts's buildStudyNook — everything in
                                  techBunker.ts is procedurally built, no external assets
```

## How the scene works

### Two levels, one engine

`RoomScene` (in `three/RoomScene.ts`) is a plain TypeScript class — not a React
component — that owns the `THREE.WebGLRenderer`, camera, and the whole first-person
control loop (pointer lock + WASD on desktop, drag-to-look + a virtual joystick on
touch). `Experience.tsx` is the thin React wrapper: it creates one `RoomScene` in a
`useEffect` and forwards DOM events into it.

There are two "levels": `'cabin'` (the surface, at world Y = 0) and `'bunker'` (at
world Y = `BUNKER_Y`, currently -14). Both are built once at startup and simply
live in the same `THREE.Scene` stacked on top of each other in Y — moving between
them is just teleporting the camera and swapping the `Level` string the movement
code checks for bounds/obstacles. See `descend()` / `ascend()` / `teleportTo()` in
`RoomScene.ts`.

### The interaction pattern (important — read this before adding a new object)

Every clickable/interactive object in the scene follows the same pattern:

1. Build an **invisible hit-mesh** (a plain `THREE.Mesh` with a transparent
   `MeshBasicMaterial`) positioned over the real, visible geometry.
2. Tag it via `mesh.userData`:
   - `{ sectionId: 'skills' }` (etc.) — interacting opens that section's content
   - `{ hatch: true }` — interacting descends to the bunker (cabin only)
   - `{ ladder: true }` — interacting ascends back to the cabin (bunker only)
3. Push it into a `hitMeshes` array that the room-builder function returns via
   `group.userData.hitMeshes`.
4. `RoomScene` collects every level's `hitMeshes` into one array and raycasts
   against it every frame (`updateInteractRaycast()`), and calls
   `onSelect(sectionId)` / `descend()` / `ascend()` when you press E on a hit.

**Both `simpleCabin.ts` and `techBunker.ts` build their entire level as one fixed,
hand-positioned scene and tag hit-meshes directly inline** — there's no generic
"drop a prop at this position" system for them. (`layout.ts`'s `BUNKER_LAYOUT` /
`CABIN_LAYOUT` / `BUILDERS` map is a leftover from an earlier, more generic
approach; both are now empty arrays and the only thing still routed through them
is the cabin's `education` object, purely so that indirection didn't need to be
ripped out for no functional reason. Don't build new features on top of it —
follow the hit-mesh-tagged-directly pattern instead.)

### Adding a new interactive object

Inside `buildTechBunker()` (or `buildSimpleCabin()`), there's a local `hitbox()`
helper already defined near the top of the function:

```ts
hitbox(width, height, depth, x, y, z, { sectionId: 'skills' });
```

Add your visible mesh(es) wherever makes sense positionally, then call `hitbox()`
once, sized and centered over your visible geometry, with the right tag. That's
the entire integration — no other file needs to know about it, *except*:

- If it's a brand-new `SectionId`, add it to `SectionId` and `SECTIONS` in
  `data/resume.ts`, and add a case for it in `ContentPanel.tsx`.
- If you want the player to physically collide with it (not walk through it),
  add a circle to `BUNKER_OBSTACLES` / `CABIN_OBSTACLES` in `layout.ts` — this is
  a *separate*, simplified system from the hit-mesh raycasting: it's just a list
  of `{x, z, radius}` circles the movement code pushes the player out of. It has
  nothing to do with the actual mesh geometry, so you eyeball reasonable
  coordinates rather than deriving them.

### `techBunker.ts` — read this before touching it

This file is unusual and worth understanding before editing:

- **It has `// @ts-nocheck` at the top.** It was mechanically ported from a
  plain-JavaScript prototype (originally built and iterated on as a standalone
  Claude Artifact, then translated into this TypeScript file). The port is 1-to-1
  faithful to that prototype's loose typing (implicit `any` parameters, etc.)
  rather than hand-annotated, so it's opted out of type-checking. If you add new
  code to this file, you can write it with real types — `@ts-nocheck` just means
  the *existing* code isn't required to.
- **It's one enormous function**, `buildTechBunker()`, that constructs the whole
  room — walls, stairwell, desk, video wall, server racks, workbench,
  investigation board, sofa, coffee table, every light — and returns one
  `THREE.Group`. Everything is built with fixed, hand-tuned world coordinates.
  There's no scene graph abstraction to learn; it's just very long. Use your
  editor's outline/symbol view to jump between the labeled sections (each major
  piece of furniture has a `/* ---- ... ---- */` comment header).
- **Coordinate convention**: `rotation.y = 0` faces -Z. The room is
  24 (X) × 20 (Z) × 8 (Y) units, centered on the origin in the group's local
  space (so walls are roughly at X: ±12, Z: ±10). `BUNKER_Y` is added on top by
  `RoomScene.ts` — everything inside `techBunker.ts` is built at Y=0-relative
  coordinates, never at the real world Y.
- **The video wall** (`createNetworkMonitor()`) draws a live-updating 2D canvas
  (real world coastlines via `d3-geo` + `topojson-client`, animated links,
  scrolling log panels) and tiles it across a 4×3 grid of screen meshes. The
  redraw is throttled to ~12fps (`bunker.userData.updateScreen`, called from
  `RoomScene.ts`'s animation loop) — it looked "live" at 60fps too, but a full
  canvas redraw + 12 texture re-uploads every render frame was the single
  biggest performance cost in the scene. Don't remove the throttle without a
  reason.
- **Repeated static geometry is merged**, not built as individual meshes. The
  stairwell in particular used to be ~75 separate boxes/cylinders (one draw call
  each); it's now merged per-material into a handful of meshes via
  `mergeGeometries` from `three/addons/utils/BufferGeometryUtils.js`. If you're
  adding a new object that repeats many times (another row of server racks, a
  fence, etc.), follow that pattern — build an array of geometries (each
  `.translate()`d into place) and merge them into one mesh, rather than adding
  N meshes to the scene in a loop.

## Editing content (resume text)

Everything shown in the content panels comes from `src/data/resume.ts` — `PROFILE`,
`EDUCATION`, `EXPERIENCE`, `PROJECTS`, `SKILLS`, `INTERESTS`, and the `SECTIONS`
array (which also drives each object's in-world label, e.g. "Inspect the Server
Racks"). Editing that file is almost always the answer to "how do I change what
the portfolio says" — you shouldn't need to touch `ContentPanel.tsx` unless
you're adding a new field's *layout*, not its content.

## Known gotchas

- **Hot Module Reload does not reliably pick up Three.js scene changes.**
  `Experience.tsx` constructs the entire `RoomScene` once, inside a
  `useEffect(() => { ... }, [])` with an empty dependency array. Vite's React
  Fast Refresh can hot-swap the component's *code* without ever re-running that
  effect, which means you can save a change to `techBunker.ts` / `RoomScene.ts` /
  `layout.ts`, see no error, and still be looking at the old scene, already built
  in memory, from before your edit. **If a change to anything under `three/`
  doesn't seem to have applied, hard-refresh the page (Ctrl+Shift+R) before
  assuming something is broken.** This cost a lot of back-and-forth during
  development — don't skip it.
- **Shadows are expensive; be deliberate about `castShadow` on lights.** A
  `THREE.PointLight` with `castShadow = true` renders a full 6-pass cubemap
  shadow. There are currently only two shadow-casting lights in the whole scene
  (the cabin fireplace and the workbench's desk lamp) — that's intentional, not
  an oversight. Think twice before adding a third.
- **Textures generated at build time are cheap; textures redrawn per-frame are
  not.** Most of `techBunker.ts`'s `create*Texture()` functions draw onto a
  `<canvas>` once, at scene construction, and are effectively free afterward.
  The video wall is the one exception (see above) — if you add another
  per-frame-updating canvas texture, throttle it the same way.
- **The room is not a git submodule / separate package** — it's just TypeScript
  files under `src/three/`, imported directly. There's no build step specific to
  the 3D content.

## Deployment

`npm run build` produces a static `dist/` folder (relative asset paths, via
`base: './'` in `vite.config.ts`) — it can be hosted on any static host (GitHub
Pages, Vercel, Netlify, etc.) with no server-side component required. `npm run
preview` serves that build locally if you want to sanity-check it before
deploying.
