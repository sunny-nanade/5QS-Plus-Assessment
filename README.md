# 5QS+ Entrepreneurial Competency Assessment Platform

> **Companion instrument for:**  
> Nanade, S. & Dash, D. (2026). *Reframing Entrepreneurial Competency Assessment in the Digital Age: A 5Qs+ Framework Integrating Digital Intelligence and Experiential Learning.* Higher Education, Skills and Work-Based Learning (Special Issue: Advancing Business & Entrepreneurial Education).

---

## Overview

The **5QS+ Framework** extends the validated 4QS model (Nanade et al., 2021; Nanade et al., 2026) by integrating a **Digital Quotient (DQ)** dimension, yielding a six-axis assessment of entrepreneurial competency:

| Dimension | Items | Theoretical Basis |
|-----------|------:|-------------------|
| **IQ** — Cognitive Ability | 31 (15 sampled) | Human Capital Theory (Becker, 1993) |
| **EQ** — Emotional Intelligence | 25 (15 sampled) | Bar-On EQ-i model; Goleman tradition |
| **AQ** — Adversity Quotient | 25 (15 sampled) | CORE model (Stoltz, 1997) |
| **SQ** — Spiritual Intelligence | 25 (15 sampled) | Zohar & Marshall (2000) |
| **DQ** — Digital Quotient | 30 (all) | Chen & Ifenthaler (2023); van Laar et al. (2017); OECD (2023) |
| **Stress** — Moderator | 15 (10 sampled) | Perceived Stress Scale |

**Total**: ~100 items · ~34 minutes · stratified random sampling with balanced composite representation.

The DQ instrument (30 items) is administered in full to support Cronbach's α, composite reliability, and CFA validation (§5.1 of the paper).

This theoretical overview describes the original framework; it does not establish
validity of the sampled/adapted, model-scored version. See the
[source-use record](docs/REFERENCES.md) and [instrument audit](docs/PSYCHOLOGY_SCORING_REVIEW.md).

---

## Architecture

```
5QS-Plus-App/
├── index.html          # Landing page with framework overview & consent
├── info.html           # Participant demographics form
├── test.html           # Assessment engine (stratified sampling, auto-advance)
├── results.html        # 6-axis radar chart, composite breakdowns, Google Sheets sync
├── thank-you.html      # Completion & redirect
├── styles.css          # Responsive UI with print support (original styling retained)
├── assessment.html     # Transparent persistent host for local inference
├── scoring.yaml        # Model, prompts, inference properties and submission switch
├── js/                 # Modular scoring, runtime, presentation and submission
├── benchmarks.html     # Separate researcher benchmark page
├── model-licenses.html # Model attribution, licences and local data use
└── questions/
    ├── iq.json         # 31 MCQ items
    ├── eq.json         # 25 Likert items, 5 composites
    ├── aq.json         # 25 items (mixed MCQ + Likert), 4 CORE subscales
    ├── sq.json         # 25 Likert items, 4 subscales
    ├── dq.json         # 30 Likert items, 4 sub-dimensions (NEW)
    └── stress.json     # 15 frequency-scale items
```

**Stack**: Static HTML5 / CSS3 / Vanilla JavaScript · Chart.js v4.4.4 · GitHub Pages  
**Data capture**: Optional Google Sheets via Apps Script endpoint (disabled by default pending model validation)

---

## DQ Instrument Sub-Dimensions

| Sub-Dimension | Items | Codes | Source |
|---------------|------:|-------|--------|
| AI Literacy | 8 | DL1–DL8 | Chen & Ifenthaler (2023) |
| Data Analytics | 8 | DA1–DA8 | van Laar et al. (2017) |
| Digital Ethics | 7 | DE1–DE7 | OECD (2023) |
| Cyber Awareness | 7 | CA1–CA7 | Cybersecurity frameworks |

All items measured on a 5-point Likert scale (1 = Strongly Disagree → 5 = Strongly Agree).

---

## Assessment Engine Features

- **Stratified random sampling**: Questions grouped by subscale/composite, then balanced random subsets selected per group to balance representation and reduce respondent fatigue. Construct validity of the sampled, model-scored version still requires evidence.
- **Mixed-format auto-detection**: AQ items contain both MCQ (scored correct = 5, incorrect = 1) and Likert items; the engine detects format per item.
- **Auto-advance**: 350 ms delay after selection for natural pacing.
- **Timer per test**: Visual countdown with warning colours at 60 s and 30 s remaining.
- **Fisher–Yates shuffle**: Randomises question order within each test to minimise order effects.
- **Composite scoring**: Per-subscale percentage scores stored alongside overall dimension scores.

---

## Quick Start (Local)

```bash
# Clone the repository
git clone https://github.com/sunny-nanade/5QS-Plus-Assessment.git
cd 5QS-Plus-Assessment

# Serve locally (any static server works)
python -m http.server 8000
# or, with Node.js 22+
npm run serve
```

Open `http://localhost:8000` (Python) or `http://localhost:9090` (Node) in Chrome/Edge.

> Use HTTPS or localhost for local inference. Browser privacy/network settings may block optional Sheets sync; `no-cors` cannot confirm a saved row.

---

## Deployment

Push to the `main` branch of `sunny-nanade/5QS-Plus-Assessment`. Enable **GitHub Pages** (Settings → Pages → Source: main branch, root folder). The site will be available at:

```
https://sunny-nanade.github.io/5QS-Plus-Assessment/
```

`.nojekyll` preserves the static assets. No production build, API key, inference server or custom response headers are required. See [local scoring and deployment](docs/LOCAL_SCORING.md).

---

## Scoring Method

**Experimental local-model update:** Laya assigns item points in the browser using the YAML rubric, with WebGPU and local CPU/WASM fallback. The original question banks and visual design are retained. These scores are **not a validated replacement** for the published instrument, and research submission stays disabled by default.

- Configure models, prompts and inference in [`scoring.yaml`](scoring.yaml); see [configuration and module boundaries](docs/LOCAL_SCORING.md).
- Inspect recorded results or opt in to local tests on [`benchmarks.html`](benchmarks.html).
- Active V4 coding agreement: **718/718** bank cases and **986/986** exposed development cases; **412/414 (99.5%)** separately frozen synthetic fixtures. Because of nominal encoding, only 102 probe cases use new canonical inputs: **100/102**, or **32/33 distinct new-input decisions**. The 718 bank cases have only **31 distinct model inputs**; none of these counts is psychological accuracy or independent participant evidence. The earlier V3 probe failure (170/180) is retained. See [research protocol and all rounds](docs/RESEARCH_VALIDATION.md).
- [Psychology source review](docs/PSYCHOLOGY_SCORING_REVIEW.md): targeted sources, probable IQ key defects, ambiguous AQ coding and nonstandard stress-scale use. Unsupported stress severity cut-offs are removed; original question banks remain unchanged. [Fine-tuning prerequisites](docs/FINETUNING_PLAN.md) are documented; no training has been performed.
- Model licences, pinned revisions and attribution: [`MODEL_LICENSES.md`](MODEL_LICENSES.md).
- Developer checks: `npm ci` then `npm test` — **41 automated tests**; these do not run model inference. See the [coverage and manual-check record](docs/TESTING.md).

The following is the **intended point rubric**, not a guarantee that a model always applies it correctly:

| Test | Format | Scoring |
|------|--------|---------|
| IQ | MCQ | Correct = 1, Incorrect = 0; scaled to % |
| EQ, SQ, DQ, Stress | Likert 1–5 | Sum per composite / max possible → % |
| AQ | Mixed | MCQ items: Correct = 5, Incorrect = 1; Likert items: standard 1–5 with reverse scoring |

**5QS+ Composite Score** = mean(IQ%, EQ%, AQ%, SQ%, DQ%). Stress is reported separately as a moderating variable. Within answered non-IQ dimensions, subscale percentages are equally weighted. Unanswered items are excluded; skipped dimensions contribute zero to the overall mean.

---

## References

The original framework bibliography below is retained for context; it was not all
independently reviewed for this update. The new review used CMU's PSS guidance,
Boateng et al. and the official Testing Standards access page; King/DeCicco and
van Laar bibliographic metadata were checked, not their complete scoring manuals
or full texts. Consult [References and source-use record](docs/REFERENCES.md) for
direct source links, review status, how each source informed changes, and model
card references. None supplies psychological ground-truth labels for this app.

1. Ajzen, I. (1991). The theory of planned behavior. *Organizational Behavior and Human Decision Processes*, 50(2), 179–211.
2. Becker, G. S. (1993). *Human capital: A theoretical and empirical analysis.* University of Chicago Press.
3. Chen, L., & Ifenthaler, D. (2023). Digital entrepreneurship competence: A systematic review. *The International Journal of Management Education*, 21(3), 100894.
4. Hair, J. F., Hult, G. T. M., Ringle, C. M., & Sarstedt, M. (2022). *A primer on partial least squares structural equation modeling (PLS-SEM)* (3rd ed.). Sage.
5. Kale, R. et al. (2024). Integrating 4QS Factors to Enhance Learning Quality Using Machine Learning. *IEEE IDICAIEI*.
6. Kolb, D. A. (1984). *Experiential learning: Experience as the source of learning and development.* Prentice-Hall.
7. Nanade, S. & Dash, D. (2026). Reframing Entrepreneurial Competency Assessment in the Digital Age: A 5Qs+ Framework Integrating Digital Intelligence and Experiential Learning. *Higher Education, Skills and Work-Based Learning* (Special Issue).
8. Nanade, S., Anne, K.R., Dash, D., & Rizvi, A.H. (2026). 4Qs-driven metrics for educational excellence. *Academy of Marketing Studies Journal*, 30(2), 1–11.
9. Nanade, S., Dash, D., Rizvi, A.H., & Kumar, A. (2026). Integrating AI Ethics and Bias Awareness into Undergraduate Engineering Education. *Journal of Engineering Education Transformations (JEET)*, 68–78.
10. Nanade, S., Dash, D., & Rizvi, A.H. (2026). Enhancing Learning Outcomes in VR/AR and Robotics Programming Courses Using Real-Time Adaptive Feedback. *JEET*, 60–67.
11. Nanade, S. & Sharma, C. (2025). Leveraging Mechatronics and AI-Driven Experiential Learning. In *AI-Driven Mechatronics in Modern Engineering*, Springer.
12. Nanade, S. & Nanade, A. (2023). IoT and Education: Connecting Devices, Connecting Minds. *Journal of Namibian Studies*, 33(S3), 2197–5523.
13. Nanade, S., Lal, S., & Nanade, A. (2021). 4QS Predictive Model Based on Machine Learning. In *Technology and Tools in Engineering Education*, CRC Press.
14. Nanade, S., Lal, S., Goswami, S., & Sharma, A. (2020). 4QS model to assess the quotient skills of the students through real-time learning. *Int. Journal of Advanced Science and Technology (IJAST)*.
15. OECD. (2023). *Digital education outlook 2023.*
16. Stoltz, P. G. (1997). *Adversity quotient: Turning obstacles into opportunities.* John Wiley & Sons.
17. van Laar, E., van Deursen, A. J. A. M., van Dijk, J. A. G. M., & de Haan, J. (2017). The relation between 21st-century skills and digital skills: A systematic literature review. *Computers in Human Behavior*, 72, 577–588. [doi:10.1016/j.chb.2017.03.010](https://doi.org/10.1016/j.chb.2017.03.010).
18. Zohar, D., & Marshall, I. (2000). *SQ: Spiritual intelligence, the ultimate intelligence.* Bloomsbury.
19. Cohen, S., Kamarck, T., & Mermelstein, R. (1983). A global measure of perceived stress. *Journal of Health and Social Behavior*, 24, 385–396. Referenced by the consulted [CMU PSS items, scoring and limitations guidance](docs/REFERENCES.md#pss-guidance); analyses not independently reproduced here.
20. Boateng, G. O., Neilands, T. B., Frongillo, E. A., Melgar-Quiñonez, H. R., & Young, S. L. (2018). Best practices for developing and validating scales for health, social, and behavioral research: A primer. *Frontiers in Public Health*, 6, 149. [doi:10.3389/fpubh.2018.00149](https://doi.org/10.3389/fpubh.2018.00149).
21. American Educational Research Association, American Psychological Association, & National Council on Measurement in Education. (2014). *Standards for educational and psychological testing*. AERA. [Official open-access editions](https://www.testingstandards.net/open-access-files.html).
22. King, D. B., & DeCicco, T. L. (2009). A viable model and self-report measure of spiritual intelligence. *International Journal of Transpersonal Studies*, 28(1), 68–85. [doi:10.24972/ijts.2009.28.1.68](https://doi.org/10.24972/ijts.2009.28.1.68).

### Evaluation and developer documentation

| Document | Contents |
|---|---|
| [Benchmarks](docs/BENCHMARKS.md) | V1–V4 evidence links, all 18 new configurations, failures, overlap, timing limits and exact reproduction controls |
| [Tests](docs/TESTING.md) | All five test files / 41 tests, CI scope, real-model versus mocked checks, browser check record and commands |
| [Research boundaries](docs/RESEARCH_VALIDATION.md) | Adaptive-round protocol and requirements before participant research |
| [Source review](docs/PSYCHOLOGY_SCORING_REVIEW.md) | Source-to-change reasoning and unresolved item/key issues |
| [Pull request draft](PULL_REQUEST.md) | Copyable title, changes, benchmark evidence, references and validation |

---

## License

This work is licensed under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/).
Models and runtime dependencies retain their separate licences; see [model notices](MODEL_LICENSES.md) and the included [Apache-2.0 text](licenses/Apache-2.0.txt). Confirm rights-holder permission to distribute a modified instrument; this update does not change its NoDerivatives terms.

**Citation:**
```
Nanade, S. & Dash, D. (2026). Reframing Entrepreneurial Competency Assessment
in the Digital Age: A 5Qs+ Framework Integrating Digital Intelligence and
Experiential Learning. Higher Education, Skills and Work-Based Learning.
```

---

*© 2026 Nanade & Dash. All rights reserved under CC BY-NC-ND 4.0.*
