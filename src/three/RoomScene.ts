import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SECTIONS, type SectionId } from '../data/resume';
import {
  LAYOUT, CABIN_BOUNDS, BUNKER_BOUNDS, CABIN_SPAWN, CABIN_SPAWN_YAW, BUNKER_SPAWN, BUNKER_SPAWN_YAW,
  BUNKER_Y, CABIN_OBSTACLES, BUNKER_OBSTACLES,
  EXTERIOR_SPAWN, EXTERIOR_LOOK_AT,
} from './layout';
import { PALETTE } from './palette';
import { buildStudyNook } from './props';
import { buildSimpleCabin, buildExteriorScene } from './simpleCabin';
import { buildTechBunker } from './techBunker';
import { loadModels, type ModelLibrary } from './assets';

export type Level = 'cabin' | 'bunker';

export interface RoomSceneOptions {
  canvas: HTMLCanvasElement;
  onLookAt: (label: string | null) => void;
  onSelect: (id: SectionId) => void;
  onLockChange: (locked: boolean) => void;
  onTransition: (active: boolean) => void;
  onLoadProgress?: (ratio: number) => void;
  onReady: () => void;
}

const BASE_FOV_DEG = 58;
const ZOOM_FOV_DEG = 30;
const EYE_HEIGHT = 2.2;
const CABIN_EYE_HEIGHT = 2.8; // the cabin's room/furniture are built at a larger scale than the bunker
const PLAYER_RADIUS = 0.35;
const MOVE_SPEED = 4.2;
const INTERACT_DIST = 3.4;

// Only 'education' still routes through this generic builder — the bunker's fixtures
// (skills/experience/contact/projects) are now built and tagged directly in techBunker.ts.
const BUILDERS: Partial<Record<SectionId, (lib: ModelLibrary) => THREE.Group>> = {
  education: buildStudyNook,
};

export class RoomScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private raycaster = new THREE.Raycaster();
  private hitMeshes: THREE.Mesh[] = [];
  private lookTargetLabel: string | null = null;
  private lookTargetUserData: Record<string, unknown> | null = null;
  private velocity = new THREE.Vector3();
  private keys: Record<string, boolean> = {};
  private touchMove = new THREE.Vector2(0, 0);
  private locked = false;
  private touchActive = false;
  private paused = false;
  private level: Level = 'cabin';
  private everEntered = false;
  private zoomActive = false;
  private clock = new THREE.Clock();
  private walkTime = 0;
  private raf = 0;
  private disposed = false;
  private spinRefs: {
    proto?: THREE.Object3D;
    navLight?: THREE.Mesh;
    towerStrip?: THREE.Mesh;
    signalPip?: THREE.Mesh;
    flickerSwitches?: THREE.Mesh[];
    flames?: THREE.Mesh[];
    fireLight?: THREE.PointLight;
  } = {};
  private opts: RoomSceneOptions;
  private library: ModelLibrary | null = null;
  private bunkerUpdateScreen: ((now: number) => void) | null = null;
  private debugEl: HTMLDivElement | null = null; // TEMP DEBUG

  constructor(opts: RoomSceneOptions) {
    this.opts = opts;
    const { canvas } = opts;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // capped at 1.5 instead of 2 — bloom + shadows both scale with pixel count, and on a
    // 2x/3x-DPR display the jump from 1.5 to 2 is a 78% increase in fragment work for a
    // barely-perceptible sharpness gain
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    // PCFSoft instead of VSM — VSM needs an extra blur pass per shadow map and was a
    // real cost with two shadow-casting point/spot lights already in the scene
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(PALETTE.night);
    this.scene.fog = new THREE.FogExp2(PALETTE.night, 0.05);

    this.camera = new THREE.PerspectiveCamera(BASE_FOV_DEG, 1, 0.08, 200);
    this.camera.rotation.order = 'YXZ';

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.4, 0.78);
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());

    this.buildLighting();
    const cabin = buildSimpleCabin();
    this.scene.add(cabin);
    const cabinHits = (cabin.userData.hitMeshes as THREE.Mesh[] | undefined) ?? [];
    this.hitMeshes.push(...cabinHits);
    if (cabin.userData.flames) this.spinRefs.flames = cabin.userData.flames as THREE.Mesh[];
    if (cabin.userData.fireLight) {
      const fireLight = cabin.userData.fireLight as THREE.PointLight;
      this.spinRefs.fireLight = fireLight;
      fireLight.castShadow = true;
      fireLight.shadow.mapSize.set(1024, 1024);
      fireLight.shadow.camera.near = 0.1;
      fireLight.shadow.camera.far = 9;
      fireLight.shadow.bias = -0.002;
    }
    const bunker = buildTechBunker();
    bunker.position.y = BUNKER_Y;
    this.scene.add(bunker);
    const bunkerHits = (bunker.userData.hitMeshes as THREE.Mesh[] | undefined) ?? [];
    this.hitMeshes.push(...bunkerHits);
    if (bunker.userData.updateScreen) this.bunkerUpdateScreen = bunker.userData.updateScreen as (now: number) => void;
    this.scene.add(buildExteriorScene());

    this.camera.position.copy(EXTERIOR_SPAWN);
    this.camera.lookAt(EXTERIOR_LOOK_AT);

    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('wheel', this.onWheel, { passive: true });

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.resize(w, h);

    this.animate = this.animate.bind(this);
    this.raf = requestAnimationFrame(this.animate);

    this.loadAndBuildFurniture();

    // TEMP DEBUG — on-screen camera position readout, remove once furniture placement is settled
    this.debugEl = document.createElement('div');
    this.debugEl.style.cssText =
      'position:fixed;top:8px;left:8px;z-index:9999;font:12px monospace;color:#0f0;background:rgba(0,0,0,0.6);padding:4px 8px;pointer-events:none;';
    document.body.appendChild(this.debugEl);
  }

  /** Furniture depends on real glTF assets, loaded async; the room shell above renders immediately. */
  private async loadAndBuildFurniture() {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      this.opts.onLoadProgress?.(total > 0 ? loaded / total : 0);
    };
    const library = await loadModels(manager);
    if (this.disposed) return;
    this.library = library;
    this.buildProps(library);

    // every surface can both cast and receive shadows now that shadow mapping is on
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as THREE.Mesh).isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    this.opts.onLoadProgress?.(1);
    requestAnimationFrame(() => this.opts.onReady());
  }

  private buildLighting() {
    // the cabin's own lights (ambient + moonlight + warm room light) live in simpleCabin.ts
    const bunkerAmbient = new THREE.HemisphereLight(0x6d747b, 0x2a2e33, 1.2);
    bunkerAmbient.position.y = BUNKER_Y;
    this.scene.add(bunkerAmbient);
    const bunkerKey = new THREE.DirectionalLight(0xcfe8ff, 0.42);
    bunkerKey.position.set(4, BUNKER_Y + 7, 4);
    bunkerKey.target.position.set(0, BUNKER_Y, -5);
    this.scene.add(bunkerKey);
    this.scene.add(bunkerKey.target);
    const bunkerFill = new THREE.DirectionalLight(0x8fa8b8, 0.35);
    bunkerFill.position.set(-3, BUNKER_Y + 5, 6);
    bunkerFill.target.position.set(0, BUNKER_Y, -5);
    this.scene.add(bunkerFill);
    this.scene.add(bunkerFill.target);
  }

  private buildProps(library: ModelLibrary) {
    for (const layout of LAYOUT) {
      const builder = BUILDERS[layout.id];
      if (!builder) continue;
      const group = builder(library);
      group.position.copy(layout.propPosition);
      group.rotation.y = layout.propRotationY;
      this.scene.add(group);

      if (group.userData.spinProto) this.spinRefs.proto = group.userData.spinProto;
      if (group.userData.aircraftNav) this.spinRefs.navLight = group.userData.aircraftNav;
      if (group.userData.towerStrip) this.spinRefs.towerStrip = group.userData.towerStrip;
      if (group.userData.signalPip) this.spinRefs.signalPip = group.userData.signalPip;
      if (group.userData.flickerSwitches) this.spinRefs.flickerSwitches = group.userData.flickerSwitches;

      const r = layout.interactRadius;
      const h = layout.interactHeight;
      const hit = new THREE.Mesh(new THREE.BoxGeometry(r * 2, h, r * 2), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(layout.propPosition).add(new THREE.Vector3(0, h / 2, 0));
      hit.userData.sectionId = layout.id;
      this.scene.add(hit);
      this.hitMeshes.push(hit);

      const accentColor = parseInt(SECTIONS.find((s) => s.id === layout.id)!.accent.slice(1), 16);
      const accentLight = new THREE.PointLight(accentColor, 2.2, 8, 2);
      accentLight.position.copy(layout.propPosition).add(new THREE.Vector3(0, 2, 1.5));
      this.scene.add(accentLight);
    }
  }

  /* ---------------- input plumbing ---------------- */

  requestLock() {
    try {
      const result = this.renderer.domElement.requestPointerLock() as unknown;
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {
          // pointer lock unavailable (e.g. sandboxed/embedded context) — fail silently
        });
      }
    } catch {
      // synchronous throw path in older browsers — ignore
    }
  }

  /** First-ever entry: fades from the exterior establishing shot into the cabin and engages control. */
  enter(useTouch: boolean) {
    if (this.everEntered) return;
    this.everEntered = true;
    this.opts.onTransition(true);
    setTimeout(() => {
      this.teleportTo(CABIN_SPAWN.x, CABIN_SPAWN.z, CABIN_SPAWN_YAW, 'cabin');
      this.opts.onTransition(false);
      if (useTouch) this.activateTouch();
      else this.requestLock();
    }, 260);
  }

  private onPointerLockChange = () => {
    this.locked = document.pointerLockElement === this.renderer.domElement;
    this.opts.onLockChange(this.locked || this.touchActive);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked || this.paused) return;
    this.applyLookDelta(e.movementX, e.movementY);
  };

  private applyLookDelta(dx: number, dy: number, sensitivity = 0.0022) {
    this.camera.rotation.y -= dx * sensitivity;
    this.camera.rotation.x -= dy * sensitivity;
    this.camera.rotation.x = THREE.MathUtils.clamp(this.camera.rotation.x, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
  }

  /** Touch-drag look, called by the UI layer with raw screen-pixel deltas. */
  touchLook(dx: number, dy: number) {
    if (this.paused) return;
    this.applyLookDelta(dx, dy, 0.0032);
  }

  /** Virtual joystick input in [-1,1] on both axes (x = strafe, y = forward). */
  setTouchMove(x: number, y: number) {
    this.touchMove.set(
      THREE.MathUtils.clamp(x, -1, 1),
      THREE.MathUtils.clamp(y, -1, 1)
    );
  }

  /** Call once, from the "tap to enter" overlay, to enable touch-driven control. */
  activateTouch() {
    this.touchActive = true;
    this.opts.onLockChange(true);
  }

  setZoom(active: boolean) {
    this.zoomActive = active;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if ((e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') && !this.paused) {
      this.triggerInteract();
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };
  private onWheel = (e: WheelEvent) => {
    if (this.paused) return;
    if (e.deltaY < 0) this.zoomActive = true;
    else if (e.deltaY > 0) this.zoomActive = false;
  };

  tapInteract() {
    this.triggerInteract();
  }

  private triggerInteract() {
    const ud = this.lookTargetUserData;
    if (!ud) return;
    if (ud.hatch) this.descend();
    else if (ud.ladder) this.ascend();
    else if (ud.sectionId) this.opts.onSelect(ud.sectionId as SectionId);
  }

  /* ---------------- level transitions ---------------- */

  private teleportTo(x: number, z: number, yaw: number, level: Level) {
    this.level = level;
    const baseY = level === 'cabin' ? 0 : BUNKER_Y;
    const eyeHeight = level === 'cabin' ? CABIN_EYE_HEIGHT : EYE_HEIGHT;
    this.camera.position.set(x, baseY + eyeHeight, z);
    this.camera.rotation.set(0, yaw, 0);
    this.velocity.set(0, 0, 0);
    (this.scene.fog as THREE.FogExp2).density = level === 'cabin' ? 0.016 : 0.013;
  }

  private descend() {
    this.opts.onTransition(true);
    setTimeout(() => {
      this.teleportTo(BUNKER_SPAWN.x, BUNKER_SPAWN.z, BUNKER_SPAWN_YAW, 'bunker');
      this.opts.onTransition(false);
    }, 240);
  }

  private ascend() {
    this.opts.onTransition(true);
    setTimeout(() => {
      this.teleportTo(CABIN_SPAWN.x, CABIN_SPAWN.z, CABIN_SPAWN_YAW, 'cabin');
      this.opts.onTransition(false);
    }, 240);
  }

  /* ---------------- pause / resume for content panels ---------------- */

  pause() {
    this.paused = true;
    if (this.locked) document.exitPointerLock();
    if (this.lookTargetLabel !== null) {
      this.lookTargetLabel = null;
      this.lookTargetUserData = null;
      this.opts.onLookAt(null);
    }
  }

  resume() {
    this.paused = false;
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
  }

  /* ---------------- per-frame update ---------------- */

  private updateMovement(dt: number) {
    const input = new THREE.Vector2(0, 0);
    if (this.keys.KeyW || this.keys.ArrowUp) input.y += 1;
    if (this.keys.KeyS || this.keys.ArrowDown) input.y -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) input.x += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) input.x -= 1;
    input.x += this.touchMove.x;
    input.y += this.touchMove.y;
    if (input.lengthSq() > 1) input.normalize();

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();

    const targetVel = new THREE.Vector3()
      .addScaledVector(right, input.x)
      .addScaledVector(forward, input.y)
      .multiplyScalar(MOVE_SPEED);
    this.velocity.lerp(targetVel, Math.min(dt * 9, 1));

    let nx = this.camera.position.x + this.velocity.x * dt;
    let nz = this.camera.position.z + this.velocity.z * dt;

    const obstacles = this.level === 'cabin' ? CABIN_OBSTACLES : BUNKER_OBSTACLES;
    for (const o of obstacles) {
      const dx = nx - o.x;
      const dz = nz - o.z;
      const dist = Math.hypot(dx, dz);
      const minDist = o.radius + PLAYER_RADIUS;
      if (dist < minDist && dist > 0.0001) {
        const push = minDist - dist;
        nx += (dx / dist) * push;
        nz += (dz / dist) * push;
      }
    }

    const b = this.level === 'cabin' ? CABIN_BOUNDS : BUNKER_BOUNDS;
    nx = THREE.MathUtils.clamp(nx, b.minX, b.maxX);
    nz = THREE.MathUtils.clamp(nz, b.minZ, b.maxZ);

    this.camera.position.x = nx;
    this.camera.position.z = nz;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.3) {
      this.walkTime += dt * speed * 1.6;
    }
    const baseY = this.level === 'cabin' ? 0 : BUNKER_Y;
    const eyeHeight = this.level === 'cabin' ? CABIN_EYE_HEIGHT : EYE_HEIGHT;
    const bob = speed > 0.3 ? Math.sin(this.walkTime) * 0.035 : 0;
    this.camera.position.y = baseY + eyeHeight + bob;
  }

  private updateInteractRaycast() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = INTERACT_DIST;
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
    const hit = hits[0];
    const ud = hit ? (hit.object.userData as Record<string, unknown>) : null;

    let label: string | null = null;
    if (ud?.hatch) label = 'Open the trapdoor';
    else if (ud?.ladder) label = 'Climb back up';
    else if (ud?.sectionId) label = `Inspect the ${SECTIONS.find((s) => s.id === ud.sectionId)!.objectLabel}`;

    if (label !== this.lookTargetLabel) {
      this.lookTargetLabel = label;
      this.lookTargetUserData = ud;
      this.opts.onLookAt(label);
    }
  }

  private animate() {
    if (this.disposed) return;
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x <= 0 || size.y <= 0) {
      this.raf = requestAnimationFrame(this.animate);
      return;
    }
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.getElapsedTime();

    if (!this.everEntered) {
      const sway = Math.sin(t * 0.12) * 0.7;
      const drift = Math.min(t * 0.12, 2.5);
      this.camera.position.set(EXTERIOR_SPAWN.x + sway, EXTERIOR_SPAWN.y, EXTERIOR_SPAWN.z - drift);
      this.camera.lookAt(EXTERIOR_LOOK_AT);
    }

    const active = (this.locked || this.touchActive) && !this.paused && this.everEntered;
    if (active) {
      this.updateMovement(dt);
      this.updateInteractRaycast();
    }

    const targetFov = this.zoomActive ? ZOOM_FOV_DEG : BASE_FOV_DEG;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(dt * 10, 1));
      this.camera.updateProjectionMatrix();
    }

    if (this.spinRefs.proto) this.spinRefs.proto.rotation.y = t * 0.6;
    if (this.spinRefs.navLight) {
      const m = this.spinRefs.navLight.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 1.8 + Math.sin(t * 6) * 1.4;
    }
    if (this.spinRefs.towerStrip) {
      const m = this.spinRefs.towerStrip.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 1.6 + Math.sin(t * 3) * 0.6;
    }
    if (this.spinRefs.signalPip) {
      const m = this.spinRefs.signalPip.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = Math.sin(t * 8) > 0.3 ? 2.6 : 0.3;
    }
    if (this.spinRefs.flickerSwitches) {
      this.spinRefs.flickerSwitches.forEach((sw, i) => {
        const m = sw.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = 1.2 + Math.sin(t * 4 + i) * 0.5;
      });
    }
    if (this.spinRefs.flames) {
      this.spinRefs.flames.forEach((flame, i) => {
        const flicker = Math.sin(t * 11 + i * 2.1) * 0.4 + Math.sin(t * 23 + i) * 0.2;
        flame.scale.y = 1 + flicker * 0.25;
        const m = flame.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = 1.9 + flicker;
      });
    }
    if (this.spinRefs.fireLight) {
      this.spinRefs.fireLight.intensity = 5.2 + Math.sin(t * 14) * 0.6 + Math.sin(t * 6) * 0.4;
    }
    if (this.bunkerUpdateScreen) this.bunkerUpdateScreen(performance.now());

    if (this.debugEl) {
      const p = this.camera.position;
      this.debugEl.textContent = `${this.level}  x:${p.x.toFixed(1)} y:${p.y.toFixed(1)} z:${p.z.toFixed(1)}  yaw:${this.camera.rotation.y.toFixed(2)}`;
    }

    this.composer.render();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('wheel', this.onWheel);
    this.debugEl?.remove(); // TEMP DEBUG
    this.renderer.dispose();
  }
}
