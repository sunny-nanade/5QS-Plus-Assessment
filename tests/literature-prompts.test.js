import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {load, JSON_SCHEMA} from 'js-yaml';
import {validateConfig, buildItems, aggregate} from '../js/scoring-core.js';
import {applyProfile} from './prompt-experiments.js';
import {literatureProbes} from './literature-fixtures.js';
import {bankSnapshot} from './scoring-fixtures.js';
import {frozenProbeSnapshot} from './scoring-fixtures.js';
import {combineSnapshots, categoryProbes} from './category-fixtures.js';

const yaml = async name => load(await readFile(new URL(name, import.meta.url), 'utf8'), {schema: JSON_SCHEMA});
const baseline = validateConfig(await yaml('./laya-v2-scoring.yaml'));
const profiles = await yaml('./literature-prompts.yaml');

test('active V4 recipe exactly combines the selected nominal and category-manual candidates', async () => {
  const active = validateConfig(await yaml('../scoring.yaml'));
  const selected = applyProfile(applyProfile(baseline, profiles['nominal-letters']), (await yaml('./category-prompts.yaml'))['category-manual']);
  assert.equal(active.submission.enabled, false);
  assert.deepEqual(active.prompts, selected.prompts);
  assert.deepEqual(active.rubrics, selected.rubrics);
  assert.equal(createHash('sha256').update(JSON.stringify({prompts: active.prompts, rubrics: active.rubrics})).digest('hex'),
    '744f9b2d943489ef773a48a44ca6ae7966029b570fc318b06f8e7cd18161e6d0');
});

test('all V3 literature/nominal prompt candidates validate against every bank alternative', async () => {
  const snapshot = await bankSnapshot(async test => JSON.parse(await readFile(new URL('../questions/' + test + '.json', import.meta.url), 'utf8')));
  for (const profile of Object.values(profiles)) {
    assert.equal(buildItems(snapshot, validateConfig(applyProfile(baseline, profile))).length, 718);
  }
  assert.equal(Object.keys(profiles).length, 12);
});

test('nominal encodings independently represent displayed positions, not a precomputed correctness flag', () => {
  const config = applyProfile(baseline, profiles['nominal-report']);
  const question = {question: 'Example', options: ['A healthy alternative', 'Key', 'Another'], answer: 'Key'};
  const items = buildItems({aq: {questions: [question, question], responses: ['Key', 'A healthy alternative']}}, config);
  assert.equal(items[0].row.state, 'The answer key specifies option B. The participant selected option B.');
  assert.equal(items[1].row.state, 'The answer key specifies option B. The participant selected option A.');
  assert.deepEqual(items[0].values, [1, 5]);
  // An intentionally wrong model choice stays wrong; the independent metadata
  // must never become a hidden deterministic scoring override.
  const result = aggregate({aq: {questions: [question], responses: ['Key']}}, [items[0]],
    new Map([[items[0], {score: 1, max: 5, option: 0}]]));
  assert.equal(result.itemScores.aq[0].score, 1);
  assert.throws(() => buildItems({aq: {questions: [{...question, answer: 'Absent'}], responses: ['Key']}}, config), /displayed answer key/);
  assert.throws(() => buildItems({aq: {questions: [{...question, options: ['Key', 'key']}], responses: ['Key']}}, config), /distinct displayed/);
});

test('V3 probes cover all nominal key positions for two to eight options and reverse-coded novel scales', () => {
  const snapshot = literatureProbes();
  const items = buildItems(snapshot, baseline);
  assert.equal(items.length, 180);
  assert.equal(items.filter(item => item.kind === 'iq').length, 70);
  assert.equal(items.filter(item => item.kind === 'mcq').length, 70);
  assert.equal(items.filter(item => item.kind === 'likert').length, 40);
  for (let count = 2; count <= 8; count++) {
    const questions = snapshot.iq.questions.filter(q => q.options.length === count);
    assert.equal(new Set(questions.map(q => q.options.indexOf(q.answer))).size, count);
  }
  assert.equal(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
    '479ce30c5dc86703ad65501fdc403215989f6f95cb2b5548fa631d4b32882ca0');
});

test('saved V3 comparisons and negative generalisation result match frozen recipes and evidence', async () => {
  const report = JSON.parse(await readFile(new URL('./model-evaluation-v3.json', import.meta.url), 'utf8'));
  assert.equal(report.psychological_validity_established, false);
  assert.equal(createHash('sha256').update(await readFile(new URL('./literature-prompts.yaml', import.meta.url))).digest('hex'), report.profiles_file_sha256);
  for (const candidate of report.candidates) {
    const selected = applyProfile(baseline, profiles[candidate.profile]);
    assert.equal(createHash('sha256').update(JSON.stringify({prompts: selected.prompts, rubrics: selected.rubrics})).digest('hex'), candidate.prompt_hash);
  }
  const novel = literatureProbes();
  for (const failure of report.novel_failures) {
    assert.equal(novel[failure.test].responses[failure.index], failure.response);
  }
  assert.equal(report.novel_failures.length, 180 - 170);
});

test('V4 category candidates use independent category identity and an already-reversed candidate mapping', async () => {
  const candidates = await yaml('./category-prompts.yaml');
  const config = applyProfile(applyProfile(baseline, profiles['nominal-letters']), candidates['category-short']);
  const question = {question: 'Record', scale: ['v', 'w', 'x', 'y', 'z'], reverse: true};
  const item = buildItems({eq: {questions: [question], responses: ['v']}}, config)[0];
  assert.equal(item.row.state, 'Recorded category: A.');
  assert.deepEqual(item.row.options, ['Category E', 'Category D', 'Category C', 'Category B', 'Category A']);
  const snapshot = combineSnapshots(frozenProbeSnapshot(), literatureProbes());
  assert.equal(buildItems(snapshot, config).length, 268);
  assert.equal(buildItems(categoryProbes(), config).length, 414);
  assert.equal(createHash('sha256').update(JSON.stringify(categoryProbes())).digest('hex'),
    '1cecf39afd5d40bfb4c21286f20b6a0ef3af94a8ce3db1aea84dc92d57158db4');
  for (const profile of Object.values(candidates)) {
    const selected = validateConfig(applyProfile(applyProfile(baseline, profiles['nominal-letters']), profile));
    assert.equal(buildItems(categoryProbes(), selected).length, 414);
  }
  assert.throws(() => buildItems({eq: {questions: [{question: 'Ambiguous', scale: ['A', 'B', 'B', 'D', 'E']}], responses: ['B']}}, config), /distinct displayed options/);
});

test('V4 saved development/probe results retain every failure and expose duplicate-input counts', async () => {
  const report = JSON.parse(await readFile(new URL('./model-evaluation-v4.json', import.meta.url), 'utf8'));
  const candidates = await yaml('./category-prompts.yaml');
  const base = applyProfile(baseline, profiles['nominal-letters']);
  assert.equal(report.psychological_validity_established, false);
  assert.equal(createHash('sha256').update(await readFile(new URL('./category-prompts.yaml', import.meta.url))).digest('hex'), report.profiles_file_sha256);
  for (const candidate of report.candidates) {
    const selected = applyProfile(base, candidates[candidate.profile]);
    assert.equal(createHash('sha256').update(JSON.stringify({prompts: selected.prompts, rubrics: selected.rubrics})).digest('hex'), candidate.prompt_hash);
  }
  const config = applyProfile(base, candidates[report.selected_profile]);
  const bank = await bankSnapshot(async test => JSON.parse(await readFile(new URL('../questions/' + test + '.json', import.meta.url), 'utf8')));
  const datasets = {986: combineSnapshots(bank, frozenProbeSnapshot(), literatureProbes()), 718: bank, 414: categoryProbes()};
  for (const evaluation of report.evaluations) {
    const snapshot = datasets[evaluation.total];
    const items = buildItems(snapshot, config);
    assert.equal(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'), evaluation.input_hash);
    assert.equal(items.length, evaluation.total);
    assert.equal(new Set(items.map(item => JSON.stringify(item.row))).size, evaluation.distinct_model_inputs);
    assert.equal(new Set(items.map(item => JSON.stringify([item.row, item.values]))).size, evaluation.unique_requests);
  }
  const novel = categoryProbes();
  for (const failure of report.novel_failures) assert.equal(novel[failure.test].responses[failure.index], failure.response);
  assert.equal(report.novel_failures.length, 414 - 412);
  const seenRows = new Set(buildItems(datasets[986], config).map(item => JSON.stringify(item.row)));
  const probeItems = buildItems(novel, config);
  const newItems = probeItems.filter(item => !seenRows.has(JSON.stringify(item.row)));
  assert.equal(newItems.length, report.v4_probe_overlap.cases_with_new_inputs.total);
  assert.equal(new Set(newItems.map(item => JSON.stringify(item.row))).size, report.v4_probe_overlap.distinct_inputs_not_seen_in_development);
  const cpu = report.evaluations.find(row => row.backend === 'wasm');
  assert.equal(cpu.prompt_hash, report.prompt_hash);
  assert.equal(cpu.config_hash, report.active_config_hash);
  assert.deepEqual(cpu.decision_agreement_with_webgpu, {matched: 718, total: 718});
  assert.equal(createHash('sha256').update(await readFile(new URL('../scoring.yaml', import.meta.url))).digest('hex'), report.active_config_hash);
});

test('stress output does not invent PSS severity cut-offs from the adapted index', async () => {
  const {renderScores} = await import('../js/results-view.js');
  const elements = new Map();
  const previous = globalThis.document;
  globalThis.document = {getElementById(id) {
    if (!elements.has(id)) elements.set(id, {style: {}, innerHTML: '', textContent: ''});
    return elements.get(id);
  }};
  try {
    const tests = ['iq', 'eq', 'aq', 'sq', 'dq', 'stress'];
    renderScores({scores: {STRESS: 100}, meta: {stress: {attempted: 1}},
      composites: {}, itemScores: {}, fiveQSPlus: 0},
    Object.fromEntries(tests.map(test => [test, {questions: [], responses: []}])));
    const html = elements.get('interpretationBands').innerHTML;
    assert.match(html, /Unvalidated index/);
    assert.doesNotMatch(html, /Low Stress|Very High|>High</);
  } finally {globalThis.document = previous;}
});
