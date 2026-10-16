// Rendering only. Retains the upstream cards, chart, bands and item-detail layout.
import { TESTS } from './scoring-core.js';
import { ANCHORS } from './item-anchors.js';
const LABELS = {iq: 'IQ', eq: 'EQ', aq: 'AQ', sq: 'SQ', dq: 'DQ', stress: 'Stress'};
const NAMES = {iq: 'Intelligence Quotient (IQ)', eq: 'Emotional Quotient (EQ)', aq: 'Adversity Quotient (AQ)', sq: 'Spiritual Quotient (SQ)', dq: 'Digital Quotient (DQ)', stress: 'Perceived Stress'};
let chart;
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
}
const get = id => document.getElementById(id);

export function renderParticipant(participant) {
  get('userDetails').innerHTML = ['name', 'email', 'age', 'gender', 'profession', 'institution', 'program']
    .filter(key => !['institution', 'program'].includes(key) || participant[key])
    .map(key => '<p><strong>' + key[0].toUpperCase() + key.slice(1) + ':</strong> ' + escapeHtml(participant[key] || 'N/A') + '</p>').join('');
}

export function renderScores(result, snapshot) {
  get('scoreGrid').innerHTML = TESTS.map(test => '<div class="score-item"><div class="label">' + LABELS[test] + '</div><div class="value">' +
    (result ? result.scores[test.toUpperCase()] : '—') + '</div><div class="max">/ 100</div></div>').join('');
  if (!result) return;
  get('finalScoreCard').style.display = 'block';
  get('finalScoreValue').textContent = result.fiveQSPlus;
  if (chart) chart.destroy();
  if (globalThis.Chart) chart = new Chart(get('radarChart'), {
    type: 'radar',
    data: { labels: Object.values(LABELS), datasets: [{ label: 'Your 5QS+ Profile',
      data: TESTS.map(test => result.scores[test.toUpperCase()] || 0), fill: true,
      borderColor: '#0F2B46', backgroundColor: 'rgba(15, 43, 70, 0.15)', pointBackgroundColor: '#0D7377',
      pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: true, scales: {r: {
      angleLines: {display: true, color: '#CBD5E0'}, grid: {color: '#CBD5E0'}, suggestedMin: 0, suggestedMax: 100,
      pointLabels: {font: {size: 13, weight: 'bold'}, color: '#0F2B46'}, ticks: {stepSize: 20, backdropColor: 'transparent'}
    }}, plugins: {legend: {display: false}} }
  });
  for (const test of TESTS.filter(test => test !== 'iq')) {
    const data = result.composites[test] || {};
    get(test + 'BreakdownCard').style.display = Object.keys(data).length ? 'block' : 'none';
    get(test + 'Composites').innerHTML = Object.entries(data).map(([name, comp]) =>
      '<div class="composite-bar"><div class="name">' + escapeHtml(name) + '</div><div class="bar-track"><div class="bar-fill" style="width:' +
      comp.percent + '%;"></div></div><div class="pct">' + comp.percent + '%</div></div>').join('');
  }
  renderQuestions(result, snapshot);
  renderBands(result);
}

function renderQuestions(result, snapshot) {
  let html = '';
  for (const test of TESTS) {
    const {questions, responses} = snapshot[test];
    if (!questions.length) continue;
    html += '<details class="test-detail-section"><summary>' + NAMES[test] + ' (' + responses.filter(Boolean).length + '/' + questions.length +
      ' answered)</summary><table class="question-table"><thead><tr><th>#</th><th>Question</th><th>Your Response</th><th>Score</th><th>Type</th></tr></thead><tbody>';
    questions.forEach((q, index) => {
      const decision = result.itemScores[test]?.[index];
      const response = responses[index];
      const anchor = (ANCHORS[test] || []).some(text => q.question.includes(text.slice(0, 40)));
      const dim = q.composite || q.subscale;
      let label = 'Unanswered', css = 'score-na';
      if (decision) {
        if (test === 'iq') { label = decision.score === 1 ? 'Correct' : 'Incorrect (' + escapeHtml(q.answer) + ')'; css = decision.score === 1 ? 'score-high' : 'score-low'; }
        else if (q.options && q.answer) { label = decision.score === 5 ? 'Best response' : 'Suboptimal'; css = decision.score === 5 ? 'score-high' : 'score-low'; }
        else {
          label = decision.score + '/' + decision.max;
          css = decision.score === 3 ? 'score-mid' : ((decision.score >= 4) !== (test === 'stress') ? 'score-high' : 'score-low');
        }
      }
      html += '<tr class="' + css + '"><td>' + (index + 1) + '</td><td>' + escapeHtml(q.question) +
        (dim ? ' <span class="dim-badge">' + escapeHtml(dim) + '</span>' : '') + '</td><td>' + escapeHtml(response || '--') +
        '</td><td><strong>' + label + '</strong></td><td><span class="importance-tag ' + (anchor ? 'anchor">Anchor' : 'supplementary">Supplementary') + '</span></td></tr>';
    });
    html += '</tbody></table></details>';
  }
  get('questionDetails').innerHTML = html;
  get('questionDetailCard').style.display = html ? 'block' : 'none';
}

function level(score, stress) {
  // Cohen's lab explicitly provides no PSS diagnostic cut-offs. This app also
  // uses adapted/sampled items, so even a standard PSS total is not implied.
  if (stress) return ['Unvalidated index', 'text-secondary'];
  return score >= 81 ? ['Excellent', 'success'] : score >= 61 ? ['Good', 'accent'] : score >= 41 ? ['Moderate', 'warning'] : ['Developing', 'danger'];
}
function renderBands(result) {
  let html = '';
  for (const test of TESTS) {
    if (!result.meta[test]?.attempted) { html += '<p><strong>' + LABELS[test] + ':</strong> Not assessed</p>'; continue; }
    const value = result.scores[test.toUpperCase()] || 0;
    const [name, colour] = level(value, test === 'stress');
    html += '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-light);">' +
      '<div style="min-width:60px;font-weight:700;font-size:0.9rem;color:var(--text);">' + LABELS[test] + '</div>' +
      '<div style="flex:1;"><div style="height:8px;background:var(--bg-alt);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' +
      value + '%;background:var(--' + colour + ');border-radius:4px;"></div></div></div>' +
      '<div style="min-width:40px;font-weight:800;font-size:0.95rem;text-align:right;color:var(--' + colour + ');">' + value + '</div>' +
      '<div style="min-width:75px;font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--' + colour + ');">' + name + '</div></div>';
  }
  const [name, colour] = level(result.fiveQSPlus, false);
  if (result.meta.stress?.attempted) html += '<p class="local-note">Stress is an experimental percentage from adapted items, not an official PSS-10 total. No clinical cut-off or severity category is assigned.</p>';
  html += '<div style="margin-top:14px;padding:12px 16px;background:var(--bg);border-radius:8px;border:2px solid var(--' + colour + ');">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;"><strong>5QS+ Overall</strong>' +
    '<strong style="font-size:1.15rem;color:var(--' + colour + ');">' + result.fiveQSPlus + '/100 — ' + name + '</strong></div>' +
    '<p class="local-note">Experimental model-assigned points. These display bands are not a clinical diagnosis or a validated replacement for the original scoring instrument.</p></div>';
  get('interpretationBands').innerHTML = html;
  get('interpretationCard').style.display = 'block';
}
