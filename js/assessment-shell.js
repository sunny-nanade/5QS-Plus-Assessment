import { readSnapshot } from './session-store.js';

const frame = document.getElementById('assessment-frame');
const pending = new Map();
let worker, nextID = 0, status = { stage: 'config', message: 'Preparing local scoring…' };

function publish(value) {
  status = value;
  frame.contentWindow?.postMessage({ channel: '5qs-local', type: 'status', status: value }, location.origin);
}

function startWorker() {
  worker = new Worker(new URL('./scoring-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'status') { publish(data.status); return; }
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    data.error ? request.reject(new Error(data.error)) : request.resolve(data.result);
  };
  worker.onerror = event => {
    const message = event.message || 'The local model worker stopped. Retry to reload it.';
    publish({ stage: 'error', message });
    for (const request of pending.values()) request.reject(new Error(message));
    pending.clear();
  };
}

function request(command, snapshot, saved) {
  return new Promise((resolve, reject) => {
    const id = ++nextID;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, command, snapshot, saved });
  });
}

function route() {
  let target;
  try { target = decodeURIComponent(location.hash.slice(1)) || 'info.html'; }
  catch { target = 'info.html'; }
  // Only known local assessment pages can be placed inside the persistent shell.
  if (!/^(info|results|thank-you)\.html$|^test\.html\?test=(iq|eq|aq|sq|dq|stress)$/.test(target)) target = 'info.html';
  frame.src = target;
}

window.addEventListener('message', async ({ origin, source, data }) => {
  if (origin !== location.origin || source !== frame.contentWindow || data?.channel !== '5qs-local') return;
  if (data.type === 'hello') {
    publish(status);
    try {
      const page = new URL(frame.contentWindow.location.href);
      document.title = frame.contentDocument.title || '5QS+ Assessment Platform';
      history.replaceState(null, '', '#' + encodeURIComponent(page.pathname.split('/').pop() + page.search));
    } catch { /* Frame may be navigating. */ }
    return;
  }
  if (data.type === 'restart') { restart(); return; }
  if (!['score', 'background'].includes(data.type)) return;
  const destination = source;
  try {
    let saved;
    try { saved = JSON.parse(localStorage.getItem('results_backup') || 'null'); } catch { /* Ignore a corrupt local backup. */ }
    const result = await request(data.type, readSnapshot(), saved);
    destination.postMessage({ channel: '5qs-local', type: 'result', id: data.id, result }, origin);
  } catch (error) {
    destination.postMessage({ channel: '5qs-local', type: 'result', id: data.id, error: error.message }, origin);
  }
});

function restart() {
  worker.terminate();
  for (const request of pending.values()) request.reject(new Error('Model loading restarted. Retry scoring when ready.'));
  pending.clear();
  publish({stage: 'config', message: 'Preparing private scoring…'});
  startWorker();
  request('preload').catch(() => {}); // Error is visible in the status bar; questionnaire remains usable.
}
window.addEventListener('hashchange', route);
startWorker();
route();
// Direct result reviews may use a matching local model record without loading
// the large model again. Other assessment pages start background loading now.
if (!frame.getAttribute('src').startsWith('results.html')) request('preload').catch(() => {});
