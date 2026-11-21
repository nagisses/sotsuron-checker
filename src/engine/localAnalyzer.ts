import { AnalysisIssue, ThesisEdge, ThesisGraph, ThesisNode, ToulminRole } from '../types/thesis';

interface PassageAudit {
  role: ToulminRole;
  status: ThesisNode['status'];
  confidence: number;
  issues: AnalysisIssue[];
  hasContradiction: boolean;
  hasCausalLeap: boolean;
  hasOvergen: boolean;
  hasSmallSample: boolean;
  hasUnclearSource: boolean;
  hasQuantData: boolean;
  hasCitationOrMethod: boolean;
  hasQualifier: boolean;
  hasLongSentence: boolean;
  hasStyleMix: boolean;
}

function splitIntoLogicalSegments(rawText: string): string[] {
  const byNewline = rawText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 12);

  if (byNewline.length >= 2) {
    return byNewline.slice(0, 7);
  }

  // If user pasted one continuous block without line breaks, split cleanly every ~2 sentences
  const sentences = rawText
    .trim()
    .split(/(?<=[。！？])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);

  if (sentences.length <= 2) {
    return [rawText.trim()];
  }

  const grouped: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    grouped.push(sentences.slice(i, i + 2).join(''));
    if (grouped.length >= 6) break;
  }
  return grouped;
}

export function auditJapanesePassage(
  para: string,
  idx: number,
  isCentral: boolean,
  fullText?: string,
): PassageAudit {
  const issues: AnalysisIssue[] = [];
  let status: ThesisNode['status'] = 'healthy';
  let confidence = 0.78;
  let role: ToulminRole = isCentral ? 'claim' : idx % 2 === 1 ? 'grounds' : 'claim';

  const hasQuantData =
    /\d+(?:\.\d+)?(?:%|％|名|人|件|倍|℃|分|時間|年|回|点|箇所|社|冊|円|km|m)|平均|有意|標準偏差|中央値|統計|割合|増加|減少/.test(
      para,
    );
  const hasCitationOrMethod =
    /（\d{4}|\(\d{4}|によれば|によると|先行研究|文献|アンケート|調査|実験|観測|分析した結果|集計|インタビュー|統計/.test(
      para,
    );
  const hasQualifier =
    /ただし|一方で|しかし|もっとも|限界|課題|他の要因|他要因|相乗効果|影響も|限定|慎重|可能性|とは限らない|考慮/.test(
      para,
    );
  const hasConnector =
    /したがって|そのため|ゆえに|なぜなら|具体的には|例えば|以上より|結論として|結果として|さらに|加えて/.test(
      para,
    );

  const hasOvergen =
    /すべて|全て|必ず|絶対|100%|１００％|断言|永久に|完全に解消|間違いなく|誰にでも|例外なく/.test(
      para,
    );
  const hasCausalLeap =
    /唯一の直接原因|唯一の.*原因|直接原因である|直接引き起こした|直接の原因.*断定|だけで.*証明|さえ.*必ず/.test(
      para,
    );
  const hasExplicitContradiction = /矛盾|食い違|逆の結論|一方で.*主因であるとも/.test(para);
  const hasCrossConflict =
    Boolean(fullText) &&
    /唯一の.*原因/.test(para) &&
    /主因|他の要因|アルバイト/.test(fullText ?? '') &&
    !hasQualifier;
  const hasContradiction = hasExplicitContradiction || hasCrossConflict;

  const hasSmallSample =
    /友人\d+名|[1-5]名|1晩|一晩|1日だけ|2地点|ごく少数|自分の周り|身近な人/.test(para);
  const hasUnclearSource =
    /未確認|出典不明|噂では|らしい|ネットで見|と言われている(?![^。]*（\d{4})|気がする|と感じた/.test(
      para,
    );

  const sentences = para.split(/[。！？]/).filter((s) => s.trim().length > 0);
  const maxSentenceLen = sentences.reduce((max, s) => Math.max(max, s.trim().length), 0);
  const hasLongSentence = maxSentenceLen > 130;

  const politeCount = (para.match(/です(?:[。、]|$)|ます(?:[。、]|$)|ました(?:[。、]|$)|ません(?:[。、]|$)/g) ?? []).length;
  const plainCount = (para.match(/である(?:[。、]|$)|だった(?:[。、]|$)|ている(?:[。、]|$)|となる(?:[。、]|$)|言える(?:[。、]|$)|できる(?:[。、]|$)/g) ?? []).length;
  const hasStyleMix = politeCount >= 1 && plainCount >= 1;

  // Positive signal boosts
  if (hasQuantData) confidence += 0.08;
  if (hasCitationOrMethod) confidence += 0.06;
  if (hasQualifier) confidence += 0.06;
  if (hasConnector) confidence += 0.03;

  // Assign Toulmin-inspired clear role
  if (!isCentral) {
    if (hasQualifier && !hasOvergen && !hasCausalLeap) role = 'rebuttal';
    else if (hasQuantData || hasCitationOrMethod || hasSmallSample) role = 'grounds';
    else if (hasConnector) role = 'warrant';
  }

  // Flag critical & medium diagnostic issues
  if (hasContradiction) {
    status = 'collapsed';
    confidence = Math.min(confidence, 0.28);
    issues.push({
      id: `ISS-${idx}-contra`,
      sourceText: para,
      issueCategory: 'contradiction',
      severity: 'critical',
      rationale:
        '前の記述とこの段落の結論が食い違っており、レポート全体の一貫性が崩れています。',
      missingEvidence: '複数要因の関係性（どちらが主因か、複合要因か）の明確な整理。',
      suggestedRevision:
        '単一の原因と断定せず、複数の生活要因や環境要因が重なって影響しているという整合的な結論に整理する。',
      confidence: 0.91,
      uncertaintyNote: '段落間の主張・因果整合性チェックによる検出です。',
      destructionType: 'structural_collapse',
    });
  } else if (hasCausalLeap) {
    status = 'collapsed';
    confidence = Math.min(confidence, 0.32);
    issues.push({
      id: `ISS-${idx}-causal`,
      sourceText: para,
      issueCategory: 'correlation_causation',
      severity: 'critical',
      rationale:
        '2つの傾向が同時に見られる（相関関係）だけで、他の要因を検証せずに「直接の原因」と断定しています。',
      missingEvidence: '他の影響要因（生活習慣・時期・対象属性など）を揃えた比較データ。',
      suggestedRevision:
        '「〜との関連が見られたが、他の要因の影響も考慮し、今後は条件を揃えた検証が必要である」と表現を正確にする。',
      confidence: 0.89,
      uncertaintyNote: '因果関係の飛躍チェックによる指摘です。',
      destructionType: 'structural_collapse',
    });
  }

  if (hasSmallSample || (hasOvergen && !hasQuantData)) {
    status = status === 'collapsed' ? 'collapsed' : 'unfinished';
    confidence = Math.min(confidence, 0.34);
    issues.push({
      id: `ISS-${idx}-grounds`,
      sourceText: para,
      issueCategory: hasSmallSample ? 'insufficient_grounds' : 'overgeneralization',
      severity: 'critical',
      rationale: hasSmallSample
        ? 'ごく少数の事例（友人3名・1晩など）から全体に当てはまる結論を導いており、根拠データが不足しています。'
        : '「すべて」「必ず」「断言」などの極端な断定が使われており、例外ケースへの配慮が欠けています。',
      missingEvidence: '十分な標本数のデータ、または結論の適用範囲を限定する条件の明記。',
      suggestedRevision:
        '「今回の対象範囲では〜の傾向が見られたが、全体に一般化するには対象人数を増やした追加検証が必要である」と修正する。',
      confidence: 0.9,
      uncertaintyNote: '標本規模・断定表現バランスチェックによる検出です。',
      destructionType: 'structural_collapse',
    });
  } else if (hasOvergen && hasQuantData) {
    if (status === 'healthy') status = 'warning';
    confidence = Math.min(confidence, 0.58);
    issues.push({
      id: `ISS-${idx}-overgen`,
      sourceText: para,
      issueCategory: 'overgeneralization',
      severity: 'medium',
      rationale: 'データは示されていますが、「すべて」「必ず」など範囲を広げすぎた断定表現があります。',
      missingEvidence: '調査対象外への適用条件や限界の明記。',
      suggestedRevision: '「調査対象においては〜の傾向が確認された」と範囲を明示する表現へ調整する。',
      confidence: 0.84,
      uncertaintyNote: '断定表現チェックによる指摘です。',
      destructionType: 'none',
    });
  }

  if (hasUnclearSource) {
    if (status === 'healthy') status = 'warning';
    confidence = Math.min(confidence, 0.52);
    issues.push({
      id: `ISS-${idx}-source`,
      sourceText: para,
      issueCategory: 'unclear_source',
      severity: 'medium',
      rationale: '出典や根拠があいまいな表現（「未確認」「らしい」「と言われている」等）が含まれています。',
      missingEvidence: '調査機関名・発表年・参考文献などの確認可能な出典。',
      suggestedRevision: '「〇〇の調査（2025年）によれば〜」のように出典を明記するか、主観表現を削る。',
      confidence: 0.85,
      uncertaintyNote: '出典明記チェックによる指摘です。',
      destructionType: 'none',
    });
  }

  if (hasStyleMix && issues.length === 0) {
    status = 'warning';
    confidence = Math.min(confidence, 0.68);
    issues.push({
      id: `ISS-${idx}-style`,
      sourceText: para,
      issueCategory: 'logical_leap',
      severity: 'low',
      rationale: '「だ・である調」と「です・ます調」が同じ段落内に混在しており、レポートの統一感が弱まっています。',
      missingEvidence: '文末表現を「だ・である調」または「です・ます調」のどちらかに統一すること。',
      suggestedRevision: '段落全体の文末を「〜である」「〜した」の常体（または敬体）へ統一する。',
      confidence: 0.88,
      uncertaintyNote: '文体統一チェックによる指摘です。',
      destructionType: 'none',
    });
  } else if (hasLongSentence && issues.length === 0) {
    status = 'warning';
    confidence = Math.min(confidence, 0.72);
    issues.push({
      id: `ISS-${idx}-len`,
      sourceText: para,
      issueCategory: 'logical_leap',
      severity: 'low',
      rationale: `一文が長すぎます（最大${maxSentenceLen}文字）。主張と理由が1文に詰まって読みにくくなっています。`,
      missingEvidence: '主語と述語が対応するように2文以上に分割した整理。',
      suggestedRevision: '事実を述べる文と、考察・結論を述べる文を句点（。）で2つに分ける。',
      confidence: 0.82,
      uncertaintyNote: '読みやすさ・文長チェックによる指摘です。',
      destructionType: 'none',
    });
  }

  return {
    role,
    status,
    confidence: Math.max(0.22, Math.min(0.96, Number(confidence.toFixed(2)))),
    issues,
    hasContradiction,
    hasCausalLeap,
    hasOvergen,
    hasSmallSample,
    hasUnclearSource,
    hasQuantData,
    hasCitationOrMethod,
    hasQualifier,
    hasLongSentence,
    hasStyleMix,
  };
}

export function analyzeTextLocally(rawText: string, customTitle?: string): ThesisGraph {
  const segments = splitIntoLogicalSegments(rawText);
  const title =
    customTitle?.trim() ||
    segments[0].replace(/^第\d+[章節段落][:：]?\s*/, '').slice(0, 32) ||
    '卒論・レポートの論理構造チェック';

  const nodes: ThesisNode[] = [];
  const edges: ThesisEdge[] = [];

  segments.forEach((para, idx) => {
    const id = idx === 0 ? 'CLM-00' : `CLM-0${idx}`;
    const isCentral = idx === 0;
    const cleanHeading = para
      .replace(/^第\d+[章節段落][:：]?\s*/, '')
      .slice(0, 26)
      .concat(para.length > 26 ? '…' : '');

    const audit = auditJapanesePassage(para, idx, isCentral, rawText);

    nodes.push({
      id,
      code: isCentral ? `${id} // CORE` : audit.issues.length > 0 ? `${id} // FAULT` : id,
      title: cleanHeading,
      titleJa: cleanHeading,
      role: audit.role,
      isCentral,
      sourceText: para,
      sourceLocation: `第${idx + 1}段落`,
      confidence: audit.confidence,
      status: audit.status,
      issues: audit.issues,
    });

    if (!isCentral) {
      const isBad = audit.status === 'collapsed' || audit.status === 'unfinished';
      const isWarn = audit.status === 'warning';
      edges.push({
        id: `EDG-0${idx}`,
        source: id,
        target: 'CLM-00',
        relationshipType: isBad
          ? audit.hasContradiction
            ? 'contradicts'
            : 'missing_link'
          : audit.role === 'rebuttal'
            ? 'rebuts'
            : audit.role === 'warrant'
              ? 'warrants'
              : 'supports',
        explanation: isBad
          ? '矛盾または根拠不足があるため、中心主張を支えるつながりが不安定になっています。'
          : isWarn
            ? '方向性は合っていますが、表現の調整や補足をするとさらに強固につながります。'
            : '中心主張を具体的なデータや客観的な考察によってしっかり支えています。',
        integrity: isBad ? 0.24 : isWarn ? 0.64 : 0.9,
      });
    }
  });

  // Ensure at least 3 structures for a clear multi-building result
  if (nodes.length === 1) {
    const first = nodes[0];
    const hasNumbers = /\d+(?:%|％|名|人|件|倍|年|分)/.test(first.sourceText);
    const hasQualifier = /ただし|一方で|しかし|限界|課題|他の要因/.test(first.sourceText);

    nodes.push(
      {
        id: 'EVD-01',
        code: hasNumbers ? 'EVD-01' : 'EVD-01 // GAP',
        title: hasNumbers ? '数値・調査データの裏付け' : '具体的な数値・出典の補強余地',
        titleJa: hasNumbers ? '数値・調査データの裏付け' : '具体的な数値・出典の補強余地',
        role: 'grounds',
        isCentral: false,
        sourceText: first.sourceText,
        sourceLocation: '根拠要素',
        confidence: hasNumbers ? 0.86 : 0.44,
        status: hasNumbers ? 'healthy' : 'unfinished',
        issues: hasNumbers
          ? []
          : [
              {
                id: 'ISS-AUTO-EVD',
                sourceText: first.sourceText,
                issueCategory: 'insufficient_grounds',
                severity: 'critical',
                rationale: '文章内に具体的な数値データや調査出典が見当たりませんでした。',
                missingEvidence: '調査人数・割合・比較データ、または参考文献の引用。',
                suggestedRevision: '「〇〇名の調査で△△%が〜と回答した」など具体的な根拠データを1点加える。',
                confidence: 0.86,
                uncertaintyNote: '定量データ・出典要素の自動チェックによる指摘です。',
                destructionType: 'structural_collapse',
              },
            ],
      },
      {
        id: 'RBT-01',
        code: hasQualifier ? 'RBT-01' : 'RBT-01 // ALERT',
        title: hasQualifier ? '例外条件・多要因への客観的配慮' : '反対意見・限界条件の補足余地',
        titleJa: hasQualifier ? '例外条件・多要因への客観的配慮' : '反対意見・限界条件の補足余地',
        role: 'rebuttal',
        isCentral: false,
        sourceText: first.sourceText,
        sourceLocation: '客観性チェック',
        confidence: hasQualifier ? 0.88 : 0.62,
        status: hasQualifier ? 'healthy' : 'warning',
        issues: hasQualifier
          ? []
          : [
              {
                id: 'ISS-AUTO-RBT',
                sourceText: first.sourceText,
                issueCategory: 'missing_rebuttal',
                severity: 'medium',
                rationale: '反対意見や前提条件（限界）への言及を補うと、レポートの客観性がぐっと高まります。',
                missingEvidence: '「ただし〜の条件下では例外もある」といった留保・課題の一文。',
                suggestedRevision: '「ただし対象や時期による変動も考えられるため、今後はさらなる検証が必要である」と一文補う。',
                confidence: 0.8,
                uncertaintyNote: '客観性・反論配慮チェックによる提案です。',
                destructionType: 'none',
              },
            ],
      },
    );

    edges.push(
      {
        id: 'EDG-01',
        source: 'EVD-01',
        target: 'CLM-00',
        relationshipType: hasNumbers ? 'supports' : 'missing_link',
        explanation: hasNumbers
          ? '具体的なデータ記述が主張の土台を支えています。'
          : '具体的な数値や調査出典を足すと説得力が大きく伸びます。',
        integrity: hasNumbers ? 0.88 : 0.32,
      },
      {
        id: 'EDG-02',
        source: 'RBT-01',
        target: 'CLM-00',
        relationshipType: hasQualifier ? 'rebuts' : 'qualifies',
        explanation: hasQualifier
          ? '例外条件への配慮が主張の信頼性を高めています。'
          : '条件の限定や今後の課題を補うと構成が引き締まります。',
        integrity: hasQualifier ? 0.88 : 0.62,
      },
    );
  }

  return {
    id: `report-check-${Date.now()}`,
    title,
    titleJa: title,
    domain: '卒論・レポート検証',
    abstract: '12項目の多角的な観点で文章を解析した論証モデルです。',
    nodes,
    edges,
  };
}

export function evaluateRevisionLocally(revisedText: string) {
  const audit = auditJapanesePassage(revisedText, 99, false);
  const heading = revisedText
    .replace(/^第\d+[章節段落][:：]?\s*/, '')
    .slice(0, 26)
    .concat(revisedText.length > 26 ? '…' : '');

  if (audit.status === 'healthy') {
    return {
      updatedTitle: heading,
      updatedTitleJa: heading,
      updatedStatus: 'healthy' as const,
      updatedConfidence: Math.max(0.86, audit.confidence),
      repairedEdgeIntegrity: 0.9,
      repairSummary:
        '矛盾や過度な断定が解消され、根拠と条件のバランスが整った説得力の高い文章に改善されました！',
      uncertaintyNote: '12項目ロジックによる再検証で問題なしと判定されました。',
      remainingIssues: [],
    };
  }

  if (audit.status === 'warning') {
    return {
      updatedTitle: heading,
      updatedTitleJa: heading,
      updatedStatus: 'warning' as const,
      updatedConfidence: Math.max(0.62, audit.confidence),
      repairedEdgeIntegrity: 0.68,
      repairSummary:
        '大きな矛盾は減りましたが、文体の統一や出典・条件の補足をするとさらに高得点が狙えます。',
      uncertaintyNote: '軽微な改善ポイントが残っています。',
      remainingIssues: audit.issues,
    };
  }

  return {
    updatedTitle: heading,
    updatedTitleJa: heading,
    updatedStatus: audit.status,
    updatedConfidence: audit.confidence,
    repairedEdgeIntegrity: 0.25,
    repairSummary:
      '断定表現や根拠不足・矛盾の要素がまだ残っています。範囲の限定やデータ補足を試してみてください。',
    uncertaintyNote: '多要素ロジックによる再検証結果です。',
    remainingIssues: audit.issues,
  };
}
