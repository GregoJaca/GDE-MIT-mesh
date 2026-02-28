# Security: EESZT Integration

Standard AI companions demand massive context windows to understand a patient's history. Passing entire national logs (like the Hungarian EESZT) into a third-party LLM introduces enormous compliance and data leakage risks.

**Echo - Medical AI Companion solves this entirely via the Opaque Pointer Pattern.**

## Opaque Pointers

Instead of ingesting raw medical histories, Echo operates exclusively on metadata.

1. **Lightweight Seeding:** The backend database stores only high-level anonymized metadata and generic `system_reference_id` strings (e.g., `DOC-RAD-202` for an active radiology exam).
2. **Contextual Injection:** When a doctor opens a patient file, the LLM system prompt is injected with a map of these pointers. For example: `[DOC-RAD-202: 2024-05-12 X-Ray]`.
3. **Semantic Correlation:** During the clinical conversation, if the doctor references "your recent X-ray," GPT-5.2 automatically recognizes the correlation and embeds the pointer into the generated action plan.

## The Patient Experience

The backend returns the patient's summary formatted in Markdown, preserving these pointers. 

The React frontend utilizes a custom UI parser (`<EesztMarkdown />`) that transforms any bracketed EESZT ID into a sealed, secure portal hyperlink.

```tsx
const renderLink = (id: string, text: string) => (
    <a href={`https://eeszt.gov.hu/link/${id}`} target="_blank">
      <LinkIcon className="w-3 h-3" />
      {text || id}
    </a>
);
```

When the patient reads their Echo summary on their device, they see clear, styled buttons mapping directly to their national health records. 

When clicked, the user leaves the Echo application and handles authentication (Ügyfélkapu) securely on the government server. Protected data remains entirely unread by our internal systems.
