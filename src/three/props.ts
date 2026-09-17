import * as THREE from 'three';
import { PALETTE } from './palette';
import { useModel, type ModelLibrary } from './assets';

function forestWindowTexture(): THREE.CanvasTexture {
  const width = 256;
  const height = 320;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0a1730');
  sky.addColorStop(1, '#1c2e42');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(220,230,240,0.9)';
  ctx.beginPath();
  ctx.arc(width * 0.72, height * 0.22, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 53.7) % width;
    const sy = (i * 91.3) % (height * 0.55);
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }

  ctx.fillStyle = '#0d1710';
  const treeXs = [10, 45, 80, 120, 150, 185, 220, 245];
  treeXs.forEach((tx, i) => {
    const th = 90 + ((i * 37) % 60);
    const baseY = height - 10;
    ctx.beginPath();
    ctx.moveTo(tx, baseY);
    ctx.lineTo(tx + 16, baseY - th);
    ctx.lineTo(tx + 32, baseY);
    ctx.closePath();
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A simple dusk mountain-and-lake scene, for the framed painting over the mantel. */
function sceneryPaintingTexture(): THREE.CanvasTexture {
  const w = 320, h = 224;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  sky.addColorStop(0, '#3a3552');
  sky.addColorStop(0.6, '#a8654f');
  sky.addColorStop(1, '#e8a05c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.65);

  const far = [0x5a4d5e, 0x4a3f4e];
  [0.42, 0.5].forEach((peakY, i) => {
    ctx.fillStyle = `#${far[i].toString(16)}`;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * (peakY - 0.06 * Math.sin(x * 0.03 + i)));
    ctx.lineTo(w, h * 0.62);
    ctx.closePath();
    ctx.fill();
  });

  // lake
  const lake = ctx.createLinearGradient(0, h * 0.62, 0, h);
  lake.addColorStop(0, '#c98a5e');
  lake.addColorStop(1, '#2c2436');
  ctx.fillStyle = lake;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Stylized decorative world map — not geographically accurate, just a travel-wall backdrop. */
function worldMapTexture(): THREE.CanvasTexture {
  const w = 512, h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d8c49a';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(90,70,40,0.18)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  ctx.fillStyle = '#a9895c';
  ctx.strokeStyle = '#7a5f3d';
  ctx.lineWidth = 2;
  const blobs: [number, number, number, number][] = [
    [60, 70, 90, 60], [90, 150, 60, 90], [220, 60, 110, 50], [240, 130, 70, 100],
    [370, 90, 100, 70], [400, 190, 60, 60], [180, 230, 130, 40],
  ];
  blobs.forEach(([bx, by, bw, bh]) => {
    ctx.beginPath();
    ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.strokeStyle = 'rgba(120,40,40,0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(70, 100); ctx.quadraticCurveTo(200, 40, 260, 90); ctx.quadraticCurveTo(340, 150, 420, 210);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#5a4326';
  ctx.font = "bold 22px Georgia, serif";
  ctx.textAlign = 'center';
  ctx.fillText('E X P L O R E', w / 2, h - 18);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A stylized soccer-fan jersey — name + number only, no team crests or sponsor marks. */
function jerseyTexture(): THREE.CanvasTexture {
  const w = 300, h = 340;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f0c93a';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#1f8a4c';
  ctx.fillRect(0, 0, w, 26);
  ctx.fillRect(0, h - 20, w, 20);
  ctx.fillRect(0, 0, 16, h);
  ctx.fillRect(w - 16, 0, 16, h);

  ctx.fillStyle = '#1b1b1b';
  ctx.font = "bold 30px Arial";
  ctx.textAlign = 'center';
  ctx.fillText('NEYMAR', w / 2, 70);

  ctx.font = "bold 150px Arial";
  ctx.fillStyle = '#1f8a4c';
  ctx.fillText('10', w / 2, 240);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function soccerBallTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f2f2ee';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#1c1c1c';
  const spots: [number, number, number][] = [
    [40, 40, 22], [160, 30, 20], [220, 110, 18], [70, 130, 24],
    [190, 190, 20], [30, 210, 18], [130, 220, 22], [230, 230, 16],
  ];
  spots.forEach(([sx, sy, r]) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = sx + Math.cos(a) * r, py = sy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ---------------- Education: bookshelf + reading desk (real furniture-kit models) ---------------- */
export function buildStudyNook(lib: ModelLibrary): THREE.Group {
  const g = new THREE.Group();

  // real bookcaseOpen.glb is 0.4w x 0.88h x 0.25d — scale up for a proper library-tall shelf
  const bookcase = useModel(lib, 'bookcaseOpen');
  bookcase.scale.setScalar(1.5);
  g.add(bookcase);
  const bookSpots: [number, number, number][] = [
    [-0.32, 0.62, 0], [-0.05, 0.62, 0.4], [0.3, 0.62, 0.8],
    [-0.3, 1.32, 0.2], [0.1, 1.32, 0.7],
  ];
  bookSpots.forEach(([x, y, ry], i) => {
    const book = useModel(lib, 'books');
    book.position.set(x, y, 0.02);
    book.rotation.y = ry + i * 0.15;
    bookcase.add(book); // child of the (scaled) bookcase so it rides along at the right size/shelf height
  });

  // real desk.glb is only 0.38m tall (a real desk is ~0.75m) — scale to a believable height
  const DESK_SCALE = 2.0;
  const desk = useModel(lib, 'desk');
  desk.scale.setScalar(DESK_SCALE);
  desk.rotation.y = -Math.PI / 2;
  desk.position.set(1.9, 0, 0.6);
  g.add(desk);
  const deskTop = 0.384; // native top surface, in the desk's own unscaled local space

  const chair = useModel(lib, 'chairDesk');
  chair.scale.setScalar(1.8);
  chair.rotation.y = Math.PI / 2;
  chair.position.set(1.9, 0, 1.65);
  g.add(chair);

  const lamp = useModel(lib, 'lampRoundTable');
  lamp.position.set(0.55, deskTop, -0.25);
  desk.add(lamp); // child of desk: inherits DESK_SCALE, sits exactly on the (scaled) desktop
  const lampLight = new THREE.PointLight(PALETTE.amber, 3.2, 7, 2);
  lampLight.position.set(0.55, deskTop + 0.32, -0.25);
  desk.add(lampLight);

  return g;
}
