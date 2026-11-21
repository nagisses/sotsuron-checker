import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Edit3,
  FileUp,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { validateAndSanitizeThesisGraph } from '../engine/argumentValidator';
import { analyzeTextLocally, evaluateRevisionLocally } from '../engine/localAnalyzer';
import { evaluateThesisScore } from '../engine/scoring';
import { useThesisStore } from '../store/useThesisStore';
import { extractDocumentTextInBrowser } from '../utils/docxBrowser';
import {
  EDGE_REL_JA,
  EDGE_STATUS_JA,
  ISSUE_CATEGORY_JA,
  ROLE_LABEL_JA,
  STATUS_META_JA,
  getDisplayTitle,
} from '../utils/labels';
import { playDisasterSound, playFixSuccess, playRankFanfare, playRollTick } from '../utils/soundFx';

const CONFETTI_PIECES = Array.from({ length: 24 }, (_, idx) => ({
  id: idx,
  leftPct: ((idx * 17 + 7) % 94) + 3,
  delayMs: (idx % 6) * 75,
  durationMs: 1450 + (idx % 5) * 240,
  color: ['#48D7BA', '#E3B86B', '#FF6B9D', '#7CE8FF', '#F8D477'][idx % 5],
  rotateDeg: ((idx * 53) % 360) - 180,
}));

const REPORT_DRAFTS: { id: string; label: string; title: string; domain: string; text: string }[] = [
  {
    id: 'sotsuron-flawed',
    label: '卒論サンプル（矛盾あり）',
    title: '大学生の夜間スマートフォン利用と睡眠・講義集中力に関する卒業研究',
    domain: '教育心理学・生活科学',
    text: [
      '第1章：大学生120名を対象に睡眠日誌とアンケートを実施した結果、就寝1時間前までスマートフォンを2時間以上利用する学生は、30分未満の学生に比べて平均睡眠時間が52分短く、午前中の講義での眠気スコアが有意に高かった。',
      '第2章：予備調査として友人3名にブルーライトカット眼鏡を1晩着用してもらったところ翌朝すっきり起床できたため、この眼鏡さえ着用すれば全国のすべての大学生の単位取得率と成績が必ず向上すると断言できる。',
      '第3章：夜間スマートフォン利用が多い学生ほど1限の遅刻率が高かったことから、画面の光そのものが遅刻を引き起こす唯一の直接原因である。一方で第1章では深夜アルバイトによる帰宅の遅れが睡眠不足の主因であるとも述べており、章の間で結論が矛盾している。',
    ].join('\n\n'),
  },
  {
    id: 'report-sound',
    label: 'レポートサンプル（良い例）',
    title: '市立図書館のカフェ併設による大学生の滞在時間変化に関する調査レポート',
    domain: '地域社会学',
    text: [
      '第1章：市立中央図書館の利用者統計（2024〜2025年、大学生340名の有効回答）を分析した結果、館内カフェスペース併設後に1回あたりの平均滞在時間は45分増加し、資料閲覧冊数も1.3倍に伸びた。',
      '第2章：アンケート自由記述と座席稼働率の照合から、軽食や飲料をとりながら小休憩できる環境が長時間学習の疲労を和らげ、結果として自習席の継続利用につながっていることが裏付けられた。',
      '第3章：ただし試験期間や悪天候による来館者数の変動も滞在時間に影響するため、カフェ併設単独の因果効果と断定せず、同時期に導入された座席オンライン予約システムとの相乗効果として評価する必要がある。',
    ].join('\n\n'),
  },
];

export function RightPanel() {
  const inspectorOpen = useThesisStore((s) => s.inspectorOpen);
  const appPhase = useThesisStore((s) => s.appPhase);
  const blueprint = useThesisStore((s) => s.blueprint);
  const selectedNodeId = useThesisStore((s) => s.selectedNodeId);
  const selectedEdgeId = useThesisStore((s) => s.selectedEdgeId);
  const roleFilter = useThesisStore((s) => s.roleFilter);
  const setRoleFilter = useThesisStore((s) => s.setRoleFilter);
  const focusBuilding = useThesisStore((s) => s.focusBuilding);
  const selectNode = useThesisStore((s) => s.selectNode);
  const loadThesisGraph = useThesisStore((s) => s.loadThesisGraph);
  const resetToSampleThesis = useThesisStore((s) => s.resetToSampleThesis);
  const resetToUpload = useThesisStore((s) => s.resetToUpload);
  const confirmedNodeIds = useThesisStore((s) => s.confirmedNodeIds);
  const toggleNodeConfirmed = useThesisStore((s) => s.toggleNodeConfirmed);
  const checklistChecks = useThesisStore((s) => s.checklistChecks);
  const toggleChecklistCheck = useThesisStore((s) => s.toggleChecklistCheck);
  const finalizeAndBuildCity = useThesisStore((s) => s.finalizeAndBuildCity);
  const replayConstruction = useThesisStore((s) => s.replayConstruction);
  const returnToVerify = useThesisStore((s) => s.returnToVerify);
  const scoreReport = useThesisStore((s) => s.scoreReport);
  const constructionStartedAtMs = useThesisStore((s) => s.constructionStartedAtMs);
  const disasterEvent = useThesisStore((s) => s.disasterEvent);
  const triggerDisaster = useThesisStore((s) => s.triggerDisaster);
  const soundEnabled = useThesisStore((s) => s.soundEnabled);
  const reducedMotion = useThesisStore((s) => s.reducedMotion);
  const applyNodeRevision = useThesisStore((s) => s.applyNodeRevision);
  const undoLastRevision = useThesisStore((s) => s.undoLastRevision);
  const revisionHistory = useThesisStore((s) => s.revisionHistory);

  const [titleInput, setTitleInput] = useState('');
  const [manuscriptText, setManuscriptText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [revisionDraft, setRevisionDraft] = useState('');
  const [revising, setRevising] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [revisionMessage, setRevisionMessage] = useState<string | null>(null);
  const [builtDetailsOpen, setBuiltDetailsOpen] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [revealDone, setRevealDone] = useState(false);
  const [disasterBannerVisible, setDisasterBannerVisible] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelScrollRef = useRef<HTMLDivElement>(null);

  const livePreviewReport = useMemo(
    () => evaluateThesisScore(blueprint, confirmedNodeIds),
    [blueprint, confirmedNodeIds],
  );

  useEffect(() => {
    panelScrollRef.current?.scrollTo({ top: 0 });
    if (appPhase === 'built') {
      setBuiltDetailsOpen(false);
    }
  }, [appPhase]);

  useEffect(() => {
    if (appPhase !== 'built' || !scoreReport) {
      setDisplayScore(0);
      setRevealDone(false);
      return;
    }

    const target = scoreReport.totalScore;
    if (reducedMotion) {
      setDisplayScore(target);
      setRevealDone(true);
      playRankFanfare(scoreReport.rank, soundEnabled);
      return;
    }

    setRevealDone(false);
    setDisplayScore(0);
    const startMs = performance.now();
    const durationMs = 880;
    let lastTickMs = 0;
    let rafId = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - startMs) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(eased * target);
      setDisplayScore(current);

      if (t < 1 && now - lastTickMs > 58) {
        lastTickMs = now;
        playRollTick(t, soundEnabled);
      }

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayScore(target);
        setRevealDone(true);
        playRankFanfare(scoreReport.rank, soundEnabled);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [appPhase, scoreReport, constructionStartedAtMs, reducedMotion, soundEnabled]);

  useEffect(() => {
    if (appPhase !== 'built' || !disasterEvent) {
      setDisasterBannerVisible(false);
      return;
    }
    const delayMs = Math.max(0, Math.round(disasterEvent.startedAtMs - performance.now()));
    setDisasterBannerVisible(false);
    const timer = window.setTimeout(() => {
      setDisasterBannerVisible(true);
      playDisasterSound(disasterEvent.kind, soundEnabled);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [appPhase, disasterEvent, soundEnabled]);

  if (!inspectorOpen) return null;

  const isFaultNode = (status: string) =>
    status === 'collapsed' || status === 'unfinished' || status === 'warning';

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > 2_000_000) {
      setUploadError('ファイルサイズが上限（2MB）を超えています。');
      return;
    }
    try {
      const extracted = await extractDocumentTextInBrowser(file);
      setFileName(extracted.fileName);
      setManuscriptText(extracted.text);
      if (!titleInput.trim()) {
        setTitleInput(file.name.replace(/\.[^.]+$/, ''));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ファイルの読み込みに失敗しました。';
      setUploadError(msg);
    }
  };

  const handleStartVerification = async () => {
    setUploadError(null);
    const trimmed = manuscriptText.trim();
    if (trimmed.length < 40) {
      setUploadError('チェックするには40文字以上の文章を入力またはアップロードしてください。');
      return;
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        const bundle = validateAndSanitizeThesisGraph(parsed);
        loadThesisGraph(bundle.graph, {
          source: 'imported',
          model: null,
          groundingReport: bundle.groundingReport,
        });
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'データ形式が正しくありません';
        setUploadError(`構造データの読み込みエラー: ${msg}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const localGraph = analyzeTextLocally(trimmed, titleInput.trim() || undefined);
      const bundle = validateAndSanitizeThesisGraph(localGraph, trimmed);
      loadThesisGraph(bundle.graph, {
        source: 'sample',
        model: null,
        groundingReport: bundle.groundingReport,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviseNode = async (nodeId: string) => {
    const targetBuilding = blueprint.buildings.find((b) => b.nodeId === nodeId);
    if (!targetBuilding) return;
    setRevising(true);
    setRevisionError(null);
    setRevisionMessage(null);
    try {
      const localEval = evaluateRevisionLocally(revisionDraft.trim());
      applyNodeRevision({
        nodeId,
        revisedText: revisionDraft.trim(),
        evaluation: localEval,
      });
      setRevisionMessage(localEval.repairSummary);
      setEditingNodeId(null);
      if (localEval.updatedStatus === 'healthy') {
        playFixSuccess(soundEnabled);
      }
    } finally {
      setRevising(false);
    }
  };

  const faultCount = blueprint.buildings.filter((b) => isFaultNode(b.status)).length;
  const healthyCount = blueprint.buildings.filter((b) => b.status === 'healthy').length;
  const confirmedCount = blueprint.buildings.filter((b) => confirmedNodeIds[b.nodeId]).length;

  const filteredBuildings = blueprint.buildings.filter((b) => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'faults') return isFaultNode(b.status);
    if (roleFilter === 'healthy') return b.status === 'healthy';
    return b.role === roleFilter;
  });

  const selectedBuilding =
    blueprint.buildings.find((b) => b.nodeId === selectedNodeId) ?? blueprint.buildings[0];
  const selectedEdge = selectedEdgeId
    ? blueprint.bridges.find((e) => e.edgeId === selectedEdgeId) ?? null
    : null;

  const resolveTitle = (id: string) => {
    const found = blueprint.buildings.find((b) => b.nodeId === id);
    return found ? getDisplayTitle(found) : id;
  };

  /* STEP 3: DOPAMINE-MAXIMAL RESULT REVEAL DOCK (UNOBSTRUCTED 3D CITY ABOVE!) */
  if (appPhase === 'built' && scoreReport) {
    const showConfetti = !reducedMotion && revealDone && scoreReport.totalScore >= 58;
    return (
      <>
        {disasterEvent && disasterBannerVisible && (
          <div
            className={`disaster-alert-banner kind-${disasterEvent.kind}`}
            role="status"
            aria-live="polite"
          >
            <div className="disaster-alert-headline">{disasterEvent.headlineJa}</div>
            <div className="disaster-alert-detail">{disasterEvent.detailJa}</div>
          </div>
        )}

        <section
          id="analysis-inspector-panel"
          className="built-dock-overlay"
          aria-label="採点結果と3つの観点評価"
        >
        <div
          className={`built-dock-card rank-glow-${scoreReport.rank.toLowerCase()} ${
            revealDone ? 'is-revealed' : ''
          }`}
        >
          {showConfetti && (
            <div className="confetti-layer" aria-hidden="true">
              {CONFETTI_PIECES.map((c) => (
                <span
                  key={c.id}
                  className="confetti-piece"
                  style={{
                    left: `${c.leftPct}%`,
                    backgroundColor: c.color,
                    animationDelay: `${c.delayMs}ms`,
                    animationDuration: `${c.durationMs}ms`,
                    transform: `rotate(${c.rotateDeg}deg)`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="built-dock-header">
            <div className="built-score-inline">
              <div className={`score-big-number ${revealDone ? 'is-flash' : ''}`}>
                <strong>{displayScore}</strong>
                <span className="score-unit">点 / 100点</span>
              </div>
              <div
                className={`score-rank-badge rank-${scoreReport.rank.toLowerCase()} ${
                  revealDone ? 'is-slam' : ''
                }`}
              >
                ランク {scoreReport.rank}
              </div>
              <div className="rank-title-stack">
                <div className="rank-title-row">
                  <span className="rank-title-pill">{scoreReport.rankTitleJa}</span>
                  {scoreReport.scoreDelta !== null && scoreReport.scoreDelta > 0 && (
                    <span className="score-delta-pill">
                      🚀 前回より +{scoreReport.scoreDelta}点 UP!
                    </span>
                  )}
                </div>
                <p className="built-summary-inline">{scoreReport.summaryJa}</p>
              </div>
            </div>

            <div className="built-header-buttons">
              <button
                type="button"
                className="node-chip-btn"
                onClick={() => returnToVerify()}
              >
                <Edit3 size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
                文章を直して点数を上げる
              </button>
              <button
                type="button"
                className="node-chip-btn"
                onClick={() => replayConstruction()}
              >
                <Play size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
                もう一度建てる
              </button>
              <button
                type="button"
                className="node-chip-btn disaster-trigger-btn is-quake"
                onClick={() => triggerDisaster('earthquake')}
              >
                🌋 地震テスト
              </button>
              <button
                type="button"
                className="node-chip-btn disaster-trigger-btn is-typhoon"
                onClick={() => triggerDisaster('typhoon')}
              >
                🌪️ 台風テスト
              </button>
              <button
                type="button"
                className="node-chip-btn"
                aria-expanded={builtDetailsOpen}
                onClick={() => setBuiltDetailsOpen(!builtDetailsOpen)}
              >
                {builtDetailsOpen ? (
                  <>
                    <ChevronDown size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
                    詳細をたたむ（建物全体を見る）
                  </>
                ) : (
                  <>
                    <ChevronUp size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
                    3つの観点・8要素の詳細を開く
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Unlocked Achievement Badges */}
          <div className="badges-row" aria-label="獲得した称号バッジ">
            {scoreReport.badges.map((badge, idx) => (
              <div
                key={badge.id}
                className={`achievement-badge tier-${badge.tier} ${revealDone ? 'is-pop' : ''}`}
                style={{ animationDelay: `${idx * 90}ms` }}
              >
                <span className="badge-icon" aria-hidden="true">
                  {badge.icon}
                </span>
                <span className="badge-label">{badge.label}</span>
                <span className="badge-detail">{badge.detail}</span>
              </div>
            ))}
          </div>

          {builtDetailsOpen && (
            <div className="built-expanded-body">
              {/* 3 Perspectives Grid */}
              <div className="perspectives-grid" style={{ marginBottom: 12 }}>
                {scoreReport.perspectives.map((p) => (
                  <div key={p.id} className="perspective-card">
                    <div className="perspective-top">
                      <span className="perspective-title">{p.title}</span>
                      <span className={`perspective-grade grade-${p.grade}`}>
                        {p.grade} ({p.score}点)
                      </span>
                    </div>
                    <div className="confidence-track" style={{ marginBottom: 6 }}>
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${p.score}%`,
                          backgroundColor:
                            p.score >= 70 ? '#48D7BA' : p.score >= 50 ? '#E3B86B' : '#FF594F',
                        }}
                      />
                    </div>
                    <div className="perspective-good">
                      <strong>良い点:</strong> {p.strengthJa}
                    </div>
                    <div className="perspective-advice">
                      <strong>改善点:</strong> {p.adviceJa}
                    </div>
                  </div>
                ))}
              </div>

              <div className="substats-section">
                <h3 className="panel-section-heading">8要素 精密診断ステータス（各100点満点）</h3>
                <div className="substats-grid">
                  {scoreReport.subStats.map((stat) => (
                    <div key={stat.id} className="substat-item">
                      <div className="substat-label-row">
                        <span>{stat.label}</span>
                        <strong className="mono">{stat.score}</strong>
                      </div>
                      <div className="confidence-track">
                        <div
                          className="confidence-fill"
                          style={{
                            width: `${stat.score}%`,
                            backgroundColor:
                              stat.score >= 78
                                ? '#48D7BA'
                                : stat.score >= 55
                                  ? '#E3B86B'
                                  : '#FF594F',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="built-expanded-cols">
                <div>
                  <h3 className="panel-section-heading">建設された建物一覧（クリックでズーム）</h3>
                  <div className="node-list-box" role="region" aria-label="建物リスト">
                    {blueprint.buildings.map((b) => {
                      const bStatus = STATUS_META_JA[b.status];
                      const isFault = isFaultNode(b.status);
                      const active = !selectedEdge && b.nodeId === selectedBuilding.nodeId;
                      return (
                        <button
                          key={b.nodeId}
                          type="button"
                          data-node-id={b.nodeId}
                          className={`node-list-row ${isFault ? 'is-fault' : ''}`}
                          aria-pressed={active}
                          onClick={() => focusBuilding(b.nodeId)}
                        >
                          <span className={`row-status-badge ${b.status}`}>{bStatus.shortLabel}</span>
                          <span className="row-title-text">{getDisplayTitle(b)}</span>
                          <span className="row-role-pill">{ROLE_LABEL_JA[b.role]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  {selectedEdge ? (
                    <section className="detail-block" aria-label="選択中のつながり">
                      <div className="node-code-row">
                        <span className="role-pill-label">
                          {EDGE_REL_JA[selectedEdge.relationshipType]}
                        </span>
                        <span
                          className={`status-tag ${
                            selectedEdge.status === 'intact'
                              ? 'healthy'
                              : selectedEdge.status === 'unstable'
                                ? 'warning'
                                : 'collapsed'
                          }`}
                        >
                          {EDGE_STATUS_JA[selectedEdge.status]}
                        </span>
                      </div>
                      <h3 className="node-title-h2">
                        {resolveTitle(selectedEdge.sourceId)} → {resolveTitle(selectedEdge.targetId)}
                      </h3>
                      <p className="issue-body">{selectedEdge.explanation}</p>
                    </section>
                  ) : (
                    <section className="detail-block" aria-label="選択中の建物詳細">
                      <div className="node-code-row">
                        <span className="role-pill-label">{ROLE_LABEL_JA[selectedBuilding.role]}</span>
                        <span className={`status-tag ${selectedBuilding.status}`}>
                          {STATUS_META_JA[selectedBuilding.status].label}
                        </span>
                      </div>
                      <h3 className="node-title-h2">{getDisplayTitle(selectedBuilding)}</h3>
                      <blockquote className="verbatim-quote" style={{ marginTop: 6 }}>
                        {selectedBuilding.node.sourceText}
                      </blockquote>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="node-chip-btn"
                          onClick={() => focusBuilding(selectedBuilding.nodeId)}
                        >
                          <Crosshair
                            size={12}
                            style={{ verticalAlign: 'middle', marginRight: 4 }}
                            aria-hidden="true"
                          />
                          この建物に寄る
                        </button>
                        {revisionHistory.length > 0 && (
                          <button
                            type="button"
                            className="node-chip-btn"
                            onClick={() => undoLastRevision()}
                          >
                            <Undo2
                              size={12}
                              style={{ verticalAlign: 'middle', marginRight: 4 }}
                              aria-hidden="true"
                            />
                            元に戻す
                          </button>
                        )}
                        <button
                          type="button"
                          className="node-chip-btn"
                          onClick={() => resetToUpload()}
                        >
                          <RotateCcw
                            size={12}
                            style={{ verticalAlign: 'middle', marginRight: 4 }}
                            aria-hidden="true"
                          />
                          別の文章をチェック
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      </>
    );
  }

  /* STEP 1 & STEP 2: CENTERED FLOATING WORKSPACE OVER THE LIVING 3D CITY */
  return (
    <div className="center-workspace-overlay">
      <aside
        id="analysis-inspector-panel"
        className={`center-workspace-card ${appPhase === 'verify' ? 'is-wide' : ''}`}
        aria-label="卒論・レポート検証パネル"
      >
        {/* STEP 1: CENTERED UPLOAD / INPUT */}
        {appPhase === 'upload' && (
          <div ref={panelScrollRef} className="panel-scroll">
            <div className="step-intro-box">
              <div className="step-badge-row">
                <span className="step-badge">ステップ 1 / 3</span>
                <span className="local-privacy-pill">APIキー不要・ブラウザ完結（外部送信なし）</span>
              </div>
              <h2 className="step-heading">卒論・レポートをアップロードまたは入力</h2>
              <p className="step-desc">
                文章を読み込むと、<strong>12項目の精密ルール</strong>から <strong>① 論理の一貫性</strong>・<strong>② 根拠の説得力</strong>・<strong>③ 構成のわかりやすさ</strong> と <strong>8要素ステータス</strong> を即時診断し、採点後に中央の広場へ建物が建ちます。
              </p>
            </div>

            <div className="upload-drop-area">
              <input
                ref={fileInputRef}
                id="manuscript-file-upload"
                type="file"
                aria-label="ファイルを選択"
                tabIndex={-1}
                accept=".txt,.md,.docx,.json,text/plain,text/markdown,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only-input"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="file-pick-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp size={16} aria-hidden="true" />
                <span>
                  {fileName ? `読み込み済み: ${fileName}` : 'ファイルを選ぶ（.txt / .docx / .md）'}
                </span>
              </button>
              <div className="upload-sub-hint">
                ワード文書（.docx）やテキストに対応。または下の欄へ直接打ち込む・貼り付けてください。
              </div>
            </div>

            <div>
              <span className="form-field-label">すぐ試せるサンプル（クリックで自動入力）</span>
              <div className="sample-btn-row">
                {REPORT_DRAFTS.map((draft) => (
                  <button
                    key={draft.id}
                    type="button"
                    className="node-chip-btn"
                    onClick={() => {
                      setTitleInput(draft.title);
                      setManuscriptText(draft.text);
                      setFileName(null);
                      setUploadError(null);
                    }}
                  >
                    {draft.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="node-chip-btn"
                  onClick={() => resetToSampleThesis()}
                >
                  詳細サンプルへ進む
                </button>
              </div>
            </div>

            <div className="upload-inline-fields">
              <label htmlFor="thesis-title-input" className="form-field-label">
                タイトル（任意）
              </label>
              <input
                id="thesis-title-input"
                type="text"
                className="hud-input"
                placeholder="例：大学生の睡眠時間と集中力に関するレポート"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="manuscript-textarea" className="form-field-label">
                  卒論・レポートの本文（40文字以上）
                </label>
                <span className="mono" style={{ fontSize: 11, color: '#8996A3' }}>
                  {manuscriptText.length.toLocaleString()} 文字
                </span>
              </div>
              <textarea
                id="manuscript-textarea"
                className="hud-textarea"
                rows={6}
                placeholder="ここに卒論やレポートの文章を打ち込むか、貼り付けてください..."
                value={manuscriptText}
                onChange={(e) => setManuscriptText(e.target.value)}
              />
            </div>

            {uploadError && (
              <div className="modal-feedback is-error" role="alert">
                {uploadError}
              </div>
            )}

            <button
              type="button"
              className="primary-cta-btn"
              disabled={submitting}
              onClick={handleStartVerification}
            >
              <Sparkles size={16} aria-hidden="true" />
              <span>
                {submitting
                  ? '3つの観点から文章をチェックしています...'
                  : '文章の矛盾・整合性をチェックする →'}
              </span>
            </button>
          </div>
        )}

        {/* STEP 2: CENTERED 3-PERSPECTIVE EVALUATION & INTERACTIVE EDITING */}
        {appPhase === 'verify' && (
          <div ref={panelScrollRef} className="panel-scroll">
            <div className="step-intro-box">
              <span className="step-badge">ステップ 2 / 3</span>
              <h2 className="step-heading">3つの観点からの診断と文章の修正</h2>
              <p className="step-desc">
                文章の良い点と改善ポイントを確認し、気になる箇所はその場で書き直せます。確認が終わったら下のボタンで採点・建築へ進んでください。
              </p>
              <div className="verify-stat-strip">
                <span className="verify-stat is-danger">要確認・矛盾: {faultCount}件</span>
                <span className="verify-stat is-ok">整合OK: {healthyCount}件</span>
                <span className="verify-stat">
                  チェック済: {confirmedCount}/{blueprint.buildings.length}
                </span>
              </div>
            </div>

            {/* Live 3-Perspective Quality Assessment */}
            <div>
              <h3 className="panel-section-heading">3つの観点による文章評価（リアルタイム更新）</h3>
              <div className="perspectives-grid">
                {livePreviewReport.perspectives.map((p) => (
                  <div key={p.id} className="perspective-card">
                    <div className="perspective-top">
                      <span className="perspective-title">{p.title}</span>
                      <span className={`perspective-grade grade-${p.grade}`}>
                        {p.grade} ({p.score}点)
                      </span>
                    </div>
                    <div className="confidence-track" style={{ marginBottom: 6 }}>
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${p.score}%`,
                          backgroundColor:
                            p.score >= 70 ? '#48D7BA' : p.score >= 50 ? '#E3B86B' : '#FF594F',
                        }}
                      />
                    </div>
                    <div className="perspective-good">
                      <strong>良い点:</strong> {p.strengthJa}
                    </div>
                    <div className="perspective-advice">
                      <strong>改善点:</strong> {p.adviceJa}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="filter-strip" role="group" aria-label="項目の絞り込み">
              <button
                type="button"
                className="filter-btn"
                aria-pressed={roleFilter === 'all'}
                onClick={() => setRoleFilter('all')}
              >
                すべて ({blueprint.buildings.length})
              </button>
              <button
                type="button"
                className="filter-btn is-fault"
                aria-pressed={roleFilter === 'faults'}
                onClick={() => setRoleFilter('faults')}
              >
                矛盾・問題あり ({faultCount})
              </button>
              <button
                type="button"
                className="filter-btn"
                aria-pressed={roleFilter === 'healthy'}
                onClick={() => setRoleFilter('healthy')}
              >
                問題なし ({healthyCount})
              </button>
            </div>

            {revisionMessage && (
              <div className="modal-feedback is-ok" role="status">
                修正を反映しました: {revisionMessage}
              </div>
            )}

            <div className="verify-cards-stack">
              {filteredBuildings.map((b) => {
                const statusMeta = STATUS_META_JA[b.status];
                const isConfirmed = Boolean(confirmedNodeIds[b.nodeId]);
                const isEditing = editingNodeId === b.nodeId;
                const isSelected = selectedNodeId === b.nodeId;

                return (
                  <article
                    key={b.nodeId}
                    data-node-id={b.nodeId}
                    className={`verify-item-card ${isFaultNode(b.status) ? 'is-fault' : ''} ${
                      isSelected ? 'is-selected' : ''
                    }`}
                    onClick={() => selectNode(b.nodeId)}
                  >
                    <div className="node-code-row">
                      <span className="role-pill-label">{ROLE_LABEL_JA[b.role]}</span>
                      <span className={`status-tag ${b.status}`}>{statusMeta.label}</span>
                    </div>

                    <h3 className="verify-card-title">{getDisplayTitle(b)}</h3>
                    <blockquote className="verbatim-quote">{b.node.sourceText}</blockquote>

                    {b.node.issues.length > 0 ? (
                      <div className="verify-issues-list">
                        {b.node.issues.map((issue) => (
                          <div key={issue.id} className="verify-issue-box">
                            <div className="issue-heading-h3">
                              <AlertTriangle
                                size={12}
                                style={{ verticalAlign: 'middle', marginRight: 4 }}
                                aria-hidden="true"
                              />
                              {ISSUE_CATEGORY_JA[issue.issueCategory]}
                            </div>
                            <p className="issue-body">{issue.rationale}</p>
                            <div className="issue-sublabel">改善のヒント</div>
                            <p className="issue-body" style={{ marginBottom: 6 }}>
                              {issue.suggestedRevision}
                            </p>
                            <button
                              type="button"
                              className="node-chip-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNodeId(b.nodeId);
                                setRevisionDraft(issue.suggestedRevision);
                                setRevisionError(null);
                              }}
                            >
                              <Lightbulb
                                size={11}
                                style={{ verticalAlign: 'middle', marginRight: 4 }}
                                aria-hidden="true"
                              />
                              この改善案で文章を直す
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="verify-good-note">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        <span>この箇所は論理の筋が通っており良好です。</span>
                      </div>
                    )}

                    <div className="verify-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="node-chip-btn"
                        aria-expanded={isEditing}
                        onClick={() => {
                          if (isEditing) {
                            setEditingNodeId(null);
                          } else {
                            setEditingNodeId(b.nodeId);
                            setRevisionDraft(b.node.sourceText);
                            setRevisionError(null);
                          }
                        }}
                      >
                        <Edit3
                          size={11}
                          style={{ verticalAlign: 'middle', marginRight: 4 }}
                          aria-hidden="true"
                        />
                        {isEditing ? '編集を閉じる' : '文章を直して再チェック'}
                      </button>

                      <button
                        type="button"
                        className={`confirm-toggle-btn ${isConfirmed ? 'is-confirmed' : ''}`}
                        aria-pressed={isConfirmed}
                        onClick={() => toggleNodeConfirmed(b.nodeId)}
                      >
                        <Check size={12} aria-hidden="true" />
                        <span>{isConfirmed ? '確認済み' : '確認済みにする'}</span>
                      </button>
                    </div>

                    {isEditing && (
                      <div className="revision-editor-panel" onClick={(e) => e.stopPropagation()}>
                        <label htmlFor="node-revision-textarea" className="form-field-label">
                          修正後の文章を入力
                        </label>
                        <textarea
                          id="node-revision-textarea"
                          className="hud-textarea revision-textarea"
                          rows={3}
                          value={revisionDraft}
                          onChange={(e) => setRevisionDraft(e.target.value)}
                        />
                        <button
                          type="button"
                          className="focus-3d-btn"
                          style={{ marginTop: 0 }}
                          disabled={revising || revisionDraft.trim().length < 15}
                          onClick={() => handleReviseNode(b.nodeId)}
                        >
                          <Sparkles size={13} aria-hidden="true" />
                          <span>{revising ? '再チェック中...' : '再診断して整合性を更新'}</span>
                        </button>
                        {revisionError && (
                          <div className="modal-feedback is-error" role="alert" style={{ marginTop: 6 }}>
                            {revisionError}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="overall-check-box">
              <h3 className="panel-section-heading">最終確認チェックリスト（クリックして確認）</h3>
              <label className="check-row-label">
                <input
                  type="checkbox"
                  checked={checklistChecks.noContradiction}
                  onChange={() => toggleChecklistCheck('noContradiction')}
                />
                <span>章や段落のあいだで結論の矛盾がないか確認した</span>
              </label>
              <label className="check-row-label">
                <input
                  type="checkbox"
                  checked={checklistChecks.causalCheck}
                  onChange={() => toggleChecklistCheck('causalCheck')}
                />
                <span>相関関係を直接の原因と決めつけていないか確認した</span>
              </label>
              <label className="check-row-label">
                <input
                  type="checkbox"
                  checked={checklistChecks.evidenceVerified}
                  onChange={() => toggleChecklistCheck('evidenceVerified')}
                />
                <span>主張を支えるデータや調査対象の範囲を確認した</span>
              </label>
            </div>

            <button
              type="button"
              className="primary-cta-btn"
              onClick={() => finalizeAndBuildCity()}
            >
              <Building2 size={17} aria-hidden="true" />
              <span>検証を完了して点数を出す（建物を建てる）→</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
