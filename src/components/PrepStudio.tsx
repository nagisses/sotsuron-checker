import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCopy,
  Compass,
  FileText,
  Layers,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  PREP_PRESETS,
  ResearchAngle,
  SOURCE_KIND_META,
  SourceKind,
  assembleDraftFromPrep,
  createInitialPrepState,
  evaluatePrepReadiness,
  generateThemeCandidates,
} from '../engine/prepBuilder';
import { useThesisStore } from '../store/useThesisStore';

type PrepTab = 'theme' | 'sources' | 'outline';

export function PrepStudio() {
  const prepState = useThesisStore((s) => s.prepState);
  const setPrepState = useThesisStore((s) => s.setPrepState);
  const applyPrepToDraft = useThesisStore((s) => s.applyPrepToDraft);
  const goToUploadDirect = useThesisStore((s) => s.goToUploadDirect);

  const [activeTab, setActiveTab] = useState<PrepTab>('theme');
  const [newSourceKind, setNewSourceKind] = useState<SourceKind>('data');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceNote, setNewSourceNote] = useState('');
  const [newSourceCitation, setNewSourceCitation] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  const readiness = useMemo(() => evaluatePrepReadiness(prepState), [prepState]);
  const candidates = useMemo(
    () => generateThemeCandidates(prepState.field, prepState.target, prepState.angle),
    [prepState.field, prepState.target, prepState.angle],
  );

  const handleAddSource = () => {
    if (newSourceNote.trim().length < 4) return;
    const nextSource = {
      id: `src-${Date.now()}`,
      kind: newSourceKind,
      title: newSourceTitle.trim() || SOURCE_KIND_META[newSourceKind].label,
      note: newSourceNote.trim(),
      citation: newSourceCitation.trim(),
    };
    setPrepState({
      ...prepState,
      sources: [...prepState.sources, nextSource],
    });
    setNewSourceTitle('');
    setNewSourceNote('');
    setNewSourceCitation('');
  };

  const handleRemoveSource = (id: string) => {
    setPrepState({
      ...prepState,
      sources: prepState.sources.filter((s) => s.id !== id),
      chapters: prepState.chapters.map((ch) => ({
        ...ch,
        linkedSourceIds: ch.linkedSourceIds.filter((sid) => sid !== id),
      })),
    });
  };

  const handleToggleChapterSource = (chapterId: string, sourceId: string) => {
    setPrepState({
      ...prepState,
      chapters: prepState.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch;
        const exists = ch.linkedSourceIds.includes(sourceId);
        return {
          ...ch,
          linkedSourceIds: exists
            ? ch.linkedSourceIds.filter((id) => id !== sourceId)
            : [...ch.linkedSourceIds, sourceId],
        };
      }),
    });
  };

  const handleCopyOutline = async () => {
    const assembled = assembleDraftFromPrep(prepState);
    const copyText = `【タイトル】\n${assembled.title}\n\n【問い（RQ）】\n${prepState.researchQuestion || '未設定'}\n\n【構成・本文ドラフト】\n${assembled.text}`;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedNotice(true);
      window.setTimeout(() => setCopiedNotice(false), 1800);
    } catch {
      // Clipboard unavailable in headless/restricted context
    }
  };

  const handleProceedToDraft = () => {
    const assembled = assembleDraftFromPrep(prepState);
    applyPrepToDraft(assembled.title, assembled.text);
  };

  return (
    <div className="panel-scroll">
      <div className="step-intro-box">
        <div className="step-badge-row">
          <span className="step-badge">ステップ 1 / 4（書き出すまでスタジオ）</span>
          <span className="local-privacy-pill">APIキー不要・自動保存（ブラウザ完結）</span>
        </div>
        <h2 className="step-heading">テーマ決め・資料整理・構成づくりをここで一気に完成</h2>
        <p className="step-desc">
          「何を書くか迷う…」から卒業！ <strong>① テーマ決め → ② 資料整理 → ③ 構成づくり</strong> を埋めるだけで本文ドラフトを自動生成し、そのまま整合性チェック＆3D建物建設・災害テストへ進めます。
        </p>

        <div className="prep-top-actions">
          <div className="sample-btn-row">
            {PREP_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="node-chip-btn"
                onClick={() => setPrepState(structuredClone(preset.state))}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              className="node-chip-btn"
              onClick={() => setPrepState(createInitialPrepState())}
            >
              白紙に戻す
            </button>
          </div>
          <button
            type="button"
            className="prep-skip-btn"
            onClick={() => goToUploadDirect()}
          >
            <FileText size={13} aria-hidden="true" />
            <span>すでに文章がある方（直接アップロード・貼り付けへ →）</span>
          </button>
        </div>
      </div>

      {/* Live Prep Readiness Bar */}
      <div className="prep-readiness-box">
        <div className="prep-readiness-top">
          <span className="prep-readiness-label">書き出し準備の完成度</span>
          <strong className="mono" style={{ color: readiness.score >= 70 ? '#48D7BA' : '#E3B86B' }}>
            {readiness.score}%
          </strong>
        </div>
        <div className="confidence-track" style={{ marginBottom: 6 }}>
          <div
            className="confidence-fill"
            style={{
              width: `${readiness.score}%`,
              backgroundColor:
                readiness.score >= 75 ? '#48D7BA' : readiness.score >= 45 ? '#E3B86B' : '#FF594F',
            }}
          />
        </div>
        <div className="prep-checks-strip">
          <span className={`verify-stat ${readiness.hasTheme ? 'is-ok' : ''}`}>
            {readiness.hasTheme ? '✓ テーマ＆問い' : '○ テーマ＆問い'}
          </span>
          <span className={`verify-stat ${readiness.hasDataOrSurvey ? 'is-ok' : ''}`}>
            {readiness.hasDataOrSurvey ? '✓ データ・調査' : '○ データ・調査'}
          </span>
          <span className={`verify-stat ${readiness.hasCounter ? 'is-ok' : ''}`}>
            {readiness.hasCounter ? '✓ 反論・限界' : '○ 反論・限界'}
          </span>
          <span className={`verify-stat ${readiness.filledChapters >= 3 ? 'is-ok' : ''}`}>
            章構成: {readiness.filledChapters}/4章
          </span>
        </div>
      </div>

      {/* 3 Sub-Tabs for Pre-Writing Studio */}
      <div className="prep-subtabs" role="tablist" aria-label="書き出すまでの3ステップ">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'theme'}
          className={`prep-subtab-btn ${activeTab === 'theme' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('theme')}
        >
          <Compass size={14} aria-hidden="true" />
          <span>1. テーマ決め</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sources'}
          className={`prep-subtab-btn ${activeTab === 'sources' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('sources')}
        >
          <BookOpen size={14} aria-hidden="true" />
          <span>2. 資料整理 ({prepState.sources.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'outline'}
          className={`prep-subtab-btn ${activeTab === 'outline' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('outline')}
        >
          <Layers size={14} aria-hidden="true" />
          <span>3. 構成づくり ({readiness.filledChapters}/4)</span>
        </button>
      </div>

      {/* TAB 1: THEME & RESEARCH QUESTION BUILDER */}
      {activeTab === 'theme' && (
        <div className="prep-tab-panel">
          <div className="prep-grid-2">
            <div>
              <label htmlFor="prep-field-input" className="form-field-label">
                気になるキーワード・テーマ分野
              </label>
              <input
                id="prep-field-input"
                type="text"
                className="hud-input"
                placeholder="例：生成AIの活用、睡眠とスマホ、推し活消費"
                value={prepState.field}
                onChange={(e) => setPrepState({ ...prepState, field: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="prep-target-input" className="form-field-label">
                調べる対象
              </label>
              <input
                id="prep-target-input"
                type="text"
                className="hud-input"
                placeholder="例：大学生、高校生、地方自治体"
                value={prepState.target}
                onChange={(e) => setPrepState({ ...prepState, target: e.target.value })}
              />
            </div>
          </div>

          <div>
            <span className="form-field-label">研究の切り口</span>
            <div className="sample-btn-row">
              {(
                [
                  { id: 'impact', label: '影響を調べる' },
                  { id: 'compare', label: '2つの群を比較する' },
                  { id: 'proposal', label: '課題を分析して改善策を提案' },
                ] as { id: ResearchAngle; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="filter-btn"
                  aria-pressed={prepState.angle === opt.id}
                  onClick={() => setPrepState({ ...prepState, angle: opt.id })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="form-field-label">自動提案されたテーマ案（クリックで採用）</span>
            <div className="theme-candidates-list">
              {candidates.map((cand) => {
                const selected = prepState.selectedTitle === cand.title;
                return (
                  <button
                    key={cand.id}
                    type="button"
                    className={`theme-candidate-card ${selected ? 'is-selected' : ''}`}
                    onClick={() =>
                      setPrepState({
                        ...prepState,
                        selectedTitle: cand.title,
                        researchQuestion: cand.researchQuestion,
                        hypothesis: cand.hypothesis,
                      })
                    }
                  >
                    <div className="theme-cand-title">
                      {selected && <CheckCircle2 size={13} aria-hidden="true" />}
                      <span>{cand.title}</span>
                    </div>
                    <div className="theme-cand-rq">問い：{cand.researchQuestion}</div>
                    <div className="theme-cand-tip">{cand.tipJa}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="prep-grid-1">
            <div>
              <label htmlFor="prep-selected-title" className="form-field-label">
                決定タイトル（自由に書き換えOK）
              </label>
              <input
                id="prep-selected-title"
                type="text"
                className="hud-input"
                placeholder="上の案をクリックするか、自分でタイトルを入力"
                value={prepState.selectedTitle}
                onChange={(e) => setPrepState({ ...prepState, selectedTitle: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="prep-rq-input" className="form-field-label">
                中心となる問い（リサーチ・クエスチョン）
              </label>
              <input
                id="prep-rq-input"
                type="text"
                className="hud-input"
                placeholder="例：〇〇は△△にどのような影響を与えているのか？"
                value={prepState.researchQuestion}
                onChange={(e) => setPrepState({ ...prepState, researchQuestion: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="prep-hyp-input" className="form-field-label">
                現時点の仮説（任意）
              </label>
              <input
                id="prep-hyp-input"
                type="text"
                className="hud-input"
                placeholder="例：〇〇の条件が揃うときに△△が高まると予想される"
                value={prepState.hypothesis}
                onChange={(e) => setPrepState({ ...prepState, hypothesis: e.target.value })}
              />
            </div>
          </div>

          <div className="prep-tab-footer">
            <button
              type="button"
              className="primary-cta-btn"
              onClick={() => setActiveTab('sources')}
            >
              <span>次へ：② 資料・メモ整理へ進む</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: EVIDENCE & SOURCE MEMO ORGANIZER */}
      {activeTab === 'sources' && (
        <div className="prep-tab-panel">
          <div className="source-add-card">
            <span className="form-field-label">新しい資料・メモカードを追加</span>
            <div className="sample-btn-row" style={{ marginBottom: 8 }}>
              {(Object.keys(SOURCE_KIND_META) as SourceKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="filter-btn"
                  aria-pressed={newSourceKind === k}
                  onClick={() => setNewSourceKind(k)}
                >
                  {SOURCE_KIND_META[k].badge}
                </button>
              ))}
            </div>
            <div className="prep-grid-2" style={{ marginBottom: 8 }}>
              <input
                type="text"
                className="hud-input"
                aria-label="資料のラベル"
                placeholder="ラベル（例：学内アンケート、佐藤2024）"
                value={newSourceTitle}
                onChange={(e) => setNewSourceTitle(e.target.value)}
              />
              <input
                type="text"
                className="hud-input"
                aria-label="出典・調査条件"
                placeholder="出典・人数など（例：2025年調査 N=120）"
                value={newSourceCitation}
                onChange={(e) => setNewSourceCitation(e.target.value)}
              />
            </div>
            <textarea
              className="hud-textarea"
              rows={2}
              aria-label="資料の要点メモ"
              placeholder={SOURCE_KIND_META[newSourceKind].placeholder}
              value={newSourceNote}
              onChange={(e) => setNewSourceNote(e.target.value)}
            />
            <button
              type="button"
              className="node-chip-btn"
              style={{ marginTop: 8 }}
              disabled={newSourceNote.trim().length < 4}
              onClick={handleAddSource}
            >
              <Plus size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
              資料カードを追加
            </button>
          </div>

          {prepState.sources.length === 0 ? (
            <div className="prep-empty-note">
              まだ資料カードがありません。数値データや先行研究、反論・限界のメモを1〜3件入れると構成が一気に強くなります。
            </div>
          ) : (
            <div className="source-cards-list">
              {prepState.sources.map((src) => (
                <div key={src.id} className={`source-memo-card kind-${src.kind}`}>
                  <div className="source-memo-top">
                    <span className="role-pill-label">{SOURCE_KIND_META[src.kind].badge}</span>
                    <strong className="source-memo-title">{src.title}</strong>
                    <button
                      type="button"
                      className="source-del-btn"
                      aria-label={`${src.title}を削除`}
                      onClick={() => handleRemoveSource(src.id)}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="source-memo-body">{src.note}</p>
                  {src.citation && <div className="source-memo-cite">出典・条件：{src.citation}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="prep-tab-footer">
            <button
              type="button"
              className="primary-cta-btn"
              onClick={() => setActiveTab('outline')}
            >
              <span>次へ：③ 構成づくりへ進む</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CHAPTER OUTLINE BUILDER */}
      {activeTab === 'outline' && (
        <div className="prep-tab-panel">
          <div className="outline-chapters-list">
            {prepState.chapters.map((ch) => (
              <div key={ch.id} className="chapter-outline-card">
                <div className="chapter-header-row">
                  <strong className="chapter-title">{ch.chapterLabel}</strong>
                  <span className="chapter-hint">{ch.roleHint}</span>
                </div>
                <textarea
                  className="hud-textarea"
                  rows={2}
                  aria-label={ch.chapterLabel}
                  placeholder="この章で書く要点（1〜2文でOK）"
                  value={ch.summary}
                  onChange={(e) =>
                    setPrepState({
                      ...prepState,
                      chapters: prepState.chapters.map((item) =>
                        item.id === ch.id ? { ...item, summary: e.target.value } : item,
                      ),
                    })
                  }
                />
                {prepState.sources.length > 0 && (
                  <div className="chapter-source-tags">
                    <span className="chapter-source-label">使う資料を紐づけ：</span>
                    {prepState.sources.map((src) => {
                      const linked = ch.linkedSourceIds.includes(src.id);
                      return (
                        <button
                          key={src.id}
                          type="button"
                          className={`chapter-src-pill ${linked ? 'is-linked' : ''}`}
                          aria-pressed={linked}
                          onClick={() => handleToggleChapterSource(ch.id, src.id)}
                        >
                          {linked ? '✓ ' : '+ '}
                          {src.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {readiness.hintsJa.length > 0 && (
            <div className="prep-hints-box">
              {readiness.hintsJa.map((h, i) => (
                <div key={i} className="prep-hint-line">
                  ・{h}
                </div>
              ))}
            </div>
          )}

          <div className="prep-final-actions">
            <button type="button" className="node-chip-btn" onClick={handleCopyOutline}>
              <ClipboardCopy size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
              {copiedNotice ? '構成メモをコピーしました！' : '構成メモをコピー'}
            </button>
            <button
              type="button"
              className="primary-cta-btn"
              onClick={handleProceedToDraft}
            >
              <Sparkles size={16} aria-hidden="true" />
              <span>この構成から本文ドラフトを作成して次へ →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
