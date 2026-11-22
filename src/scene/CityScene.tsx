import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useThesisStore } from '../store/useThesisStore';
import { HeroBuildingMesh } from './buildings/HeroBuildings';
import { BridgesAndConduits } from './BridgesAndConduits';
import { UrbanFabric } from './UrbanFabric';
import { AtmosphereEffects } from './AtmosphereEffects';
import { CameraRig } from './CameraRig';

function TelemetrySampler() {
  const { gl } = useThree();
  const updateTelemetry = useThesisStore((s) => s.updateTelemetry);
  const markSceneReady = useThesisStore((s) => s.markSceneReady);
  const frameCountRef = useRef(0);
  const lastSampleRef = useRef(performance.now());
  const bootTimeRef = useRef(performance.now());
  const readyMarkedRef = useRef(false);

  useEffect(() => {
    gl.info.autoReset = false;
    updateTelemetry({ initializedAtMs: Math.round(performance.now() - bootTimeRef.current) });
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl, updateTelemetry]);

  useFrame(() => {
    if (!readyMarkedRef.current) {
      readyMarkedRef.current = true;
      markSceneReady();
    }
    const calls = gl.info.render.calls;
    const triangles = gl.info.render.triangles;
    gl.info.reset();

    frameCountRef.current += 1;
    const now = performance.now();
    const elapsed = now - lastSampleRef.current;
    if (elapsed >= 500) {
      const fps = Math.round((frameCountRef.current * 1000) / elapsed);
      const frameTimeMs = Number((elapsed / frameCountRef.current).toFixed(1));
      updateTelemetry({
        fps,
        frameTimeMs,
        drawCalls: calls,
        triangles,
      });
      frameCountRef.current = 0;
      lastSampleRef.current = now;
    }
  });

  return null;
}

function ProceduralIBL() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Zenith cool moonlight strip */}
      <Lightformer
        form="rect"
        intensity={1.6}
        color="#a7c4e8"
        position={[0, 28, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[40, 40, 1]}
      />
      {/* Left cyan architectural rim panel */}
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#48D7BA"
        position={[-26, 8, -18]}
        rotation={[0, Math.PI / 3, 0]}
        scale={[24, 14, 1]}
      />
      {/* Right cool slate fill */}
      <Lightformer
        form="rect"
        intensity={1.2}
        color="#6a85a3"
        position={[28, 10, 16]}
        rotation={[0, -Math.PI / 3, 0]}
        scale={[24, 14, 1]}
      />
      {/* Subterranean warm evidence bounce */}
      <Lightformer
        form="ring"
        intensity={0.9}
        color="#E3B86B"
        position={[0, -14, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={28}
      />
    </Environment>
  );
}

function SceneWorld() {
  const blueprint = useThesisStore((s) => s.blueprint);
  const appPhase = useThesisStore((s) => s.appPhase);
  const qualityTier = useThesisStore((s) => s.qualityTier);
  const reducedMotion = useThesisStore((s) => s.reducedMotion);

  const shadowMapSize = qualityTier === 'high' ? 2048 : 1024;

  return (
    <>
      <color attach="background" args={['#142130']} />
      <fogExp2 attach="fog" args={['#1d2f42', 0.005]} />

      <ProceduralIBL />

      <hemisphereLight args={['#8fb7db', '#0b131d', 0.62]} />

      <directionalLight
        position={[32, 78, 24]}
        intensity={2.95}
        color="#e6f2ff"
        castShadow={qualityTier !== 'low'}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-near={10}
        shadow-camera-far={175}
        shadow-camera-left={-52}
        shadow-camera-right={52}
        shadow-camera-top={52}
        shadow-camera-bottom={-52}
        shadow-bias={-0.0004}
      />

      <directionalLight position={[-48, 32, -48]} intensity={1.55} color="#48D7BA" />
      <directionalLight position={[14, -14, 22]} intensity={0.62} color="#E3B86B" />

      {/* Thesis Architecture (Hidden on empty 'prep'/'upload' plot, foundations on 'verify', rises in 'built') */}
      {appPhase !== 'prep' && appPhase !== 'upload' && (
        <group key={`hero-${blueprint.thesisId}`} name="thesis-city-hero">
          {blueprint.buildings.map((building, index) => (
            <HeroBuildingMesh key={building.nodeId} spec={building} buildOrderIndex={index} />
          ))}
        </group>
      )}

      {/* Logical Connection Bridges shown after building construction starts */}
      {appPhase === 'built' && (
        <BridgesAndConduits key={`bridges-${blueprint.thesisId}`} bridges={blueprint.bridges} />
      )}

      {/* Compact Diorama Plinth Stage */}
      <UrbanFabric />

      {/* Clean Twilight Backdrop */}
      <AtmosphereEffects
        buildings={blueprint.buildings}
        criticalCenter={blueprint.criticalZoneCenter}
        qualityTier={qualityTier}
        reducedMotion={reducedMotion}
        showEmbers={appPhase === 'built'}
      />

      <CameraRig />
      <TelemetrySampler />

      {qualityTier !== 'low' && (
        <EffectComposer multisampling={0}>
          <Bloom
            mipmapBlur
            luminanceThreshold={0.78}
            luminanceSmoothing={0.28}
            intensity={qualityTier === 'high' ? 0.56 : 0.38}
            radius={0.52}
          />
          <Vignette eskil={false} offset={0.22} darkness={0.42} />
        </EffectComposer>
      )}
    </>
  );
}

export function CityScene() {
  const qualityTier = useThesisStore((s) => s.qualityTier);
  const dpr: [number, number] = qualityTier === 'high' ? [1, 2] : [1, 1.35];

  return (
    <div
      className="city-canvas-wrapper"
      role="region"
      aria-label="論文の立体構造マップ"
    >
      <Canvas
        shadows
        dpr={dpr}
        camera={{ fov: 48, near: 0.5, far: 480, position: [26, 32, 70] }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
      >
        <Suspense fallback={null}>
          <SceneWorld />
        </Suspense>
      </Canvas>
    </div>
  );
}
