# Add Pages-ready local Laya scoring, benchmarks and research safeguards

## Summary

- Retain the original navy/teal design, result-card markup, chart styling,
  question banks, demographics form, sampling and timer flow. `styles.css`,
  `questions/` and the instrument `LICENSE` are unchanged from `origin/main`.
- Move results orchestration/rendering, storage, optional Sheets submission,
  configuration and shared ONNX infrastructure into focused ES modules. The
  large deletion in `results.html` is inline JavaScript relocation, not removal
  of the original result cards.
- Keep one resident model worker across assessment modules without a permanent
  outer banner. Add an accessible, compact preparation/retry notice that hides
  during questions once ready, plus local audit-record export. Matching saved
  results can be reviewed without downloading/initialising the model again.
- Add `benchmarks.html` with opt-in GPU/CPU checks, recorded comparisons, progress,
  cancellation, model reuse and JSON report export. It never reads participant
  records or submits to Sheets; browsing saved reports does not load a model.
- Keep model revisions, prompts, typed rubrics and inference properties editable
  in `scoring.yaml`, with strict encoding and no cloud/rule-based score fallback.
- Cleanup review: remove legacy Julia helper re-exports, unused exports/return
  fields, a write-only submission flag, stale test stubs and a no-op CSS rule.
  Consolidate benchmark bank-loading/sweep code; reject unknown commands before
  model loading and load experiment definitions before creating an engine. Fix
  the simulator's unreachable AQ branch and redundant stress resampling. Retain
  frozen profiles, fixtures, reports and the old smoke-page redirect for reproduction.

## Laya tuning and research boundaries

The selected V4 recipe compares independent nominal option/category identities.
The model still assigns each point decision; no correctness flag or rule-based
score override is supplied. Instructions explicitly preserve self-reports and
prohibit double reversal or judging what a participant should have selected.
It remains single-pass. Longer literature/context prompts were measured rather
than assumed to improve this small decision model.
The new work compares **18 configurations across V3/V4**; the earlier V1/V2
experiments are retained separately, not counted as new runs.

| Check | Result |
|---|---:|
| Exposed bank v1 | 695/718 (96.8%) |
| Exposed bank v2 | 711/718 (99.0%) |
| Exposed bank v4 | **718/718** |
| V4 exposed development (bank + V2/V3 probes) | **986/986** |
| V3 frozen probes (failure retained) | **170/180** |
| V4 separately frozen probes | **412/414 (99.5%)** |
| V4 novel scale cases | **250/250** |
| V4 cases with genuinely new canonical inputs | **100/102** (32/33 distinct inputs) |
| V4 GPU/CPU bank point-decision agreement | **718/718** |

The bank has been inspected and used for tuning; it is **not an unseen test**.
Its 718 V4 cases contain only **31 distinct model inputs** (43 cached scoring
requests); development and V4 probes have 48 and 64 distinct inputs. Two V4 probe
failures share one nominal identifier comparison at a 20-option item. These are
technical coding experiments, not psychological accuracy, calibrated probabilities
or a clinical diagnosis. V4 deliberately uses the failed V3 probes as exposed
development data; both adaptive rounds are retained and disclosed. No post-V4-probe
tuning is applied. Research submission stays disabled by default.
Of V4's 64 canonical probe inputs, 31 overlap development; the 414 fixture cases
are not 414 independent or entirely unseen inputs. Novel scale wording is removed
by the nominal representation, so this does not establish semantic generalisation.

The targeted source review flags probable IQ key errors, ambiguous AQ keys and
nonstandard PSS administration/scoring. Matching those keys does not validate
them. Unsupported stress severity cut-offs are removed, with the CMU PSS guidance
cited. The question banks remain unchanged pending rights-holder/expert review.
Fine-tuning prerequisites are documented; no literature corpus or participant
records have been used for training and no fine-tuning job has run.

### Evidence and reproduction

- Recorded results: [V1 Julia/Laya](tests/model-evaluation-2026-10-15.json),
  [V2](tests/model-evaluation-v2.json), [V3 including the failed probes](tests/model-evaluation-v3.json),
  [V4 including overlap and both remaining failures](tests/model-evaluation-v4.json).
- [Benchmark guide](docs/BENCHMARKS.md): all new candidate results, effective
  recipe/profile sources, denominator definitions, timing limits and exact UI/
  console reproduction steps. V4's GPU bank result is a subset of its development
  execution; CPU was a separate run, not a second independent GPU measurement.
- [Testing guide](docs/TESTING.md): five test files, 41 tests, CI scope and the
  distinction between mocked tests, historical UI checks and real-model execution.
- [Research protocol](docs/RESEARCH_VALIDATION.md),
  [item/key audit](docs/PSYCHOLOGY_SCORING_REVIEW.md), and
  [conditional fine-tuning prerequisites](docs/FINETUNING_PLAN.md).

## References used in this update

- **CMU / Cohen's laboratory:** [PSS-10 form](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pss.html),
  [scoring](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pssscoring.html),
  [limitations and permissions](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html).
  Guidance read; informs the PSS-10 mismatch warning and removal of invented cut-offs.
- **Boateng et al. (2018):** [Best practices for developing and validating scales](https://doi.org/10.3389/fpubh.2018.00149).
  Full text read; informs content review, faithful coding and independent validation requirements.
- **AERA/APA/NCME (2014):** [Standards for Educational and Psychological Testing](https://www.testingstandards.net/open-access-files.html).
  Official access/publication page checked; the complete volume was not reviewed.
- **King & DeCicco (2009):** [Spiritual intelligence measure](https://doi.org/10.24972/ijts.2009.28.1.68),
  and **van Laar et al. (2017):** [Digital skills systematic review](https://doi.org/10.1016/j.chb.2017.03.010).
  Metadata verified only; these do not validate the app's SQ/DQ items or scoring.
- Laya typed-decisions, the pinned community Q4 conversion, and Julia's official
  ONNX/WASM export are credited in the [technical source references](docs/REFERENCES.md#technical-model-references)
  and [model licences](MODEL_LICENSES.md).

The [full bibliography and source-use record](docs/REFERENCES.md) distinguish
sources actually consulted from inherited framework citations. None establishes
psychological ground truth for these fixtures, and no source text was used to train a model.

## GitHub Pages and licensing

- Static branch/root deployment remains supported, including project subpaths.
  `.nojekyll` preserves the assets. No production build, API key, inference backend
  or custom COOP/COEP headers are required; CPU fallback uses single-threaded WASM.
- Model weights stay outside the repository and download from revision-pinned
  Hugging Face URLs. Inference evidence never leaves the browser. Optional
  research sync retains the original Sheets endpoint and adds provenance columns;
  redeploy `google-apps-script.js` before enabling that option.
- Include Laya/Convai Innovations and conversion-author attribution, optional
  Julia/Supersonic Labs attribution, runtime notices and the full Apache-2.0 text.
  Provide a readable `model-licenses.html` page and `MODEL_LICENSES.md`.
- The instrument's **CC BY-NC-ND 4.0** licence is unchanged. Confirm rights-holder
  permission to distribute the modified instrument; Apache model licences do not
  override its NoDerivatives terms.

## Validation

- `npm test`: **41 passing tests**, including YAML/recipe validation, all question
  alternatives, inference-order remapping, GPU→CPU fallback, cache invalidation,
  original-view rendering, disabled submission, header migration, module syntax,
  local static links and separation of benchmark truth from production scoring.
  Cleanup regressions cover benchmark dispatch/definitions/queue/retries, simulator
  branch/displayed-scale handling, and submission fingerprint deduplication without
  the obsolete flag. These use mocked inference/network, not new model measurements.
- Real browser WebGPU V3/V4 sweeps and frozen probes, with failed experiments
  retained. The active V4 recipe also matches 718/718 bank cases on CPU/WASM,
  with 718/718 identical point decisions to WebGPU. Novel V4 probes were measured
  on GPU only. Timings are single-browser observations, not a general latency promise.
- Browser checks for the assessment/results flow, local saved-result review,
  benchmark opt-in, desktop/390px layout, and project-style paths under
  `/5QS-Plus-Assessment/` without cross-origin isolation.
- The historical benchmark-page smoke check scored 24/24 on WebGPU using **V2**,
  not an additional V4 run. Export/cancellation controls were exercised. The final
  V4 page check displayed every recorded round without downloading model assets.
- `git diff --check` and `npm audit --audit-level=moderate` pass. The npm audit
  covers the installed development dependency tree, not the remote model files.
