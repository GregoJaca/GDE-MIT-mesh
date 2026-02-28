#!/usr/bin/env python3
"""
Mesh Pipeline Debug CLI
=======================
Text-only test harness for the Zero-Hallucination pipeline.
Bypasses Azure Speech — inject transcript directly into the LLM pipeline.

Usage:
    # Run against a live backend (default http://localhost:8000)
    python debug_cli.py --patient P-10101 --doctor D-99 \
        --transcript "Patient reports chest pain for 3 days. BP 130/85."

    # Run transcript from a file
    python debug_cli.py --patient P-10101 --file transcripts/sample_visit.txt

    # Skip PII scrub (transcript already anonymised)
    python debug_cli.py --patient P-10101 --file transcripts/anon.txt --skip-pii

    # Show DB context only (what the LLM sees before you record anything)
    python debug_cli.py --patient P-10101 --db-context-only

    # Run all built-in test cases
    python debug_cli.py --run-all-tests

    # Change language for patient summary
    python debug_cli.py --patient P-10101 --file t.txt --language hu
"""

import argparse
import json
import sys
import textwrap
from datetime import datetime
from typing import Optional
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000"

# ── colour helpers ────────────────────────────────────────────────────────────
BOLD = "\033[1m"
DIM  = "\033[2m"
RED  = "\033[91m"
GRN  = "\033[92m"
YLW  = "\033[93m"
BLU  = "\033[94m"
CYN  = "\033[96m"
RST  = "\033[0m"

def H1(t: str): print(f"\n{BOLD}{t}{RST}")
def H2(t: str): print(f"\n{BLU}{BOLD}  {t}{RST}")
def KV(k: str, v: str): print(f"  {DIM}{k:<30}{RST} {v}")
def OK(t: str): print(f"  {GRN}✔ {t}{RST}")
def WARN(t: str): print(f"  {YLW}⚠  {t}{RST}")
def ERR(t: str): print(f"  {RED}✖ {t}{RST}")
def SEP(): print(f"\n{DIM}{'─' * 80}{RST}")

def post_json(path: str, payload: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {body}")

def get_json(path: str) -> dict:
    req = urllib.request.Request(f"{BASE_URL}{path}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {body}")


# ── DB context inspector ───────────────────────────────────────────────────────
def cmd_db_context(patient_id: str, doctor_id: str):
    H1(f"DB Context for patient {patient_id}")
    SEP()
    data = get_json(f"/api/v1/debug/db-context/{patient_id}?doctor_id={doctor_id}")

    H2("Patient")
    pm = data["patient_meta"]
    KV("ID", pm["id"])
    KV("Name", pm["name"])
    KV("TAJ", pm["taj"])
    KV("DOB", pm["dob"])

    H2("Doctor")
    dm = data["doctor_meta"]
    KV("Name", dm["name"])
    KV("Seal", dm["seal_number"])

    H2("EHR Documents injected as opaque pointers into LLM")
    docs = data["context_documents"]
    if not docs:
        WARN("No EHR documents found for this patient in the DB.")
    for d in docs:
        print(f"    {DIM}[{d['system_doc_id']}]{RST}  {d['type']}  {d.get('date','?')}")

    H2("Available Doctor Categories injected into LLM (for referral mapping)")
    cats = data["available_doctor_categories"]
    for c in cats:
        print(f"    {DIM}{c['doctor_id']:<12}{RST}  {c['specialty']}")

    H2("Full system_context string sent to every LLM call")
    print(textwrap.indent(data["system_context_injected_into_llm"], "    "))
    SEP()


# ── Draft debugger ─────────────────────────────────────────────────────────────
def cmd_run_draft(
    patient_id: str,
    doctor_id: str,
    transcript: str,
    language: str = "en",
    skip_pii: bool = False,
    encounter_date: Optional[str] = None,
):
    date = encounter_date or datetime.utcnow().isoformat() + "Z"
    payload = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "encounter_date": date,
        "language": language,
        "transcript": transcript,
        "skip_pii_scrub": skip_pii,
    }

    H1("Pipeline Debug Run")
    print(f"  Patient: {BOLD}{patient_id}{RST}  |  Doctor: {doctor_id}  |  Lang: {language}")
    print(f"  Transcript ({len(transcript)} chars): {DIM}{transcript[:120]}{'...' if len(transcript)>120 else ''}{RST}")
    SEP()

    print(f"  {DIM}Calling POST /api/v1/debug/run-draft ...{RST}", flush=True)
    result = post_json("/api/v1/debug/run-draft", payload)

    # ── Stage 0: DB Context ──
    H2("Stage 0: DB Context (what the LLM sees)")
    docs = result["context_documents"]
    cats = result["available_doctor_categories"]
    KV("EHR documents", str(len(docs)))
    for d in docs:
        print(f"      {DIM}[{d['system_doc_id']}]{RST}  {d['type']}  {d.get('date','?')}")
    KV("Doctor categories for referral", str(len(cats)))
    for c in cats:
        print(f"      {DIM}{c['doctor_id']:<12}{RST} {c['specialty']}")

    # ── Stage 1: PII Scrub ──
    H2("Stage 1: PII Scrubbing (Presidio)")
    raw   = result["raw_transcript"]
    scrub = result["scrubbed_transcript"]
    tmap  = result["token_map"]
    KV("Raw length", f"{len(raw)} chars")
    KV("Scrubbed length", f"{len(scrub)} chars")
    KV("Tokens replaced", str(len(tmap)))
    if tmap:
        for tok, orig in list(tmap.items())[:10]:
            print(f"      {DIM}{tok}{RST} → {GRN}{orig}{RST}")
        if len(tmap) > 10:
            print(f"      {DIM}... and {len(tmap)-10} more{RST}")
    if skip_pii:
        WARN("PII scrub was SKIPPED (skip_pii_scrub=true)")

    H2("Stage 1b: System context injected into prompts")
    ctx = result["system_context_injected"]
    try:
        parsed_ctx = json.loads(ctx)
        print(textwrap.indent(json.dumps(parsed_ctx, indent=2), "    "))
    except Exception:
        print(textwrap.indent(ctx[:500], "    "))

    # ── Stage 2: LLM Extraction ──
    H2("Stage 2: LLM Call 1 — Clinical Extraction (raw, before guardrail)")
    raw_ext = result["clinical_extraction_raw"]
    _print_clinical(raw_ext, label="raw")

    hallucs = result["hallucinations_stripped"]
    if hallucs:
        WARN(f"Guardrail stripped {len(hallucs)} hallucinated quote(s):")
        for h in hallucs:
            print(f"      {RED}✖ '{h}'{RST}")
    else:
        OK("Guardrail: 0 hallucinations detected — all quotes verified verbatim")

    H2("Stage 2b: Validated Clinical Draft (after guardrail)")
    val = result["clinical_draft_validated"]
    _print_clinical(val, label="validated")

    # ── Stage 3: Patient Summary ──
    H2("Stage 3: LLM Call 2 — Patient Summary")
    print(textwrap.indent(result["patient_summary_md"], "    "))

    # ── Stage 4: Hydration ──
    H2("Stage 4: PII Hydration (tokens restored)")
    hyd = result["clinical_final_hydrated"]
    _print_clinical(hyd, label="hydrated")
    print(f"\n  {BOLD}Patient Summary (hydrated):{RST}")
    print(textwrap.indent(result["patient_summary_hydrated"], "    "))

    SEP()
    OK("Pipeline run complete.")
    print(f"\n  To generate the PDF, POST /api/v1/finalize-report with the validated clinical JSON.\n")


def _print_clinical(d: dict, label: str = ""):
    tag = f" [{label}]" if label else ""
    cc  = d.get("chief_complaints", [])
    ass = d.get("assessments", [])
    act = d.get("actionables", [])
    print(f"    {DIM}Chief Complaints{tag} ({len(cc)}){RST}")
    for c in cc:
        ref = f" → ref: {CYN}{c.get('system_reference_id')}{RST}" if c.get("system_reference_id") else ""
        print(f"      [{c.get('condition_status','?')}] {c.get('finding','')}  {DIM}|{RST} \"{c.get('exact_quote','')}\"" + ref)
    print(f"    {DIM}Assessments{tag} ({len(ass)}){RST}")
    for a in ass:
        ref = f" → ref: {CYN}{a.get('system_reference_id')}{RST}" if a.get("system_reference_id") else ""
        print(f"      [{a.get('condition_status','?')}] {a.get('finding','')}  {DIM}|{RST} \"{a.get('exact_quote','')}\"" + ref)
    print(f"    {DIM}Actionables{tag} ({len(act)}){RST}")
    for a in act:
        ref = f" → ref: {CYN}{a.get('system_reference_id')}{RST}" if a.get("system_reference_id") else ""
        print(f"      [{a.get('action_type','?')}] {a.get('description','')}  {DIM}|{RST} \"{a.get('exact_quote','')}\"" + ref)


# ── Built-in test cases ────────────────────────────────────────────────────────
TEST_CASES = [
    {
        "name": "Basic visit — clear symptoms",
        "patient_id": "P-10101",
        "transcript": (
            "The patient Jane Doe presents with chest pain for the past 3 days. "
            "She says the pain is sharp and worsens with breathing. "
            "Blood pressure 130 over 85. I'll prescribe ibuprofen 400mg twice a day for 5 days. "
            "Please schedule a follow-up in two weeks with Dr. Miller."
        ),
    },
    {
        "name": "Negation test — denied symptoms should not appear",
        "patient_id": "P-10101",
        "transcript": (
            "Patient John Smith denies any chest pain or shortness of breath. "
            "Mother has diabetes but patient does not. "
            "Blood pressure is within normal limits. "
            "No medications were prescribed today. "
            "Patient is in good health, no follow-up required."
        ),
    },
    {
        "name": "EHR opaque pointer test — references past lab report",
        "patient_id": "P-10101",
        "transcript": (
            "Looking at Jane's lab results from the last visit, the cholesterol is elevated. "
            "Total cholesterol 240 mg/dL from her lab report. "
            "I'll prescribe atorvastatin 20mg once daily. "
            "Please refer her to the cardiologist for follow-up."
        ),
    },
    {
        "name": "Edge case — empty / near-empty transcript",
        "patient_id": "P-10101",
        "transcript": "Hello. Yes. Okay. Goodbye.",
    },
    {
        "name": "Multi-complaint — should extract all",
        "patient_id": "P-10101",
        "transcript": (
            "Patient presents today with Jane Doe, complaining of knee pain for two weeks, "
            "a rash on the left forearm that appeared yesterday, and fatigue. "
            "Knee pain is worse with walking. The rash is red and itchy. "
            "Prescribing hydrocortisone cream 1% for the rash. "
            "Ordering an X-ray for the knee. "
            "Follow-up in 4 weeks."
        ),
    },
]

def cmd_run_all_tests(doctor_id: str = "D-99"):
    H1("Running all built-in test cases")
    SEP()
    results_summary = []

    for i, tc in enumerate(TEST_CASES, 1):
        print(f"\n{BOLD}Test {i}/{len(TEST_CASES)}: {tc['name']}{RST}")
        print(f"  {DIM}Transcript: {tc['transcript'][:100]}...{RST}")

        try:
            payload = {
                "patient_id": tc["patient_id"],
                "doctor_id": doctor_id,
                "encounter_date": datetime.utcnow().isoformat() + "Z",
                "language": "en",
                "transcript": tc["transcript"],
                "skip_pii_scrub": False,
            }
            r = post_json("/api/v1/debug/run-draft", payload)

            val = r["clinical_draft_validated"]
            n_cc  = len(val.get("chief_complaints", []))
            n_ass = len(val.get("assessments", []))
            n_act = len(val.get("actionables", []))
            hallucs = r["hallucinations_stripped"]
            scrub_tokens = len(r["token_map"])

            status = GRN + "PASS" + RST
            results_summary.append({"name": tc["name"], "pass": True, "hallucs": len(hallucs)})

            KV("Status", status)
            KV("Chief complaints", str(n_cc))
            KV("Assessments", str(n_ass))
            KV("Actionables", str(n_act))
            KV("PII tokens scrubbed", str(scrub_tokens))
            if hallucs:
                WARN(f"Guardrail stripped {len(hallucs)}: {hallucs}")
            else:
                OK("Guardrail: 0 hallucinations")

        except Exception as e:
            ERR(f"FAIL: {e}")
            results_summary.append({"name": tc["name"], "pass": False, "error": str(e)})

    SEP()
    H1("Test Summary")
    passed = sum(1 for r in results_summary if r["pass"])
    for r in results_summary:
        icon = f"{GRN}✔{RST}" if r["pass"] else f"{RED}✖{RST}"
        extra = f"  hallucs stripped: {r.get('hallucs', '?')}" if r["pass"] else f"  {r.get('error','')}"
        print(f"  {icon}  {r['name']}{DIM}{extra}{RST}")
    print(f"\n  {BOLD}{passed}/{len(TEST_CASES)} tests passed{RST}")


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Mesh Pipeline Debug CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--base-url", default=BASE_URL)
    parser.add_argument("--patient", default="P-10101")
    parser.add_argument("--doctor", default="D-99")
    parser.add_argument("--language", default="en", choices=["en", "hu", "es"])
    parser.add_argument("--transcript", help="Inline transcript text")
    parser.add_argument("--file", help="Path to a .txt file containing the transcript")
    parser.add_argument("--skip-pii", action="store_true", help="Skip Presidio scrubbing")
    parser.add_argument("--db-context-only", action="store_true", help="Only show DB context, no LLM call")
    parser.add_argument("--run-all-tests", action="store_true", help="Run all built-in test cases")

    args = parser.parse_args()

    global BASE_URL
    BASE_URL = args.base_url.rstrip("/")

    if args.run_all_tests:
        cmd_run_all_tests(doctor_id=args.doctor)
        return

    if args.db_context_only:
        cmd_db_context(args.patient, args.doctor)
        return

    transcript = ""
    if args.transcript:
        transcript = args.transcript
    elif args.file:
        with open(args.file, "r") as f:
            transcript = f.read()
    else:
        parser.error("Provide --transcript, --file, --db-context-only, or --run-all-tests")

    cmd_run_draft(
        patient_id=args.patient,
        doctor_id=args.doctor,
        transcript=transcript,
        language=args.language,
        skip_pii=args.skip_pii,
    )


if __name__ == "__main__":
    main()
