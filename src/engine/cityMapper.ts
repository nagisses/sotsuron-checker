import {
  BuildingArchetype,
  CityBlueprint,
  CityBridgeSpec,
  CityBuildingSpec,
  CityObservationDeckSpec,
  ThesisEdge,
  ThesisGraph,
  ThesisGraphSchema,
  ThesisNode,
} from '../types/thesis';

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function selectClaimArchetype(node: ThesisNode, index: number): BuildingArchetype {
  if (node.isCentral) return 'CENTRAL_SPIRE';
  if (node.status === 'collapsed') return 'FRACTURED_MONOLITH';
  const claimPool: BuildingArchetype[] = [
    'CLAIM_CITADEL',
    'CLAIM_TWIN_PYLON',
    'CLAIM_CANTILEVER',
    'CLAIM_OBELISK',
  ];
  return claimPool[index % claimPool.length];
}

function selectArchetype(node: ThesisNode, roleIndex: number): BuildingArchetype {
  if (node.status === 'unfinished') return 'UNFINISHED_FOUNDATION';
  if (node.status === 'collapsed' && node.role === 'claim') return 'FRACTURED_MONOLITH';

  switch (node.role) {
    case 'claim':
      return selectClaimArchetype(node, roleIndex);
    case 'grounds': {
      const pool: BuildingArchetype[] = ['EVIDENCE_VAULT', 'EVIDENCE_REACTOR', 'EVIDENCE_TERRACE'];
      return pool[roleIndex % pool.length];
    }
    case 'warrant':
    case 'qualifier':
      return 'WARRANT_RELAY';
    case 'backing':
      return 'UNDERGROUND_CAISSON';
    case 'rebuttal':
      return 'REBUTTAL_BASTION';
    default:
      return 'CLAIM_OBELISK';
  }
}

function highestIssueSeverity(node: ThesisNode): 'none' | 'low' | 'medium' | 'critical' {
  if (node.issues.length === 0) return 'none';
  if (node.issues.some((i) => i.severity === 'critical')) return 'critical';
  if (node.issues.some((i) => i.severity === 'medium')) return 'medium';
  return 'low';
}

function primaryDestructionType(node: ThesisNode): CityBuildingSpec['destructionType'] {
  if (node.issues.some((i) => i.destructionType === 'systemic_failure')) return 'systemic_failure';
  if (node.issues.some((i) => i.destructionType === 'structural_collapse')) return 'structural_collapse';
  if (node.issues.some((i) => i.destructionType === 'connection_failure')) return 'connection_failure';
  return 'none';
}

function resolveBridgeStatus(
  edge: ThesisEdge,
  nodeMap: Map<string, CityBuildingSpec>,
): CityBridgeSpec['status'] {
  const src = nodeMap.get(edge.source);
  const dst = nodeMap.get(edge.target);
  if (edge.relationshipType === 'missing_link' || edge.integrity < 0.35) {
    return 'severed';
  }
  if (
    edge.relationshipType === 'contradicts' ||
    src?.status === 'collapsed' ||
    src?.status === 'unfinished' ||
    dst?.status === 'collapsed'
  ) {
    return 'unstable';
  }
  return 'intact';
}

/**
 * Deterministically transforms a Zod-validated Toulmin ThesisGraph
 * into a 3D Brutalist urban blueprint.
 */
export function buildCityBlueprint(rawGraph: ThesisGraph): CityBlueprint {
  const graph = ThesisGraphSchema.parse(rawGraph);
  const degreeMap = new Map<string, number>();

  for (const edge of graph.edges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
  }

  const centralNode = graph.nodes.find((n) => n.isCentral) ?? graph.nodes[0];
  const supportingClaims = graph.nodes.filter((n) => n.id !== centralNode.id && n.role === 'claim');
  const warrants = graph.nodes.filter((n) => n.role === 'warrant' || n.role === 'qualifier');
  const grounds = graph.nodes.filter((n) => n.role === 'grounds');
  const rebuttals = graph.nodes.filter((n) => n.role === 'rebuttal');
  const backings = graph.nodes.filter((n) => n.role === 'backing');

  const buildings: CityBuildingSpec[] = [];

  const pushNode = (
    node: ThesisNode,
    archetype: BuildingArchetype,
    position: [number, number, number],
    rotationY: number,
    width: number,
    depth: number,
    height: number,
  ) => {
    buildings.push({
      nodeId: node.id,
      code: node.code,
      title: node.title,
      titleJa: node.titleJa,
      role: node.role,
      archetype,
      status: node.status,
      position,
      rotationY,
      width,
      depth,
      height,
      confidence: node.confidence,
      issueCount: node.issues.length,
      highestSeverity: highestIssueSeverity(node),
      destructionType: primaryDestructionType(node),
      node,
    });
  };

  // 1. Central Thesis Monument at origin
  const centralDegree = degreeMap.get(centralNode.id) ?? 4;
  pushNode(
    centralNode,
    'CENTRAL_SPIRE',
    [0, 0, 0],
    0,
    9.5,
    9.5,
    34 + Math.min(6, centralDegree * 0.9),
  );

  // 2. Supporting Claim Structures arranged in clear non-occluding lanes around Inner Ring (radius 21 - 24m)
  const claimAngles = [
    Math.PI * 0.14,
    Math.PI * 0.86,
    Math.PI * 1.72,
    Math.PI * 1.28,
    Math.PI * 0.48,
  ];
  supportingClaims.forEach((node, idx) => {
    const angle =
      claimAngles[idx % claimAngles.length] + Math.floor(idx / claimAngles.length) * 0.3;
    const radius = idx === 2 ? 23.0 : 21.5 + (hashString(node.id) % 4);
    const x = Math.cos(angle) * radius;
    const z = -Math.sin(angle) * radius;
    const degree = degreeMap.get(node.id) ?? 1;
    const isCollapsed = node.status === 'collapsed';
    const height = (isCollapsed ? 22 : 19 + node.confidence * 9) + degree * 0.6;
    const footprint = 6.2 + (hashString(node.id + '_w') % 16) * 0.07;
    const archetypeIdx = idx === 2 ? 0 : idx;
    pushNode(
      node,
      selectArchetype(node, archetypeIdx),
      [x, 0, z],
      -angle + Math.PI * 0.5,
      footprint,
      footprint,
      height,
    );
  });

  // 3. Warrant Relays placed along mid-ring (~27m)
  const warrantAngles = [Math.PI * 0.88, Math.PI * 0.12];
  warrants.forEach((node, idx) => {
    const angle =
      warrantAngles[idx % warrantAngles.length] + Math.floor(idx / warrantAngles.length) * 0.95;
    const radius = idx === 1 ? 28.5 : 26.5;
    const x = Math.cos(angle) * radius;
    const z = -Math.sin(angle) * radius;
    pushNode(
      node,
      selectArchetype(node, idx),
      [x, 0, z],
      -angle,
      5.0,
      5.0,
      13.5 + node.confidence * 4.5,
    );
  });

  // 4. Grounds / Evidence Structures in Reinforced Plinth Ring (radius 25 - 33m)
  const groundAngles = [
    Math.PI * 1.24,
    Math.PI * 1.76,
    Math.PI * 0.32,
    Math.PI * 0.72,
  ];
  grounds.forEach((node, idx) => {
    const isUnfinished = node.status === 'unfinished';
    const angle =
      groundAngles[idx % groundAngles.length] + Math.floor(idx / groundAngles.length) * 0.35;
    const radius = idx === 2 ? 31.5 : 27.5 + (hashString(node.id) % 4);
    const x = Math.cos(angle) * radius;
    const z = -Math.sin(angle) * radius;
    pushNode(
      node,
      selectArchetype(node, idx),
      [x, 0, z],
      -angle + Math.PI * 0.25,
      7.8,
      7.0,
      isUnfinished ? 10.5 : 11.5 + node.confidence * 4.5,
    );
  });

  // 5. Rebuttal Structures at Perimeter Ring (radius ~34m)
  rebuttals.forEach((node, idx) => {
    const angle = idx === 0 ? Math.PI * 1.28 : Math.PI * 1.54;
    const radius = 34.5;
    const x = Math.cos(angle) * radius;
    const z = -Math.sin(angle) * radius;
    pushNode(
      node,
      selectArchetype(node, idx),
      [x, 0, z],
      -angle + Math.PI,
      6.8,
      5.8,
      15.5 + node.confidence * 4.0,
    );
  });

  // 6. Backing / Source Anchors (~24m)
  backings.forEach((node, idx) => {
    const angle = Math.PI * 0.88 + idx * 1.7;
    const radius = 24.5;
    const x = Math.cos(angle) * radius;
    const z = -Math.sin(angle) * radius;
    pushNode(
      node,
      'UNDERGROUND_CAISSON',
      [x, 0, z],
      angle,
      6.2,
      6.2,
      9.0,
    );
  });

  // Build lookup map for bridge routing
  const buildingMap = new Map<string, CityBuildingSpec>();
  for (const b of buildings) {
    buildingMap.set(b.nodeId, b);
  }

  // 7. Logical Connection Bridges from Claim Graph Edges
  const bridges: CityBridgeSpec[] = [];
  for (const edge of graph.edges) {
    const src = buildingMap.get(edge.source);
    const dst = buildingMap.get(edge.target);
    if (!src || !dst) continue;

    const srcY = src.archetype === 'UNDERGROUND_CAISSON' ? 3.5 : Math.min(src.height * 0.62, 18);
    const dstY = dst.archetype === 'CENTRAL_SPIRE' ? 19 : Math.min(dst.height * 0.62, 18);
    const bridgeY = Math.max(6.2, (srcY + dstY) * 0.5);

    bridges.push({
      edgeId: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      start: [src.position[0], bridgeY, src.position[2]],
      end: [dst.position[0], bridgeY, dst.position[2]],
      relationshipType: edge.relationshipType,
      status: resolveBridgeStatus(edge, buildingMap),
      integrity: edge.integrity,
      explanation: edge.explanation,
    });
  }

  // Keep diorama focused cleanly on verified paper structures (no extra deck clutter)
  const observationDecks: CityObservationDeckSpec[] = [];

  // Critical zone center for collapse close-up camera framing
  const collapsedBuilding =
    buildings.find((b) => b.status === 'collapsed' && b.role === 'claim') ??
    buildings.find((b) => b.status === 'collapsed') ??
    buildings[1] ??
    buildings[0];

  // Deterministic overall structural integrity score (0-100)
  const avgConfidence =
    buildings.reduce((acc, b) => acc + b.confidence, 0) / Math.max(1, buildings.length);
  const criticalPenalty = buildings.filter((b) => b.highestSeverity === 'critical').length * 6;
  const integrityScore = Math.max(12, Math.min(99, Math.round(avgConfidence * 100 - criticalPenalty)));

  return {
    thesisId: graph.id,
    thesisTitle: graph.title,
    thesisTitleJa: graph.titleJa,
    integrityScore,
    buildings,
    bridges,
    observationDecks,
    criticalZoneCenter: collapsedBuilding.position,
  };
}
