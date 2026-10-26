// 5QS+ Test Data Simulator
// Run this in a dedicated test browser console on http://localhost:9090 to seed
// synthetic data, then navigate to results.html. Uses the first N bank items,
// not the assessment's random/stratified sampling. Replaces existing local data.

(async function simulate5QSPlus() {
  'use strict';

  // User info
  localStorage.setItem('user_info', JSON.stringify({
    name: 'Test Participant',
    email: 'test@example.com',
    age: '24',
    gender: 'Female',
    profession: 'Student',
    institution: 'ABC University',
    program: 'MBA'
  }));

  // Clear legacy submission state and the current result/submission cache.
  localStorage.removeItem('submitted');
  localStorage.removeItem('submission_fingerprint');
  localStorage.removeItem('results_backup');

  var tests = ['iq', 'eq', 'aq', 'sq', 'dq', 'stress'];

  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var res = await fetch('questions/' + test + '.json');
    var questions = await res.json();

    // Determine how many items to show (same limits as test engine)
    var limits = { iq: 15, eq: 15, aq: 15, sq: 15, dq: 30, stress: 10 };
    var limit = limits[test] || questions.length;
    var shown = questions.slice(0, limit);

    // Build simulated responses
    var responses = shown.map(function(q) {
      // Prefer the key on 60% of IQ / 50% of AQ draws; the remaining draws
      // sample all displayed options (so the actual match rate can be higher).
      if (q.options && q.answer) {
        var keyProbability = test === 'iq' ? 0.6 : 0.5;
        return Math.random() < keyProbability ? q.answer : q.options[Math.floor(Math.random() * q.options.length)];
      }
      // Likert with explicit scale
      if (q.scale) {
        return q.scale[Math.floor(Math.random() * q.scale.length)];
      }
      // Standard Likert (EQ, SQ, DQ)
      var likert = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
      // Bias slightly toward positive
      var weights = [0.05, 0.10, 0.20, 0.35, 0.30];
      var r = Math.random(), cum = 0;
      for (var k = 0; k < weights.length; k++) {
        cum += weights[k];
        if (r <= cum) return likert[k];
      }
      return likert[4];
    });

    localStorage.setItem(test + '_questions_shown', JSON.stringify(shown));
    localStorage.setItem(test + '_responses', JSON.stringify(responses));
    console.log('[5QS+ Sim] ' + test.toUpperCase() + ': ' + shown.length + ' items, ' + responses.length + ' responses');
  }

  console.log('[5QS+ Sim] All data seeded. Navigate to results.html');
  window.location.href = 'results.html';
})();
