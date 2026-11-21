import * as THREE from 'three';

function createSeededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeConcreteTextures() {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const rand = createSeededRandom(4091);

  // Base Brutalist dark slate concrete
  cCtx.fillStyle = '#252d38';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Formwork panel grid seams (4x8 slabs)
  const cols = 4;
  const rows = 8;
  const pw = size / cols;
  const ph = size / rows;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const shade = 34 + Math.floor(rand() * 14);
      const bShade = 118 + Math.floor(rand() * 24);
      cCtx.fillStyle = `rgb(${shade}, ${shade + 7}, ${shade + 16})`;
      cCtx.fillRect(c * pw + 2, r * ph + 2, pw - 4, ph - 4);

      bCtx.fillStyle = `rgb(${bShade}, ${bShade}, ${bShade})`;
      bCtx.fillRect(c * pw + 2, r * ph + 2, pw - 4, ph - 4);

      // Tie-rod anchor holes in each formwork slab
      const holes = [
        [c * pw + pw * 0.2, r * ph + ph * 0.5],
        [c * pw + pw * 0.8, r * ph + ph * 0.5],
      ];
      for (const [hx, hy] of holes) {
        cCtx.fillStyle = '#141a22';
        cCtx.beginPath();
        cCtx.arc(hx, hy, 2.2, 0, Math.PI * 2);
        cCtx.fill();

        bCtx.fillStyle = '#242424';
        bCtx.beginPath();
        bCtx.arc(hx, hy, 2.5, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
  }

  // Subtle aggregate grain & vertical rain weathering
  for (let i = 0; i < 3800; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const alpha = 0.03 + rand() * 0.05;
    cCtx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.3})`;
    cCtx.fillRect(x, y, 2, 2);

    bCtx.fillStyle = rand() > 0.5 ? 'rgba(210,210,210,0.12)' : 'rgba(40,40,40,0.14)';
    bCtx.fillRect(x, y, 2, 2);
  }

  // Horizontal & vertical expansion grooves
  cCtx.strokeStyle = '#12171e';
  cCtx.lineWidth = 2;
  bCtx.strokeStyle = '#1c1c1c';
  bCtx.lineWidth = 3;
  for (let c = 0; c <= cols; c += 1) {
    cCtx.beginPath();
    cCtx.moveTo(c * pw, 0);
    cCtx.lineTo(c * pw, size);
    cCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(c * pw, 0);
    bCtx.lineTo(c * pw, size);
    bCtx.stroke();
  }
  for (let r = 0; r <= rows; r += 1) {
    cCtx.beginPath();
    cCtx.moveTo(0, r * ph);
    cCtx.lineTo(size, r * ph);
    cCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(0, r * ph);
    bCtx.lineTo(size, r * ph);
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 4);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 4);
  bumpMap.anisotropy = 4;

  return { map, bumpMap };
}

function makeFacadeTextures() {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = size;
  emissiveCanvas.height = size;
  const eCtx = emissiveCanvas.getContext('2d')!;

  const rand = createSeededRandom(8821);

  ctx.fillStyle = '#202834';
  ctx.fillRect(0, 0, size, size);
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, size, size);

  const cols = 18;
  const rows = 48;
  const cw = size / cols;
  const ch = size / rows;

  for (let r = 0; r < rows; r += 1) {
    // Crisp architectural spandrel ledge every floor
    ctx.fillStyle = '#2d3c4d';
    ctx.fillRect(0, r * ch, size, 4);

    const floorActive = rand() > 0.42;
    const isWarmBand = rand() > 0.7;

    for (let c = 0; c < cols; c += 1) {
      ctx.fillStyle = '#0c121a';
      ctx.fillRect(c * cw + 3, r * ch + 5, cw - 6, ch - 8);

      // Coherent horizontal office louver bands (Orion curtain-wall look)
      if (floorActive && rand() > 0.35) {
        eCtx.fillStyle = isWarmBand ? '#ffd380' : '#7ef0dc';
        eCtx.globalAlpha = 0.35 + rand() * 0.45;
        eCtx.fillRect(c * cw + 3, r * ch + 7, cw - 6, ch - 12);
      }
    }
  }
  eCtx.globalAlpha = 1;

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 3);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;
  emissiveMap.repeat.set(1, 3);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;

  return { map, emissiveMap };
}

function makeMetalTextures() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createSeededRandom(1937);

  ctx.fillStyle = '#455462';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const delta = Math.floor((rand() - 0.5) * 14);
    ctx.fillStyle = `rgb(${69 + delta}, ${84 + delta}, ${98 + delta})`;
    ctx.fillRect(0, y, size, 2);
  }

  ctx.strokeStyle = '#2d3742';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.colorSpace = THREE.SRGBColorSpace;
  return { map };
}

export interface CityMaterialLibrary {
  concrete: THREE.MeshStandardMaterial;
  concreteDark: THREE.MeshStandardMaterial;
  facadeCyan: THREE.MeshStandardMaterial;
  facadeWarning: THREE.MeshStandardMaterial;
  metallicSteel: THREE.MeshStandardMaterial;
  chassisSteel: THREE.MeshStandardMaterial;
  emissiveCyan: THREE.MeshStandardMaterial;
  emissiveGold: THREE.MeshStandardMaterial;
  emissiveRed: THREE.MeshStandardMaterial;
  plazaDeck: THREE.MeshStandardMaterial;
}

let cachedLibrary: CityMaterialLibrary | null = null;

export function getCityMaterials(): CityMaterialLibrary {
  if (cachedLibrary) return cachedLibrary;

  const concreteTex = makeConcreteTextures();
  const facadeTex = makeFacadeTextures();
  const metalTex = makeMetalTextures();

  cachedLibrary = {
    concrete: new THREE.MeshStandardMaterial({
      color: '#2c3644',
      map: concreteTex.map,
      bumpMap: concreteTex.bumpMap,
      bumpScale: 0.22,
      roughness: 0.68,
      metalness: 0.24,
    }),
    concreteDark: new THREE.MeshStandardMaterial({
      color: '#192029',
      map: concreteTex.map,
      bumpMap: concreteTex.bumpMap,
      bumpScale: 0.24,
      roughness: 0.74,
      metalness: 0.2,
    }),
    facadeCyan: new THREE.MeshStandardMaterial({
      color: '#28323f',
      map: facadeTex.map,
      emissive: '#48D7BA',
      emissiveMap: facadeTex.emissiveMap,
      emissiveIntensity: 0.62,
      roughness: 0.48,
      metalness: 0.52,
    }),
    facadeWarning: new THREE.MeshStandardMaterial({
      color: '#232932',
      map: facadeTex.map,
      emissive: '#FF594F',
      emissiveMap: facadeTex.emissiveMap,
      emissiveIntensity: 0.55,
      roughness: 0.62,
      metalness: 0.38,
    }),
    metallicSteel: new THREE.MeshStandardMaterial({
      color: '#7f94aa',
      map: metalTex.map,
      roughness: 0.26,
      metalness: 0.88,
    }),
    chassisSteel: new THREE.MeshStandardMaterial({
      color: '#17202b',
      roughness: 0.38,
      metalness: 0.78,
    }),
    emissiveCyan: new THREE.MeshStandardMaterial({
      color: '#48D7BA',
      emissive: '#48D7BA',
      emissiveIntensity: 1.55,
      roughness: 0.2,
      metalness: 0.1,
    }),
    emissiveGold: new THREE.MeshStandardMaterial({
      color: '#E3B86B',
      emissive: '#E3B86B',
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.2,
    }),
    emissiveRed: new THREE.MeshStandardMaterial({
      color: '#FF594F',
      emissive: '#FF594F',
      emissiveIntensity: 2.2,
      roughness: 0.22,
      metalness: 0.1,
    }),
    plazaDeck: new THREE.MeshStandardMaterial({
      color: '#151c25',
      map: concreteTex.map,
      bumpMap: concreteTex.bumpMap,
      bumpScale: 0.12,
      roughness: 0.68,
      metalness: 0.28,
    }),
  };

  return cachedLibrary;
}
