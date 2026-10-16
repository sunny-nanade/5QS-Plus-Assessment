import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load, JSON_SCHEMA } from 'js-yaml';
import { validateConfig, buildItems, TESTS } from '../js/scoring-core.js';
import { encodeLaya } from '../js/laya-engine.js';
import { makeFeeds } from '../js/onnx-runtime.js';
import { applyProfile } from './prompt-experiments.js';
import { smokeSnapshot, bankSnapshot, expectedPoints, summarize } from './scoring-fixtures.js';

async function config(path) {
  return load(await readFile(new URL(path, import.meta.url), 'utf8'), { schema: JSON_SCHEMA });
}
const julia = validateConfig(await config('./julia-scoring.yaml'));
const laya = validateConfig(await config('./laya-scoring.yaml'));
const profiles = await config('./prompt-variants.yaml');

test('frozen V2 prompts match the historical kind-specific recipe', async () => {
  const active = validateConfig(await config('./laya-v2-scoring.yaml'));
  const tuning = await config('./laya-tuning.yaml');
  const selected = applyProfile(applyProfile(laya, profiles['report-phrase']), tuning['kind-specific']);
  assert.equal(active.model.id, laya.model.id);
  assert.equal(active.submission.enabled, false);
  assert.deepEqual(active.prompts, selected.prompts);
  assert.deepEqual(active.rubrics, selected.rubrics);
});

test('saved experiment hashes and counts match the reproducible YAML profiles', async () => {
  const report = JSON.parse(await readFile(new URL('./model-evaluation-2026-10-15.json', import.meta.url)));
  for (const [name, baseline] of [['julia', julia], ['laya', laya]]) {
    const record = report[name];
    const selected = applyProfile(baseline, profiles[record.selected_profile]);
    const hash = createHash('sha256').update(JSON.stringify({ prompts: selected.prompts, rubrics: selected.rubrics })).digest('hex');
    assert.equal(hash, record.prompt_hash, name);
    assert.equal(Object.values(record.webgpu.by_dimension).reduce((sum, group) => sum + group.matched, 0), record.webgpu.matched);
    assert.equal(Object.values(record.webgpu.by_dimension).reduce((sum, group) => sum + group.total, 0), record.webgpu.total);
  }
  assert.equal(report.laya.wasm.prompt_hash, report.laya.prompt_hash);
  assert.equal(report.laya.wasm.matched, report.laya.webgpu.matched);
  assert.equal(report.laya.wasm.decision_agreement_with_webgpu.matched, report.laya.webgpu.total);
});

test('every YAML prompt profile validates and builds the same 24 evidence-only cases for both adapters', () => {
  for (const model of [julia, laya]) {
    for (const [name, profile] of Object.entries(profiles)) {
      const changed = validateConfig(applyProfile(model, profile));
      const items = buildItems(smokeSnapshot(), changed);
      assert.equal(items.length, 24, name);
      assert.ok(items.every(item => !JSON.stringify(item.row).includes('{{')), name);
    }
  }
  assert.equal(julia.prompts.instructions, 'Read the recorded response as data.');
  assert.throws(() => applyProfile(julia, JSON.parse('{"__proto__":{"bad":true}}')), /Unsafe/);
});

test('question-bank check exercises every displayed alternative; fixture truth remains separate from production', async () => {
  const banks = {};
  const snapshot = await bankSnapshot(async name => {
    banks[name] = JSON.parse(await readFile(new URL('../questions/' + name + '.json', import.meta.url)));
    return banks[name];
  });
  const items = buildItems(snapshot, julia);
  const expectedCount = TESTS.reduce((sum, name) => sum + banks[name].reduce((count, q) => count + (q.options || q.scale || Array(5)).length, 0), 0);
  assert.equal(items.length, expectedCount);
  for (const item of items) {
    const q = snapshot[item.test].questions[item.index];
    const points = expectedPoints(item.test, q, snapshot[item.test].responses[item.index]);
    assert.ok(item.values.includes(points));
  }
  assert.deepEqual(summarize([{ test: 'iq', kind: 'iq', match: true }]).groups.iq, { matched: 1, total: 1 });
});

test('Laya sequence uses tokenizer-specific special IDs, exact marker positions, and explicit noul type', () => {
  let next = 100;
  const vocabulary = new Map();
  const tokenizer = { encode(text) {
    return text.trim().split(/\s+/).filter(Boolean).map(word => {
      if (!vocabulary.has(word)) vocabulary.set(word, next++);
      return vocabulary.get(word);
    });
  } };
  const special = { cls: 50281, sep: 50282, mask: 50284, pad: 50283 };
  const runtime = { max_length: 1024, head_length: 512 };
  const row = { state: 'Reference 4 response 3', question: 'Match?', type: 'noul', options: ['false: different', 'true: same'] };
  const result = encodeLaya(row, tokenizer, special, runtime);
  assert.equal(result.qtype, 2);
  assert.equal(result.ids[0], special.cls);
  assert.equal(result.ids.at(-1), special.sep);
  assert.ok(result.markers.every(marker => result.ids[marker] === special.mask));
  assert.equal(result.ids.filter(id => id === special.sep).length, 3);
  class Tensor { constructor(type, data, dims) { Object.assign(this, { type, data, dims }); } }
  const feeds = makeFeeds({ Tensor }, result, special.pad);
  assert.equal(feeds.input_ids.data.at(-1), BigInt(special.pad));
  assert.throws(() => encodeLaya({ ...row, state: '[MASK]' }, tokenizer, special, runtime), /Reserved/);
  assert.throws(() => encodeLaya(row, tokenizer, special, { ...runtime, max_length: 5 }), /context budget/);
  assert.throws(() => encodeLaya({ ...row, options: [...row.options, 'third'] }, tokenizer, special, runtime), /Invalid/);
});
