import * as THREE from 'three';

/**
 * Sky dome inspired by Cyber City Orion (orion.adrianred.com):
 * Deep nocturnal slate-indigo zenith transitioning into luminous misty steel-blue
 * horizon haze with an atmospheric backlight bloom behind the skyline.
 */
export function createOrionSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZenithColor: { value: new THREE.Color('#0c1522') },
      uUpperSkyColor: { value: new THREE.Color('#1c3147') },
      uHorizonColor: { value: new THREE.Color('#476785') },
      uGlowColor: { value: new THREE.Color('#9bc2dc') },
      uAbyssColor: { value: new THREE.Color('#08101a') },
      uSunDir: { value: new THREE.Vector3(-0.22, 0.14, -0.96).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenithColor;
      uniform vec3 uUpperSkyColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGlowColor;
      uniform vec3 uAbyssColor;
      uniform vec3 uSunDir;
      varying vec3 vDir;

      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;

        vec3 sky = mix(uUpperSkyColor, uZenithColor, smoothstep(0.08, 0.72, y));
        float horizonBand = exp(-pow((y - 0.04) * 5.8, 2.0));
        sky = mix(sky, uHorizonColor, horizonBand * 0.88);

        // Directional atmospheric horizon backlight (like Orion's misty backlit canyon)
        float backGlow = pow(max(dot(d, uSunDir), 0.0), 7.5);
        float wideGlow = pow(max(dot(d, uSunDir), 0.0), 2.4);
        sky += uGlowColor * (backGlow * 0.55 + wideGlow * 0.22) * smoothstep(-0.1, 0.35, y);

        // Deep foggy canyon below horizon
        sky = mix(uAbyssColor, sky, smoothstep(-0.22, 0.02, y));

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
}

/**
 * Multi-variant Instanced Skyscraper Shader (Orion-grade detail):
 * Deterministically assigns each tower one of 4 cyberpunk architectural styles:
 *  0 = Dense Micro-Window Curtain Wall (warm amber / cool white / cyan offices)
 *  1 = Horizontal Glowing Louver Slats (like Orion foreground towers)
 *  2 = PCB Circuit-Trace Armor Panels (like Orion cyan circuit towers)
 *  3 = Brutalist Ribbed Concrete & Diagonal Vents with Pinpoint Beacons
 * All blended into atmospheric misty slate-blue distance fog (#1d2f42 -> #3c5975).
 */
export function createInstancedFacadeMaterial(options: {
  fogColor: string;
  fogDensity: number;
  windowBrightness: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFogColor: { value: new THREE.Color(options.fogColor) },
      uHorizonMistColor: { value: new THREE.Color('#476785') },
      uFogDensity: { value: options.fogDensity },
      uWindowBrightness: { value: options.windowBrightness },
      uSunDir: { value: new THREE.Vector3(-0.28, 0.55, -0.78).normalize() },
      uKeyDir: { value: new THREE.Vector3(0.55, 0.72, 0.42).normalize() },
      uBaseColor: { value: new THREE.Color('#131b26') },
      uLitWindowCyan: { value: new THREE.Color('#5ef0d6') },
      uLitWindowAmber: { value: new THREE.Color('#ffd380') },
      uLitWindowWhite: { value: new THREE.Color('#dceeff') },
      uLitWindowRed: { value: new THREE.Color('#FF594F') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vLocalUv;
      varying float vSeed;

      void main() {
        #ifdef USE_INSTANCING
          mat4 instMat = instanceMatrix;
          vec4 worldPosition = modelMatrix * instMat * vec4(position, 1.0);
          vWorldNormal = normalize(mat3(modelMatrix) * mat3(instMat) * normal);
          vSeed = fract(sin(dot(instMat[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
        #else
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vSeed = 0.42;
        #endif

        vWorldPos = worldPosition.xyz;
        vLocalUv = uv;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uFogColor;
      uniform vec3 uHorizonMistColor;
      uniform float uFogDensity;
      uniform float uWindowBrightness;
      uniform vec3 uSunDir;
      uniform vec3 uKeyDir;
      uniform vec3 uBaseColor;
      uniform vec3 uLitWindowCyan;
      uniform vec3 uLitWindowAmber;
      uniform vec3 uLitWindowWhite;
      uniform vec3 uLitWindowRed;

      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vLocalUv;
      varying float vSeed;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float isRoof = step(0.68, N.y);
        float wallMask = 1.0 - isRoof;

        float ndl = max(dot(N, uKeyDir), 0.0);
        float rim = pow(max(dot(N, uSunDir), 0.0), 1.6);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

        // Dark metallic slate + cool sky ambient reflection on wet vertical faces
        vec3 wallBase = uBaseColor * (0.72 + 0.52 * ndl);
        vec3 roofBase = mix(uBaseColor * 1.15, vec3(0.32, 0.45, 0.58), 0.45 + 0.4 * ndl);
        vec3 lit = mix(wallBase, roofBase, isRoof);
        lit += vec3(0.16, 0.28, 0.42) * rim * 0.45;
        lit += vec3(0.22, 0.34, 0.48) * fresnel * 0.22;

        // World-space facade coordinates aligned to face orientation
        float horiz = abs(N.x) > 0.5 ? vWorldPos.z : vWorldPos.x;
        vec2 fCoord = vec2(horiz, vWorldPos.y);

        // Structural concrete panel seams & mullions
        float mullionX = abs(fract(fCoord.x * 0.45) - 0.5);
        float spandrelY = abs(fract(fCoord.y * 0.55) - 0.5);
        float frameDark = smoothstep(0.42, 0.49, mullionX) * 0.45 + smoothstep(0.40, 0.49, spandrelY) * 0.55;
        lit *= 1.0 - 0.48 * clamp(frameDark, 0.0, 1.0) * wallMask;

        // Choose architectural facade style (0..3)
        float style = floor(vSeed * 4.0);
        vec3 emissive = vec3(0.0);
        float heightGate = smoothstep(-24.0, 2.0, vWorldPos.y);

        if (style < 1.0) {
          // Style 0: Dense Micro-Window Office Curtain Wall (like Orion center-right tower)
          vec2 cell = floor(vec2(fCoord.x * 2.4, fCoord.y * 1.6));
          vec2 cuv = fract(vec2(fCoord.x * 2.4, fCoord.y * 1.6));
          float pane = step(0.22, cuv.x) * step(cuv.x, 0.78) * step(0.28, cuv.y) * step(cuv.y, 0.72);
          float r = hash21(cell + floor(vSeed * 83.0));
          float bandMask = step(0.38, hash21(vec2(floor(cell.y * 0.5), floor(vSeed * 37.0))));
          float on = step(0.68, r) * pane * bandMask;
          vec3 wCol = mix(uLitWindowWhite, uLitWindowAmber, step(0.48, fract(r * 7.1)));
          wCol = mix(wCol, uLitWindowCyan, step(0.82, fract(r * 13.7)));
          emissive += wCol * on * 0.92;
        } else if (style < 2.0) {
          // Style 1: Horizontal Glowing Louver Light Strips (like Orion foreground towers)
          float floorIdx = floor(fCoord.y * 0.62);
          float fy = fract(fCoord.y * 0.62);
          float strip = smoothstep(0.42, 0.48, fy) * smoothstep(0.60, 0.54, fy);
          float bay = step(0.18, fract(fCoord.x * 0.14 + vSeed));
          float activeFloor = step(0.45, hash21(vec2(floorIdx, floor(vSeed * 51.0))));
          vec3 sCol = mix(uLitWindowCyan, uLitWindowAmber, step(0.62, vSeed));
          emissive += sCol * strip * bay * activeFloor * 1.05;
        } else if (style < 3.0) {
          // Style 2: Branching PCB Circuit-Trace Facade (like Orion mid-right dark wall)
          vec2 cGrid = floor(vec2(fCoord.x * 0.35, fCoord.y * 0.35));
          vec2 cUv = fract(vec2(fCoord.x * 0.35, fCoord.y * 0.35));
          float h1 = hash21(cGrid + floor(vSeed * 41.0));
          float lineX = 1.0 - smoothstep(0.0, 0.045, abs(cUv.y - 0.5));
          float lineY = 1.0 - smoothstep(0.0, 0.045, abs(cUv.x - 0.5));
          float nodeDot = 1.0 - smoothstep(0.04, 0.09, length(cUv - 0.5));
          float trace = step(0.74, h1) * max(lineX * step(0.5, cUv.x), lineY * step(cUv.y, 0.5));
          trace = max(trace, step(0.85, h1) * nodeDot);
          emissive += uLitWindowCyan * trace * 1.15;
        } else {
          // Style 3: Brutalist Slotted Bunker with Sparse Amber & Red Corner Beacons
          vec2 cell = floor(vec2(fCoord.x * 1.4, fCoord.y * 0.9));
          vec2 cuv = fract(vec2(fCoord.x * 1.4, fCoord.y * 0.9));
          float slot = step(0.32, cuv.x) * step(cuv.x, 0.68) * step(0.35, cuv.y) * step(cuv.y, 0.65);
          float r = hash21(cell + floor(vSeed * 97.0));
          vec3 col = mix(uLitWindowAmber, uLitWindowRed, step(0.86, fract(r * 19.0)));
          emissive += col * step(0.84, r) * slot * 0.95;
        }

        // Subtle vertical edge LED accent on select towers
        float edgeDist = min(abs(vLocalUv.x - 0.04), abs(vLocalUv.x - 0.96));
        float edgeLed = (1.0 - smoothstep(0.0, 0.025, edgeDist)) * step(0.62, vSeed) * wallMask;
        emissive += mix(uLitWindowCyan, uLitWindowAmber, step(0.82, vSeed)) * edgeLed * 0.72;

        lit += emissive * wallMask * heightGate * uWindowBrightness;

        // Atmospheric horizon mist & canyon depth fog
        float dist = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
        float lowerCanyonMist = smoothstep(8.0, -48.0, vWorldPos.y) * 0.78;
        fogFactor = clamp(max(fogFactor, lowerCanyonMist), 0.0, 1.0);

        vec3 mistTarget = mix(uFogColor, uHorizonMistColor, smoothstep(45.0, 195.0, dist) * 0.72);
        vec3 finalColor = mix(lit, mistTarget, fogFactor);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
}

/**
 * Custom GLSL material for Hero Towers: combines dark metallic PBR look
 * with Orion-style PCB circuit traces & horizontal architectural light louvers.
 */
export function createHeroCircuitMaterial(options: {
  accentColor: string;
  intensity?: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color('#19222e') },
      uAccentColor: { value: new THREE.Color(options.accentColor) },
      uIntensity: { value: options.intensity ?? 1.1 },
      uKeyDir: { value: new THREE.Vector3(0.55, 0.72, 0.42).normalize() },
      uRimDir: { value: new THREE.Vector3(-0.35, 0.48, -0.8).normalize() },
      uFogColor: { value: new THREE.Color('#22364a') },
      uFogDensity: { value: 0.0052 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uAccentColor;
      uniform float uIntensity;
      uniform vec3 uKeyDir;
      uniform vec3 uRimDir;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      float hash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 N = normalize(vWorldNormal);
        float isRoof = step(0.68, N.y);
        float ndl = max(dot(N, uKeyDir), 0.0);
        float rim = pow(max(dot(N, uRimDir), 0.0), 1.5);

        vec3 col = uBaseColor * (0.48 + 0.75 * ndl) + vec3(0.2, 0.32, 0.45) * rim * 0.55;
        if (isRoof > 0.5) {
          col = mix(col, vec3(0.36, 0.48, 0.6), 0.45);
        }

        float horiz = abs(N.x) > 0.5 ? vWorldPos.z : vWorldPos.x;
        vec2 fCoord = vec2(horiz, vWorldPos.y);

        // Floor spandrels & micro-window slits
        float fy = fract(fCoord.y * 0.75);
        float floorSeam = smoothstep(0.45, 0.49, abs(fy - 0.5));
        col *= 1.0 - 0.42 * floorSeam * (1.0 - isRoof);

        // PCB circuit trace accents + micro-windows
        vec2 g = floor(fCoord * 0.42);
        vec2 guv = fract(fCoord * 0.42);
        float r = hash21(g);
        float traceH = (1.0 - smoothstep(0.0, 0.04, abs(guv.y - 0.5))) * step(0.76, r);
        float traceV = (1.0 - smoothstep(0.0, 0.04, abs(guv.x - 0.5))) * step(0.84, r);
        float louver = smoothstep(0.44, 0.48, fy) * smoothstep(0.56, 0.52, fy) * step(0.55, hash21(vec2(floor(fCoord.y * 0.75), 3.0)));

        float pulse = 0.85 + 0.15 * sin(uTime * 1.4 + r * 20.0);
        float glow = max(max(traceH, traceV), louver * 0.65) * (1.0 - isRoof);
        col += uAccentColor * glow * uIntensity * pulse;

        float dist = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
        float lowMist = smoothstep(-4.0, -52.0, vWorldPos.y) * 0.82;
        fogFactor = clamp(max(fogFactor, lowMist), 0.0, 1.0);
        col = mix(col, uFogColor, fogFactor);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * Animated directional chevron conduit shader (directly echoing Cyber City Orion's iconic sky-lanes).
 */
export function createChevronBridgeMaterial(options: {
  color: string;
  speed: number;
  unstable?: boolean;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(options.color) },
      uSpeed: { value: options.speed },
      uUnstable: { value: options.unstable ? 1.0 : 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uSpeed;
      uniform float uUnstable;
      varying vec2 vUv;

      void main() {
        // V-shaped chevron arrows advancing along U
        float lateral = abs(vUv.y - 0.5) * 2.0;
        float chevronCoord = fract(vUv.x * 7.0 - uTime * uSpeed - lateral * 0.65);
        float chevron = smoothstep(0.05, 0.14, chevronCoord) * smoothstep(0.32, 0.18, chevronCoord);
        float edgeMask = 1.0 - smoothstep(0.68, 0.98, lateral);
        float rails = smoothstep(0.76, 0.88, lateral) * smoothstep(0.98, 0.88, lateral);

        float flicker = 1.0;
        if (uUnstable > 0.5) {
          float s = sin(uTime * 19.0 + vUv.x * 24.0) * cos(uTime * 7.3);
          flicker = 0.35 + 0.65 * step(-0.25, s);
        }

        float intensity = (chevron * edgeMask * 1.3 + rails * 0.65) * flicker;
        gl_FragColor = vec4(uColor * intensity * 1.45, clamp(intensity, 0.0, 0.95));
      }
    `,
  });
}

/**
 * Pixelated holographic data-matrix ring shader (inspired by Orion's floating welcome ring).
 */
export function createHologramRingMaterial(color: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        vec2 grid = floor(vec2(vUv.x * 160.0, vUv.y * 10.0));
        vec2 guv = fract(vec2(vUv.x * 160.0, vUv.y * 10.0));
        float dotShape = step(0.18, guv.x) * step(guv.x, 0.82) * step(0.18, guv.y) * step(guv.y, 0.82);
        float rnd = hash21(grid);
        float scan = 0.6 + 0.4 * sin(vUv.x * 18.0 - uTime * 2.2);
        float edgeFade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
        float on = step(0.38, rnd) * dotShape * edgeFade * scan;
        gl_FragColor = vec4(uColor * 1.5, on * 0.85);
      }
    `,
  });
}

/**
 * Custom GLSL shader for the Brutalist Circuit-Board Plaza Deck.
 */
export function createCircuitPlazaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color('#141e2b') },
      uTrenchColor: { value: new THREE.Color('#0a111a') },
      uRidgeColor: { value: new THREE.Color('#27394d') },
      uCyanGlow: { value: new THREE.Color('#48D7BA') },
      uGoldGlow: { value: new THREE.Color('#E3B86B') },
      uRedGlow: { value: new THREE.Color('#FF594F') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uTrenchColor;
      uniform vec3 uRidgeColor;
      uniform vec3 uCyanGlow;
      uniform vec3 uGoldGlow;
      uniform vec3 uRedGlow;
      varying vec3 vWorldPos;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.2, 289.7))) * 43758.5453);
      }

      void main() {
        vec2 p = vWorldPos.xz;
        float dist = length(p);

        vec2 grid1 = abs(fract(p / 6.0 - 0.5) - 0.5) / fwidth(p / 6.0);
        float seam1 = 1.0 - min(min(grid1.x, grid1.y), 1.0);

        vec2 grid2 = abs(fract(p / 18.0 - 0.5) - 0.5) / fwidth(p / 18.0);
        float majorChannel = 1.0 - smoothstep(0.0, 3.2, min(grid2.x, grid2.y));

        float ringDist = abs(fract(dist / 14.0 - 0.5) - 0.5) * 14.0;
        float ringTrench = 1.0 - smoothstep(0.0, 0.55, ringDist);

        float tileTone = hash(floor(p / 6.0)) * 0.28;
        vec3 col = mix(uBaseColor, uRidgeColor, tileTone);
        col = mix(col, uTrenchColor, clamp(seam1 * 0.55 + majorChannel * 0.75 + ringTrench * 0.65, 0.0, 1.0));

        float pulse = 0.35 + 0.65 * smoothstep(0.75, 1.0, sin(p.x * 0.18 + p.y * 0.18 - uTime * 1.4));
        float isNEFault = smoothstep(0.2, 0.8, p.x / max(1.0, dist)) * smoothstep(0.2, 0.8, -p.y / max(1.0, dist));
        vec3 traceCol = mix(uCyanGlow, uGoldGlow, smoothstep(18.0, 38.0, dist));
        traceCol = mix(traceCol, uRedGlow, isNEFault * 0.85);

        col += traceCol * majorChannel * 0.28 * pulse;
        col += traceCol * ringTrench * 0.32;

        float edgeFade = 1.0 - smoothstep(42.0, 48.0, dist);
        col = mix(uTrenchColor, col, edgeFade);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * Custom GLSL shader for arterial Critical Red (#FF594F) structural fracture fissures.
 */
export function createFractureFissureMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorCore: { value: new THREE.Color('#FF594F') },
      uColorHot: { value: new THREE.Color('#ffc4b0') },
      uBaseColor: { value: new THREE.Color('#141c26') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vLocalPos;
      varying vec3 vNormal;
      void main() {
        vLocalPos = position;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColorCore;
      uniform vec3 uColorHot;
      uniform vec3 uBaseColor;
      varying vec3 vLocalPos;
      varying vec3 vNormal;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec2 p = vec2(vLocalPos.x + vLocalPos.z * 0.7, vLocalPos.y * 1.3);
        float n1 = noise(p * 1.9);
        float n2 = noise(p * 4.7 + 2.1);
        float crackField = abs(n1 - 0.5) + abs(n2 - 0.5) * 0.42;
        float fissure = 1.0 - smoothstep(0.012, 0.072, crackField);

        float shearDist = abs(vLocalPos.y - (vLocalPos.x * 0.45 + 0.1));
        float shearGlow = 1.0 - smoothstep(0.04, 0.28, shearDist);

        float pulse = 0.8 + 0.2 * sin(uTime * 3.4 + vLocalPos.y * 1.5);
        float emission = clamp(max(fissure, shearGlow * 0.92), 0.0, 1.0) * pulse;

        float shade = 0.35 + 0.65 * max(vNormal.y, 0.15);
        vec3 darkRock = uBaseColor * shade;
        vec3 glowCol = mix(uColorCore, uColorHot, smoothstep(0.55, 1.0, emission));
        vec3 finalCol = mix(darkRock, glowCol * 2.1, emission);

        gl_FragColor = vec4(finalCol, 1.0);
      }
    `,
  });
}

/**
 * Custom GLSL shader for glowing data conduits (sub-deck cables & highways).
 */
export function createConduitFlowMaterial(options: {
  color: string;
  speed: number;
  unstable?: boolean;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(options.color) },
      uSpeed: { value: options.speed },
      uUnstable: { value: options.unstable ? 1.0 : 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uSpeed;
      uniform float uUnstable;
      varying vec2 vUv;

      void main() {
        float flow = fract(vUv.x * 4.5 - uTime * uSpeed);
        float packet = smoothstep(0.0, 0.22, flow) * smoothstep(0.62, 0.22, flow);
        float coreLine = 1.0 - smoothstep(0.0, 0.42, abs(vUv.y - 0.5));

        float flicker = 1.0;
        if (uUnstable > 0.5) {
          float s = sin(uTime * 19.0 + vUv.x * 24.0) * cos(uTime * 7.3);
          flicker = 0.35 + 0.65 * step(-0.25, s);
        }

        float intensity = (0.28 + 1.35 * packet) * coreLine * flicker;
        gl_FragColor = vec4(uColor * intensity * 1.35, clamp(intensity, 0.0, 0.92));
      }
    `,
  });
}

/**
 * Custom GLSL shader for deep sub-canyon abyssal grid far beneath the city.
 */
export function createAbyssGridMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uGridColor: { value: new THREE.Color('#2c4b68') },
      uPulseColor: { value: new THREE.Color('#48D7BA') },
      uGoldColor: { value: new THREE.Color('#E3B86B') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uGridColor;
      uniform vec3 uPulseColor;
      uniform vec3 uGoldColor;
      varying vec3 vWorldPos;

      void main() {
        vec2 coord = vWorldPos.xz;
        vec2 major = abs(fract(coord / 14.0 - 0.5) - 0.5) / fwidth(coord / 14.0);
        float majorLine = 1.0 - min(min(major.x, major.y), 1.0);

        float dist = length(coord);
        float radialFade = 1.0 - smoothstep(35.0, 175.0, dist);
        float ringWave = 1.0 - smoothstep(0.0, 2.8, abs(fract(dist * 0.04 - uTime * 0.08) - 0.5) * 18.0);

        vec3 col = uGridColor * (majorLine * 0.65);
        col += mix(uPulseColor, uGoldColor, 0.35) * majorLine * ringWave * 0.7;

        float alpha = majorLine * 0.35 * radialFade;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.65));
      }
    `,
  });
}
