import * as THREE from 'three';
import { CafeTextures } from './proceduralTextures';

export interface SteamWisp {
  mesh: THREE.Mesh;
  phase: number;
  speed: number;
  baseX: number;
  baseZ: number;
}

export interface CafeSceneAssets {
  root: THREE.Group;
  lampLight: THREE.PointLight;
  bulbMaterial: THREE.MeshStandardMaterial;
  shadeMaterial: THREE.MeshStandardMaterial;
  steamWisps: SteamWisp[];
  dustMotes: THREE.InstancedMesh;
  dustBasePositions: Float32Array;
  dispose: () => void;
}

function createRoundedRectShape(width: number, depth: number, radius: number): THREE.Shape {
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(radius, hw * 0.45, hd * 0.45);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return shape;
}

function addContactShadow(
  parent: THREE.Group,
  texture: THREE.Texture,
  width: number,
  depth: number,
  yOffset = 0.004,
): void {
  const geo = new THREE.PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.48,
  });
  const plane = new THREE.Mesh(geo, mat);
  plane.position.y = yOffset;
  parent.add(plane);
}

export function buildCafeEnvironment(textures: CafeTextures): CafeSceneAssets {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Shared calibrated materials (varying roughness >= 0.25 across adjacent parts)
  const walnutMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.walnutColor,
      bumpMap: textures.walnutBump,
      bumpScale: 0.012,
      roughness: 0.56,
      metalness: 0.04,
    }),
  );
  const darkWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22150d,
      roughness: 0.72,
      metalness: 0.02,
    }),
  );
  const brushedBrassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xc9964c,
      metalness: 0.9,
      roughness: 0.22,
      anisotropy: 0.7,
    }),
  );
  const castIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1d1a18,
      metalness: 0.72,
      roughness: 0.42,
    }),
  );
  const ceramicMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6dac5,
      roughness: 0.26,
      metalness: 0.04,
    }),
  );
  const espressoMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2a1409,
      roughness: 0.12,
      metalness: 0.08,
    }),
  );
  const leatherMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.leatherCover,
      roughness: 0.78,
      metalness: 0.03,
    }),
  );
  const paperMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.ruledPaper,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );
  const plainPageEdgeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdfd0b4,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );

  // =========================================================================
  // 1. WALNUT CAFÉ TABLE (5-part composite Group, top surface flush at y = 0)
  // =========================================================================
  const tableGroup = new THREE.Group();

  const topShape = createRoundedRectShape(4.4, 2.7, 0.22);
  const topGeo = trackGeo(
    new THREE.ExtrudeGeometry(topShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.025,
      bevelSegments: 4,
    }),
  );
  topGeo.rotateX(Math.PI / 2);
  // Extrude rotated +PI/2 puts top around y = 0.022; shift so top plane sits exactly at y = 0
  topGeo.translate(0, -0.022, 0);
  const tabletop = new THREE.Mesh(topGeo, walnutMat);
  tabletop.receiveShadow = true;
  tabletop.castShadow = true;
  tableGroup.add(tabletop);

  // Brass inlay rim collar around tabletop skirt
  const rimShape = createRoundedRectShape(4.43, 2.73, 0.23);
  const rimHole = createRoundedRectShape(4.35, 2.65, 0.2);
  rimShape.holes.push(rimHole);
  const rimGeo = trackGeo(
    new THREE.ExtrudeGeometry(rimShape, {
      depth: 0.028,
      bevelEnabled: false,
    }),
  );
  rimGeo.rotateX(Math.PI / 2);
  rimGeo.translate(0, -0.05, 0);
  const brassRim = new THREE.Mesh(rimGeo, brushedBrassMat);
  tableGroup.add(brassRim);

  // Under-table bevel apron
  const apronGeo = trackGeo(new THREE.CylinderGeometry(1.05, 0.92, 0.14, 32));
  const apron = new THREE.Mesh(apronGeo, darkWoodMat);
  apron.position.y = -0.17;
  tableGroup.add(apron);

  // Turned pedestal column (LatheGeometry)
  const columnPts = [
    new THREE.Vector2(0.0, -2.0),
    new THREE.Vector2(0.18, -2.0),
    new THREE.Vector2(0.14, -1.75),
    new THREE.Vector2(0.11, -1.2),
    new THREE.Vector2(0.16, -0.7),
    new THREE.Vector2(0.12, -0.24),
    new THREE.Vector2(0.0, -0.24),
  ];
  const columnGeo = trackGeo(new THREE.LatheGeometry(columnPts, 28));
  const column = new THREE.Mesh(columnGeo, darkWoodMat);
  tableGroup.add(column);

  // Cast-iron weighted foot
  const footPts = [
    new THREE.Vector2(0.0, -2.18),
    new THREE.Vector2(0.75, -2.18),
    new THREE.Vector2(0.72, -2.08),
    new THREE.Vector2(0.24, -1.96),
    new THREE.Vector2(0.0, -1.96),
  ];
  const footGeo = trackGeo(new THREE.LatheGeometry(footPts, 32));
  const foot = new THREE.Mesh(footGeo, castIronMat);
  tableGroup.add(foot);

  root.add(tableGroup);

  // =========================================================================
  // 2. WARM BRASS CAFÉ TABLE LAMP (7-part composite Group, bottom at y = 0)
  // =========================================================================
  const lampGroup = new THREE.Group();
  lampGroup.position.set(-1.15, 0, -0.58);

  // Stepped brass base
  const basePts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.28, 0.0),
    new THREE.Vector2(0.27, 0.035),
    new THREE.Vector2(0.22, 0.055),
    new THREE.Vector2(0.18, 0.09),
    new THREE.Vector2(0.07, 0.11),
    new THREE.Vector2(0.0, 0.11),
  ];
  const lampBaseGeo = trackGeo(new THREE.LatheGeometry(basePts, 32));
  const lampBase = new THREE.Mesh(lampBaseGeo, brushedBrassMat);
  lampBase.castShadow = true;
  lampBase.receiveShadow = true;
  lampGroup.add(lampBase);

  // Lower brass collar
  const collarGeo = trackGeo(new THREE.CylinderGeometry(0.048, 0.068, 0.12, 24));
  const collar = new THREE.Mesh(collarGeo, castIronMat);
  collar.position.y = 0.16;
  collar.castShadow = true;
  lampGroup.add(collar);

  // Curved brass gooseneck arm (TubeGeometry)
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.21, 0),
    new THREE.Vector3(-0.04, 0.56, -0.02),
    new THREE.Vector3(0.06, 0.92, 0.05),
    new THREE.Vector3(0.22, 1.08, 0.12),
    new THREE.Vector3(0.26, 0.98, 0.14),
  ]);
  const neckGeo = trackGeo(new THREE.TubeGeometry(neckCurve, 32, 0.024, 14, false));
  const neck = new THREE.Mesh(neckGeo, brushedBrassMat);
  neck.castShadow = true;
  lampGroup.add(neck);

  // Brass socket head
  const socketGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.052, 0.08, 20));
  const socket = new THREE.Mesh(socketGeo, brushedBrassMat);
  socket.position.set(0.26, 0.94, 0.14);
  lampGroup.add(socket);

  // Spun warm amber-cream shade (LatheGeometry)
  const shadePts = [
    new THREE.Vector2(0.06, 0.22),
    new THREE.Vector2(0.16, 0.19),
    new THREE.Vector2(0.29, 0.08),
    new THREE.Vector2(0.35, 0.0),
    new THREE.Vector2(0.34, -0.012),
  ];
  const shadeGeo = trackGeo(new THREE.LatheGeometry(shadePts, 36));
  const shadeMaterial = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdba463,
      emissive: 0xc77728,
      emissiveIntensity: 0.55,
      roughness: 0.72,
      metalness: 0.06,
      side: THREE.DoubleSide,
    }),
  );
  const shade = new THREE.Mesh(shadeGeo, shadeMaterial);
  shade.position.set(0.26, 0.78, 0.14);
  shade.castShadow = true;
  lampGroup.add(shade);

  // Brass finial cap atop shade
  const finialGeo = trackGeo(new THREE.SphereGeometry(0.032, 16, 16));
  const finial = new THREE.Mesh(finialGeo, brushedBrassMat);
  finial.position.set(0.26, 1.02, 0.14);
  lampGroup.add(finial);

  // Warm tungsten bulb inside shade
  const bulbGeo = trackGeo(new THREE.SphereGeometry(0.058, 18, 18));
  const bulbMaterial = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe4b5,
      emissive: 0xffb357,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    }),
  );
  const bulb = new THREE.Mesh(bulbGeo, bulbMaterial);
  bulb.position.set(0.26, 0.85, 0.14);
  lampGroup.add(bulb);

  // Warm PointLight emitting from inside the shade onto the journal & espresso
  const lampLight = new THREE.PointLight(0xffb45c, 4.2, 8.5, 1.6);
  lampLight.position.set(0.26, 0.8, 0.14);
  lampGroup.add(lampLight);

  addContactShadow(lampGroup, textures.contactShadow, 0.85, 0.85, 0.004);
  root.add(lampGroup);

  // =========================================================================
  // 3. ARTISAN CERAMIC ESPRESSO CUP & SAUCER (5-part Group + Steam)
  // =========================================================================
  const cupGroup = new THREE.Group();
  cupGroup.position.set(1.02, 0, -0.35);

  // Fluted saucer
  const saucerPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.14, 0.0),
    new THREE.Vector2(0.25, 0.036),
    new THREE.Vector2(0.26, 0.044),
    new THREE.Vector2(0.23, 0.046),
    new THREE.Vector2(0.12, 0.018),
    new THREE.Vector2(0.0, 0.018),
  ];
  const saucerGeo = trackGeo(new THREE.LatheGeometry(saucerPts, 32));
  const saucer = new THREE.Mesh(saucerGeo, ceramicMat);
  saucer.castShadow = true;
  saucer.receiveShadow = true;
  cupGroup.add(saucer);

  // Tapered ceramic cup
  const cupPts = [
    new THREE.Vector2(0.0, 0.018),
    new THREE.Vector2(0.095, 0.018),
    new THREE.Vector2(0.135, 0.16),
    new THREE.Vector2(0.148, 0.24),
    new THREE.Vector2(0.136, 0.244),
    new THREE.Vector2(0.124, 0.232),
    new THREE.Vector2(0.088, 0.04),
    new THREE.Vector2(0.0, 0.04),
  ];
  const cupGeo = trackGeo(new THREE.LatheGeometry(cupPts, 32));
  const cupMesh = new THREE.Mesh(cupGeo, ceramicMat);
  cupMesh.castShadow = true;
  cupMesh.receiveShadow = true;
  cupGroup.add(cupMesh);

  // Curved C-handle
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.132, 0.2, 0),
    new THREE.Vector3(0.205, 0.19, 0),
    new THREE.Vector3(0.21, 0.11, 0),
    new THREE.Vector3(0.118, 0.08, 0),
  ]);
  const handleGeo = trackGeo(new THREE.TubeGeometry(handleCurve, 20, 0.015, 10, false));
  const handleMesh = new THREE.Mesh(handleGeo, ceramicMat);
  handleMesh.castShadow = true;
  cupGroup.add(handleMesh);

  // Espresso crema surface
  const cremaGeo = trackGeo(new THREE.CircleGeometry(0.126, 28));
  cremaGeo.rotateX(-Math.PI / 2);
  const cremaMesh = new THREE.Mesh(cremaGeo, espressoMat);
  cremaMesh.position.y = 0.205;
  cupGroup.add(cremaMesh);

  // Small brass espresso spoon on saucer
  const spoonStemGeo = trackGeo(new THREE.CylinderGeometry(0.006, 0.008, 0.24, 10));
  spoonStemGeo.rotateZ(Math.PI / 2);
  const spoonStem = new THREE.Mesh(spoonStemGeo, brushedBrassMat);
  spoonStem.position.set(0.04, 0.036, 0.165);
  spoonStem.rotation.y = 0.35;
  cupGroup.add(spoonStem);

  const spoonBowlGeo = trackGeo(new THREE.SphereGeometry(0.022, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5));
  spoonBowlGeo.scale(1.3, 0.45, 0.85);
  const spoonBowl = new THREE.Mesh(spoonBowlGeo, brushedBrassMat);
  spoonBowl.position.set(-0.08, 0.032, 0.208);
  spoonBowl.rotation.y = 0.35;
  spoonBowl.rotation.x = Math.PI;
  cupGroup.add(spoonBowl);

  // Soft rising steam wisps
  const steamWisps: SteamWisp[] = [];
  const steamGeo = trackGeo(new THREE.PlaneGeometry(0.18, 0.18));
  for (let i = 0; i < 4; i++) {
    const steamMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: textures.steamWisp,
        transparent: true,
        depthWrite: false,
        opacity: 0.15,
        side: THREE.DoubleSide,
      }),
    );
    const wisp = new THREE.Mesh(steamGeo, steamMat);
    const bx = (i - 1.5) * 0.018;
    const bz = ((i % 2) - 0.5) * 0.02;
    wisp.position.set(bx, 0.25 + i * 0.09, bz);
    cupGroup.add(wisp);
    steamWisps.push({
      mesh: wisp,
      phase: i * 1.57,
      speed: 0.42 + i * 0.07,
      baseX: bx,
      baseZ: bz,
    });
  }

  addContactShadow(cupGroup, textures.contactShadow, 0.65, 0.65, 0.003);
  root.add(cupGroup);

  // =========================================================================
  // 4. OPEN LEATHER JOURNAL & BRASS FOUNTAIN PEN (7-part Group)
  // =========================================================================
  const journalGroup = new THREE.Group();
  journalGroup.position.set(-0.08, 0, 0.24);
  journalGroup.rotation.y = -0.09;

  // Leather cover board (left + right unified beveled board)
  const coverShape = createRoundedRectShape(1.36, 0.94, 0.035);
  const coverGeo = trackGeo(
    new THREE.ExtrudeGeometry(coverShape, {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
    }),
  );
  coverGeo.rotateX(Math.PI / 2);
  coverGeo.translate(0, 0.026, 0);
  const coverMesh = new THREE.Mesh(coverGeo, leatherMat);
  coverMesh.castShadow = true;
  coverMesh.receiveShadow = true;
  journalGroup.add(coverMesh);

  // Left and right page blocks
  const pageBlockShape = createRoundedRectShape(0.61, 0.86, 0.012);
  const pageBlockGeo = trackGeo(
    new THREE.ExtrudeGeometry(pageBlockShape, {
      depth: 0.036,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
    }),
  );
  pageBlockGeo.rotateX(Math.PI / 2);
  pageBlockGeo.translate(0, 0.062, 0);

  const leftBlock = new THREE.Mesh(pageBlockGeo, plainPageEdgeMat);
  leftBlock.position.x = -0.325;
  leftBlock.castShadow = true;
  leftBlock.receiveShadow = true;
  journalGroup.add(leftBlock);

  const rightBlock = new THREE.Mesh(pageBlockGeo, plainPageEdgeMat);
  rightBlock.position.x = 0.325;
  rightBlock.castShadow = true;
  rightBlock.receiveShadow = true;
  journalGroup.add(rightBlock);

  // Top ruled paper face leaves (offset slightly in Y to prevent Z-fighting)
  const leafGeo = trackGeo(new THREE.PlaneGeometry(0.59, 0.84, 10, 1));
  // Subtle natural page arch toward center spine
  const leafPos = leafGeo.attributes.position;
  for (let i = 0; i < leafPos.count; i++) {
    const px = leafPos.getX(i);
    const norm = (px + 0.295) / 0.59; // 0..1
    const arch = Math.sin(norm * Math.PI) * 0.016;
    leafPos.setZ(i, arch);
  }
  leafGeo.computeVertexNormals();
  leafGeo.rotateX(-Math.PI / 2);

  const leftLeaf = new THREE.Mesh(leafGeo, paperMat);
  leftLeaf.position.set(-0.325, 0.067, 0);
  leftLeaf.receiveShadow = true;
  journalGroup.add(leftLeaf);

  const rightLeaf = new THREE.Mesh(leafGeo, paperMat);
  rightLeaf.position.set(0.325, 0.067, 0);
  rightLeaf.receiveShadow = true;
  journalGroup.add(rightLeaf);

  // Silk bookmark ribbon draping over bottom edge
  const ribbonCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 0.069, -0.35),
    new THREE.Vector3(0.02, 0.068, 0.15),
    new THREE.Vector3(0.06, 0.065, 0.44),
    new THREE.Vector3(0.11, 0.015, 0.54),
    new THREE.Vector3(0.16, 0.008, 0.65),
  ]);
  const ribbonGeo = trackGeo(new THREE.TubeGeometry(ribbonCurve, 24, 0.008, 6, false));
  const ribbonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xa64e2e,
      roughness: 0.52,
      metalness: 0.04,
    }),
  );
  const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
  journalGroup.add(ribbon);

  // 4-part Brass & Obsidian Fountain Pen resting beside the right page
  const penGroup = new THREE.Group();
  penGroup.position.set(0.84, 0.018, 0.14);
  penGroup.rotation.y = 0.34;

  const penBodyPts = [
    new THREE.Vector2(0.0, -0.24),
    new THREE.Vector2(0.012, -0.22),
    new THREE.Vector2(0.018, -0.05),
    new THREE.Vector2(0.019, 0.12),
    new THREE.Vector2(0.014, 0.17),
    new THREE.Vector2(0.0, 0.17),
  ];
  const penBodyGeo = trackGeo(new THREE.LatheGeometry(penBodyPts, 18));
  penBodyGeo.rotateX(Math.PI / 2);
  const penResinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x181310,
      roughness: 0.24,
      metalness: 0.12,
    }),
  );
  const penBody = new THREE.Mesh(penBodyGeo, penResinMat);
  penBody.castShadow = true;
  penGroup.add(penBody);

  const penBandGeo = trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.022, 18));
  penBandGeo.rotateX(Math.PI / 2);
  const penBand = new THREE.Mesh(penBandGeo, brushedBrassMat);
  penBand.position.z = 0.05;
  penGroup.add(penBand);

  const penNibGeo = trackGeo(new THREE.ConeGeometry(0.013, 0.065, 14));
  penNibGeo.rotateX(-Math.PI / 2);
  const penNib = new THREE.Mesh(penNibGeo, brushedBrassMat);
  penNib.position.z = -0.27;
  penGroup.add(penNib);

  const clipGeo = trackGeo(new THREE.BoxGeometry(0.008, 0.007, 0.16));
  const clip = new THREE.Mesh(clipGeo, brushedBrassMat);
  clip.position.set(0, 0.021, 0.09);
  penGroup.add(clip);

  journalGroup.add(penGroup);
  addContactShadow(journalGroup, textures.contactShadow, 1.56, 1.12, 0.002);
  root.add(journalGroup);

  // =========================================================================
  // 5. ARCHITECTURAL CAFÉ WINDOW BACKDROP (subtle warm depth behind table)
  // =========================================================================
  const backdropGroup = new THREE.Group();
  backdropGroup.position.set(0, -0.2, -3.2);

  // Window frame mullions
  const frameVerticalGeo = trackGeo(new THREE.BoxGeometry(0.14, 4.8, 0.14));
  const frameHorizontalGeo = trackGeo(new THREE.BoxGeometry(7.2, 0.14, 0.14));

  for (const fx of [-2.4, 0, 2.4]) {
    const mullion = new THREE.Mesh(frameVerticalGeo, darkWoodMat);
    mullion.position.set(fx, 1.6, 0);
    backdropGroup.add(mullion);
  }
  for (const fy of [-0.4, 1.2, 2.8]) {
    const transom = new THREE.Mesh(frameHorizontalGeo, darkWoodMat);
    transom.position.set(0, fy, 0);
    backdropGroup.add(transom);
  }

  // Distant warm streetlamp bokeh discs outside the rainy window
  const bokehGeo = trackGeo(new THREE.CircleGeometry(0.28, 24));
  const bokehColors = [0xd98a3c, 0xc46b31, 0xe8b068];
  const bokehPositions: [number, number, number, number][] = [
    [-1.6, 1.8, -1.6, 1.1],
    [-0.9, 1.5, -1.9, 0.7],
    [0.85, 2.0, -1.7, 1.0],
    [1.65, 1.4, -2.1, 0.8],
    [0.2, 2.3, -2.4, 0.65],
  ];
  bokehPositions.forEach(([bx, by, bz, scale], idx) => {
    const bMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: bokehColors[idx % bokehColors.length],
        transparent: true,
        opacity: 0.16,
      }),
    );
    const orb = new THREE.Mesh(bokehGeo, bMat);
    orb.position.set(bx, by, bz);
    orb.scale.setScalar(scale);
    backdropGroup.add(orb);
  });

  root.add(backdropGroup);

  // =========================================================================
  // 6. FLOATING AMBER DUST MOTES (InstancedMesh, >20 repeated particles)
  // =========================================================================
  const moteCount = 48;
  const moteGeo = trackGeo(new THREE.SphereGeometry(0.008, 8, 8));
  const moteMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf4c584,
      transparent: true,
      opacity: 0.45,
    }),
  );
  const dustMotes = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
  const dustBasePositions = new Float32Array(moteCount * 3);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < moteCount; i++) {
    const px = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 3.2 - 1.6;
    const py = 0.15 + Math.abs((Math.sin(i * 78.233) * 19341.123) % 1) * 1.45;
    const pz = ((Math.sin(i * 39.425) * 28411.713) % 1) * 1.8 - 0.9;

    dustBasePositions[i * 3] = px;
    dustBasePositions[i * 3 + 1] = py;
    dustBasePositions[i * 3 + 2] = pz;

    dummy.position.set(px, py, pz);
    dummy.scale.setScalar(0.6 + (i % 5) * 0.22);
    dummy.updateMatrix();
    dustMotes.setMatrixAt(i, dummy.matrix);
  }
  dustMotes.instanceMatrix.needsUpdate = true;
  dustMotes.computeBoundingSphere();
  dustMotes.frustumCulled = false;
  root.add(dustMotes);

  return {
    root,
    lampLight,
    bulbMaterial,
    shadeMaterial,
    steamWisps,
    dustMotes,
    dustBasePositions,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
