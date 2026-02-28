# 🏆 GDE MIT Mesh: Hackathon Winning Playbook & Demo Script

## 1. The Core Problem We Solve (The "Why")
**For Doctors:** Administrator burnout. Doctors spend up to 2 hours writing EMR notes for every 1 hour of patient care. Current AI scribes (like generic ChatGPT wrappers) hallucinate medical facts and violate HIPAA/GDPR by sending raw PII to the cloud.
**For Patients:** Communication breakdown. 40-80% of medical information provided by healthcare practitioners is forgotten immediately by patients. Patients don't understand complex EMR notes and can't easily access the historical context the doctor referenced.

## 2. Our Solution: Ambient Clinical Intelligence + Zero-Hallucination
We built **Mesh**, a production-grade, compliance-first Ambient Clinical Engine. 
It passively listens to the doctor-patient conversation and deterministically outputs two aligned documents:
1. **The EMR Report:** A highly structured, strictly-typed JSON/PDF for the hospital system.
2. **The Patient Summary:** A layman's translation for the patient portal.

### Technical Wedges (Why We Win)
* **Zero-Hallucination Architecture:** We don't use loose LLM generation. We use strict Pydantic schema-enforced extraction. If the LLM generates a finding, it *must* cite the exact 1-to-4 word substring from the audio transcript.
* **The "Opaque Pointer" Pattern (EESZT Integration):** We solve the data-privacy nightmare. Our backend *never* downloads actual medical histories. It only ingests opaque EESZT document IDs (e.g., `DOC-RAD-202`). When the doctor says *"I saw your X-Ray from Tuesday"*, the AI semantic-matches it to `DOC-RAD-202` and generates a secure, password-protected **Hyperlink** straight into the Hungarian EESZT portal. The patient clicks the link, authenticates via Ügyfélkapu, and sees the secure X-Ray. PII never touches the AI.

---

## 3. The 3-Minute Live Demo Script

**[0:00 - 0:30] The Setup**
* **Presenter:** "Doctors don't want another chatbot. They want to talk to their patients, and have the bureaucracy disappear. Watch this."
* *Action:* Presenter opens the Mesh Doctor Dashboard. They select `Jane Doe (P-10101)` from the dropdown. 
* *Visual:* The UI instantly fetches Jane's generic EESZT document IDs (a Dermatology consult from 2024).

**[0:30 - 1:30] The Ambient Capture (Live Audio)**
* *Action:* Presenter hits "Record" and roleplays an interaction.
* **Presenter (as Doctor):** *"Hi Jane, it's good to see you again. I reviewed your recent dermatology consult from 2024 regarding that pigmented lesion on your forearm. It looks completely benign today, which is great news. However, your blood pressure is a bit elevated today at 140 over 90. I want you to start taking Lisinopril 10mg daily, and I'll refer you to Cardiology for a follow-up next month."*
* *Action:* Presenter hits "Stop & Generate". 

**[1:30 - 2:00] The Engine at Work (The Flex)**
* **Presenter:** "While that processes, let me tell you what is happening. The audio isn't just being transcribed. Our backend is running a deterministic pipeline. It is locally scrubbing Jane's PII, locking the LLM into a strict Pydantic clinical schema, and semantically linking my words to Jane's national EESZT health record."

**[2:00 - 2:45] The Reveal**
* *Action:* The UI splits into two views: **Doctor's EMR Report** and **Patient's App Summary**.
* **Presenter:** "Here is the Doctor's view. A flawless, structured SOAP note ready for the hospital DB. Note how it cleanly extracted 'Lisinopril 10mg' and the blood pressure stats."
* *Action:* Presenter switches to the Patient view.
* **Presenter:** "But here is the magic. The patient receives a beautiful, simple summary on their phone. *'Jane, your forearm lesion looks benign...'*. And look at this—the words 'dermatology consult' are a blue hyperlink."
* *Action:* Presenter clicks the hyperlink.
* **Presenter:** "That isn't just text. The AI mapped my speech directly to her historical EESZT document ID. When Jane clicks it, it securely routes her to the Gov portal to see her original record. Complete context, zero data leakage."

**[2:45 - 3:00] The Closing**
* **Presenter:** "Mesh isn't just an AI scribe. It's a deterministic bridge between the doctor's voice, the hospital's database, and the patient's understanding. Thank you."

---

## 4. Next Technical Steps to Facilitate This Demo
1. **Frontend Refactor (`DoctorDashboard.tsx`):** Unify the state to accept the newly structured JSON from our endpoints. 
2. **Hyperlink Rendering Component:** Create a React component that looks for `system_reference_id` in the API payload and wraps the UI text in an `<a href="https://eeszt.gov.hu/link/{id}">` tag.
3. **Audio Capture Polish:** Ensure the `MediaRecorder` hook flushes data rapidly so `ffmpeg` processes it entirely without artifacts.
