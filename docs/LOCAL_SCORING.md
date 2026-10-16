# Local scoring and GitHub Pages deployment

## Static hosting

Push the repository to GitHub and enable **Pages → Deploy from a branch → main,
root**. `.nojekyll` keeps the static ES modules, YAML and fixture assets intact.
No build, Node/Python server, API key, secret, COOP/COEP headers or cloud inference
is required in production. All application links/worker/config URLs are relative,
including project sites such as `/5QS-Plus-Assessment/`.

Model assets are downloaded from revision-pinned Hugging Face URLs, not committed
to the repository. The active Laya graph/tokenizer total about 453 MB, plus runtime
libraries and substantially more working memory. Cache Storage is best-effort.
Use HTTPS or localhost, not `file://`. Download, warmup or inference can still cause
a wait at the end; zero downtime is not guaranteed.

## Configuration

Edit `scoring.yaml`, then reload the outer assessment page. Every byte of the YAML
contributes to its SHA-256 provenance identifier. Do not change a recipe midway
through a research cohort.

- `model.id`, `revision`, `adapter`, `encoding`, `files`: select a compatible model.
  `laya-js` uses the typed-decisions Q4 graph and JSON tokenizer/config;
  `julia-wasm` uses the Julia graph/external weights and its matching official WASM
  encoder. A masked-language model, arbitrary ONNX file or GGUF is not a drop-in.
- Optional `model.base_url` overrides the Hugging Face base for self-hosting.
- `runtime.preferred_device`: `webgpu` or `wasm`. Unavailable/failed GPU execution
  falls back to the **same model** on local CPU if `cpu_fallback` is true. WASM
  uses one worker thread and does not require GitHub Pages response-header control.
- `runtime.max_length`, `head_length`: token budgets. Strict encoding rejects
  overflow instead of silently discarding evidence. Candidates are capped at 48
  tokens. The adapters accept 2–20 candidates.
- `runtime.decision_ensemble`: `none`, `reverse`, or `cyclic`. Choice-only order
  averaging remaps probabilities back to the original candidates. It increases
  inference cost; ordinal/Boolean positions are never permuted. The selected
  V2 single-pass recipe performed as well as reverse averaging on the exposed bank;
  this is not a measured V4 ensemble comparison.
  `decision_temperature` affects averaging, not the single-pass argmax. It is not
  fitted calibration and must not be presented as such.
- `prompts.instructions`, `state`: global templates. Optional `dimensions`
  overrides add per-test instructions/state. Optional `kinds.iq/mcq/likert` state
  overrides take precedence, preventing AQ's MCQ reference from contaminating a
  Likert request. Instructions are composed global → dimension → kind → rubric.
- `rubrics.iq/mcq/likert`: typed `choice`, `score`, or binary `noul`, candidate
  descriptions and point values. IQ is binary 0/1; other rubrics span 1–5. Candidate
  text is passed verbatim, including any desired `level 0:` / `false:` labels.
- `submission.enabled` remains **false**. Enabling it requires a validated research
  protocol and redeployment of `google-apps-script.js` for the audit columns.

Template variables: `dimension`, `subscale`, `question`, `response`, `answer`,
`response_text`, `answer_text`, `scale`, `reverse`, and `point_1_response` through
`point_5_response`. `response`/`answer` are JSON-quoted; the `_text` versions are
unquoted. Point candidates already account for reversing the scale. Optional
`response_characters`/`answer_characters` expose independently normalised character
arrays for experiments; no response/key equality flag is computed by the app.
`response_slot` and `response_position` independently identify the selected displayed
category as a letter or 1-based number; MCQ `answer_slot`/`answer_position` identify
the key independently. `options` exposes displayed MCQ alternatives. For scales,
`point_1_slot`…`point_5_slot` (and `_position`) identify the category associated
with each candidate point **after** configured reversal. None is a precomputed
correct/incorrect decision. The final V4 recipe compares nominal identities,
preserves self-report and explicitly prohibits double reversal. The model is not
being asked to infer psychological meaning or clinical severity from those IDs.
Demographics are intentionally unavailable to inference templates.

YAML is trusted application configuration and can select executable adapter code.
Never accept it as a participant upload. Additional architectures need a same-origin
adapter exporting `createEngine(model, runtime, report)` returning `device` and
`logits(row)`, plus explicit encoding validation. `row` has `state`, `question`,
`type`, `options`. One finite logit per candidate is required, not vocabulary logits.

## Module boundaries and upstream compatibility

- `assessment.html` and `js/assessment-shell.js`: persistent, visually transparent
  host; retains one dedicated worker across the original page transitions.
- `js/scoring-client.js`: the small hook in info/test/results; accessible inline
  preparation status that hides when ready during questions, plus restart/retry.
- `scoring-config.js`, `scoring-core.js`, `decision-runner.js`: configuration,
  evidence-only request building, inference decisions and point aggregation.
- `onnx-runtime.js`: shared downloads, cache, tensors and GPU→CPU session fallback.
  `laya-engine.js` / `julia-engine.js` contain only model-specific adapters.
- `result-cache.js`: restores matching, structurally checked model decisions on
  a direct result review without downloading or initialising the model again.
  Both config and exact evidence hashes must match; changed/corrupt records are
  rescored. These are local convenience checks, not a server-side authenticity proof.
- `results-view.js`, `results-controller.js`, `sheets-client.js`, `session-store.js`:
  original presentation, orchestration, optional sync and browser records.
- `benchmarks.html` / `js/benchmarks.js` / `tests/`: separate researcher-only tools;
  production scoring never imports fixture truth or substitutes rule-based points.

The original palette, `styles.css`, question banks, forms and assessment flow are
retained. Results inline logic is moved into modules; its original card markup,
chart colours and breakdowns remain. New styles are opt-in in `local-scoring.css`.

## Data and audit records

Responses and full item-level model records stay in localStorage for retries and
local export. Beginning another assessment clears participant records, but not
cached model files. Clear browser site data to remove both. Downloads disclose
ordinary network metadata to asset hosts, but no questionnaire evidence is sent
for inference. Optional Sheets sync sends demographics, summaries and provenance,
not model inference requests. Its existing `no-cors` transport can report **sent**,
not confirmed; raw local records are not deleted on an opaque response.

Keep model revision, recipe/config hash, backend, rubric version and participant
snapshot together for reproducibility. Do not mix experimental model scores with
historical fixed-rule scores without validation. See [research protocol](RESEARCH_VALIDATION.md)
and [model licences](../MODEL_LICENSES.md).

## Local checks

```sh
npm ci
npm test
npm run serve
# Optional Pages-style project subpath, on a separate local port:
npm run serve -- --port=9092 --base=/5QS-Plus-Assessment/
```

Open `benchmarks.html` to inspect saved reports without downloading a model.
Inference starts only after an explicit benchmark opt-in. CPU regression runs can
take several minutes. The page supports cancellation, model reuse and JSON export.

See [BENCHMARKS.md](BENCHMARKS.md) for the frozen configuration/suite combinations,
historical failure records and exact reproduction calls, [TESTING.md](TESTING.md)
for automated/manual coverage, and [REFERENCES.md](REFERENCES.md) for source use.
