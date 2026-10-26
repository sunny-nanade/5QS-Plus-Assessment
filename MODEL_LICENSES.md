# Model licences and attribution

The assessment/instrument retains its existing [CC BY-NC-ND 4.0 licence](LICENSE),
copyright 2026 Nanade & Dash. This integration does **not** relicense the instrument.
The NoDerivatives restriction is relevant to distributing a modified assessment:
confirm the necessary permission from its rights holders before publication.
An Apache-licensed model does not override the instrument's restrictions.

## Laya (active model)

- Original authors: **Convai Innovations / Nandakishor M and contributors**.
- Original checkpoint: [convaiinnovations/laya-typed-decisions](https://huggingface.co/convaiinnovations/laya-typed-decisions).
- Browser conversion and quantisation: **m1rhan**, [m1rhan/laya-typed-decisions-ONNX](https://huggingface.co/m1rhan/laya-typed-decisions-ONNX/tree/7388ca40228f08fd72fb3d2fdbd29153e9bc63d4).
- Pinned revision: `7388ca40228f08fd72fb3d2fdbd29153e9bc63d4`.
- Artifact: `onnx/model_q4.onnx`, plus the checkpoint's tokenizer JSON/config.
- Declared upstream licence for both checkpoint and conversion: **Apache-2.0**.
- Full licence: [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt).

The conversion is a third-party Q4 export, not a model trained by this project.
The original authors' reported calibration/benchmark results do not establish
accuracy or calibration for this assessment. Our prompts, candidate-order
evaluation and runtime adapter are application-specific modifications; the
downloaded weights are not changed by this project.

## Julia-1 (optional benchmark alternative)

- Original authors/export: **Supersonic Labs**.
- Original checkpoint: [SupersonicLabs/Julia-1](https://huggingface.co/SupersonicLabs/Julia-1).
- Browser model and official WASM tokenizer: [SupersonicLabs/Julia-1-ONNX](https://huggingface.co/SupersonicLabs/Julia-1-ONNX/tree/82a2fadf8fccfccdc5fd4e1009ba8f1a265eb7a8).
- Pinned revision: `82a2fadf8fccfccdc5fd4e1009ba8f1a265eb7a8`.
- Declared upstream licence: **Apache-2.0**.
- Full licence: [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt).

Our Julia adapter adds worker integration, strict validation, download caching
and local WASM/CPU fallback to the documented ONNX tensor contract. The official
encoder glue/WASM and model files are downloaded unchanged from that revision.

## Distribution and privacy

Model weights are **not committed to this repository or uploaded to GitHub Pages**.
The browser downloads revision-pinned artifacts from Hugging Face after an explicit
assessment start or benchmark opt-in. Hosts receive ordinary download metadata
(such as IP addresses), but questionnaire evidence is never sent for inference.
Local browser caches can retain those files. Clear site data to remove them.

If you mirror or redistribute model artifacts, also preserve their upstream
copyright/attribution and any accompanying NOTICE files, supply the applicable
licence, and identify your modifications as required by Apache-2.0 section 4.
Review upstream model cards and notices again when changing models or revisions;
these declarations apply to the pinned artifacts above, not arbitrary replacements.
No endorsement or fitness for clinical/research scoring is implied.

## Runtime libraries (separate from model weights)

| Component | Pinned version | Licence / source |
|---|---|---|
| ONNX Runtime Web (Laya) | 1.30.0 | [MIT, Microsoft](https://github.com/microsoft/onnxruntime/blob/v1.30.0/LICENSE) |
| ONNX Runtime Web (Julia) | 1.22.0 | [MIT, Microsoft](https://github.com/microsoft/onnxruntime/blob/v1.22.0/LICENSE) |
| Transformers.js tokenizer construction | 3.8.1 | [Apache-2.0, Hugging Face](https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/LICENSE) |
| js-yaml | 4.3.2 | [MIT](https://cdn.jsdelivr.net/npm/js-yaml@4.3.2/LICENSE) |
| Chart.js (original UI dependency) | 4.4.4 | [MIT](https://cdn.jsdelivr.net/npm/chart.js@4.4.4/LICENSE.md) |

Libraries are fetched from their pinned CDN distributions with upstream notices
intact. Their licences remain distinct from the assessment licence.
