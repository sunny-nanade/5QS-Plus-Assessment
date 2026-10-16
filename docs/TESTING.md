# Tests and validation record

## Automated checks

From the repository root, with Node.js 22+:

```sh
npm ci
npm test
git diff --check
npm audit --audit-level=moderate
```

The recorded suite has **41 passing tests** across five files. `npm test` uses
Node's test runner and fixtures/mocked browser or ONNX interfaces; it **does not
download model weights or run real WebGPU/WASM inference**. Browser model runs
are a separate evidence tier, documented in [BENCHMARKS.md](BENCHMARKS.md).

| Test file | Tests | Main coverage |
|---|---:|---|
| [scoring.test.js](../tests/scoring.test.js) | 17 | YAML/response validation, every bank, privacy/template boundaries, logits/aggregation, tensor feeds, mocked GPU initialization/device-loss fallback, failed downloads, Apps Script header migration, script syntax, navigation request isolation, model-result rendering, disabled submission and current submission fingerprint/deduplication |
| [prompt-experiments.test.js](../tests/prompt-experiments.test.js) | 5 | Frozen V2 recipe, V1 profile/hash/count consistency, 24-case builds, every bank alternative, Laya encoding/markers |
| [decision-runner.test.js](../tests/decision-runner.test.js) | 4 | Candidate-order remapping, no hidden reference-score override, ordinal/Boolean order preservation, invalid logits, tuning fixtures |
| [integration-boundaries.test.js](../tests/integration-boundaries.test.js) | 7 | Cached model-record validation/invalidation, V2 provenance/denominators, relative static links, no production imports of fixture truth, module syntax, mocked benchmark command/sweep/loading/queue regression, and synthetic simulator branch/scale coverage |
| [literature-prompts.test.js](../tests/literature-prompts.test.js) | 8 | Active V4 recipe hash, all V3 profiles, independent nominal encodings, frozen V3/V4 probes, saved negative results, reverse-coded category mapping, malformed categories, V4 input overlap/CPU provenance and removal of invented stress cut-offs |

The static-link check also checks local Markdown documentation links. JSON/profile
hash checks guard against editing a recipe while retaining stale reported results.
They do not rerun the model to prove the saved observations on every `npm test`.

The 2026-10-16 cleanup added three regressions: benchmark dispatch/shared sweeps
with mocked logits (including missing definitions, invalid commands, follow-up
profiles, bank errors and queued requests); simulator AQ/default/displayed-scale
branches with a fixed random draw; and enabled submission fingerprint reuse with
a mocked opaque response. No real Sheets request or model download is made.
Shared ONNX helper tests now import `js/onnx-runtime.js` directly rather than
relying on a Julia re-export. Frozen configs, fixture values, report JSON and
the active scoring recipe were not changed by the cleanup.
The existing [CI workflow](../.github/workflows/checks.yml) runs `npm ci --ignore-scripts`
and `npm test` on Node 22; it has no GPU/model job. Adding the workflow does not
mean a remote CI run or GitHub Pages deployment has already completed.

`git diff --check` checks tracked diffs, not remote deployment. The npm audit
covers installed npm dependencies, not Hugging Face weights, remote CDN scripts
or all model/runtime security risks.

## Real-model checks already recorded

- V1 Julia/Laya prompt comparisons; Laya bank WebGPU/CPU agreement.
- V2 seven-candidate tuning and bank parity.
- V3 twelve-candidate sweep, then 170/180 frozen-probe agreement. The unsuccessful
  generalisation result is kept rather than overwritten.
- V4 six-candidate sweep, 986/986 exposed development, then 412/414 frozen fixtures.
  New-canonical-input results are 100/102 cases, or 32/33 distinct decisions.
- Active V4 CPU bank execution: 718/718 matches and 718/718 identical point
  assignments to the GPU bank subset. V4 probes were run on GPU only.

See [the report inventory and exact reproduction controls](BENCHMARKS.md).
No model runs need to be repeated solely for a documentation edit, and passing
unit tests must not be reported as newly measured model accuracy.

## Browser/UI checks and their scope

Prior implementation sessions exercised result cards, local-record restoration,
disabled submission, benchmark opt-in/export/cancellation, desktop and 390px
layouts, and project-style paths under `/5QS-Plus-Assessment/` without cross-origin
isolation. The recorded 24/24 benchmark-page smoke run was **V2**, not an extra V4
measurement. The final V4 page check showed all recorded rounds, including the V3
failure, with no model downloads merely from opening the page.

To repeat manually:

1. Open `benchmarks.html` without opting in. Confirm saved reports load, Run is
   disabled, and model/runtime resources have not been requested.
2. Opt in to a small model check. Confirm progress, errors, JSON export and Cancel
   work. Release the worker before opening another model page.
3. Use **synthetic records only** in a separate test browser profile to walk through
   info → tests → results. Confirm model points populate the original cards,
   skipped/unanswered handling is visible, and Sheets requests remain absent.
4. Reload results with matching evidence/config: check local-record restoration.
   Change evidence/config: confirm invalidation, not reuse of stale points.
5. Check the stress output says “Unvalidated index” and does not assign PSS severity
   cut-offs. Inspect the source-review/audit links and both retained probe failures.
6. Repeat layout/keyboard checks at 390px and desktop widths. For project paths:

```sh
npm run serve -- --port=9092 --base=/5QS-Plus-Assessment/
```

Open `http://localhost:9092/5QS-Plus-Assessment/`. This is a local static-path check,
not evidence of a deployed GitHub Pages site or compatibility with every device.

## Not established

These checks do not establish psychometric validity, reliability, calibrated
probabilities, demographic fairness, clinical diagnosis, a corrected instrument,
confirmed Sheets delivery, all-browser compatibility, guaranteed caching, or
zero waiting time. No fine-tuning was performed. Research submission remains off;
see [research requirements](RESEARCH_VALIDATION.md) and [source-use limits](REFERENCES.md).
