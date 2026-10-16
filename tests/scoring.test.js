import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { load, JSON_SCHEMA } from 'js-yaml';
import { validateConfig, fillTemplate, buildItems, decisionFromLogits, aggregate, TESTS } from '../js/scoring-core.js';
import { LocalSession, makeFeeds, downloadAsset } from '../js/onnx-runtime.js';

const yaml = await readFile(new URL('../scoring.yaml', import.meta.url), 'utf8');
const config = validateConfig(load(yaml, { schema: JSON_SCHEMA }));
const copy = () => structuredClone(config);
const scale = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
const likert = (subscale = 'General', reverse = false) => ({ question: 'Example?', scale, subscale, reverse });

test('real YAML validates; invalid devices, templates, ranges and schemas fail closed', () => {
  assert.equal(config.model.id, 'm1rhan/laya-typed-decisions-ONNX');
  for (const mutate of [
    c => { c.version = 2; },
    c => { c.submission.enabled = 'yes'; },
    c => { c.runtime.preferred_device = 'cloud'; },
    c => { c.runtime.cpu_threads = 4; },
    c => { c.prompts.state = '{{name}}'; },
    c => { c.rubrics.iq.options[0].value = -1; },
    c => { c.rubrics.likert.options.reverse(); },
    c => { c.model.files.graph = ''; },
    c => { c.prompts.dimensions.invalid = { instructions: 'bad' }; }
  ]) {
    const changed = copy(); mutate(changed);
    assert.throws(() => validateConfig(changed));
  }
});

test('all actual question banks build requests with their exact displayed scales', async () => {
  const snapshot = {};
  for (const name of TESTS) {
    const questions = JSON.parse(await readFile(new URL('../questions/' + name + '.json', import.meta.url)));
    snapshot[name] = { questions, responses: questions.map(q => (q.options || q.scale || scale)[0]) };
  }
  const items = buildItems(snapshot, config);
  assert.equal(items.length, Object.values(snapshot).reduce((sum, data) => sum + data.questions.length, 0));
  assert.ok(items.some(item => item.kind === 'mcq'));
  assert.ok(items.some(item => item.test === 'stress'));
});

test('model input excludes demographics and includes answer keys, reversal, dimension overrides', () => {
  const snapshot = {
    user_info: { name: 'Private Person', email: 'private@example.org', gender: 'Female' },
    iq: { questions: [{ question: '2 + 2?', options: ['3', '4'], answer: '4' }], responses: ['4'] },
    stress: { questions: [likert('Coping', true)], responses: ['Agree'] }
  };
  const [iq, stress] = buildItems(snapshot, config);
  assert.equal(iq.kind, 'iq');
  assert.equal(iq.row.state, 'Keyed option: B. Selected option: B.');
  assert.match(stress.row.question, /not a clinical diagnosis/);
  assert.equal(stress.row.state, 'Recorded category: D.');
  assert.equal(stress.row.options[0], 'Category E');
  assert.equal(stress.row.options[4], 'Category A');
  assert.doesNotMatch(JSON.stringify([iq.row, stress.row]), /Private Person|private@example|Female/);
  assert.equal(fillTemplate('{{ response }}', { response: '{{question}}' }), '{{question}}');
});

test('editing YAML prompts, rubric labels and model settings changes configuration without code edits', () => {
  const changed = copy();
  changed.model.id = 'example/compatible-model';
  changed.model.base_url = 'https://example.org/models/';
  changed.prompts.dimensions.eq = { state: 'Evidence {{response}}', instructions: 'Use revised rubric.' };
  delete changed.prompts.kinds;
  changed.rubrics.likert.options[0].text = 'A revised first point description';
  const item = buildItems({ eq: { questions: [likert()], responses: ['Agree'] } }, validateConfig(changed))[0];
  assert.equal(item.row.state, 'Evidence "Agree"');
  assert.match(item.row.question, /Use revised rubric/);
  assert.equal(item.row.options[0], 'A revised first point description');
});

test('missing responses are omitted; malformed and invented responses fail', () => {
  assert.equal(buildItems({ eq: { questions: [likert()], responses: [null] } }, config).length, 0);
  assert.throws(() => buildItems({ eq: { questions: [likert()], responses: ['invented'] } }, config));
  assert.throws(() => buildItems({ eq: { questions: [], responses: ['Agree'] } }, config));
  assert.throws(() => buildItems({ iq: { questions: [likert()], responses: ['Agree'] } }, config));
  assert.throws(() => buildItems({ eq: { questions: [{ question: 'Bad scale', scale: ['Agree'] }], responses: ['Agree'] } }, config));
});

test('raw logits produce stable, unrounded probabilities; invalid output never falls back to fixed rules', () => {
  const item = { values: [1, 2, 3, 4, 5], max: 5 };
  const result = decisionFromLogits(item, [1000, 1001, 1002, 1003, 1004]);
  assert.equal(result.score, 5);
  assert.ok(result.confidence > 0 && result.confidence < 1);
  assert.ok(Math.abs(result.probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  for (const logits of [[1], [1, 2, 3, 4, NaN], [Infinity, 2, 3, 4, 5]]) {
    assert.throws(() => decisionFromLogits(item, logits));
  }
});

test('aggregation uses model points, balances subscales, excludes stress from overall, preserves unanswered slots', () => {
  const snapshot = {
    iq: { questions: [{ question: 'Key?', options: ['A', 'B'], answer: 'A' }], responses: ['A'] },
    eq: { questions: [likert('A'), likert('A'), likert('B'), likert('B')], responses: ['Agree', 'Agree', 'Agree', null] },
    stress: { questions: [likert()], responses: ['Agree'] }
  };
  const items = buildItems(snapshot, config);
  const chosen = [0, 1, 1, 5, 5]; // Deliberately disagree with the response/key: there is no hidden rule scorer.
  const decisions = new Map(items.map((item, i) => [item, { score: chosen[i], max: item.max }]));
  const result = aggregate(snapshot, items, decisions);
  assert.equal(result.scores.IQ, 0);
  assert.equal(result.scores.EQ, 60); // mean(20%,100%), not an item-weighted mean.
  assert.equal(result.scores.STRESS, 100);
  assert.equal(result.fiveQSPlus, 12);
  assert.equal(result.meta.eq.attempted, 3);
  assert.equal(result.composites.eq.B.totalItems, 2);
  assert.equal(result.itemScores.eq[3], null);
});

test('ONNX feeds match Julia tensor types, attention/padding and marker positions', () => {
  class Tensor {
    constructor(type, data, dims) { Object.assign(this, { type, data, dims }); }
  }
  const feeds = makeFeeds({ Tensor }, { ids: [1, 2, 3], markers: [1, 2], qtype: 1 });
  assert.deepEqual(feeds.input_ids.dims, [1, 8]);
  assert.deepEqual([...feeds.attention_mask.data], [1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n]);
  assert.equal(feeds.marker_mask.type, 'bool');
  assert.deepEqual([...feeds.marker_pos.data], [1n, 2n]);
  assert.deepEqual([...feeds.qtype.data], [1n]);
});

test('WebGPU initialization failure retries the same graph on CPU', async () => {
  const opened = [], statuses = [];
  const session = new LocalSession(async device => {
    opened.push(device);
    if (device === 'webgpu') throw new Error('No GPU memory');
    return { release() {} };
  }, async () => [0, 1], { cpu_fallback: true }, status => statuses.push(status));
  await session.initialize('webgpu');
  assert.deepEqual(opened, ['webgpu', 'wasm']);
  assert.equal(session.device, 'wasm');
  assert.ok(statuses.some(status => status.stage === 'fallback'));
});

test('GPU device loss during inference releases the session and retries once on CPU', async () => {
  let released = 0;
  const opened = [];
  const session = new LocalSession(async device => {
    opened.push(device); return { device, release() { released++; } };
  }, async (active, row) => {
    if (row && active.device === 'webgpu') throw new Error('Device lost');
    return [1, 2];
  }, { cpu_fallback: true }, () => {});
  await session.initialize('webgpu');
  assert.deepEqual(await session.logits({ state: 'test' }), [1, 2]);
  assert.equal(released, 1);
  assert.deepEqual(opened, ['webgpu', 'wasm']);
});

test('CPU failure and disabled fallback surface errors instead of inventing scores', async () => {
  const session = new LocalSession(async () => { throw new Error('OOM'); }, () => {}, { cpu_fallback: false }, () => {});
  await assert.rejects(session.initialize('webgpu'), /OOM/);
  session.device = 'wasm';
  session.run = () => { throw new Error('CPU failed'); };
  await assert.rejects(session.logits({}), /CPU failed/);
});

test('asset download checks HTTP status and reports actual streamed bytes', async () => {
  const original = globalThis.fetch;
  const statuses = [];
  try {
    globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Length': '3' } });
    const bytes = await downloadAsset('https://example.org/weights', { cache_downloads: false, download_timeout_ms: 1000 }, s => statuses.push(s));
    assert.deepEqual([...bytes], [1, 2, 3]);
    assert.equal(statuses.at(-1).loaded, 3);
    globalThis.fetch = async () => new Response('', { status: 404 });
    await assert.rejects(downloadAsset('https://example.org/weights', { cache_downloads: false, download_timeout_ms: 1000 }), /404/);
  } finally { globalThis.fetch = original; }
});

test('Apps Script migrates legacy headers and appends model provenance without losing existing rows', async () => {
  const code = await readFile(new URL('../google-apps-script.js', import.meta.url), 'utf8');
  let headers, row;
  const sheet = {
    getLastColumn() { return headers.length; },
    getLastRow() { return 2; },
    getRange(r, col, rows, count) {
      return {
        getValues() { return [headers.slice(col - 1, col - 1 + count)]; },
        setValues(values) { headers.splice(col - 1, count, ...values[0]); return this; },
        setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; }
      };
    },
    appendRow(value) { row = value; }
  };
  const context = vm.createContext({ SpreadsheetApp: { getActiveSpreadsheet() { return { getSheetByName() { return sheet; } }; } } });
  vm.runInContext(code + '\nthis.headers = FIVEQS_HEADERS; this.createResponse = x => x;', context);
  headers = Array.from(context.headers.slice(0, 28));
  context.handle5QSPlus({ sheetName: '5QS+_Responses', scoring_model: 'Julia', scoring_config_hash: 'abc' });
  assert.equal(headers.length, context.headers.length);
  assert.equal(row.length, headers.length);
  assert.equal(row[29], 'Julia');
  assert.equal(row[31], 'abc');
  headers[0] = 'User custom header';
  assert.throws(() => context.handle5QSPlus({ sheetName: '5QS+_Responses' }), /headers differ/);
});

test('HTML inline scripts and local modules have valid JavaScript syntax', async () => {
  for (const name of ['index', 'info', 'test', 'results', 'thank-you']) {
    const html = await readFile(new URL('../' + name + '.html', import.meta.url), 'utf8');
    for (const [, attributes, script] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (!attributes.includes('src=')) assert.doesNotThrow(() => new vm.Script(script), name);
    }
  }
});

test('page bridge isolates navigation request IDs and rejects messages from other origins/sources', async () => {
  const code = await readFile(new URL('../js/scoring-client.js', import.meta.url), 'utf8');
  function page() {
    const messages = [];
    let listener;
    const parent = { postMessage(message) { messages.push(message); } };
    const window = { parent, addEventListener(type, fn) { listener = fn; } };
    const context = vm.createContext({ window, document: {addEventListener() {}}, location: { origin: 'https://example.org' }, crypto });
    vm.runInContext(code, context);
    return { window, messages, parent, deliver: event => listener(event) };
  }
  const previous = page(), current = page();
  let settled = false;
  const first = previous.window.LocalScoring.background();
  const second = current.window.LocalScoring.score().then(result => { settled = true; return result; });
  const oldID = previous.messages.at(-1).id;
  const id = current.messages.at(-1).id;
  assert.notEqual(id, oldID);
  const data = { channel: '5qs-local', type: 'result', id, result: 'valid result' };
  current.deliver({ origin: 'https://evil.example', source: current.parent, data });
  current.deliver({ origin: 'https://example.org', source: {}, data });
  current.deliver({ origin: 'https://example.org', source: current.parent, data: { ...data, id: oldID } });
  await Promise.resolve();
  assert.equal(settled, false);
  current.deliver({ origin: 'https://example.org', source: current.parent, data });
  previous.deliver({ origin: 'https://example.org', source: previous.parent, data: { ...data, id: oldID } });
  assert.equal(await second, 'valid result');
  await first;
});

test('results render model points but never submit when YAML submission is disabled', async () => {
  const { renderScores } = await import('../js/results-view.js');
  const { submitResults } = await import('../js/sheets-client.js');
  const { readSnapshot } = await import('../js/session-store.js');
  const elements = new Map();
  function element() {
    return { style: {}, innerHTML: '', textContent: '' };
  }
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    }
  };
  const storage = new Map([
    ['iq_questions_shown', JSON.stringify([{ question: '2+2?', options: ['3', '4'], answer: '4' }])],
    ['iq_responses', '["4"]']
  ]);
  const result = {
    scores: { IQ: 100, EQ: 0, AQ: 0, SQ: 0, DQ: 0, STRESS: 0 },
    meta: { iq: { correct: 1, attempted: 1, total: 1 } }, composites: {},
    itemScores: { iq: [{ score: 1, max: 1, confidence: 0.9 }] }, fiveQSPlus: 20,
    scoring: { model: 'test/model', backend: 'wasm', config_hash: 'abc', input_hash: 'def',
      rubric_version: 'test', submission_enabled: false }
  };
  let requests = 0;
  const store = {getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, value); }};
  const previousDocument = globalThis.document;
  globalThis.document = document;
  let outcome;
  try {
    renderScores(result, readSnapshot(store));
    outcome = await submitResults(result, {}, 0, store, () => { requests++; });
  } finally { globalThis.document = previousDocument; }
  assert.equal(requests, 0);
  assert.equal(outcome.state, 'local');
  assert.match(outcome.message, /submission is currently disabled/);
  assert.equal(storage.get('iq_responses'), '["4"]');
  assert.equal(elements.get('finalScoreValue').textContent, 20);
});

test('enabled submission uses the current fingerprint without writing the obsolete submitted flag', async () => {
  const {submitResults} = await import('../js/sheets-client.js');
  const values = new Map(), requests = [];
  const storage = {getItem: key => values.get(key), setItem: (key, value) => values.set(key, value)};
  const send = async (...args) => { requests.push(args); return {type: 'opaque'}; };
  const result = {scores: {IQ: 100}, meta: {iq: {attempted: 1, correct: 1, total: 1}},
    composites: {}, fiveQSPlus: 20, scoring: {submission_enabled: true, config_hash: 'config', input_hash: 'input'}};
  assert.equal((await submitResults(result, {name: 'Synthetic test'}, 12, storage, send)).state, 'sent');
  assert.equal(values.get('submission_fingerprint'), 'config:input');
  assert.equal(values.has('submitted'), false);
  const payload = JSON.parse(requests[0][1].body);
  assert.equal(payload.iq, 100);
  assert.equal(payload.total_duration_sec, 12);
  assert.equal(requests[0][1].mode, 'no-cors');
  await submitResults(result, {}, 12, storage, send);
  assert.equal(requests.length, 1);
});
