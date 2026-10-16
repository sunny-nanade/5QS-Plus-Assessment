# Benchmark results and reproduction

Recorded on **2026-10-15**. These are **item-point coding agreement** checks against
the application's reference rubric, not psychological accuracy or participant
validation. The [source review](REFERENCES.md) and [instrument audit](PSYCHOLOGY_SCORING_REVIEW.md)
explain why reproducing a key can also reproduce a defective item or interpretation.

## Evidence files

| Round | Frozen recipe/profile sources | Recorded evidence |
|---|---|---|
| V1 Julia/Laya | [Julia baseline](../tests/julia-scoring.yaml), [Laya baseline](../tests/laya-scoring.yaml), [eight profiles](../tests/prompt-variants.yaml) | [V1 JSON](../tests/model-evaluation-2026-10-15.json) |
| V2 Laya | [V1 report-phrase baseline](../tests/laya-tuning-baseline.yaml), [seven candidates](../tests/laya-tuning.yaml), [frozen V2 recipe](../tests/laya-v2-scoring.yaml) | [V2 JSON](../tests/model-evaluation-v2.json) |
| V3 Laya | Frozen V2 recipe + [twelve candidates](../tests/literature-prompts.yaml) | [V3 JSON, including failed probes](../tests/model-evaluation-v3.json) |
| V4 Laya | Frozen V2 recipe + V3 `nominal-letters` + [six candidates](../tests/category-prompts.yaml) | [V4 JSON, failures and input overlap](../tests/model-evaluation-v4.json) |

The selected active recipe is [scoring.yaml](../scoring.yaml), rubric
`laya-category-manual-v4`. It uses Laya Q4 revision
`7388ca40228f08fd72fb3d2fdbd29153e9bc63d4`. Its prompt/rubric hash is
`744f9b2d943489ef773a48a44ca6ae7966029b570fc318b06f8e7cd18161e6d0`.
Full config, input and profile-file hashes are in the JSON records and checked
by regression tests. Baseline file hashes can differ because adapter URLs resolve
beside each YAML file; compare the effective prompt/rubric hash as well.

## Results by round

| Model / recipe | Suite | Agreement | Measurement scope |
|---|---|---:|---|
| Julia V1 `literal-json` | 718 bank alternatives | 349/718 (48.6%) | WebGPU |
| Laya V1 `report-phrase` | Same bank | 695/718 (96.8%) | WebGPU and CPU; all 718 point decisions agree |
| Laya V2 `kind-specific` | Same exposed bank | 711/718 (99.0%) | WebGPU and CPU; all 718 point decisions agree |
| Laya V2 | Frozen-at-that-round synthetic probes | 87/88 (98.9%) | WebGPU; subsequently exposed to later rounds |
| Laya V3 `nominal-letters` | Exposed bank | 718/718 | WebGPU; 46 distinct inputs / 58 scoring requests |
| Laya V3 | Frozen-at-that-round probes | 170/180 (94.4%) | 140/140 MCQ; 30/40 scale cases; failure retained |
| Laya V4 `category-manual` | Bank + exposed V2/V3 probes | 986/986 | WebGPU; 48 distinct inputs / 74 scoring requests |
| Laya V4 | Bank subset of that GPU execution | 718/718 | 31 distinct inputs / 43 scoring requests; not a second GPU run |
| Laya V4 | Separate CPU bank execution | 718/718 | 718/718 point decisions agree with the GPU subset |
| Laya V4 | Separately frozen V4 fixtures | 412/414 (99.5%) | WebGPU only; 64 distinct inputs / 108 scoring requests |

The bank covers every displayed alternative: IQ 124, EQ 125, AQ 119, SQ 125,
DQ 150 and Stress 75. It has been inspected and used for tuning. It must not be
described as an unseen test or 718 independent participant examples.

### New combinations, including unsuccessful ones

V3 compared **12 configurations** on the same exposed 718-case bank:

| Profile | Matched | Profile | Matched |
|---|---:|---|---:|
| `v2-control` | 711 | `nominal-letters` | 718 |
| `manual-fidelity` | 706 | `nominal-numbers` | 718 |
| `contextual-key` | 692 | `nominal-report` | 681 |
| `record-verification` | 715 | `nominal-manual` | 650 |
| `key-in-question` | 709 | `nominal-noul` | 689 |
| `quoted-match` | 698 | `literature-global` | 704 |

V4 then compared **six configurations** on the explicitly exposed 986-case set:

| Profile | Matched |
|---|---:|
| `v3-control` | 975/986 |
| `category-report` | 971/986 |
| `category-short` | 986/986 |
| `category-numbers` | 986/986 |
| `category-manual` | 986/986 |
| `category-ordinal` | 986/986 |

The V4 tie-break selected `category-manual` for its explicit self-report and
no-double-reversal instruction, not for the best probe outcome or fastest timing.
The V3 failure was retained before starting V4; V4 probes were fixed before that
sweep. No post-V4-probe prompt repair or special-case score override was applied.
This adaptive sequence is not an externally preregistered validation study.

## Denominators, overlap and remaining failures

- **Case:** one item/response fixture with an expected point value.
- **Canonical model input:** a distinct `row` containing state, question, type and
  candidates. Point values are not part of this input. Nominal encoding removes
  raw anchor wording from the active inference request.
- **Scoring request (`unique_requests`):** the worker's cache key includes the
  model row **and point-value mapping**. The same row can therefore be executed
  for more than one point mapping. This is why input counts and calls differ.
- **Inference calls:** actual forward calls after request de-duplication. Ensembles
  can multiply this count; active V4 is single-pass.

Of V4's 64 canonical probe inputs, **31 already appear in development**. The 414
fixture cases split into 312/312 matches using seen inputs and **100/102 matches
using 33 new inputs**. At distinct-new-input level that is **32/33** decisions.
All 250 novel-worded scale cases map to already-seen category-ID inputs. Their
250/250 result is coding invariance, **not semantic generalisation** to new scales.

The two V4 failed cases share the same `N`/`N` comparison at position 14 of a
20-option MCQ, repeated with the IQ and AQ point mappings. The current assessment
uses four-option MCQs. Both failures, the ten earlier V3 probe failures, and all
candidate comparison counts remain in the respective JSON records. Summary files
are not a substitute for every raw run log; a fresh browser run exports the full
effective recipe, case decisions and failures through **Download JSON Report**.

Observed V4 inference times were 12924 ms for development (74 calls), 31508 ms
for GPU probes (108 calls), and 131805 ms for the CPU bank (43 calls), after
initialization. These are different suites, not a controlled GPU/CPU speed ratio.
The managed browser's exact hardware and build were not archived; do not present
these observations as a general hardware benchmark. Downloads/warmup are extra.

## Reproduce without changing the frozen recipes

Run `npm ci`, `npm test`, then `npm run serve`. Open
[benchmarks.html](../benchmarks.html) at `http://localhost:9090/benchmarks.html`.
Viewing saved reports downloads no model. Opt in explicitly for inference, close
other assessment/model tabs to reduce memory pressure, and export each finished
run before changing configurations. CPU evaluation can take minutes.

| Desired run | Model selector | Suite selector |
|---|---|---|
| Active V4 bank / CPU parity | Active assessment model | 718-case exposed-bank regression; choose WebGPU or CPU |
| Active V4 probes | Active assessment model | 414-case V4 frozen probes |
| V3 comparison | Laya · frozen V2 recipe | V3 literature / representation sweep |
| V4 comparison | Laya · frozen V2 recipe | V4 category-coding development sweep |
| V2 property sweep | Laya · frozen tuning baseline | Laya property sweep · calibration only |
| V1 comparison | Original Laya or Julia baseline | Original prompt comparison |

**Do not select the active V4 config to reproduce a historical V2/V3 recipe.**
Overriding only some fields on a newer config can leave newer fields in place.

For exact selected-profile probe replication, the page's console helpers can
reuse its resident model. Run each call only after the preceding run completes:

```js
// First run the V3 comparison with the frozen V2 base.
startModelTest('webgpu', 'literature', './laya-v2-scoring.yaml');
```

```js
// After completion: reproduce the historical V3 probe result, not active V4.
followupModelTest({command: 'probes-v3', profile: 'nominal-letters', literature: true});
```

```js
// Run the V4 comparison with the same frozen base; wait for completion.
startModelTest('webgpu', 'categories', './laya-v2-scoring.yaml');
```

```js
followupModelTest({command: 'probes-v4', profile: 'category-manual', categories: true});
```

Fixture generators are [scoring-fixtures.js](../tests/scoring-fixtures.js),
[literature-fixtures.js](../tests/literature-fixtures.js) and
[category-fixtures.js](../tests/category-fixtures.js). Their input hashes and
the active recipe are checked by the [automated test suite](TESTING.md).
Use **Cancel / Release Model** afterwards. CPU/GPU parity is currently measured
for the bank, not for the V4 probe suite. See [research boundaries](RESEARCH_VALIDATION.md)
before making publication claims.
