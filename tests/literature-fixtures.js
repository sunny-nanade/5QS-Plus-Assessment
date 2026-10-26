// V3 novel probes fixed before the V3 candidate sweep (seed 20261016).
// Never use this suite for candidate selection. Prior V2 probes are now exposed.
export function literatureProbes() {
  const snapshot = {};
  const append = (test, question, response) => {
    const group = snapshot[test] ||= {questions: [], responses: []};
    group.questions.push(question); group.responses.push(response);
  };
  let seed = 20261016;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  for (let count = 2; count <= 8; count++) {
    // Include every key position, balanced match/nonmatch, rotated displays,
    // currency/Unicode/near-synonyms. Option IDs must not encode correctness.
    for (let key = 0; key < count; key++) {
      const id = next() % 100000;
      const options = Array.from({length: count}, (_, index) => ['₹', 'Δ', 'Record ', 'Entry '][index % 4] + id + '-' + index);
      for (const test of ['iq', 'aq']) {
        for (const selected of [key, (key + 1) % count]) {
          append(test, {question: 'Novel nominal response record', options, answer: options[key]}, options[selected]);
        }
      }
    }
  }
  const scales = [
    ['Absent', 'Slight', 'Moderate', 'Substantial', 'Extreme'],
    ['At no time', 'On a few occasions', 'On some occasions', 'On most occasions', 'On every occasion']
  ];
  for (const test of ['eq', 'stress']) for (const scale of scales) for (const reverse of [false, true]) {
    for (const response of scale) append(test, {question: 'Novel self-report coding record', scale, reverse}, response);
  }
  return snapshot; // 140 nominal + 40 scale cases = 180, not clinical labels.
}
