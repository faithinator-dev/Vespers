import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraPreset } from '../types/journal';
import { CafeSceneAssets, buildCafeEnvironment } from './cafeModels';
import { CafeTextures, createCafeTextures } from './proceduralTextures';

interface CameraPose {
  pos: THREE.Vector3;
  target: THREE.Vector3;
}

const PRESET_POSES: Record<CameraPreset, CameraPose> = {
  desk: {
    pos: new THREE.Vector3(0.45, 1.55, 2.75),
    target: new THREE.Vector3(-0.08, 0.25, -0.05),
  },
  lamp: {
    pos: new THREE.Vector3(-0.15, 1.18, 1.25),
    target: new THREE.Vector3(-0.95, 0.56, -0.45),
  },
  journal: {
    pos: new THREE.Vector3(0.08, 1.48, 1.22),
    target: new THREE.Vector3(-0.08, 0.06, 0.24),
  },
  window: {
    pos: new THREE.Vector3(1.85, 1.78, 3.25),
    target: new THREE.Vector3(-0.2, 0.42, -0.4),
  },
};

const WORKSPACE_OFFSET_POSE: CameraPose = {
  pos: new THREE.Vector3(0.85, 1.65, 2.95),
  target: new THREE.Vector3(-0.35, 0.35, -0.15),
};

// Pre-allocated module-scope math helpers (zero per-frame allocations)
const _vec3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class CafeSceneController {
  private container: HTMLElement;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private textures: CafeTextures;
  private assets: CafeSceneAssets;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  private targetLampWarmth = 1.0;
  private currentLampWarmth = 1.0;

  private activeTransition: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private reducedMotion = false;
  private onContextLostCb?: (lost: boolean) => void;

  constructor(container: HTMLElement, onContextLost?: (lost: boolean) => void) {
    this.container = container;
    this.onContextLostCb = onContextLost;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const width = Math.max(container.clientWidth, window.innerWidth, 1);
    const height = Math.max(container.clientHeight, window.innerHeight, 1);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Scene + horizon-matched FogExp2
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x140e0a);
    this.scene.fog = new THREE.FogExp2(0x140e0a, 0.072);

    // Mandatory studio environment reflection map on every device
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Camera
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 45);
    this.camera.position.copy(WORKSPACE_OFFSET_POSE.pos);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(WORKSPACE_OFFSET_POSE.target);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.0;
    this.controls.maxDistance = 5.4;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
    this.controls.minAzimuthAngle = -Math.PI * 0.48;
    this.controls.maxAzimuthAngle = Math.PI * 0.48;
    this.controls.enablePan = false;
    this.controls.update();

    this.controls.addEventListener('start', this.handleControlsStart);

    // 3-point warm/cool lighting rig
    const hemiLight = new THREE.HemisphereLight(0x3a4a66, 0x24170e, 0.65);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffcb8c, 1.35);
    keyLight.position.set(-2.6, 3.8, 2.2);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 12;
      keyLight.shadow.camera.left = -2.8;
      keyLight.shadow.camera.right = 2.8;
      keyLight.shadow.camera.top = 2.8;
      keyLight.shadow.camera.bottom = -2.8;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6d84a6, 0.55);
    rimLight.position.set(2.8, 2.4, -2.5);
    this.scene.add(rimLight);

    // Build procedural textures & composite models
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createCafeTextures(maxAnisotropy);
    this.assets = buildCafeEnvironment(this.textures);
    this.scene.add(this.assets.root);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.tick();
  }

  private handleControlsStart = (): void => {
    this.activeTransition = null;
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.cancelLoop();
    this.onContextLostCb?.(true);
  };

  private handleContextRestored = (): void => {
    this.onContextLostCb?.(false);
    this.tick();
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, window.innerWidth, 1);
    const height = Math.max(this.container.clientHeight, window.innerHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setCameraPreset(preset: CameraPreset, isWorkspaceOverlay: boolean): void {
    const pose = isWorkspaceOverlay ? WORKSPACE_OFFSET_POSE : PRESET_POSES[preset];
    this.activeTransition = {
      pos: pose.pos.clone(),
      target: pose.target.clone(),
    };
  }

  public setLampWarmth(warmth: number): void {
    this.targetLampWarmth = THREE.MathUtils.clamp(warmth, 0.2, 1.8);
  }

  private cancelLoop(): void {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // Smooth lamp warmth & subtle candle/tungsten micro-shimmer
    this.currentLampWarmth = THREE.MathUtils.damp(
      this.currentLampWarmth,
      this.targetLampWarmth,
      5.0,
      dt,
    );
    const shimmer = this.reducedMotion ? 0 : Math.sin(elapsed * 2.1) * 0.08 + Math.sin(elapsed * 3.7) * 0.04;
    this.assets.lampLight.intensity = Math.max(0.4, (4.2 + shimmer) * this.currentLampWarmth);
    this.assets.bulbMaterial.emissiveIntensity = Math.max(0.4, 2.2 * this.currentLampWarmth);
    this.assets.shadeMaterial.emissiveIntensity = Math.max(0.15, 0.55 * this.currentLampWarmth);

    // Smooth exponential camera preset transition
    if (this.activeTransition) {
      const k = 4.2;
      const factor = 1 - Math.exp(-k * dt);
      this.camera.position.lerp(this.activeTransition.pos, factor);
      this.controls.target.lerp(this.activeTransition.target, factor);

      if (
        this.camera.position.distanceTo(this.activeTransition.pos) < 0.015 &&
        this.controls.target.distanceTo(this.activeTransition.target) < 0.015
      ) {
        this.camera.position.copy(this.activeTransition.pos);
        this.controls.target.copy(this.activeTransition.target);
        this.activeTransition = null;
      }
    }

    // Gentle rising espresso steam wisps
    if (!this.reducedMotion) {
      for (let i = 0; i < this.assets.steamWisps.length; i++) {
        const wisp = this.assets.steamWisps[i];
        const cycle = ((elapsed * wisp.speed + wisp.phase) % 1 + 1) % 1;
        wisp.mesh.position.y = 0.24 + cycle * 0.36;
        wisp.mesh.position.x = wisp.baseX + Math.sin(elapsed * 1.4 + wisp.phase) * 0.028;
        wisp.mesh.position.z = wisp.baseZ + Math.cos(elapsed * 1.1 + wisp.phase) * 0.022;
        wisp.mesh.lookAt(this.camera.position);
        const s = 0.55 + cycle * 0.9;
        wisp.mesh.scale.set(s, s, 1);
        const mat = wisp.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.sin(cycle * Math.PI) * 0.16;
      }

      // Gently drifting amber dust motes (zero per-frame allocations)
      const count = this.assets.dustMotes.count;
      const base = this.assets.dustBasePositions;
      for (let i = 0; i < count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const bz = base[i * 3 + 2];
        _vec3.set(
          bx + Math.sin(elapsed * 0.35 + i) * 0.08,
          by + Math.cos(elapsed * 0.28 + i * 1.3) * 0.06,
          bz + Math.sin(elapsed * 0.31 + i * 0.7) * 0.08,
        );
        const s = 0.65 + (i % 5) * 0.2;
        _scale.set(s, s, s);
        _quat.identity();
        _mat4.compose(_vec3, _quat, _scale);
        this.assets.dustMotes.setMatrixAt(i, _mat4);
      }
      this.assets.dustMotes.instanceMatrix.needsUpdate = true;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    this.cancelLoop();
    window.removeEventListener('resize', this.handleResize);
    this.controls.removeEventListener('start', this.handleControlsStart);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.controls.dispose();
    this.assets.dispose();
    this.textures.dispose();
    this.envRenderTarget.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
