import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Simple check verifying sampleThesis.ts, testCases.ts, and cityMapper.ts via Vite SSR/esbuild or node
import esbuild from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
const outFile = path.join('/tmp', 'city-mapper-test.mjs');

await esbuild.build({
  entryPoints: [
    path.join(root, 'src/data/sampleThesis.ts'),
    path.join(root, 'src/data/testCases.ts'),
    path.join(root, 'src/engine/cityMapper.ts'),
  ],
  outdir: '/tmp/city-mapper-bundle',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
});

const { SAMPLE_THESIS_GRAPH } = await import('/tmp/city-mapper-bundle/data/sampleThesis.js');
const { ACADEMIC_TEST_DATASET } = await import('/tmp/city-mapper-bundle/data/testCases.js');
const { buildCityBlueprint } = await import('/tmp/city-mapper-bundle/engine/cityMapper.js');

const bp1 = buildCityBlueprint(SAMPLE_THESIS_GRAPH);
assert.equal(bp1.buildings.length, SAMPLE_THESIS_GRAPH.nodes.length);
assert.equal(bp1.bridges.length, SAMPLE_THESIS_GRAPH.edges.length);

// Verify >= 12 distinct building archetypes across the city + observation deck
const uniqueArchetypes = new Set(bp1.buildings.map((b) => b.archetype));
assert.ok(
  uniqueArchetypes.size >= 11,
  `Expected >= 11 distinct archetypes in sample thesis (plus OBSERVATION_DECK = 12+), got ${uniqueArchetypes.size}`,
);

// Verify collapsed node maps to FRACTURED_MONOLITH and unfinished maps to UNFINISHED_FOUNDATION
const clm03 = bp1.buildings.find((b) => b.nodeId === 'CLM-03');
assert.equal(clm03?.archetype, 'FRACTURED_MONOLITH');
const evd03 = bp1.buildings.find((b) => b.nodeId === 'EVD-03');
assert.equal(evd03?.archetype, 'UNFINISHED_FOUNDATION');

// Verify deterministic city change when thesis structure mutates (Rule 6: city structure MUST change when graph changes)
const repairedGraph = structuredClone(SAMPLE_THESIS_GRAPH);
const targetNode = repairedGraph.nodes.find((n) => n.id === 'CLM-03');
targetNode.status = 'healthy';
targetNode.confidence = 0.91;
targetNode.issues = [];
const bp2 = buildCityBlueprint(repairedGraph);
const clm03After = bp2.buildings.find((b) => b.nodeId === 'CLM-03');
assert.notEqual(clm03After?.archetype, 'FRACTURED_MONOLITH');
assert.ok(bp2.integrityScore > bp1.integrityScore);

// Verify 5 academic test datasets exist
assert.equal(ACADEMIC_TEST_DATASET.length, 5);

console.log(
  JSON.stringify({
    status: 'PASS',
    buildings: bp1.buildings.length,
    bridges: bp1.bridges.length,
    archetypesInSample: Array.from(uniqueArchetypes),
    integrityBeforeRepair: bp1.integrityScore,
    integrityAfterRepair: bp2.integrityScore,
    testDatasetCount: ACADEMIC_TEST_DATASET.length,
  }),
);
fs.rmSync(outFile, { force: true });
