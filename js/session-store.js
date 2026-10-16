import { TESTS } from './scoring-core.js';

export function readSnapshot(storage = localStorage) {
  return Object.fromEntries(TESTS.map(test => [test, {
    questions: JSON.parse(storage.getItem(test + '_questions_shown') || '[]'),
    responses: JSON.parse(storage.getItem(test + '_responses') || '[]')
  }]));
}

export function readParticipant(storage = localStorage) {
  return JSON.parse(storage.getItem('user_info') || '{}');
}

export function totalDuration(storage = localStorage) {
  return TESTS.reduce((sum, test) => sum + (parseInt(storage.getItem(test + '_duration') || '0', 10) || 0), 0);
}
