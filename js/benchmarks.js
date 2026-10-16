const get = id => document.getElementById(id);
const controls = ['benchmark-model', 'benchmark-device', 'benchmark-suite'];
let worker, workerKey, report, started, timer, busy = false;
window.promptProgress = [];

function row(body, values) {
  const tr = document.createElement('tr');
  values.forEach(value => { const td = document.createElement('td'); td.textContent = String(value); tr.append(td); });
  body.append(tr);
}
function showResult(value) {
  row(get('live-results'), [value.profile, value.matched + '/' + value.total,
    (value.distinct_model_inputs ?? '—') + ' / ' + (value.unique_requests ?? '—'), value.inference_calls ?? '—']);
}
function setBusy(value) {
  busy = value;
  controls.forEach(id => { get(id).disabled = value; });
  get('benchmark-run').disabled = value || !get('benchmark-consent').checked;
  get('benchmark-stop').disabled = !worker;
  get('benchmark-download').disabled = value || !report;
  get('benchmark-progress').hidden = !value;
  if (!value) { clearInterval(timer); timer = null; }
}
function begin() {
  report = null; window.smokeResult = null; window.promptProgress = [];
  get('live-results').replaceChildren();
  get('benchmark-output').textContent = 'Running…';
  get('benchmark-status').textContent = 'Preparing local benchmark…';
  get('benchmark-status').className = 'mt-2';
  get('benchmark-progress').removeAttribute('value');
  started = performance.now();
  clearInterval(timer);
  timer = setInterval(() => { get('benchmark-time').textContent = 'Elapsed: ' + Math.round((performance.now() - started) / 1000) + ' s'; }, 1000);
  setBusy(true);
}
function receive({data}) {
  if (data.status) {
    get('benchmark-status').textContent = data.status;
    const match = data.status.match(/(\d+)\/(\d+)$/);
    if (match) { get('benchmark-progress').max = Number(match[2]); get('benchmark-progress').value = Number(match[1]); }
  }
  if (data.intermediate) { window.promptProgress.push(data.intermediate); showResult(data.intermediate); }
  if (data.result || data.error) {
    window.smokeResult = data;
    report = data;
    get('benchmark-output').textContent = JSON.stringify(data, null, 2);
    if (data.result) {
      if (!data.result.results) showResult(data.result);
      get('benchmark-backend').textContent = 'Backend: ' + data.result.backend + ' · Config: ' + data.result.config_hash.slice(0, 12);
      get('benchmark-status').textContent = 'Complete. Results are local and have not been submitted.';
    } else { get('benchmark-status').textContent = 'Benchmark failed: ' + data.error; get('benchmark-status').className = 'mt-2 local-error'; }
    get('benchmark-time').textContent = 'Elapsed: ' + Math.round((performance.now() - started) / 1000) + ' s';
    setBusy(false);
  }
}
function stop() {
  worker?.terminate(); worker = null; workerKey = null;
  setBusy(false); get('benchmark-status').textContent = 'Stopped. The model worker has been released.';
}
function start(device, command = 'smoke', config_url = '../scoring.yaml') {
  if (busy) return;
  if (command === 'calibrate' && config_url !== './laya-tuning-baseline.yaml') {
    get('benchmark-status').textContent = 'Choose “Laya · frozen tuning baseline” for the reproducible Laya property sweep.';
    return;
  }
  if (['literature', 'categories'].includes(command) && config_url !== './laya-v2-scoring.yaml') {
    get('benchmark-status').textContent = 'Choose “Laya · frozen V2 recipe” for the reproducible development comparison.';
    return;
  }
  const key = device + ':' + config_url;
  if (workerKey !== key) {
    worker?.terminate();
    worker = new Worker(new URL('../tests/model-smoke-worker.js', import.meta.url), {type: 'module'});
    workerKey = key;
    worker.onmessage = receive;
    worker.onerror = event => receive({data: {error: event.message || 'Worker stopped'}});
  }
  begin();
  worker.postMessage({device, command, config_url});
}
window.startModelTest = start;
window.followupModelTest = data => { if (!worker || busy) return; begin(); worker.postMessage(data); };
get('benchmark-consent').onchange = () => setBusy(busy);
get('benchmark-suite').onchange = () => {
  if (get('benchmark-suite').value === 'calibrate') get('benchmark-model').value = './laya-tuning-baseline.yaml';
  if (get('benchmark-suite').value === 'literature') get('benchmark-model').value = './laya-v2-scoring.yaml';
  if (get('benchmark-suite').value === 'categories') get('benchmark-model').value = './laya-v2-scoring.yaml';
};
get('benchmark-run').onclick = () => start(get('benchmark-device').value, get('benchmark-suite').value, get('benchmark-model').value);
get('benchmark-stop').onclick = stop;
get('benchmark-download').onclick = () => {
  if (!report) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = '5qs-model-benchmark.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

async function recorded() {
  const body = get('recorded-results'); body.replaceChildren();
  try {
    const response = await fetch(new URL('../tests/model-evaluation-2026-10-15.json', import.meta.url));
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const old = await response.json();
    row(body, ['Julia · literal-json', 'Exposed bank v1', old.julia.webgpu.matched + '/' + old.julia.webgpu.total, 'WebGPU']);
    row(body, ['Laya · report-phrase v1', 'Exposed bank v1', old.laya.webgpu.matched + '/' + old.laya.webgpu.total, 'WebGPU / CPU']);
    const reports = await Promise.all([2, 3, 4].map(async version => {
      const response = await fetch(new URL('../tests/model-evaluation-v' + version + '.json', import.meta.url));
      if (!response.ok) throw new Error('V' + version + ' report: HTTP ' + response.status);
      return response.json();
    }));
    for (const data of reports) {
      for (const item of data.evaluations) row(body, [item.profile, item.suite, item.matched + '/' + item.total, item.backend]);
    }
  } catch (error) { row(body, ['Recorded results unavailable: ' + error.message, '', '', '']); }
}
recorded();
