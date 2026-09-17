import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DOOR_HALF_WIDTH } from './layout';

const DOOR_HEIGHT = 4.3;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function standard(color: number, roughness = 0.72, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function roundedBox(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radius = 0.06,
) {
  const geometry = new RoundedBoxGeometry(width, height, depth, 2, Math.min(radius, width / 4, height / 4, depth / 4));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addWindow(
  root: THREE.Group,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  facingZ: boolean,
  wood: THREE.Material,
) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  if (!facingZ) group.rotation.y = Math.PI / 2;
  const night = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.22, height - 0.22),
    new THREE.MeshBasicMaterial({ color: 0x071728 }),
  );
  night.position.z = 0.025;
  group.add(night);
  const t = 0.16;
  group.add(roundedBox(width, t, 0.14, wood, 0, height / 2, 0.05, 0.025));
  group.add(roundedBox(width, t, 0.14, wood, 0, -height / 2, 0.05, 0.025));
  group.add(roundedBox(t, height, 0.14, wood, -width / 2, 0, 0.05, 0.025));
  group.add(roundedBox(t, height, 0.14, wood, width / 2, 0, 0.05, 0.025));
  group.add(roundedBox(t * 0.7, height - 0.2, 0.12, wood, 0, 0, 0.07, 0.02));
  group.add(roundedBox(width - 0.2, t * 0.7, 0.12, wood, 0, 0, 0.07, 0.02));
  root.add(group);
}

function buildLogShell(material: THREE.Material) {
  const placements: Array<{ x: number; y: number; z: number; length: number; side: boolean }> = [];
  for (let y = 0.45; y < 7; y += 0.7) {
    placements.push({ x: 0, y, z: -10, length: 22, side: false });
    placements.push({ x: -10, y, z: 0, length: 22, side: true });
    placements.push({ x: 10, y, z: 0, length: 22, side: true });
    if (y < DOOR_HEIGHT) {
      const segmentLength = 11 - DOOR_HALF_WIDTH;
      placements.push({ x: -(DOOR_HALF_WIDTH + segmentLength / 2), y, z: 10, length: segmentLength, side: false });
      placements.push({ x: DOOR_HALF_WIDTH + segmentLength / 2, y, z: 10, length: segmentLength, side: false });
    } else placements.push({ x: 0, y, z: 10, length: 22, side: false });
  }
  const logs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.36, 0.39, 1, 10), material, placements.length);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  placements.forEach((p, index) => {
    position.set(p.x, p.y, p.z);
    rotation.setFromEuler(new THREE.Euler(p.side ? Math.PI / 2 : 0, 0, p.side ? 0 : Math.PI / 2));
    scale.set(1, p.length, 1);
    matrix.compose(position, rotation, scale);
    logs.setMatrixAt(index, matrix);
  });
  logs.receiveShadow = true;
  logs.castShadow = true;
  return logs;
}

/** Forest and night-sky backdrop. Trees are instanced, reducing roughly 120 draw calls to four. */
export function buildExteriorScene(): THREE.Group {
  const root = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(145, 48), standard(0x101c14, 1));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.09;
  ground.receiveShadow = true;
  root.add(ground);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.1, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff2ce }));
  moon.position.set(-24, 30, -30);
  root.add(moon);

  const random = seededRandom(904);
  const starCount = 260;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 60 + random() * 75;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 18 + random() * 48;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  root.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xd9e6f2, size: 0.36, transparent: true, opacity: 0.72 })));

  const treePositions: Array<{ x: number; z: number; scale: number }> = [];
  for (let i = 0; i < 38; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 15 + random() * 30;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;
    if (Math.abs(x) < 3.2 && z > 9 && z < 28) continue;
    treePositions.push({ x, z, scale: 0.82 + random() * 0.5 });
  }
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.21, 0.3, 1.5, 7), standard(0x322217, 0.94), treePositions.length);
  const coneGeometry = new THREE.ConeGeometry(1.65, 1.8, 8);
  const tiers = [0x193523, 0x21472c, 0x2a5535].map((color) => new THREE.InstancedMesh(coneGeometry, standard(color, 0.95), treePositions.length));
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  treePositions.forEach((tree, index) => {
    matrix.compose(new THREE.Vector3(tree.x, 0.75 * tree.scale, tree.z), quaternion, new THREE.Vector3(tree.scale, tree.scale, tree.scale));
    trunks.setMatrixAt(index, matrix);
    tiers.forEach((mesh, tier) => {
      const tierScale = tree.scale * (1 - tier * 0.18);
      matrix.compose(new THREE.Vector3(tree.x, (1.75 + tier * 0.98) * tree.scale, tree.z), quaternion, new THREE.Vector3(tierScale, tree.scale, tierScale));
      mesh.setMatrixAt(index, matrix);
    });
  });
  root.add(trunks, ...tiers);
  root.add(new THREE.HemisphereLight(0x7187a0, 0x142116, 0.58));
  const moonLight = new THREE.DirectionalLight(0x8ca6c2, 0.72);
  moonLight.position.set(-18, 26, 12);
  root.add(moonLight);
  const porchLight = new THREE.PointLight(0xffba6a, 22, 11, 2);
  porchLight.position.set(0, 4.9, 11.2);
  root.add(porchLight);
  return root;
}

function buildPlant(x: number, z: number, potMaterial: THREE.Material, leafMaterial: THREE.Material) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.47, 0.66, 12), potMaterial);
  pot.position.y = 0.34;
  group.add(pot);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), leafMaterial);
    const angle = (i / 5) * Math.PI * 2;
    leaf.scale.set(0.7, 1.5, 0.45);
    leaf.position.set(Math.cos(angle) * 0.24, 0.95 + (i % 2) * 0.2, Math.sin(angle) * 0.24);
    leaf.rotation.z = Math.cos(angle) * 0.45;
    group.add(leaf);
  }
  return group;
}

export function buildSimpleCabin(): THREE.Group {
  const root = new THREE.Group();
  const hitMeshes: THREE.Mesh[] = [];
  const materials = {
    floor: standard(0x6b4028, 0.8), log: standard(0x4a2a1b, 0.88), darkWood: standard(0x281812, 0.78),
    walnut: standard(0x543323, 0.68), trim: standard(0x7b5032, 0.72), brass: standard(0xb18a4d, 0.28, 0.72),
    linen: standard(0xb6ad9e, 0.92), blanket: standard(0x365364, 0.93), charcoal: standard(0x15191c, 0.48, 0.32),
    stone: standard(0x5c5852, 0.96), pot: standard(0x6d4130, 0.88), leaf: standard(0x315e3d, 0.88),
  };

  const floor = new THREE.InstancedMesh(new RoundedBoxGeometry(1.08, 0.14, 3.28, 1, 0.025), materials.floor, 17 * 6);
  const matrix = new THREE.Matrix4();
  let floorIndex = 0;
  for (let ix = 0; ix < 17; ix++) {
    for (let iz = 0; iz < 6; iz++) {
      matrix.makeRotationY(((ix * 7 + iz * 3) % 5 - 2) * 0.004);
      matrix.setPosition(-9.6 + ix * 1.2, 0, -8.75 + iz * 3.5);
      floor.setMatrixAt(floorIndex++, matrix);
    }
  }
  floor.receiveShadow = true;
  root.add(floor, buildLogShell(materials.log));
  const ceiling = roundedBox(20.2, 0.28, 20.2, materials.darkWood, 0, 7.38, 0, 0.04);
  ceiling.castShadow = false;
  root.add(ceiling);
  for (let x = -8; x <= 8; x += 4) root.add(roundedBox(0.42, 0.52, 20, materials.trim, x, 7.02, 0, 0.04));

  const door = roundedBox(DOOR_HALF_WIDTH * 2, DOOR_HEIGHT, 0.24, materials.darkWood, 0, DOOR_HEIGHT / 2, 9.98, 0.08);
  root.add(door);
  for (let y = 0.75; y < DOOR_HEIGHT; y += 0.75) root.add(roundedBox(DOOR_HALF_WIDTH * 1.65, 0.07, 0.05, materials.trim, 0, y, 9.82, 0.015));
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), materials.brass);
  handle.position.set(0.82, 2.05, 9.78);
  root.add(handle);
  addWindow(root, -5.2, 4.25, 9.76, 2.6, 2.4, true, materials.trim);
  addWindow(root, 0.2, 4.45, -9.76, 4.3, 2.8, true, materials.trim);

  root.add(roundedBox(5.2, 0.72, 6.8, materials.darkWood, -7, 0.78, 5.1, 0.11));
  root.add(roundedBox(4.78, 0.48, 6.4, materials.linen, -7, 1.35, 5.05, 0.14));
  root.add(roundedBox(4.9, 2.5, 0.28, materials.walnut, -7, 2.3, 8.35, 0.12));
  root.add(roundedBox(4.5, 0.18, 3.5, materials.blanket, -7, 1.68, 4.2, 0.09));
  for (const x of [-8.1, -5.9]) {
    const pillow = roundedBox(1.7, 0.32, 1.05, materials.linen, x, 1.78, 7.15, 0.15);
    pillow.rotation.y = x < -7 ? -0.08 : 0.08;
    root.add(pillow);
  }
  root.add(roundedBox(1.1, 1.35, 1.1, materials.walnut, -3.8, 0.68, 7.25, 0.1));

  const fireplace = new THREE.Group();
  fireplace.position.set(-6, 0, -8.55);
  fireplace.add(roundedBox(6.2, 0.62, 1.55, materials.stone, 0, 0.34, 0, 0.08));
  fireplace.add(roundedBox(0.85, 4.65, 1.45, materials.stone, -2.48, 2.62, 0, 0.08));
  fireplace.add(roundedBox(0.85, 4.65, 1.45, materials.stone, 2.48, 2.62, 0, 0.08));
  fireplace.add(roundedBox(6.15, 0.72, 1.58, materials.stone, 0, 4.82, 0, 0.08));
  fireplace.add(roundedBox(6.75, 0.24, 1.85, materials.walnut, 0, 5.25, 0, 0.06));
  for (const rotation of [-0.42, 0.42]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.2, 8), materials.darkWood);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = rotation;
    log.position.set(0, 0.92, -0.18);
    fireplace.add(log);
  }
  const flameMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xffad34, emissive: 0xff5a0a, emissiveIntensity: 2.2, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xff932f, emissiveIntensity: 2.5, roughness: 0.5 }),
  ];
  const flames: THREE.Mesh[] = [];
  [-0.38, 0, 0.38].forEach((x, index) => {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42 - Math.abs(x) * 0.18, 1.25 + (index % 2) * 0.3, 7), flameMaterials[index % 2]);
    flame.position.set(x, 1.48, -0.25);
    fireplace.add(flame);
    flames.push(flame);
  });
  root.add(fireplace);
  const fireLight = new THREE.PointLight(0xff7a32, 30, 11, 2);
  fireLight.position.set(-6, 2, -7.25);
  root.add(fireLight);

  const shelf = roundedBox(3.3, 5.35, 0.78, materials.darkWood, -2.5, 3, -9.0, 0.08);
  shelf.userData.sectionId = 'education';
  root.add(shelf);
  hitMeshes.push(shelf);
  for (let row = 0; row < 4; row++) root.add(roundedBox(3.05, 0.13, 0.86, materials.trim, -2.5, 0.72 + row * 1.22, -8.56, 0.025));
  const bookMaterials = [standard(0x78423d, 0.85), standard(0x34526b, 0.85), standard(0x6b5b36, 0.85), standard(0x4c3f59, 0.85)];
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 7; i++) {
      const height = 0.72 + ((i * 5 + row * 3) % 4) * 0.07;
      root.add(roundedBox(0.27, height, 0.42, bookMaterials[(i + row) % bookMaterials.length], -3.32 + i * 0.28, 1.18 + row * 1.22, -8.48, 0.025));
    }
  }

  const desk = roundedBox(5.1, 0.32, 2.05, materials.walnut, 0.4, 2.05, -6.75, 0.08);
  desk.userData.sectionId = 'projects';
  root.add(desk);
  hitMeshes.push(desk);
  root.add(roundedBox(1.05, 1.85, 1.7, materials.darkWood, -1.5, 1.03, -6.75, 0.08));
  root.add(roundedBox(0.18, 1.8, 0.18, materials.charcoal, 2.42, 0.98, -7.42, 0.035));
  root.add(roundedBox(0.18, 1.8, 0.18, materials.charcoal, 2.42, 0.98, -6.08, 0.035));
  root.add(roundedBox(2.25, 1.35, 0.14, materials.charcoal, 0.72, 3.05, -7.42, 0.06));
  const monitorScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.02, 1.12), new THREE.MeshBasicMaterial({ color: 0x173c4c }));
  monitorScreen.position.set(0.72, 3.05, -7.49);
  root.add(monitorScreen);
  root.add(roundedBox(0.12, 0.72, 0.12, materials.charcoal, 0.72, 2.42, -7.38, 0.025));
  root.add(roundedBox(1.25, 0.08, 0.48, materials.charcoal, 0.72, 2.25, -6.8, 0.025));
  root.add(roundedBox(0.9, 1.45, 1.45, materials.charcoal, -0.65, 0.75, -7.55, 0.09));
  root.add(roundedBox(1.75, 0.22, 1.65, materials.blanket, 0.8, 1.05, -4.9, 0.1));
  root.add(roundedBox(1.72, 1.85, 0.22, materials.blanket, 0.8, 2.0, -4.15, 0.1));
  root.add(roundedBox(0.18, 1.2, 0.18, materials.charcoal, 0.8, 0.55, -4.9, 0.035));

  const rug = roundedBox(8.8, 0.05, 6.5, standard(0x293c46, 0.98), 0.2, 0.09, 2.05, 0.05);
  rug.castShadow = false;
  root.add(rug);
  root.add(roundedBox(5.0, 0.32, 2.45, materials.walnut, 0.2, 1.08, 2.0, 0.11));
  for (const x of [-1.85, 2.25]) for (const z of [1.15, 2.85]) root.add(roundedBox(0.2, 0.95, 0.2, materials.charcoal, x, 0.52, z, 0.035));
  for (let i = 0; i < 3; i++) {
    const book = roundedBox(1.25, 0.12, 0.78, bookMaterials[i], -0.8, 1.32 + i * 0.13, 2.0, 0.025);
    book.rotation.y = (i - 1) * 0.04;
    root.add(book);
  }

  root.add(roundedBox(2.9, 3.75, 0.18, materials.charcoal, -8.72, 4.5, -4.95, 0.06));
  root.add(roundedBox(2.3, 3.05, 0.08, standard(0x1d4a82, 0.72), -8.72, 4.5, -4.83, 0.04));
  root.add(roundedBox(5.1, 3.1, 0.14, materials.darkWood, 7.2, 4.6, -9.45, 0.06));
  root.add(roundedBox(4.72, 2.72, 0.05, standard(0xa68e66, 0.88), 7.2, 4.6, -9.34, 0.03));
  const dumbbell = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.25, 8), materials.charcoal);
  bar.rotation.z = Math.PI / 2;
  dumbbell.add(bar);
  for (const offset of [-0.55, 0.55]) {
    const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.22, 10), materials.charcoal);
    weight.rotation.z = Math.PI / 2;
    weight.position.x = offset;
    dumbbell.add(weight);
  }
  dumbbell.position.set(8.2, 0.42, 8.15);
  root.add(dumbbell);
  const soccerBall = new THREE.Mesh(new THREE.SphereGeometry(0.58, 14, 10), standard(0xe5e2d8, 0.82));
  soccerBall.position.set(7.6, 0.6, 8.8);
  root.add(soccerBall);
  const basketball = new THREE.Mesh(new THREE.SphereGeometry(0.58, 14, 10), standard(0xc4672b, 0.82));
  basketball.position.set(8.9, 0.6, 8.35);
  root.add(basketball);
  root.add(roundedBox(1.55, 1.9, 0.78, standard(0x394638, 0.9), 8, 1.02, 5.1, 0.18));

  const hatch = roundedBox(3.1, 0.14, 3.1, materials.darkWood, 7.75, 0.2, 0, 0.07);
  hatch.userData.hatch = true;
  root.add(hatch);
  hitMeshes.push(hatch);
  root.add(roundedBox(2.76, 0.08, 2.76, materials.charcoal, 7.75, 0.29, 0, 0.055));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.065, 10, 22), materials.brass);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(7.75, 0.38, 0);
  root.add(ring);

  root.add(buildPlant(3.45, 1.0, materials.pot, materials.leaf), buildPlant(9.0, -4.0, materials.pot, materials.leaf));
  root.add(new THREE.HemisphereLight(0x8094ad, 0x24170f, 0.62));
  const moonLight = new THREE.DirectionalLight(0x86a9d6, 0.72);
  moonLight.position.set(2, 11, -5);
  root.add(moonLight);
  const roomLight = new THREE.PointLight(0xffc487, 54, 24, 2);
  roomLight.position.set(0, 5.7, 0.5);
  root.add(roomLight);
  const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.0, 0.45, 18, 1, true), materials.brass);
  pendant.position.set(0, 6.55, 0.5);
  root.add(pendant);

  root.userData.hitMeshes = hitMeshes;
  root.userData.flames = flames;
  root.userData.fireLight = fireLight;
  return root;
}
