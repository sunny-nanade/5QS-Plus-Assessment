# Conditional Laya / Julia fine-tuning protocol

No training job, paid compute, article scraping or participant-data upload is
authorised/performed by this document. Prefer prompt/representation fixes if they
solve the coding problem. Training cannot repair incorrect test keys or provide
missing validity evidence.

## Define the task before collecting training data

**A. Faithful item coding**: input is a versioned key/category mapping plus an
observed response; target is the candidate/point defined by that mapping. This
is the task the existing browser model implements. Compare with a transparent
deterministic scorer as a research baseline; a model adds avoidable failure risk
for exact, fully specified multiple-choice coding.

**B. Psychological judgement or new instrument development**: requires a distinct
approved protocol and independently adjudicated, construct-specific labels.
Literature sentences are not participant competency labels. Do not train a model
to call respondents competent, maladaptive or clinically stressed using generated
judgements or the current unverified keys as ground truth.

## Required data and rights

- Build a source manifest: DOI/URL, exact licence/version, permitted training and
  redistribution, access date, construct, intended population and approved use.
  Open access is not automatically permission for model training. Do not ingest
  “all psychology literature,” paywalled articles, or proprietary test manuals.
- Resolve the issues in `PSYCHOLOGY_SCORING_REVIEW.md` with the instrument owners
  and an independent domain panel before creating adjudicated psychological labels.
- For task A, create balanced synthetic coding records with independently varied
  keys, responses, 2–20 candidates, Unicode/currency, similar labels, reversals,
  partial records, conflicting/malformed inputs and counterbalanced option order.
  Keep deterministic labels explicitly described as **coding** labels.
- For task B, obtain lawful/de-identified records, informed consent and ethics
  approval as applicable. Use independent raters, a written rubric, provenance,
  disagreement resolution and inter-rater agreement. Define a reject/review route
  for genuinely ambiguous answers instead of forcing binary “truth.”

## Splitting and training

1. Split by source instrument/item/template/semantic family **before** augmentation.
   Group repeated canonical model inputs and translations. Never randomly split
   duplicated item/options across train and test. Freeze a truly external test set.
2. Keep this app's exposed bank, V1/V2/V3 probes and prompt-development fixtures
   in development/regression only once inspected. Do not turn reused bank scores
   into a reported independent test. Keep synthetic and participant results separate.
3. Train from the original Apache-2.0 floating-point checkpoint and its supported
   custom decision-head architecture, not the browser Q4 ONNX file. Pin upstream
   code/revisions/tokenizer and verify licences. Use a supervised choice loss for
   coding, appropriate ordinal/Boolean heads for those primitives, documented
   seeds/hyperparameters and validation-only early stopping.
4. Compare frozen base Laya, frozen base Julia and the transparent reference
   scorer against the fine-tuned model. Fit any probability calibration only on
   a disjoint calibration split; report calibration as well as point decisions.
5. Export the winning model to ONNX, quantise for the browser, and verify fp32 vs
   Q4, WebGPU vs CPU, option-order stability, memory, cold download/warmup and
   latency. Architecture/output changes require an explicitly versioned adapter.
6. Freeze all artifacts and independently evaluate failures, weighted agreement,
   item-level/scale-level error, reliability, measurement invariance and subgroup
   performance where the study supports them. Training loss or model/rubric
   agreement alone does not establish validity.

## Go / no-go

Do not start training until the target task, permissions, reviewed labels, leakage-
safe data splits, hardware/budget and acceptance criteria are agreed. No actual
psychological-validation acceptance threshold is established by this repository.
Keep `submission.enabled: false` until a researcher explicitly approves a validated
protocol. Record negative experiments as well as improvements.
