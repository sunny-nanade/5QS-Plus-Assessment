// Submission is separate from model inference and is off by default in YAML.
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbxkxU3-At3xITXT2MPCGQkZivclcGhwg7caebmeZDMKeOYqd9O7nUZRg021VGhBJRGp/exec';

function buildPayload(result, participant, duration) {
  const { scores, meta, composites, scoring, fiveQSPlus } = result;
  const dq = composites.dq || {};
  const payload = { sheetName: '5QS+_Responses' };
  for (const field of ['name', 'email', 'age', 'gender', 'profession', 'institution', 'program']) payload[field] = participant[field] || 'N/A';
  for (const test of ['iq', 'eq', 'aq', 'sq', 'dq', 'stress']) {
    payload[test] = scores[test.toUpperCase()] || 0;
    payload[test + (test === 'iq' ? '_attempted' : '_items')] = meta[test]?.attempted || 0;
  }
  Object.assign(payload, {
    iq_correct: meta.iq?.correct || 0, iq_total: meta.iq?.total || 0,
    dq_ai_literacy: dq['AI Literacy']?.percent || 0, dq_data_analytics: dq['Data Analytics']?.percent || 0,
    dq_digital_ethics: dq['Digital Ethics']?.percent || 0, dq_cyber_awareness: dq['Cyber Awareness']?.percent || 0,
    fiveqs_plus: fiveQSPlus, total_duration_sec: duration, timestamp: new Date().toISOString(),
    scoring_method: scoring.method, scoring_model: scoring.model, scoring_revision: scoring.revision,
    scoring_config_hash: scoring.config_hash, scoring_backend: scoring.backend,
    scoring_rubric_version: scoring.rubric_version, scoring_input_hash: scoring.input_hash, scored_at: scoring.scored_at
  });
  return payload;
}

export async function submitResults(result, participant, duration, storage = localStorage, send = fetch) {
  if (!result.scoring.submission_enabled) return { state: 'local', message: 'Your results are saved on this device. Research submission is currently disabled.' };
  if (!Object.values(result.meta).some(item => item.attempted > 0)) throw new Error('Complete at least one assessment item before submitting.');
  const key = result.scoring.config_hash + ':' + result.scoring.input_hash;
  if (storage.getItem('submission_fingerprint') === key) return { state: 'sent', message: 'Submission was previously sent. Google Sheets confirmation is not available in this browser.' };
  await send(ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(result, participant, duration)) });
  storage.setItem('submission_fingerprint', key);
  return { state: 'sent', message: 'Submission sent. Please check Google Sheets for confirmation. Your local results have been retained.' };
}
