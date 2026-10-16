// Runtime-independent helpers shared by the Laya and Julia ONNX adapters.
const CACHE_NAME = '5qs-model-assets-v1';

export async function downloadAsset(url, runtime, report = () => {}) {
  let cache;
  if (runtime.cache_downloads && globalThis.caches) {
    try { cache = await caches.open(CACHE_NAME); } catch { /* Storage may be unavailable in private mode. */ }
  }
  const cached = cache && await cache.match(url).catch(() => null);
  if (cached) {
    report({ stage: 'download', file: new URL(url).pathname.split('/').pop(), cached: true });
    return new Uint8Array(await cached.arrayBuffer());
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), runtime.download_timeout_ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('Model download failed: HTTP ' + response.status);
    const total = Number(response.headers.get('Content-Length')) || 0;
    const file = new URL(url).pathname.split('/').pop();
    let loaded = 0, lastReport = 0;
    const reader = response.body?.getReader();
    const body = reader ? new ReadableStream({
      async pull(stream) {
        try {
          const { done, value } = await reader.read();
          if (done) { stream.close(); return; }
          loaded += value.byteLength;
          if (Date.now() - lastReport > 200) {
            lastReport = Date.now();
            report({ stage: 'download', file, loaded, total });
          }
          stream.enqueue(value);
        } catch (error) { stream.error(error); }
      },
      cancel(reason) { return reader.cancel(reason); }
    }) : null;
    const bytes = new Uint8Array(await (body ? new Response(body) : response).arrayBuffer());
    report({ stage: 'download', file, loaded: bytes.length, total: bytes.length });
    if (cache) {
      try { await cache.put(url, new Response(bytes)); }
      catch { report({ stage: 'notice', message: 'This file could not be cached; it may need to be downloaded again.' }); }
    }
    return bytes;
  } finally { clearTimeout(timeout); }
}

export function makeFeeds(ort, item, padID = 0) {
  const length = Math.ceil(item.ids.length / 8) * 8;
  const count = item.markers.length;
  const ids = new BigInt64Array(length).fill(BigInt(padID));
  const attention = new BigInt64Array(length);
  item.ids.forEach((id, index) => { ids[index] = BigInt(id); attention[index] = 1n; });
  return {
    input_ids: new ort.Tensor('int64', ids, [1, length]),
    attention_mask: new ort.Tensor('int64', attention, [1, length]),
    marker_pos: new ort.Tensor('int64', BigInt64Array.from(item.markers, BigInt), [1, count]),
    marker_mask: new ort.Tensor('bool', new Uint8Array(count).fill(1), [1, count]),
    qtype: new ort.Tensor('int64', BigInt64Array.of(BigInt(item.qtype)), [1])
  };
}

export class LocalSession {
  constructor(open, run, runtime, report) {
    Object.assign(this, { open, run, runtime, report, session: null, device: null });
  }
  async initialize(device) {
    this.device = device;
    this.report({ stage: 'initializing', device });
    try {
      this.session = await this.open(device);
      await this.run(this.session, null);
    } catch (error) {
      if (device !== 'webgpu' || !this.runtime.cpu_fallback) throw error;
      await this.fallback();
    }
    this.report({ stage: 'ready', device: this.device });
  }
  async fallback() {
    this.report({ stage: 'fallback', device: 'wasm', message: 'Switching to private CPU inference.' });
    if (this.session) {
      try { await this.session.release(); } catch { /* A lost GPU may already be released. */ }
    }
    this.session = null;
    this.device = 'wasm';
    this.session = await this.open('wasm');
    await this.run(this.session, null);
  }
  async logits(row) {
    try { return await this.run(this.session, row); }
    catch (error) {
      if (this.device !== 'webgpu' || !this.runtime.cpu_fallback) throw error;
      await this.fallback();
      this.report({ stage: 'ready', device: this.device });
      return this.run(this.session, row);
    }
  }
}
