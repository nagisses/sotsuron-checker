export type ResearchAngle = 'impact' | 'compare' | 'proposal';
export type SourceKind = 'data' | 'literature' | 'survey' | 'counter';

export interface SourceMemo {
  id: string;
  kind: SourceKind;
  title: string;
  note: string;
  citation: string;
}

export interface OutlineChapter {
  id: string;
  chapterLabel: string;
  roleHint: string;
  summary: string;
  linkedSourceIds: string[];
}

export interface PrepState {
  field: string;
  target: string;
  angle: ResearchAngle;
  selectedTitle: string;
  researchQuestion: string;
  hypothesis: string;
  sources: SourceMemo[];
  chapters: OutlineChapter[];
}

export interface ThemeCandidate {
  id: string;
  title: string;
  researchQuestion: string;
  hypothesis: string;
  tipJa: string;
}

export interface PrepReadinessReport {
  score: number;
  hasTheme: boolean;
  hasDataOrSurvey: boolean;
  hasLiterature: boolean;
  hasCounter: boolean;
  filledChapters: number;
  hintsJa: string[];
}

export const SOURCE_KIND_META: Record<
  SourceKind,
  { label: string; badge: string; placeholder: string }
> = {
  data: {
    label: '数値・統計データ',
    badge: '📊 データ',
    placeholder: '例：回答者120名の平均睡眠時間は5.8時間、スマホ2時間以上利用群は52分短い',
  },
  literature: {
    label: '先行研究・文献',
    badge: '📚 文献',
    placeholder: '例：山田（2024）の調査によると、就寝前の強い画面光は入眠潜時を延ばす',
  },
  survey: {
    label: 'アンケート・実験',
    badge: '🧪 調査',
    placeholder: '例：ゼミ生45名を対象に2週間の学習ログとアンケートを実施した',
  },
  counter: {
    label: '反論・例外・限界',
    badge: '⚖️ 反論・限界',
    placeholder: '例：ただしアルバイトや試験期間の影響もあるため単独原因とは断定できない',
  },
};

export function createInitialPrepState(): PrepState {
  return {
    field: '',
    target: '大学生',
    angle: 'impact',
    selectedTitle: '',
    researchQuestion: '',
    hypothesis: '',
    sources: [],
    chapters: [
      {
        id: 'ch-1',
        chapterLabel: '第1章：背景・問い（問題提起）',
        roleHint: 'なぜこのテーマを調べるのか、核心となる問い（RQ）を書く',
        summary: '',
        linkedSourceIds: [],
      },
      {
        id: 'ch-2',
        chapterLabel: '第2章：調査方法・データ分析',
        roleHint: '対象人数・期間・統計データやアンケート結果を具体的に示す',
        summary: '',
        linkedSourceIds: [],
      },
      {
        id: 'ch-3',
        chapterLabel: '第3章：考察・反論への配慮',
        roleHint: 'データから言えることと、他要因・例外・調査の限界を整理する',
        summary: '',
        linkedSourceIds: [],
      },
      {
        id: 'ch-4',
        chapterLabel: '第4章：結論・今後の課題',
        roleHint: '第1章の問いに対する答えを矛盾なくまとめ、今後の提案を書く',
        summary: '',
        linkedSourceIds: [],
      },
    ],
  };
}

export function generateThemeCandidates(
  fieldInput: string,
  targetInput: string,
  angle: ResearchAngle,
): ThemeCandidate[] {
  const field = fieldInput.trim() || '夜間スマートフォン利用';
  const target = targetInput.trim() || '大学生';

  const impactCandidate: ThemeCandidate = {
    id: 'cand-impact',
    title: `${target}における${field}が学習効率と生活リズムに与える影響の検証`,
    researchQuestion: `${target}の${field}の頻度や使い方は、学習成果や日々の集中力とどのように関連しているのか？`,
    hypothesis: `${field}の長時間利用は集中力低下と関連するが、利用目的や時間帯によって影響の大きさに差が生じる。`,
    tipJa: '定量データ（アンケート・ログ）と相性が良く、最も卒論・レポートにしやすい王道構成です。',
  };

  const compareCandidate: ThemeCandidate = {
    id: 'cand-compare',
    title: `${target}の${field}に関する利用スタイル別の比較研究`,
    researchQuestion: `${target}の中で${field}を積極的に活用する群と控える群では、成果や満足度にどのような違いがあるのか？`,
    hypothesis: `単なる利用時間の長さではなく、目的意識をもって活用する群の方が高い満足度と成果を示す。`,
    tipJa: '2つのグループを比較することで結論がシャープになり、構成の矛盾を防ぎやすくなります。',
  };

  const proposalCandidate: ThemeCandidate = {
    id: 'cand-proposal',
    title: `${target}に向けた${field}の課題分析と具体的な改善策の提案`,
    researchQuestion: `${target}が直面する${field}の課題を解決するために、どのような環境設計やルールづくりが有効か？`,
    hypothesis: `個人の意識改革だけに頼るよりも、環境や仕組みを工夫するアプローチの方が継続率が高い。`,
    tipJa: '現状データ→課題抽出→改善案→限界の検討、という説得力の高い流れを作れます。',
  };

  if (angle === 'compare') return [compareCandidate, impactCandidate, proposalCandidate];
  if (angle === 'proposal') return [proposalCandidate, impactCandidate, compareCandidate];
  return [impactCandidate, compareCandidate, proposalCandidate];
}

export const PREP_PRESETS: { id: string; label: string; state: PrepState }[] = [
  {
    id: 'preset-ai-study',
    label: '例①：生成AI×レポート学習（バランス型）',
    state: {
      field: '生成AIの学習活用',
      target: '大学生',
      angle: 'compare',
      selectedTitle: '大学生のレポート作成における生成AI活用法と理解度の比較研究',
      researchQuestion: '生成AIを「構成相談・推敲」に使う学生と「文章丸投げ」に使う学生では、内容の理解度にどのような差が生まれるのか？',
      hypothesis: '構成整理や反論チェックの補助として活用する群の方が、自力理解と評価点の両面で高い成果を示す。',
      sources: [
        {
          id: 'src-ai-1',
          kind: 'survey',
          title: '学内アンケート調査（有効回答180名）',
          note: '大学生180名を対象に調査した結果、構成整理にAIを用いた群は平均レポート評価が12点高く、内容説明テストの正答率も84%に達した。',
          citation: '独自調査（2025年10月実施・N=180）',
        },
        {
          id: 'src-ai-2',
          kind: 'literature',
          title: '教育工学の先行研究',
          note: '佐藤（2024）の研究によれば、学習者が自ら問いを立ててAIの出力を検証するプロセスがメタ認知を活性化する。',
          citation: '佐藤（2024）教育情報研究',
        },
        {
          id: 'src-ai-3',
          kind: 'counter',
          title: 'サンプル偏りと限界への配慮',
          note: 'ただし回答者は情報系学部が62%を占めており、全学部へそのまま一般化せず、今後は文系学部を含めた追加検証が必要である。',
          citation: '調査設計上の制約メモ',
        },
      ],
      chapters: [
        {
          id: 'ch-1',
          chapterLabel: '第1章：背景・問い（問題提起）',
          roleHint: 'なぜこのテーマを調べるのか、核心となる問い（RQ）を書く',
          summary: '近年、大学生のレポート作成で生成AIの利用が急速に広がっているが、活用方法の違いが理解度に与える影響は十分に整理されていない。そこで本研究では、構成補助型と丸投げ型の違いを検証する。',
          linkedSourceIds: ['src-ai-2'],
        },
        {
          id: 'ch-2',
          chapterLabel: '第2章：調査方法・データ分析',
          roleHint: '対象人数・期間・統計データやアンケート結果を具体的に示す',
          summary: '大学生180名を対象にアンケートと理解度テストを実施した。その結果、構成整理や推敲の補助としてAIを活用した群は、丸投げ群に比べて平均評価が12点高く、正答率も84%と有意に高かった。',
          linkedSourceIds: ['src-ai-1'],
        },
        {
          id: 'ch-3',
          chapterLabel: '第3章：考察・反論への配慮',
          roleHint: 'データから言えることと、他要因・例外・調査の限界を整理する',
          summary: '佐藤（2024）の知見とも一致し、出力を批判的に確認する過程が理解を深めていると考えられる。ただし調査対象の62%が情報系学生であり、基礎学力や専攻差の影響も考えられるため、単独の因果関係と断定せず慎重に評価する必要がある。',
          linkedSourceIds: ['src-ai-2', 'src-ai-3'],
        },
        {
          id: 'ch-4',
          chapterLabel: '第4章：結論・今後の課題',
          roleHint: '第1章の問いに対する答えを矛盾なくまとめ、今後の提案を書く',
          summary: '以上より、生成AIは執筆前の構成づくりや整合性チェックの相棒として用いることで学習効果を高められる。今後は文系学部を含めた追跡調査を行い、ガイドライン設計につなげたい。',
          linkedSourceIds: ['src-ai-3'],
        },
      ],
    },
  },
  {
    id: 'preset-sleep-quake',
    label: '例②：スマホ×睡眠（地震が起きる弱点あり）',
    state: {
      field: '夜間スマートフォン利用と睡眠',
      target: '大学生',
      angle: 'impact',
      selectedTitle: '大学生の夜間スマートフォン利用と睡眠・講義集中力に関する卒業研究',
      researchQuestion: '就寝前のスマートフォン利用は、大学生の睡眠時間と翌朝の講義集中力にどれほど影響するのか？',
      hypothesis: '就寝前2時間以上のスマホ利用は睡眠不足を引き起こし、1限の遅刻率を高める。',
      sources: [
        {
          id: 'src-sl-1',
          kind: 'data',
          title: '睡眠日誌アンケート（120名）',
          note: '就寝1時間前までスマホを2時間以上使う学生は、30分未満の学生より平均睡眠時間が52分短く、午前中の眠気スコアが高かった。',
          citation: '学内睡眠調査（N=120）',
        },
        {
          id: 'src-sl-2',
          kind: 'survey',
          title: '友人3名のブルーライト眼鏡テスト',
          note: '友人3名にブルーライトカット眼鏡を1晩着用してもらったところ翌朝すっきり起きられたため、全国のすべての大学生の成績が必ず向上すると断言できる。',
          citation: '予備メモ（友人3名）',
        },
      ],
      chapters: [
        {
          id: 'ch-1',
          chapterLabel: '第1章：背景・問い（問題提起）',
          roleHint: 'なぜこのテーマを調べるのか、核心となる問い（RQ）を書く',
          summary: '大学生120名を対象に睡眠日誌とアンケートを実施した結果、就寝前のスマホ長時間利用者は平均睡眠時間が52分短く、午前中の講義での眠気スコアが有意に高かった。',
          linkedSourceIds: ['src-sl-1'],
        },
        {
          id: 'ch-2',
          chapterLabel: '第2章：調査方法・データ分析',
          roleHint: '対象人数・期間・統計データやアンケート結果を具体的に示す',
          summary: '予備調査として友人3名にブルーライトカット眼鏡を1晩着用してもらったところ翌朝すっきり起床できたため、この眼鏡さえ着用すれば全国のすべての大学生の単位取得率と成績が必ず向上すると断言できる。',
          linkedSourceIds: ['src-sl-2'],
        },
        {
          id: 'ch-3',
          chapterLabel: '第3章：考察・反論への配慮',
          roleHint: 'データから言えることと、他要因・例外・調査の限界を整理する',
          summary: '夜間スマホ利用が多い学生ほど1限の遅刻率が高かったことから、画面の光そのものが遅刻を引き起こす唯一の直接原因である。一方で第1章では深夜アルバイトによる帰宅の遅れが睡眠不足の主因であるとも述べており、章の間で結論が矛盾している。',
          linkedSourceIds: [],
        },
        {
          id: 'ch-4',
          chapterLabel: '第4章：結論・今後の課題',
          roleHint: '第1章の問いに対する答えを矛盾なくまとめ、今後の提案を書く',
          summary: '以上より、スマホ利用を全面禁止すれば遅刻問題は完全に解決すると言える。',
          linkedSourceIds: [],
        },
      ],
    },
  },
];

export function evaluatePrepReadiness(prep: PrepState): PrepReadinessReport {
  const hasTheme = prep.selectedTitle.trim().length >= 8 && prep.researchQuestion.trim().length >= 10;
  const hasDataOrSurvey = prep.sources.some((s) => s.kind === 'data' || s.kind === 'survey');
  const hasLiterature = prep.sources.some((s) => s.kind === 'literature');
  const hasCounter = prep.sources.some((s) => s.kind === 'counter');
  const filledChapters = prep.chapters.filter((c) => c.summary.trim().length >= 12).length;

  let score = 0;
  if (prep.selectedTitle.trim().length >= 8) score += 18;
  if (prep.researchQuestion.trim().length >= 10) score += 14;
  if (hasDataOrSurvey) score += 20;
  if (hasLiterature) score += 12;
  if (hasCounter) score += 12;
  score += Math.min(24, filledChapters * 6);

  const hintsJa: string[] = [];
  if (!hasTheme) hintsJa.push('① テーマと「問い（RQ）」を決めると構成の軸がブレなくなります');
  if (!hasDataOrSurvey) hintsJa.push('② 数値データまたは調査メモを1件追加すると「根拠の説得力」が大幅UP');
  if (!hasCounter) hintsJa.push('② 「反論・限界」メモを1件入れると、地震・台風に耐える強い構成になります');
  if (filledChapters < 3) hintsJa.push(`③ 構成づくりで3章以上の要点を書くと、そのまま本文ドラフトを自動生成できます（現在 ${filledChapters}/4章）`);

  return {
    score: Math.min(100, score),
    hasTheme,
    hasDataOrSurvey,
    hasLiterature,
    hasCounter,
    filledChapters,
    hintsJa,
  };
}

export function assembleDraftFromPrep(prep: PrepState): { title: string; text: string } {
  const title =
    prep.selectedTitle.trim() ||
    `${prep.target.trim() || '大学生'}の${prep.field.trim() || '研究テーマ'}に関するレポート`;

  const sourceMap = new Map(prep.sources.map((s) => [s.id, s]));
  const sections: string[] = [];

  prep.chapters.forEach((ch, idx) => {
    const linked = ch.linkedSourceIds
      .map((id) => sourceMap.get(id))
      .filter((s): s is SourceMemo => Boolean(s));

    let body = ch.summary.trim();
    if (!body) {
      if (idx === 0 && prep.researchQuestion.trim()) {
        body = `本研究では「${prep.researchQuestion.trim()}」という問いを設定し、${
          prep.hypothesis.trim() ? `「${prep.hypothesis.trim()}」という仮説を検証する。` : '多角的なデータから検証する。'
        }`;
      } else if (linked.length > 0) {
        body = linked.map((s) => `${s.note}${s.citation ? `（${s.citation}）` : ''}`).join(' ');
      }
    } else if (linked.length > 0) {
      // Append citation reference only if not already mentioned in summary
      const unmentioned = linked.filter(
        (s) => s.note.trim().length > 0 && !body.includes(s.note.slice(0, 12)),
      );
      if (unmentioned.length > 0) {
        const extra = unmentioned
          .map((s) => `${s.note}${s.citation ? `（${s.citation}）` : ''}`)
          .join(' ');
        body = `${body} ${extra}`;
      }
    }

    if (body.length > 0) {
      const shortHeading = ch.chapterLabel.split('：')[0] || `第${idx + 1}章`;
      sections.push(`${shortHeading}：${body}`);
    }
  });

  if (sections.length === 0) {
    const fallback = [
      `第1章：本レポートでは「${title}」をテーマに、${prep.researchQuestion.trim() || '現状の課題と要因'}を明らかにする。`,
      prep.sources.length > 0
        ? `第2章：収集した資料を整理すると、${prep.sources.map((s) => s.note).join(' ')}`
        : '第2章：関連データや調査結果をもとに現状の傾向を分析し、客観的な根拠を整理する。',
      '第3章：ただし調査範囲や他要因の影響も考慮し、過度な一般化を避けつつ今後の改善策を検討する必要がある。',
    ];
    return { title, text: fallback.join('\n\n') };
  }

  return { title, text: sections.join('\n\n') };
}

const STORAGE_KEY = 'thisis_apocalypse_prep_v1';

export function loadSavedPrepState(): PrepState {
  if (typeof window === 'undefined') return createInitialPrepState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialPrepState();
    const parsed = JSON.parse(raw) as Partial<PrepState>;
    const base = createInitialPrepState();
    return {
      ...base,
      ...parsed,
      sources: Array.isArray(parsed.sources) ? parsed.sources : base.sources,
      chapters:
        Array.isArray(parsed.chapters) && parsed.chapters.length > 0
          ? parsed.chapters
          : base.chapters,
    };
  } catch {
    return createInitialPrepState();
  }
}

export function savePrepState(prep: PrepState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prep));
  } catch {
    // Ignore storage quota errors
  }
}

export function buildGeminiThemePrompt(prep: PrepState): string {
  const field = prep.field.trim() || '（ここに興味のある分野を入力）';
  const target = prep.target.trim() || '大学生';
  const title = prep.selectedTitle.trim() || `${target}における${field}の研究`;
  const rq = prep.researchQuestion.trim() || 'まだ曖昧なので一緒に絞りたい';
  const hyp = prep.hypothesis.trim() || '未設定';

  return [
    'あなたは大学ゼミの指導教員です。卒論・レポートの「書き始められない」を突破するため、以下のテーマ案を壁打ちしてください。',
    '',
    `【関心分野】${field}`,
    `【調査対象】${target}`,
    `【仮タイトル】${title}`,
    `【中心となる問い（RQ）】${rq}`,
    `【仮説】${hyp}`,
    '',
    '以下の3点をわかりやすく提案してください：',
    '1. この問い（RQ）をより具体的・検証可能にする言い換え案を3つ',
    '2. 調査やデータ収集で気をつけるべき「論理の落とし穴・反論ポイント」を2つ',
    '3. 最初に調べるべきキーワード・先行研究の探し方',
  ].join('\n');
}

export function buildGeminiNotebookPrompt(prep: PrepState): string {
  const title = prep.selectedTitle.trim() || '卒論・レポート';
  const sourcesBlock =
    prep.sources.length > 0
      ? prep.sources
          .map(
            (s, i) =>
              `${i + 1}. [${SOURCE_KIND_META[s.kind].label}] ${s.title}\n   内容: ${s.note}${
                s.citation ? `\n   出典・条件: ${s.citation}` : ''
              }`,
          )
          .join('\n')
      : '（まだ資料カードがありません。調べたメモや統計データをここに貼ってください）';

  return [
    '以下は卒論・レポート用に学習ノートブックへまとめた資料メモです。',
    'これらを整理し、文章を書き始める前の「論点マップ」と「不足している根拠」を洗い出してください。',
    '',
    `【テーマ】${title}`,
    `【問い（RQ）】${prep.researchQuestion.trim() || '未設定'}`,
    '',
    '【収集した資料メモ】',
    sourcesBlock,
    '',
    '以下の形式で整理してください：',
    '1. 資料どうしの共通点・対立点（表形式）',
    '2. 主張を裏付けるために「あと1つ足すと説得力が跳ね上がるデータ・反論」',
    '3. 各資料をどの章（背景・分析・考察・結論）で使うべきかの配置案',
  ].join('\n');
}

export function buildGeminiFirstDraftPrompt(prep: PrepState): string {
  const assembled = assembleDraftFromPrep(prep);
  return [
    '卒論・レポートの「書き出し」を突破したいです。文章を丸投げするのではなく、私の構成をもとに【書き出しガイド】を作ってください。',
    '',
    `【タイトル】${assembled.title}`,
    `【中心となる問い（RQ）】${prep.researchQuestion.trim() || '未設定'}`,
    '',
    '【自分の章構成メモ】',
    assembled.text,
    '',
    '以下をお願いしたいです：',
    '1. この構成の「論理のつながり」に矛盾や飛躍がないか辛口チェック',
    '2. 第1章の書き出し（最初の3文）を自分で書くための穴埋めテンプレート',
    '3. 執筆中に迷子にならないための「各章で必ず触れるべきチェック項目」',
  ].join('\n');
}
