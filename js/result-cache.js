// Rebuild summaries from previously model-assigned points, never from answer keys.
import { aggregate } from './scoring-core.js';

export function restoreResult(saved, snapshot, items, configHash, inputHash) {
  if (!saved || saved.scoring?.config_hash !== configHash || saved.scoring?.input_hash !== inputHash ||
      saved.scoring?.method !== 'local-model-experimental' || !['webgpu', 'wasm'].includes(saved.scoring?.backend)) return null;
  const decisions = new Map();
  for (const item of items) {
    const decision = saved.itemScores?.[item.test]?.[item.index];
    if (!decision || !Number.isInteger(decision.option) || decision.option < 0 || decision.option >= item.values.length || decision.max !== item.max ||
        decision.score !== item.values[decision.option] || !Number.isFinite(decision.confidence) ||
        decision.confidence < 0 || decision.confidence > 1 || !Array.isArray(decision.probabilities) ||
        decision.probabilities.length !== item.values.length ||
        decision.probabilities.some(value => !Number.isFinite(value) || value < 0 || value > 1) ||
        Math.abs(decision.probabilities.reduce((sum, value) => sum + value, 0) - 1) > 1e-6 ||
        Math.abs(decision.confidence - decision.probabilities[decision.option]) > 1e-6) return null;
    decisions.set(item, decision);
  }
  return {...aggregate(snapshot, items, decisions), scoring: {...saved.scoring, cache_hit: true}};
}
