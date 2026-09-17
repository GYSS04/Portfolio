// @ts-nocheck — mechanically ported from techbunker-artifact.html; see note below.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import worldLandTopo from '../data/world-land-110m.json';

/**
 * The underground bunker — ported from the "Tech Bunker" standalone design (concrete room,
 * corner stairwell up to the surface, command desk + a live d3-geo network-map video wall,
 * server racks, a workbench, an investigation board, and a lounge). Fixed absolute
 * coordinates, same pattern as simpleCabin.ts: tagged hit-meshes and a per-frame screen
 * updater come back on `bunker.userData` for RoomScene.ts to wire up.
 */

const WORLD_LAND_TOPO = worldLandTopo as unknown as Topology;

/* ---------------------------------------------------------------------- */
/* Kali-styled Linux desktop texture for the command-desk video wall —      */
/* matches the portfolio's real LinuxDesktop.tsx: colors, topbar, terminal  */
/* ---------------------------------------------------------------------- */

function createLinuxDesktopTexture() {
  const W = 2048, H = 768;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const C = {
    bg: '#0a0e14', panel: '#12161d', panelLight: '#1a1f28',
    border: 'rgba(255,255,255,0.08)', fg: '#d7dae0', muted: '#7d8590',
    blue: '#367bf0', blueBright: '#58a6ff', green: '#4ade80', punc: '#6b7280',
  };

  // wallpaper — dark navy with the two blue radial glows from .os-wallpaper
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(W * 0.15, H * 0.1, 0, W * 0.15, H * 0.1, W * 0.42);
  g.addColorStop(0, 'rgba(54,123,240,0.20)'); g.addColorStop(1, 'rgba(54,123,240,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W * 0.85, H * 0.9, 0, W * 0.85, H * 0.9, W * 0.45);
  g.addColorStop(0, 'rgba(54,123,240,0.10)'); g.addColorStop(1, 'rgba(54,123,240,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const mono = (px, weight = '400') => `${weight} ${px}px "JetBrains Mono", ui-monospace, monospace`;

  // top panel
  const topH = 46;
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, W, topH);
  ctx.strokeStyle = C.border; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, topH); ctx.lineTo(W, topH); ctx.stroke();

  ctx.textBaseline = 'middle';
  let x = 18;
  ctx.font = mono(20); ctx.fillStyle = C.fg;
  ctx.fillText('🐉', x, topH / 2); x += 30;
  ctx.font = mono(17, '700'); ctx.fillText('Applications', x, topH / 2); x += ctx.measureText('Applications').width + 26;
  ctx.font = mono(15); ctx.fillStyle = C.muted;
  ctx.fillText('Places', x, topH / 2); x += ctx.measureText('Places').width + 22;
  ctx.fillText('System', x, topH / 2);

  ctx.textAlign = 'right';
  let rx = W - 20;
  ctx.font = mono(15); ctx.fillStyle = C.fg;
  const clockText = 'Mon Feb 09 · 22:41';
  ctx.fillText(clockText, rx, topH / 2); rx -= ctx.measureText(clockText).width + 24;
  ctx.font = mono(17);
  ctx.fillText('🔊', rx, topH / 2); rx -= 30;
  ctx.fillText('📶', rx, topH / 2);
  ctx.textAlign = 'left';

  // desktop icons
  const iconCol = (ix, iy, glyph, label) => {
    ctx.textAlign = 'center';
    ctx.font = mono(34); ctx.fillStyle = C.fg;
    ctx.fillText(glyph, ix, iy);
    ctx.font = mono(13); ctx.fillStyle = C.fg;
    ctx.fillText(label, ix, iy + 34);
    ctx.textAlign = 'left';
  };
  iconCol(60, topH + 50, '🏠', 'home');
  iconCol(60, topH + 130, '>_', 'terminal');

  // terminal window
  const winX = 190, winY = topH + 14, winW = W - winX - 30, winH = H - winY - 20;
  ctx.fillStyle = C.bg;
  ctx.fillRect(winX, winY, winW, winH);
  ctx.strokeStyle = C.border;
  ctx.strokeRect(winX + 0.5, winY + 0.5, winW, winH);

  const titleH = 40;
  const tg = ctx.createLinearGradient(0, winY, 0, winY + titleH);
  tg.addColorStop(0, '#1c212b'); tg.addColorStop(1, '#161a22');
  ctx.fillStyle = tg;
  ctx.fillRect(winX, winY, winW, titleH);
  ctx.strokeStyle = C.border;
  ctx.beginPath(); ctx.moveTo(winX, winY + titleH); ctx.lineTo(winX + winW, winY + titleH); ctx.stroke();

  ctx.font = mono(15); ctx.fillStyle = C.fg; ctx.textBaseline = 'middle';
  ctx.fillText('▌  ghayas@kali: ~', winX + 14, winY + titleH / 2);

  const dots = ['#3a4048', '#3a4048', '#e05f4e'];
  dots.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(winX + winW - 20 - i * 20, winY + titleH / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // terminal body — authentic kali prompt segments
  const padX = winX + 22, padTop = winY + titleH + 24;
  const lineH = 27;
  let ty = padTop;
  ctx.textBaseline = 'alphabetic';

  const drawSegments = (segs) => {
    let sx = padX;
    for (const [text, color, weight] of segs) {
      ctx.font = mono(16, weight || '400');
      ctx.fillStyle = color;
      ctx.fillText(text, sx, ty);
      sx += ctx.measureText(text).width;
    }
    ty += lineH;
  };

  const prompt = (path) => drawSegments([
    ['┌──(', C.punc], ['ghayas', C.green, '700'], ['㉿', C.punc],
    ['kali', C.green, '700'], [')-[', C.punc], [path, C.blueBright, '700'], [']', C.punc],
  ]);
  const cmdLine = (cmd) => drawSegments([['└─$ ', '#e8e8e8', '700'], [cmd, C.fg]]);
  const output = (text) => drawSegments([[text, C.fg]]);

  output("┌─[ ghayas@kali ]─ workstation online");
  output("Type 'help' to see available commands.");
  prompt('~'); cmdLine('whoami');
  output('ghayas');
  prompt('~'); cmdLine('ls');
  output('coursework/  documentation/  projects/');
  prompt('~'); cmdLine('cd projects && ls');
  prompt('~/projects');
  output('healthcare-analytics-case-study/  endpoint-compliance-automation/');
  prompt('~/projects'); cmdLine('cat endpoint-compliance-automation/README.md');
  output('Automated compliance checks across managed endpoints.');
  prompt('~/projects');
  drawSegments([['└─$ ', '#e8e8e8', '700'], ['_', C.fg]]);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createWorldMapTexture() {
  const W = 2048, H = 768;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // base
  ctx.fillStyle = '#020c10';
  ctx.fillRect(0, 0, W, H);
  const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.6);
  vign.addColorStop(0, 'rgba(10,40,48,0.35)');
  vign.addColorStop(1, 'rgba(2,10,14,0)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  // faint scan grid
  ctx.strokeStyle = 'rgba(60,200,220,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // equirectangular-ish projection, cropped to the populated latitude band (-60..80)
  const ll = (lon, lat) => [(lon + 180) / 360 * W, (80 - lat) / 140 * H];

  // simplified but real coastline traces (lon, lat), not arbitrary blobs
  const NORTH_AMERICA = [[-165,65],[-155,60],[-135,58],[-125,49],[-124,40],[-118,34],[-112,23],[-105,20],[-97,16],[-90,18],[-86,21],[-81,25],[-80,31],[-75,35],[-74,40],[-70,44],[-66,44],[-60,46],[-53,48],[-65,55],[-75,58],[-80,63],[-70,68],[-85,70],[-105,71],[-130,70],[-155,71],[-165,65]];
  const SOUTH_AMERICA = [[-79,9],[-80,-2],[-81,-8],[-75,-15],[-71,-25],[-73,-40],[-72,-50],[-68,-55],[-66,-50],[-62,-40],[-57,-34],[-48,-27],[-43,-22],[-38,-13],[-35,-6],[-44,-2],[-51,1],[-58,7],[-62,10],[-67,10],[-73,11],[-79,9]];
  const AFRICA = [[-5,36],[3,37],[11,34],[20,31],[32,31],[34,27],[40,15],[43,12],[51,12],[49,0],[40,-3],[40,-8],[35,-17],[32,-26],[28,-33],[18,-34],[14,-23],[12,-10],[9,0],[3,6],[-2,5],[-8,5],[-11,7],[-16,13],[-17,15],[-16,20],[-9,32],[-5,36]];
  const EUROPE = [[-9,43],[-6,37],[-1,37],[3,42],[-2,47],[2,51],[5,53],[8,55],[10,58],[11,59],[14,55],[20,54],[22,65],[28,66],[30,60],[35,55],[38,47],[30,46],[29,44],[23,38],[19,40],[16,38],[13,43],[9,44],[3,43],[-9,43]];
  const ASIA = [[40,47],[47,41],[54,37],[50,30],[56,25],[61,25],[68,24],[71,21],[73,16],[77,8],[80,13],[85,20],[91,22],[93,16],[98,10],[103,2],[105,9],[108,11],[109,13],[107,20],[110,22],[113,23],[117,23],[121,25],[122,31],[129,37],[140,45],[150,55],[160,60],[170,66],[178,68],[140,73],[100,75],[70,68],[55,68],[45,55],[40,47]];
  const AUSTRALIA = [[113,-22],[122,-18],[131,-12],[137,-12],[142,-11],[145,-16],[150,-22],[153,-28],[151,-34],[147,-38],[140,-38],[138,-35],[132,-32],[122,-34],[115,-32],[113,-26],[113,-22]];

  const continents = [NORTH_AMERICA, SOUTH_AMERICA, AFRICA, EUROPE, ASIA, AUSTRALIA].map(
    (poly) => poly.map(([lon, lat]) => ll(lon, lat))
  );

  // smooth each coastline through curve segments instead of straight jagged lines
  function smoothClosedPath(ctx, pts) {
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = mid(pts[0], pts[n - 1]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const m = mid(p1, p2);
      ctx.quadraticCurveTo(p1[0], p1[1], m[0], m[1]);
    }
  }

  ctx.shadowColor = '#29e0e0';
  for (const poly of continents) {
    ctx.beginPath();
    smoothClosedPath(ctx, poly);
    ctx.closePath();
    ctx.fillStyle = 'rgba(20,95,105,0.16)';
    ctx.fill();
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(90,235,245,0.85)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // network hotspots — real city coordinates through the same projection
  const nodes = {
    nyc: ll(-74, 40.7), la: ll(-118.2, 34), london: ll(-0.1, 51.5), paris: ll(2.3, 48.8),
    moscow: ll(37.6, 55.7), beijing: ll(116.4, 39.9), tokyo: ll(139.7, 35.6), sydney: ll(151.2, -33.8),
    rio: ll(-43.2, -22.9), cairo: ll(31.2, 30), mumbai: ll(72.8, 19), lagos: ll(3.4, 6.5),
  };

  const links = [
    ['nyc','london'], ['london','moscow'], ['london','mumbai'], ['moscow','beijing'],
    ['beijing','tokyo'], ['sydney','beijing'], ['rio','lagos'], ['lagos','cairo'],
    ['cairo','mumbai'], ['la','tokyo'], ['nyc','rio'],
  ];

  ctx.strokeStyle = 'rgba(120,240,250,0.55)';
  ctx.lineWidth = 1.3;
  for (const [a, b] of links) {
    const [x1,y1] = nodes[a], [x2,y2] = nodes[b];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.12;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.stroke();
  }

  for (const [x, y] of Object.values(nodes)) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 22);
    glow.addColorStop(0, 'rgba(160,255,255,0.95)');
    glow.addColorStop(0.3, 'rgba(60,220,235,0.5)');
    glow.addColorStop(1, 'rgba(60,220,235,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eafffe';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/* ---------------------------------------------------------------------- */
/* Server-room dressing: rack front panels, status screen, graffiti, PCBs  */
/* ---------------------------------------------------------------------- */

function createServerPanelTexture(seed) {
  const W = 300, H = 780;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#24272c');
  bg.addColorStop(1, '#0c0e11');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  let s = seed % 2147483647 || 1;
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const ledColors = ['#3fe0ff', '#a24bff', '#3fff9e', '#ff9a3d'];

  const UNITS = 15;
  const rowH = H / UNITS;
  for (let i = 0; i < UNITS; i++) {
    const y = i * rowH;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, y, W, 1.5);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, y + 1.5, W, 1);

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    for (let vx = W * 0.42; vx < W - 10; vx += 6) {
      ctx.fillRect(vx, y + rowH * 0.28, 2.4, rowH * 0.44);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(W * 0.42, y + rowH * 0.18, W * 0.14, rowH * 0.64);

    const ledCount = 2 + Math.floor(rand() * 3);
    for (let l = 0; l < ledCount; l++) {
      const lx = 16 + l * 15;
      const ly = y + rowH / 2;
      const lit = rand() > 0.3;
      const color = ledColors[Math.floor(rand() * ledColors.length)];
      if (lit) {
        const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 8);
        glow.addColorStop(0, color);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(lx, ly, 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = lit ? color : '#1a1c1f';
      ctx.beginPath(); ctx.arc(lx, ly, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createServerStatusTexture() {
  const W = 640, H = 400;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#04070a';
  ctx.fillRect(0, 0, W, H);
  const scan = ctx.createLinearGradient(0, 0, 0, H);
  scan.addColorStop(0, 'rgba(41,224,224,0.08)');
  scan.addColorStop(1, 'rgba(41,224,224,0)');
  ctx.fillStyle = scan;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#29e0e0';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#7fe9e9';
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillText('S E R V E R   S T A T U S', 30, 50);

  ctx.font = '700 88px "JetBrains Mono", monospace';
  ctx.shadowColor = '#39ffb0';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#39ffb0';
  ctx.fillText('ONLINE', 28, 150);
  ctx.shadowBlur = 0;

  ctx.font = '400 17px "JetBrains Mono", monospace';
  ctx.fillStyle = '#8fa8ae';
  const lines = [
    'UPTIME   214d 06:12h',
    'NODES    12 / 12 ACTIVE',
    'LOAD     0.42  0.51  0.38',
    'TEMP     38C   NOMINAL',
  ];
  lines.forEach((l, i) => ctx.fillText(l, 30, 205 + i * 30));

  ctx.fillStyle = '#39ffb0';
  ctx.fillRect(30, 345, 14, 22);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSkullGraffitiTexture() {
  const W = 520, H = 520;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const cx = W / 2, cy = H * 0.4;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#d7dde0';
  ctx.beginPath();
  ctx.arc(cx, cy, 108, Math.PI, 0);
  ctx.lineTo(cx + 92, cy + 65);
  ctx.quadraticCurveTo(cx + 68, cy + 108, cx + 38, cy + 92);
  ctx.lineTo(cx + 20, cy + 128);
  ctx.lineTo(cx - 20, cy + 128);
  ctx.lineTo(cx - 38, cy + 92);
  ctx.quadraticCurveTo(cx - 68, cy + 108, cx - 92, cy + 65);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(5,7,10,0.9)';
  ctx.beginPath(); ctx.ellipse(cx - 40, cy + 8, 29, 37, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 40, cy + 8, 29, 37, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy + 18);
  ctx.lineTo(cx - 13, cy + 52);
  ctx.lineTo(cx + 13, cy + 52);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#d7dde0';
  ctx.fillRect(cx - 44, cy + 92, 88, 22);
  ctx.fillStyle = 'rgba(5,7,10,0.9)';
  for (let i = -3; i <= 3; i++) ctx.fillRect(cx + i * 12.5 - 1, cy + 92, 2, 22);

  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#d7dde0';
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.save();
  ctx.translate(cx, cy + 205);
  ctx.rotate(Math.PI / 4);
  ctx.beginPath(); ctx.moveTo(-125, 0); ctx.lineTo(125, 0); ctx.stroke();
  ctx.rotate(-Math.PI / 2);
  ctx.beginPath(); ctx.moveTo(-125, 0); ctx.lineTo(125, 0); ctx.stroke();
  ctx.restore();

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#d7dde0';
  for (let i = 0; i < 130; i++) {
    const rx = cx + (Math.random() - 0.5) * 420;
    const ry = cy + (Math.random() - 0.5) * 420;
    ctx.beginPath(); ctx.arc(rx, ry, Math.random() * 1.8, 0, Math.PI * 2); ctx.fill();
  }

  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 5; i++) {
    const dx = cx - 90 + Math.random() * 180;
    const dripH = 30 + Math.random() * 85;
    const grad = ctx.createLinearGradient(dx, cy + 145, dx, cy + 145 + dripH);
    grad.addColorStop(0, 'rgba(215,221,224,0.5)');
    grad.addColorStop(1, 'rgba(215,221,224,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(dx, cy + 145, 4, dripH);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPCBTexture(baseColor, traceColor, label) {
  const W = 400, H = 260;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = traceColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 24; i++) {
    let x = Math.random() * W, y = Math.random() * H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let seg = 0; seg < 4; seg++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#d8c27a';
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#0c0c0c';
  const chips = [[40, 40, 60, 34], [220, 60, 90, 50], [90, 160, 70, 30], [260, 170, 50, 40]];
  chips.forEach(([x, y, w, h]) => {
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.strokeRect(x, y, w, h);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '12px monospace';
  ctx.fillText(label, 14, H - 14);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

;

/* ---------------------------------------------------------------------- */
/* Global Network Monitor — ported from the reference HTML: real d3-geo    */
/* world geography, animated pulse links, log feeds, HUD chrome — all      */
/* drawn into one offscreen canvas that drives the video-wall texture live */
/* ---------------------------------------------------------------------- */

function createFloorTexture() {
  const w = 512, h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#14161b';
  ctx.fillRect(0, 0, w, h);

  // broad soft tonal variation — patchy sealed-concrete look, not a flat color
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 80 + Math.random() * 160;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const shade = Math.random() > 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.045)';
    g.addColorStop(0, shade);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // fine grain noise
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 9;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);

  // expansion-joint seams, like real poured/sealed concrete slabs
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  const cell = 128;
  for (let x = 0; x <= w; x += cell) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += cell) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // scattered scuffs and scratches catching the light
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    const len = 10 + Math.random() * 30;
    const ang = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWoodGrainTexture() {
  const w = 512, h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#3f2c1e');
  base.addColorStop(0.5, '#2f2117');
  base.addColorStop(1, '#251a11');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 34; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.12 + Math.random() * 0.18})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.3;
    ctx.beginPath();
    let y = Math.random() * h;
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 28) {
      y += (Math.random() - 0.5) * 6;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = 'rgba(255,214,170,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    let y = Math.random() * h;
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 36) {
      y += (Math.random() - 0.5) * 5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRugTexture() {
  const w = 256, h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#241014';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(80,20,30,0.7)';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.strokeStyle = 'rgba(120,40,50,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, w - 56, h - 56);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 900; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPegboardTexture() {
  const w = 512, h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (let y = 20; y < h; y += 28) {
    for (let x = 20; x < w; x += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function hangTool(cx, cy, draw) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#8a8f96';
    ctx.fillStyle = '#c7cdd3';
    ctx.lineWidth = 2;
    draw();
    ctx.restore();
  }

  // pliers
  hangTool(90, 90, () => {
    ctx.beginPath(); ctx.moveTo(-4, -40); ctx.lineTo(-14, 20); ctx.lineTo(-4, 30); ctx.lineTo(4, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -40); ctx.lineTo(14, 20); ctx.lineTo(4, 30); ctx.lineTo(-4, -10); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = '#e04a3f'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-10, 22); ctx.lineTo(-10, 55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 22); ctx.lineTo(10, 55); ctx.stroke();
  });

  // screwdrivers, graduated sizes
  [0, 1, 2].forEach((i) => {
    hangTool(220 + i * 40, 80, () => {
      ctx.fillStyle = ['#e0a63c', '#3f9de0', '#e04a3f'][i];
      ctx.beginPath(); ctx.arc(0, -34, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c7cdd3';
      ctx.fillRect(-2, -24, 4, 30 + i * 12);
    });
  });

  // wrench
  hangTool(400, 100, () => {
    ctx.rotate(0.3);
    ctx.beginPath();
    ctx.arc(0, -40, 12, 0.6, Math.PI * 2 - 0.6);
    ctx.stroke();
    ctx.fillRect(-3, -34, 6, 70);
    ctx.beginPath();
    ctx.arc(0, 36, 12, Math.PI + 0.6, -0.6);
    ctx.stroke();
  });

  // coiled cable
  hangTool(150, 240, () => {
    ctx.strokeStyle = '#3fe0ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 8; t += 0.2) {
      const r = 22 + t * 1.4;
      const px = Math.cos(t) * r * 0.4;
      const py = t * 6 - 60;
      if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  });

  // multimeter silhouette
  hangTool(340, 250, () => {
    ctx.fillStyle = '#e0a63c';
    ctx.fillRect(-30, -20, 60, 80);
    ctx.fillStyle = '#0c0e11';
    ctx.fillRect(-22, -12, 44, 30);
    ctx.fillStyle = '#3fff9e';
    ctx.font = '14px monospace';
    ctx.fillText('4.98V', -18, 8);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFabricTexture(base, weave) {
  const w = 256, h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // subtle diagonal knit/weave — two crossing hatches, low contrast
  ctx.strokeStyle = weave;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  for (let i = -h; i < w + h; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.2;
  for (let i = -h; i < w + h; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, h);
    ctx.lineTo(i + h, 0);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // soft tonal mottling so it doesn't read as a flat computer-generated color
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, Math.random() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createChairMeshTexture() {
  const w = 128, h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1a1c20';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCorkboardTexture() {
  const w = 1024, h = 700;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6b4a34';
  ctx.fillRect(0, 0, w, h);
  // mottled cork grain — thousands of tiny irregular flecks, darker and lighter than the base
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    const r = 0.6 + Math.random() * 2.2;
    const light = Math.random();
    ctx.fillStyle = light > 0.5
      ? `rgba(${140 + light * 60},${100 + light * 50},${60 + light * 30},${0.25 + light * 0.3})`
      : `rgba(${60 + light * 40},${38 + light * 30},${20 + light * 20},${0.3 + (0.5 - light) * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // soft vignette so the edges read as a mounted panel, not an infinite tile
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A pinned case-file sheet: header stamp, a mugshot-style silhouette block, and redacted text lines. */
function createCaseFileTexture(title: string, tag: string, accent: string) {
  const w = 440, h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e7e0cd';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(40,32,20,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  ctx.fillStyle = '#20180f';
  ctx.font = "bold 26px 'Courier New', monospace";
  ctx.textBaseline = 'top';
  ctx.fillText(title.toUpperCase(), 18, 16);
  ctx.font = "16px 'Courier New', monospace";
  ctx.fillStyle = accent;
  ctx.fillText(tag, 18, 48);

  // silhouette "photo" block, upper right — a detective-board staple without needing a real face
  const px = w - 118, py = 16, pw = 100, ph = 120;
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = '#4a4a4a';
  ctx.beginPath(); ctx.arc(px + pw / 2, py + ph * 0.38, pw * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px + pw / 2, py + ph * 0.95, pw * 0.42, ph * 0.32, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  // redacted body-text lines — blocky bars of varying width, a few tinted as "highlighted" terms
  ctx.font = '13px monospace';
  let ly = 82;
  const lineSeed = title.length + tag.length;
  for (let i = 0; i < 10; i++) {
    const rand = Math.abs(Math.sin(lineSeed * 7.1 + i * 3.7));
    const lineW = 40 + rand * (w - 190);
    ctx.fillStyle = rand > 0.8 ? accent : 'rgba(20,16,10,0.55)';
    ctx.fillRect(18, ly, lineW, 8);
    ly += 16;
  }

  // a corner "stamp" ring
  ctx.save();
  ctx.translate(w - 70, h - 56);
  ctx.rotate(-0.25);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 24, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.fillText('FLAGGED', 0, -4);
  ctx.fillText('REVIEW', 0, 8);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createNetworkMonitor() {
  const W = 2048, H = 768;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const projection = geoNaturalEarth1();
  const pathGen = geoPath(projection, ctx);
  const graticule = geoGraticule10();

  const marginX = 240, marginY = 70;
  projection.fitExtent([[marginX, marginY], [W - marginX, H - marginY]], { type: 'Sphere' });

  // real 110m-resolution world geography, baked in at build time (WORLD_LAND_TOPO, declared
  // above) since the artifact sandbox blocks runtime fetch() to CDNs — script-tag loads only
  const landFeature = feature(WORLD_LAND_TOPO, WORLD_LAND_TOPO.objects.countries);

  const nodes = [
    { lon: -79.38, lat: 43.65, label: 'NA-01 · TORONTO' },
    { lon: -74.0, lat: 40.7, label: 'NA-02 · NEW YORK' },
    { lon: -123.1, lat: 49.28, label: 'NA-03 · VANCOUVER' },
    { lon: -99.13, lat: 19.43, label: 'NA-04 · MEXICO CITY' },
    { lon: -46.6, lat: -23.5, label: 'SA-01 · SAO PAULO' },
    { lon: -58.4, lat: -34.6, label: 'SA-02 · BUENOS AIRES' },
    { lon: -0.13, lat: 51.5, label: 'EU-01 · LONDON' },
    { lon: 13.4, lat: 52.5, label: 'EU-02 · BERLIN' },
    { lon: 37.6, lat: 55.75, label: 'EU-03 · MOSCOW' },
    { lon: 3.4, lat: 6.5, label: 'AF-01 · LAGOS' },
    { lon: 31.2, lat: 30.0, label: 'AF-02 · CAIRO' },
    { lon: 28.0, lat: -26.2, label: 'AF-03 · JOHANNESBURG' },
    { lon: 55.3, lat: 25.2, label: 'AS-01 · DUBAI' },
    { lon: 72.9, lat: 19.1, label: 'AS-02 · MUMBAI' },
    { lon: 116.4, lat: 39.9, label: 'AS-03 · BEIJING' },
    { lon: 139.7, lat: 35.7, label: 'AS-04 · TOKYO' },
    { lon: 103.8, lat: 1.35, label: 'AS-05 · SINGAPORE' },
    { lon: 151.2, lat: -33.9, label: 'AU-01 · SYDNEY' },
    { lon: 144.96, lat: -37.8, label: 'AU-02 · MELBOURNE' },
  ];
  const hub = 0;

  const links = [
    [0, 1], [0, 2], [0, 3],
    [4, 5],
    [6, 7], [7, 8],
    [9, 10], [10, 11],
    [12, 13], [13, 14], [14, 15], [15, 16],
    [17, 18],
    [0, 4], [0, 6], [0, 9], [0, 13], [0, 17],
    [1, 6], [4, 9], [3, 4], [6, 12], [7, 14], [8, 14], [11, 13], [15, 17], [16, 17],
  ];
  const pulses = links.map(() => ({ t: Math.random(), speed: 0.1 + Math.random() * 0.12 }));

  function projectNode(n) { return projection([n.lon, n.lat]); }
  function bezierPoint(p0, p1, p2, t) {
    const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    return [x, y];
  }

  function drawGrid() {
    ctx.save();
    ctx.beginPath(); pathGen(graticule);
    ctx.strokeStyle = 'rgba(63,232,224,0.06)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); pathGen({ type: 'Sphere' });
    ctx.strokeStyle = 'rgba(63,232,224,0.18)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  function drawContinents() {
    ctx.save();
    ctx.beginPath();
    pathGen(landFeature);
    ctx.fillStyle = 'rgba(63,232,224,0.07)'; ctx.fill();
    ctx.strokeStyle = 'rgba(63,232,224,0.6)'; ctx.lineWidth = 1.1;
    ctx.shadowColor = 'rgba(63,232,224,0.75)'; ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }

  function drawLinks(dt) {
    ctx.save();
    links.forEach(([a, b], i) => {
      const pa = projectNode(nodes[a]), pb = projectNode(nodes[b]);
      const dx = pb[0] - pa[0], dy = pb[1] - pa[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const bow = Math.min(90, Math.max(12, dist * 0.22));
      const ctrl = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 - bow];

      ctx.beginPath();
      ctx.moveTo(pa[0], pa[1]);
      ctx.quadraticCurveTo(ctrl[0], ctrl[1], pb[0], pb[1]);
      ctx.strokeStyle = 'rgba(63,232,224,0.18)'; ctx.lineWidth = 1.3;
      ctx.stroke();

      const p = pulses[i];
      p.t += p.speed * dt;
      if (p.t > 1) p.t = 0;
      const [px, py] = bezierPoint(pa, ctrl, pb, p.t);
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#eaffff'; ctx.shadowColor = '#3fe8e0'; ctx.shadowBlur = 12; ctx.fill();

      const trailT = Math.max(0, p.t - 0.06);
      const [tx, ty] = bezierPoint(pa, ctrl, pb, trailT);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty);
      ctx.strokeStyle = 'rgba(63,232,224,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    });
    ctx.restore();
  }

  function drawNodes(t) {
    ctx.save();
    nodes.forEach((n, i) => {
      const [x, y] = projectNode(n);
      const pulse = 4 + Math.sin(t / 400 + i) * 2;
      const ringR = 10 + ((t / 20 + i * 300) % 1200) / 34;
      const ringA = 1 - ((t / 20 + i * 300) % 1200) / 1200;
      ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(63,232,224,${ringA * 0.5})`; ctx.lineWidth = 1.3; ctx.stroke();

      ctx.beginPath(); ctx.arc(x, y, i === hub ? 6 : pulse, 0, Math.PI * 2);
      ctx.fillStyle = i === hub ? '#ffb15c' : '#eaffff';
      ctx.shadowColor = i === hub ? '#ffb15c' : '#3fe8e0'; ctx.shadowBlur = 14; ctx.fill();

      ctx.shadowBlur = 0;
      ctx.font = '17px Consolas, monospace';
      ctx.fillStyle = 'rgba(205,238,240,0.85)';
      ctx.textAlign = x > W / 2 ? 'right' : 'left';
      ctx.fillText(n.label, x + (x > W / 2 ? -14 : 14), y - 12);
    });
    ctx.restore();
  }

  // ---- HUD chrome drawn straight onto the same canvas ----
  const PANEL_W = 230;

  function drawVignette() {
    ctx.fillStyle = '#050a0c';
    ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, W * 0.6);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  function drawPanels() {
    for (const side of [0, 1]) {
      const px = side === 0 ? 0 : W - PANEL_W;
      ctx.fillStyle = 'rgba(6,14,16,0.78)';
      ctx.fillRect(px, 0, PANEL_W, H);
      ctx.strokeStyle = '#16282c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(side === 0 ? PANEL_W : px, 0);
      ctx.lineTo(side === 0 ? PANEL_W : px, H);
      ctx.stroke();

      ctx.font = '11px Consolas, monospace';
      ctx.textAlign = 'left';
      const lines = feeds[side];
      let y = 26;
      for (const line of lines) {
        ctx.fillStyle = line.hl ? '#3fe8e0' : line.amber ? '#ffb15c' : '#1a5c5c';
        ctx.fillText(line.text, px + 10, y);
        y += 16;
        if (y > H - 10) break;
      }
    }
  }

  function drawLogo() {
    const cx = 44, cy = 44, r = 20;
    ctx.strokeStyle = '#3fe8e0'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#3fe8e0'; ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '700 22px Consolas, monospace';
    ctx.fillStyle = '#cdeef0';
    ctx.fillText('NEXUS', cx + 34, cy - 2);
    ctx.font = '11px Consolas, monospace';
    ctx.fillStyle = '#4f7d82';
    ctx.fillText('GLOBAL NETWORK MONITOR', cx + 34, cy + 16);
  }

  function drawHudTop() {
    ctx.textAlign = 'center';
    ctx.font = '13px Consolas, monospace';
    const chips = [
      ['UPLINK', 'STABLE'],
      ['ENCRYPTION', 'AES-256'],
      ['LATENCY', latencyText],
    ];
    const gap = 220, startX = W / 2 - gap;
    chips.forEach(([label, val], i) => {
      const x = startX + i * gap;
      ctx.fillStyle = '#4f7d82';
      ctx.fillText(label + '  ', x - 30, 40);
      ctx.fillStyle = '#3fe8e0';
      ctx.fillText(val, x + 40, 40);
    });
    ctx.textAlign = 'left';
  }

  function drawHudBottom() {
    ctx.font = '13px Consolas, monospace';
    ctx.fillStyle = '#3fe8e0';
    ctx.beginPath(); ctx.arc(PANEL_W + 24, H - 24, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4f7d82';
    ctx.textAlign = 'left';
    ctx.fillText(`NODES: ${nodes.length}   ACTIVE: ${nodes.length}   THREATS: 0`, PANEL_W + 38, H - 19);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#cdeef0';
    ctx.fillText(clockText, W - PANEL_W - 24, H - 19);
    ctx.textAlign = 'left';
  }

  // ---- fake scrolling log feeds ----
  const WORDS = ['SYN', 'ACK', 'HANDSHAKE', 'DECRYPT', 'ROUTE', 'PROXY', 'TUNNEL', 'PACKET', 'AUTH', 'TOKEN', 'CACHE', 'RELAY', 'NODE', 'PING', 'TRACE', 'PORT', 'SCAN', 'HASH', 'KEY', 'SESSION'];
  function hex(len) { let s = ''; for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 16).toString(16); return s; }
  function randIp() { return `${1 + (Math.random() * 254 | 0)}.${Math.random() * 255 | 0}.${Math.random() * 255 | 0}.${Math.random() * 255 | 0}`; }
  function randLine() {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    const r = Math.random();
    if (r < 0.3) return { text: `[${hex(8)}] ${w} -> ${randIp()}`, hl: true };
    if (r < 0.6) return { text: `0x${hex(12)} ${w}_${hex(4)}`, hl: false };
    if (r < 0.8) return { text: `${w} ${Math.random() < 0.5 ? 'OK' : 'PENDING'} ${hex(6)}`, amber: Math.random() < 0.3 };
    return { text: `>> ${w} :: ${(Math.random() * 100).toFixed(2)}%`, hl: true };
  }
  const FEED_LEN = Math.floor(H / 16) + 2;
  const feeds = [
    Array.from({ length: FEED_LEN }, randLine),
    Array.from({ length: FEED_LEN }, randLine),
  ];
  let feedAccum = 0;
  let latencyText = '42ms';
  let latencyAccum = 0;
  let clockText = '00:00:00 UTC';

  function tickClock() {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    clockText = `${hh}:${mm}:${ss} UTC`;
  }
  tickClock();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;

  let last = performance.now();
  function update(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    feedAccum += dt;
    if (feedAccum > 0.18) {
      feedAccum = 0;
      for (const feed of feeds) {
        feed.push(randLine());
        if (feed.length > FEED_LEN) feed.shift();
      }
    }
    latencyAccum += dt;
    if (latencyAccum > 1.4) {
      latencyAccum = 0;
      latencyText = `${28 + Math.floor(Math.random() * 40)}ms`;
    }
    tickClock();

    drawVignette();
    drawGrid();
    drawContinents();
    drawLinks(dt);
    drawNodes(now);
    drawPanels();
    drawLogo();
    drawHudTop();
    drawHudBottom();

    tex.needsUpdate = true;
  }

  return { texture: tex, update };
}

/* ---------------------------------------------------------------------- */
/* Scene assembly — the tech bunker                                        */
/* ---------------------------------------------------------------------- */

export function buildTechBunker(): THREE.Group {
  const bunker = new THREE.Group();
  bunker.name = 'TechBunker';
  const hitMeshes: THREE.Mesh[] = [];
  function hitbox(w: number, h: number, d: number, x: number, y: number, z: number, tag: Record<string, unknown>) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    mesh.position.set(x, y, z);
    Object.assign(mesh.userData, tag);
    bunker.add(mesh);
    hitMeshes.push(mesh);
  }

  const concrete = new THREE.MeshStandardMaterial({ color: 0x25282d, roughness: 0.9, metalness: 0.05 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x11151b, roughness: 0.55, metalness: 0.7 });
  const blackMetal = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.45, metalness: 0.85 });
  const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x261b18, roughness: 0.65, metalness: 0.25 });
  const cyanScreen = new THREE.MeshStandardMaterial({ color: 0x009fb3, emissive: 0x007a90, emissiveIntensity: 2.5, roughness: 0.25 });
  const blueScreen = new THREE.MeshStandardMaterial({ color: 0x0077ff, emissive: 0x0055cc, emissiveIntensity: 2.2 });
  const purpleLightMaterial = new THREE.MeshStandardMaterial({ color: 0x8a2be2, emissive: 0x6611aa, emissiveIntensity: 3 });
  const orangeLightMaterial = new THREE.MeshStandardMaterial({ color: 0xff8a18, emissive: 0xff5500, emissiveIntensity: 4 });
  const cableMaterial = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.8 });
  const corkTex = createCorkboardTexture();
  const corkMaterial = new THREE.MeshStandardMaterial({ map: corkTex, color: 0xffffff, roughness: 1 });
  // glossy sealed-concrete floor — textured (seams, scuffs, tonal variation) with a
  // clearcoat that catches the neon as soft streaks, cyberpunk "wet street" look
  const floorTex = createFloorTexture();
  const floorMaterial = new THREE.MeshPhysicalMaterial({
    map: floorTex, bumpMap: floorTex, bumpScale: 0.025,
    roughness: 0.5, metalness: 0.1, clearcoat: 0.65, clearcoatRoughness: 0.28, reflectivity: 0.45,
  });
  const brassMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.8, roughness: 0.3 });
  // simple transparency, not `transmission` — that three.js feature triggers an extra
  // background-copy render pass per transmissive object and is known to be flaky across
  // GPUs/drivers (silent black-canvas failures with no console error on some hardware)
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1a2530, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.4,
  });

  function box(width, height, depth, material, x, y, z, parent = bunker) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function cylinder(radiusTop, radiusBottom, height, material, x, y, z, parent = bunker) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 12), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const W = 24, D = 20, H = 8;

  box(W, 0.3, D, floorMaterial, 0, 0, 0);
  for (let z = -8; z <= 8; z += 4) box(W - 1, 0.04, 0.12, blackMetal, 0, 0.18, z);

  box(W, H, 0.4, concrete, 0, H / 2, -D / 2);

  const OPEN_X0 = 7.8;
  const OPEN_Y0 = 5.2;
  box(OPEN_X0 - -W / 2, H, 0.4, concrete, (-W / 2 + OPEN_X0) / 2, H / 2, D / 2);
  box(W / 2 - OPEN_X0, OPEN_Y0, 0.4, concrete, (OPEN_X0 + W / 2) / 2, OPEN_Y0 / 2, D / 2);

  box(0.4, H, D, concrete, -W / 2, H / 2, 0);
  box(0.4, H, D, concrete, W / 2, H / 2, 0);

  box(W, 0.3, D, darkMetal, 0, H, 0);
  for (let x = -10; x <= 10; x += 4) box(0.35, 0.35, D, blackMetal, x, H - 0.3, 0);

  const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x343941, metalness: 0.9, roughness: 0.35 });
  for (let x = -8; x <= 8; x += 3) {
    const pipe = cylinder(0.12, 0.12, D - 2, pipeMaterial, x, H - 0.7, 0);
    pipe.rotation.x = Math.PI / 2;
  }

  const stairGroup = new THREE.Group();
  stairGroup.position.set(10, 0, 3.5);
  bunker.add(stairGroup);

  const STAIR_COUNT = 12;
  const RISE = H / (STAIR_COUNT - 1);
  const RUN = 0.5;

  // The stairs were ~75 separate boxes/cylinders (one draw call each) for what's visually
  // one structure — merged per-material into a handful of meshes, geometry unchanged.
  const stepGeoms: THREE.BufferGeometry[] = [];
  const ledGeoms: THREE.BufferGeometry[] = [];
  for (let i = 0; i < STAIR_COUNT; i++) {
    const stepGeo = new THREE.BoxGeometry(3.5, 0.3, 0.8);
    stepGeo.translate(0, i * RISE, i * RUN);
    stepGeoms.push(stepGeo);

    const ledGeo = new THREE.BoxGeometry(2.8, 0.06, 0.05);
    ledGeo.translate(0, i * RISE + 0.05, i * RUN + 0.3);
    ledGeoms.push(ledGeo);
  }
  const steps = new THREE.Mesh(mergeGeometries(stepGeoms), darkMetal);
  steps.castShadow = true;
  stairGroup.add(steps);
  const leds = new THREE.Mesh(mergeGeometries(ledGeoms), orangeLightMaterial);
  stairGroup.add(leds);

  const landing = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 1.6), darkMetal);
  landing.position.set(0, (STAIR_COUNT - 1) * RISE, 5.7);
  landing.castShadow = true;
  stairGroup.add(landing);

  const retainMat = concrete;
  const retainGeoms: THREE.BufferGeometry[] = [];
  for (let i = 0; i < STAIR_COUNT; i++) {
    const wallHeight = i * RISE + 0.9;
    for (const side of [-1.85, 1.85]) {
      const wallGeo = new THREE.BoxGeometry(0.25, wallHeight, RUN + 0.05);
      wallGeo.translate(side, wallHeight / 2, i * RUN);
      retainGeoms.push(wallGeo);
    }
  }
  const retainWalls = new THREE.Mesh(mergeGeometries(retainGeoms), retainMat);
  retainWalls.receiveShadow = true;
  stairGroup.add(retainWalls);

  const postGeoms: THREE.BufferGeometry[] = [];
  for (const side of [-1.85, 1.85]) {
    const railPoints = [];
    for (let i = 0; i < STAIR_COUNT; i++) {
      const postHeight = i * RISE + 0.9;
      const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.85, 6);
      postGeo.translate(side, postHeight + 0.425, i * RUN);
      postGeoms.push(postGeo);
      railPoints.push(new THREE.Vector3(side, postHeight + 0.85, i * RUN));
    }
    // the rail itself stays a separate mesh (only 2 total) since it needs its own
    // rotation via quaternion — a real tube, not a THREE.Line, which renders at a fixed
    // 1px width and z-fights with anything in front of it at a distance
    const railStart = railPoints[0];
    const railEnd = railPoints[railPoints.length - 1];
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, railStart.distanceTo(railEnd), 8),
      new THREE.MeshStandardMaterial({ color: 0xaab4bd, metalness: 0.6, roughness: 0.3 })
    );
    rail.position.copy(railStart).lerp(railEnd, 0.5);
    rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), railEnd.clone().sub(railStart).normalize());
    stairGroup.add(rail);
  }
  const posts = new THREE.Mesh(mergeGeometries(postGeoms), pipeMaterial);
  stairGroup.add(posts);

  const houseDoor = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.6, 0.15), deskMaterial);
  houseDoor.position.set(9.9, 6.6, 9.95);
  bunker.add(houseDoor);

  const doorGlow = new THREE.PointLight(0xffe6b3, 18, 6);
  doorGlow.position.set(9.9, 6.6, 9.6);
  bunker.add(doorGlow);

  hitbox(3.5, 2.4, 1.6, 10, 1.2, 4, { ladder: true });

  const stairLight = new THREE.PointLight(0xff8a1f, 70, 20);
  stairLight.position.set(10, 6, 7);
  // point-light shadows render a full 6-pass cubemap — expensive for a small accent light;
  // not worth it here with everything else already casting/receiving shadows nearby
  bunker.add(stairLight);

  const commandDesk = new THREE.Group();
  commandDesk.position.set(1, 0, -7.5); // was y=1 — floated the desk, legs, chair and rug above the real floor
  bunker.add(commandDesk);

  // curved "battlestation" desk: a wide center slab with two wings hinged forward,
  // wrapping around the operator's chair instead of one flat plank
  const deskWoodTex = createWoodGrainTexture();
  const woodDeskMat = new THREE.MeshStandardMaterial({ map: deskWoodTex, roughness: 0.48, metalness: 0.08 });
  const DESK_THICK = 0.35, DESK_Y = 1.5, DESK_DEPTH = 2.3;

  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(7, DESK_THICK, DESK_DEPTH), woodDeskMat);
  deskTop.position.y = DESK_Y;
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  commandDesk.add(deskTop);

  const WING_WIDTH = 3.2, WING_ANGLE = 0.5;
  function buildDeskWing(sign) {
    const hinge = new THREE.Group();
    hinge.position.set(sign * 3.5, 0, 0);
    hinge.rotation.y = sign * -WING_ANGLE;
    commandDesk.add(hinge);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(WING_WIDTH, DESK_THICK, DESK_DEPTH), woodDeskMat);
    seg.position.set(sign * WING_WIDTH / 2, DESK_Y, 0);
    seg.castShadow = true;
    seg.receiveShadow = true;
    hinge.add(seg);
    const legOuter = new THREE.Mesh(new THREE.BoxGeometry(0.35, DESK_Y - 0.1, 0.35), blackMetal);
    legOuter.position.set(sign * (WING_WIDTH - 0.3), (DESK_Y - 0.1) / 2, 0.8);
    hinge.add(legOuter);
    return hinge;
  }
  buildDeskWing(-1);
  buildDeskWing(1);

  for (const x of [-3.2, 3.2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, DESK_Y - 0.1, 0.35), blackMetal);
    leg.position.set(x, (DESK_Y - 0.1) / 2, 0.8);
    commandDesk.add(leg);
  }

  // raised cable channel along the back edge, hiding wiring, lit from underneath
  const cableChannel = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 0.22), blackMetal);
  cableChannel.position.set(0, DESK_Y + DESK_THICK / 2 + 0.06, -1.0);
  commandDesk.add(cableChannel);
  const underGlow = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.02, 0.05), cyanScreen);
  underGlow.position.set(0, DESK_Y - DESK_THICK / 2 - 0.02, -0.55);
  commandDesk.add(underGlow);
  const underGlowLight = new THREE.PointLight(0x00d4e8, 6, 3);
  underGlowLight.position.set(0, DESK_Y - 0.3, -0.2);
  commandDesk.add(underGlowLight);

  // drawer unit under the right wing
  const drawerUnit = new THREE.Mesh(new THREE.BoxGeometry(0.9, DESK_Y - 0.15, 1.6), blackMetal);
  drawerUnit.position.set(4.2, (DESK_Y - 0.15) / 2, 0.2);
  drawerUnit.castShadow = true;
  commandDesk.add(drawerUnit);
  for (let i = 0; i < 3; i++) {
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.32, 0.02), darkMetal);
    front.position.set(4.2, 0.35 + i * 0.4, 1.01);
    commandDesk.add(front);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), brassMaterial);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(4.2, 0.35 + i * 0.4, 1.05);
    commandDesk.add(handle);
  }

  const screenWall = new THREE.Group();
  screenWall.position.set(1, 0, -7.5); // dropped to match commandDesk's corrected floor height
  bunker.add(screenWall);

  const monitor = createNetworkMonitor();
  const mapTexture = monitor.texture;
  const wallTileTextures = [];

  const WALL_COLS = 4, WALL_ROWS = 3, TILE_W = 2.0, TILE_H = 1.0, WALL_CENTER_Y = 3.4;
  for (let row = 0; row < WALL_ROWS; row++) {
    for (let col = 0; col < WALL_COLS; col++) {
      const x = (col - (WALL_COLS - 1) / 2) * TILE_W;
      const y = WALL_CENTER_Y + ((WALL_ROWS - 1) / 2 - row) * TILE_H;

      const tileTex = mapTexture.clone();
      tileTex.image = mapTexture.image;
      tileTex.needsUpdate = true;
      tileTex.wrapS = THREE.ClampToEdgeWrapping;
      tileTex.wrapT = THREE.ClampToEdgeWrapping;
      tileTex.repeat.set(1 / WALL_COLS, 1 / WALL_ROWS);
      tileTex.offset.set(col / WALL_COLS, (WALL_ROWS - 1 - row) / WALL_ROWS);
      tileTex.colorSpace = THREE.SRGBColorSpace;
      wallTileTextures.push(tileTex);

      const tileMaterial = new THREE.MeshBasicMaterial({ map: tileTex, toneMapped: false });
      const tile = new THREE.Mesh(new THREE.BoxGeometry(TILE_W, TILE_H, 0.05), tileMaterial);
      tile.position.set(x, y, -0.8);
      screenWall.add(tile);
    }
  }

  hitbox(8, 3, 1.0, 1, 3.4, -8.1, { sectionId: 'contact' });

  const commandLight = new THREE.PointLight(0x00d4e8, 55, 20);
  commandLight.position.set(1, 5, -6);
  bunker.add(commandLight);

  // rug under the operator's chair
  const rugTex = createRugTexture();
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 32),
    new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.015, 1.7);
  rug.receiveShadow = true;
  commandDesk.add(rug);

  // mesh-back operator chair, wheeled 5-star base
  const chairMeshMat = new THREE.MeshStandardMaterial({ map: createChairMeshTexture(), roughness: 0.85, metalness: 0.05 });
  const chair = new THREE.Group();
  chair.position.set(0, 0, 1.9);
  commandDesk.add(chair);

  const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.5), chairMeshMat);
  seatCushion.position.y = 0.92;
  seatCushion.castShadow = true;
  chair.add(seatCushion);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.1), chairMeshMat);
  backrest.position.set(0, 1.55, 0.24);
  backrest.rotation.x = -0.12;
  chair.add(backrest);

  const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.09), chairMeshMat);
  headrest.position.set(0, 2.0, 0.32);
  headrest.rotation.x = -0.12;
  chair.add(headrest);

  for (const side of [-1, 1]) {
    const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), blackMetal);
    armPost.position.set(side * 0.3, 1.02, 0.05);
    chair.add(armPost);
    const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.36), blackMetal);
    armPad.position.set(side * 0.3, 1.17, 0.05);
    chair.add(armPad);
  }

  const gasLift = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.5, 10), blackMetal);
  gasLift.position.y = 0.65;
  chair.add(gasLift);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10), blackMetal);
  hub.position.y = 0.42;
  chair.add(hub);
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const legArm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 6), blackMetal);
    legArm.position.set(Math.cos(ang) * 0.21, 0.4, Math.sin(ang) * 0.21);
    legArm.rotation.z = Math.PI / 2;
    legArm.rotation.y = -ang;
    chair.add(legArm);
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), blackMetal);
    wheel.position.set(Math.cos(ang) * 0.42, 0.38, Math.sin(ang) * 0.42);
    chair.add(wheel);
  }

  // PC tower with a tempered-glass side panel and glowing fans
  const tower = new THREE.Group();
  tower.position.set(4.65, 0, 1.0);
  commandDesk.add(tower);
  const towerBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.85), blackMetal);
  towerBody.position.y = 0.48;
  towerBody.castShadow = true;
  tower.add(towerBody);
  const towerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.8, 0.7), glassMaterial);
  towerGlass.position.set(0.22, 0.5, 0);
  tower.add(towerGlass);
  const fanMats = [purpleLightMaterial, cyanScreen];
  for (let i = 0; i < 3; i++) {
    const fan = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 16), fanMats[i % 2]);
    fan.rotation.y = Math.PI / 2;
    fan.position.set(0.24, 0.22 + i * 0.28, 0);
    tower.add(fan);
  }
  const towerLight = new THREE.PointLight(0x8a2be2, 5, 2.2);
  towerLight.position.set(0.3, 0.5, 0);
  tower.add(towerLight);

  // desk clutter: mug, keyboard, mouse, loose cable
  const mug = new THREE.Group();
  mug.position.set(-4.4, DESK_Y + DESK_THICK / 2, 0.5);
  commandDesk.add(mug);
  const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 12), new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.4 }));
  mugBody.position.y = 0.055;
  mug.add(mugBody);
  const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 10), mugBody.material);
  mugHandle.position.set(0.05, 0.055, 0);
  mugHandle.rotation.y = Math.PI / 2;
  mug.add(mugHandle);

  const clutterKeyboard = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.03, 0.3), blackMetal);
  clutterKeyboard.position.set(0.1, DESK_Y + DESK_THICK / 2 + 0.015, 0.7);
  commandDesk.add(clutterKeyboard);
  const clutterMouse = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.14), blackMetal);
  clutterMouse.position.set(0.65, DESK_Y + DESK_THICK / 2 + 0.015, 0.7);
  commandDesk.add(clutterMouse);

  // dual monitors on stands, sitting on the desk in front of the chair, angled inward
  function buildDeskMonitor(x, z, mat, rotY) {
    const mon = new THREE.Group();
    mon.position.set(x, DESK_Y + DESK_THICK / 2, z);
    mon.rotation.y = rotY;
    commandDesk.add(mon);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.02, 16), blackMetal);
    base.position.y = 0.01;
    mon.add(base);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.3, 10), blackMetal);
    stand.position.y = 0.16;
    mon.add(stand);
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), blackMetal);
    hinge.position.y = 0.31;
    mon.add(hinge);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.4, 0.03), darkMetal);
    bezel.position.y = 0.31 + 0.22;
    mon.add(bezel);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), mat);
    screen.position.set(0, 0.31 + 0.22, 0.016);
    mon.add(screen);
    return mon;
  }
  buildDeskMonitor(-0.55, -0.35, cyanScreen, 0.16);
  buildDeskMonitor(0.85, -0.4, blueScreen, -0.14);
  hitbox(2.4, 1, 1.4, 1.15, 2.2, -7.9, { sectionId: 'contact' });

  const midRoomLight = new THREE.PointLight(0xbddfff, 30, 14);
  midRoomLight.position.set(0, 4, 0);
  bunker.add(midRoomLight);

  const rackPanels = [];

  function createServerRack(x, z, seed) {
    const rack = new THREE.Group();
    rack.position.set(x, 2.6, z);
    rack.rotation.y = -Math.PI / 2; // front (light) face turns to look into the room
    bunker.add(rack);

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.3, 1.2), blackMetal);
    body.castShadow = true;
    body.receiveShadow = true;
    rack.add(body);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.28, 5.38, 1.22), darkMetal);
    frame.position.z = -0.02;
    rack.add(frame);

    const panelTex = createServerPanelTexture(seed);
    const panelMat = new THREE.MeshStandardMaterial({
      map: panelTex, emissiveMap: panelTex, emissive: 0xffffff, emissiveIntensity: 1.15,
      roughness: 0.55, metalness: 0.35,
    });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 5.05), panelMat);
    panel.position.set(0, 0, 0.61);
    rack.add(panel);
    rackPanels.push({ mat: panelMat, seed });

    // wide cap light so adjacent racks' strips visually fuse into one continuous bar
    const capLight = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.06, 0.08), orangeLightMaterial);
    capLight.position.set(0, 2.68, 0.62);
    rack.add(capLight);

    return rack;
  }

  // flush against each other (2.2 wide, zero gap) so they read as one server wall.
  // extends toward -z (away from the staircase, which sits at z=3.5 on the +z side).
  const RACK_W = 2.2;
  const RACK_ROW_CENTER = -2.0;
  createServerRack(9.5, RACK_ROW_CENTER - 2 * RACK_W, 130);
  createServerRack(9.5, RACK_ROW_CENTER - RACK_W, 11);
  createServerRack(9.5, RACK_ROW_CENTER, 47);
  createServerRack(9.5, RACK_ROW_CENTER + RACK_W, 83);

  hitbox(2.2, 4.5, RACK_W * 4 + 0.6, 9.5, 2.6, RACK_ROW_CENTER - RACK_W / 2, { sectionId: 'skills' });

  // subtle blink: every so often, re-roll one rack's LED texture
  setInterval(() => {
    const rp = rackPanels[Math.floor(Math.random() * rackPanels.length)];
    rp.seed += 191;
    const tex = createServerPanelTexture(rp.seed);
    rp.mat.map.dispose();
    rp.mat.map = tex;
    rp.mat.emissiveMap = tex;
    rp.mat.needsUpdate = true;
  }, 550);

  const serverLight = new THREE.PointLight(0xc21eff, 65, 18);
  serverLight.position.set(8, 4, RACK_ROW_CENTER);
  bunker.add(serverLight);
  const serverLightCyan = new THREE.PointLight(0x29e0e0, 42, 16);
  serverLightCyan.position.set(9, 3.5, RACK_ROW_CENTER - 1.5);
  bunker.add(serverLightCyan);

  // wall-mounted "SERVER STATUS: ONLINE" readout, centered above the merged rack wall
  const statusTex = createServerStatusTexture();
  const statusFrame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.65, 2.75), blackMetal);
  statusFrame.position.set(11.85, 5.6, RACK_ROW_CENTER);
  bunker.add(statusFrame);
  const statusScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.5),
    new THREE.MeshBasicMaterial({ map: statusTex, toneMapped: false })
  );
  statusScreen.position.set(11.76, 5.6, RACK_ROW_CENTER);
  statusScreen.rotation.y = -Math.PI / 2;
  bunker.add(statusScreen);
  const statusGlow = new THREE.PointLight(0x39ffb0, 18, 8);
  statusGlow.position.set(11.2, 5.6, RACK_ROW_CENTER);
  bunker.add(statusGlow);

  // spray-stencil skull-and-crossbones on the concrete wall just past the rack row
  const skullTex = createSkullGraffitiTexture();
  const skullDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.2),
    new THREE.MeshBasicMaterial({ map: skullTex, transparent: true, depthWrite: false, toneMapped: false })
  );
  skullDecal.position.set(11.75, 3.3, RACK_ROW_CENTER - 2 * RACK_W - 1.8);
  skullDecal.rotation.y = -Math.PI / 2;
  bunker.add(skullDecal);

  /* ---- workbench in front of the server row: PCBs, soldering iron, lamp ---- */
  function createWorkbench(x, y, z, ry) {
    const bench = new THREE.Group();
    bench.position.set(x, y, z);
    bench.rotation.y = ry;
    bunker.add(bench);

    const benchWoodTex = createWoodGrainTexture();
    benchWoodTex.repeat.set(2.4, 1);
    const benchWood = new THREE.MeshStandardMaterial({ map: benchWoodTex, roughness: 0.75, metalness: 0.05 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 1.5), benchWood);
    top.position.y = 1.6;
    top.castShadow = true;
    top.receiveShadow = true;
    bench.add(top);
    // scuffed-metal edge trim with corner brackets, like a real bolted-together workbench
    const edge = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.04, 1.58), darkMetal);
    edge.position.y = 1.68;
    bench.add(edge);
    for (const [cx, cz] of [[-1.62, -0.7], [1.62, -0.7], [-1.62, 0.7], [1.62, 0.7]]) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.03), blackMetal);
      bracket.position.set(cx, 1.55, cz);
      bench.add(bracket);
      for (const [bx, bz] of [[-0.04, -0.04], [0.04, 0.04]]) {
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6), brassMaterial);
        screw.rotation.x = Math.PI / 2;
        screw.position.set(cx + bx, 1.55, cz + bz + 0.02);
        bench.add(screw);
      }
    }
    for (const [lx, lz] of [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), blackMetal);
      leg.position.set(lx, 0.8, lz);
      leg.castShadow = true;
      bench.add(leg);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 10), darkMetal);
      foot.position.set(lx, 0.015, lz);
      bench.add(foot);
    }

    const greenTex = createPCBTexture('#0c3d22', '#5ee89a', 'MAINBOARD V3');
    const greenBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.02, 0.6),
      new THREE.MeshStandardMaterial({ map: greenTex, roughness: 0.6 })
    );
    greenBoard.position.set(-0.75, 1.69, -0.1);
    greenBoard.rotation.y = 0.15;
    bench.add(greenBoard);

    const redTex = createPCBTexture('#5c1610', '#ff8a4a', 'PWR-CTRL R2');
    const redBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.02, 0.5),
      new THREE.MeshStandardMaterial({ map: redTex, roughness: 0.6 })
    );
    redBoard.position.set(0.55, 1.69, 0.18);
    redBoard.rotation.y = -0.25;
    bench.add(redBoard);

    const iron = new THREE.Group();
    iron.position.set(0.1, 1.71, 0.5);
    iron.rotation.z = 0.35;
    iron.rotation.y = 0.4;
    bench.add(iron);
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })
    );
    handle.rotation.z = Math.PI / 2;
    iron.add(handle);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), blackMetal);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = 0.18;
    iron.add(shaft);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xff5a1a, emissive: 0xff3300, emissiveIntensity: 2.5 })
    );
    tip.position.x = 0.26;
    iron.add(tip);
    const tipLight = new THREE.PointLight(0xff5522, 3, 1.2);
    tipLight.position.copy(tip.position);
    iron.add(tipLight);

    const screwdriver = new THREE.Group();
    screwdriver.position.set(-0.15, 1.71, 0.55);
    screwdriver.rotation.z = -0.2;
    bench.add(screwdriver);
    const sHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.024, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: 0xdc5a1e, roughness: 0.6 })
    );
    sHandle.rotation.z = Math.PI / 2;
    screwdriver.add(sHandle);
    const sShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16, 6), blackMetal);
    sShaft.rotation.z = Math.PI / 2;
    sShaft.position.x = 0.15;
    screwdriver.add(sShaft);

    const lamp = new THREE.Group();
    lamp.position.set(1.5, 1.68, -0.55);
    bench.add(lamp);
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.04, 12), blackMetal);
    lamp.add(lampBase);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), blackMetal);
    post.position.y = 0.25;
    lamp.add(post);
    const armA = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 8), blackMetal);
    armA.position.set(0.18, 0.6, 0);
    armA.rotation.z = Math.PI / 2.6;
    lamp.add(armA);
    const jointB = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), blackMetal);
    jointB.position.set(0.38, 0.72, 0);
    lamp.add(jointB);
    const armB = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 8), blackMetal);
    armB.position.set(0.55, 0.62, 0);
    armB.rotation.z = -Math.PI / 3.2;
    lamp.add(armB);
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.05, 0.16, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.5, side: THREE.DoubleSide })
    );
    shade.position.set(0.7, 0.5, 0);
    shade.rotation.z = Math.PI / 2 + 0.5;
    lamp.add(shade);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffcf8a, emissiveIntensity: 3 })
    );
    bulb.position.set(0.74, 0.46, 0);
    lamp.add(bulb);
    const lampLight = new THREE.SpotLight(0xffcf8a, 25, 3, Math.PI / 4, 0.5, 1.5);
    lampLight.position.set(0.74, 0.46, 0);
    lampLight.castShadow = true;
    lamp.add(lampLight);
    lampLight.target.position.set(0.4, 1.68, 0);
    lamp.add(lampLight.target);

    const stool = new THREE.Group();
    stool.position.set(0, 0, 1.3);
    bench.add(stool);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 16), benchWood);
    seat.position.y = 0.85;
    stool.add(seat);
    for (const ang of [0, 2.09, 4.19]) {
      const lx = Math.cos(ang) * 0.24, lz = Math.sin(ang) * 0.24;
      const legS = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6), blackMetal);
      legS.position.set(lx, 0.42, lz);
      stool.add(legS);
    }

    return bench;
  }

  // flush against the left wall, directly under the investigation board — see below
  createWorkbench(-10.2, 0, 0, Math.PI / 2);
  hitbox(2.2, 2.4, 3.6, -10.2, 1.6, 0, { sectionId: 'experience' });

  // pegboard — its own standalone wall fixture, further down toward the front corner
  const pegboardTex = createPegboardTexture();
  const pegboardFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.5, 3.3), darkMetal);
  pegboardFrame.position.set(-11.82, 3.7, 6);
  bunker.add(pegboardFrame);
  const pegboard = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 2.4),
    new THREE.MeshStandardMaterial({ map: pegboardTex, roughness: 0.85 })
  );
  pegboard.position.set(-11.78, 3.7, 6);
  pegboard.rotation.y = Math.PI / 2;
  bunker.add(pegboard);
  const pegboardLight = new THREE.PointLight(0xffd9a0, 4, 6);
  pegboardLight.position.set(-10.8, 4.0, 6);
  bunker.add(pegboardLight);

  // investigation board — centered on the left wall, directly above the workbench
  const board = new THREE.Group();
  board.position.set(-10.8, 4.5, 0);
  board.rotation.y = Math.PI / 2;
  bunker.add(board);

  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.2, 0.1), darkMetal);
  boardFrame.position.set(0, 0, -0.05);
  board.add(boardFrame);
  const boardBase = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 0.15), corkMaterial);
  board.add(boardBase);

  const caseFiles: [number, number, string, string, string][] = [
    [-1.8, 1.1, 'CASE #001', 'STATUS: OPEN', '#ff5a5a'],
    [0, 1.3, 'SUBJECT: NEXUS', 'TRACE PENDING', '#5ad1ff'],
    [1.8, 0.8, 'OP: NIGHTFALL', 'PRIORITY: HIGH', '#ffb347'],
    [-1.4, -0.7, 'LEAD: UNKNOWN', 'FLAGGED', '#ff5a5a'],
    [1.2, -0.9, 'ACCESS LOG', 'REVIEW REQ.', '#5ad1ff'],
  ];
  const pinMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d0bf, roughness: 0.6, metalness: 0.3 });
  caseFiles.forEach(([x, y, title, tag, accent]) => {
    const tex = createCaseFileTexture(title, tag, accent);
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 1.02),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
    );
    paper.position.set(x, y, 0.09);
    paper.rotation.z = (Math.random() - 0.5) * 0.14;
    board.add(paper);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), pinMaterial);
    pin.position.set(x, y + 0.47, 0.14);
    board.add(pin);
  });

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.85 });
  const points = [
    new THREE.Vector3(-1.8, 1.5, 0.15),
    new THREE.Vector3(0, 1.7, 0.15),
    new THREE.Vector3(1.8, 1.2, 0.15),
    new THREE.Vector3(1.2, -0.4, 0.15),
    new THREE.Vector3(-1.4, -0.2, 0.15),
  ];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  board.add(new THREE.Line(lineGeometry, lineMaterial));

  const boardLight = new THREE.SpotLight(0xfff2d8, 7, 9, Math.PI / 4.5, 0.6, 1.5);
  boardLight.position.set(-8.4, 6.6, 0);
  boardLight.target.position.set(-10.8, 4.5, 0);
  bunker.add(boardLight);
  bunker.add(boardLight.target);

  hitbox(0.8, 4, 6, -10.6, 4.5, 0, { sectionId: 'projects' });

  /* ---- L-shaped sectional sofa: two runs meeting in a corner beside the staircase,
     same fabric as before — just properly proportioned like a real corner sectional
     instead of a row of chairs ---- */
  const sofaFabricTex = createFabricTexture('#232838', '#171a26');
  const sofaFabricMat = new THREE.MeshStandardMaterial({ map: sofaFabricTex, roughness: 0.92, metalness: 0 });
  const sofaFrameMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.6, metalness: 0.1 });
  const sofaLegMat = new THREE.MeshStandardMaterial({ color: 0x1c130c, roughness: 0.5, metalness: 0.2 });
  const pillowFabricTex = createFabricTexture('#7a2740', '#4a1526');
  const pillowFabricMat = new THREE.MeshStandardMaterial({ map: pillowFabricTex, roughness: 0.85 });

  // builds one straight run along local +x, seat cushions facing local -z (the "open" side);
  // hasArmA = armrest at the local -x end, hasArmB = armrest at the local +x end
  function buildSofaRun(length, targetCushionWidth, hasArmA, hasArmB) {
    const run = new THREE.Group();
    const DEPTH = 1.1, FRAME_H = 0.42, SEAT_H = 0.26, BACK_H = 0.6;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(length, FRAME_H, DEPTH), sofaFrameMat);
    frame.position.y = FRAME_H / 2;
    frame.castShadow = true;
    frame.receiveShadow = true;
    run.add(frame);

    const legCount = Math.max(2, Math.round(length / 1.6) + 1);
    for (let i = 0; i < legCount; i++) {
      const lx = -length / 2 + 0.2 + (i * (length - 0.4)) / (legCount - 1);
      for (const lz of [-DEPTH / 2 + 0.14, DEPTH / 2 - 0.14]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.17, 8), sofaLegMat);
        leg.position.set(lx, 0.085, lz);
        run.add(leg);
      }
    }

    const armW = 0.28;
    const seatSpan = length - (hasArmA ? armW : 0) - (hasArmB ? armW : 0);
    const cushionCount = Math.max(1, Math.round(seatSpan / targetCushionWidth));
    const seatW = seatSpan / cushionCount;
    const startX = -length / 2 + (hasArmA ? armW : 0);

    for (let i = 0; i < cushionCount; i++) {
      const cx = startX + seatW * (i + 0.5);
      const seat = new THREE.Mesh(
        new RoundedBoxGeometry(seatW - 0.05, SEAT_H, DEPTH - 0.28, 3, 0.045),
        sofaFabricMat
      );
      seat.position.set(cx, FRAME_H + SEAT_H / 2 - 0.02, -0.1);
      seat.castShadow = true;
      run.add(seat);

      const back = new THREE.Mesh(
        new RoundedBoxGeometry(seatW - 0.05, BACK_H, 0.24, 3, 0.045),
        sofaFabricMat
      );
      back.position.set(cx, FRAME_H + SEAT_H + BACK_H / 2 - 0.05, DEPTH / 2 - 0.18);
      back.rotation.x = -0.1;
      back.castShadow = true;
      run.add(back);
    }

    if (hasArmA) {
      const arm = new THREE.Mesh(new RoundedBoxGeometry(armW - 0.03, 0.58, DEPTH - 0.04, 3, 0.05), sofaFabricMat);
      arm.position.set(-length / 2 + armW / 2, FRAME_H + 0.29, 0);
      arm.castShadow = true;
      run.add(arm);
    }
    if (hasArmB) {
      const arm = new THREE.Mesh(new RoundedBoxGeometry(armW - 0.03, 0.58, DEPTH - 0.04, 3, 0.05), sofaFabricMat);
      arm.position.set(length / 2 - armW / 2, FRAME_H + 0.29, 0);
      arm.castShadow = true;
      run.add(arm);
    }

    return run;
  }

  // two runs meeting in an L, right at the corner beside the stairs (world x=7.5 sits just
  // inside the stair's retaining wall at x=8.15) — the long run along the front wall,
  // the short run turning inward to end just short of the bottom step
  const CORNER_X = 7.5;
  const CORNER_Z = 9.15;

  const sofaLong = buildSofaRun(7.5, 2.4, true, false);
  sofaLong.position.set(CORNER_X - 7.5 / 2, 0, CORNER_Z);
  bunker.add(sofaLong);

  const sofaReturn = buildSofaRun(6.5, 2.1, false, true);
  sofaReturn.position.set(CORNER_X, 0, CORNER_Z - 6.5 / 2);
  sofaReturn.rotation.y = Math.PI / 2;
  bunker.add(sofaReturn);

  // throw pillows across both runs
  const SOFA_X = CORNER_X - 3.5;
  const SOFA_Z = CORNER_Z;
  [
    [CORNER_X - 6.4, 0.7, CORNER_Z - 0.3, 0.35, -0.37],
    [CORNER_X - 1.6, 0.7, CORNER_Z - 0.3, 0.3, 0.5],
    [CORNER_X + 0.3, 0.7, CORNER_Z - 4.2, 0.35, 1.9],
  ].forEach(([x, y, z, rx, ry]) => {
    const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.36, 0.12, 3, 0.05), pillowFabricMat);
    pillow.position.set(x, y, z);
    pillow.rotation.set(rx, ry, 0.15);
    pillow.castShadow = true;
    bunker.add(pillow);
  });

  /* ---- coffee table in front of the sectional ---- */
  const coffeeTable2 = new THREE.Group();
  coffeeTable2.position.set(SOFA_X, 0, SOFA_Z - 1.85); // centered in the corner, out into the room
  bunker.add(coffeeTable2);

  const ctFrameMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.4, metalness: 0.7 });
  for (const [lx, lz] of [[-1.15, -0.4], [1.15, -0.4], [-1.15, 0.4], [1.15, 0.4]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), ctFrameMat);
    leg.position.set(lx, 0.2, lz);
    leg.castShadow = true;
    coffeeTable2.add(leg);
  }
  const ctRail = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.04, 1.0), ctFrameMat);
  ctRail.position.y = 0.38;
  coffeeTable2.add(ctRail);

  // tempered-glass top, showing the room's neon glow reflected in it
  const ctTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 1.05), glassMaterial);
  ctTop.position.y = 0.42;
  ctTop.castShadow = true;
  ctTop.receiveShadow = true;
  coffeeTable2.add(ctTop);

  // a lower wood shelf underneath, with a couple of books for a lived-in look
  const ctShelfTex = createWoodGrainTexture();
  const ctShelf = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.03, 0.85), new THREE.MeshStandardMaterial({ map: ctShelfTex, roughness: 0.7 }));
  ctShelf.position.y = 0.1;
  coffeeTable2.add(ctShelf);

  const bookColors = [0x8a2e2e, 0x2e4a8a, 0x3a6b4a];
  bookColors.forEach((c, i) => {
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.24), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
    book.position.set(-0.75, 0.12 + i * 0.05, 0.15);
    book.rotation.y = i * 0.06;
    coffeeTable2.add(book);
  });

  // mug and a small folded cable on the glass top
  const ctMug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.09, 12), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.4 }));
  ctMug.position.set(0.7, 0.42 + 0.045, -0.2);
  coffeeTable2.add(ctMug);
  const ctRemote = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.05), blackMetal);
  ctRemote.position.set(0.5, 0.42 + 0.01, 0.25);
  ctRemote.rotation.y = 0.4;
  coffeeTable2.add(ctRemote);

  function createCable(pts) {
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 30, 0.035, 8, false);
    bunker.add(new THREE.Mesh(tube, cableMaterial));
  }

  createCable([
    new THREE.Vector3(-7, 0.3, 3), new THREE.Vector3(-4, 0.25, 2),
    new THREE.Vector3(-1, 0.25, 3), new THREE.Vector3(2, 0.25, 1),
  ]);
  createCable([
    new THREE.Vector3(7, 0.25, -4), new THREE.Vector3(5, 0.25, -2),
    new THREE.Vector3(4, 0.25, 0), new THREE.Vector3(2, 0.25, 2),
  ]);

  for (let x = -8; x <= 8; x += 5) {
    cylinder(0.45, 0.55, 0.2, blackMetal, x, H - 0.8, 1);
    const light = new THREE.PointLight(0xaad0ff, 32, 16);
    light.position.set(x, H - 1, 1);
    bunker.add(light);
  }

  // moved off the investigation board (its own warm spotlight now handles that corner) and
  // toned down — at the old position/intensity this blew out the board into a pink hotspot
  const pinkAccent = new THREE.PointLight(0xff2d9e, 16, 11);
  pinkAccent.position.set(-4, 3, -3);
  bunker.add(pinkAccent);

  const blueAccent2 = new THREE.PointLight(0x0066ff, 24, 12);
  blueAccent2.position.set(-8, 2.5, 7);
  bunker.add(blueAccent2);

  const ambient = new THREE.AmbientLight(0x1f2530, 2.0);
  bunker.add(ambient);

  // the monitor redraws a large 2D canvas and re-uploads it to all 12 wall-tile texture
  // clones every call — throttled to ~12fps (still reads as live) instead of every render
  // frame, since that redraw+upload was the single biggest per-frame cost in the scene
  let lastScreenUpdate = 0;
  bunker.userData.updateScreen = (now: number) => {
    if (now - lastScreenUpdate < 80) return;
    lastScreenUpdate = now;
    monitor.update(now);
    for (const t of wallTileTextures) t.needsUpdate = true;
  };
  bunker.userData.hitMeshes = hitMeshes;

  return bunker;
}

/* ---------------------------------------------------------------------- */
