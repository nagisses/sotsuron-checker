import { type RefObject, useEffect, useMemo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CityBuildingSpec, CityObservationDeckSpec, NodeTransitionEvent } from '../../types/thesis';
import { CityMaterialLibrary, getCityMaterials } from '../materials';
import {
  createFractureFissureMaterial,
  createHeroCircuitMaterial,
  createHologramRingMaterial,
} from '../shaders/cityShaders';
import { DisasterEventState, useThesisStore } from '../../store/useThesisStore';

function SubDeckFoundation({
  width,
  depth,
  mats,
}: {
  width: number;
  depth: number;
  mats: CityMaterialLibrary;
}) {
  const pierOffsetX = width * 0.36;
  const pierOffsetZ = depth * 0.36;
  return (
    <group>
      <mesh position={[0, -1.0, 0]} material={mats.concreteDark} receiveShadow>
        <boxGeometry args={[width * 1.18, 2.0, depth * 1.18]} />
      </mesh>
      {[
        [-pierOffsetX, -pierOffsetZ],
        [pierOffsetX, -pierOffsetZ],
        [-pierOffsetX, pierOffsetZ],
        [pierOffsetX, pierOffsetZ],
      ].map(([px, pz], idx) => (
        <mesh key={idx} position={[px, -22, pz]} material={mats.chassisSteel}>
          <boxGeometry args={[1.25, 42, 1.25]} />
        </mesh>
      ))}
    </group>
  );
}

function SelectionHalo({
  radius,
  selected,
  hovered,
  filteredMatch,
  isCritical,
  reducedMotion,
}: {
  radius: number;
  selected: boolean;
  hovered: boolean;
  filteredMatch: boolean;
  isCritical: boolean;
  reducedMotion: boolean;
}) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !outerRingRef.current) return;
    outerRingRef.current.rotation.z = clock.getElapsedTime() * 0.45;
  });

  if (!selected && !hovered && !filteredMatch) return null;
  const color = isCritical ? '#FF594F' : '#48D7BA';
  return (
    <group>
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.92, radius * 1.02, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.94 : hovered ? 0.65 : 0.42}
          side={THREE.DoubleSide}
        />
      </mesh>
      {selected && (
        <mesh ref={outerRingRef} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.1, radius * 1.16, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.78} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function CentralSpireGeometry({
  spec,
  mats,
  reducedMotion,
}: {
  spec: CityBuildingSpec;
  mats: CityMaterialLibrary;
  reducedMotion: boolean;
}) {
  const pyramidRef = useRef<THREE.Mesh>(null);
  const holoRingRef = useRef<THREE.Mesh>(null);
  const coreLightRef = useRef<THREE.PointLight>(null);
  const circuitMat = useMemo(
    () => createHeroCircuitMaterial({ accentColor: '#48D7BA', intensity: 1.05 }),
    [],
  );
  const holoMat = useMemo(() => createHologramRingMaterial('#48D7BA'), []);
  const coreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#48D7BA',
        emissive: '#48D7BA',
        emissiveIntensity: 1.65,
        roughness: 0.2,
        metalness: 0.1,
      }),
    [],
  );
  const h = spec.height;
  const w = spec.width;

  useEffect(() => {
    return () => {
      circuitMat.dispose();
      holoMat.dispose();
      coreMat.dispose();
    };
  }, [circuitMat, coreMat, holoMat]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    circuitMat.uniforms.uTime.value = reducedMotion ? 0 : t;
    holoMat.uniforms.uTime.value = reducedMotion ? 0 : t;
    if (reducedMotion) return;
    coreMat.emissiveIntensity = 1.48 + Math.sin(t * 1.6) * 0.25;
    if (pyramidRef.current) {
      pyramidRef.current.position.y = h * 0.56 + Math.sin(t * 0.85) * 0.45;
      pyramidRef.current.rotation.y = t * 0.12;
    }
    if (holoRingRef.current) {
      holoRingRef.current.rotation.y = -t * 0.22;
    }
    if (coreLightRef.current) {
      coreLightRef.current.intensity = 42 + Math.sin(t * 1.6) * 6;
    }
  });

  // 4 Monumental Corner Citadel Pylons framing the central core atrium
  const cornerDist = w * 0.42;
  const corners: [number, number][] = [
    [-cornerDist, -cornerDist],
    [cornerDist, -cornerDist],
    [-cornerDist, cornerDist],
    [cornerDist, cornerDist],
  ];

  return (
    <group>
      {/* 4-Tier Stepped Brutalist Ziggurat Base + Ceremonial Concrete Stairs */}
      {[0, 1, 2, 3].map((tier) => {
        const s = 1.82 - tier * 0.2;
        const th = 1.1;
        return (
          <mesh
            key={tier}
            position={[0, tier * th + th * 0.5, 0]}
            material={tier % 2 === 0 ? mats.concreteDark : mats.concrete}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w * s, th, w * s]} />
          </mesh>
        );
      })}
      {/* Recessed Stepped Stair Flights along South & East Faces */}
      {[0, 1, 2, 3, 4, 5].map((step) => (
        <group key={step}>
          <mesh
            position={[0, step * 0.72 + 0.36, w * (0.98 - step * 0.045)]}
            material={mats.metallicSteel}
            receiveShadow
          >
            <boxGeometry args={[w * 0.44, 0.36, 0.72]} />
          </mesh>
          <mesh
            position={[w * (0.98 - step * 0.045), step * 0.72 + 0.36, 0]}
            material={mats.metallicSteel}
            receiveShadow
          >
            <boxGeometry args={[0.72, 0.36, w * 0.44]} />
          </mesh>
        </group>
      ))}

      {/* Recessed Glowing Atrium Floor Well */}
      <mesh position={[0, 4.45, 0]} material={coreMat}>
        <boxGeometry args={[3.2, 0.16, 3.2]} />
      </mesh>
      <mesh position={[0, h * 0.34, 0]} material={coreMat}>
        <cylinderGeometry args={[0.45, 0.78, h * 0.48, 8]} />
      </mesh>

      {/* Suspended Inverted Obsidian Monolith Core (Control Board Homage) */}
      <mesh
        ref={pyramidRef}
        position={[0, h * 0.56, 0]}
        rotation={[Math.PI, Math.PI * 0.25, 0]}
        material={mats.chassisSteel}
        castShadow
      >
        <coneGeometry args={[3.6, 11.5, 4]} />
      </mesh>

      {/* Orion-Style Pixelated Holographic Dot-Matrix Data Ring */}
      <mesh ref={holoRingRef} position={[0, h * 0.62, 0]} material={holoMat}>
        <cylinderGeometry args={[9.4, 9.4, 1.35, 48, 1, true]} />
      </mesh>

      {/* 4 Towering Circuit-Etched Brutalist Corner Monoliths */}
      {corners.map(([cx, cz], idx) => {
        const subH = idx % 2 === 0 ? h * 0.96 : h * 0.84;
        return (
          <group key={idx} position={[cx, 0, cz]}>
            <mesh position={[0, subH * 0.36, 0]} material={circuitMat} castShadow receiveShadow>
              <boxGeometry args={[w * 0.38, subH * 0.7, w * 0.38]} />
            </mesh>
            <mesh position={[0, subH * 0.84, 0]} material={mats.facadeCyan} castShadow receiveShadow>
              <boxGeometry args={[w * 0.28, subH * 0.38, w * 0.28]} />
            </mesh>
            <mesh position={[0, subH * 1.03, 0]} material={mats.metallicSteel} castShadow>
              <boxGeometry args={[w * 0.3, 0.55, w * 0.3]} />
            </mesh>
            {/* Exterior Fluted Structural Pilasters */}
            <mesh position={[cx * 0.46, subH * 0.45, 0]} material={mats.concreteDark} castShadow>
              <boxGeometry args={[0.55, subH * 0.86, w * 0.18]} />
            </mesh>
            <mesh position={[0, subH * 0.45, cz * 0.46]} material={mats.concreteDark} castShadow>
              <boxGeometry args={[w * 0.18, subH * 0.86, 0.55]} />
            </mesh>
            {/* Vertical Core Light Slit */}
            <mesh position={[-cx * 0.42, subH * 0.48, -cz * 0.42]} material={coreMat}>
              <boxGeometry args={[0.16, subH * 0.7, 0.16]} />
            </mesh>
            {/* Rooftop Telemetry Spires */}
            <mesh position={[0, subH + 3.6, 0]} material={mats.metallicSteel}>
              <cylinderGeometry args={[0.05, 0.14, 7.2, 6]} />
            </mesh>
          </group>
        );
      })}

      {/* High Bridging Portal Collars */}
      {[0.44, 0.76].map((tier, idx) => (
        <mesh key={idx} position={[0, h * tier, 0]} material={mats.chassisSteel} castShadow receiveShadow>
          <boxGeometry args={[w * 0.98, 1.35, w * 0.98]} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.44 + 0.72, 0]} rotation={[Math.PI / 2, 0, 0]} material={coreMat}>
        <torusGeometry args={[w * 0.52, 0.09, 8, 36]} />
      </mesh>

      {/* Split Twin Sovereign Crown Blades (Orion Center Tower Silhouette) */}
      <mesh position={[-w * 0.18, h * 1.02, 0]} material={circuitMat} castShadow>
        <boxGeometry args={[w * 0.24, h * 0.24, w * 0.46]} />
      </mesh>
      <mesh position={[w * 0.18, h * 0.99, 0]} material={circuitMat} castShadow>
        <boxGeometry args={[w * 0.24, h * 0.2, w * 0.46]} />
      </mesh>
      <mesh position={[0, h + 7.2, 0]} material={mats.metallicSteel}>
        <cylinderGeometry args={[0.08, 0.28, 14.5, 8]} />
      </mesh>
      <mesh position={[0, h + 14.5, 0]} material={coreMat}>
        <sphereGeometry args={[0.26, 10, 10]} />
      </mesh>

      <pointLight
        ref={coreLightRef}
        position={[0, 7.5, 0]}
        color="#48D7BA"
        intensity={46}
        distance={40}
        decay={1.7}
      />
    </group>
  );
}

function ClaimCitadelGeometry({ spec, mats }: { spec: CityBuildingSpec; mats: CityMaterialLibrary }) {
  const { width: w, depth: d, height: h } = spec;
  const circuitMat = useMemo(
    () => createHeroCircuitMaterial({ accentColor: '#48D7BA', intensity: 0.95 }),
    [],
  );
  useEffect(() => {
    return () => circuitMat.dispose();
  }, [circuitMat]);
  return (
    <group>
      <mesh position={[0, 1.5, 0]} material={mats.concreteDark} castShadow receiveShadow>
        <boxGeometry args={[w * 1.24, 3.0, d * 1.24]} />
      </mesh>
      {/* Tier 1 Circuit-Etched Armor */}
      <mesh position={[0, h * 0.34, 0]} material={circuitMat} castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.68, d]} />
      </mesh>
      {/* Tier 2 Setback */}
      <mesh position={[0, h * 0.8, 0]} material={mats.facadeCyan} castShadow receiveShadow>
        <boxGeometry args={[w * 0.76, h * 0.36, d * 0.76]} />
      </mesh>
      {/* Tier 3 Penthouse */}
      <mesh position={[0, h * 1.04, 0]} material={mats.chassisSteel} castShadow>
        <boxGeometry args={[w * 0.46, h * 0.16, d * 0.46]} />
      </mesh>
      {/* Exterior Vertical Exoskeleton Fins */}
      {[-0.36, 0, 0.36].map((frac, idx) => (
        <group key={idx}>
          <mesh position={[frac * w, h * 0.48, d * 0.52]} material={mats.metallicSteel} castShadow>
            <boxGeometry args={[0.42, h * 0.84, 0.52]} />
          </mesh>
          <mesh position={[frac * w, h * 0.48, -d * 0.52]} material={mats.metallicSteel} castShadow>
            <boxGeometry args={[0.42, h * 0.84, 0.52]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, h * 0.56, d * 0.51]} material={mats.emissiveCyan}>
        <boxGeometry args={[0.22, h * 0.72, 0.14]} />
      </mesh>
      <mesh position={[0, h * 0.56, -d * 0.51]} material={mats.emissiveCyan}>
        <boxGeometry args={[0.22, h * 0.72, 0.14]} />
      </mesh>
      <mesh position={[0.6, h * 1.15 + 2.4, 0]} material={mats.metallicSteel} castShadow>
        <cylinderGeometry args={[0.1, 0.25, 5.4, 8]} />
      </mesh>
      <mesh position={[-0.9, h * 1.12 + 0.6, 0.6]} material={mats.concreteDark} castShadow>
        <boxGeometry args={[1.4, 1.4, 1.8]} />
      </mesh>
    </group>
  );
}

function ClaimTwinPylonGeometry({ spec, mats }: { spec: CityBuildingSpec; mats: CityMaterialLibrary }) {
  const { width: w, depth: d, height: h } = spec;
  const splitX = w * 0.34;
  return (
    <group>
      <mesh position={[0, 1.4, 0]} material={mats.concreteDark} castShadow receiveShadow>
        <boxGeometry args={[w * 1.28, 2.8, d * 1.18]} />
      </mesh>
      {/* West Shaft */}
      <mesh position={[-splitX, h * 0.48, 0]} material={mats.facadeCyan} castShadow receiveShadow>
        <boxGeometry args={[w * 0.42, h * 0.92, d * 0.88]} />
      </mesh>
      {/* East Shaft (Slightly shorter asymmetrical crown) */}
      <mesh position={[splitX, h * 0.42, 0]} material={mats.concrete} castShadow receiveShadow>
        <boxGeometry args={[w * 0.42, h * 0.82, d * 0.88]} />
      </mesh>
      {/* Skybridges spanning the central gap */}
      {[0.34, 0.62, 0.84].map((tier, idx) => (
        <group key={idx} position={[0, h * tier, 0]}>
          <mesh material={mats.metallicSteel} castShadow>
            <boxGeometry args={[splitX * 2, 1.2, d * 0.52]} />
          </mesh>
          <mesh position={[0, 0.65, 0]} material={mats.emissiveCyan}>
            <boxGeometry args={[splitX * 1.8, 0.16, d * 0.3]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, h * 0.45, 0]} material={mats.emissiveCyan}>
        <boxGeometry args={[0.25, h * 0.78, 0.25]} />
      </mesh>
    </group>
  );
}

function ClaimCantileverGeometry({ spec, mats }: { spec: CityBuildingSpec; mats: CityMaterialLibrary }) {
  const { width: w, depth: d, height: h } = spec;
  return (
    <group>
      <mesh position={[0, 1.4, 0]} material={mats.concreteDark} castShadow receiveShadow>
        <boxGeometry args={[w * 1.2, 2.8, d * 1.2]} />
      </mesh>
      {/* Lower Anchored Core */}
      <mesh position={[-0.6, h * 0.28, 0]} material={mats.concrete} castShadow receiveShadow>
        <boxGeometry args={[w * 0.76, h * 0.56, d * 0.82]} />
      </mesh>
      {/* Dramatic Cantilevered Upper Block */}
      <mesh position={[1.45, h * 0.72, 0]} material={mats.facadeCyan} castShadow receiveShadow>
        <boxGeometry args={[w * 1.05, h * 0.44, d * 0.88]} />
      </mesh>
      {/* Diagonal Structural Strut Braces supporting overhang */}
      {[-d * 0.28, d * 0.28].map((pz, idx) => (
        <mesh
          key={idx}
          position={[1.3, h * 0.44, pz]}
          rotation={[0, 0, -0.52]}
          material={mats.metallicSteel}
          castShadow
        >
          <boxGeometry args={[0.52, h * 0.26, 0.52]} />
        </mesh>
      ))}
      <mesh position={[1.45, h * 0.5, 0]} material={mats.emissiveCyan}>
        <boxGeometry args={[w * 1.06, 0.18, d * 0.9]} />
      </mesh>
      <mesh position={[2.2, h * 0.98, 0]} material={mats.chassisSteel} castShadow>
        <cylinderGeometry args={[0.14, 0.24, 4.2, 8]} />
      </mesh>
    </group>
  );
}

function ClaimObeliskGeometry({ spec, mats }: { spec: CityBuildingSpec; mats: CityMaterialLibrary }) {
  const { width: w, height: h } = spec;
  const isWarning = spec.status === 'warning';
  return (
    <group>
      <mesh position={[0, 1.5, 0]} material={mats.concreteDark} castShadow receiveShadow>
        <boxGeometry args={[w * 1.25, 3.0, w * 1.25]} />
      </mesh>
      <mesh position={[0, h * 0.5, 0]} material={mats.concrete} castShadow receiveShadow>
        <cylinderGeometry args={[w * 0.34, w * 0.54, h * 0.92, 6]} />
      </mesh>
      {/* Mechanical Collar Rings */}
      {[0.32, 0.58, 0.82].map((t, idx) => (
        <mesh key={idx} position={[0, h * t, 0]} material={mats.metallicSteel} castShadow>
          <cylinderGeometry args={[w * 0.54, w * 0.54, 0.95, 6]} />
        </mesh>
      ))}
      <mesh
        position={[0, h * 0.84, 0]}
        material={isWarning ? mats.emissiveGold : mats.emissiveCyan}
      >
        <cylinderGeometry args={[w * 0.46, w * 0.46, 0.25, 6]} />
      </mesh>
      <mesh position={[0, h + 2.4, 0]} material={mats.metallicSteel} castShadow>
        <cylinderGeometry args={[0.08, 0.22, 4.8, 8]} />
      </mesh>
    </group>
  );
}

/**
 * FRACTURED_MONOLITH — High-detail collapsing structure (Quality Gate #3).
 * Features sheared upper torso, GLSL arterial red fissures, exposed rebar trusses,
 * hovering displaced concrete fragments, and collapsed rubble heap.
 */
function FracturedMonolithGeometry({
  spec,
  mats,
  reducedMotion,
}: {
  spec: CityBuildingSpec;
  mats: CityMaterialLibrary;
  reducedMotion: boolean;
}) {
  const upperBlockRef = useRef<THREE.Group>(null);
  const floatGroupRef = useRef<THREE.Group>(null);
  const fractureMat = useMemo(() => createFractureFissureMaterial(), []);
  useEffect(() => {
    return () => fractureMat.dispose();
  }, [fractureMat]);
  const { width: w, depth: d, height: h } = spec;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    fractureMat.uniforms.uTime.value = reducedMotion ? 0 : t;
    if (reducedMotion) return;

    if (upperBlockRef.current) {
      upperBlockRef.current.position.y = h * 0.68 + Math.sin(t * 1.35) * 0.16;
      upperBlockRef.current.rotation.z = -0.22 + Math.sin(t * 0.9) * 0.015;
    }
    if (floatGroupRef.current) {
      floatGroupRef.current.children.forEach((child, idx) => {
        child.position.y += Math.sin(t * 1.4 + idx * 1.7) * 0.004;
        child.rotation.x += 0.003;
        child.rotation.y += 0.004;
      });
    }
  });

  const debrisSeeds = useMemo(
    () => [
      { pos: [-3.4, 1.1, 2.8] as [number, number, number], rot: [0.3, 0.6, 0.2] as [number, number, number], s: [1.9, 1.1, 1.4] as [number, number, number] },
      { pos: [3.2, 0.9, 2.2] as [number, number, number], rot: [-0.2, 0.4, -0.5] as [number, number, number], s: [1.6, 0.9, 1.5] as [number, number, number] },
      { pos: [2.8, 1.2, -3.1] as [number, number, number], rot: [0.4, -0.3, 0.4] as [number, number, number], s: [2.1, 1.2, 1.2] as [number, number, number] },
      { pos: [-2.4, 0.8, -2.9] as [number, number, number], rot: [-0.4, 0.8, 0.1] as [number, number, number], s: [1.4, 0.8, 1.3] as [number, number, number] },
    ],
    [],
  );

  const hoveringShards = useMemo(
    () => [
      { pos: [-3.8, h * 0.56, 1.9] as [number, number, number], s: [1.1, 0.85, 0.95] as [number, number, number] },
      { pos: [4.1, h * 0.64, -1.6] as [number, number, number], s: [1.3, 0.75, 1.1] as [number, number, number] },
      { pos: [1.8, h * 0.74, 3.6] as [number, number, number], s: [0.9, 1.2, 0.8] as [number, number, number] },
      { pos: [-2.7, h * 0.48, -3.2] as [number, number, number], s: [1.0, 0.9, 1.2] as [number, number, number] },
    ],
    [h],
  );

  return (
    <group>
      {/* Heavy Damaged Stepped Plinth & Courtyard Stairs (Image 3 & Control spill light) */}
      <mesh position={[0, 1.0, 0]} material={mats.concreteDark} castShadow receiveShadow>
        <boxGeometry args={[w * 1.48, 2.0, d * 1.48]} />
      </mesh>
      <mesh position={[0, 2.4, 0]} material={mats.concrete} castShadow receiveShadow>
        <boxGeometry args={[w * 1.24, 1.2, d * 1.24]} />
      </mesh>
      <mesh position={[0, 3.05, 0]} material={mats.emissiveRed}>
        <boxGeometry args={[w * 1.26, 0.12, d * 1.26]} />
      </mesh>
      {/* Stepped Concrete Courtyard Stairs reflecting Red Spill Light */}
      {[0, 1, 2].map((st) => (
        <mesh
          key={st}
          position={[0, 0.5 + st * 0.65, d * (0.85 - st * 0.08)]}
          material={mats.metallicSteel}
          receiveShadow
        >
          <boxGeometry args={[w * 0.68, 0.4, 0.8]} />
        </mesh>
      ))}

      {/* Lower Fractured Shaft with Arterial Red Fissures */}
      <mesh position={[0, h * 0.28, 0]} material={fractureMat} castShadow receiveShadow>
        <boxGeometry args={[w * 0.92, h * 0.48, d * 0.92]} />
      </mesh>

      {/* Glowing Exposed Fault Core inside the shear gap */}
      <mesh position={[0.3, h * 0.54, -0.2]} material={mats.emissiveRed}>
        <cylinderGeometry args={[1.4, 1.8, 2.6, 8]} />
      </mesh>

      {/* Twisted Exposed Steel Rebar & Structural I-Beams */}
      {[
        [-1.4, 0.2, -1.1, 0.14],
        [1.5, -0.18, 1.2, -0.22],
        [-0.8, 0.25, 1.6, 0.18],
        [1.2, -0.12, -1.5, -0.15],
        [0.1, 0.08, 0.2, 0.28],
      ].map(([bx, rz, bz, rx], idx) => (
        <mesh
          key={idx}
          position={[bx, h * 0.52, bz]}
          rotation={[rx, idx * 0.4, rz]}
          material={mats.metallicSteel}
          castShadow
        >
          <boxGeometry args={[0.36, 6.2, 0.36]} />
        </mesh>
      ))}

      {/* Sheared & Violently Tilted Upper Monolith Block */}
      <group
        ref={upperBlockRef}
        position={[1.35, h * 0.68, -0.65]}
        rotation={[0.14, 0.09, -0.22]}
      >
        <mesh material={mats.concrete} castShadow receiveShadow>
          <boxGeometry args={[w * 0.84, h * 0.38, d * 0.84]} />
        </mesh>
        {/* Sheared Structural Floor Ledges */}
        <mesh position={[0, h * 0.08, 0]} material={mats.chassisSteel}>
          <boxGeometry args={[w * 0.88, 0.45, d * 0.88]} />
        </mesh>
        {/* Jagged fracture underside glow plate */}
        <mesh position={[0, -h * 0.19, 0]} material={mats.emissiveRed}>
          <boxGeometry args={[w * 0.78, 0.35, d * 0.78]} />
        </mesh>
        {/* Exterior buckled structural fins */}
        <mesh position={[w * 0.44, 0, 0]} material={mats.metallicSteel} castShadow>
          <boxGeometry args={[0.45, h * 0.36, 0.8]} />
        </mesh>
        <mesh position={[-w * 0.44, 0, 0]} material={mats.metallicSteel} castShadow>
          <boxGeometry args={[0.45, h * 0.36, 0.8]} />
        </mesh>
        {/* Top tilted antenna */}
        <mesh position={[0.4, h * 0.26, 0]} material={mats.chassisSteel} castShadow>
          <cylinderGeometry args={[0.1, 0.24, 4.2, 8]} />
        </mesh>
      </group>

      {/* Suspended Kinetic Collapse Debris */}
      <group ref={floatGroupRef}>
        {hoveringShards.map((shard, idx) => (
          <mesh
            key={idx}
            position={shard.pos}
            rotation={[idx * 0.5, idx * 0.8, 0.4]}
            material={fractureMat}
            castShadow
          >
            <boxGeometry args={shard.s} />
          </mesh>
        ))}
      </group>

      {/* Fallen Rubble on Plinth Terrace */}
      {debrisSeeds.map((deb, idx) => (
        <mesh
          key={idx}
          position={deb.pos}
          rotation={deb.rot}
          material={mats.concreteDark}
          castShadow
          receiveShadow
        >
          <boxGeometry args={deb.s} />
        </mesh>
      ))}

      {/* Localized Critical Red Hazard Spill Lights (Image 3 & Control lighting) */}
      <pointLight position={[1.5, h * 0.56, 1.5]} color="#FF594F" intensity={58} distance={42} decay={1.7} />
      <pointLight position={[0, 4.8, d * 0.72]} color="#FF594F" intensity={34} distance={24} decay={1.8} />
    </group>
  );
}

function UnfinishedFoundationGeometry({
  spec,
  mats,
  reducedMotion,
}: {
  spec: CityBuildingSpec;
  mats: CityMaterialLibrary;
  reducedMotion: boolean;
}) {
  const strobeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FF594F',
        emissive: '#FF594F',
        emissiveIntensity: 2.3,
        roughness: 0.2,
        metalness: 0.1,
      }),
    [],
  );
  const { width: w, depth: d, height: h } = spec;

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const pulse = Math.sin(clock.getElapsedTime() * 4.5);
    strobeMat.emissiveIntensity = pulse > 0 ? 2.6 : 0.45;
  });

  const cols = [-w * 0.42, 0, w * 0.42];
  const rows = [-d * 0.42, 0, d * 0.42];

  return (
    <group>
      {/* Excavated Foundation Plinth Rim */}
      <mesh position={[0, 1.0, 0]} material={mats.concreteDark} castShadow receiveShadow>
        <boxGeometry args={[w * 1.15, 2.0, d * 1.15]} />
      </mesh>
      {/* Recessed Pit Deck with Narrow Red Hazard Perimeter Trim */}
      <mesh position={[0, 2.02, 0]} material={mats.chassisSteel}>
        <boxGeometry args={[w * 0.78, 0.08, d * 0.78]} />
      </mesh>
      <mesh position={[0, 2.08, d * 0.39]} material={mats.emissiveRed}>
        <boxGeometry args={[w * 0.78, 0.08, 0.12]} />
      </mesh>
      <mesh position={[0, 2.08, -d * 0.39]} material={mats.emissiveRed}>
        <boxGeometry args={[w * 0.78, 0.08, 0.12]} />
      </mesh>

      {/* Exposed Skeletal Steel Column Grid */}
      {cols.map((cx, i) =>
        rows.map((rz, j) => (
          <mesh key={`${i}-${j}`} position={[cx, h * 0.5, rz]} material={mats.metallicSteel} castShadow>
            <boxGeometry args={[0.38, h * 0.9, 0.38]} />
          </mesh>
        )),
      )}

      {/* Open Structural Floor Girders */}
      {[0.38, 0.72].map((tier, idx) => (
        <group key={idx} position={[0, h * tier, 0]}>
          <mesh position={[0, 0, d * 0.42]} material={mats.chassisSteel}>
            <boxGeometry args={[w * 0.88, 0.32, 0.32]} />
          </mesh>
          <mesh position={[0, 0, -d * 0.42]} material={mats.chassisSteel}>
            <boxGeometry args={[w * 0.88, 0.32, 0.32]} />
          </mesh>
          <mesh position={[w * 0.42, 0, 0]} material={mats.chassisSteel}>
            <boxGeometry args={[0.32, 0.32, d * 0.88]} />
          </mesh>
          <mesh position={[-w * 0.42, 0, 0]} material={mats.chassisSteel}>
            <boxGeometry args={[0.32, 0.32, d * 0.88]} />
          </mesh>
        </group>
      ))}

      {/* Construction Crane Jib & Warning Beacon */}
      <mesh position={[w * 0.35, h + 1.4, 0]} material={mats.metallicSteel} castShadow>
        <boxGeometry args={[0.34, 4.5, 0.34]} />
      </mesh>
      <mesh position={[0.4, h + 3.4, 0]} rotation={[0, 0, 0.08]} material={mats.metallicSteel} castShadow>
        <boxGeometry args={[w * 1.15, 0.35, 0.45]} />
      </mesh>
      <mesh position={[-w * 0.35, h + 3.8, 0]} material={strobeMat}>
        <sphereGeometry args={[0.35, 10, 10]} />
      </mesh>
    </group>
  );
}

function EvidenceVaultGeometry({ spec, mats }: { spec: CityBuildingSpec; mats: CityMaterialLibrary }) {
  const { width: w, depth: d, height: h } = spec;
  return (
    <group>
      <mesh position={[0, 1.2, 0]} material={mats.concreteDark} castShadow receiveShadow>
        <boxGeometry args={[w * 1.2, 2.4, d * 1.2]} />
      </mesh>
      {/* Heavy Sloped Archive Bunker */}
      <mesh position={[0, h * 0.45, 0]} material={mats.concrete} castShadow receiveShadow>
        <cylinderGeometry args={[w * 0.48, w * 0.62, h * 0.68, 4]} />
      </mesh>
      {/* Evidence Gold Louver Bands */}
      {[0.32, 0.54].map((t, idx) => (
        <mesh key={idx} position={[0, h * t, 0]} material={mats.emissiveGold}>
          <cylinderGeometry args={[w * 0.56, w * 0.58, 0.24, 4]} />
        </mesh>
      ))}
      {/* Rooftop Cooling Drums */}
      {[-1.5, 0, 1.5].map((ox, idx) => (
        <mesh key={idx} position={[ox, h * 0.86, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.metallicSteel} castShadow>
          <cylinderGeometry args={[0.72, 0.72, d * 0.52, 12]} />
        </mesh>
      ))}
    </group>
  );
}

function EvidenceReactorGeometry({ spec, mats }: { spec: CityBuildingSpec; mats: CityMaterialLibrary }) {
  const { width: w, height: h } = spec;
  return (
    <group>
      <mesh position={[0, 1.2, 0]} material={mats.concreteDark} castShadow receiveShadow>
        <cylinderGeometry args={[w * 0.66, w * 0.74, 2.4, 8]} />
      </mesh>
      <mesh position={[0, h * 0.48, 0]} material={mats.concrete} castShadow receiveShadow>
        <cylinderGeometry args={[w * 0.42, w * 0.48, h * 0.72, 8]} />
      </mesh>
      {/* 4 Perimeter Archive Silos */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((ang, idx) => (
        <mesh
          key={idx}
          position={[Math.cos(ang) * w * 0.45, h * 0.36, Math.sin(ang) * w * 0.45]}
          material={mats.metallicSteel}
          castShadow
        >
          <cylinderGeometry args={[0.92, 0.92, h * 0.56, 10]} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.72, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissiveGold}>
        <torusGeometry args={[w * 0.46, 0.16, 8, 24]} />
      </mesh>
    </group>
  );
}

function EvidenceTerraceGeometry({ spec, mats }: { spec: CityBuildingSpec; mats: CityMaterialLibrary }) {
  const { width: w, depth: d, height: h } = spec;
  return (
    <group>
      {[0, 1, 2, 3].map((tier) => {
        const scale = 1.15 - tier * 0.2;
        const th = h * 0.24;
        return (
          <group key={tier} position={[0, tier * th + th * 0.5, 0]}>
            <mesh material={tier % 2 === 0 ? mats.concreteDark : mats.concrete} castShadow receiveShadow>
              <boxGeometry args={[w * scale, th, d * scale]} />
            </mesh>
            {/* Subtle Perimeter Recessed Gold Trim rather than glowing solid plate */}
            <mesh position={[0, th * 0.46, d * scale * 0.502]} material={mats.emissiveGold}>
              <boxGeometry args={[w * scale * 0.86, 0.08, 0.06]} />
            </mesh>
            <mesh position={[0, th * 0.46, -d * scale * 0.502]} material={mats.emissiveGold}>
              <boxGeometry args={[w * scale * 0.86, 0.08, 0.06]} />
            </mesh>
          </group>
        );
      })}
      {/* Rooftop Sensor Housing */}
      <mesh position={[0, h + 0.5, 0]} material={mats.metallicSteel} castShadow>
        <boxGeometry args={[w * 0.28, 1.0, d * 0.28]} />
      </mesh>
    </group>
  );
}

function WarrantRelayGeometry({ spec, mats }: { spec: CityBuildingSpec; mats: CityMaterialLibrary }) {
  const { width: w, height: h } = spec;
  const isSevered = spec.status === 'collapsed';
  const accent = isSevered ? mats.emissiveRed : mats.emissiveCyan;

  return (
    <group rotation={isSevered ? [0.08, 0, -0.14] : [0, 0, 0]}>
      <mesh position={[0, 1.2, 0]} material={mats.concreteDark} castShadow receiveShadow>
        <cylinderGeometry args={[w * 0.62, w * 0.7, 2.4, 6]} />
      </mesh>
      <mesh position={[0, h * 0.48, 0]} material={mats.chassisSteel} castShadow>
        <cylinderGeometry args={[w * 0.28, w * 0.36, h * 0.74, 6]} />
      </mesh>
      {/* 3 Directional Transmitter Fins */}
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((ang, idx) => (
        <group key={idx} rotation={[0, ang, 0]}>
          <mesh position={[w * 0.38, h * 0.58, 0]} material={mats.metallicSteel} castShadow>
            <boxGeometry args={[0.9, h * 0.42, 0.35]} />
          </mesh>
        </group>
      ))}
      {/* Armored Relay Cap + Narrow Status Perimeter Collar */}
      <mesh position={[0, h * 0.89, 0]} material={mats.chassisSteel} castShadow>
        <cylinderGeometry args={[w * 0.3, w * 0.34, 0.52, 6]} />
      </mesh>
      <mesh position={[0, h * 0.86, 0]} rotation={[Math.PI / 2, 0, 0]} material={accent}>
        <torusGeometry args={[w * 0.33, 0.08, 6, 18]} />
      </mesh>
      <mesh position={[0, h + 1.8, 0]} material={mats.metallicSteel}>
        <cylinderGeometry args={[0.08, 0.16, 3.6, 6]} />
      </mesh>
    </group>
  );
}

function RebuttalBastionGeometry({ spec, mats }: { spec: CityBuildingSpec; mats: CityMaterialLibrary }) {
  const { width: w, depth: d, height: h } = spec;
  const isWarning = spec.status === 'warning';
  const accent = isWarning ? mats.emissiveGold : mats.emissiveCyan;

  return (
    <group>
      <mesh position={[0, 1.4, 0]} material={mats.concreteDark} castShadow receiveShadow>
        <boxGeometry args={[w * 1.25, 2.8, d * 1.25]} />
      </mesh>
      {/* Armored Shield Wall */}
      <mesh position={[0, h * 0.45, -d * 0.18]} rotation={[0.12, 0, 0]} material={mats.concrete} castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.78, d * 0.48]} />
      </mesh>
      {/* Twin Bastion Turrets */}
      {[-w * 0.34, w * 0.34].map((ox, idx) => (
        <mesh key={idx} position={[ox, h * 0.58, d * 0.18]} material={mats.metallicSteel} castShadow>
          <boxGeometry args={[1.4, h * 0.86, 1.6]} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.84, -d * 0.15]} material={accent}>
        <boxGeometry args={[w * 0.92, 0.25, 0.3]} />
      </mesh>
    </group>
  );
}

function UndergroundCaissonGeometry({ spec, mats }: { spec: CityBuildingSpec; mats: CityMaterialLibrary }) {
  const { width: w, height: h } = spec;
  return (
    <group>
      {/* Deep Subterranean Caisson Shaft descending -20m */}
      <mesh position={[0, -10.5, 0]} material={mats.concreteDark} receiveShadow>
        <cylinderGeometry args={[w * 0.46, w * 0.56, 21, 8]} />
      </mesh>
      <mesh position={[0, -6.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissiveGold}>
        <torusGeometry args={[w * 0.52, 0.14, 8, 24]} />
      </mesh>
      <mesh position={[0, -14.0, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissiveCyan}>
        <torusGeometry args={[w * 0.58, 0.14, 8, 24]} />
      </mesh>
      {/* Surface Armored Access Turret */}
      <mesh position={[0, h * 0.42, 0]} material={mats.concrete} castShadow receiveShadow>
        <cylinderGeometry args={[w * 0.36, w * 0.48, h * 0.82, 8]} />
      </mesh>
      {/* Dark Armored Top Cap with Narrow Gold Edge Collar */}
      <mesh position={[0, h * 0.85, 0]} material={mats.chassisSteel} castShadow>
        <cylinderGeometry args={[w * 0.34, w * 0.38, 0.45, 8]} />
      </mesh>
      <mesh position={[0, h * 0.83, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.emissiveGold}>
        <torusGeometry args={[w * 0.37, 0.08, 8, 24]} />
      </mesh>
      <mesh position={[0, h * 0.98, 0]} material={mats.metallicSteel} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 2.2, 8]} />
      </mesh>
    </group>
  );
}

function BuildingTransitionFX({
  transition,
  radius,
  height,
  reducedMotion,
  animRootRef,
  buildOrderIndex,
  constructionStartedAtMs,
  appPhase,
  isCritical,
  isWarning,
  disasterEvent,
}: {
  transition?: NodeTransitionEvent;
  radius: number;
  height: number;
  reducedMotion: boolean;
  animRootRef: RefObject<THREE.Group | null>;
  buildOrderIndex: number;
  constructionStartedAtMs: number;
  appPhase: 'prep' | 'upload' | 'verify' | 'built';
  isCritical: boolean;
  isWarning: boolean;
  disasterEvent: DisasterEventState | null;
}) {
  const beamRef = useRef<THREE.Mesh>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const shockRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const root = animRootRef.current;

    if (appPhase !== 'built') {
      if (root) {
        root.visible = false;
      }
      if (beamRef.current) beamRef.current.visible = false;
      if (ringARef.current) ringARef.current.visible = false;
      if (ringBRef.current) ringBRef.current.visible = false;
      if (shockRef.current) shockRef.current.visible = false;
      return;
    }

    if (root) {
      root.visible = true;
    }

    // 1. Staggered initial construction sequence after Score Reveal
    if (!reducedMotion && constructionStartedAtMs > 0) {
      const elapsedBuild = performance.now() - constructionStartedAtMs;
      const delayMs = buildOrderIndex * 260;
      const riseDurationMs = 820;
      const tailDurationMs = 450;

      if (elapsedBuild < delayMs) {
        if (root) {
          root.scale.set(1, 0.02, 1);
          root.position.set(0, 0, 0);
        }
        if (beamRef.current) beamRef.current.visible = false;
        if (ringARef.current) ringARef.current.visible = false;
        if (ringBRef.current) ringBRef.current.visible = false;
        if (shockRef.current) shockRef.current.visible = false;
        return;
      }

      if (elapsedBuild < delayMs + riseDurationMs + tailDurationMs) {
        const localMs = elapsedBuild - delayMs;
        const riseT = Math.min(1, localMs / riseDurationMs);
        const eased = 1 - Math.pow(1 - riseT, 3);
        const tailT = Math.min(1, localMs / (riseDurationMs + tailDurationMs));

        if (root) {
          root.scale.set(1, 0.02 + 0.98 * eased, 1);
          root.position.set(0, 0, 0);
          root.rotation.set(0, 0, 0);
        }
        if (beamRef.current) {
          beamRef.current.visible = tailT < 0.95;
          const mat = beamRef.current.material as THREE.MeshBasicMaterial;
          mat.color.set(isCritical ? '#FF594F' : '#64FFE2');
          mat.opacity = Math.max(0, (1 - tailT) * 0.28);
        }
        if (ringARef.current) {
          ringARef.current.visible = tailT < 0.95;
          ringARef.current.position.y = Math.max(0.6, eased * (height + 0.6));
          ringARef.current.rotation.z = clock.getElapsedTime() * 1.8;
          const mat = ringARef.current.material as THREE.MeshBasicMaterial;
          mat.color.set(isCritical ? '#FF594F' : '#64FFE2');
          mat.opacity = Math.max(0, (1 - tailT) * 0.9);
        }
        if (ringBRef.current) ringBRef.current.visible = false;
        if (shockRef.current) shockRef.current.visible = false;
        return;
      }
    }

    // 1.5. Disaster Stress Test (Earthquake / Typhoon / Shield)
    if (appPhase === 'built' && disasterEvent) {
      const dElapsed = performance.now() - disasterEvent.startedAtMs;
      if (dElapsed >= 0) {
        const dDur = 2900;
        const p = Math.min(1, dElapsed / dDur);
        const active = dElapsed < dDur;
        const t = clock.getElapsedTime();
        const isFlawed = isCritical || isWarning;
        const dirSign = buildOrderIndex % 2 === 0 ? 1 : -1;

        if (disasterEvent.kind === 'shield') {
          if (root) {
            root.scale.set(1, 1, 1);
            root.position.set(0, 0, 0);
            root.rotation.set(0, 0, 0);
          }
          if (ringARef.current) {
            ringARef.current.visible = active && !reducedMotion;
            ringARef.current.position.y = Math.max(1, p * (height + 1.2));
            ringARef.current.rotation.z = t * 2.2;
            const mat = ringARef.current.material as THREE.MeshBasicMaterial;
            mat.color.set('#48D7BA');
            mat.opacity = Math.max(0, (1 - p) * 0.92);
          }
          if (beamRef.current) beamRef.current.visible = false;
          if (ringBRef.current) ringBRef.current.visible = false;
          if (shockRef.current) shockRef.current.visible = false;
          return;
        }

        if (root) {
          if (disasterEvent.kind === 'earthquake') {
            if (isFlawed) {
              const decay = active && !reducedMotion ? 1 - p : 0;
              const shake = Math.sin(t * 54 + buildOrderIndex) * (isCritical ? 0.55 : 0.34) * decay;
              const slumpProgress = reducedMotion ? 1 : Math.min(1, p * 1.35);
              const targetScaleY = isCritical ? 0.68 : 0.85;
              const targetTiltZ = (isCritical ? 0.24 : 0.12) * dirSign;
              const targetTiltX = (isCritical ? 0.11 : 0.05) * -dirSign;
              root.position.set(shake, 0, -shake * 0.65);
              root.scale.set(1, 1 - (1 - targetScaleY) * slumpProgress, 1);
              root.rotation.set(
                targetTiltX * slumpProgress,
                0,
                targetTiltZ * slumpProgress + (active && !reducedMotion ? Math.sin(t * 36) * 0.06 * decay : 0),
              );
            } else {
              const decay = active && !reducedMotion ? 1 - p : 0;
              const microShake = Math.sin(t * 50 + buildOrderIndex) * 0.1 * decay;
              root.position.set(microShake, 0, 0);
              root.scale.set(1, 1, 1);
              root.rotation.set(0, 0, 0);
            }
          } else if (disasterEvent.kind === 'typhoon') {
            if (isFlawed) {
              const decay = active && !reducedMotion ? 1 - p : 0;
              const windProgress = reducedMotion ? 1 : Math.min(1, p * 1.25);
              const sway = active && !reducedMotion ? Math.sin(t * 18 + buildOrderIndex) * 0.16 * decay : 0;
              const targetTiltZ = isCritical ? 0.28 : 0.14;
              const targetScaleY = isCritical ? 0.76 : 0.9;
              root.position.set(windProgress * (isCritical ? 0.6 : 0.25), 0, 0);
              root.scale.set(1, 1 - (1 - targetScaleY) * windProgress, 1);
              root.rotation.set(0.05 * windProgress, 0, targetTiltZ * windProgress + sway);
            } else {
              const decay = active && !reducedMotion ? 1 - p : 0;
              const mildSway = active && !reducedMotion ? Math.sin(t * 14 + buildOrderIndex) * 0.025 * decay : 0;
              root.position.set(0, 0, 0);
              root.scale.set(1, 1, 1);
              root.rotation.set(0, 0, mildSway);
            }
          }
        }

        if (shockRef.current) {
          shockRef.current.visible = active && isFlawed && !reducedMotion;
          const expand = 1 + p * 2.5;
          shockRef.current.scale.set(expand, expand, 1);
          const mat = shockRef.current.material as THREE.MeshBasicMaterial;
          mat.color.set(disasterEvent.kind === 'earthquake' ? '#FF594F' : '#E3B86B');
          mat.opacity = Math.max(0, (1 - p) * 0.9);
        }
        if (beamRef.current) beamRef.current.visible = false;
        if (ringARef.current) ringARef.current.visible = false;
        if (ringBRef.current) ringBRef.current.visible = false;
        return;
      }
    }

    // 2. Post-build revision repair / collapse transitions
    if (!transition || reducedMotion) {
      if (root) {
        root.scale.set(1, 1, 1);
        root.position.set(0, 0, 0);
      }
      if (beamRef.current) beamRef.current.visible = false;
      if (ringARef.current) ringARef.current.visible = false;
      if (ringBRef.current) ringBRef.current.visible = false;
      if (shockRef.current) shockRef.current.visible = false;
      return;
    }

    const elapsedMs = performance.now() - transition.startedAtMs;
    const durationMs = 3400;
    if (elapsedMs < 0 || elapsedMs > durationMs) {
      if (root) {
        root.scale.set(1, 1, 1);
        root.position.set(0, 0, 0);
      }
      if (beamRef.current) beamRef.current.visible = false;
      if (ringARef.current) ringARef.current.visible = false;
      if (ringBRef.current) ringBRef.current.visible = false;
      if (shockRef.current) shockRef.current.visible = false;
      return;
    }

    const p = elapsedMs / durationMs;
    const isRepair = transition.kind === 'reconstructed' || transition.kind === 'refined';

    if (root) {
      if (isRepair) {
        const riseT = Math.min(1, p / 0.32);
        const eased = 1 - Math.pow(1 - riseT, 3);
        root.scale.set(1, 0.72 + 0.28 * eased, 1);
        root.position.set(0, 0, 0);
      } else {
        const shakeDecay = Math.max(0, 1 - p / 0.42);
        const osc = Math.sin(clock.getElapsedTime() * 48) * 0.28 * shakeDecay;
        root.scale.set(1, 1, 1);
        root.position.set(osc, 0, -osc * 0.6);
      }
    }

    if (isRepair) {
      if (shockRef.current) shockRef.current.visible = false;
      if (beamRef.current) {
        beamRef.current.visible = true;
        const mat = beamRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1 - p) * 0.34);
        beamRef.current.scale.set(1 + p * 0.14, 1, 1 + p * 0.14);
      }
      [ringARef.current, ringBRef.current].forEach((ring, idx) => {
        if (!ring) return;
        const localP = (p * 1.4 + idx * 0.35) % 1;
        ring.visible = p < 0.94;
        ring.position.y = Math.max(2, localP * (height + 1.5));
        ring.rotation.z = clock.getElapsedTime() * (idx === 0 ? 1.5 : -1.2);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1 - p) * 0.92);
      });
    } else {
      if (beamRef.current) beamRef.current.visible = false;
      if (ringARef.current) ringARef.current.visible = false;
      if (ringBRef.current) ringBRef.current.visible = false;
      if (shockRef.current) {
        shockRef.current.visible = p < 0.85;
        const expand = 1 + p * 2.2;
        shockRef.current.scale.set(expand, expand, 1);
        const mat = shockRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1 - p / 0.85) * 0.88);
      }
    }
  });

  return (
    <group>
      <mesh ref={beamRef} position={[0, height * 0.52, 0]} visible={false}>
        <cylinderGeometry args={[radius * 1.15, radius * 1.28, height + 6, 20, 1, true]} />
        <meshBasicMaterial
          color="#64FFE2"
          transparent
          opacity={0.34}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ringARef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[radius * 1.26, 0.24, 10, 40]} />
        <meshBasicMaterial
          color="#64FFE2"
          transparent
          opacity={0.92}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ringBRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[radius * 1.4, 0.18, 10, 6]} />
        <meshBasicMaterial
          color="#FFE08A"
          transparent
          opacity={0.85}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={shockRef} position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[radius * 0.8, radius * 1.12, 40]} />
        <meshBasicMaterial
          color="#FF594F"
          transparent
          opacity={0.88}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function HeroBuildingMesh({
  spec,
  buildOrderIndex = 0,
}: {
  spec: CityBuildingSpec;
  buildOrderIndex?: number;
}) {
  const mats = useMemo(() => getCityMaterials(), []);
  const animRootRef = useRef<THREE.Group>(null);
  const appPhase = useThesisStore((s) => s.appPhase);
  const constructionStartedAtMs = useThesisStore((s) => s.constructionStartedAtMs);
  const disasterEvent = useThesisStore((s) => s.disasterEvent);
  const selectedNodeId = useThesisStore((s) => s.selectedNodeId);
  const selectedEdgeId = useThesisStore((s) => s.selectedEdgeId);
  const blueprint = useThesisStore((s) => s.blueprint);
  const hoveredTarget = useThesisStore((s) => s.hoveredTarget);
  const roleFilter = useThesisStore((s) => s.roleFilter);
  const reducedMotion = useThesisStore((s) => s.reducedMotion);
  const transition = useThesisStore((s) => s.activeTransitions[spec.nodeId]);
  const focusBuilding = useThesisStore((s) => s.focusBuilding);
  const selectNode = useThesisStore((s) => s.selectNode);
  const setHoveredTarget = useThesisStore((s) => s.setHoveredTarget);

  const selectedEdge = selectedEdgeId
    ? blueprint.bridges.find((br) => br.edgeId === selectedEdgeId)
    : null;
  const isConnectedToSelectedEdge =
    selectedEdge?.sourceId === spec.nodeId || selectedEdge?.targetId === spec.nodeId;

  const isSelected = selectedNodeId === spec.nodeId || isConnectedToSelectedEdge;
  const isHovered = hoveredTarget?.kind === 'building' && hoveredTarget.id === spec.nodeId;
  const isCritical = spec.status === 'collapsed' || spec.status === 'unfinished';
  const isWarning = spec.status === 'warning';
  const filteredMatch =
    roleFilter !== 'all' &&
    (roleFilter === 'faults'
      ? isCritical || spec.status === 'warning'
      : roleFilter === 'healthy'
        ? spec.status === 'healthy'
        : spec.role === roleFilter);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    if (appPhase === 'verify') {
      selectNode(spec.nodeId);
    } else {
      focusBuilding(spec.nodeId);
    }
  };

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredTarget({ kind: 'building', id: spec.nodeId });
    document.body.style.cursor = 'pointer';
  };

  const handleOut = () => {
    setHoveredTarget(null);
    document.body.style.cursor = 'auto';
  };

  const renderArchetype = () => {
    switch (spec.archetype) {
      case 'CENTRAL_SPIRE':
        return <CentralSpireGeometry spec={spec} mats={mats} reducedMotion={reducedMotion} />;
      case 'CLAIM_CITADEL':
        return <ClaimCitadelGeometry spec={spec} mats={mats} />;
      case 'CLAIM_TWIN_PYLON':
        return <ClaimTwinPylonGeometry spec={spec} mats={mats} />;
      case 'CLAIM_CANTILEVER':
        return <ClaimCantileverGeometry spec={spec} mats={mats} />;
      case 'CLAIM_OBELISK':
        return <ClaimObeliskGeometry spec={spec} mats={mats} />;
      case 'FRACTURED_MONOLITH':
        return <FracturedMonolithGeometry spec={spec} mats={mats} reducedMotion={reducedMotion} />;
      case 'UNFINISHED_FOUNDATION':
        return <UnfinishedFoundationGeometry spec={spec} mats={mats} reducedMotion={reducedMotion} />;
      case 'EVIDENCE_VAULT':
        return <EvidenceVaultGeometry spec={spec} mats={mats} />;
      case 'EVIDENCE_REACTOR':
        return <EvidenceReactorGeometry spec={spec} mats={mats} />;
      case 'EVIDENCE_TERRACE':
        return <EvidenceTerraceGeometry spec={spec} mats={mats} />;
      case 'WARRANT_RELAY':
        return <WarrantRelayGeometry spec={spec} mats={mats} />;
      case 'REBUTTAL_BASTION':
        return <RebuttalBastionGeometry spec={spec} mats={mats} />;
      case 'UNDERGROUND_CAISSON':
        return <UndergroundCaissonGeometry spec={spec} mats={mats} />;
      default:
        return <ClaimCitadelGeometry spec={spec} mats={mats} />;
    }
  };

  return (
    <group
      name={`building-${spec.nodeId}`}
      position={spec.position}
      rotation={[0, spec.rotationY, 0]}
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      <SubDeckFoundation width={spec.width} depth={spec.depth} mats={mats} />
      {appPhase === 'verify' && (
        <mesh position={[0, 0.34, 0]} material={isCritical ? mats.emissiveRed : isWarning ? mats.emissiveGold : mats.emissiveCyan}>
          <boxGeometry args={[spec.width * 0.92, 0.08, spec.depth * 0.92]} />
        </mesh>
      )}
      <group ref={animRootRef}>{renderArchetype()}</group>
      <BuildingTransitionFX
        transition={transition}
        radius={Math.max(spec.width, spec.depth) * 0.85}
        height={spec.height}
        reducedMotion={reducedMotion}
        animRootRef={animRootRef}
        buildOrderIndex={buildOrderIndex}
        constructionStartedAtMs={constructionStartedAtMs}
        appPhase={appPhase}
        isCritical={isCritical}
        isWarning={isWarning}
        disasterEvent={disasterEvent}
      />
      <SelectionHalo
        radius={Math.max(spec.width, spec.depth) * 0.9}
        selected={isSelected}
        hovered={isHovered}
        filteredMatch={filteredMatch}
        isCritical={isCritical}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

export function ObservationDeckMesh({ deck }: { deck: CityObservationDeckSpec }) {
  const mats = useMemo(() => getCityMaterials(), []);
  return (
    <group position={deck.position} rotation={[0, deck.rotationY, 0]}>
      {/* Main Cantilevered Deck */}
      <mesh material={mats.chassisSteel} castShadow receiveShadow>
        <boxGeometry args={[deck.width, 0.55, deck.depth]} />
      </mesh>
      {/* Safety Perimeter Balustrade & Cyan Strip */}
      <mesh position={[0, 0.36, deck.depth * 0.48]} material={mats.emissiveCyan}>
        <boxGeometry args={[deck.width, 0.1, 0.1]} />
      </mesh>
      <mesh position={[0, 0.36, -deck.depth * 0.48]} material={mats.metallicSteel}>
        <boxGeometry args={[deck.width, 0.45, 0.1]} />
      </mesh>
      {/* Diagonal Structural Support Columns descending to plaza */}
      {[-deck.width * 0.35, deck.width * 0.35].map((ox, idx) => (
        <mesh
          key={idx}
          position={[ox, -deck.position[1] * 0.5, -deck.depth * 0.3]}
          material={mats.metallicSteel}
          castShadow
        >
          <boxGeometry args={[0.42, deck.position[1], 0.42]} />
        </mesh>
      ))}
    </group>
  );
}
