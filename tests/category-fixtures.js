import {TESTS} from '../js/scoring-core.js';

export function combineSnapshots(...snapshots) {
  return Object.fromEntries(TESTS.map(test => [test, {
    questions: snapshots.flatMap(snapshot => snapshot[test]?.questions || []),
    responses: snapshots.flatMap(snapshot => snapshot[test]?.responses || [])
  }]));
}

// Fixed before the V4 sweep. Novel V3 probes are no longer unseen data.
// This tests coding only, not the psychological validity of any sample item.
export function categoryProbes() {
  const snapshot = {};
  const append = (test, question, response) => {
    const group = snapshot[test] ||= {questions: [], responses: []};
    group.questions.push(question); group.responses.push(response);
  };
  for (const count of [9, 12, 20]) for (let key = 0; key < count; key++) {
    const options = Array.from({length: count}, (_, index) => 'Unseen record Ω-' + count + '-' + ((index * 7 + key) % count) + '-' + index);
    for (const test of ['iq', 'aq']) for (const selected of [key, (key + 2) % count]) {
      append(test, {question: 'Unseen large candidate-space record', options, answer: options[key]}, options[selected]);
    }
  }
  const scales = [
    ['No days', 'One or two days', 'Several days', 'Most days', 'All days'],
    ['Not representative', 'A little representative', 'Partly representative', 'Very representative', 'Entirely representative'],
    ['No confidence', 'Limited confidence', 'Some confidence', 'Considerable confidence', 'Complete confidence'],
    ['Not evident', 'Faintly evident', 'Partially evident', 'Clearly evident', 'Fully evident'],
    ['Level α', 'Level β', 'Level γ', 'Level δ', 'Level ε']
  ];
  for (const test of TESTS.filter(test => test !== 'iq')) for (const scale of scales) for (const reverse of [false, true]) {
    for (const response of scale) append(test, {question: 'Unseen category-mapping record', scale, reverse}, response);
  }
  return snapshot; // 164 nominal + 250 scale = 414 cases.
}
