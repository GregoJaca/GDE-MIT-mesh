# EESZT Integration: The "Opaque Pointer" Pattern

Handling historical health records presents a severe security and privacy bottleneck. To generate an accurate summary, an AI theoretically needs the complete medical history of the patient. However, extracting entire EESZT (Elektronikus Egészségügyi Szolgáltatási Tér) logs and piping them into an LLM context window exposes hospitals to massive HIPAA/GDPR liabilities. 

**Mesh circumvents this via the "Opaque Pointer" Pattern.**

## How It Works

1. **Database Seed:** The Mesh database does *not* store the full text of a patient's historical medical records. It only stores high-level, anonymized metadata alongside a generic `system_reference_id` (e.g., `DOC-DERM-001`, representing a previous Dermatology consult).
2. **Context Injection:** When the Doctor opens "Jane Doe's" profile, the backend fetches Jane's available document pointers and secretly prepends them to the LLM's system prompt.
   * *Example Injection:* `"Patient has the following historical records available in EESZT: [DOC-DERM-001 - 2024-05-12 - Dermatology Consult]"`
3. **Semantic Matching:** During the live consultation, the doctor says: *"I saw your dermatology consult from May..."*.
4. **Extraction:** The LLM, instructed to look for correlations, realizes the spoken text matches the injected metadata. It outputs an `actionable` or `summary_bullet` that embeds the pointer.

## Markdown Rendering (Frontend)

The true magic happens on the patient's device. 

The API returns the Patient Summary in Markdown format, peppered with our custom syntax: 
`Your [DOC-DERM-001] was reviewed today...`

The React Frontend utilizes a custom `<EesztMarkdown />` component. This component intercepts any bracketed document ID and transforms it into a functional, styled hyperlink:

```tsx
// frontend/src/components/shared/EesztMarkdown.tsx
const renderLink = (id: string, text: string) => (
    <a 
      href={`https://eeszt.gov.hu/link/${id}`} 
      target="_blank" 
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs..."
    >
      <Link className="w-3 h-3" />
      {text || id}
    </a>
);
```

### The Result
The patient sees a beautiful, blue button: `[View Dermatology Consult in EESZT]`. 
When they click it, they are routed completely out of the Mesh ecosystem and into the secure Hungarian government portal, where they authenticate securely to view the highly sensitive file.

**PII is never leaked, never stored, and never digested by the LLM.**
