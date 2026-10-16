// Shared by the application and benchmark worker; paths resolve beside the YAML.
import { validateConfig } from './scoring-core.js';

export async function fingerprint(text) {
  if (!globalThis.crypto?.subtle) throw new Error('Local scoring requires HTTPS or localhost.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function loadYaml(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load configuration: HTTP ' + response.status);
  const text = await response.text();
  const { load, JSON_SCHEMA } = await import('https://cdn.jsdelivr.net/npm/js-yaml@4.3.2/dist/js-yaml.mjs');
  return { parsed: load(text, { schema: JSON_SCHEMA }), text };
}

export async function loadScoringConfig(url) {
  const { parsed, text } = await loadYaml(url);
  return { config: validateConfig(parsed), hash: await fingerprint(text) };
}

export async function loadEngine(config, configURL, report) {
  const adapterURL = new URL(config.model.adapter, configURL);
  if (adapterURL.origin !== new URL(configURL).origin) throw new Error('Model adapters must be hosted with the application.');
  const adapter = await import(adapterURL.href);
  if (typeof adapter.createEngine !== 'function') throw new Error('The model adapter must export createEngine().');
  return adapter.createEngine(config.model, config.runtime, report);
}
