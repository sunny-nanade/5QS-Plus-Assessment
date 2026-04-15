# 5QS+ Assessment Platform — Comprehensive Changelog

> **Purpose:** This document records all changes, bug fixes, and enhancements made to the 5QS+ Assessment Platform during the audit and finalization phase. Use this as a reference when upgrading the accompanying research paper.

---

## 1. Critical Scoring Bug Fixes

### 1.1 IQ Scoring: Correct-per-Attempted (Critical)
- **File:** `results.html` → `scoreIQ()` function
- **Bug:** IQ score was computed as `(correct / shownQuestions.length) × 100`, using _total questions shown_ as the denominator. This penalized participants who skipped questions (e.g., 18 correct out of 20 attempted but 30 shown → wrongly scored 60% instead of 90%).
- **Fix:** Changed to `(correct / attempted) × 100`, with `attempted` counting only questions where the participant selected an answer. Returns 0 if none attempted.
- **Impact on Paper:** The IQ metric now reflects **accuracy among attempted items**, aligning with standard MCQ assessment practice. All reported IQ percentages should be recalculated if based on the previous formula.

### 1.2 IQ Question #12: Incorrect Answer Key
- **File:** `questions/iq.json`, Item ID 12
- **Bug:** Q: "What is the largest ocean on Earth?" — Answer was set to `"Pacific"` but the option list used `"Pacific Ocean"` (exact string match required).
- **Fix:** Corrected answer key to `"Pacific Ocean"`.

### 1.3 AQ Question #11: Non-Ordinal Likert Scale
- **File:** `questions/aq.json`, Item ID 11
- **Bug:** Options were ordered non-monotonically (`["1","3","5","2","4"]`), breaking Likert assumptions.
- **Fix:** Reordered to proper ascending ordinal scale `["1","2","3","4","5"]`.

### 1.4 Stress Questionnaire: Temporal Inconsistency
- **File:** `questions/stress.json`, Items 11, 12, 15
- **Bug:** Items 1–10 used "in the last month" framing; items 11, 12, 15 used "last week" — mixing recall windows within the same instrument.
- **Fix:** Standardized all items to "in the last month" framing.

---

## 2. Data Persistence & Reload Fixes

### 2.1 localStorage Cleanup Broke Results on Reload
- **File:** `results.html`
- **Bug:** After successful Google Sheets submission, all `_responses` and `_questions_shown` keys were removed from localStorage. If the user refreshed the page, no data was available to render scores or question-wise detail.
- **Fix:** Before cleanup, a `results_backup` key is saved containing the rendered score grid HTML and the 5QS+ composite score. On reload (when `submitted === 'true'`), this backup is restored.

### 2.2 Submitted Guard Prevented Any Rendering
- **File:** `results.html`
- **Bug:** The `if (localStorage.getItem('submitted'))` guard returned early without rendering anything — the user saw a blank page with only the "Results already submitted" message.
- **Fix:** The guard now restores backup data (score grid + final composite) before returning.

### 2.3 Orphaned Thank-You Page
- **File:** `results.html`, `thank-you.html`
- **Bug:** `thank-you.html` existed but nothing linked to it — it was a dead end in the navigation flow.
- **Fix:** A "Finish Assessment" button is dynamically inserted after successful submission (and on reload if already submitted), linking to `thank-you.html`.

---

## 3. Google Sheets Integration

### 3.1 Sheet Configuration
- **Target:** Same workbook, dedicated sheet named `5QS+_Responses`
- **Payload field:** `sheetName: '5QS+_Responses'` sent with every POST request
- **Endpoint:** Google Apps Script web app (no-cors mode)

### 3.2 Expanded Payload Schema (28 Fields)
The submission payload now includes granular data for psychometric analysis:

| # | Field | Description |
|---|-------|-------------|
| 1 | `sheetName` | Target sheet name |
| 2 | `name` | Participant name |
| 3 | `email` | Participant email |
| 4 | `age` | Age range |
| 5 | `gender` | Gender |
| 6 | `profession` | Profession category |
| 7 | `institution` | Institution name |
| 8 | `program` | Academic program |
| 9 | `iq` | IQ Score (%) — correct/attempted × 100 |
| 10 | `iq_correct` | Number of correct IQ answers |
| 11 | `iq_attempted` | Number of IQ questions attempted |
| 12 | `iq_total` | Total IQ questions shown |
| 13 | `eq` | EQ Score (%) |
| 14 | `eq_items` | EQ items attempted |
| 15 | `aq` | AQ Score (%) |
| 16 | `aq_items` | AQ items attempted |
| 17 | `sq` | SQ Score (%) |
| 18 | `sq_items` | SQ items attempted |
| 19 | `dq` | DQ Score (%) — overall |
| 20 | `dq_items` | DQ items attempted |
| 21 | `dq_ai_literacy` | DQ sub-dimension: AI Literacy (%) |
| 22 | `dq_data_analytics` | DQ sub-dimension: Data Analytics (%) |
| 23 | `dq_digital_ethics` | DQ sub-dimension: Digital Ethics (%) |
| 24 | `dq_cyber_awareness` | DQ sub-dimension: Cyber Awareness (%) |
| 25 | `stress` | Stress Score (%) |
| 26 | `stress_items` | Stress items attempted |
| 27 | `fiveqs_plus` | 5QS+ Composite = mean(IQ, EQ, AQ, SQ, DQ) |
| 28 | `total_duration_sec` | Total assessment duration in seconds |

### 3.3 Google Apps Script
- **File:** `google-apps-script.js` (new)
- Auto-creates the `5QS+_Responses` sheet with formatted headers if it doesn't exist
- Navy header row with white bold text
- `doPost()` appends data row; `doGet()` returns health check JSON

---

## 4. New Features

### 4.1 Score Interpretation Bands
- **File:** `results.html` → `getLevel()`, `renderInterpretation()`
- Four-tier classification with visual progress bars:
  - **Excellent (81–100):** Strong competency; well-positioned for entrepreneurial success
  - **Good (61–80):** Solid foundation with room for targeted development
  - **Moderate (41–60):** Average competency; focused training recommended
  - **Developing (0–40):** Requires significant development in this dimension
- Stress scores use **inverted** interpretation (lower = better)
- Each dimension rendered with colored progress bar + level label + actionable advice
- Overall 5QS+ composite level displayed prominently

### 4.2 Time Tracking per Assessment
- **File:** `test.html` → `saveTestDuration()`
- Records start timestamp on page load: `localStorage.setItem(testName + '_start_time', Date.now())`
- On submit/skip/exit, computes elapsed seconds: `Math.round((Date.now() - startTime) / 1000)`
- Stored as `{testName}_duration` in localStorage
- Aggregated as `total_duration_sec` in Google Sheets payload
- Enables analysis of time-on-task as a covariate for score validity

### 4.3 Question-Wise Feedback with Importance Tags
- **File:** `results.html`
- After the radar chart and score cards, each question is listed with:
  - User's selected answer vs. correct answer (for MCQ)
  - Correct/Incorrect badge
  - **Anchor** vs. **Supplementary** classification tag per item
- Allows participants to review their specific strengths and weaknesses

### 4.4 Stratified Random Sampling
- **File:** `test.html`
- Questions are sampled proportionally from each subscale/composite to maintain construct coverage
- Fisher-Yates shuffle ensures randomization
- Question limits: IQ:15, EQ:15, AQ:15, SQ:15, DQ:30 (full instrument), Stress:10
- DQ uses all 30 items to support Cronbach's α validation across 4 sub-dimensions

---

## 5. UI / UX Improvements

### 5.1 Professional Color Palette
- **Navy (#0F2B46):** Headers, primary backgrounds
- **Teal (#0D7377):** Secondary accent, buttons
- **Gold (#C7923E):** Highlights, badges, special elements
- **Slate (#2D3748):** Body text
- **Cool Gray (#EDF2F7):** Backgrounds, cards

### 5.2 Header Fixes
- App header heading explicitly set to `color: #fff` (was being overridden by global `h1` rule)
- Badge text changed from "HESWBL Special Issue 2026" to "Research Tool • Open-Source Assessment Platform"

### 5.3 Emoji Removal
- All emoji icons on the landing page replaced with text abbreviations (IQ, EQ, AQ, SQ, DQ, ST) inside colored circles
- Ensures cross-platform rendering consistency

### 5.4 Navigation Flow Completion
- Full flow: `index.html` → `info.html` → `test.html` (6 tests in sequence) → `results.html` → `thank-you.html`
- Thank-you page includes 20-second countdown auto-redirect back to home

---

## 6. Scholarly References Added

### 6.1 References in index.html and README.md
Eight Nanade publications cited on the landing page's reference section:
1. Nanade, M.P. & Naik, R.L. (2024). Assessing Intellectual Quotient... *International Journal of Science and Research*
2. Nanade, M.P. & Naik, R.L. (2024). Measuring Emotional Quotient... *IJSR*
3. Nanade, M.P. (2024). Evaluating Adversity Quotient... *International Journal Based Research*
4. Nanade, M.P. & Naik, R.L. (2024). Social Quotient Assessment... *IJBR*
5. Nanade, M.P. & Naik, R.L. (2024). Assessing Digital Quotient... *IJSR*
6. Nanade, M.P. & Naik, R.L. (2024). Measuring Entrepreneurial Stress... *Interantional Journal for Multidisciplinary Research*
7. Nanade, M.P. & Naik, R.L. (2024). Peer-Based Learning Readiness... *IJMR*
8. Nanade, M.P. & Dash, D.P. (2026). Development of Student-Faculty... *Accepted, HESWBL*

---

## 7. Instrument Observations for Paper Discussion

### 7.1 Current Scoring Formulae
- **IQ:** `(correct / attempted) × 100` — pure accuracy among attempted MCQs
- **EQ, AQ, SQ, DQ, Stress:** `(sum of responses / (attempted × 5)) × 100` — percentage of maximum possible on 5-point Likert
- **5QS+ Composite:** `mean(IQ%, EQ%, AQ%, SQ%, DQ%)` — Stress reported separately
- **Reverse scoring:** Applied to stress items 4, 7, 10, 13 → `6 - raw_value`

### 7.2 DQ Sub-Dimension Analysis
All 30 DQ items administered (no sampling) to enable:
- Cronbach's α per sub-dimension (AI Literacy, Data Analytics, Digital Ethics, Cyber Awareness)
- Inter-dimension correlation analysis
- Individual sub-dimension percentages reported in Google Sheets

### 7.3 Notes for Concurrent Validity Discussion
Recent literature that could strengthen the paper's discussion:
- **Wiroonrath et al. (2024):** DQ scale validation with 8 digital competency dimensions — supports DQ operationalization
- **Li et al. (2024):** DQ Scale for primary students in China — cross-cultural DQ measurement
- **Sharma (2026):** Awareness Quotient concept — parallels the AQ dimension

---

## 8. Technical Infrastructure

| Component | Detail |
|-----------|--------|
| **Stack** | Static HTML5 / CSS3 / Vanilla JavaScript |
| **Charting** | Chart.js v4.4.4 (6-axis radar) |
| **Data collection** | Google Sheets via Apps Script (no-cors POST) |
| **License** | CC BY-NC-ND 4.0 |
| **Hosting** | GitHub Pages compatible (no server-side code) |
| **Local dev** | `serve.py` → Python HTTP server on port 9090 |
| **Testing utility** | `simulate_test.js` → seeds localStorage with mock data |

---

*Last updated: Session audit and finalization phase*
