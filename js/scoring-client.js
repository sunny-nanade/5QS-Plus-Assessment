// The only hook needed by the original info/test/results pages.
// The parent shell owns the model; this small bridge owns the inline status UI.
(function() {
  'use strict';
  var pending = new Map();
  var framed = window.parent !== window;
  var status = { stage: 'config' }, idle = false;
  var panel, text, progress, retry;
  var announcedAt = 0, announcedStage;
  if (!framed) window.location.replace('assessment.html#' + encodeURIComponent(location.pathname.split('/').pop() + location.search));

  window.LocalScoring = {
    score: function() { return request('score'); },
    background: function() { return request('background'); },
    restart: function() {
      window.dispatchEvent(new Event('local-scoring-restarting'));
      window.parent.postMessage({channel: '5qs-local', type: 'restart'}, location.origin);
    },
    getStatus: function() { return status; },
    idle: function() { idle = true; render(); }
  };
  function request(type) {
    if (!framed) return Promise.reject(new Error('Opening the private scoring runtime…'));
    return new Promise(function(resolve, reject) {
      var id = crypto.randomUUID();
      pending.set(id, { resolve: resolve, reject: reject });
      window.parent.postMessage({ channel: '5qs-local', type: type, id: id }, location.origin);
    });
  }
  function render() {
    if (!panel) return;
    panel.dataset.stage = status.stage;
    var isResults = !!document.getElementById('scoreGrid');
    panel.hidden = idle || (status.stage === 'ready' && !isResults);
    retry.hidden = status.stage !== 'error';
    progress.hidden = !['download', 'initializing', 'scoring', 'config'].includes(status.stage);
    progress.removeAttribute('value');
    var message = 'Preparing private scoring. You can continue answering.';
    if (status.stage === 'download') {
      message = status.cached ? 'Loading saved model files…' : 'Preparing private scoring · ' + Math.round((status.loaded || 0) / 1e6) + ' MB downloaded';
      if (status.total && !status.cached) { progress.max = status.total; progress.value = status.loaded || 0; }
    } else if (status.stage === 'ready') message = 'Private scoring · ' + (status.device === 'webgpu' ? 'WebGPU' : 'CPU / WebAssembly');
    else if (status.stage === 'scoring') {
      message = 'Scoring responses privately · ' + status.completed + ' of ' + status.total;
      progress.max = status.total; progress.value = status.completed;
    } else if (status.stage === 'initializing') message = 'Preparing the model on your device…';
    else if (status.stage === 'fallback') message = 'Using private CPU scoring. You can continue answering.';
    else if (status.stage === 'error') message = 'Scoring needs attention. Your saved responses are safe. ' + status.message;
    else if (status.stage === 'notice') message = status.message;
    if (status.stage !== announcedStage || Date.now() - announcedAt > 2000) {
      text.textContent = message; announcedAt = Date.now(); announcedStage = status.stage;
    }
  }
  window.addEventListener('message', function(event) {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.channel !== '5qs-local') return;
    var data = event.data;
    if (data.type === 'status') {
      status = data.status;
      render();
      window.dispatchEvent(new CustomEvent('local-scoring-status', {detail: status}));
    } else if (data.type === 'result' && pending.has(data.id)) {
      var task = pending.get(data.id);
      pending.delete(data.id);
      data.error ? task.reject(new Error(data.error)) : task.resolve(data.result);
    }
  });
  document.addEventListener('DOMContentLoaded', function() {
    var link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'local-scoring.css'; document.head.appendChild(link);
    panel = document.createElement('section'); panel.className = 'local-status';
    panel.setAttribute('aria-label', 'Private scoring status');
    text = document.createElement('p'); text.setAttribute('role', 'status'); text.setAttribute('aria-live', 'polite');
    progress = document.createElement('progress'); progress.setAttribute('aria-label', 'Model preparation progress');
    retry = document.createElement('button'); retry.className = 'btn btn-outline local-small-button'; retry.type = 'button';
    retry.textContent = 'Retry model loading'; retry.onclick = window.LocalScoring.restart;
    panel.append(text, progress, retry);
    var heading = document.querySelector('.test-header, .app-header');
    if (heading) heading.insertAdjacentElement('afterend', panel);
    document.querySelectorAll('a[href="index.html"]').forEach(function(anchor) { anchor.target = '_top'; });
    render();
  });
  window.parent.postMessage({ channel: '5qs-local', type: 'hello' }, location.origin);
})();
