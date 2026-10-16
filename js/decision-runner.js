import { decisionFromLogits } from './scoring-core.js';

export function optionOrders(row, mode = 'none') {
  const identity = row.options.map((_, index) => index);
  // Ordinal and Boolean slots carry meaning; never permute those primitives.
  if (mode === 'none' || row.type !== 'choice') return [identity];
  if (mode === 'reverse') return [identity, [...identity].reverse()];
  if (mode !== 'cyclic') throw new Error('Unknown decision ensemble');
  return identity.map((_, offset) => identity.map(index => (index + offset) % identity.length));
}

export async function runDecision(engine, item, runtime = {}) {
  const mode = runtime.decision_ensemble || 'none';
  const orders = optionOrders(item.row, mode);
  if (orders.length === 1) return { ...decisionFromLogits(item, await engine.logits(item.row)),
    inference_calls: 1, ensemble: 'none', backend: engine.device };
  const probabilities = Array(item.values.length).fill(0);
  for (const order of orders) {
    const logits = await engine.logits({ ...item.row, options: order.map(index => item.row.options[index]) });
    const scaled = logits.map(value => value / (runtime.decision_temperature ?? 1));
    const decision = decisionFromLogits({ values: order, max: item.max }, scaled);
    order.forEach((original, slot) => { probabilities[original] += decision.probabilities[slot] / orders.length; });
  }
  const decision = decisionFromLogits(item, probabilities.map(value => Math.log(Math.max(value, Number.MIN_VALUE))));
  return { ...decision, inference_calls: orders.length, ensemble: mode, backend: engine.device };
}
