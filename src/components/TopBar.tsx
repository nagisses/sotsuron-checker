import { Layers, PanelLeftClose, PanelLeftOpen, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useThesisStore } from '../store/useThesisStore';

export function TopBar() {
  const appPhase = useThesisStore((s) => s.appPhase);
  const scoreReport = useThesisStore((s) => s.scoreReport);
  const inspectorOpen = useThesisStore((s) => s.inspectorOpen);
  const setInspectorOpen = useThesisStore((s) => s.setInspectorOpen);
  const soundEnabled = useThesisStore((s) => s.soundEnabled);
  const setSoundEnabled = useThesisStore((s) => s.setSoundEnabled);
  const resetToUpload = useThesisStore((s) => s.resetToUpload);
  const returnToVerify = useThesisStore((s) => s.returnToVerify);

  const steps: { id: 'upload' | 'verify' | 'built'; label: string }[] = [
    { id: 'upload', label: '① 卒論・レポート入力' },
    { id: 'verify', label: '② 矛盾・整合性の確認' },
    { id: 'built', label: '③ 採点・建物建設' },
  ];

  return (
    <header className="hud-topbar">
      <div className="topbar-brand-group">
        <div className="brand-mark-box" aria-hidden="true">
          <Layers size={18} color="#48D7BA" />
        </div>
        <div className="brand-title-block">
          <h1 className="brand-heading">卒論・レポート整合性チェッカー</h1>
        </div>
      </div>

      <nav className="step-nav" aria-label="進行ステップ">
        {steps.map((step) => {
          const active = appPhase === step.id;
          const clickable =
            (step.id === 'upload' && appPhase !== 'upload') ||
            (step.id === 'verify' && appPhase === 'built');
          return (
            <button
              key={step.id}
              type="button"
              className={`step-pill ${active ? 'is-active' : ''}`}
              aria-current={active ? 'step' : undefined}
              disabled={!clickable && !active}
              onClick={() => {
                if (step.id === 'upload') resetToUpload();
                else if (step.id === 'verify' && appPhase === 'built') returnToVerify();
              }}
            >
              {step.label}
            </button>
          );
        })}
      </nav>

      <div className="topbar-controls">
        {appPhase === 'built' && scoreReport && (
          <div className="integrity-badge" title="最終評価スコア">
            <span className="integrity-label">ランク {scoreReport.rank}</span>
            <span className="integrity-score mono">{scoreReport.totalScore}点</span>
          </div>
        )}

        <button
          type="button"
          className="hud-undo-btn"
          aria-pressed={soundEnabled}
          title="結果発表や修正時の効果音を切り替え"
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? (
            <>
              <Volume2 size={13} aria-hidden="true" />
              <span>効果音ON</span>
            </>
          ) : (
            <>
              <VolumeX size={13} aria-hidden="true" />
              <span>効果音OFF</span>
            </>
          )}
        </button>

        {appPhase !== 'upload' && (
          <button
            type="button"
            className="hud-undo-btn"
            onClick={() => resetToUpload()}
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>最初から</span>
          </button>
        )}

        <button
          type="button"
          className="hud-toggle-btn"
          aria-expanded={inspectorOpen}
          aria-controls="analysis-inspector-panel"
          onClick={() => setInspectorOpen(!inspectorOpen)}
        >
          {inspectorOpen ? (
            <>
              <PanelLeftClose size={14} aria-hidden="true" />
              <span>操作欄を隠す</span>
            </>
          ) : (
            <>
              <PanelLeftOpen size={14} aria-hidden="true" />
              <span>操作欄を開く</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
