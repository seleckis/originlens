# Local ML decision gate

Reviewed: 2026-08-23

## Primary sources

- PhishLang demonstrates a client-side MobileBERT detector, but its inputs and
  evaluation design differ from OriginLens's value-free bounded structure:
  <https://arxiv.org/abs/2408.05667>
- PhishLLM uses remote LLM/search validation and page semantics, conflicting
  with OriginLens's offline/local-first and no-page-text boundary:
  <https://www.usenix.org/conference/usenixsecurity24/presentation/liu-ruofan>
- KnowPhish combines a large multimodal brand knowledge base, logos, webpage
  text, and an LLM:
  <https://www.usenix.org/conference/usenixsecurity24/presentation/li-yuexin>
- The USENIX Security 2025 visual-detector evaluation shows large real-world
  performance differences and logo-removal/adversarial weaknesses:
  <https://www.usenix.org/conference/usenixsecurity25/presentation/ji>
- PHILTER reports that no reviewed approach satisfied all examined functional
  and security requirements, including privacy and diverse benign testing:
  <https://www.usenix.org/conference/usenixsecurity26/presentation/alam>

## Measured deterministic gaps

| Fixture/gap                    | Deterministic result | Missing evidence                       |
| ------------------------------ | -------------------- | -------------------------------------- |
| Canvas-only identity           | Partial/unknown      | Canvas text or image identity          |
| Split identity text            | Abstains             | Robust reconstructed brand semantics   |
| Unknown organization login     | Non-blocking caution | Provenance-backed identity relation    |
| Logo removal after interaction | Mutation evidence    | Removed visual identity interpretation |
| Permission/download controls   | Structural caution   | Browser API outcome or download result |

These gaps are real, but the repository has no representative, licensed,
temporally separated, site-family-separated corpus for the bounded features an
offline model would actually receive. The fixture set is an acceptance suite,
not training or accuracy evidence.

## Decision

Stage 7 does not package a model, model runtime, or weights. Adding one now
would create unverifiable accuracy claims and supply-chain/performance cost
without a valid baseline comparison. Deterministic-only operation remains the
complete product path. A later proposal must first provide the required corpus,
provenance/license review, temporal and site-family splits, abstention/OOD
criteria, adversarial mutations, and measured size/memory/cold-start/p95 limits.
