import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { CameraMode, useThesisStore } from '../store/useThesisStore';

interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

interface ActiveTransition {
  startTimeMs: number;
  durationMs: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const cameraMode = useThesisStore((s) => s.cameraMode);
  const appPhase = useThesisStore((s) => s.appPhase);
  const disasterEvent = useThesisStore((s) => s.disasterEvent);
  const cameraRequestNonce = useThesisStore((s) => s.cameraRequestNonce);
  const selectedNodeId = useThesisStore((s) => s.selectedNodeId);
  const selectedEdgeId = useThesisStore((s) => s.selectedEdgeId);
  const reducedMotion = useThesisStore((s) => s.reducedMotion);
  const blueprint = useThesisStore((s) => s.blueprint);
  const transitionRef = useRef<ActiveTransition | null>(null);
  const hasPlayedGenesisRef = useRef(false);
  const prevShakeRef = useRef(new THREE.Vector3());

  const staticPoses = useMemo<Record<'overview' | 'central_tower' | 'destruction_cinematic', CameraPose>>(() => {
    const cx = blueprint.criticalZoneCenter[0];
    const cz = blueprint.criticalZoneCenter[2];
    const radial = new THREE.Vector3(cx, 0, cz);
    if (radial.lengthSq() < 0.01) radial.set(1, 0, -1);
    radial.normalize();
    const tangent = new THREE.Vector3(-radial.z, 0, radial.x);

    const collapseCamPos = new THREE.Vector3(cx, 0, cz)
      .addScaledVector(radial, 24.5)
      .addScaledVector(tangent, -10.0);
    collapseCamPos.y = 21.5;

    return {
      overview:
        appPhase === 'built'
          ? {
              position: [32, 44, 88],
              target: [0, 2.5, 0],
            }
          : {
              position: [26, 32, 70],
              target: [0, 14.5, -2],
            },
      central_tower: {
        position: [15, 21, 44],
        target: [0, 18.5, 0],
      },
      destruction_cinematic: {
        position: [collapseCamPos.x, collapseCamPos.y, collapseCamPos.z],
        target: [cx, 12.5, cz],
      },
    };
  }, [blueprint.criticalZoneCenter, appPhase]);

  const computeInspectionPose = useCallback(
    (mode: CameraMode): CameraPose => {
      if (mode === 'overview') return staticPoses.overview;
      if (mode === 'destruction_cinematic') return staticPoses.destruction_cinematic;

      // Edge / Bridge Inspection Pose
      if (selectedEdgeId) {
        const bridge = blueprint.bridges.find((b) => b.edgeId === selectedEdgeId);
        if (bridge) {
          const s = new THREE.Vector3(...bridge.start);
          const e = new THREE.Vector3(...bridge.end);
          const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
          const dir = new THREE.Vector3().subVectors(e, s);
          dir.y = 0;
          if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
          dir.normalize();
          const perp = new THREE.Vector3(-dir.z, 0, dir.x);
          const radial = new THREE.Vector3(mid.x, 0, mid.z);
          if (radial.lengthSq() < 0.01) radial.set(0, 0, 1);
          radial.normalize();

          // Evaluate candidate camera poses so neither Hero towers (e.g. CLM-01)
          // nor the r >= 52m outer skyscraper ring can sit near or occlude the lens.
          const candidateOffsets: [THREE.Vector3, number][] = [
            [perp.clone().multiplyScalar(15), Math.max(25, mid.y + 13)],
            [perp.clone().multiplyScalar(-15), Math.max(25, mid.y + 13)],
            [radial.clone().multiplyScalar(15), Math.max(25, mid.y + 13)],
            [perp.clone().multiplyScalar(14).addScaledVector(radial, 8), Math.max(26, mid.y + 14)],
            [perp.clone().multiplyScalar(-14).addScaledVector(radial, 8), Math.max(26, mid.y + 14)],
            [perp.clone().multiplyScalar(14).addScaledVector(dir, 9), Math.max(26, mid.y + 14)],
            [perp.clone().multiplyScalar(-14).addScaledVector(dir, -9), Math.max(26, mid.y + 14)],
            [perp.clone().multiplyScalar(15), Math.max(34, mid.y + 20)],
            [perp.clone().multiplyScalar(-15), Math.max(34, mid.y + 20)],
            [radial.clone().multiplyScalar(14), Math.max(36, mid.y + 22)],
          ];

          const scoreCandidate = (pos: THREE.Vector3): number => {
            let penalty = 0;
            const radiusXZ = Math.hypot(pos.x, pos.z);
            if (radiusXZ > 45) {
              penalty += (radiusXZ - 45) * 80 + 500;
            }
            for (const b of blueprint.buildings) {
              const bx = b.position[0];
              const bz = b.position[2];
              const bFootprint = Math.max(b.width, b.depth) * 0.85 + 5.0;
              const camDist = Math.hypot(pos.x - bx, pos.z - bz);
              if (camDist < bFootprint && pos.y < b.height + 6.0) {
                penalty += 2000 + (bFootprint - camDist) * 120;
              }
              // Sample along sightline from camera to bridge midpoint
              for (const t of [0.2, 0.4, 0.6, 0.8]) {
                const sx = THREE.MathUtils.lerp(pos.x, mid.x, t);
                const sy = THREE.MathUtils.lerp(pos.y, mid.y, t);
                const sz = THREE.MathUtils.lerp(pos.z, mid.z, t);
                const rayDist = Math.hypot(sx - bx, sz - bz);
                const solidRadius = Math.max(b.width, b.depth) * 0.65 + 2.5;
                if (rayDist < solidRadius && sy < b.height + 2.5) {
                  penalty += 1500;
                }
              }
            }
            // Prefer balanced dramatic framing (~20-28m view distance, moderate height)
            penalty += Math.abs(pos.distanceTo(mid) - 21) * 1.5;
            penalty += (pos.y - mid.y) * 0.8;
            return penalty;
          };

          let bestPos = mid.clone().addScaledVector(radial, 14);
          bestPos.y = Math.max(36, mid.y + 22);
          let bestScore = Infinity;

          for (const [offset, heightY] of candidateOffsets) {
            const candidate = mid.clone().add(offset);
            candidate.y = heightY;
            const score = scoreCandidate(candidate);
            if (score < bestScore) {
              bestScore = score;
              bestPos = candidate;
            }
          }

          return {
            position: [bestPos.x, bestPos.y, bestPos.z],
            target: [mid.x, mid.y, mid.z],
          };
        }
      }

      // Building Inspection Pose for Compact Courtyard Structures
      const building = blueprint.buildings.find((b) => b.nodeId === selectedNodeId);
      if (!building || building.node.isCentral || building.nodeId === 'CLM-00') {
        return staticPoses.central_tower;
      }

      const [bx, , bz] = building.position;
      const r = Math.hypot(bx, bz);
      const radial = new THREE.Vector3(bx, 0, bz).normalize();
      const tangent = new THREE.Vector3(-radial.z, 0, radial.x);

      const camPos = new THREE.Vector3(bx, 0, bz);
      if (r < 26) {
        camPos.addScaledVector(radial, 13 + building.height * 0.25).addScaledVector(tangent, 8.0);
      } else {
        camPos.addScaledVector(radial, -13).addScaledVector(tangent, 11.0);
      }
      camPos.y = Math.max(12.0, building.height * 0.72 + 4.5);

      return {
        position: [camPos.x, camPos.y, camPos.z],
        target: [bx, Math.max(5.5, building.height * 0.48), bz],
      };
    },
    [blueprint.bridges, blueprint.buildings, selectedEdgeId, selectedNodeId, staticPoses],
  );

  // Initial Hero Genesis Sweep (0 -> 1.8s wall-clock)
  useEffect(() => {
    if (hasPlayedGenesisRef.current) return;
    hasPlayedGenesisRef.current = true;
    const controls = controlsRef.current;
    if (!controls) return;

    if (reducedMotion) {
      camera.position.set(...staticPoses.overview.position);
      controls.target.set(...staticPoses.overview.target);
      controls.update();
      return;
    }

    camera.position.set(48, 44, 88);
    controls.target.set(0, 10, 0);
    controls.update();

    transitionRef.current = {
      startTimeMs: performance.now(),
      durationMs: 1600,
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...staticPoses.overview.position),
      fromTarget: controls.target.clone(),
      toTarget: new THREE.Vector3(...staticPoses.overview.target),
    };
  }, [camera, reducedMotion, staticPoses.overview]);

  // Explicit Camera Preset / Focus Transitions
  useEffect(() => {
    if (cameraRequestNonce === 0) return;
    if (cameraMode === 'orbit') {
      transitionRef.current = null;
      return;
    }
    const controls = controlsRef.current;
    if (!controls) return;

    const targetPose = computeInspectionPose(cameraMode);
    if (reducedMotion) {
      transitionRef.current = null;
      camera.position.set(...targetPose.position);
      controls.target.set(...targetPose.target);
      controls.update();
      return;
    }

    transitionRef.current = {
      startTimeMs: performance.now(),
      durationMs: 1050,
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...targetPose.position),
      fromTarget: controls.target.clone(),
      toTarget: new THREE.Vector3(...targetPose.target),
    };
  }, [camera, cameraMode, cameraRequestNonce, computeInspectionPose, reducedMotion]);

  useFrame(({ clock }) => {
    const tr = transitionRef.current;
    const controls = controlsRef.current;

    // Remove previous frame's disaster shake before applying transitions or new shake
    if (prevShakeRef.current.lengthSq() > 0) {
      camera.position.sub(prevShakeRef.current);
      prevShakeRef.current.set(0, 0, 0);
    }

    if (tr && controls) {
      const rawT = (performance.now() - tr.startTimeMs) / tr.durationMs;
      const t = Math.min(1, Math.max(0, rawT));
      const eased = easeInOutCubic(t);

      camera.position.lerpVectors(tr.fromPos, tr.toPos, eased);
      controls.target.lerpVectors(tr.fromTarget, tr.toTarget, eased);
      controls.update();

      if (t >= 1) {
        transitionRef.current = null;
      }
    }

    // Procedural Earthquake / Typhoon Camera Shake
    if (!reducedMotion && disasterEvent && disasterEvent.kind !== 'shield') {
      const elapsed = performance.now() - disasterEvent.startedAtMs;
      const shakeDur = disasterEvent.kind === 'earthquake' ? 2400 : 2800;
      if (elapsed >= 0 && elapsed < shakeDur) {
        const decay = 1 - elapsed / shakeDur;
        const t = clock.getElapsedTime();
        if (disasterEvent.kind === 'earthquake') {
          const amp = 0.72 * decay * decay;
          prevShakeRef.current.set(
            Math.sin(t * 58) * amp,
            Math.cos(t * 47) * amp * 0.65,
            Math.sin(t * 63 + 1.1) * amp * 0.5,
          );
        } else {
          // Typhoon lateral wind buffeting
          const amp = 0.42 * decay;
          prevShakeRef.current.set(
            Math.sin(t * 21) * amp + Math.sin(t * 39) * amp * 0.35,
            Math.cos(t * 17) * amp * 0.25,
            Math.sin(t * 15) * amp * 0.3,
          );
        }
        camera.position.add(prevShakeRef.current);
      }
    }
  });

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onStart = () => {
      transitionRef.current = null;
    };
    controls.addEventListener('start', onStart);
    return () => {
      controls.removeEventListener('start', onStart);
      transitionRef.current = null;
    };
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      screenSpacePanning
      rotateSpeed={0.68}
      zoomSpeed={0.9}
      panSpeed={0.75}
      minDistance={10}
      maxDistance={140}
      minPolarAngle={0.22}
      maxPolarAngle={Math.PI * 0.49}
    />
  );
}
