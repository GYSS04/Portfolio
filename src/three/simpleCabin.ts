import * as THREE from 'three';
import { DOOR_HALF_WIDTH } from './layout';

const DOOR_HEIGHT = 4.3; // one log course (0.7) taller than before

/**
 * The surface-level cabin — a direct port of the flat-shaded, orbit-camera demo the user
 * provided, wired into the real interaction system: the bookshelf and desk carry real
 * `sectionId`s (consumed by RoomScene's click handler → the same ContentPanel as everywhere
 * else) and the hatch lid is tagged the same way the old cabin hatch was, so RoomScene's
 * existing `descend()` still drives the transition into the (unchanged) bunker below.
 */

function box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  mesh.position.set(x, y, z);
  return mesh;
}

function logWall(length: number, height: number, horizontal: boolean, posX: number, posZ: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  for (let y = 0.5; y < height; y += 0.7) {
    for (let i = -length / 2; i < length / 2; i += 2) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2, 8), mat);
      if (horizontal) {
        log.rotation.z = Math.PI / 2;
        log.position.set(posX + i, y, posZ);
      } else {
        log.rotation.x = Math.PI / 2;
        log.position.set(posX, y, posZ + i);
      }
      g.add(log);
    }
  }
  return g;
}

/** The front wall needs a doorway — split each log course around a gap, full-width above door height. */
function frontWallWithDoor(length: number, height: number, posZ: number, color: number, doorHalfWidth: number, doorHeight: number): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const segW = length / 2 - doorHalfWidth;
  for (let y = 0.5; y < height; y += 0.7) {
    if (y < doorHeight) {
      for (const side of [-1, 1]) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, segW, 8), m);
        log.rotation.z = Math.PI / 2;
        log.position.set(side * (doorHalfWidth + segW / 2), y, posZ);
        g.add(log);
      }
    } else {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, length, 8), m);
      log.rotation.z = Math.PI / 2;
      log.position.set(0, y, posZ);
      g.add(log);
    }
  }
  return g;
}

function tree(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const trunkH = 1.4;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, trunkH, 8), new THREE.MeshStandardMaterial({ color: 0x3a2415, roughness: 0.9 }));
  trunk.position.set(x, trunkH / 2, z);
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const r = 1.7 - i * 0.4;
    const h = 1.7;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), new THREE.MeshStandardMaterial({ color: 0x1d3a22, roughness: 0.9 }));
    cone.position.set(x, trunkH + i * 1.0 + h * 0.3, z);
    g.add(cone);
  }
  return g;
}

/** The pre-entry exterior establishing shot — ground, night sky, trees, seen approaching the cabin door. */
export function buildExteriorScene(): THREE.Group {
  const g = new THREE.Group();

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x0d1a10, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  g.add(ground);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffffe8 }));
  moon.position.set(-24, 30, -30);
  g.add(moon);
  const moonLight = new THREE.PointLight(0xbcd4ea, 1.5, 70, 2);
  moonLight.position.copy(moon.position);
  g.add(moonLight);

  const starCount = 400;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 80;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = 20 + Math.random() * 50;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8 })));

  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 14 + Math.random() * 26;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue; // keep clear of the cabin's own footprint
    if (Math.abs(x) < 3 && z > 10 && z < 26) continue; // keep the approach to the door clear
    g.add(tree(x, z));
  }

  const porchLight = new THREE.PointLight(0xf6b352, 3, 8, 2);
  porchLight.position.set(0, 5, 11.5);
  g.add(porchLight);

  return g;
}

function plant(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 0.7, 12),
    new THREE.MeshStandardMaterial({ color: 0x473020 })
  );
  pot.position.set(x, 0.4, z);
  g.add(pot);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x1d542b })
    );
    leaf.position.set(x + (Math.random() - 0.5) * 0.5, 1.1, z + (Math.random() - 0.5) * 0.5);
    leaf.rotation.z = (Math.random() - 0.5) * 1;
    g.add(leaf);
  }
  return g;
}

export function buildSimpleCabin(): THREE.Group {
  const g = new THREE.Group();
  const hitMeshes: THREE.Mesh[] = [];

  // ---- floor ----
  for (let x = -10; x <= 10; x += 1.2) {
    for (let z = -10; z <= 10; z += 3.5) {
      const plank = box(1.1, 0.15, 3.3, 0x542714, x, 0, z);
      plank.rotation.y = Math.random() * 0.03;
      g.add(plank);
    }
  }

  // ---- walls (fully enclosed — the open side used to read as a black void when facing it) ----
  g.add(logWall(22, 7, true, 0, -10, 0x4a210f));
  g.add(frontWallWithDoor(22, 7, 10, 0x4a210f, DOOR_HALF_WIDTH, DOOR_HEIGHT));
  g.add(logWall(22, 7, false, -10, 0, 0x4a210f));
  g.add(logWall(22, 7, false, 10, 0, 0x4a210f));

  // ---- front door + window — this is what you see behind you when you land ----
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_HALF_WIDTH * 2, DOOR_HEIGHT, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x2e1a10, roughness: 0.7 })
  );
  door.position.set(0, DOOR_HEIGHT / 2, 10);
  g.add(door);
  const doorHandle = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xb68b42, metalness: 0.7, roughness: 0.3 })
  );
  doorHandle.position.set(DOOR_HALF_WIDTH * 0.7, DOOR_HEIGHT * 0.45, 9.85);
  g.add(doorHandle);

  g.add(box(2.4, 2.6, 0.25, 0x080808, -5, 4, 10));
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 0.08), new THREE.MeshBasicMaterial({ color: 0x0a1c3a }));
  frontGlass.position.set(-5, 4, 9.87);
  g.add(frontGlass);

  // ---- roof: solid wood ceiling plane + beams (beams alone left an open void above them) ----
  g.add(box(20, 0.3, 20, 0x241008, 0, 7.4, 0));
  for (let x = -9; x <= 9; x += 4) {
    g.add(box(0.5, 0.5, 20, 0x241008, x, 7, 0));
  }

  // ---- bed ----
  g.add(box(5, 0.7, 7, 0x241008, -7, 0.8, 5));
  g.add(box(4.7, 0.5, 6.7, 0x574b42, -7, 1.35, 5));
  g.add(box(4.7, 0.25, 3, 0x251a18, -7, 1.7, 6));

  // ---- fireplace ----
  const FX = -6;
  const FZ = -8;
  const stone = new THREE.MeshStandardMaterial({ color: 0x55483e, roughness: 1 });
  const hearthPart = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone);
    m.position.set(x, y, z);
    g.add(m);
  };
  hearthPart(6, 0.7, 1.5, FX, 0.4, FZ);
  hearthPart(0.8, 5, 1.5, FX - 2.5, 2.8, FZ);
  hearthPart(0.8, 5, 1.5, FX + 2.5, 2.8, FZ);
  hearthPart(6, 0.8, 1.5, FX, 5, FZ);

  const fire = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2, 8),
    new THREE.MeshStandardMaterial({ color: 0xff4d00, emissive: 0xff3300, emissiveIntensity: 3 })
  );
  fire.position.set(FX, 1.5, FZ - 0.5);
  g.add(fire);

  const fireLight = new THREE.PointLight(0xff6a1a, 4, 12, 2);
  fireLight.position.set(FX, 2, FZ + 1);
  g.add(fireLight);

  // ---- bookshelf → Education ----
  const shelf = box(3, 5, 1, 0x241008, -2.5, 3, -8.8);
  g.add(shelf);
  const bookColors = [0x6e2c2c, 0x23344d, 0x4c4128, 0x403040];
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 7; i++) {
      g.add(box(0.25, 0.8, 0.4, bookColors[Math.floor(Math.random() * bookColors.length)], -3.5 + i * 0.32, 1.5 + row * 1.3, -9.4));
    }
  }
  shelf.userData.sectionId = 'education';
  hitMeshes.push(shelf);

  // ---- window ----
  g.add(box(4.5, 3.5, 0.25, 0x080808, 0, 4.5, -9.7));
  const sky = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 0.1), new THREE.MeshBasicMaterial({ color: 0x06142e }));
  sky.position.set(0, 4.5, -9.85);
  g.add(sky);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffffe8 }));
  moon.position.set(1, 5.2, -10);
  g.add(moon);

  // ---- desk → Projects ----
  const desk = box(4.5, 0.4, 2, 0x4a210f, 0, 2, -6.8);
  g.add(desk);
  for (const x of [-1.8, 1.8]) {
    for (const z of [-0.7, 0.7]) {
      g.add(box(0.25, 2, 0.25, 0x241008, x, 1, -6.8 + z));
    }
  }
  const laptop = box(1.6, 0.1, 1.1, 0x080808, 0, 2.3, -6.8);
  laptop.rotation.x = -0.2;
  g.add(laptop);
  desk.userData.sectionId = 'projects';
  hitMeshes.push(desk);

  // ---- jersey (decorative) ----
  g.add(box(2.7, 3.6, 0.2, 0x080808, -8.7, 4.5, -5));
  g.add(box(2.1, 2.8, 0.12, 0x143c87, -8.7, 4.5, -5.15));

  // ---- coffee table ----
  g.add(box(5, 0.5, 3, 0x4a210f, 0, 1.1, 2));
  for (const x of [-2, 2]) {
    for (const z of [-1, 1]) {
      g.add(box(0.3, 1.4, 0.3, 0x241008, x, 0.5, 2 + z));
    }
  }
  const tableBookColors = [0x7b2e2e, 0x263f57, 0x50452c];
  for (let i = 0; i < 3; i++) {
    g.add(box(1.1, 0.2, 0.7, tableBookColors[i], -0.8, 1.5 + i * 0.22, 2));
  }

  // ---- rug ----
  g.add(box(10, 0.05, 7, 0x3f2520, 0, 0.1, 2));

  // ---- dumbbell (decorative) ----
  const dumbbellMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 });
  const dumbbell = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.3), dumbbellMat);
  bar.rotation.z = Math.PI / 2;
  dumbbell.add(bar);
  for (const offset of [-0.55, 0.55]) {
    const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2), dumbbellMat);
    weight.rotation.z = Math.PI / 2;
    weight.position.x = offset;
    dumbbell.add(weight);
  }
  dumbbell.position.set(8.5, 0.5, 8);
  g.add(dumbbell);

  // ---- soccer ball / basketball / backpack / travel map (decorative) — sports gear in the corner ----
  const soccerBall = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
  soccerBall.position.set(8, 0.7, 9);
  g.add(soccerBall);
  const basketball = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 24), new THREE.MeshStandardMaterial({ color: 0xd46a1f }));
  basketball.position.set(9, 0.7, 8.5);
  g.add(basketball);
  g.add(box(1.5, 2, 0.8, 0x3b4028, 8, 1.1, 5));
  g.add(box(5, 3, 0.15, 0xb79a6b, 7.4, 4.5, -8.9));

  // ---- hidden bunker hatch — now where the balls used to sit ----
  const hatch = box(3, 0.15, 3, 0x542714, 7.75, 0.2, 0);
  g.add(hatch);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.07, 12, 24),
    new THREE.MeshStandardMaterial({ color: 0xb68b42, metalness: 0.8, roughness: 0.3 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(7.75, 0.35, 0);
  g.add(ring);
  for (let i = 0; i < 8; i++) {
    g.add(box(2.4, 0.35, 0.7, 0x241008, 7.75, -0.6 - i * 0.45, -i * 0.6));
  }
  hatch.userData.hatch = true;
  hitMeshes.push(hatch);

  // ---- plants ----
  g.add(plant(3, 1));
  g.add(plant(9, -4));

  // ---- lighting ----
  g.add(new THREE.AmbientLight(0x3a3028, 0.45));
  const moonLight = new THREE.DirectionalLight(0x7ca8ff, 1.4);
  moonLight.position.set(2, 12, -5);
  g.add(moonLight);
  const roomLight = new THREE.PointLight(0xffc98a, 450, 28, 2);
  roomLight.position.set(0, 6, 0);
  g.add(roomLight);

  g.userData.hitMeshes = hitMeshes;
  g.userData.flames = [fire];
  g.userData.fireLight = fireLight;

  return g;
}
