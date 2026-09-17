# Contributing

This is a small, two-person personal project — the goal here is just to keep
changes easy to review and easy to undo, not to enforce heavy process.

## Workflow

1. Create a branch for what you're working on (`git checkout -b fix/whatever`).
   Please don't commit straight to `master` for anything non-trivial.
2. Make your change.
3. Before committing, run:
   ```bash
   npx tsc --noEmit
   ```
   This project has no automated test suite — type-checking is the only
   automated check, so it's the minimum bar before opening a PR.
4. If your change touches anything visual (3D scene, layout, styling), **run it
   in a browser and actually look at it** before opening a PR. `npm run dev`,
   then walk through the affected part of the scene. Screenshots in the PR
   description are appreciated for visual changes.
5. Open a PR against `master` with a short description of what changed and why.

## Before you ask "why isn't my change showing up"

Read the **Known gotchas** section in `README.md` first — the most common cause
is Vite's Fast Refresh not rebuilding the 3D scene on save. Hard-refresh
(Ctrl+Shift+R) and check again before assuming something's broken.

## Where things live

See `README.md`'s "Project structure" and "How the scene works" sections for the
full architecture. The short version:

- Resume text/content → `src/data/resume.ts`
- Adding/moving a 3D object in the bunker → `src/three/techBunker.ts`
- Adding/moving a 3D object in the cabin → `src/three/simpleCabin.ts`
- Player spawn points, movement bounds, collision → `src/three/layout.ts`
- Anything about how the camera moves, levels transition, or raycasting/
  interaction works → `src/three/RoomScene.ts`

## Commit messages

Just describe what changed and, if it's not obvious, why. No required format
(no conventional-commits prefixes, no ticket numbers — there's no ticket
tracker for this project).

## Questions

If something in the code doesn't make sense and isn't explained in `README.md`,
that's a documentation bug — please open an issue (or just ask) rather than
guessing, and consider adding a comment or a README note once you figure it out
so the next person doesn't hit the same thing.
