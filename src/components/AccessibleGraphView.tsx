import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useThesisStore } from '../store/useThesisStore';
import {
  ISSUE_CATEGORY_JA,
  ROLE_LABEL_JA,
  STATUS_META_JA,
  getDisplayTitle,
} from '../utils/labels';

export function AccessibleGraphView() {
  const accessibleViewOpen = useThesisStore((s) => s.accessibleViewOpen);
  const setAccessibleViewOpen = useThesisStore((s) => s.setAccessibleViewOpen);
  const blueprint = useThesisStore((s) => s.blueprint);
  const focusBuilding = useThesisStore((s) => s.focusBuilding);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (accessibleViewOpen) {
      closeBtnRef.current?.focus();
    }
  }, [accessibleViewOpen]);

  useEffect(() => {
    if (!accessibleViewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccessibleViewOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [accessibleViewOpen, setAccessibleViewOpen]);

  if (!accessibleViewOpen) return null;

  return (
    <div
      className="a11y-graph-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-graph-title"
    >
      <div className="a11y-graph-dialog">
        <div className="a11y-dialog-header">
          <div>
            <h2 id="a11y-graph-title" className="node-title-h2" style={{ margin: 0 }}>
              論理構造の一覧表（{blueprint.buildings.length}項目）
            </h2>
            <p className="node-title-ja" style={{ margin: '2px 0 0 0' }}>
              立体マップ上の主張・根拠・弱点を一覧で確認し、クリックで移動できます
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="hud-toggle-btn"
            title="一覧表を閉じる"
            onClick={() => setAccessibleViewOpen(false)}
          >
            <X size={14} aria-hidden="true" />
            <span>閉じる</span>
          </button>
        </div>

        <div className="a11y-dialog-body">
          <table className="a11y-table">
            <thead>
              <tr>
                <th>種別</th>
                <th>状態</th>
                <th>タイトル・抜粋</th>
                <th>指摘された問題</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {blueprint.buildings.map((b) => {
                const statusMeta = STATUS_META_JA[b.status];
                return (
                  <tr key={b.nodeId}>
                    <td>{ROLE_LABEL_JA[b.role]}</td>
                    <td>
                      <span className={`status-tag ${b.status}`}>{statusMeta.label}</span>
                    </td>
                    <td>
                      <strong>{getDisplayTitle(b)}</strong>
                      <div style={{ color: '#8996A3', marginTop: 4 }}>{b.node.sourceText}</div>
                    </td>
                    <td>
                      {b.node.issues.length > 0 ? (
                        <div style={{ color: '#FF594F' }}>
                          {b.node.issues.map((i) => ISSUE_CATEGORY_JA[i.issueCategory]).join('、')}
                        </div>
                      ) : (
                        <span style={{ color: '#48D7BA' }}>問題なし</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="node-chip-btn"
                        onClick={() => {
                          focusBuilding(b.nodeId);
                          setAccessibleViewOpen(false);
                        }}
                      >
                        この建物を見る
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
