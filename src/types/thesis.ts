import { z } from 'zod';

export const ToulminRoleSchema = z.enum([
  'claim',
  'grounds',
  'warrant',
  'backing',
  'qualifier',
  'rebuttal',
]);

export type ToulminRole = z.infer<typeof ToulminRoleSchema>;

export const IssueCategorySchema = z.enum([
  'logical_leap',
  'insufficient_grounds',
  'contradiction',
  'correlation_causation',
  'missing_rebuttal',
  'unclear_source',
  'overgeneralization',
]);

export type IssueCategory = z.infer<typeof IssueCategorySchema>;

export const DestructionTypeSchema = z.enum([
  'none',
  'structural_collapse',
  'connection_failure',
  'systemic_failure',
]);

export type DestructionType = z.infer<typeof DestructionTypeSchema>;

export const AnalysisIssueSchema = z.object({
  id: z.string(),
  sourceText: z.string().min(1),
  issueCategory: IssueCategorySchema,
  severity: z.enum(['low', 'medium', 'critical']),
  rationale: z.string().min(1),
  missingEvidence: z.string().min(1),
  suggestedRevision: z.string().min(1),
  confidence: z.number().min(0).max(1),
  uncertaintyNote: z.string().min(1),
  destructionType: DestructionTypeSchema,
});

export type AnalysisIssue = z.infer<typeof AnalysisIssueSchema>;

export const ThesisNodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  titleJa: z.string(),
  role: ToulminRoleSchema,
  isCentral: z.boolean().default(false),
  sourceText: z.string(),
  sourceLocation: z.string(),
  confidence: z.number().min(0).max(1),
  status: z.enum(['healthy', 'warning', 'collapsed', 'unfinished']),
  issues: z.array(AnalysisIssueSchema),
});

export type ThesisNode = z.infer<typeof ThesisNodeSchema>;

export const RelationshipTypeSchema = z.enum([
  'supports',
  'warrants',
  'backs',
  'qualifies',
  'rebuts',
  'contradicts',
  'missing_link',
]);

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export const ThesisEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  relationshipType: RelationshipTypeSchema,
  explanation: z.string(),
  integrity: z.number().min(0).max(1),
});

export type ThesisEdge = z.infer<typeof ThesisEdgeSchema>;

export const ThesisGraphSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleJa: z.string(),
  domain: z.string(),
  abstract: z.string(),
  nodes: z.array(ThesisNodeSchema).min(1),
  edges: z.array(ThesisEdgeSchema),
});

export type ThesisGraph = z.infer<typeof ThesisGraphSchema>;

export type BuildingArchetype =
  | 'CENTRAL_SPIRE'
  | 'CLAIM_CITADEL'
  | 'CLAIM_CANTILEVER'
  | 'CLAIM_TWIN_PYLON'
  | 'CLAIM_OBELISK'
  | 'EVIDENCE_VAULT'
  | 'EVIDENCE_REACTOR'
  | 'EVIDENCE_TERRACE'
  | 'WARRANT_RELAY'
  | 'REBUTTAL_BASTION'
  | 'UNDERGROUND_CAISSON'
  | 'OBSERVATION_DECK'
  | 'UNFINISHED_FOUNDATION'
  | 'FRACTURED_MONOLITH';

export interface CityBuildingSpec {
  nodeId: string;
  code: string;
  title: string;
  titleJa: string;
  role: ToulminRole;
  archetype: BuildingArchetype;
  status: ThesisNode['status'];
  position: [number, number, number];
  rotationY: number;
  width: number;
  depth: number;
  height: number;
  confidence: number;
  issueCount: number;
  highestSeverity: 'none' | 'low' | 'medium' | 'critical';
  destructionType: DestructionType;
  node: ThesisNode;
}

export interface CityBridgeSpec {
  edgeId: string;
  sourceId: string;
  targetId: string;
  start: [number, number, number];
  end: [number, number, number];
  relationshipType: RelationshipType;
  status: 'intact' | 'unstable' | 'severed';
  integrity: number;
  explanation: string;
}

export interface CityObservationDeckSpec {
  id: string;
  label: string;
  position: [number, number, number];
  rotationY: number;
  width: number;
  depth: number;
}

export interface CityBlueprint {
  thesisId: string;
  thesisTitle: string;
  thesisTitleJa: string;
  integrityScore: number;
  buildings: CityBuildingSpec[];
  bridges: CityBridgeSpec[];
  observationDecks: CityObservationDeckSpec[];
  criticalZoneCenter: [number, number, number];
}

export type AnalysisSourceKind = 'sample' | 'gemini' | 'imported';

export const SUPPORTED_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
] as const;

export type GeminiModelId = (typeof SUPPORTED_GEMINI_MODELS)[number];
export const DEFAULT_GEMINI_MODEL: GeminiModelId = 'gemini-3.5-flash-lite';

export interface GeminiBenchmarkActual {
  benchmarkId: string;
  sourceText: string;
  detectedIssueCategory: IssueCategory | 'none';
  detectedSeverity: 'none' | 'low' | 'medium' | 'critical';
  rationale: string;
  missingEvidence: string;
  suggestedRevision: string;
  confidence: number;
  uncertaintyNote: string;
  destructionType: DestructionType;
  categoryMatch: boolean;
  severityMatch: boolean;
  model: string;
  latencyMs: number;
}

export type NodeTransitionKind = 'reconstructed' | 'collapsed' | 'downgraded' | 'refined';

export interface NodeTransitionEvent {
  nodeId: string;
  kind: NodeTransitionKind;
  startedAtMs: number;
  prevStatus: ThesisNode['status'];
  nextStatus: ThesisNode['status'];
}

export interface RevisionHistoryEntry {
  id: string;
  nodeId: string;
  prevGraph: ThesisGraph;
  prevIntegrity: number;
  nextIntegrity: number;
  kind: NodeTransitionKind;
  summary: string;
  timestamp: string;
}
