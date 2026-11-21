import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { QualityTier, useThesisStore } from '../store/useThesisStore';
import { CityBuildingSpec } from '../types/thesis';
import { createOrionSkyMaterial } from './shaders/cityShaders';

function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeGlowSpriteTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.22, 'rgba(255, 120, 110, 0.85)');
  grad.addColorStop(0.55, 'rgba(255, 70, 60, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMistTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createRng(5521);

  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 42; i += 1) {
    const cx = size * (0.25 + rand() * 0.5);
    const cy = size * (0.25 + rand() * 0.5);
    const r = size * (0.14 + rand() * 0.22);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const alpha = 0.06 + rand() * 0.06;
    grad.addColorStop(0, `rgba(118, 158, 194, ${alpha})`);
    grad.addColorStop(0.5, `rgba(68, 102, 134, ${alpha * 0.45})`);
    grad.addColorStop(1, 'rgba(12, 22, 34, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface TrafficCraft {
  radius: number;
  angle: number;
  speed: number;
  y: number;
  scale: number;
  direction: 1 | -1;
}

export function AtmosphereEffects({
  buildings,
  criticalCenter,
  qualityTier,
  reducedMotion,
  showEmbers = true,
}: {
  buildings: CityBuildingSpec[];
  criticalCenter: [number, number, number];
  qualityTier: QualityTier;
  reducedMotion: boolean;
  showEmbers?: boolean;
}) {
  const skyMat = useMemo(() => createOrionSkyMaterial(), []);
  const glowTex = useMemo(() => makeGlowSpriteTexture(), []);
  const mistTex = useMemo(() => makeMistTexture(), []);

  const rainRef = useRef<THREE.LineSegments>(null);
  const craftBodyRef = useRef<THREE.InstancedMesh>(null);
  const craftTailRef = useRef<THREE.InstancedMesh>(null);
  const mistGroupRef = useRef<THREE.Group>(null);
  const disasterEvent = useThesisStore((s) => s.disasterEvent);

  // Disaster FX refs: seismic shockwave, falling rubble debris, typhoon vortex, lightning, shield dome
  const quakeWaveRef = useRef<THREE.Mesh>(null);
  const debrisRef = useRef<THREE.InstancedMesh>(null);
  const vortexGroupRef = useRef<THREE.Group>(null);
  const lightningRef = useRef<THREE.PointLight>(null);
  const shieldDomeRef = useRef<THREE.Mesh>(null);

  const debrisSeeds = useMemo(() => {
    const rand = createRng(8842);
    return Array.from({ length: 36 }, () => ({
      vx: (rand() - 0.5) * 26,
      vy: 10 + rand() * 18,
      vz: (rand() - 0.5) * 26,
      rx: rand() * 6,
      ry: rand() * 6,
      scale: 0.45 + rand() * 0.85,
      startY: 5 + rand() * 14,
    }));
  }, []);

  // Soft red aviation warning beacons on tall roofs
  const beaconGeom = useMemo(() => {
    const rand = createRng(4410);
    const points: number[] = [];
    if (showEmbers) {
      buildings.forEach((b) => {
        if (b.height > 18) {
          points.push(b.position[0], b.height + 3.2, b.position[2]);
        }
      });
    }
    for (let i = 0; i < 65; i += 1) {
      const ang = rand() * Math.PI * 2;
      const r = 56 + rand() * 115;
      const h = 34 + rand() * 52;
      points.push(Math.cos(ang) * r, h, Math.sin(ang) * r);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
    return g;
  }, [buildings, showEmbers]);

  // Low-lying canyon mist deep in the urban chasm
  const mistBanks = useMemo(() => {
    const rand = createRng(6041);
    const list: { pos: [number, number, number]; scale: number; rot: number; speed: number; opacity: number }[] = [];
    const count = qualityTier === 'low' ? 6 : 18;
    for (let i = 0; i < count; i += 1) {
      const ang = (i / count) * Math.PI * 2 + rand() * 0.4;
      const r = 24 + rand() * 75;
      list.push({
        pos: [Math.cos(ang) * r, -16 + rand() * 14, Math.sin(ang) * r],
        scale: 42 + rand() * 38,
        rot: rand() * Math.PI * 2,
        speed: (rand() - 0.5) * 0.02,
        opacity: 0.24 + rand() * 0.16,
      });
    }
    return list;
  }, [qualityTier]);

  // Distant flying hover-traffic cruising between skyscraper canyons
  const crafts = useMemo<TrafficCraft[]>(() => {
    const rand = createRng(7312);
    const count = qualityTier === 'low' ? 10 : 28;
    const list: TrafficCraft[] = [];
    for (let i = 0; i < count; i += 1) {
      list.push({
        radius: 32 + rand() * 88,
        angle: rand() * Math.PI * 2,
        speed: (0.04 + rand() * 0.07) * (rand() > 0.5 ? 1 : -1),
        y: 12 + rand() * 44,
        scale: 0.65 + rand() * 0.85,
        direction: rand() > 0.5 ? 1 : -1,
      });
    }
    return list;
  }, [qualityTier]);

  // Diagonal rain streaks across full viewport depth
  const rainCount = qualityTier === 'high' ? 760 : qualityTier === 'standard' ? 380 : 0;
  const rainGeom = useMemo(() => {
    const rand = createRng(9931);
    const pos = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i += 1) {
      const x = (rand() - 0.5) * 145;
      const y = -15 + rand() * 90;
      const z = (rand() - 0.5) * 145;
      const len = 2.1 + rand() * 1.4;
      pos[i * 6] = x;
      pos[i * 6 + 1] = y;
      pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x - 0.12;
      pos[i * 6 + 4] = y - len;
      pos[i * 6 + 5] = z + 0.06;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [rainCount]);

  // Collapse ember plume
  const emberCount = qualityTier === 'high' ? 140 : qualityTier === 'standard' ? 75 : 24;
  const { emberGeom, emberSpeeds } = useMemo(() => {
    const rand = createRng(3319);
    const pos = new Float32Array(emberCount * 3);
    const speeds = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i += 1) {
      pos[i * 3] = criticalCenter[0] + (rand() - 0.5) * 13;
      pos[i * 3 + 1] = 1.5 + rand() * 28;
      pos[i * 3 + 2] = criticalCenter[2] + (rand() - 0.5) * 13;
      speeds[i] = 1.8 + rand() * 2.5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { emberGeom: g, emberSpeeds: speeds };
  }, [emberCount, criticalCenter]);

  useEffect(() => {
    return () => {
      skyMat.dispose();
      glowTex.dispose();
      mistTex.dispose();
      beaconGeom.dispose();
      rainGeom.dispose();
      emberGeom.dispose();
    };
  }, [beaconGeom, emberGeom, glowTex, mistTex, rainGeom, skyMat]);

  const dummyObj = useMemo(() => new THREE.Object3D(), []);
  const tailDummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!craftBodyRef.current || !craftTailRef.current) return;
    crafts.forEach((c, idx) => {
      const x = Math.cos(c.angle) * c.radius;
      const z = Math.sin(c.angle) * c.radius;
      dummyObj.position.set(x, c.y, z);
      dummyObj.rotation.set(0, -c.angle + (c.speed > 0 ? 0 : Math.PI), 0);
      dummyObj.scale.set(0.8 * c.scale, 0.35 * c.scale, 2.2 * c.scale);
      dummyObj.updateMatrix();
      craftBodyRef.current!.setMatrixAt(idx, dummyObj.matrix);

      tailDummy.position.set(x, c.y, z);
      tailDummy.rotation.set(0, -c.angle + (c.speed > 0 ? 0 : Math.PI), 0);
      tailDummy.scale.set(0.6 * c.scale, 0.25 * c.scale, 0.5 * c.scale);
      tailDummy.updateMatrix();
      craftTailRef.current!.setMatrixAt(idx, tailDummy.matrix);
    });
    craftBodyRef.current.instanceMatrix.needsUpdate = true;
    craftTailRef.current.instanceMatrix.needsUpdate = true;
  }, [crafts, dummyObj, tailDummy]);

  useFrame((_, delta) => {
    if (reducedMotion) return;

    if (mistGroupRef.current) {
      mistGroupRef.current.children.forEach((child, idx) => {
        const bank = mistBanks[idx];
        if (bank) child.rotation.z += delta * bank.speed;
      });
    }

    if (craftBodyRef.current && craftTailRef.current) {
      crafts.forEach((c, idx) => {
        c.angle += delta * c.speed;
        const x = Math.cos(c.angle) * c.radius;
        const z = Math.sin(c.angle) * c.radius;
        const heading = -c.angle + (c.speed > 0 ? 0 : Math.PI);
        dummyObj.position.set(x, c.y, z);
        dummyObj.rotation.set(0, heading, 0);
        dummyObj.scale.set(0.8 * c.scale, 0.35 * c.scale, 2.2 * c.scale);
        dummyObj.updateMatrix();
        craftBodyRef.current!.setMatrixAt(idx, dummyObj.matrix);

        const tailOffset = c.speed > 0 ? -1.25 * c.scale : 1.25 * c.scale;
        tailDummy.position.set(
          x - Math.sin(c.angle) * tailOffset,
          c.y,
          z + Math.cos(c.angle) * tailOffset,
        );
        tailDummy.rotation.set(0, heading, 0);
        tailDummy.scale.set(0.55 * c.scale, 0.22 * c.scale, 0.5 * c.scale);
        tailDummy.updateMatrix();
        craftTailRef.current!.setMatrixAt(idx, tailDummy.matrix);
      });
      craftBodyRef.current.instanceMatrix.needsUpdate = true;
      craftTailRef.current.instanceMatrix.needsUpdate = true;
    }

    if (rainRef.current && rainCount > 0) {
      const attr = rainGeom.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const typhoonActive =
        disasterEvent?.kind === 'typhoon' &&
        performance.now() - disasterEvent.startedAtMs >= 0 &&
        performance.now() - disasterEvent.startedAtMs < 3600;
      const fall = delta * (typhoonActive ? 115 : 42);
      const windX = typhoonActive ? delta * 68 : 0;
      for (let i = 0; i < rainCount; i += 1) {
        arr[i * 6] += windX;
        arr[i * 6 + 3] += windX;
        arr[i * 6 + 1] -= fall;
        arr[i * 6 + 4] -= fall;
        if (arr[i * 6 + 4] < -18 || arr[i * 6] > 78) {
          const resetY = 74;
          const len = typhoonActive ? 4.8 : 2.6;
          if (arr[i * 6] > 78) {
            arr[i * 6] = -72;
            arr[i * 6 + 3] = -72 + (typhoonActive ? 2.4 : 0.35);
          }
          arr[i * 6 + 1] = resetY;
          arr[i * 6 + 4] = resetY - len;
        }
      }
      attr.needsUpdate = true;
    }

    // Disaster 3D Effects (Seismic Wave + Debris / Typhoon Vortex + Lightning / Shield Dome)
    const nowMs = performance.now();
    const dElapsed = disasterEvent ? nowMs - disasterEvent.startedAtMs : -1;
    const dDur = 3000;
    const dActive = Boolean(disasterEvent && dElapsed >= 0 && dElapsed < dDur && !reducedMotion);
    const dP = dActive ? dElapsed / dDur : 0;

    if (quakeWaveRef.current) {
      const isQuake = dActive && disasterEvent?.kind === 'earthquake';
      quakeWaveRef.current.visible = isQuake;
      if (isQuake) {
        const s = 1 + dP * 3.8;
        quakeWaveRef.current.scale.set(s, s, 1);
        const mat = quakeWaveRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1 - dP) * 0.9);
      }
    }

    if (debrisRef.current) {
      const showDebris = dActive && (disasterEvent?.kind === 'earthquake' || disasterEvent?.kind === 'typhoon');
      debrisRef.current.visible = showDebris;
      if (showDebris) {
        const tSec = dElapsed / 1000;
        const cx = criticalCenter[0];
        const cz = criticalCenter[2];
        const windPush = disasterEvent?.kind === 'typhoon' ? 14 : 0;
        debrisSeeds.forEach((d, idx) => {
          const x = cx + (d.vx + windPush) * tSec;
          const y = Math.max(0.4, d.startY + d.vy * tSec - 18 * tSec * tSec);
          const z = cz + d.vz * tSec;
          const fade = Math.max(0.01, 1 - dP * 0.85);
          dummyObj.position.set(x, y, z);
          dummyObj.rotation.set(d.rx + tSec * 5, d.ry + tSec * 4, tSec * 3);
          dummyObj.scale.setScalar(d.scale * fade);
          dummyObj.updateMatrix();
          debrisRef.current!.setMatrixAt(idx, dummyObj.matrix);
        });
        debrisRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    if (vortexGroupRef.current) {
      const isTyphoon = dActive && disasterEvent?.kind === 'typhoon';
      vortexGroupRef.current.visible = isTyphoon;
      if (isTyphoon) {
        vortexGroupRef.current.rotation.y += delta * 5.8;
        const pulse = Math.sin(dP * Math.PI);
        vortexGroupRef.current.children.forEach((child, idx) => {
          const mesh = child as THREE.Mesh;
          mesh.rotation.z = nowMs * 0.004 * (idx % 2 === 0 ? 1 : -1);
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = pulse * (0.48 - idx * 0.08);
        });
      }
    }

    if (lightningRef.current) {
      const isTyphoon = dActive && disasterEvent?.kind === 'typhoon';
      const flash =
        isTyphoon &&
        ((dElapsed > 180 && dElapsed < 320) ||
          (dElapsed > 950 && dElapsed < 1120) ||
          (dElapsed > 1750 && dElapsed < 1880));
      lightningRef.current.intensity = flash ? 180 : 0;
    }

    if (shieldDomeRef.current) {
      const isShield = dActive && disasterEvent?.kind === 'shield';
      shieldDomeRef.current.visible = isShield;
      if (isShield) {
        const s = 0.65 + Math.sin(dP * Math.PI * 0.5) * 0.45;
        shieldDomeRef.current.scale.setScalar(s);
        shieldDomeRef.current.rotation.y += delta * 0.6;
        const mat = shieldDomeRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.sin(dP * Math.PI) * 0.42;
      }
    }

    if (showEmbers) {
      const eAttr = emberGeom.getAttribute('position') as THREE.BufferAttribute;
      const eArr = eAttr.array as Float32Array;
      for (let i = 0; i < emberCount; i += 1) {
        eArr[i * 3 + 1] += delta * emberSpeeds[i];
        if (eArr[i * 3 + 1] > 32) eArr[i * 3 + 1] = 1.5;
      }
      eAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Orion Misty Steel-Blue Twilight Sky Dome */}
      <mesh material={skyMat} renderOrder={-10}>
        <sphereGeometry args={[340, 32, 20]} />
      </mesh>

      {/* Soft Red Aviation Warning Beacon Sprites on Skyscraper Crowns */}
      <points geometry={beaconGeom}>
        <pointsMaterial
          map={glowTex}
          color="#FF594F"
          size={3.2}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Deep Canyon Volumetric Mist Layers */}
      <group ref={mistGroupRef}>
        {mistBanks.map((bank, idx) => (
          <mesh key={idx} position={bank.pos} rotation={[-Math.PI / 2, 0, bank.rot]}>
            <planeGeometry args={[bank.scale, bank.scale]} />
            <meshBasicMaterial
              map={mistTex}
              transparent
              opacity={bank.opacity}
              depthWrite={false}
              color="#6387a8"
            />
          </mesh>
        ))}
      </group>

      {/* Distant Hover-Traffic Fleet (flying cars passing through canyons) */}
      <instancedMesh ref={craftBodyRef} args={[undefined, undefined, crafts.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#18222e" roughness={0.35} metalness={0.8} />
      </instancedMesh>
      <instancedMesh ref={craftTailRef} args={[undefined, undefined, crafts.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#FF594F" />
      </instancedMesh>

      {/* Rain Streaks */}
      {rainCount > 0 && (
        <lineSegments ref={rainRef} geometry={rainGeom}>
          <lineBasicMaterial color="#a8cbe6" transparent opacity={0.26} depthWrite={false} />
        </lineSegments>
      )}

      {/* Earthquake Plaza Shockwave Ring */}
      <mesh
        ref={quakeWaveRef}
        position={[criticalCenter[0], 0.48, criticalCenter[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[8.5, 11.2, 48]} />
        <meshBasicMaterial
          color="#FF594F"
          transparent
          opacity={0.85}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Tumbling Concrete & Ember Debris Chunks */}
      <instancedMesh ref={debrisRef} args={[undefined, undefined, debrisSeeds.length]} visible={false}>
        <boxGeometry args={[1, 0.7, 0.85]} />
        <meshStandardMaterial
          color="#2b333d"
          emissive="#FF594F"
          emissiveIntensity={0.65}
          roughness={0.7}
          metalness={0.2}
        />
      </instancedMesh>

      {/* Typhoon Swirling Cyclone Vortex Rings */}
      <group ref={vortexGroupRef} position={[0, 0, 0]} visible={false}>
        {[
          { y: 7, r: 22, tube: 0.42 },
          { y: 17, r: 28, tube: 0.55 },
          { y: 28, r: 35, tube: 0.68 },
        ].map((ring, idx) => (
          <mesh key={idx} position={[0, ring.y, 0]} rotation={[Math.PI / 2 + 0.12, 0, 0]}>
            <torusGeometry args={[ring.r, ring.tube, 8, 48]} />
            <meshBasicMaterial
              color="#7CE8FF"
              transparent
              opacity={0.4}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Typhoon Lightning Flash */}
      <pointLight ref={lightningRef} position={[12, 58, 18]} color="#B8ECFF" intensity={0} distance={190} />

      {/* Holographic Shield Dome (High-Score Disaster Resistance) */}
      <mesh ref={shieldDomeRef} position={[0, 4, 0]} visible={false}>
        <sphereGeometry args={[34, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshBasicMaterial
          color="#48D7BA"
          wireframe
          transparent
          opacity={0.35}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Critical Collapse Rising Embers */}
      {showEmbers &&
        buildings.some((b) => b.status === 'collapsed' || b.status === 'unfinished') && (
          <points geometry={emberGeom}>
            <pointsMaterial
              color="#FF594F"
              size={0.34}
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
              sizeAttenuation
              depthWrite={false}
            />
          </points>
        )}
    </group>
  );
}
