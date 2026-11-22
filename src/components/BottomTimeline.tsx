import { AlertTriangle, Globe, ListTree, Play } from 'lucide-react';
import { useThesisStore } from '../store/useThesisStore';
import { STATUS_META_JA, getDisplayTitle } from '../utils/labels';

export function BottomTimeline() {
  const appPhase = useThesisStore((s) => s.appPhase);
  const cameraMode = useThesisStore((s) => s.cameraMode);
  const setCameraMode = useThesisStore((s) => s.setCameraMode);
  const replayConstruction = useThesisStore((s) => s.replayConstruction);
  const hoveredTarget = useThesisStore((s) => s.hoveredTarget);
  const blueprint = useThesisStore((s) => s.blueprint);
  const accessibleViewOpen = useThesisStore((s) => s.accessibleViewOpen);
  const setAccessibleViewOpen = useThesisStore((s) => s.setAccessibleViewOpen);

  const hoveredBuilding =
    hoveredTarget?.kind === 'building'
      ? blueprint.buildings.find((b) => b.nodeId === hoveredTarget.id)
      : null;

  const faultCount = blueprint.buildings.filter(
    (b) => b.status === 'collapsed' || b.status === 'unfinished' || b.status === 'warning',
  ).length;

  const centralNodeId =
    blueprint.buildings.find((b) => b.node.isCentral)?.nodeId ??
    blueprint.buildings[0]?.nodeId ??
    'CLM-00';

  return (
    <footer className="hud-bottombar">
      <div className="timeline-cues" role="group" aria-label="視点切り替え">
        <button
          type="button"
          className="cue-btn"
          aria-pressed={cameraMode === 'overview'}
          onClick={() => setCameraMode('overview', centralNodeId)}
        >
          <Globe size={14} aria-hidden="true" />
          <span>正面・全体を見る</span>
        </button>

        {appPhase === 'built' && (
          <>
            {faultCount > 0 && (
              <button
                type="button"
                className="cue-btn is-collapse"
                aria-pressed={cameraMode === 'destruction_cinematic'}
                onClick={() => setCameraMode('destruction_cinematic')}
              >
                <AlertTriangle size={14} aria-hidden="true" />
                <span>問題箇所を見る ({faultCount})</span>
              </button>
            )}

            <button
              type="button"
              className="cue-btn"
              onClick={() => replayConstruction()}
            >
              <Play size={13} aria-hidden="true" />
              <span>建築をもう一度見る</span>
            </button>

            <button
              type="button"
              className="cue-btn"
              aria-pressed={accessibleViewOpen}
              onClick={() => setAccessibleViewOpen(!accessibleViewOpen)}
            >
              <ListTree size={14} aria-hidden="true" />
              <span>一覧表</span>
            </button>
          </>
        )}
      </div>

      <div className="hover-reticle-status" aria-live="polite">
        {hoveredBuilding && appPhase !== 'prep' && appPhase !== 'upload' ? (
          <span>
            選択箇所: <strong>{getDisplayTitle(hoveredBuilding)}</strong>（
            {STATUS_META_JA[hoveredBuilding.status].shortLabel}）
          </span>
        ) : appPhase === 'prep' ? (
          <span>設計準備中 — 中央の画面でテーマ・資料・構成を作ってから書き出しましょう</span>
        ) : appPhase === 'upload' ? (
          <span>建設予定地（待機中）— 中央の画面から卒論やレポートを入力してください</span>
        ) : appPhase === 'verify' ? (
          <span>土台配置済み — 中央の画面で3つの観点と矛盾を確認して採点へ進んでください</span>
        ) : (
          <span>マウス操作: ドラッグで回転 ・ ホイールで拡大縮小 ・ 建物クリックで詳細</span>
        )}
      </div>
    </footer>
  );
}
