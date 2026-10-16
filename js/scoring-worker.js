import { buildItems, aggregate } from './scoring-core.js';
import { runDecision } from './decision-runner.js';
import { loadScoringConfig, loadEngine, fingerprint } from './scoring-config.js';
import { restoreResult } from './result-cache.js';

let config, configHash, engine, preparingConfig, preparing;
let queue = Promise.resolve();
const decisions = new Map();
const report = status => self.postMessage({ type: 'status', status });

async function prepareConfig() {
  if (preparingConfig) return preparingConfig;
  preparingConfig = (async () => {
    report({ stage: 'config', message: 'Reading local scoring configuration…' });
    const url = new URL('../scoring.yaml', import.meta.url);
    const loaded = await loadScoringConfig(url);
    config = loaded.config;
    configHash = loaded.hash;
  })();
  return preparingConfig;
}
async function prepare() {
  if (preparing) return preparing;
  preparing = (async () => {
    await prepareConfig();
    engine = await loadEngine(config, new URL('../scoring.yaml', import.meta.url), report);
    report({ stage: 'ready', device: engine.device, model: config.model.id });
  })();
  return preparing;
}

async function score(snapshot, saved) {
  await prepareConfig();
  const items = buildItems(snapshot, config);
  if (!items.length) throw new Error('No assessment responses found. Please answer at least one question.');
  const inputHash = await fingerprint(JSON.stringify(snapshot));
  const restored = restoreResult(saved, snapshot, items, configHash, inputHash);
  if (restored) {
    report({stage: 'ready', device: restored.scoring.backend, model: config.model.id});
    return restored;
  }
  await prepare();
  const results = new Map();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = JSON.stringify([configHash, item.row, item.values]);
    if (!decisions.has(key)) decisions.set(key, await runDecision(engine, item, config.runtime));
    results.set(item, decisions.get(key));
    report({ stage: 'scoring', completed: i + 1, total: items.length, device: engine.device });
  }
  const result = aggregate(snapshot, items, results);
  result.scoring = {
    method: 'local-model-experimental', model: config.model.id, revision: config.model.revision,
    config_hash: configHash, rubric_version: config.rubric_version, backend: engine.device,
    input_hash: inputHash,
    submission_enabled: config.submission.enabled,
    decision_ensemble: config.runtime.decision_ensemble || 'none',
    scored_at: new Date().toISOString()
  };
  report({ stage: 'ready', device: engine.device, model: config.model.id });
  return result;
}

self.onmessage = ({ data }) => {
  const { id, command, snapshot, saved } = data;
  if (!['preload', 'score', 'background'].includes(command)) return;
  // Serial execution avoids overlapping GPU/WASM runs and duplicate model loads.
  queue = queue.then(async () => {
    try {
      const result = command === 'preload' ? await prepare() : await score(snapshot, saved);
      self.postMessage({ type: 'result', id, result });
    } catch (error) {
      report({ stage: 'error', message: error.message });
      self.postMessage({ type: 'result', id, error: error.message });
    }
  });
};
