# TODO List

## Completed Milestones
- [x] **Zero-Hallucination Blueprint**: Rigorously defined the overarching API flow.
- [x] **Strict Schema Definition**: Implemented strictly typed Pydantic structures for all data points, ensuring data integrity and immutability.
- [x] **LLM-based Extraction Pipeline**: Implemented a deterministic extraction pipeline using Azure OpenAI's `gpt-5.2` model.
- [x] **Metadata Bypass Pipeline**: Implemented strictly typed Pydantic structures allowing External System administrative data (TAJ, doctors) to bypass LLM inference, ensuring data immunity.
- [x] **Deterministic Post-Generation Guardrails**: Enacted the `exact_quote` constraint mapping directly back to the physical text.
- [x] **EU-Compliant Edge Scrubber**: Deployed Microsoft Presidio natively to intercept and tokenize PII prior to hitting the EU-hosted (Sweden - less compliance issues as it doesn't leave the EU) Azure OpenAI endpoint.
- [x] **System Pointer Pattern**: Established explicit ID-referencing (instead of data synthesis) to integrate seamlessly with the external infrastructure.
- [x] **Zero-Hallucination Guardrail**: Built deterministic contextual quote validation (CoVe) ensuring LLM grounding against the transcript.
- [x] **Minimalist Hermetic Environment**: Migrated to `uv` for reproducible Python dependency locking targeting `3.12`.

## Next Steps for the UI/UX Team
- [ ] Connect the frontend recording component to the robust `/api/v1/generate-consultation` endpoint.
- [ ] Render the `PatientSummary` UI with explicit 'Deep Links' based on the structured `System pointers`.
- [ ] Implement async streaming for lower perceived latency on clinical extraction.
