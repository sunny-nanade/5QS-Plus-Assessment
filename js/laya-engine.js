// Finite-choice Laya ONNX adapter, not a language-generation pipeline.
// Layout reference: convaiinnovations/laya, laya/common.py (Apache-2.0).
import { downloadAsset, makeFeeds, LocalSession } from './onnx-runtime.js';
const ORT_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

export function encodeLaya(row, tokenizer, special, runtime) {
  const qtype = { choice: 0, score: 1, noul: 2 }[row.type];
  if (qtype === undefined || typeof row.state !== 'string' || typeof row.question !== 'string' ||
      !Array.isArray(row.options) || row.options.length < 2 || row.options.length > 20 ||
      row.options.some(text => typeof text !== 'string' || !text.trim()) ||
      (row.type === 'noul' && row.options.length !== 2)) throw new Error('Invalid Laya decision request');
  if ([row.state, row.question, ...row.options].some(text => text.includes('[MASK]'))) {
    throw new Error('Reserved model marker in request');
  }
  const encode = text => tokenizer.encode(text, { add_special_tokens: false });
  // row.options are already rendered candidate texts; preserve them verbatim.
  // This is equivalent to Laya's low-level build_sequence/render_options output.
  const head = encode(row.type + ' question: ' + row.question);
  const options = row.options.map(text => encode(' ' + text));
  if (options.some(ids => ids.length > 48)) throw new Error('Option exceeds 48-token model contract');
  const budget = runtime.head_length - options.reduce((sum, ids) => sum + ids.length + 1, 0);
  if (budget < 16 || head.length > budget) throw new Error('Question/options exceed lossless head budget');
  const ids = [special.cls, ...head, special.sep];
  const markers = [];
  for (const option of options) { markers.push(ids.length); ids.push(special.mask, ...option); }
  ids.push(special.sep);
  const state = encode(row.state);
  if (ids.length + state.length + 1 > runtime.max_length) throw new Error('State exceeds lossless context budget');
  ids.push(...state, special.sep);
  return { ids, markers, qtype };
}

export async function createEngine(model, runtime, report) {
  let device = runtime.preferred_device;
  if (device === 'webgpu') {
    let adapter;
    try { adapter = await globalThis.navigator?.gpu?.requestAdapter(); } catch { /* CPU below. */ }
    if (!adapter) {
      if (!runtime.cpu_fallback) throw new Error('WebGPU is unavailable and CPU fallback is disabled.');
      device = 'wasm';
      report({ stage: 'fallback', device, message: 'WebGPU unavailable; using local CPU inference.' });
    }
  }
  const ort = await import(ORT_BASE + 'ort.webgpu.bundle.min.mjs');
  ort.env.wasm.wasmPaths = ORT_BASE;
  ort.env.wasm.numThreads = runtime.cpu_threads;
  ort.env.wasm.proxy = false;
  const base = model.base_url || 'https://huggingface.co/' + model.id + '/resolve/' + model.revision + '/';
  const asset = name => downloadAsset(new URL(model.files[name], base).href, runtime, report);
  const [json, settings] = await Promise.all([asset('tokenizer'), asset('tokenizer_config')]);
  const { PreTrainedTokenizer } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
  const tokenizer = new PreTrainedTokenizer(JSON.parse(new TextDecoder().decode(json)), JSON.parse(new TextDecoder().decode(settings)));
  const special = {};
  for (const [name, token] of Object.entries({ cls: '[CLS]', sep: '[SEP]', mask: '[MASK]', pad: '[PAD]' })) {
    const ids = tokenizer.encode(token, { add_special_tokens: false });
    if (ids.length !== 1) throw new Error('Invalid Laya tokenizer special token: ' + token);
    special[name] = ids[0];
  }
  const open = async backend => {
    const graph = await asset('graph');
    const externalData = model.files.weights
      ? [{ path: model.external_data_path, data: await asset('weights') }] : [];
    report({ stage: 'initializing', device: backend });
    return ort.InferenceSession.create(graph, { executionProviders: [backend],
      graphOptimizationLevel: 'all', externalData });
  };
  const run = async (session, encoded) => {
    encoded ||= encodeLaya({ state: 'Ready', question: 'Is this ready?', type: 'choice', options: ['No', 'Yes'] }, tokenizer, special, runtime);
    const feeds = makeFeeds(ort, encoded, special.pad);
    let outputs;
    try {
      outputs = await session.run(feeds);
      if (!outputs.logits) throw new Error('Laya graph has no logits output');
      if (outputs.logits.dims.length !== 2 || outputs.logits.dims[0] !== 1 || outputs.logits.dims[1] !== encoded.markers.length) {
        throw new Error('Expected a Laya decision graph with one logit per candidate, not a masked-language model.');
      }
      return Array.from((await outputs.logits.getData()).slice(0, encoded.markers.length));
    } finally {
      Object.values(feeds).forEach(tensor => tensor.dispose());
      Object.values(outputs || {}).forEach(tensor => tensor.dispose());
    }
  };
  const engine = new LocalSession(open, run, runtime, report);
  try { await engine.initialize(device); }
  catch (error) {
    try { await engine.session?.release(); } catch { /* Failed session. */ }
    throw error;
  }
  const infer = engine.logits.bind(engine);
  engine.logits = row => infer(encodeLaya(row, tokenizer, special, runtime));
  return engine;
}
