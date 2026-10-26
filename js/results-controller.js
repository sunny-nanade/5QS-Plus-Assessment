import { readSnapshot, readParticipant, totalDuration } from './session-store.js';
import { renderParticipant, renderScores, escapeHtml } from './results-view.js';
import { submitResults } from './sheets-client.js';
import { fingerprint } from './scoring-config.js';

let result, running = false, restartPending = false;
let snapshot, participant, duration;
const sync = document.getElementById('sync-status');
const actions = document.querySelector('.btn-group');
const retry = document.createElement('button');
retry.type = 'button'; retry.className = 'btn btn-outline'; retry.textContent = 'Retry scoring'; retry.hidden = true;
const exportButton = document.createElement('button');
exportButton.type = 'button'; exportButton.className = 'btn btn-outline'; exportButton.textContent = 'Download local record'; exportButton.hidden = true;
actions.append(retry, exportButton);
const audit = document.createElement('details');
audit.className = 'local-audit';
audit.innerHTML = '<summary>Experimental on-device scoring</summary><p>Responses are scored on this device. Model scores are not yet validated for research use or clinical decisions. Unanswered items are excluded; skipped dimensions contribute zero to the overall average.</p><p><a href="model-licenses.html" target="_top">Model licences</a> · <a href="benchmarks.html" target="_top">Benchmark methods and results</a> · <a href="docs/PSYCHOLOGY_SCORING_REVIEW.md" target="_top">Psychology source review</a></p>';
sync.before(audit);
const provenance = document.createElement('p'); audit.append(provenance);

function finish() {
  if (document.getElementById('finish-assessment')) return;
  const link = document.createElement('a'); link.id = 'finish-assessment';
  link.href = 'thank-you.html'; link.className = 'btn btn-primary'; link.textContent = 'Finish Assessment'; actions.prepend(link);
}

async function calculate() {
  if (running) return;
  restartPending = false;
  running = true; retry.hidden = true;
  try {
    if (!result) {
      sync.textContent = 'Preparing your results privately. You can stay on this page while scoring finishes.';
      const candidate = await window.LocalScoring.score();
      const expected = await fingerprint(JSON.stringify(snapshot));
      if (candidate.scoring.input_hash !== expected || await fingerprint(JSON.stringify(readSnapshot())) !== expected) {
        throw new Error('The assessment changed in another tab. Refresh this page before reviewing or submitting results.');
      }
      result = candidate;
      renderScores(result, snapshot);
      try { localStorage.setItem('results_backup', JSON.stringify(result)); }
      catch { /* Results can still be viewed and downloaded if browser storage is full. */ }
      const {scoring} = result;
      provenance.innerHTML = (scoring.cache_hit ? 'Restored from the matching local model record.<br>' : '') + 'Model: <code>' + escapeHtml(scoring.model) + '</code><br>Rubric: ' + escapeHtml(scoring.rubric_version) +
        ' · ' + (scoring.backend === 'webgpu' ? 'WebGPU' : 'CPU / WebAssembly') + '<br>Configuration: <code>' + escapeHtml(scoring.config_hash) + '</code><br>Item probabilities in the local record are uncalibrated.';
      exportButton.hidden = false;
    }
    const outcome = await submitResults(result, participant, duration);
    sync.className = outcome.state === 'sent' ? 'success' : '';
    sync.textContent = outcome.message;
    finish();
  } catch (error) {
    sync.className = 'error';
    sync.textContent = (result ? 'Could not send the results. ' : 'Scoring is unavailable. ') + error.message + ' Your responses remain saved on this device.';
    retry.textContent = result ? 'Retry submission' : 'Retry scoring';
    retry.hidden = false;
  } finally { running = false; }
}
retry.onclick = () => {
  if (!result && window.LocalScoring.getStatus().stage === 'error') window.LocalScoring.restart();
  calculate();
};
window.addEventListener('local-scoring-restarting', () => { if (!result) restartPending = true; });
window.addEventListener('local-scoring-status', event => {
  if (restartPending && event.detail.stage === 'ready' && !running) calculate();
});
exportButton.onclick = () => {
  const record = { participant, assessment: snapshot, result };
  const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = '5qs-local-assessment.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
try {
  participant = readParticipant(); snapshot = readSnapshot(); duration = totalDuration();
  renderParticipant(participant);
  renderScores(null);
  if (Object.values(snapshot).some(test => test.responses.some(Boolean))) calculate();
  else {
    window.LocalScoring.idle();
    sync.textContent = 'No assessment responses were found on this device. Select “Take Again” to begin from the overview.';
  }
} catch (error) {
  sync.className = 'error'; sync.textContent = 'Could not read the saved assessment: ' + error.message;
}
