// Pure, runtime-independent request building, validation and score aggregation.
export const TESTS = ['iq', 'eq', 'aq', 'sq', 'dq', 'stress'];
const DEFAULT_SCALE = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
const VARIABLES = ['dimension', 'subscale', 'question', 'response', 'answer', 'response_text', 'answer_text', 'scale', 'reverse',
  'response_characters', 'answer_characters',
  'response_position', 'answer_position', 'response_slot', 'answer_slot', 'options',
  'point_1_response', 'point_2_response', 'point_3_response', 'point_4_response', 'point_5_response'];
for (let point = 1; point <= 5; point++) VARIABLES.push('point_' + point + '_slot', 'point_' + point + '_position');

function requireText(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing or invalid ' + name);
}

function validateTemplate(value, name) {
  requireText(value, name);
  for (const match of value.matchAll(/{{\s*([^{}]+?)\s*}}/g)) {
    if (!VARIABLES.includes(match[1])) throw new Error('Unknown prompt variable: ' + match[1]);
  }
}

export function validateConfig(config) {
  if (config?.version !== 1) throw new Error('Unsupported scoring.yaml version');
  requireText(config.rubric_version, 'rubric_version');
  if (typeof config.submission?.enabled !== 'boolean') throw new Error('submission.enabled must be true or false');
  for (const field of ['id', 'revision', 'adapter']) {
    requireText(config.model?.[field], 'model.' + field);
  }
  if (config.model.base_url !== undefined) requireText(config.model.base_url, 'model.base_url');
  const encoding = config.model.encoding || 'julia-wasm';
  if (!['julia-wasm', 'laya-js'].includes(encoding)) throw new Error('Unsupported model encoding');
  const files = encoding === 'julia-wasm'
    ? ['graph', 'weights', 'tokenizer', 'encoder_js', 'encoder_wasm']
    : ['graph', 'tokenizer', 'tokenizer_config'];
  for (const field of files) {
    requireText(config.model.files?.[field], 'model.files.' + field);
  }
  if (config.model.files.weights) requireText(config.model.external_data_path, 'model.external_data_path');
  const runtime = config.runtime;
  if (!runtime || !['webgpu', 'wasm'].includes(runtime.preferred_device) ||
      typeof runtime.cpu_fallback !== 'boolean' || typeof runtime.cache_downloads !== 'boolean' ||
      runtime.cpu_threads !== 1 || !Number.isInteger(runtime.max_length) ||
      runtime.max_length > 8192 || !Number.isInteger(runtime.head_length) ||
      runtime.head_length < 64 || runtime.head_length + 4 >= runtime.max_length ||
      !Number.isInteger(runtime.download_timeout_ms) || runtime.download_timeout_ms < 1000) {
    throw new Error('Invalid runtime settings in scoring.yaml');
  }
  if (!['none', 'reverse', 'cyclic'].includes(runtime.decision_ensemble || 'none') ||
      !Number.isFinite(runtime.decision_temperature ?? 1) || (runtime.decision_temperature ?? 1) <= 0 ||
      (runtime.decision_temperature ?? 1) > 10) throw new Error('Invalid decision ensemble settings');
  validateTemplate(config.prompts?.instructions, 'prompts.instructions');
  validateTemplate(config.prompts?.state, 'prompts.state');
  for (const [test, override] of Object.entries(config.prompts.dimensions || {})) {
    if (!TESTS.includes(test) || !override || typeof override !== 'object') {
      throw new Error('Invalid dimension prompt: ' + test);
    }
    for (const key of Object.keys(override)) {
      if (!['instructions', 'state'].includes(key)) throw new Error('Unknown prompt override: ' + key);
      validateTemplate(override[key], 'prompts.dimensions.' + test + '.' + key);
    }
  }
  for (const [kind, override] of Object.entries(config.prompts.kinds || {})) {
    if (!['iq', 'mcq', 'likert'].includes(kind) || !override || typeof override !== 'object') throw new Error('Invalid kind prompt');
    for (const key of Object.keys(override)) {
      if (!['instructions', 'state'].includes(key)) throw new Error('Unknown kind prompt override');
      validateTemplate(override[key], 'prompts.kinds.' + kind + '.' + key);
    }
  }
  for (const kind of ['iq', 'mcq', 'likert']) {
    const rubric = config.rubrics?.[kind];
    if (!rubric || !['choice', 'score', 'noul'].includes(rubric.type) ||
        !Array.isArray(rubric.options) || rubric.options.length < 2 || rubric.options.length > 20) {
      throw new Error('Invalid rubric: ' + kind);
    }
    if (rubric.type === 'noul' && rubric.options.length !== 2) throw new Error('noul requires exactly two options');
    validateTemplate(rubric.instructions, 'rubrics.' + kind + '.instructions');
    const max = kind === 'iq' ? 1 : 5;
    const min = kind === 'iq' ? 0 : 1;
    rubric.options.forEach(option => {
      if (!option || typeof option !== 'object') throw new Error('Invalid ' + kind + ' option');
      validateTemplate(option.text, kind + ' option text');
      if (!Number.isFinite(option.value) || option.value < min || option.value > max) {
        throw new Error('Invalid ' + kind + ' point value');
      }
    });
    const values = rubric.options.map(option => option.value);
    if (kind === 'iq' && values.length !== 2) throw new Error('IQ requires binary 0/1 point values');
    if (Math.min(...values) !== min || Math.max(...values) !== max ||
        new Set(values).size !== values.length || values.some((v, i) => i && v <= values[i - 1])) {
      throw new Error(kind + ' rubric must have ascending, unique values spanning ' + min + '–' + max);
    }
  }
  return config;
}

export function fillTemplate(template, variables) {
  return template.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key) => {
    if (!Object.hasOwn(variables, key)) throw new Error('Unknown prompt variable: ' + key);
    return variables[key];
  });
}

export function buildItems(snapshot, config) {
  const items = [];
  for (const test of TESTS) {
    const { questions = [], responses = [] } = snapshot[test] || {};
    if (!Array.isArray(questions) || !Array.isArray(responses) || responses.length > questions.length) {
      throw new Error('Invalid assessment data for ' + test);
    }
    questions.forEach((q, index) => {
      const response = responses[index];
      if (response === null || response === undefined || response === '') return;
      if (!q || typeof q.question !== 'string' || typeof response !== 'string') {
        throw new Error('Invalid response in ' + test);
      }
      const mcq = Array.isArray(q.options) && q.options.length > 0 && typeof q.answer === 'string';
      const scale = mcq ? q.options : (q.scale || DEFAULT_SCALE);
      if (!Array.isArray(scale) || !scale.includes(response)) {
        throw new Error('Response is not one of the displayed options in ' + test);
      }
      if (scale.some(option => typeof option !== 'string' || !option.trim()) ||
          new Set(scale.map(option => option.trim().toLowerCase())).size !== scale.length) {
        throw new Error('Item requires distinct displayed options');
      }
      if (mcq && (scale.length > 20 || !scale.includes(q.answer))) {
        throw new Error('MCQ requires distinct displayed options and a displayed answer key');
      }
      if (!mcq && scale.length !== 5) throw new Error('Likert items must have five scale options');
      if (test === 'iq' && !mcq) throw new Error('IQ item has no answer key');
      const kind = test === 'iq' ? 'iq' : mcq ? 'mcq' : 'likert';
      const rubric = config.rubrics[kind];
      // Only questionnaire evidence is supplied to the model. No demographics.
      const variables = {
        dimension: test.toUpperCase(), subscale: JSON.stringify(q.composite || q.subscale || 'General'),
        question: JSON.stringify(q.question), response: JSON.stringify(response),
        answer: JSON.stringify(mcq ? q.answer : null), scale: JSON.stringify(mcq ? [] : scale),
        response_text: response, answer_text: mcq ? q.answer : 'Not applicable',
        response_characters: JSON.stringify(Array.from(response.trim().toLowerCase())),
        answer_characters: JSON.stringify(mcq ? Array.from(q.answer.trim().toLowerCase()) : []),
        // Independent nominal encodings, not equality/correctness flags. The model
        // still compares these records; no point decision is made here.
        response_position: String(scale.indexOf(response) + 1),
        answer_position: mcq ? String(scale.indexOf(q.answer) + 1) : 'Not applicable',
        response_slot: String.fromCharCode(65 + scale.indexOf(response)),
        answer_slot: mcq ? String.fromCharCode(65 + scale.indexOf(q.answer)) : 'Not applicable',
        options: JSON.stringify(mcq ? scale : []),
        reverse: String(Boolean(q.reverse))
      };
      // Supply concrete candidate evidence instead of asking a small model to
      // perform reversal arithmetic. Point assignment is still a model decision.
      const pointOrder = q.reverse ? [...scale].reverse() : scale;
      for (let point = 1; point <= 5; point++) {
        variables['point_' + point + '_response'] = mcq ? 'Not applicable' : pointOrder[point - 1];
        const position = mcq ? -1 : scale.indexOf(pointOrder[point - 1]);
        variables['point_' + point + '_slot'] = mcq ? 'Not applicable' : String.fromCharCode(65 + position);
        variables['point_' + point + '_position'] = mcq ? 'Not applicable' : String(position + 1);
      }
      const override = config.prompts.dimensions?.[test] || {};
      const kindOverride = config.prompts.kinds?.[kind] || {};
      const row = {
        state: fillTemplate(kindOverride.state || override.state || config.prompts.state, variables),
        question: [config.prompts.instructions, override.instructions, kindOverride.instructions, rubric.instructions]
          .filter(Boolean).map(text => fillTemplate(text, variables)).join('\n'),
        type: rubric.type, options: rubric.options.map(option => fillTemplate(option.text, variables))
      };
      items.push({ test, index, kind, composite: q.composite || q.subscale || 'General',
        max: kind === 'iq' ? 1 : 5, values: rubric.options.map(option => option.value), row });
    });
  }
  return items;
}

export function decisionFromLogits(item, logits) {
  if (!Array.isArray(logits) || logits.length !== item.values.length || !logits.every(Number.isFinite)) {
    throw new Error('Model returned invalid logits; results have not been submitted.');
  }
  const peak = Math.max(...logits);
  const weights = logits.map(value => Math.exp(value - peak));
  const total = weights.reduce((sum, value) => sum + value, 0);
  const probabilities = weights.map(value => value / total);
  const index = logits.indexOf(peak);
  return { score: item.values[index], max: item.max, option: index,
    confidence: probabilities[index], probabilities };
}

// This is arithmetic aggregation of model-assigned points, not a second scorer.
export function aggregate(snapshot, items, decisions) {
  const scores = {}, meta = {}, composites = {}, itemScores = {};
  for (const test of TESTS) {
    const questions = snapshot[test]?.questions || [];
    const testItems = items.filter(item => item.test === test);
    itemScores[test] = Array(questions.length).fill(null);
    meta[test] = { attempted: testItems.length, total: questions.length };
    composites[test] = Object.create(null);
    for (const item of testItems) {
      const decision = decisions.get(item);
      if (!decision) throw new Error('Missing model decision');
      itemScores[test][item.index] = decision;
      if (test === 'iq') continue;
      const comp = composites[test][item.composite] ||= { score: 0, max: 0, items: 0,
        totalItems: questions.filter(q => (q.composite || q.subscale || 'General') === item.composite).length };
      comp.score += decision.score;
      comp.max += item.max;
      comp.items++;
    }
    if (test === 'iq') {
      const correct = testItems.reduce((sum, item) => sum + decisions.get(item).score, 0);
      meta.iq.correct = correct;
      scores.IQ = testItems.length ? Math.round(100 * correct / testItems.length) : 0;
    } else {
      const values = Object.values(composites[test]);
      values.forEach(comp => { comp.percent = Math.round(100 * comp.score / comp.max); });
      scores[test.toUpperCase()] = values.length
        ? Math.round(values.reduce((sum, comp) => sum + comp.percent, 0) / values.length) : 0;
    }
  }
  const fiveQSPlus = Math.round(TESTS.filter(test => test !== 'stress')
    .reduce((sum, test) => sum + scores[test.toUpperCase()], 0) / 5);
  return { scores, meta, composites, itemScores, fiveQSPlus };
}
