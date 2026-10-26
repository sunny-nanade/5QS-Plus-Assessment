# Evaluation and publication boundaries

## What the reported numbers mean

These experiments compare model-assigned **item points** with the existing
deterministic scoring rubric. They do not measure entrepreneurial competency,
clinical stress, participant outcomes, construct validity, fairness or reliability.
No real participant records are used by the benchmark page.

The original 24-case synthetic set selected the first prompt recipe. All 718
question-bank/option cases were subsequently inspected. That bank is now an
**exposed regression/calibration set**, not a held-out test. Repeated scale
responses produce identical requests; case count is not independent sample size.

## V2 protocol (2026-10-15)

1. Freeze the initial Laya report-phrase recipe in `tests/laya-tuning-baseline.yaml`.
2. Define seven candidates in `tests/laya-tuning.yaml`: kind-specific state,
   reverse/cyclic candidate-order averaging, and literal character/JSON prompts.
3. Compare on the fixed 50-case synthetic calibration set and the exposed bank.
4. Select the single-pass kind-specific recipe: 711/718 bank cases (99.0%), versus
   the v1 recipe's 695/718 (96.8%). All 570 Likert cases now agree. Reverse averaging
   ties at 711/718 but doubles calls, so it is not selected.
5. Freeze the recipe before evaluating the novel probe generator in
   `tests/scoring-fixtures.js` (seed 20261015, 88 cases). It matched 87/88 (98.9%).
   The remaining error is a reverse-scored “Not once” frequency response. **No
   same-round retuning followed this probe result.** Later user-requested V3/V4
   rounds explicitly treat previous probes as exposed. This is a workflow freeze, not an external
   preregistration or a human validation study.
   The 88 cases have 64 distinct model inputs (88 cached scoring requests when
   different point mappings are included). The 50 calibration cases have 42
   distinct model inputs. None of these counts establishes independent samples.
6. Record full recipe/input hashes, distinct requests, inference calls, all
   failures and backend in `tests/model-evaluation-v2.json` and exported raw runs.
   Keep the original `tests/model-evaluation-2026-10-15.json` for comparison.
7. Run that frozen V2 recipe on real CPU/WASM: 711/718 bank matches and
   718/718 identical point assignments to WebGPU. The single-threaded bank run
   took approximately 6.5 minutes after initialization for 176 distinct requests;
   this is a one-browser observation, not a hardware-independent latency claim.

The seven V2 bank mismatches were MCQ answer comparisons (three IQ, four AQ).
Semantic similarity is not literal answer-key equality. Do not silently override
those model outputs with the reference scorer to report 100% “model accuracy.”
No confidence threshold or temperature was fitted to those novel probe outcomes.
Probabilities remain uncalibrated for this application.

## Subsequent literature-guided rounds

The targeted [psychology source review](PSYCHOLOGY_SCORING_REVIEW.md) identified
probable IQ key defects, ambiguous AQ coding and nonstandard PSS administration/
scoring. Those findings are **separate from** model/key agreement; the existing
question banks remain unchanged for comparability. Unsupported stress severity
cut-offs are removed from the results display.

V3 compares twelve fixed candidates in `tests/literature-prompts.yaml` against
the exposed bank, using the frozen V2 recipe as a base. Short nominal option
comparisons match 718/718 bank cases but compress them to **46 distinct model
inputs** (58 cached scoring requests). The model receives independent keyed and
selected option identifiers, not a precomputed correct/incorrect flag. It is
doing identity coding, not interpreting a participant's psychology.

The V3 recipe was frozen before the new 180-case probes (hash locked in the tests).
It matched **170/180**: 140/140 MCQs, but only 30/40 novel Likert/frequency cases.
This failed generalisation result is preserved in `tests/model-evaluation-v3.json`.
Adding longer clinical/measurement instructions did not reliably help: the
principles-based global prompt matched 704/718, versus 711/718 for V2.

V4 explicitly converts the bank and V2/V3 probes into a **986-case exposed
development set**. Six candidates in `tests/category-prompts.yaml` test independent
category identifiers and explicitly mapped reverse-coded point candidates.
The separate 414-case V4 probe generator is fixed before that sweep; previous
V3 results must not be relabelled as unseen confirmation of V4. Report both
adaptive rounds and their failures, rather than choosing only the best round.

The selected **category-manual** recipe matches 986/986 development cases and
**412/414 (99.5%)** V4 probes, including 250/250 scale cases. Two failed MCQ cases
share the same canonical `N`/`N` identifier comparison at position 14 in a 20-option
item; both failures are retained, with no post-probe tuning. The current bank's
four-option MCQs all match its key. The bank subset matches 718/718 in the GPU
development execution, but represents only **31 distinct model inputs** (43
cached point-mapping requests). Development and V4 probes have 48 and 64 distinct
model inputs respectively. These counts are not independent psychological samples.
Nominal encoding also causes **development/probe input overlap**: 31 of V4's 64
canonical inputs already occur in development. Of 414 cases, 312 use seen inputs;
the remaining **102 cases use 33 new inputs and match 100/102** (32/33 distinct
new input decisions). All 250 novel-worded scale cases map to already-seen
category-ID inputs. Thus 412/414 must not be described as 414 independent or
entirely unseen model-input examples, nor as semantic generalisation to new scales.

The recipe uses the explicit instruction: “Preserve the recorded self-report.
The candidates already encode reverse scoring; do not reverse twice or judge
what the participant should have selected.” This is an operational application
of measurement fidelity, not a substitute for an approved instrument manual.
The full V4 comparisons and failures are in `tests/model-evaluation-v4.json`.
The active recipe was then executed on real CPU/WASM: 718/718 bank matches and
718/718 identical point decisions to the GPU bank subset. The observed inference
time was 131805 ms for 43 cached scoring requests after initialization; this is
not an independent hardware benchmark. V4's larger novel suite was measured on
WebGPU only; do not extrapolate the bank parity claim to unmeasured cases.

No psychological-validation accuracy can be estimated without independently
adjudicated labels and suitable participant data. Perfect coding does not resolve
the instrument defects. Fine-tuning is conditional on the data/rights/validation
requirements in [FINETUNING_PLAN.md](FINETUNING_PLAN.md), not on scraping literature
or treating model-generated opinions as psychological ground truth.

## Reproduce in the browser

Open `benchmarks.html` on GitHub Pages or localhost. Inspect recorded comparisons
without downloading anything. Opt in to run a model, choose a device and suite,
and export its JSON. The [benchmark guide](BENCHMARKS.md) provides evidence-file
links, all candidate counts, and the exact frozen configuration/suite combinations
for each round; do not use the current V4 config to reproduce V2/V3 measurements.
Historical Laya/Julia baselines and the original prompt variants are retained.

The same request-building and inference path runs in the app and benchmarks.
Only `tests/` contains the reference point function. Model downloads are cached
best-effort; input de-duplication is reported, not hidden. CPU and WebGPU checks
are separate real executions; mocked fallback tests alone do not prove parity.
See [TESTING.md](TESTING.md) for the 41-test coverage map and the boundary between
automated checks, historical browser/UI checks and real-model observations.
The consulted sources and review depth are recorded in [REFERENCES.md](REFERENCES.md).

## Before publishing participant results

- Obtain rights-holder permission for the modified instrument (the original
  licence is CC BY-NC-ND 4.0), plus the applicable institutional ethics approvals.
- Freeze model revision, quantisation, tokenizer, prompts, decoding, aggregation
  and software versions **before** independent participant/domain validation.
- Use a new, genuinely independent evaluation set, with adjudicated labels where
  applicable. Group repeated response patterns; do not inflate sample size by
  counting identical model inputs as independent cases.
- Predefine tolerances and analysis, including reverse-coded items, partial/skipped
  tests, test–retest stability, subgroup fairness and agreement with the established
  instrument. Model/rubric agreement alone does not establish these properties.
- Report every failure, exclusions, denominators, distributions, backend, memory,
  model-loading cost and inference time; distinguish warm-cache from cold starts.
- Validate any probability calibration on separate data. Do not infer clinical
  diagnoses or make consequential participant decisions from these scores.

Research submission remains disabled. It is not automatically enabled by a good
benchmark score, and the PR must not advertise this model as publication-validated.
