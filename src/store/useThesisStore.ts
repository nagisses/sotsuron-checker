import { create } from 'zustand';
import { SAMPLE_THESIS_GRAPH } from '../data/sampleThesis';
import { GroundingAuditReport, ReviseNodeGeminiResult } from '../engine/argumentValidator';
import { buildCityBlueprint } from '../engine/cityMapper';
import { PrepState, loadSavedPrepState, savePrepState } from '../engine/prepBuilder';
import { ThesisScoreReport, evaluateThesisScore } from '../engine/scoring';
import {
  AnalysisSourceKind,
  CityBlueprint,
  GeminiBenchmarkActual,
  NodeTransitionEvent,
  NodeTransitionKind,
  RevisionHistoryEntry,
  ThesisGraph,
  ThesisNode,
  ToulminRole,
} from '../types/thesis';

export type AppPhase = 'prep' | 'upload' | 'verify' | 'built';
export type DisasterKind = 'earthquake' | 'typhoon' | 'shield';

export interface DisasterEventState {
  kind: DisasterKind;
  startedAtMs: number;
  headlineJa: string;
  detailJa: string;
}

export type CameraMode =
  | 'overview'
  | 'building_inspection'
  | 'destruction_cinematic'
  | 'orbit';

export type QualityTier = 'high' | 'standard' | 'low';
export type RoleFilter = 'all' | ToulminRole | 'faults' | 'healthy';

export type HoveredTarget =
  | { kind: 'building'; id: string }
  | { kind: 'edge'; id: string }
  | null;

export interface ApiHealthStatus {
  checked: boolean;
  geminiConfigured: boolean;
  defaultModel: string;
}

export interface RenderTelemetry {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  initializedAtMs: number;
}

interface ThesisCityState {
  appPhase: AppPhase;
  prepState: PrepState;
  draftFromPrep: { title: string; text: string; nonce: number } | null;
  confirmedNodeIds: Record<string, boolean>;
  checklistChecks: {
    noContradiction: boolean;
    causalCheck: boolean;
    evidenceVerified: boolean;
  };
  scoreReport: ThesisScoreReport | null;
  previousScore: number | null;
  soundEnabled: boolean;
  constructionStartedAtMs: number;
  disasterEvent: DisasterEventState | null;
  graph: ThesisGraph;
  blueprint: CityBlueprint;
  analysisSource: AnalysisSourceKind;
  analysisModel: string | null;
  groundingReport: GroundingAuditReport | null;
  analysisModalOpen: boolean;
  sessionApiKey: string;
  apiHealth: ApiHealthStatus | null;
  benchmarkResults: Record<string, GeminiBenchmarkActual>;
  benchmarksRunning: boolean;
  benchmarkError: string | null;
  activeTransitions: Record<string, NodeTransitionEvent>;
  revisionHistory: RevisionHistoryEntry[];
  lastDeltaBanner: {
    nodeId: string;
    kind: NodeTransitionKind;
    prevIntegrity: number;
    nextIntegrity: number;
    summary: string;
    source: 'gemini' | 'history';
  } | null;
  cameraMode: CameraMode;
  cameraRequestNonce: number;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredTarget: HoveredTarget;
  roleFilter: RoleFilter;
  inspectorOpen: boolean;
  inspectorTab: 'inspector' | 'benchmarks';
  accessibleViewOpen: boolean;
  qualityTier: QualityTier;
  reducedMotion: boolean;
  tourPlaying: boolean;
  timelineStep: number;
  sceneReady: boolean;
  telemetry: RenderTelemetry;
  setCameraMode: (mode: CameraMode, focusNodeId?: string) => void;
  focusBuilding: (nodeId: string) => void;
  focusEdge: (edgeId: string) => void;
  selectNode: (nodeId: string) => void;
  setHoveredTarget: (target: HoveredTarget) => void;
  setRoleFilter: (filter: RoleFilter) => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorTab: (tab: 'inspector' | 'benchmarks') => void;
  setAccessibleViewOpen: (open: boolean) => void;
  setAnalysisModalOpen: (open: boolean) => void;
  setSessionApiKey: (key: string) => void;
  setApiHealth: (health: ApiHealthStatus) => void;
  loadThesisGraph: (
    graph: ThesisGraph,
    meta?: {
      source?: AnalysisSourceKind;
      model?: string | null;
      groundingReport?: GroundingAuditReport | null;
    },
  ) => void;
  resetToSampleThesis: () => void;
  resetToUpload: () => void;
  goToPrep: () => void;
  goToUploadDirect: () => void;
  setPrepState: (next: PrepState) => void;
  applyPrepToDraft: (title: string, text: string) => void;
  toggleNodeConfirmed: (nodeId: string) => void;
  toggleChecklistCheck: (key: 'noContradiction' | 'causalCheck' | 'evidenceVerified') => void;
  finalizeAndBuildCity: () => void;
  replayConstruction: () => void;
  triggerDisaster: (kind: DisasterKind) => void;
  returnToVerify: () => void;
  applyNodeRevision: (params: {
    nodeId: string;
    revisedText: string;
    evaluation: ReviseNodeGeminiResult;
  }) => void;
  undoLastRevision: () => void;
  dismissDeltaBanner: () => void;
  setBenchmarkResults: (results: GeminiBenchmarkActual[]) => void;
  setBenchmarksState: (partial: {
    benchmarksRunning?: boolean;
    benchmarkError?: string | null;
  }) => void;
  setQualityTier: (tier: QualityTier) => void;
  setReducedMotion: (reduced: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setTourPlaying: (playing: boolean) => void;
  setTimelineStep: (step: number) => void;
  markSceneReady: () => void;
  updateTelemetry: (partial: Partial<RenderTelemetry>) => void;
}

const initialBlueprint = buildCityBlueprint(SAMPLE_THESIS_GRAPH);
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resolveCentralNodeId(blueprint: CityBlueprint): string {
  return (
    blueprint.buildings.find((b) => b.node.isCentral)?.nodeId ??
    blueprint.buildings[0]?.nodeId ??
    'CLM-00'
  );
}

export const useThesisStore = create<ThesisCityState>((set) => ({
  appPhase: 'prep',
  prepState: loadSavedPrepState(),
  draftFromPrep: null,
  confirmedNodeIds: {},
  checklistChecks: {
    noContradiction: false,
    causalCheck: false,
    evidenceVerified: false,
  },
  scoreReport: null,
  previousScore: null,
  soundEnabled: true,
  constructionStartedAtMs: 0,
  disasterEvent: null,
  graph: SAMPLE_THESIS_GRAPH,
  blueprint: initialBlueprint,
  analysisSource: 'sample',
  analysisModel: null,
  groundingReport: null,
  analysisModalOpen: false,
  sessionApiKey: '',
  apiHealth: null,
  benchmarkResults: {},
  benchmarksRunning: false,
  benchmarkError: null,
  activeTransitions: {},
  revisionHistory: [],
  lastDeltaBanner: null,
  cameraMode: 'overview',
  cameraRequestNonce: 0,
  selectedNodeId: 'CLM-00',
  selectedEdgeId: null,
  hoveredTarget: null,
  roleFilter: 'all',
  inspectorOpen: true,
  inspectorTab: 'inspector',
  accessibleViewOpen: false,
  qualityTier: 'high',
  reducedMotion: prefersReducedMotion,
  tourPlaying: false,
  timelineStep: 0,
  sceneReady: false,
  telemetry: {
    fps: 0,
    frameTimeMs: 0,
    drawCalls: 0,
    triangles: 0,
    initializedAtMs: 0,
  },

  setCameraMode: (mode, focusNodeId) =>
    set((state) => {
      const centralId = resolveCentralNodeId(state.blueprint);
      let nextNodeId = focusNodeId ?? state.selectedNodeId ?? centralId;
      let nextStep = state.timelineStep;
      if (!focusNodeId) {
        if (mode === 'overview') {
          nextNodeId = centralId;
          nextStep = 0;
        } else if (mode === 'building_inspection') {
          nextNodeId = state.selectedNodeId ?? centralId;
          nextStep = 1;
        } else if (mode === 'destruction_cinematic') {
          const faultTarget =
            state.blueprint.buildings.find((b) => b.status === 'collapsed') ??
            state.blueprint.buildings.find((b) => b.status === 'unfinished' || b.status === 'warning');
          if (faultTarget) nextNodeId = faultTarget.nodeId;
          nextStep = 2;
        } else if (mode === 'orbit') {
          nextStep = 3;
        }
      }
      return {
        cameraMode: mode,
        cameraRequestNonce: state.cameraRequestNonce + 1,
        selectedNodeId: nextNodeId,
        selectedEdgeId: null,
        timelineStep: nextStep,
      };
    }),

  focusBuilding: (nodeId) =>
    set((state) => {
      const building = state.blueprint.buildings.find((b) => b.nodeId === nodeId);
      const isCollapsed = building?.status === 'collapsed';
      const nextMode: CameraMode = isCollapsed ? 'destruction_cinematic' : 'building_inspection';
      return {
        selectedNodeId: nodeId,
        selectedEdgeId: null,
        cameraMode: nextMode,
        cameraRequestNonce: state.cameraRequestNonce + 1,
        inspectorOpen: true,
        inspectorTab: 'inspector',
        timelineStep: isCollapsed ? 2 : 1,
      };
    }),

  focusEdge: (edgeId) =>
    set((state) => ({
      selectedEdgeId: edgeId,
      cameraMode: 'building_inspection',
      cameraRequestNonce: state.cameraRequestNonce + 1,
      inspectorOpen: true,
      inspectorTab: 'inspector',
    })),

  selectNode: (nodeId) =>
    set({
      selectedNodeId: nodeId,
      selectedEdgeId: null,
      inspectorOpen: true,
      inspectorTab: 'inspector',
    }),

  setHoveredTarget: (target) => set({ hoveredTarget: target }),
  setRoleFilter: (filter) => set({ roleFilter: filter }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  setAccessibleViewOpen: (open) => set({ accessibleViewOpen: open }),
  setAnalysisModalOpen: (open) => set({ analysisModalOpen: open }),
  setSessionApiKey: (key) => set({ sessionApiKey: key }),
  setApiHealth: (health) => set({ apiHealth: health }),

  loadThesisGraph: (graph, meta) =>
    set((state) => {
      const nextBlueprint = buildCityBlueprint(graph);
      const centralId = resolveCentralNodeId(nextBlueprint);
      return {
        appPhase: 'verify',
        confirmedNodeIds: {},
        checklistChecks: {
          noContradiction: false,
          causalCheck: false,
          evidenceVerified: false,
        },
        scoreReport: null,
        previousScore: null,
        constructionStartedAtMs: 0,
        disasterEvent: null,
        graph,
        blueprint: nextBlueprint,
        analysisSource: meta?.source ?? 'gemini',
        analysisModel: meta?.model ?? null,
        groundingReport: meta?.groundingReport ?? null,
        activeTransitions: {},
        revisionHistory: [],
        lastDeltaBanner: null,
        cameraMode: 'overview',
        cameraRequestNonce: state.cameraRequestNonce + 1,
        selectedNodeId: centralId,
        selectedEdgeId: null,
        hoveredTarget: null,
        roleFilter: 'all',
        inspectorOpen: true,
        inspectorTab: 'inspector',
        tourPlaying: false,
        timelineStep: 0,
      };
    }),

  resetToSampleThesis: () =>
    set((state) => ({
      appPhase: 'verify',
      confirmedNodeIds: {},
      scoreReport: null,
      previousScore: null,
      constructionStartedAtMs: 0,
      disasterEvent: null,
      graph: SAMPLE_THESIS_GRAPH,
      blueprint: initialBlueprint,
      analysisSource: 'sample',
      analysisModel: null,
      groundingReport: null,
      activeTransitions: {},
      revisionHistory: [],
      lastDeltaBanner: null,
      cameraMode: 'overview',
      cameraRequestNonce: state.cameraRequestNonce + 1,
      selectedNodeId: 'CLM-00',
      selectedEdgeId: null,
      hoveredTarget: null,
      roleFilter: 'all',
      tourPlaying: false,
      timelineStep: 0,
    })),

  resetToUpload: () =>
    set((state) => ({
      appPhase: 'upload',
      confirmedNodeIds: {},
      checklistChecks: {
        noContradiction: false,
        causalCheck: false,
        evidenceVerified: false,
      },
      scoreReport: null,
      previousScore: null,
      constructionStartedAtMs: 0,
      disasterEvent: null,
      lastDeltaBanner: null,
      revisionHistory: [],
      activeTransitions: {},
      cameraMode: 'overview',
      cameraRequestNonce: state.cameraRequestNonce + 1,
      selectedEdgeId: null,
      hoveredTarget: null,
      inspectorOpen: true,
    })),

  goToPrep: () =>
    set((state) => ({
      appPhase: 'prep',
      scoreReport: null,
      disasterEvent: null,
      cameraMode: 'overview',
      cameraRequestNonce: state.cameraRequestNonce + 1,
      selectedEdgeId: null,
      inspectorOpen: true,
    })),

  goToUploadDirect: () =>
    set((state) => ({
      appPhase: 'upload',
      scoreReport: null,
      disasterEvent: null,
      cameraMode: 'overview',
      cameraRequestNonce: state.cameraRequestNonce + 1,
      selectedEdgeId: null,
      inspectorOpen: true,
    })),

  setPrepState: (next) => {
    savePrepState(next);
    set({ prepState: next });
  },

  applyPrepToDraft: (title, text) =>
    set((state) => ({
      appPhase: 'upload',
      draftFromPrep: {
        title,
        text,
        nonce: (state.draftFromPrep?.nonce ?? 0) + 1,
      },
      scoreReport: null,
      disasterEvent: null,
      cameraMode: 'overview',
      cameraRequestNonce: state.cameraRequestNonce + 1,
      inspectorOpen: true,
    })),

  toggleNodeConfirmed: (nodeId) =>
    set((state) => ({
      confirmedNodeIds: {
        ...state.confirmedNodeIds,
        [nodeId]: !state.confirmedNodeIds[nodeId],
      },
    })),

  toggleChecklistCheck: (key) =>
    set((state) => ({
      checklistChecks: {
        ...state.checklistChecks,
        [key]: !state.checklistChecks[key],
      },
    })),

  finalizeAndBuildCity: () =>
    set((state) => {
      const checklistCount = Object.values(state.checklistChecks).filter(Boolean).length;
      const report = evaluateThesisScore(
        state.blueprint,
        state.confirmedNodeIds,
        state.previousScore,
        checklistCount,
      );
      const nowMs = performance.now();
      const strikeDelayMs = 1950;
      const hasFlaw = report.criticalCount > 0 || report.warningCount > 0 || report.totalScore < 80;
      const disasterEvent: DisasterEventState = !hasFlaw
        ? {
            kind: 'shield',
            startedAtMs: nowMs + strikeDelayMs,
            headlineJa: '🛡️ 災害耐性テスト合格！ 地震・台風を完全に防ぎました',
            detailJa: '強固な構成と根拠により、ホログラムシールドがすべての衝撃を吸収しました。',
          }
        : report.consistencyScore <= report.evidenceScore
          ? {
              kind: 'earthquake',
              startedAtMs: nowMs + strikeDelayMs,
              headlineJa: '🌋 構成の甘さを検知！ 震度6強の論理地震が発生',
              detailJa: `矛盾・飛躍のある${Math.max(1, report.criticalCount + report.warningCount)}棟の建物が揺れに耐えきれず崩落しました。`,
            }
          : {
              kind: 'typhoon',
              startedAtMs: nowMs + strikeDelayMs,
              headlineJa: '🌪️ 根拠の弱さを検知！ 猛烈な台風が直撃',
              detailJa: `データ・裏付けが弱い${Math.max(1, report.criticalCount + report.warningCount)}棟の建物が暴風で傾き損傷しました。`,
            };

      return {
        appPhase: 'built',
        scoreReport: report,
        constructionStartedAtMs: nowMs,
        disasterEvent,
        cameraMode: 'overview',
        cameraRequestNonce: state.cameraRequestNonce + 1,
        selectedEdgeId: null,
        inspectorOpen: true,
      };
    }),

  replayConstruction: () =>
    set((state) => {
      const nowMs = performance.now();
      return {
        constructionStartedAtMs: nowMs,
        disasterEvent: state.disasterEvent
          ? { ...state.disasterEvent, startedAtMs: nowMs + 1950 }
          : null,
        cameraMode: 'overview',
        cameraRequestNonce: state.cameraRequestNonce + 1,
      };
    }),

  triggerDisaster: (kind) =>
    set((state) => {
      const report = state.scoreReport;
      const flawCount = (report?.criticalCount ?? 0) + (report?.warningCount ?? 0);
      const isStrong = flawCount === 0 && (report?.totalScore ?? 0) >= 80;
      const nowMs = performance.now();
      if (kind === 'shield' || (isStrong && kind !== 'earthquake' && kind !== 'typhoon')) {
        return {
          disasterEvent: {
            kind: 'shield',
            startedAtMs: nowMs,
            headlineJa: '🛡️ 災害耐性テスト合格！ 地震・台風を完全に防ぎました',
            detailJa: '盤石な論理構造により、すべての衝撃をシールドで跳ね返しました。',
          },
        };
      }
      if (kind === 'earthquake') {
        return {
          disasterEvent: {
            kind: 'earthquake',
            startedAtMs: nowMs,
            headlineJa: isStrong
              ? '🌋 地震テスト実行！ 盤石な構成で震度6強に耐えました'
              : '🌋 震度6強の論理地震が発生！ 構成の甘い建物が崩落',
            detailJa: isStrong
              ? '重大な矛盾がないため、すべての建物が倒壊せず持ちこたえました！'
              : `矛盾・要確認の${Math.max(1, flawCount)}棟が激しい揺れで傾き・崩落しました。文章を直して補強しよう！`,
          },
        };
      }
      return {
        disasterEvent: {
          kind: 'typhoon',
          startedAtMs: nowMs,
          headlineJa: isStrong
            ? '🌪️ 台風テスト実行！ 強固な根拠で暴風を耐え抜きました'
            : '🌪️ 猛烈な台風が直撃！ 根拠の弱い建物が暴風で損傷',
          detailJa: isStrong
            ? '十分なデータと客観性があるため、強風にもビクともしませんでした！'
            : `裏付けが弱い${Math.max(1, flawCount)}棟が突風に煽られて傾き・損傷しました。`,
        },
      };
    }),

  returnToVerify: () =>
    set((state) => ({
      appPhase: 'verify',
      previousScore: state.scoreReport?.totalScore ?? state.previousScore,
      scoreReport: null,
      disasterEvent: null,
      cameraMode: 'overview',
      cameraRequestNonce: state.cameraRequestNonce + 1,
      selectedEdgeId: null,
    })),

  applyNodeRevision: ({ nodeId, revisedText, evaluation }) =>
    set((state) => {
      const prevGraph = structuredClone(state.graph);
      const prevIntegrity = state.blueprint.integrityScore;
      const targetPrev = prevGraph.nodes.find((n) => n.id === nodeId);
      if (!targetPrev) return {};

      const nextGraph = structuredClone(prevGraph);
      const targetNext = nextGraph.nodes.find((n) => n.id === nodeId);
      if (!targetNext) return {};

      targetNext.sourceText = revisedText;
      targetNext.title = evaluation.updatedTitle;
      targetNext.titleJa = evaluation.updatedTitleJa;
      targetNext.status = evaluation.updatedStatus;
      targetNext.confidence = evaluation.updatedConfidence;
      targetNext.issues = evaluation.remainingIssues;
      if (targetNext.isCentral) {
        targetNext.code = `${targetNext.id} // CORE`;
      } else if (evaluation.updatedStatus === 'collapsed' || evaluation.updatedStatus === 'unfinished') {
        targetNext.code = `${targetNext.id} // FAULT`;
      } else {
        targetNext.code = targetNext.id;
      }

      // Propagate repair or collapse along incident logical bridges
      for (const edge of nextGraph.edges) {
        if (edge.source !== nodeId && edge.target !== nodeId) continue;
        if (evaluation.updatedStatus === 'healthy') {
          if (edge.relationshipType === 'missing_link' || edge.relationshipType === 'contradicts') {
            edge.relationshipType =
              targetNext.role === 'warrant'
                ? 'warrants'
                : targetNext.role === 'backing'
                  ? 'backs'
                  : 'supports';
          }
          edge.integrity = Math.max(edge.integrity, evaluation.repairedEdgeIntegrity);
          edge.explanation = evaluation.repairSummary;
        } else if (evaluation.updatedStatus === 'collapsed' || evaluation.updatedStatus === 'unfinished') {
          edge.integrity = Math.min(edge.integrity, evaluation.repairedEdgeIntegrity);
          edge.explanation = evaluation.repairSummary;
        } else {
          edge.integrity = evaluation.repairedEdgeIntegrity;
        }
      }

      const nextBlueprint = buildCityBlueprint(nextGraph);
      const nextIntegrity = nextBlueprint.integrityScore;

      const classifyTransition = (
        prevStatus: ThesisNode['status'],
        nextStatus: ThesisNode['status'],
      ): NodeTransitionKind => {
        if (nextStatus === 'collapsed' || nextStatus === 'unfinished') {
          return prevStatus === 'healthy' || prevStatus === 'warning' ? 'collapsed' : 'downgraded';
        }
        if (
          prevStatus === 'collapsed' ||
          prevStatus === 'unfinished' ||
          (prevStatus === 'warning' && nextStatus === 'healthy') ||
          nextIntegrity > prevIntegrity
        ) {
          return 'reconstructed';
        }
        return nextIntegrity < prevIntegrity ? 'downgraded' : 'refined';
      };

      const kind = classifyTransition(targetPrev.status, evaluation.updatedStatus);
      const nowMs = performance.now();
      const nextConfirmed = { ...state.confirmedNodeIds, [nodeId]: true };
      const isVerify = state.appPhase === 'verify';
      const nextCameraMode: CameraMode = isVerify
        ? 'overview'
        : evaluation.updatedStatus === 'collapsed'
          ? 'destruction_cinematic'
          : 'building_inspection';
      const nextScoreReport =
        state.appPhase === 'built'
          ? (() => {
              const checklistCount = Object.values(state.checklistChecks).filter(Boolean).length;
              return evaluateThesisScore(
                nextBlueprint,
                nextConfirmed,
                state.scoreReport?.totalScore ?? state.previousScore,
                checklistCount,
              );
            })()
          : state.scoreReport;

      const historyItem: RevisionHistoryEntry = {
        id: `REV-${Date.now()}`,
        nodeId,
        prevGraph,
        prevIntegrity,
        nextIntegrity,
        kind,
        summary: evaluation.repairSummary,
        timestamp: new Date().toISOString(),
      };

      return {
        graph: nextGraph,
        blueprint: nextBlueprint,
        confirmedNodeIds: nextConfirmed,
        scoreReport: nextScoreReport,
        activeTransitions: isVerify
          ? state.activeTransitions
          : {
              ...state.activeTransitions,
              [nodeId]: {
                nodeId,
                kind,
                startedAtMs: nowMs,
                prevStatus: targetPrev.status,
                nextStatus: evaluation.updatedStatus,
              },
            },
        revisionHistory: [...state.revisionHistory, historyItem],
        lastDeltaBanner: {
          nodeId,
          kind,
          prevIntegrity,
          nextIntegrity,
          summary: evaluation.repairSummary,
          source: 'gemini',
        },
        selectedNodeId: nodeId,
        selectedEdgeId: null,
        cameraMode: nextCameraMode,
        cameraRequestNonce: isVerify ? state.cameraRequestNonce : state.cameraRequestNonce + 1,
      };
    }),

  undoLastRevision: () =>
    set((state) => {
      if (state.revisionHistory.length === 0) return {};
      const entry = state.revisionHistory[state.revisionHistory.length - 1];
      const nextHistory = state.revisionHistory.slice(0, -1);
      const restoredBlueprint = buildCityBlueprint(entry.prevGraph);
      const inverseKind: NodeTransitionKind =
        entry.kind === 'reconstructed' ? 'collapsed' : 'reconstructed';
      const restoredNode = restoredBlueprint.buildings.find((b) => b.nodeId === entry.nodeId);
      return {
        graph: entry.prevGraph,
        blueprint: restoredBlueprint,
        revisionHistory: nextHistory,
        activeTransitions: {
          ...state.activeTransitions,
          [entry.nodeId]: {
            nodeId: entry.nodeId,
            kind: inverseKind,
            startedAtMs: performance.now(),
            prevStatus:
              state.blueprint.buildings.find((b) => b.nodeId === entry.nodeId)?.status ?? 'healthy',
            nextStatus: restoredNode?.status ?? 'collapsed',
          },
        },
        lastDeltaBanner: {
          nodeId: entry.nodeId,
          kind: inverseKind,
          prevIntegrity: state.blueprint.integrityScore,
          nextIntegrity: restoredBlueprint.integrityScore,
          summary: `Restored ${entry.nodeId} prior state.`,
          source: 'history',
        },
        selectedNodeId: entry.nodeId,
        selectedEdgeId: null,
        cameraMode:
          restoredNode?.status === 'collapsed' ? 'destruction_cinematic' : 'building_inspection',
        cameraRequestNonce: state.cameraRequestNonce + 1,
      };
    }),

  dismissDeltaBanner: () => set({ lastDeltaBanner: null }),

  setBenchmarkResults: (results) =>
    set((state) => {
      const next = { ...state.benchmarkResults };
      for (const item of results) {
        next[item.benchmarkId] = item;
      }
      return {
        benchmarkResults: next,
        benchmarksRunning: false,
        benchmarkError: null,
      };
    }),

  setBenchmarksState: (partial) => set(partial),
  setQualityTier: (tier) => set({ qualityTier: tier }),
  setReducedMotion: (reduced) =>
    set((state) => ({
      reducedMotion: reduced,
      tourPlaying: reduced ? false : state.tourPlaying,
    })),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setTourPlaying: (playing) =>
    set((state) => ({
      tourPlaying: state.reducedMotion ? false : playing,
    })),
  setTimelineStep: (step) => set({ timelineStep: step }),
  markSceneReady: () => set({ sceneReady: true }),
  updateTelemetry: (partial) =>
    set((state) => ({
      telemetry: { ...state.telemetry, ...partial },
    })),
}));
