import { IssueCategory } from '../types/thesis';

export interface AcademicBenchmarkCase {
  id: string;
  label: string;
  labelJa: string;
  excerpt: string;
  expectedIssueCategory: IssueCategory | 'none';
  expectedSeverity: 'none' | 'medium' | 'critical';
  expectedCityEffect: string;
  expectedRationaleSummary: string;
  geminiStatus: 'pending_phase_4';
  actualGeminiOutput: null;
}

/**
 * Five mandatory academic analysis benchmark cases (Directive Section E).
 * Live Gemini output comparison will execute once Phase 4 API integration is active.
 */
export const ACADEMIC_TEST_DATASET: AcademicBenchmarkCase[] = [
  {
    id: 'BENCH-01',
    label: 'Well-Formed Toulmin Argument',
    labelJa: '論理構造が明確な文章',
    excerpt:
      'Across 18 instrumented intersections (2023–2025), thermochromic silicate coatings lowered midday pavement temperatures by 4.6°C (±0.4°C, p < 0.01) while transitioning below 14°C to avoid winter solar gain loss, assuming WMO-calibrated cosine radiometer accuracy.',
    expectedIssueCategory: 'none',
    expectedSeverity: 'none',
    expectedCityEffect: 'Intact CLAIM_CITADEL + gold EVIDENCE_VAULT + cyan WARRANT_RELAY bridge.',
    expectedRationaleSummary:
      'Explicit Claim, quantified Grounds with error bounds, explicit Qualifier/Rebuttal condition, and stated Backing.',
    geminiStatus: 'pending_phase_4',
    actualGeminiOutput: null,
  },
  {
    id: 'BENCH-02',
    label: 'Insufficient Empirical Grounds',
    labelJa: '根拠が不足した文章',
    excerpt:
      'Pilot observations at two downtown crossings suggest adaptive coatings eliminate urban heat stress district-wide for at least a decade without maintenance.',
    expectedIssueCategory: 'insufficient_grounds',
    expectedSeverity: 'critical',
    expectedCityEffect: 'UNFINISHED_FOUNDATION plinth + Type A Structural Collapse on dependent Claim Tower.',
    expectedRationaleSummary:
      'Two localized sites cannot substantiate a 10-year district-wide zero-maintenance generalization.',
    geminiStatus: 'pending_phase_4',
    actualGeminiOutput: null,
  },
  {
    id: 'BENCH-03',
    label: 'Correlation Mistaken for Causation',
    labelJa: '相関関係から因果関係へ飛躍している文章',
    excerpt:
      'Because emergency heat-stroke admissions fell by 34% in the same year District 7 resurfaced two boulevards, reflective pavement directly caused the clinical reduction.',
    expectedIssueCategory: 'correlation_causation',
    expectedSeverity: 'critical',
    expectedCityEffect: 'FRACTURED_MONOLITH + Type B severed Warrant Bridge emitting Critical Red (#FF594F).',
    expectedRationaleSummary:
      'Temporal co-occurrence is treated as direct causation without controlling for WBGT variance or cooling shelters.',
    geminiStatus: 'pending_phase_4',
    actualGeminiOutput: null,
  },
  {
    id: 'BENCH-04',
    label: 'Missing Rebuttal to Counter-Arguments',
    labelJa: '反論への対応が不足した文章',
    excerpt:
      'Redirecting incoming solar radiation upward from roadways universally improves urban energy efficiency across all high-density neighborhoods.',
    expectedIssueCategory: 'missing_rebuttal',
    expectedSeverity: 'medium',
    expectedCityEffect: 'REBUTTAL_BASTION perimeter warning strobe + tension arc toward Claim Tower.',
    expectedRationaleSummary:
      'Fails to address shortwave irradiance reflected onto adjacent low-rise glass facades and winter solar heating penalties.',
    geminiStatus: 'pending_phase_4',
    actualGeminiOutput: null,
  },
  {
    id: 'BENCH-05',
    label: 'Uncertain / Uncited Claim',
    labelJa: '不確かな情報を含む文章',
    excerpt:
      'Recent international surveys reportedly confirm that over 90% of tropical cities mandate high-albedo pavements, though exact municipal statutes vary.',
    expectedIssueCategory: 'unclear_source',
    expectedSeverity: 'critical',
    expectedCityEffect: 'Hollowed UNDERGROUND_CAISSON source node + high epistemic uncertainty warning.',
    expectedRationaleSummary:
      'Unattributed quantitative assertion ("over 90% of tropical cities") lacks verifiable citation; system must flag uncertainty without fabricating references.',
    geminiStatus: 'pending_phase_4',
    actualGeminiOutput: null,
  },
];
