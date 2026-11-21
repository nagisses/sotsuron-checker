import { useEffect, useMemo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CityBridgeSpec } from '../types/thesis';
import { getCityMaterials } from './materials';
import { createChevronBridgeMaterial, createConduitFlowMaterial } from './shaders/cityShaders';
import { useThesisStore } from '../store/useThesisStore';

function BridgeSpan({ bridge, reducedMotion }: { bridge: CityBridgeSpec; reducedMotion: boolean }) {
  const mats = useMemo(() => getCityMaterials(), []);
  const selectedNodeId = useThesisStore((s) => s.selectedNodeId);
  const selectedEdgeId = useThesisStore((s) => s.selectedEdgeId);
  const hoveredTarget = useThesisStore((s) => s.hoveredTarget);
  const focusEdge = useThesisStore((s) => s.focusEdge);
  const setHoveredTarget = useThesisStore((s) => s.setHoveredTarget);

  const isSelected = selectedEdgeId === bridge.edgeId;
  const isHovered = hoveredTarget?.kind === 'edge' && hoveredTarget.id === bridge.edgeId;
  const isConnectedToNode =
    selectedNodeId === bridge.sourceId || selectedNodeId === bridge.targetId;
  const isHighlighted = isSelected || isHovered || isConnectedToNode;

  const isSevered = bridge.status === 'severed';
  const isUnstable = bridge.status === 'unstable';
  const isEvidenceLink =
    bridge.relationshipType === 'backs' || bridge.relationshipType === 'supports';

  const conduitColor = isSevered || isUnstable ? '#FF594F' : isEvidenceLink ? '#48D7BA' : '#E3B86B';

  const chevronMat = useMemo(
    () =>
      createChevronBridgeMaterial({
        color: conduitColor,
        speed: isSevered ? 1.85 : isHighlighted ? 1.35 : 0.75,
        unstable: isSevered || isUnstable,
      }),
    [conduitColor, isHighlighted, isSevered, isUnstable],
  );

  useEffect(() => {
    return () => chevronMat.dispose();
  }, [chevronMat]);

  useFrame(({ clock }) => {
    chevronMat.uniforms.uTime.value = reducedMotion ? 0 : clock.getElapsedTime();
  });

  const { mid, length, yaw, pitch } = useMemo(() => {
    const startVec = new THREE.Vector3(...bridge.start);
    const endVec = new THREE.Vector3(...bridge.end);
    const delta = new THREE.Vector3().subVectors(endVec, startVec);
    const dist = delta.length();
    const center = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    const horizDist = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
    const yYaw = Math.atan2(delta.x, delta.z);
    const xPitch = -Math.atan2(delta.y, Math.max(0.001, horizDist));
    return { mid: center, length: dist, yaw: yYaw, pitch: xPitch };
  }, [bridge.start, bridge.end]);

  const effectiveLen = Math.max(2, length - 5.2);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    focusEdge(bridge.edgeId);
  };

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredTarget({ kind: 'edge', id: bridge.edgeId });
    document.body.style.cursor = 'pointer';
  };

  const handleOut = () => {
    setHoveredTarget(null);
    document.body.style.cursor = 'auto';
  };

  const railMat = isHighlighted
    ? isSevered || isUnstable
      ? mats.emissiveRed
      : mats.emissiveCyan
    : mats.metallicSteel;

  if (isSevered) {
    const halfLen = effectiveLen * 0.36;
    const offset = effectiveLen * 0.28;
    return (
      <group
        position={mid}
        rotation={[0, yaw, 0]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <group rotation={[pitch, 0, 0]}>
          <group position={[0, -0.45, -offset]} rotation={[0.16, 0, 0]}>
            <mesh material={mats.chassisSteel} castShadow>
              <boxGeometry args={[1.35, 0.45, halfLen]} />
            </mesh>
            <mesh position={[0, 0.28, halfLen * 0.48]} material={mats.emissiveRed}>
              <boxGeometry args={[1.15, 0.24, 0.55]} />
            </mesh>
            <group position={[0, 0.28, 0]} rotation={[0, Math.PI / 2, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} material={chevronMat}>
                <planeGeometry args={[halfLen * 0.92, 0.95]} />
              </mesh>
            </group>
          </group>

          <group position={[0, -0.55, offset]} rotation={[-0.2, 0, 0]}>
            <mesh material={mats.chassisSteel} castShadow>
              <boxGeometry args={[1.35, 0.45, halfLen]} />
            </mesh>
            <mesh position={[0, 0.28, -halfLen * 0.48]} material={mats.emissiveRed}>
              <boxGeometry args={[1.15, 0.24, 0.55]} />
            </mesh>
            <group position={[0, 0.28, 0]} rotation={[0, Math.PI / 2, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} material={chevronMat}>
                <planeGeometry args={[halfLen * 0.92, 0.95]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    );
  }

  return (
    <group
      position={mid}
      rotation={[0, yaw, 0]}
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      <group rotation={[pitch, 0, 0]}>
        <mesh material={mats.chassisSteel} castShadow receiveShadow>
          <boxGeometry args={[1.45, 0.4, effectiveLen]} />
        </mesh>
        <mesh position={[0, -0.42, 0]} material={mats.metallicSteel}>
          <boxGeometry args={[0.45, 0.48, effectiveLen * 0.94]} />
        </mesh>
        <mesh position={[-0.68, 0.36, 0]} material={railMat}>
          <boxGeometry args={[isHighlighted ? 0.12 : 0.08, 0.34, effectiveLen]} />
        </mesh>
        <mesh position={[0.68, 0.36, 0]} material={railMat}>
          <boxGeometry args={[isHighlighted ? 0.12 : 0.08, 0.34, effectiveLen]} />
        </mesh>
        <group position={[0, 0.25, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={chevronMat}>
            <planeGeometry args={[effectiveLen * 0.96, isHighlighted ? 1.15 : 0.95]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function BridgesAndConduits({ bridges }: { bridges: CityBridgeSpec[] }) {
  const reducedMotion = useThesisStore((s) => s.reducedMotion);
  const subConduitMat = useMemo(
    () => createConduitFlowMaterial({ color: '#48D7BA', speed: 0.48, unstable: false }),
    [],
  );
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    subConduitMat.uniforms.uTime.value = reducedMotion ? 0 : clock.getElapsedTime();
  });

  const radialAngles = [0, Math.PI * 0.33, Math.PI * 0.66, Math.PI, Math.PI * 1.33, Math.PI * 1.66];

  return (
    <group ref={groupRef}>
      {bridges.map((bridge) => (
        <BridgeSpan key={bridge.edgeId} bridge={bridge} reducedMotion={reducedMotion} />
      ))}

      {radialAngles.map((ang, idx) => (
        <group key={idx} rotation={[0, ang, 0]}>
          <mesh position={[22, -2.6, 0]} rotation={[-Math.PI / 2, 0, 0]} material={subConduitMat}>
            <planeGeometry args={[36, 0.65]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
