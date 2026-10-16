// Ground truth is confined to evaluation. Production scoring never imports this file.
import { TESTS } from '../js/scoring-core.js';
const LIKERT = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
const FREQUENCY = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'];

function append(snapshot, test, question, response) {
  const group = snapshot[test] ||= { questions: [], responses: [] };
  group.questions.push(question);
  group.responses.push(response);
}

export function expectedPoints(test, question, response) {
  if (question.options && question.answer) {
    const correct = response.trim().toLowerCase() === question.answer.trim().toLowerCase();
    return correct ? (test === 'iq' ? 1 : 5) : (test === 'iq' ? 0 : 1);
  }
  const index = (question.scale || LIKERT).indexOf(response);
  if (index < 0) throw new Error('Invalid fixture response');
  return question.reverse ? 5 - index : index + 1;
}

export function smokeSnapshot() {
  const snapshot = {};
  for (const response of ['4', '3']) {
    append(snapshot, 'iq', { question: '2 + 2?', options: ['3', '4'], answer: '4' }, response);
  }
  for (const reverse of [false, true]) {
    for (const response of LIKERT) append(snapshot, 'eq', { question: 'I manage my emotions.', scale: LIKERT, reverse }, response);
  }
  for (const response of ['Keep trying', 'Give up']) {
    append(snapshot, 'aq', { question: 'When challenged, I:', options: ['Keep trying', 'Give up'], answer: 'Keep trying' }, response);
  }
  for (const reverse of [false, true]) {
    for (const response of FREQUENCY) append(snapshot, 'stress', { question: 'How often did you feel overwhelmed?', scale: FREQUENCY, reverse }, response);
  }
  return snapshot;
}

export async function bankSnapshot(fetchBank) {
  const snapshot = {};
  for (const test of TESTS) {
    const questions = await fetchBank(test);
    for (const question of questions) {
      for (const response of (question.options || question.scale || LIKERT)) append(snapshot, test, question, response);
    }
  }
  return snapshot;
}

export function calibrationSnapshot() {
  const snapshot = smokeSnapshot();
  const endurance = ['Very slowly', 'With difficulty', 'Moderately well', 'Very quickly', 'Immediately'];
  for (const reverse of [false, true]) {
    for (const response of endurance) append(snapshot, 'aq', {question: 'How quickly do you recover?', scale: endurance, reverse}, response);
  }
  for (const [answer, other] of [['57', '75'], ['Option B', 'Option D'], ['Keep practising', 'Stop practising'], ['12.5', '12.05']]) {
    for (const test of ['iq', 'aq']) {
      for (const response of [answer, other]) append(snapshot, test, {question: 'Recorded selection check', options: [answer, other], answer}, response);
    }
  }
  return snapshot;
}

// Frozen before the new tuning run. Do not use this set to select the profile.
// Novel evidence strings/scales probe generalisation; this is not human validation.
export function frozenProbeSnapshot() {
  const snapshot = {};
  let seed = 20261015;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  for (let index = 0; index < 12; index++) {
    const n = 100 + next() % 900;
    const answer = index % 2 ? 'Record ' + n + '-X' : String(n);
    const other = index % 2 ? 'Record ' + n + '-Y' : String(n + 1);
    for (const test of ['iq', 'aq']) {
      for (const response of [answer, other]) append(snapshot, test, {question: 'Unseen recorded-selection probe', options: [answer, other], answer}, response);
    }
  }
  const scales = [
    ['Not at all', 'A little', 'Somewhat', 'Mostly', 'Completely'],
    ['Not once', 'Occasionally', 'About half the time', 'Frequently', 'Every time']
  ];
  for (const test of ['eq', 'stress']) {
    for (const scale of scales) for (const reverse of [false, true]) {
      for (const response of scale) append(snapshot, test, {question: 'Unseen recorded-scale probe', scale, reverse}, response);
    }
  }
  return snapshot;
}

export function summarize(cases) {
  const groups = {};
  for (const item of cases) {
    for (const key of new Set([item.test, item.kind])) {
      const group = groups[key] ||= { matched: 0, total: 0 };
      group.total++;
      group.matched += Number(item.match);
    }
  }
  return { matched: cases.filter(item => item.match).length, total: cases.length, groups };
}
