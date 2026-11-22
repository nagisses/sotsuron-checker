import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCityMaterials } from './materials';
import {
  createAbyssGridMaterial,
  createChevronBridgeMaterial,
  createCircuitPlazaMaterial,
  createConduitFlowMaterial,
  createInstancedFacadeMaterial,
} from './shaders/cityShaders';
import { useThesisStore } from '../store/useThesisStore';

function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface BoxTransform {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotY: number;
}

export function UrbanFabric() {
  const mats = useMemo(() => getCityMaterials(), []);
  const reducedMotion = useThesisStore((s) => s.reducedMotion);
  const appPhase = useThesisStore((s) => s.appPhase);

  const circuitPlazaMat = useMemo(() => createCircuitPlazaMaterial(), []);
  const midFacadeMat = useMemo(
    () =>
      createInstancedFacadeMaterial({
        fogColor: '#1d2f42',
        fogDensity: 0.0052,
        windowBrightness: 1.0,
      }),
    [],
  );
  const farFacadeMat = useMemo(
    () =>
      createInstancedFacadeMaterial({
        fogColor: '#294057',
        fogDensity: 0.0056,
        windowBrightness: 0.72,
      }),
    [],
  );
  const abyssGridMat = useMemo(() => createAbyssGridMaterial(), []);
  const amberArteryMat = useMemo(
    () => createConduitFlowMaterial({ color: '#E3B86B', speed: 0.9, unstable: false }),
    [],
  );
  const approachChevronMat = useMemo(
    () => createChevronBridgeMaterial({ color: '#48D7BA', speed: 1.15, unstable: false }),
    [],
  );

  useEffect(() => {
    return () => {
      circuitPlazaMat.dispose();
      midFacadeMat.dispose();
      farFacadeMat.dispose();
      abyssGridMat.dispose();
      amberArteryMat.dispose();
      approachChevronMat.dispose();
    };
  }, [
    abyssGridMat,
    amberArteryMat,
    approachChevronMat,
    circuitPlazaMat,
    farFacadeMat,
    midFacadeMat,
  ]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    circuitPlazaMat.uniforms.uTime.value = t;
    midFacadeMat.uniforms.uTime.value = t;
    farFacadeMat.uniforms.uTime.value = t;
    abyssGridMat.uniforms.uTime.value = t;
    amberArteryMat.uniforms.uTime.value = t;
    approachChevronMat.uniforms.uTime.value = t;
  });

  const { midMain, midPodium, midAnnex, farTowers, deckCurbs } = useMemo(() => {
    const rand = createRng(91823);
    const main: BoxTransform[] = [];
    const podium: BoxTransform[] = [];
    const annex: BoxTransform[] = [];
    const far: BoxTransform[] = [];
    const curbs: BoxTransform[] = [];

    for (let i = 0; i < 64; i += 1) {
      const ang = (i / 64) * Math.PI * 2;
      const r = i % 2 === 0 ? 41.5 : 45.2;
      curbs.push({
        x: Math.cos(ang) * r,
        y: 0.32,
        z: Math.sin(ang) * r,
        sx: 3.4 + (i % 3) * 0.8,
        sy: 0.64 + (i % 2) * 0.35,
        sz: 2.2,
        rotY: -ang,
      });
    }

    for (let i = 0; i < 210; i += 1) {
      const ang = rand() * Math.PI * 2;
      const xRaw = Math.cos(ang);
      const zRaw = Math.sin(ang);
      const r = 52 + rand() * 72;
      const x = xRaw * r;
      const z = zRaw * r;

      if (z > 10 && x > -26 && x < 52 && r < 106) continue;
      const distOverview = Math.hypot(x - 26, z - 70);
      const distCollapse = Math.hypot(x - 39, z + 23);
      if (distOverview < 18 || distCollapse < 16) continue;

      const w = 6.2 + rand() * 7.8;
      const d = w * (0.72 + rand() * 0.5);
      const topY = 18 + Math.pow(rand(), 1.1) * 56;
      const bottomY = -52;
      const totalH = topY - bottomY;
      const rotY = Math.floor(rand() * 4) * (Math.PI * 0.5) + (rand() - 0.5) * 0.06;

      main.push({
        x,
        y: bottomY + totalH * 0.5,
        z,
        sx: w,
        sy: totalH,
        sz: d,
        rotY,
      });

      const podTop = 4 + rand() * 12;
      const podH = podTop - bottomY;
      podium.push({
        x,
        y: bottomY + podH * 0.5,
        z,
        sx: w * 1.42,
        sy: podH,
        sz: d * 1.42,
        rotY,
      });

      const annexTop = topY * (0.58 + rand() * 0.36);
      const annexH = annexTop - bottomY;
      annex.push({
        x: x + (rand() - 0.5) * w * 0.55,
        y: bottomY + annexH * 0.5,
        z: z + (rand() - 0.5) * d * 0.55,
        sx: w * 0.58,
        sy: annexH,
        sz: d * 0.58,
        rotY,
      });
    }

    for (let i = 0; i < 240; i += 1) {
      const ang = rand() * Math.PI * 2;
      const r = 128 + rand() * 116;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const width = 9.0 + rand() * 12.0;
      const topY = 30 + Math.pow(rand(), 1.05) * 86;
      const bottomY = -65;
      const totalH = topY - bottomY;

      far.push({
        x,
        y: bottomY + totalH * 0.5,
        z,
        sx: width,
        sy: totalH,
        sz: width * (0.75 + rand() * 0.55),
        rotY: Math.floor(rand() * 4) * (Math.PI * 0.5),
      });
    }

    return { midMain: main, midPodium: podium, midAnnex: annex, farTowers: far, deckCurbs: curbs };
  }, []);

  const midMainRef = useRef<THREE.InstancedMesh>(null);
  const midPodiumRef = useRef<THREE.InstancedMesh>(null);
  const midAnnexRef = useRef<THREE.InstancedMesh>(null);
  const farMeshRef = useRef<THREE.InstancedMesh>(null);
  const curbMeshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const populate = (mesh: THREE.InstancedMesh | null, list: BoxTransform[]) => {
      if (!mesh) return;
      list.forEach((item, idx) => {
        dummy.position.set(item.x, item.y, item.z);
        dummy.rotation.set(0, item.rotY, 0);
        dummy.scale.set(item.sx, item.sy, item.sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    populate(midMainRef.current, midMain);
    populate(midPodiumRef.current, midPodium);
    populate(midAnnexRef.current, midAnnex);
    populate(farMeshRef.current, farTowers);
    populate(curbMeshRef.current, deckCurbs);
  }, [midMain, midPodium, midAnnex, farTowers, deckCurbs]);

  const viaductPiers = useMemo(() => {
    const list: [number, number, number][] = [];
    const count = 20;
    for (let i = 0; i < count; i += 1) {
      const ang = (i / count) * Math.PI * 2;
      list.push([Math.cos(ang) * 51, -26, Math.sin(ang) * 51]);
    }
    return list;
  }, []);

  return (
    <group>
      {/* Channeled Brutalist Circuit Plaza Floor */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={circuitPlazaMat} receiveShadow>
        <circleGeometry args={[48, 64]} />
      </mesh>
      <mesh position={[0, -0.82, 0]} material={mats.concreteDark} receiveShadow>
        <cylinderGeometry args={[47.5, 49.5, 1.55, 24]} />
      </mesh>

      {/* Waiting Construction Site Ring on Central Plaza when in 'prep' or 'upload' phase */}
      {(appPhase === 'prep' || appPhase === 'upload') && (
        <group position={[0, 0.08, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={mats.emissiveCyan}>
            <ringGeometry args={[8.5, 8.85, 6]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={mats.emissiveGold}>
            <ringGeometry args={[19.5, 19.8, 64]} />
          </mesh>
        </group>
      )}

      {/* Raised Brutalist Curb Blocks around Deck Perimeter */}
      <instancedMesh
        ref={curbMeshRef}
        args={[undefined, undefined, deckCurbs.length]}
        material={mats.concrete}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>

      {/* Ceremonial Glowing Chevron Sky-Bridge Approach Highway */}
      <group position={[0, 4.2, 42]}>
        <mesh material={mats.chassisSteel} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.55, 58]} />
        </mesh>
        <mesh position={[-2.1, 0.42, 0]} material={mats.emissiveCyan}>
          <boxGeometry args={[0.12, 0.14, 58]} />
        </mesh>
        <mesh position={[2.1, 0.42, 0]} material={mats.emissiveCyan}>
          <boxGeometry args={[0.12, 0.14, 58]} />
        </mesh>
        <group position={[0, 0.34, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={approachChevronMat}>
            <planeGeometry args={[56, 3.2]} />
          </mesh>
        </group>
      </group>

      {/* Golden Arterial Transit Highways */}
      <group position={[0, 0.05, 0]} rotation={[0, -Math.PI * 0.25, 0]}>
        <mesh position={[0, 0, 15.5]} rotation={[-Math.PI / 2, 0, 0]} material={amberArteryMat}>
          <planeGeometry args={[92, 0.9]} />
        </mesh>
        <mesh position={[0, 0, 16.9]} rotation={[-Math.PI / 2, 0, 0]} material={amberArteryMat}>
          <planeGeometry args={[92, 0.45]} />
        </mesh>
      </group>

      {/* Outer Viaduct Ring & Deep Abyssal Support Piers */}
      <mesh position={[0, -2.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.chassisSteel}>
        <torusGeometry args={[51, 1.4, 8, 48]} />
      </mesh>
      <mesh position={[0, -1.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissiveCyan}>
        <torusGeometry args={[52.2, 0.09, 6, 64]} />
      </mesh>
      {viaductPiers.map((pos, idx) => (
        <mesh key={idx} position={pos} material={mats.concreteDark}>
          <boxGeometry args={[1.6, 52, 1.6]} />
        </mesh>
      ))}

      {/* Deep Subterranean Abyss Grid */}
      <mesh position={[0, -28, 0]} rotation={[-Math.PI / 2, 0, 0]} material={abyssGridMat}>
        <planeGeometry args={[380, 380]} />
      </mesh>

      {/* Clustered Mid-Ground Towering Skyscrapers */}
      <instancedMesh
        ref={midMainRef}
        args={[undefined, undefined, midMain.length]}
        material={midFacadeMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh
        ref={midPodiumRef}
        args={[undefined, undefined, midPodium.length]}
        material={midFacadeMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh
        ref={midAnnexRef}
        args={[undefined, undefined, midAnnex.length]}
        material={midFacadeMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>

      {/* Far-Ground Colossal Horizon Skyline */}
      <instancedMesh
        ref={farMeshRef}
        args={[undefined, undefined, farTowers.length]}
        material={farFacadeMat}
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  );
}
