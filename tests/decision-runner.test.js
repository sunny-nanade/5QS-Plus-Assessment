import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { load, JSON_SCHEMA } from 'js-yaml';
import { optionOrders, runDecision } from '../js/decision-runner.js';
import { buildItems, validateConfig } from '../js/scoring-core.js';
import { calibrationSnapshot, frozenProbeSnapshot } from './scoring-fixtures.js';
import { applyProfile } from './prompt-experiments.js';

const parse = async path => load(await readFile(new URL(path, import.meta.url), 'utf8'), {schema: JSON_SCHEMA});

test('choice-order averaging remaps every probability to its original candidate; no reference scorer is used', async () => {
  const item = {row: {type: 'choice', state: 'recorded A', question: 'Select', options: ['A', 'B']}, values: [1, 5], max: 5};
  const calls = [];
  const engine = {device: 'wasm', async logits(row) { calls.push(row.options); return row.options.map(text => text === 'B' ? 4 : 0); }};
  const result = await runDecision(engine, item, {decision_ensemble: 'reverse'});
  assert.deepEqual(calls, [['A', 'B'], ['B', 'A']]);
  assert.equal(result.score, 5); // Intentionally differs from recorded A: no hidden rule override.
  assert.equal(result.inference_calls, 2);
  assert.ok(Math.abs(result.probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-12);
});

test('ordinal and Boolean semantics are never permuted; cyclic choice costs are explicit', () => {
  assert.equal(optionOrders({type: 'score', options: ['low', 'high']}, 'cyclic').length, 1);
  assert.equal(optionOrders({type: 'noul', options: ['false', 'true']}, 'reverse').length, 1);
  assert.equal(optionOrders({type: 'choice', options: ['A', 'B', 'C']}, 'cyclic').length, 3);
});

test('invalid ensemble outputs fail closed', async () => {
  const item = {row: {type: 'choice', options: ['A', 'B']}, values: [0, 1], max: 1};
  await assert.rejects(runDecision({async logits() { return [NaN, 1]; }}, item, {decision_ensemble: 'reverse'}), /invalid logits/);
});

test('fixed tuning recipes validate; calibration and frozen probes have distinct fingerprints and denominators', async () => {
  const baseline = await parse('./laya-tuning-baseline.yaml');
  const candidates = await parse('./laya-tuning.yaml');
  for (const override of Object.values(candidates)) {
    const config = validateConfig(applyProfile(baseline, override));
    assert.equal(buildItems(calibrationSnapshot(), config).length, 50);
    assert.equal(buildItems(frozenProbeSnapshot(), config).length, 88);
  }
  assert.notEqual(JSON.stringify(calibrationSnapshot()), JSON.stringify(frozenProbeSnapshot()));
  const active = validateConfig(await parse('../scoring.yaml'));
  const aq = buildItems({aq: {questions: [{question: 'Example', scale: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']}], responses: ['Disagree']}}, active)[0];
  assert.equal(aq.row.state, 'Recorded category: B.');
  assert.ok(!aq.row.state.includes('null'));
});
