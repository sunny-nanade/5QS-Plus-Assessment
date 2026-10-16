import { validateConfig, buildItems } from '../js/scoring-core.js';
import { runDecision } from '../js/decision-runner.js';
import { smokeSnapshot, bankSnapshot, calibrationSnapshot, frozenProbeSnapshot, expectedPoints, summarize } from './scoring-fixtures.js';
import { applyProfile } from './prompt-experiments.js';
import { loadYaml, loadScoringConfig, loadEngine, fingerprint } from '../js/scoring-config.js';
import { literatureProbes } from './literature-fixtures.js';
import { combineSnapshots, categoryProbes } from './category-fixtures.js';

let config, configHash, engine, profiles, configurationURL;
let tuningProfiles;
let literatureProfiles;
let categoryProfiles;
let queue = Promise.resolve();
const status = message => self.postMessage({ status: message });
const SUITES = {
  smoke: 'synthetic-smoke',
  holdout: 'exposed-question-bank-regression',
  probes: 'exposed-probes-v2',
  'probes-v3': 'v3-probes-frozen-at-first-run',
  'probes-v4': 'frozen-probes-v4',
  tune: 'synthetic-development',
  calibrate: 'synthetic-calibration-v2-exposed',
  literature: 'v3-exposed-bank-development-sweep',
  categories: 'v4-exposed-bank-v2-v3-development-sweep'
};

function loadBank() {
  return bankSnapshot(async test => {
    const response = await fetch(new URL('../questions/' + test + '.json', import.meta.url));
    if (!response.ok) throw new Error('Question bank HTTP ' + response.status);
    return response.json();
  });
}

async function prepare(data) {
  if (engine) return;
  configurationURL = new URL(data.config_url || '../scoring.yaml', import.meta.url);
  const loaded = await loadScoringConfig(configurationURL);
  config = loaded.config;
  configHash = loaded.hash;
  config.runtime.preferred_device = data.device || 'webgpu';
  config.runtime.cpu_fallback = false;
  // Load the small experiment definitions before downloading a large model.
  const definitions = await Promise.all(['prompt-variants', 'laya-tuning', 'literature-prompts', 'category-prompts']
    .map(name => loadYaml(new URL('./' + name + '.yaml', import.meta.url))));
  [profiles, tuningProfiles, literatureProfiles, categoryProfiles] = definitions.map(value => value.parsed);
  engine = await loadEngine(config, configurationURL, value => {
    status(value.stage + ' ' + (value.file || value.device || '') + (value.cached ? ' (cached)' : ''));
  });
}
async function evaluate(snapshot, selected, name) {
  const items = buildItems(snapshot, validateConfig(selected));
  const cases = [];
  const cache = new Map();
  let inferenceCalls = 0;
  const started = performance.now();
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const key = JSON.stringify([item.row, item.values]);
    if (!cache.has(key)) {
      const decision = await runDecision(engine, item, selected.runtime);
      inferenceCalls += decision.inference_calls;
      cache.set(key, decision);
    }
    const decision = cache.get(key);
    const q = snapshot[item.test].questions[item.index];
    const response = snapshot[item.test].responses[item.index];
    const expected = expectedPoints(item.test, q, response);
    cases.push({ test: item.test, kind: item.kind, index: item.index, expected, actual: decision.score,
      match: decision.score === expected, confidence: decision.confidence });
    if (index % 10 === 0) status(name + ' ' + (index + 1) + '/' + items.length);
  }
  return { profile: name, ...summarize(cases), unique_requests: cache.size,
    distinct_model_inputs: new Set(items.map(item => JSON.stringify(item.row))).size, inference_calls: inferenceCalls,
    inference_ms: Math.round(performance.now() - started), decision_ensemble: selected.runtime.decision_ensemble || 'none',
    input_hash: await fingerprint(JSON.stringify(snapshot)),
    failures: cases.filter(item => !item.match).map(item => ({ ...item,
      question: snapshot[item.test].questions[item.index].question,
      response: snapshot[item.test].responses[item.index] })),
    prompt_hash: await fingerprint(JSON.stringify({ prompts: selected.prompts, rubrics: selected.rubrics })),
    recipe: {prompts: selected.prompts, rubrics: selected.rubrics, runtime: selected.runtime}, cases };
}
async function sweep(snapshot, variants, base, metadata, suite) {
  const results = [];
  for (const [name, override] of Object.entries(variants)) {
    const result = await evaluate(snapshot, applyProfile(base, override), name);
    results.push(result);
    self.postMessage({intermediate: {...metadata, ...result, cases: undefined}});
  }
  return {...metadata, suite, results};
}

self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      const command = data.command || 'smoke';
      if (!Object.hasOwn(SUITES, command)) throw new Error('Unknown benchmark command');
      await prepare(data);
      const metadata = { backend: engine.device, model: config.model.id, revision: config.model.revision,
        rubric_version: config.rubric_version, config_url: configurationURL.href, config_hash: configHash };
      const suite = SUITES[command];
      let result;
      if (command === 'categories') {
        const snapshot = combineSnapshots(await loadBank(), frozenProbeSnapshot(), literatureProbes());
        result = await sweep(snapshot, categoryProfiles, applyProfile(config, literatureProfiles['nominal-letters']), metadata, suite);
      } else if (command === 'literature') {
        result = await sweep(await loadBank(), literatureProfiles, config, metadata, suite);
      } else if (command === 'calibrate') {
        result = await sweep(calibrationSnapshot(), tuningProfiles, config, metadata, suite);
      } else if (command === 'tune') {
        result = await sweep(smokeSnapshot(), profiles, config, metadata, suite);
      } else {
        const profile = data.profile || 'baseline';
        const overrides = data.categories ? categoryProfiles : data.literature ? literatureProfiles : data.tuning ? tuningProfiles : profiles;
        if (!Object.hasOwn(overrides, profile)) throw new Error('Unknown prompt profile');
        const snapshot = command === 'holdout' ? await loadBank()
          : command === 'probes-v4' ? categoryProbes() : command === 'probes-v3' ? literatureProbes()
          : command === 'probes' ? frozenProbeSnapshot() : smokeSnapshot();
        const base = data.categories ? applyProfile(config, literatureProfiles['nominal-letters']) : config;
        result = {...metadata, suite, ...await evaluate(snapshot, applyProfile(base, overrides[profile]), profile)};
      }
      self.postMessage({result});
    } catch (error) { self.postMessage({ error: error.message }); }
  });
};
