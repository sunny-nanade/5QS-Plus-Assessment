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

---

## Architecture

```
5QS-Plus-App/
├── index.html          # Landing page with framework overview & consent
├── info.html           # Participant demographics form
├── test.html           # Assessment engine (stratified sampling, auto-advance)
├── results.html        # 6-axis radar chart, composite breakdowns, Google Sheets sync
├── thank-you.html      # Completion & redirect
├── styles.css          # Responsive UI with print support
└── questions/
    ├── iq.json         # 31 MCQ items
    ├── eq.json         # 25 Likert items, 5 composites
    ├── aq.json         # 25 items (mixed MCQ + Likert), 4 CORE subscales
    ├── sq.json         # 25 Likert items, 4 subscales
    ├── dq.json         # 30 Likert items, 4 sub-dimensions (NEW)
    └── stress.json     # 15 frequency-scale items
```

**Stack**: Static HTML5 / CSS3 / Vanilla JavaScript · Chart.js v4.4.4 · GitHub Pages  
**Data capture**: Google Sheets via Apps Script endpoint (no server required)

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

- **Stratified random sampling**: Questions grouped by subscale/composite, then balanced random subsets selected per group — maintains construct validity while reducing respondent fatigue.
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
# or
npx serve .
```

Open `http://localhost:8000` in Chrome/Edge.

> **Note:** The Google Sheets endpoint requires HTTPS (GitHub Pages) to function. Local testing will show a sync warning — this is expected.

---

## Deployment

Push to the `main` branch of `sunny-nanade/5QS-Plus-Assessment`. Enable **GitHub Pages** (Settings → Pages → Source: main branch, root folder). The site will be available at:

```
https://sunny-nanade.github.io/5QS-Plus-Assessment/
```

---

## Scoring Method

| Test | Format | Scoring |
|------|--------|---------|
| IQ | MCQ | Correct = 1, Incorrect = 0; scaled to % |
| EQ, SQ, DQ, Stress | Likert 1–5 | Sum per composite / max possible → % |
| AQ | Mixed | MCQ items: Correct = 5, Incorrect = 1; Likert items: standard 1–5 with reverse scoring |

**5QS+ Composite Score** = mean(IQ%, EQ%, AQ%, SQ%, DQ%). Stress is reported separately as a moderating variable.

---

## References

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
17. van Laar, E., van Deursen, A. J., van Dijk, J. A., & de Haan, J. (2017). The relation between 21st-century skills and digital skills. *Computers in Human Behavior*, 72, 577–588.
18. Zohar, D., & Marshall, I. (2000). *SQ: Spiritual intelligence, the ultimate intelligence.* Bloomsbury.

---

## License

This work is licensed under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/).

**Citation:**
```
Nanade, S. & Dash, D. (2026). Reframing Entrepreneurial Competency Assessment
in the Digital Age: A 5Qs+ Framework Integrating Digital Intelligence and
Experiential Learning. Higher Education, Skills and Work-Based Learning.
```

---

*© 2026 Nanade & Dash. All rights reserved under CC BY-NC-ND 4.0.*
