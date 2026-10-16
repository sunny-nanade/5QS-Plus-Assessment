import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { load, JSON_SCHEMA } from 'js-yaml';
import { validateConfig, buildItems } from '../js/scoring-core.js';
import { restoreResult } from '../js/result-cache.js';
import { bankSnapshot, frozenProbeSnapshot, smokeSnapshot, calibrationSnapshot, expectedPoints, summarize } from './scoring-fixtures.js';
import {literatureProbes} from './literature-fixtures.js';
import {categoryProbes, combineSnapshots} from './category-fixtures.js';
import {applyProfile} from './prompt-experiments.js';
import {runDecision} from '../js/decision-runner.js';

const root = new URL('../', import.meta.url);
const config = validateConfig(load(await readFile(new URL('scoring.yaml', root), 'utf8'), {schema: JSON_SCHEMA}));

test('local result reviews invalidate on changed evidence/config and restore model points, not answer-key points', () => {
  const snapshot = {iq: {questions: [{question: '2+2?', options: ['3', '4'], answer: '4'}], responses: ['4']}};
  const items = buildItems(snapshot, config);
  const saved = {scoring: {config_hash: 'config', input_hash: 'input', backend: 'webgpu', method: 'local-model-experimental'},
    itemScores: {iq: [{option: 0, score: 0, max: 1, confidence: .8, probabilities: [.8, .2]}]}};
  const restored = restoreResult(saved, snapshot, items, 'config', 'input');
  assert.equal(restored.scores.IQ, 0); // Deliberately wrong cached model choice is not silently fixed.
  assert.equal(restored.scoring.cache_hit, true);
  assert.equal(restoreResult(saved, snapshot, items, 'new-config', 'input'), null);
  assert.equal(restoreResult(saved, snapshot, items, 'config', 'new-input'), null);
  const corrupt = structuredClone(saved); corrupt.itemScores.iq[0].option = 100;
  assert.equal(restoreResult(corrupt, snapshot, items, 'config', 'input'), null);
});

test('v2 saved recipe/input hashes, denominators and independent-probe labels remain reproducible', async () => {
  const config = validateConfig(load(await readFile(new URL('tests/laya-v2-scoring.yaml', root), 'utf8'), {schema: JSON_SCHEMA}));
  const report = JSON.parse(await readFile(new URL('tests/model-evaluation-v2.json', root), 'utf8'));
  const hash = createHash('sha256').update(JSON.stringify({prompts: config.prompts, rubrics: config.rubrics})).digest('hex');
  assert.equal(hash, report.prompt_hash);
  assert.equal(config.runtime.decision_ensemble, report.decision_ensemble);
  assert.equal(config.submission.enabled, false);
  const gpu = report.evaluations.find(row => row.profile === report.selected_profile && row.backend === 'webgpu' && row.total === 718);
  const cpu = report.evaluations.find(row => row.backend === 'wasm');
  assert.equal(cpu.matched, gpu.matched);
  assert.equal(cpu.input_hash, gpu.input_hash);
  assert.equal(cpu.prompt_hash, report.prompt_hash);
  assert.equal(cpu.decision_agreement_with_webgpu.matched, gpu.total);
  const bank = await bankSnapshot(async name => JSON.parse(await readFile(new URL('questions/' + name + '.json', root), 'utf8')));
  for (const [snapshot, evaluation] of [[bank, gpu], [frozenProbeSnapshot(), report.evaluations.find(row => row.total === 88)]]) {
    assert.equal(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'), evaluation.input_hash);
    const items = buildItems(snapshot, config);
    assert.equal(new Set(items.map(item => JSON.stringify(item.row))).size, evaluation.distinct_model_inputs);
    assert.equal(new Set(items.map(item => JSON.stringify([item.row, item.values]))).size, evaluation.unique_requests);
  }
  for (const failure of report.bank_failures) {
    const group = bank[failure.test], index = failure.flattened_case_index;
    assert.equal(group.responses[index], failure.response);
    assert.equal(expectedPoints(failure.test, group.questions[index], group.responses[index]), failure.expected);
  }
  for (const evaluation of report.evaluations) {
    if (!evaluation.by_dimension) continue;
    assert.equal(Object.values(evaluation.by_dimension).reduce((sum, row) => sum + row.total, 0), evaluation.total);
    assert.equal(Object.values(evaluation.by_dimension).reduce((sum, row) => sum + row.matched, 0), evaluation.matched);
  }
});

test('static Pages entry points and documentation have existing relative local links', async () => {
  await stat(new URL('.nojekyll', root));
  for (const name of ['index.html', 'assessment.html', 'info.html', 'test.html', 'results.html', 'thank-you.html', 'benchmarks.html', 'model-licenses.html']) {
    const html = await readFile(new URL(name, root), 'utf8');
    for (const [, link] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      if (/^[a-z]+:/i.test(link)) continue;
      assert.ok(!link.startsWith('/'), name + ' must work on a Pages project subpath: ' + link);
      await stat(new URL(link.split(/[?#]/)[0], new URL(name, root)));
    }
  }
  const documents = ['README.md', 'PULL_REQUEST.md', 'MODEL_LICENSES.md',
    ...(await readdir(new URL('docs/', root))).filter(name => name.endsWith('.md')).map(name => 'docs/' + name)];
  for (const name of documents) {
    const markdown = await readFile(new URL(name, root), 'utf8');
    for (const [, link] of markdown.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^[a-z]+:/i.test(link) || link.startsWith('#')) continue;
      assert.ok(!link.startsWith('/'), name + ' must retain relative documentation links: ' + link);
      await stat(new URL(link.split(/[?#]/)[0], new URL(name, root)));
    }
  }
});

test('production module graph does not import benchmark reference points', async () => {
  const seen = new Set();
  async function visit(url) {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const code = await readFile(url, 'utf8');
    for (const [, path] of code.matchAll(/(?:from\s+|import\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
      const dependency = new URL(path, url);
      assert.ok(!dependency.pathname.includes('/tests/'), 'Fixture truth leaked into production');
      await visit(dependency);
    }
  }
  for (const name of ['assessment-shell.js', 'scoring-worker.js', 'results-controller.js']) await visit(new URL('js/' + name, root));
});

test('all local JavaScript modules parse on the supported Node runtime', async () => {
  for (const directory of ['js', 'scripts']) {
    for (const name of await readdir(new URL(directory + '/', root))) {
      if (!name.endsWith('.js')) continue;
      const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(directory + '/' + name, root))], {encoding: 'utf8'});
      assert.equal(result.status, 0, name + ': ' + result.stderr);
    }
  }
});

test('benchmark worker shares sweep/bank loaders without changing fixtures, profiles or serialized inference', async () => {
  const moduleURL = new URL('tests/model-smoke-worker.js', root);
  const source = (await readFile(moduleURL, 'utf8')).replace(/^import .*;\r?\n/gm, '')
    .replaceAll('import.meta.url', JSON.stringify(moduleURL.href));
  const yaml = async url => load(await readFile(url, 'utf8'), {schema: JSON_SCHEMA});
  const baseline = await yaml(new URL('tests/laya-v2-scoring.yaml', root));
  const variants = await yaml(new URL('tests/prompt-variants.yaml', root));
  const tuning = await yaml(new URL('tests/laya-tuning.yaml', root));
  const literature = await yaml(new URL('tests/literature-prompts.yaml', root));
  const categories = await yaml(new URL('tests/category-prompts.yaml', root));
  const bank = await bankSnapshot(async test => JSON.parse(await readFile(new URL('questions/' + test + '.json', root), 'utf8')));
  const hash = value => createHash('sha256').update(value).digest('hex');
  let loads = 0, calls = 0, running = 0, concurrent = 0, failBank = false, failDefinitions = true;
  const messages = [];
  const context = vm.createContext({URL, structuredClone, performance, validateConfig, buildItems, runDecision,
    bankSnapshot, frozenProbeSnapshot, smokeSnapshot, calibrationSnapshot, expectedPoints, summarize,
    literatureProbes, categoryProbes, combineSnapshots, applyProfile, fingerprint: async text => hash(text),
    loadYaml: async url => {
      if (failDefinitions && url.pathname.endsWith('/category-prompts.yaml')) throw new Error('Missing experiment definitions');
      return {parsed: await yaml(url)};
    },
    loadScoringConfig: async () => ({config: structuredClone(baseline), hash: 'mock-config'}),
    loadEngine: async () => {
      loads++;
      return {device: 'wasm', async logits(row) {
        calls++; running++; concurrent = Math.max(concurrent, running);
        await Promise.resolve(); running--;
        return row.options.map((_, index) => -index);
      }};
    },
    fetch: async url => ({ok: !failBank, status: failBank ? 503 : 200,
      json: async () => JSON.parse(await readFile(url, 'utf8'))}),
    self: {postMessage: message => messages.push(message)}
  });
  vm.runInContext(source, context);
  async function request(data) {
    messages.length = 0;
    context.self.onmessage({data});
    await vm.runInContext('queue', context);
    return messages.at(-1);
  }
  assert.match((await request({command: 'obsolete-command'})).error, /Unknown benchmark command/);
  assert.equal(loads, 0); // Invalid commands must not download a model.
  assert.match((await request({command: 'smoke'})).error, /Missing experiment definitions/);
  assert.equal(loads, 0); // Failed definitions must not leave a half-prepared engine.
  failDefinitions = false;
  const singleSuites = [
    ['smoke', smokeSnapshot(), {baseline: {}}],
    ['holdout', bank, {baseline: {}}],
    ['probes', frozenProbeSnapshot(), {baseline: {}}],
    ['probes-v3', literatureProbes(), {baseline: {}}],
    ['probes-v4', categoryProbes(), {baseline: {}}],
    ['probes-v3', literatureProbes(), {'nominal-letters': literature['nominal-letters']}, {profile: 'nominal-letters', literature: true}],
    ['probes-v4', categoryProbes(), {'category-manual': categories['category-manual']}, {profile: 'category-manual', categories: true}],
    ['holdout', bank, {'kind-specific': tuning['kind-specific']}, {profile: 'kind-specific', tuning: true}]
  ];
  const sweeps = [
    ['tune', smokeSnapshot(), variants], ['calibrate', calibrationSnapshot(), tuning],
    ['literature', bank, literature],
    ['categories', combineSnapshots(bank, frozenProbeSnapshot(), literatureProbes()), categories]
  ];
  for (const [command, snapshot, profiles, flags = {}] of [...singleSuites, ...sweeps]) {
    const before = calls;
    const {result, error} = await request({command, ...flags});
    assert.equal(error, undefined, command);
    const results = result.results || [result];
    assert.equal(results.length, Object.keys(profiles).length);
    assert.equal(messages.filter(message => message.intermediate).length, result.results ? results.length : 0);
    for (const [index, [name, override]] of Object.entries(profiles).entries()) {
      const base = command === 'categories' || flags.categories ? applyProfile(baseline, literature['nominal-letters']) : baseline;
      const selected = applyProfile(base, override), recorded = results[index];
      const items = buildItems(snapshot, selected);
      assert.equal(recorded.profile, name);
      assert.equal(recorded.input_hash, hash(JSON.stringify(snapshot)));
      assert.equal(recorded.prompt_hash, hash(JSON.stringify({prompts: selected.prompts, rubrics: selected.rubrics})));
      assert.equal(recorded.total, items.length);
      assert.equal(recorded.cases.length, items.length);
      assert.equal(recorded.unique_requests, new Set(items.map(item => JSON.stringify([item.row, item.values]))).size);
    }
    assert.equal(calls - before, results.reduce((sum, result) => sum + result.inference_calls, 0));
  }
  failBank = true;
  assert.match((await request({command: 'holdout'})).error, /Question bank HTTP 503/);
  assert.equal((await request({command: 'smoke'})).result.total, 24);
  messages.length = 0;
  context.self.onmessage({data: {command: 'smoke'}});
  context.self.onmessage({data: {command: 'probes'}});
  await vm.runInContext('queue', context);
  assert.deepEqual(messages.filter(message => message.result).map(message => message.result.total), [24, 88]);
  assert.equal(loads, 1);
  assert.equal(concurrent, 1);
});

test('simulator reaches the AQ branch and uses each displayed scale without stress resampling', async () => {
  const values = new Map([['submitted', 'true'], ['submission_fingerprint', 'old'], ['results_backup', 'old']]);
  const storage = {setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
  const mcq = {question: 'Synthetic item', options: ['Key', 'Other 1', 'Other 2', 'Other 3'], answer: 'Key'};
  const scale = ['None', 'One', 'Two', 'Three', 'Four'];
  const banks = {iq: [mcq], aq: [mcq], eq: [{question: 'Fallback'}],
    sq: [{question: 'Scale', scale}], dq: [{question: 'Scale', scale}], stress: [{question: 'Frequency', scale}]};
  const math = Object.create(Math); math.random = () => 0.55;
  const window = {location: {href: ''}};
  const context = vm.createContext({window, localStorage: storage, Math: math, console: {log() {}},
    fetch: async path => ({json: async () => banks[path.match(/questions\/(\w+)\.json/)[1]]})});
  await vm.runInContext(await readFile(new URL('simulate_test.js', root), 'utf8'), context);
  assert.deepEqual(JSON.parse(values.get('iq_responses')), ['Key']);
  assert.deepEqual(JSON.parse(values.get('aq_responses')), ['Other 2']);
  assert.deepEqual(JSON.parse(values.get('stress_responses')), ['Two']);
  assert.deepEqual(JSON.parse(values.get('eq_responses')), ['Agree']);
  for (const key of ['submitted', 'submission_fingerprint', 'results_backup']) assert.equal(values.has(key), false);
  assert.equal(window.location.href, 'results.html');
});
