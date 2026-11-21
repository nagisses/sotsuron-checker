import { Suspense, lazy, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { RightPanel } from './components/RightPanel';
import { BottomTimeline } from './components/BottomTimeline';
import { ReviseNodeGeminiResult } from './engine/argumentValidator';
import { CameraMode, RoleFilter, useThesisStore } from './store/useThesisStore';
import { ThesisGraph } from './types/thesis';
import { getDisplayTitle } from './utils/labels';

const CityScene = lazy(() => import('./scene/CityScene').then((m) => ({ default: m.CityScene })));
const AccessibleGraphView = lazy(() =>
  import('./components/AccessibleGraphView').then((m) => ({ default: m.AccessibleGraphView })),
);

export default function App() {
  const focusBuilding = useThesisStore((s) => s.focusBuilding);
  const focusEdge = useThesisStore((s) => s.focusEdge);
  const setInspectorOpen = useThesisStore((s) => s.setInspectorOpen);
  const setAccessibleViewOpen = useThesisStore((s) => s.setAccessibleViewOpen);
  const setReducedMotion = useThesisStore((s) => s.setReducedMotion);
  const loadThesisGraph = useThesisStore((s) => s.loadThesisGraph);
  const resetToSampleThesis = useThesisStore((s) => s.resetToSampleThesis);
  const resetToUpload = useThesisStore((s) => s.resetToUpload);
  const toggleNodeConfirmed = useThesisStore((s) => s.toggleNodeConfirmed);
  const toggleChecklistCheck = useThesisStore((s) => s.toggleChecklistCheck);
  const finalizeAndBuildCity = useThesisStore((s) => s.finalizeAndBuildCity);
  const replayConstruction = useThesisStore((s) => s.replayConstruction);
  const returnToVerify = useThesisStore((s) => s.returnToVerify);
  const applyNodeRevision = useThesisStore((s) => s.applyNodeRevision);
  const undoLastRevision = useThesisStore((s) => s.undoLastRevision);
  const dismissDeltaBanner = useThesisStore((s) => s.dismissDeltaBanner);
  const lastDeltaBanner = useThesisStore((s) => s.lastDeltaBanner);
  const blueprint = useThesisStore((s) => s.blueprint);
  const sceneReady = useThesisStore((s) => s.sceneReady);

  // Expose programmatic inspection & verification API
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__THESIS_CITY__ = {
      setCameraMode: (mode: CameraMode | 'central_tower' | 'collapse_closeup') => {
        const s = useThesisStore.getState();
        const centralId =
          s.blueprint.buildings.find((b) => b.node.isCentral)?.nodeId ??
          s.blueprint.buildings[0]?.nodeId ??
          'CLM-00';
        if (mode === 'central_tower') {
          s.setCameraMode('building_inspection', centralId);
        } else if (mode === 'collapse_closeup') {
          s.setCameraMode('destruction_cinematic');
        } else {
          s.setCameraMode(mode);
        }
      },
      focusBuilding: (nodeId: string) => focusBuilding(nodeId),
      focusEdge: (edgeId: string) => focusEdge(edgeId),
      setRoleFilter: (filter: RoleFilter) => useThesisStore.getState().setRoleFilter(filter),
      setInspectorOpen: (open: boolean) => setInspectorOpen(open),
      setAccessibleViewOpen: (open: boolean) => setAccessibleViewOpen(open),
      setReducedMotion: (reduced: boolean) => setReducedMotion(reduced),
      loadThesisGraph: (graph: ThesisGraph, source: 'sample' | 'gemini' | 'imported' = 'imported') =>
        loadThesisGraph(graph, { source }),
      resetToSampleThesis: () => resetToSampleThesis(),
      resetToUpload: () => resetToUpload(),
      toggleNodeConfirmed: (nodeId: string) => toggleNodeConfirmed(nodeId),
      toggleChecklistCheck: (key: 'noContradiction' | 'causalCheck' | 'evidenceVerified') =>
        toggleChecklistCheck(key),
      finalizeAndBuildCity: () => finalizeAndBuildCity(),
      replayConstruction: () => replayConstruction(),
      returnToVerify: () => returnToVerify(),
      applyNodeRevision: (params: {
        nodeId: string;
        revisedText: string;
        evaluation: ReviseNodeGeminiResult;
      }) => applyNodeRevision(params),
      undoLastRevision: () => undoLastRevision(),
      getState: () => {
        const s = useThesisStore.getState();
        return {
          appPhase: s.appPhase,
          scoreReport: s.scoreReport,
          confirmedCount: Object.values(s.confirmedNodeIds).filter(Boolean).length,
          thesisId: s.blueprint.thesisId,
          analysisSource: s.analysisSource,
          cameraMode: s.cameraMode,
          selectedNodeId: s.selectedNodeId,
          selectedEdgeId: s.selectedEdgeId,
          roleFilter: s.roleFilter,
          sceneReady: s.sceneReady,
          buildingCount: s.blueprint.buildings.length,
          bridgeCount: s.blueprint.bridges.length,
          integrityScore: s.blueprint.integrityScore,
          revisionCount: s.revisionHistory.length,
          lastDeltaBanner: s.lastDeltaBanner,
          telemetry: s.telemetry,
        };
      },
    };
  }, [
    applyNodeRevision,
    finalizeAndBuildCity,
    focusBuilding,
    focusEdge,
    loadThesisGraph,
    replayConstruction,
    resetToSampleThesis,
    resetToUpload,
    returnToVerify,
    setAccessibleViewOpen,
    setInspectorOpen,
    setReducedMotion,
    toggleChecklistCheck,
    toggleNodeConfirmed,
    undoLastRevision,
  ]);

  const bannerDelta = lastDeltaBanner
    ? lastDeltaBanner.nextIntegrity - lastDeltaBanner.prevIntegrity
    : 0;
  const bannerNode = lastDeltaBanner
    ? blueprint.buildings.find((b) => b.nodeId === lastDeltaBanner.nodeId)
    : null;
  const bannerNodeLabel = bannerNode ? getDisplayTitle(bannerNode) : lastDeltaBanner?.nodeId;
  const bannerActionLabel =
    lastDeltaBanner?.kind === 'reconstructed'
      ? '整合性が改善'
      : lastDeltaBanner?.kind === 'collapsed'
        ? '矛盾・弱点を検出'
        : '更新完了';

  return (
    <div className="app-shell">
      <TopBar />
      <main className="city-viewport-main">
        {!sceneReady && (
          <div className="scene-loading-bar" role="status" aria-live="polite">
            <span>ステージを準備しています...</span>
          </div>
        )}
        {lastDeltaBanner && (
          <div
            className={`delta-toast-banner ${
              lastDeltaBanner.kind === 'collapsed' || bannerDelta < 0 ? 'is-danger' : 'is-repair'
            }`}
            role="status"
            aria-live="polite"
          >
            <span style={{ fontWeight: 700 }}>
              {bannerActionLabel}（{bannerNodeLabel}）
            </span>
            <button
              type="button"
              className="node-chip-btn"
              onClick={() => dismissDeltaBanner()}
            >
              閉じる
            </button>
          </div>
        )}
        <Suspense fallback={null}>
          <CityScene />
        </Suspense>
      </main>
      <RightPanel />
      <BottomTimeline />
      <Suspense fallback={null}>
        <AccessibleGraphView />
      </Suspense>
    </div>
  );
}
