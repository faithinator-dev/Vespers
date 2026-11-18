import * as THREE from 'three';

export interface CafeTextures {
  walnutColor: THREE.CanvasTexture;
  walnutBump: THREE.CanvasTexture;
  ruledPaper: THREE.CanvasTexture;
  leatherCover: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  steamWisp: THREE.CanvasTexture;
  dispose: () => void;
}

export function createCafeTextures(maxAnisotropy: number): CafeTextures {
  // 1. Rich walnut woodgrain color + bump
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 512;
  woodCanvas.height = 512;
  const wCtx = woodCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d')!;

  wCtx.fillStyle = '#332015';
  wCtx.fillRect(0, 0, 512, 512);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 2) {
    const wave = Math.sin(y * 0.045) * 0.5 + Math.sin(y * 0.13) * 0.3;
    const tone = Math.floor(38 + wave * 12);
    wCtx.fillStyle = `rgb(${tone + 14}, ${Math.max(16, tone - 4)}, ${Math.max(10, tone - 14)})`;
    wCtx.fillRect(0, y, 512, 2);

    const bVal = Math.floor(128 + wave * 28);
    bCtx.fillStyle = `rgb(${bVal}, ${bVal}, ${bVal})`;
    bCtx.fillRect(0, y, 512, 2);
  }

  // Subtle plank grain streaks
  for (let i = 0; i < 160; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    const len = 40 + (i % 90);
    wCtx.fillStyle = i % 2 === 0 ? 'rgba(22, 12, 7, 0.24)' : 'rgba(84, 54, 34, 0.14)';
    wCtx.fillRect(x, y, len, 1.5);
    bCtx.fillStyle = i % 2 === 0 ? 'rgba(90, 90, 90, 0.22)' : 'rgba(165, 165, 165, 0.15)';
    bCtx.fillRect(x, y, len, 1.5);
  }

  const walnutColor = new THREE.CanvasTexture(woodCanvas);
  walnutColor.colorSpace = THREE.SRGBColorSpace;
  walnutColor.wrapS = THREE.RepeatWrapping;
  walnutColor.wrapT = THREE.RepeatWrapping;
  walnutColor.repeat.set(2, 2);
  walnutColor.anisotropy = maxAnisotropy;

  const walnutBump = new THREE.CanvasTexture(bumpCanvas);
  walnutBump.wrapS = THREE.RepeatWrapping;
  walnutBump.wrapT = THREE.RepeatWrapping;
  walnutBump.repeat.set(2, 2);
  walnutBump.anisotropy = maxAnisotropy;

  // 2. Warm cream ruled journal paper with delicate sepia lines and handwritten-like strokes
  const paperCanvas = document.createElement('canvas');
  paperCanvas.width = 512;
  paperCanvas.height = 512;
  const pCtx = paperCanvas.getContext('2d')!;

  const paperGrad = pCtx.createLinearGradient(0, 0, 512, 512);
  paperGrad.addColorStop(0, '#f4ebd9');
  paperGrad.addColorStop(0.5, '#efe2ca');
  paperGrad.addColorStop(1, '#e8d7ba');
  pCtx.fillStyle = paperGrad;
  pCtx.fillRect(0, 0, 512, 512);

  // Subtle fiber specks
  for (let i = 0; i < 600; i++) {
    const px = (i * 97) % 512;
    const py = (i * 193) % 512;
    pCtx.fillStyle = 'rgba(120, 92, 62, 0.04)';
    pCtx.fillRect(px, py, 2, 2);
  }

  // Faint amber-sepia ruled lines
  pCtx.strokeStyle = 'rgba(148, 114, 78, 0.28)';
  pCtx.lineWidth = 1;
  for (let y = 56; y < 480; y += 24) {
    pCtx.beginPath();
    pCtx.moveTo(28, y);
    pCtx.lineTo(484, y);
    pCtx.stroke();
  }

  // Soft decorative ink script lines (abstract waves so it reads like handwritten journal notes)
  pCtx.strokeStyle = 'rgba(72, 48, 32, 0.42)';
  pCtx.lineWidth = 1.4;
  for (let row = 0; row < 11; row++) {
    const y = 74 + row * 24;
    const lineEnd = 160 + ((row * 83) % 240);
    pCtx.beginPath();
    pCtx.moveTo(42, y);
    for (let x = 42; x < lineEnd; x += 8) {
      const jitter = Math.sin(x * 0.27 + row * 1.9) * 2.2;
      pCtx.lineTo(x, y + jitter);
    }
    pCtx.stroke();
  }

  const ruledPaper = new THREE.CanvasTexture(paperCanvas);
  ruledPaper.colorSpace = THREE.SRGBColorSpace;
  ruledPaper.anisotropy = maxAnisotropy;

  // 3. Stitched dark espresso leather cover
  const leatherCanvas = document.createElement('canvas');
  leatherCanvas.width = 256;
  leatherCanvas.height = 256;
  const lCtx = leatherCanvas.getContext('2d')!;
  lCtx.fillStyle = '#2c1b12';
  lCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 900; i++) {
    const lx = (i * 53) % 256;
    const ly = (i * 101) % 256;
    lCtx.fillStyle = i % 3 === 0 ? 'rgba(65, 42, 28, 0.22)' : 'rgba(20, 11, 6, 0.25)';
    lCtx.fillRect(lx, ly, 3, 2);
  }

  const leatherCover = new THREE.CanvasTexture(leatherCanvas);
  leatherCover.colorSpace = THREE.SRGBColorSpace;
  leatherCover.wrapS = THREE.RepeatWrapping;
  leatherCover.wrapT = THREE.RepeatWrapping;
  leatherCover.anisotropy = maxAnisotropy;

  // 4. Radial soft contact shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
  sGrad.addColorStop(0, 'rgba(8, 5, 3, 0.82)');
  sGrad.addColorStop(0.55, 'rgba(8, 5, 3, 0.34)');
  sGrad.addColorStop(1, 'rgba(8, 5, 3, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  // 5. Soft steam wisp
  const steamCanvas = document.createElement('canvas');
  steamCanvas.width = 128;
  steamCanvas.height = 128;
  const stCtx = steamCanvas.getContext('2d')!;
  const stGrad = stCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
  stGrad.addColorStop(0, 'rgba(246, 232, 210, 0.48)');
  stGrad.addColorStop(0.5, 'rgba(235, 214, 184, 0.16)');
  stGrad.addColorStop(1, 'rgba(235, 214, 184, 0)');
  stCtx.fillStyle = stGrad;
  stCtx.fillRect(0, 0, 128, 128);
  const steamWisp = new THREE.CanvasTexture(steamCanvas);
  steamWisp.colorSpace = THREE.SRGBColorSpace;

  return {
    walnutColor,
    walnutBump,
    ruledPaper,
    leatherCover,
    contactShadow,
    steamWisp,
    dispose: () => {
      walnutColor.dispose();
      walnutBump.dispose();
      ruledPaper.dispose();
      leatherCover.dispose();
      contactShadow.dispose();
      steamWisp.dispose();
    },
  };
}
