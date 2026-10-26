// Official Julia WASM encoder with a resident ONNX session (Apache-2.0 model).
import { downloadAsset, makeFeeds, LocalSession } from './onnx-runtime.js';
const ORT_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';

export async function createEngine(model, runtime, report) {
  let device = runtime.preferred_device;
  if (device === 'webgpu') {
    let adapter;
    try { adapter = await globalThis.navigator?.gpu?.requestAdapter(); } catch { /* CPU below. */ }
    if (!adapter) {
      if (!runtime.cpu_fallback) throw new Error('WebGPU is unavailable and CPU fallback is disabled.');
      device = 'wasm';
      report({ stage: 'fallback', device, message: 'WebGPU unavailable; using private CPU inference.' });
    }
  }
  const ort = await import(ORT_BASE + 'ort.webgpu.bundle.min.mjs');
  ort.env.wasm.wasmPaths = ORT_BASE;
  ort.env.wasm.numThreads = runtime.cpu_threads;
  ort.env.wasm.proxy = false;
  const base = model.base_url || 'https://huggingface.co/' + model.id + '/resolve/' + model.revision + '/';
  const asset = name => downloadAsset(new URL(model.files[name], base).href, runtime, report);
  const [js, wasm, tokenizer] = await Promise.all([asset('encoder_js'), asset('encoder_wasm'), asset('tokenizer')]);
  // HF serves the revision-pinned encoder glue as text/plain, not executable JS.
  const moduleURL = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
  let encoder;
  try {
    const module = await import(moduleURL);
    await module.default({ module_or_path: wasm });
    encoder = new module.WasmEncoder(new TextDecoder().decode(tokenizer));
  } finally { URL.revokeObjectURL(moduleURL); }
  const open = async backend => {
    const [graph, weights] = await Promise.all([asset('graph'), asset('weights')]);
    report({ stage: 'initializing', device: backend });
    return ort.InferenceSession.create(graph, { executionProviders: [backend], graphOptimizationLevel: 'all',
      externalData: [{ path: model.external_data_path, data: weights }] });
  };
  const encode = row => JSON.parse(encoder.encode(JSON.stringify(row || {
    state: '', question: 'Ready?', options: ['Yes', 'No'], type: 'choice'
  }), runtime.max_length, runtime.head_length, true));
  const run = async (session, encoded) => {
    encoded ||= encode(null);
    const feeds = makeFeeds(ort, encoded);
    let output;
    try {
      output = await session.run(feeds);
      if (!output.logits || output.logits.dims.length !== 2 || output.logits.dims[0] !== 1 || output.logits.dims[1] !== encoded.markers.length) {
        throw new Error('Expected one decision logit per candidate, not vocabulary logits.');
      }
      return Array.from((await output.logits.getData()).slice(0, encoded.markers.length));
    } finally {
      Object.values(feeds).forEach(tensor => tensor.dispose());
      Object.values(output || {}).forEach(tensor => tensor.dispose());
    }
  };
  const engine = new LocalSession(open, run, runtime, report);
  try { await engine.initialize(device); }
  catch (error) {
    try { await engine.session?.release(); } catch { /* Failed session. */ }
    encoder.free();
    throw error;
  }
  const infer = engine.logits.bind(engine);
  engine.logits = row => infer(encode(row));
  return engine;
}
