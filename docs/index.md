# Mesh: Ambient Clinical Intelligence

## The Core Problem: Why Mesh?

Healthcare relies on documentation, but the burden has become unsustainable. On average, physicians spend up to **two hours** managing Electronic Medical Records (EMR) for every **one hour** of direct patient care. This administrative overload leads to widespread physician burnout.

Simultaneously, patients suffer from communication breakdowns. Studies show that between 40% and 80% of medical information provided by healthcare practitioners is forgotten immediately by patients. Furthermore, attempting to parse an actual EMR note designed for a hospital system leaves navigating patients anxious or confused.

While AI "scribes" exist (often as wrappers over large language models), they suffer from two fatal flaws that prevent real clinical adoption:

1. **Hallucination:** Generative models make things up. In medicine, a hallucinated allergy or medication dosage is catastrophic.
2. **Data Privacy:** Sending raw Protected Health Information (PHI/PII) to cloud-based LLMs violates strict data governance laws in the EU (GDPR) and US (HIPAA).

---

## The Solution: Ambient Clinical Intelligence + Zero-Hallucination

**Mesh** is a production-grade, compliance-first Ambient Clinical Engine designed to eliminate physician documentation burden *and* empower the patient simultaneously.

Our system passively listens to the doctor-patient conversation via a minimalist browser dashboard, and deterministically outputs two perfectly aligned documents:

1. **The EMR Report:** A highly structured, strictly-typed JSON block rendered into a formal PDF for the hospital system.
2. **The Patient Summary:** A layman's translation served directly to the patient's companion portal.

### Technical Wedges
By restructuring *how* we ask the LLM for data, we created two major technical breakthroughs:

#### 1. Zero-Hallucination Architecture
We do not use loose LLM prose generation for clinical facts. Instead, we use a strict **Pydantic schema-enforced extraction pipeline**. If the AI extracts a finding (e.g., `"Diagnosis: Hypertension"`), it is mathematically forced to cite the `exact_quote` (the 1-to-4 word substring) directly from the raw audio transcript. The frontend surfaces these quotes via tooltips, allowing doctors to hover over any extracted fact and instantly audit the source truth.

#### 2. The "Opaque Pointer" Pattern
We solve the data-privacy nightmare. Our backend *never* downloads actual medical histories or highly sensitive historical files. Instead, it ingests generic **EESZT Document IDs** (e.g., `DOC-RAD-202`). 

When the doctor says, *"I saw your X-Ray from Tuesday"*, the AI semantic-matches it to `DOC-RAD-202` and generates a secure, password-protected hyperlink straight into the Hungarian EESZT portal. The patient clicks the link, authenticates via their national ID (Ügyfélkapu), and sees the secure X-Ray. PII never touches our AI backend.

---

## Quick Start
To run the platform locally, including the FastAPI backend and React frontend:

```bash
# Clone the repository
git clone https://github.com/GregoJaca/GDE-MIT-mesh.git

# Boot the entire stack
cd GDE-MIT-mesh
./start.sh
```

Navigate to `http://localhost:5173` to access the dashboards.
