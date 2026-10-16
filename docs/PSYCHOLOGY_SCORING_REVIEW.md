# Psychology-informed scoring review (2026-10-15)

This is a targeted source review and software/instrument audit, **not** a systematic
review, a clinician's assessment, an expert-panel adjudication or a validation
study. No human psychological accuracy percentage can be calculated from the
current fixtures. All candidate/model results must be labelled **coding agreement**.

## Sources actually checked

Full bibliographic references, technical model sources, review depth and use of
each source are consolidated in [REFERENCES.md](REFERENCES.md). The summaries
below distinguish consulted guidance/full text from metadata-only checks.

1. **Cohen's CMU laboratory, PSS-10 and scoring guidance**:
   [items](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pss.html),
   [scoring](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pssscoring.html),
   [limitations and permissions](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html).
   The official form has ten fixed items scored 0–4, with positive items 4, 5, 7
   and 8 reversed, then summed. The lab explicitly says it is not diagnostic and
   there are no score cut-offs. Permission requests are directed to MAPI/ePROVIDE.
2. **Boateng et al. (2018)**, *Best Practices for Developing and Validating Scales
   for Health, Social, and Behavioral Research: A Primer*, Frontiers in Public
   Health 6:149, [doi:10.3389/fpubh.2018.00149](https://pmc.ncbi.nlm.nih.gov/articles/PMC6004510/).
   Full text checked. Relevant principles: explicit construct definition,
   independent expert/target-population content review, unambiguous items and
   ordered response anchors, cognitive interviews, dimensionality, reliability,
   validity, and separate samples for development and confirmation. This does
   not supply response-level labels for this application's AQ/EQ/SQ/DQ items.
3. **AERA/APA/NCME (2014)**, *Standards for Educational and Psychological Testing*:
   [official open-access edition](https://www.testingstandards.net/open-access-files.html).
   Reference for the required validation programme; no claim is made that every
   chapter was reviewed or that following a prompt establishes compliance.
4. **King & DeCicco (2009)**, *A Viable Model and Self-Report Measure of Spiritual
   Intelligence*, [doi:10.24972/ijts.2009.28.1.68](https://doi.org/10.24972/ijts.2009.28.1.68).
   Bibliographic metadata verified, **not** a completed item-by-item manual review.
5. **van Laar et al. (2017)**, *The relation between 21st-century skills and digital
   skills: A systematic literature review*,
   [doi:10.1016/j.chb.2017.03.010](https://doi.org/10.1016/j.chb.2017.03.010).
   Bibliographic metadata verified. A conceptual citation alone does not validate
   this project's DQ items, weights or cut-offs. No paid full text was ingested.

The EQ-i, CORE/AQ, and SISRI scoring manuals have **not** been fully verified here.
Do not claim their proprietary/validated scoring has been reproduced. No literature
corpus, test manual or participant data was used to train Laya or Julia. The local
scoring experiments use short original instructions derived from the measurement
principles above, not a corpus of paper text or proprietary manual extracts.

## What Laya should and should not do

- Preserve the participant's recorded selection. A self-report is not an exam
  answer: never substitute a more desirable coping behaviour, religious belief,
  emotional response or digital habit.
- Apply the explicitly supplied coding key consistently. For an MCQ, compare
  nominal option identity; do not turn semantic similarity into credit or silently
  repair the key. Disputed keys are a separate instrument-review problem.
- For a Likert/frequency item, select the exact recorded category using the
  supplied candidate-to-point mapping. Reverse coding is already represented in
  that mapping; do not reverse twice or infer reversal from wording again.
- Do not infer clinical severity, normed IQ, latent traits, entrepreneurial
  readiness or a diagnosis from one item or an unvalidated composite.
- No demographic/protected-attribute evidence is supplied to scoring. This is
  not evidence of subgroup fairness; that requires appropriately designed data.

These are **operational constraints**, not a request for the model to impersonate
a psychologist. Long literature prose can introduce unwanted interpretation and
degrade a small decision model. V3 therefore compares short manual-fidelity
instructions, contextual text, literal-label comparison, nominal identifiers,
and a longer principles-based prompt. Their results are measured, not assumed.

## Instrument issues needing rights-holder/expert review

| Location | Finding | Consequence / action |
|---|---|---|
| `questions/stress.json`, `test.html` | 15 adapted items, ten sampled; changed wording/anchors and application 1–5 percentage, not the fixed PSS-10 0–4 sum. Sampling may omit positive items. | Do not call this score a validated PSS-10 or apply PSS norms. A repaired official form needs permission and a separately versioned protocol, not a prompt change. |
| Original stress display bands | Arbitrary 25/50/75 boundaries label “Low/High/Very High.” CMU says there are no diagnostic cut-offs. | Remove those stress severity labels; show an unvalidated experimental index and no cut-off. |
| `questions/iq.json`, day-before-yesterday item | On Friday, the day after Wednesday is Thursday; stored key is Wednesday. | Flag a probable key error; do not alter historical labels silently. |
| IQ zebra/horse/donkey syllogism | “Some Horses are Donkeys” entails “Some Donkeys are Horses”; that option exists, while the stored key is “Cannot be determined.” | Flag a probable key error. Matching that key is not reasoning accuracy. |
| IQ `PETAL → PLATE`, `52641` | The stated letter permutation maps to `51462`, which is absent from the offered choices. | Item has no matching literal-permutation answer; expert review is required. |
| IQ `POST → STOP`, `4721` | The stated permutation maps to `2174`, absent from the offered choices; the stored key is `1742`. | Flag a probable item/key error. |
| IQ “Opposite of False” | “True” is keyed, “Right” also offered. | Review distractor ambiguity; do not use model agreement to adjudicate vocabulary validity. |
| AQ MCQs | “Try new strategies,” “Ask for help,” “Look for solutions” all receive minimum points unless they equal the single key. | Adaptive alternatives need expert content adjudication; literature reviewed here does not justify assigning all of them 1/5. |
| AQ “tough situations” scale | “Are punishment … Can help me grow … Define who I am” is treated as an increasing 1–5 continuum. | Ordinality/content is not established; expert and cognitive-interview review is needed. |
| EQ/SQ/DQ and overall composite | Source-family citations, equal subscale weights, percentages and display bands are not a validation of these sampled/adapted items. | Require item/manual mapping, construct review, appropriate participant data, factor/reliability/fairness analyses and justified interpretation. |

The application's non-IQ percentages use points divided by maximum points; a
fully answered all-minimum 1–5 scale therefore yields 20%, not 0%. These are not
percentiles, standard scores or normed quotients. Missing/skipped-item handling
and the arithmetic composite also need a prespecified, validated analysis plan.

The original question banks and scoring targets are deliberately **unchanged**.
The audit is not a new “gold standard.” An independent panel must adjudicate
changes, resolve alternate answers, approve permissions and version the instrument
before reporting literature-based measurement accuracy. Submission remains off.

## Fine-tuning decision

First test bounded, recorded prompt candidates and freeze a winner before new
probes. Stop interpreting regression gains as psychological evidence. If coding
still fails materially, follow [the fine-tuning protocol](FINETUNING_PLAN.md).
Even 100% bank agreement would not resolve the issues above or validate the test.
