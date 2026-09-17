import * as THREE from 'three';
import type { SectionId } from '../data/resume';

export interface PropPlacement {
  id: SectionId;
  propPosition: THREE.Vector3;
  propRotationY: number;
  /** horizontal radius (from propPosition) used for both the look-raycast hitbox and walking collision */
  interactRadius: number;
  interactHeight: number;
}

/* ---------------- Exterior establishing shot (pre-entry splash) ---------------- */
export const EXTERIOR_SPAWN = new THREE.Vector3(0, 3, 24);
export const EXTERIOR_LOOK_AT = new THREE.Vector3(0, 3.5, 10);
export const CABIN_FRONT_Z = 10;
export const DOOR_HALF_WIDTH = 1.3;

/* ---------------- Cabin (surface) — the simple orbit-demo room, now walked in first person ---------------- */
export const CABIN_SPAWN = { x: 0, z: 8 };
export const CABIN_SPAWN_YAW = 0; // faces -z, into the room toward the fireplace/back wall

export const CABIN_BOUNDS = { minX: -9.3, maxX: 9.3, minZ: -9.5, maxZ: 9.5 };

// The cabin's interactive objects (bookshelf → education, desk → projects) are now built and
// tagged directly in simpleCabin.ts, not through this generic layout-driven system.
export const CABIN_LAYOUT: PropPlacement[] = [];

export const HATCH_POSITION = new THREE.Vector3(0, 0, -2.6);
export const HATCH_RADIUS = 1.15;

/* ---------------- Bunker (underground) — the Tech Bunker: concrete room, corner stairwell,
   command desk + video wall, server racks, workbench, investigation board, lounge ---------------- */
export const BUNKER_Y = -14;

// Open floor between the stairwell and the lounge, facing -z into the room toward the video wall.
export const BUNKER_SPAWN = { x: 3, z: 2 };
export const BUNKER_SPAWN_YAW = 0; // faces -z, straight at the command desk / video wall

export const BUNKER_ROOM = { width: 24, depth: 20, height: 8, centerZ: 0 };
export const BUNKER_BOUNDS = { minX: -11.3, maxX: 11.3, minZ: -9.3, maxZ: 9.3 };

// The bunker's interactive fixtures (server racks → skills, workbench → experience,
// video wall + desk monitors → contact, investigation board → projects) are now built and
// tagged directly in techBunker.ts, not through this generic layout system — see CABIN_LAYOUT.
export const BUNKER_LAYOUT: PropPlacement[] = [];

export const LAYOUT: PropPlacement[] = [...CABIN_LAYOUT, ...BUNKER_LAYOUT];

/** Freestanding furniture the player's body collides with (kept small & deliberate). */
export const CABIN_OBSTACLES: { x: number; z: number; radius: number }[] = [
  { x: -7, z: 5, radius: 3.2 }, // bed
  { x: -6, z: -8, radius: 2.8 }, // fireplace
  { x: -2.5, z: -8.8, radius: 1.2 }, // bookshelf
  { x: 0, z: -6.8, radius: 2.2 }, // desk
  { x: 0, z: 2, radius: 2.0 }, // coffee table
  { x: 8.5, z: 8, radius: 0.7 }, // dumbbell
  { x: 8, z: 9, radius: 0.7 }, // soccer ball
  { x: 9, z: 8.5, radius: 0.7 }, // basketball
  { x: 8, z: 5, radius: 0.9 }, // backpack
  { x: 3, z: 1, radius: 0.6 }, // plant
  { x: 9, z: -4, radius: 0.6 }, // plant
];

export const BUNKER_OBSTACLES: { x: number; z: number; radius: number }[] = [
  { x: 1, z: -7.5, radius: 2.3 }, // command desk + chair + PC tower
  { x: 9.5, z: -6.4, radius: 1.3 }, // server rack 1
  { x: 9.5, z: -4.2, radius: 1.3 }, // server rack 2
  { x: 9.5, z: -2.0, radius: 1.3 }, // server rack 3
  { x: 9.5, z: 0.2, radius: 1.3 }, // server rack 4
  { x: -10.2, z: 0, radius: 1.9 }, // workbench (now under the investigation board)
  { x: -10.6, z: 0, radius: 0.6 }, // investigation board (wall-mounted, thin)
  { x: 4.0, z: 7.3, radius: 1.3 }, // coffee table
  { x: 2.0, z: 9.0, radius: 1.6 }, // sofa long run (front wall, beside the stairs)
  { x: 5.5, z: 9.0, radius: 1.6 },
  { x: 7.7, z: 7.5, radius: 1.5 }, // sofa return run (turns inward toward the stair base)
  { x: 7.7, z: 4.3, radius: 1.5 },
  { x: 7.5, z: 8.0, radius: 1.2 },
];
