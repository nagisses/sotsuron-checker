import { IssueCategory, RelationshipType, ThesisNode, ToulminRole } from '../types/thesis';

export const ROLE_LABEL_JA: Record<ToulminRole, string> = {
  claim: '主張',
  grounds: '根拠データ',
  warrant: '理由づけ',
  backing: '裏付け',
  qualifier: '前提・条件',
  rebuttal: '反論への備え',
};

export const STATUS_META_JA: Record<
  ThesisNode['status'],
  { label: string; shortLabel: string; dot: string }
> = {
  healthy: { label: '問題なし', shortLabel: '良好', dot: '●' },
  warning: { label: '要注意', shortLabel: '注意', dot: '▲' },
  collapsed: { label: '要修正（崩壊）', shortLabel: '要修正', dot: '■' },
  unfinished: { label: '根拠不足', shortLabel: '不足', dot: '■' },
};

export const ISSUE_CATEGORY_JA: Record<IssueCategory | 'none', string> = {
  none: '問題なし',
  logical_leap: '論理の飛躍',
  insufficient_grounds: '根拠データの不足',
  contradiction: '論理の矛盾',
  correlation_causation: '相関と因果の混同',
  missing_rebuttal: '反論への配慮不足',
  unclear_source: '出典・根拠が不明確',
  overgeneralization: '過度な一般化',
};

export const EDGE_REL_JA: Record<RelationshipType, string> = {
  supports: '根拠として支える',
  warrants: '理由づけて結ぶ',
  backs: '基準として裏付け',
  qualifies: '範囲・条件を限定',
  rebuts: '反論に対処する',
  contradicts: '矛盾・緊張あり',
  missing_link: 'つながり欠落',
};

export const EDGE_STATUS_JA: Record<'intact' | 'unstable' | 'severed', string> = {
  intact: '正常',
  unstable: '不安定',
  severed: '断絶',
};

export function getDisplayTitle(item: { titleJa?: string; title: string }): string {
  return item.titleJa?.trim() ? item.titleJa : item.title;
}
