// 5QS+ Test Data Simulator
// Run this in the browser console while on http://localhost:8080 to seed
// localStorage with realistic test data, then navigate to results.html.

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

  // Remove any prior submitted flag
  localStorage.removeItem('submitted');

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
      // IQ: pick the correct answer ~60% of the time
      if (q.options && q.answer && !q.scale) {
        return Math.random() < 0.6 ? q.answer : q.options[Math.floor(Math.random() * q.options.length)];
      }
      // AQ MCQ items (have options + answer)
      if (q.options && q.answer) {
        return Math.random() < 0.5 ? q.answer : q.options[Math.floor(Math.random() * q.options.length)];
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

    // Handle stress: frequency scale
    if (test === 'stress') {
      var freqScale = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'];
      responses = shown.map(function() {
        return freqScale[Math.floor(Math.random() * freqScale.length)];
      });
    }

    localStorage.setItem(test + '_questions_shown', JSON.stringify(shown));
    localStorage.setItem(test + '_responses', JSON.stringify(responses));
    console.log('[5QS+ Sim] ' + test.toUpperCase() + ': ' + shown.length + ' items, ' + responses.length + ' responses');
  }

  console.log('[5QS+ Sim] All data seeded. Navigate to results.html');
  window.location.href = 'results.html';
})();
