import { CityBlueprint } from '../types/thesis';

export type ScoreRank = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';
export type PerspectiveGrade = '優' | '良' | '可' | '要改善';

export interface EvaluationPerspective {
  id: 'consistency' | 'evidence' | 'coherence';
  title: string;
  score: number;
  grade: PerspectiveGrade;
  strengthJa: string;
  adviceJa: string;
}

export interface SubStatItem {
  id: string;
  label: string;
  score: number;
}

export interface AchievementBadge {
  id: string;
  icon: string;
  label: string;
  detail: string;
  tier: 'gold' | 'cyan' | 'fire';
}

export interface ThesisScoreReport {
  totalScore: number;
  rank: ScoreRank;
  rankTitleJa: string;
  consistencyScore: number;
  evidenceScore: number;
  coherenceScore: number;
  perspectives: EvaluationPerspective[];
  subStats: SubStatItem[];
  badges: AchievementBadge[];
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  confirmedCount: number;
  totalNodes: number;
  summaryJa: string;
  scoreDelta: number | null;
}

function toGrade(score: number): PerspectiveGrade {
  if (score >= 85) return '優';
  if (score >= 70) return '良';
  if (score >= 50) return '可';
  return '要改善';
}

function clampScore(n: number): number {
  return Math.max(10, Math.min(100, Math.round(n)));
}

export function evaluateThesisScore(
  blueprint: CityBlueprint,
  confirmedNodeIds: Record<string, boolean> = {},
  previousScore: number | null = null,
  checklistBonus: number = 0,
): ThesisScoreReport {
  const buildings = blueprint.buildings;
  const totalNodes = Math.max(1, buildings.length);
  const fullText = buildings.map((b) => b.node.sourceText).join('\n');

  const healthyCount = buildings.filter((b) => b.status === 'healthy').length;
  const warningCount = buildings.filter((b) => b.status === 'warning').length;
  const criticalCount = buildings.filter(
    (b) => b.status === 'collapsed' || b.status === 'unfinished',
  ).length;
  const confirmedCount = buildings.filter((b) => Boolean(confirmedNodeIds[b.nodeId])).length;

  // Multi-factor text feature extraction across all nodes
  const quantMatches =
    fullText.match(/\d+(?:\.\d+)?(?:%|％|名|人|件|倍|℃|分|時間|年|回|点|箇所|社|冊)/g) ?? [];
  const citationMatches =
    fullText.match(/（\d{4}|\(\d{4}|によれば|によると|先行研究|文献|アンケート|調査|実験|観測|統計/g) ?? [];
  const qualifierMatches =
    fullText.match(/ただし|一方で|しかし|もっとも|限界|課題|他の要因|他要因|相乗効果|影響も|限定|慎重|可能性/g) ?? [];
  const connectorGroups = [
    /したがって|そのため|ゆえに|結果として/,
    /しかし|ただし|一方で/,
    /なぜなら|背景|要因/,
    /例えば|具体的には/,
    /以上より|結論として|まとめ/,
  ].filter((re) => re.test(fullText)).length;

  const sentences = fullText
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
  const avgSentenceLen =
    sentences.length > 0
      ? sentences.reduce((acc, s) => acc + s.length, 0) / sentences.length
      : 50;

  const politeEndings = (fullText.match(/です(?:[。、\n]|$)|ます(?:[。、\n]|$)|ました(?:[。、\n]|$)/g) ?? []).length;
  const plainEndings = (fullText.match(/である(?:[。、\n]|$)|だった(?:[。、\n]|$)|ている(?:[。、\n]|$)|となる(?:[。、\n]|$)|言える(?:[。、\n]|$)|できる(?:[。、\n]|$)/g) ?? []).length;
  const totalEndings = politeEndings + plainEndings;
  const styleDominance =
    totalEndings > 0 ? Math.max(politeEndings, plainEndings) / totalEndings : 1;

  const hasContradiction = buildings.some((b) =>
    b.node.issues.some((i) => i.issueCategory === 'contradiction'),
  );
  const hasCausalLeap = buildings.some((b) =>
    b.node.issues.some((i) => i.issueCategory === 'correlation_causation'),
  );
  const hasInsufficientGrounds = buildings.some((b) =>
    b.node.issues.some(
      (i) => i.issueCategory === 'insufficient_grounds' || i.issueCategory === 'unclear_source',
    ),
  );

  // 8 Detailed RPG Sub-Stats
  const noContradictionStat = clampScore(
    hasContradiction ? 28 : 96 - criticalCount * 16 - warningCount * 6,
  );
  const causalAccuracyStat = clampScore(
    hasCausalLeap ? 30 : 94 - criticalCount * 12 - warningCount * 5,
  );
  const quantDataStat = clampScore(38 + Math.min(60, quantMatches.length * 14) - (hasInsufficientGrounds ? 24 : 0));
  const citationStat = clampScore(42 + Math.min(54, citationMatches.length * 13) - (hasInsufficientGrounds ? 18 : 0));
  const objectivityStat = clampScore(44 + Math.min(54, qualifierMatches.length * 16) - (criticalCount > 0 ? 12 : 0));
  const connectorStat = clampScore(48 + connectorGroups * 11);
  const styleConsistencyStat = clampScore(styleDominance * 100);
  const readabilityStat = clampScore(
    avgSentenceLen <= 75 ? 94 : avgSentenceLen <= 105 ? 80 : avgSentenceLen <= 130 ? 64 : 44,
  );

  const subStats: SubStatItem[] = [
    { id: 'no-contra', label: '矛盾ゼロ度', score: noContradictionStat },
    { id: 'causal', label: '因果の正確さ', score: causalAccuracyStat },
    { id: 'quant', label: '数値・データ力', score: quantDataStat },
    { id: 'cite', label: '出典・調査力', score: citationStat },
    { id: 'obj', label: '反論・客観性', score: objectivityStat },
    { id: 'conn', label: '論理接続力', score: connectorStat },
    { id: 'style', label: '文体の統一感', score: styleConsistencyStat },
    { id: 'read', label: '読みやすさ', score: readabilityStat },
  ];

  // 3 Primary Perspectives rolled cleanly from the 8 sub-stats + node confidence
  const avgNodeConf = buildings.reduce((acc, b) => acc + b.confidence, 0) / totalNodes;
  const confirmationBonus = Math.round((confirmedCount / totalNodes) * 5);

  const consistencyScore = clampScore(
    noContradictionStat * 0.45 +
      causalAccuracyStat * 0.35 +
      (healthyCount / totalNodes) * 20 +
      confirmationBonus * 0.4,
  );
  const evidenceScore = clampScore(
    quantDataStat * 0.45 + citationStat * 0.35 + avgNodeConf * 20,
  );
  const coherenceScore = clampScore(
    objectivityStat * 0.35 +
      connectorStat * 0.25 +
      styleConsistencyStat * 0.2 +
      readabilityStat * 0.2,
  );

  const rawTotal =
    Math.round(consistencyScore * 0.4 + evidenceScore * 0.32 + coherenceScore * 0.28) +
    confirmationBonus +
    checklistBonus;
  const totalScore = Math.max(15, Math.min(99, rawTotal));

  let rank: ScoreRank = 'C';
  let rankTitleJa = '🛠️ 伸びしろチャレンジャー';
  if (totalScore >= 94) {
    rank = 'SS';
    rankTitleJa = '👑 伝説の論証アーキテクト';
  } else if (totalScore >= 86) {
    rank = 'S';
    rankTitleJa = '⚡ 完璧なるロジック建築家';
  } else if (totalScore >= 74) {
    rank = 'A';
    rankTitleJa = '✨ 説得力のプロフェッショナル';
  } else if (totalScore >= 58) {
    rank = 'B';
    rankTitleJa = '🔷 バランス型リサーチャー';
  } else if (totalScore >= 42) {
    rank = 'C';
    rankTitleJa = '🛠️ 伸びしろチャレンジャー';
  } else {
    rank = 'D';
    rankTitleJa = '🔥 逆転ブレイカー候補';
  }

  // Unlocked Achievement Badges
  const badges: AchievementBadge[] = [];
  if (criticalCount === 0 && !hasContradiction) {
    badges.push({
      id: 'zero-contra',
      icon: '🏆',
      label: '矛盾ゼロ達成',
      detail: '重大な矛盾や飛躍なし',
      tier: 'gold',
    });
  }
  if (quantDataStat >= 75) {
    badges.push({
      id: 'data-master',
      icon: '📊',
      label: 'データマスター',
      detail: `数値・定量根拠 ${quantMatches.length}箇所`,
      tier: 'cyan',
    });
  }
  if (objectivityStat >= 72) {
    badges.push({
      id: 'objectivity',
      icon: '⚖️',
      label: '客観性の達人',
      detail: '例外・他要因まで配慮',
      tier: 'cyan',
    });
  }
  if (styleConsistencyStat >= 90 && totalEndings >= 2) {
    badges.push({
      id: 'style-perfect',
      icon: '✒️',
      label: '文体パーフェクト',
      detail: '文末表現が美しく統一',
      tier: 'cyan',
    });
  }
  if (readabilityStat >= 88) {
    badges.push({
      id: 'readable',
      icon: '📖',
      label: '読みやすさ◎',
      detail: `平均文長 ${Math.round(avgSentenceLen)}文字`,
      tier: 'cyan',
    });
  }
  if (previousScore !== null && totalScore > previousScore) {
    badges.push({
      id: 'score-up',
      icon: '🚀',
      label: `スコア急上昇 +${totalScore - previousScore}点`,
      detail: '修正で見事にレベルアップ！',
      tier: 'gold',
    });
  }
  if (badges.length === 0) {
    badges.push({
      id: 'challenger',
      icon: '🔥',
      label: '推敲チャレンジャー',
      detail: '赤い建物を直すと一気に高得点！',
      tier: 'fire',
    });
  }

  const perspectives: EvaluationPerspective[] = [
    {
      id: 'consistency',
      title: '① 論理の一貫性・矛盾のなさ',
      score: consistencyScore,
      grade: toGrade(consistencyScore),
      strengthJa:
        healthyCount > 0
          ? `中心の主張を含め${healthyCount}箇所で筋の通った展開ができています。`
          : '伝えたいテーマと結論の方向性がはっきりしています。',
      adviceJa: hasContradiction
        ? '章のあいだの結論の食い違いを解消するだけで、点数が一気に+20点以上伸びます。'
        : hasCausalLeap
          ? '「〜が唯一の原因」などの因果の断定を和らげると大きく評価が上がります。'
          : '大きな矛盾や飛躍は見当たらず、一貫性の高い論旨です。',
    },
    {
      id: 'evidence',
      title: '② 根拠・データの説得力',
      score: evidenceScore,
      grade: toGrade(evidenceScore),
      strengthJa:
        quantMatches.length > 0
          ? `数値・定量データ（${quantMatches.length}箇所）や調査記述があり客観的な裏付けが活きています。`
          : '主張を支える具体的なエピソードや着眼点が盛り込まれています。',
      adviceJa: hasInsufficientGrounds
        ? '少数の事例から全体を断定せず、調査人数や対象範囲を限定すると信頼性が急上昇します。'
        : evidenceScore < 78
          ? '具体的な数字・調査人数・出典年を1〜2点補うと説得力がさらに跳ね上がります。'
          : '主張に見合った十分なデータ・裏付けが示されています。',
    },
    {
      id: 'coherence',
      title: '③ 構成のわかりやすさ・客観性',
      score: coherenceScore,
      grade: toGrade(coherenceScore),
      strengthJa:
        styleConsistencyStat >= 88
          ? `文体の統一感が高く（${styleConsistencyStat}%）、平均文長も読みやすく整理されています。`
          : '段落ごとの役割が分かれており、読み手が論点を追いやすい流れです。',
      adviceJa:
        styleConsistencyStat < 85
          ? '「だ・である調」と「です・ます調」の混在を統一するとレポートの完成度が上がります。'
          : objectivityStat < 70
            ? '「ただし〜の影響も考えられる」と例外条件や反論への配慮を補うと最高評価に近づきます。'
            : '客観性・接続の流れ・読みやすさのバランスが優秀です。',
    },
  ];

  let summaryJa = '';
  if (totalScore >= 86) {
    summaryJa =
      '素晴らしい完成度です！論理・データ・客観性の3観点がすべて高水準で、堅固な建築物がそびえ立ちました。';
  } else if (totalScore >= 70) {
    summaryJa =
      '説得力の高い良好な文章です。あと1〜2点の補足や条件限定を加えると、最高峰の S ランクに届きます！';
  } else if (criticalCount > 0) {
    summaryJa = `良い主張の軸がありますが、${criticalCount}箇所の矛盾・根拠不足で減点中です。赤い建物を直すとスコアが一気に跳ね上がります！`;
  } else {
    summaryJa =
      '基本的な流れは整っています。数値根拠や「ただし〜」の客観的な補足を足すとさらに伸びます。';
  }

  return {
    totalScore,
    rank,
    rankTitleJa,
    consistencyScore,
    evidenceScore,
    coherenceScore,
    perspectives,
    subStats,
    badges,
    healthyCount,
    warningCount,
    criticalCount,
    confirmedCount,
    totalNodes: buildings.length,
    summaryJa,
    scoreDelta: previousScore !== null ? totalScore - previousScore : null,
  };
}
