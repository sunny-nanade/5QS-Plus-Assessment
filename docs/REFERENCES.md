# References and source-use record

Source review date: **2026-10-15**. This records what informed the local-scoring
update, separately from the instrument's inherited bibliography in the
[README](../README.md#references). It is a targeted review, not a systematic
review of psychology literature. A citation is not evidence that this adapted
instrument or its model scores have been validated.

## PSS guidance

**Carnegie Mellon University, Laboratory for the Study of Stress, Immunity, and
Disease.** *Perceived Stress Scale—10 Item; PSS Scoring; Dr. Cohen's Scales.*

- [Official PSS-10 items](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pss.html)
- [Official scoring instructions](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pssscoring.html)
- [Limitations, references and permissions](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html)

**Use/status:** these guidance pages were read. They specify the ten-item 0–4
scale, reversal of positive items 4, 5, 7 and 8, and summation. The lab states that
the PSS is not diagnostic and has no score cut-offs. This informed removal of
unsupported stress severity labels and the warning that this app's sampled,
adapted 1–5 percentage is not an official PSS-10 total. Permissions guidance
directs requests to MAPI/ePROVIDE.

The guidance cites **Cohen, S., Kamarck, T., & Mermelstein, R. (1983).** A global
measure of perceived stress. *Journal of Health and Social Behavior, 24*, 385–396
([CMU-hosted article](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/pdf/globalmeas83.pdf)).
That publication is included for provenance; its analyses were not independently
reproduced in this work.

## Scale development and validation

**Boateng, G. O., Neilands, T. B., Frongillo, E. A., Melgar-Quiñonez, H. R., &
Young, S. L. (2018).** Best practices for developing and validating scales for
health, social, and behavioral research: A primer. *Frontiers in Public Health,
6*, 149. [doi:10.3389/fpubh.2018.00149](https://doi.org/10.3389/fpubh.2018.00149)
· [Full text consulted](https://pmc.ncbi.nlm.nih.gov/articles/PMC6004510/).

**Use/status:** full text read. Informed the separation of faithful response
coding from construct validity, the need for independent content review and
cognitive interviews, ordered/unambiguous response anchors, and distinct
development/confirmation samples. It provides no item-level psychological labels
for this app. The article declares CC BY; no article text was used for training.

## Testing standards

**American Educational Research Association, American Psychological Association,
& National Council on Measurement in Education. (2014).** *Standards for
educational and psychological testing.* American Educational Research Association.
[Official open-access editions](https://www.testingstandards.net/open-access-files.html).

**Use/status:** official publication/access page checked; used as a reference for
the required validation programme. This is not a claim that the entire volume
was reviewed, that the software meets every standard, or that open access grants
permission for model training.

## Spiritual intelligence bibliography

**King, D. B., & DeCicco, T. L. (2009).** A viable model and self-report measure of
spiritual intelligence. *International Journal of Transpersonal Studies, 28*(1),
68–85. [doi:10.24972/ijts.2009.28.1.68](https://doi.org/10.24972/ijts.2009.28.1.68).

**Use/status:** bibliographic metadata verified through Crossref, not a completed
full-text/manual or item-by-item review. This does **not** verify this project's
SQ items as SISRI-24 or establish an authorised scoring reproduction.

## Digital skills bibliography

**van Laar, E., van Deursen, A. J. A. M., van Dijk, J. A. G. M., & de Haan, J.
(2017).** The relation between 21st-century skills and digital skills: A systematic
literature review. *Computers in Human Behavior, 72*, 577–588.
[doi:10.1016/j.chb.2017.03.010](https://doi.org/10.1016/j.chb.2017.03.010).

**Use/status:** bibliographic metadata verified through Crossref; paid full text
was not ingested. A conceptual source does not validate this app's particular
DQ items, subscale weights or interpretation bands.

## Technical model references

- **Convai Innovations.** [Laya Typed-Decisions model card](https://huggingface.co/convaiinnovations/laya-typed-decisions).
  Consulted for the checkpoint's intended task family, specialisation and stated
  calibration limitations. Upstream benchmark figures are not this app's results.
- **m1rhan.** [Laya typed-decisions ONNX/Q4 conversion, pinned revision](https://huggingface.co/m1rhan/laya-typed-decisions-ONNX/tree/7388ca40228f08fd72fb3d2fdbd29153e9bc63d4).
  Model card consulted for the community conversion and graph contract; this is
  the active artifact, not a checkpoint trained by this project.
- **Supersonic Labs.** [Julia-1 ONNX model card/export, pinned revision](https://huggingface.co/SupersonicLabs/Julia-1-ONNX/tree/82a2fadf8fccfccdc5fd4e1009ba8f1a265eb7a8).
  Consulted for the optional model's decision interface and official WASM encoder.

Declared model licences, attribution, full Apache-2.0 text and pinned runtime
dependency notices are recorded in [MODEL_LICENSES.md](../MODEL_LICENSES.md).
Model cards may change at upstream `main`; the actual downloaded model revisions
remain pinned in the YAML and benchmark records.

## Claims this review does not support

The EQ-i, CORE/AQ and SISRI manuals were not fully verified. The inherited
README bibliography is retained for historical context, not presented as newly
reviewed evidence. No literature corpus, manual or participant records were used
to fine-tune Laya or Julia. The review does not establish psychometric validity,
clinical cut-offs, fairness or publication readiness.

See the [item/instrument audit](PSYCHOLOGY_SCORING_REVIEW.md),
[benchmark evidence](BENCHMARKS.md), [test coverage](TESTING.md) and
[conditional fine-tuning protocol](FINETUNING_PLAN.md).
