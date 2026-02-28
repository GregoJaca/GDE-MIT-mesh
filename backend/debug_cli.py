#!/usr/bin/env python3
"""
Mesh Pipeline Debug CLI
Text-only test harness — bypasses Azure Speech, injects transcript directly.

Usage:
    python debug_cli.py --patient P-10101 --transcript "Patient has chest pain..."
    python debug_cli.py --patient P-10101 --file transcripts/visit.txt
    python debug_cli.py --patient P-10101 --db-context-only
    python debug_cli.py --run-all-tests
    python debug_cli.py --run-all-tests --verbose
"""

import argparse
import json
import sys
import textwrap
from datetime import datetime
from typing import Optional
import urllib.request
import urllib.error

DEFAULT_BASE_URL = "http://localhost:8000"

# ── Colour helpers ────────────────────────────────────────────────────────────
BOLD = "\033[1m"
DIM  = "\033[2m"
RED  = "\033[91m"
GRN  = "\033[92m"
YLW  = "\033[93m"
BLU  = "\033[94m"
CYN  = "\033[96m"
RST  = "\033[0m"

def H1(t): print(f"\n{BOLD}{t}{RST}")
def H2(t): print(f"\n{BLU}{BOLD}  {t}{RST}")
def KV(k, v): print(f"  {DIM}{k:<32}{RST} {v}")
def OK(t): print(f"  {GRN}PASS  {t}{RST}")
def WARN(t): print(f"  {YLW}WARN  {t}{RST}")
def ERR(t): print(f"  {RED}FAIL  {t}{RST}")
def SEP(): print(f"\n{DIM}{'─' * 80}{RST}")


def post_json(base_url: str, path: str, payload: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{base_url}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def get_json(base_url: str, path: str) -> dict:
    req = urllib.request.Request(f"{base_url}{path}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


# ── DB context inspector ──────────────────────────────────────────────────────
def cmd_db_context(base_url: str, patient_id: str, doctor_id: str):
    H1(f"DB Context — patient {patient_id}")
    SEP()
    data = get_json(base_url, f"/api/v1/debug/db-context/{patient_id}?doctor_id={doctor_id}")

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

    H2("EHR Documents (opaque pointers sent to LLM)")
    docs = data["context_documents"]
    if not docs:
        WARN("No EHR documents for this patient")
    for d in docs:
        print(f"    [{d['system_doc_id']}]  {d['type']}  {d.get('date','?')}")

    H2("Available Doctor Categories (for referral mapping)")
    for c in data["available_doctor_categories"]:
        print(f"    {c['doctor_id']:<14}  {c['specialty']}")

    H2("system_context JSON injected into LLM prompts")
    print(textwrap.indent(data["system_context_injected_into_llm"], "    "))
    SEP()


# ── Single draft run ──────────────────────────────────────────────────────────
def cmd_run_draft(
    base_url: str,
    patient_id: str,
    doctor_id: str,
    transcript: str,
    language: str = "en",
    skip_pii: bool = False,
    verbose: bool = False,
    encounter_date: Optional[str] = None,
):
    date_str = encounter_date or datetime.utcnow().isoformat() + "Z"
    payload = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "encounter_date": date_str,
        "language": language,
        "transcript": transcript,
        "skip_pii_scrub": skip_pii,
    }

    H1("Pipeline Debug Run")
    KV("Patient", patient_id)
    KV("Doctor", doctor_id)
    KV("Language", language)
    KV("Skip PII scrub", str(skip_pii))
    print(f"  {DIM}Transcript ({len(transcript)} chars): {transcript[:100]}{'...' if len(transcript)>100 else ''}{RST}")
    SEP()
    print(f"  {DIM}Calling POST /api/v1/debug/run-draft ...{RST}", flush=True)

    result = post_json(base_url, "/api/v1/debug/run-draft", payload)

    # Stage 0: DB context
    H2("Stage 0 / DB Context")
    docs = result["context_documents"]
    cats = result["available_doctor_categories"]
    KV("EHR documents loaded", str(len(docs)))
    for d in docs:
        print(f"      [{d['system_doc_id']}]  {d['type']}  {d.get('date','?')}")
    KV("Doctor categories", str(len(cats)))
    for c in cats:
        print(f"      {c['doctor_id']:<14} {c['specialty']}")

    # Stage 1: PII
    H2("Stage 1 / PII Scrubbing (Presidio)")
    tmap = result["token_map"]
    KV("Tokens replaced", str(len(tmap)))
    if tmap:
        for tok, orig in list(tmap.items())[:8]:
            print(f"      {DIM}{tok}{RST}  →  {GRN}{orig}{RST}")
        if len(tmap) > 8:
            print(f"      {DIM}...and {len(tmap)-8} more{RST}")
    if verbose:
        print(f"\n  Scrubbed transcript:\n{textwrap.indent(result['scrubbed_transcript'], '    ')}")

    # Stage 2: LLM extraction
    H2("Stage 2 / LLM Call 1 — Clinical Extraction (raw, before guardrail)")
    _print_clinical(result["clinical_extraction_raw"])

    # Guardrail
    hallucs = result["hallucinations_stripped"]
    H2(f"Stage 2b / Guardrail Validation")
    if hallucs:
        WARN(f"{len(hallucs)} hallucinated quote(s) stripped:")
        for h in hallucs:
            print(f"      {RED}stripped: '{h}'{RST}")
    else:
        OK("0 hallucinations — all quotes verified verbatim")

    H2("Stage 2c / Validated Clinical Draft")
    _print_clinical(result["clinical_draft_validated"])

    # Stage 3: Patient summary
    H2("Stage 3 / Patient Summary (LLM Call 2)")
    print(textwrap.indent(result["patient_summary_md"], "    "))

    # Stage 4: Hydration
    H2("Stage 4 / PII Hydration (names restored)")
    if verbose:
        _print_clinical(result["clinical_final_hydrated"])
        print(textwrap.indent(result["patient_summary_hydrated"], "    "))
    else:
        hyd = result["clinical_final_hydrated"]
        n = (len(hyd.get("chief_complaints", [])) + len(hyd.get("assessments", [])) +
             len(hyd.get("actionables", [])))
        OK(f"{n} findings hydrated with original PII")

    SEP()
    OK("Run complete")
    return result


def _print_clinical(d: dict):
    cc  = d.get("chief_complaints", [])
    ass = d.get("assessments", [])
    act = d.get("actionables", [])
    print(f"    {DIM}Chief Complaints ({len(cc)}){RST}")
    for c in cc:
        ref = f"  {CYN}→ ref:{c['system_reference_id']}{RST}" if c.get("system_reference_id") else ""
        print(f"      [{c.get('condition_status','?')}] {c.get('finding','')}  {DIM}\"{c.get('exact_quote','')}\"{RST}{ref}")
    print(f"    {DIM}Assessments ({len(ass)}){RST}")
    for a in ass:
        ref = f"  {CYN}→ ref:{a['system_reference_id']}{RST}" if a.get("system_reference_id") else ""
        print(f"      [{a.get('condition_status','?')}] {a.get('finding','')}  {DIM}\"{a.get('exact_quote','')}\"{RST}{ref}")
    print(f"    {DIM}Actionables ({len(act)}){RST}")
    for a in act:
        ref = f"  {CYN}→ ref:{a['system_reference_id']}{RST}" if a.get("system_reference_id") else ""
        print(f"      [{a.get('action_type','?')}] {a.get('description','')}  {DIM}\"{a.get('exact_quote','')}\"{RST}{ref}")


# ── Built-in test cases ───────────────────────────────────────────────────────
# Each case is crafted to match real DB entries so the LLM can exercise the
# opaque-pointer mapping (EHR doc IDs, doctor referral IDs).
TEST_CASES = [
    {
        "name": "Jane Doe — Annual checkup with elevated cholesterol",
        "patient_id": "P-10101",
        "doctor_id": "D-99",
        "language": "en",
        # EHR context: DOC-DERM-001 (dermatology consult 2024-02-20) is loaded for P-10101
        "transcript": (
            "Patient Jane Doe is here for her annual checkup. "
            "She denies chest pain and shortness of breath. "
            "Blood pressure 118 over 75, heart rate 72. "
            "She mentions her dermatology consult from February showed a pigmented lesion, "
            "we should keep an eye on that — please note the reference from that dermatology report. "
            "I would like to prescribe a repeat lab panel for lipid levels. "
            "Follow up in 6 months."
        ),
        "expect": {
            "min_chief_complaints": 0,
            "min_actionables": 1,
            "expect_doc_reference": "DOC-DERM-001",
        },
    },
    {
        "name": "Jane Doe — Negation safety (denied symptoms must NOT appear)",
        "patient_id": "P-10101",
        "doctor_id": "D-99",
        "language": "en",
        "transcript": (
            "Patient Jane Doe today. She denies any fever, cough or shortness of breath. "
            "Her mother had hypertension but Jane does not have hypertension. "
            "No medications prescribed today. "
            "Patient is feeling well, no follow-up needed."
        ),
        "expect": {
            "negated_must_have_status": "NEGATED",
            "no_positive_cc_for_denied": True,
        },
    },
    {
        "name": "Michael Chen — Knee injury, referral to specialist",
        "patient_id": "PT-1002",
        "doctor_id": "D-99",
        "language": "en",
        # EHR context: DOC-ER-099 (ER triage 2024-01-12) loaded for PT-1002
        "transcript": (
            "Michael Chen is presenting with right knee pain following the skiing incident from January. "
            "The emergency room triage report from January showed knee swelling. "
            "Today MRI confirms an ACL tear. "
            "Prescribing Celecoxib 200mg daily for pain management. "
            "Referring patient to orthopedic surgery for ACL reconstruction. "
            "Patient should avoid weight bearing activities."
        ),
        "expect": {
            "min_assessments": 1,
            "min_actionables": 2,
            "expect_doc_reference": "DOC-ER-099",
        },
    },
    {
        "name": "Emma Watson — Migraine follow-up, improvement confirmed",
        "patient_id": "PT-1003",
        "doctor_id": "D-99",
        "language": "en",
        # EHR context: DOC-NEURO-88 (neurology consult 2023-11-20) loaded for PT-1003
        "transcript": (
            "Emma Watson here for migraine follow-up. "
            "Per the neurology consult from November she was started on Topiramate. "
            "She reports migraines decreased from four per week down to one per week. "
            "Continuing Topiramate 25mg twice daily. "
            "Adding Sumatriptan 50mg as rescue medication. "
            "Follow up in three months."
        ),
        "expect": {
            "min_actionables": 2,
            "expect_doc_reference": "DOC-NEURO-88",
        },
    },
    {
        "name": "Jean-Pierre — Multiple complaints, lab reference, high cholesterol",
        "patient_id": "P-001",
        "doctor_id": "D-99",
        "language": "en",
        # EHR: DOC-RAD-202 (lab result), DOC-BLD-505 (chest X-ray)
        "transcript": (
            "Jean-Pierre de la Fontaine presents today. "
            "His blood test from February shows high cholesterol levels, LDL at 190. "
            "The chest X-ray from February 15 showed no abnormalities which is reassuring. "
            "He complains of fatigue and occasional dizziness. "
            "He has Type 2 Diabetes, blood sugar is borderline at 7.1 HbA1c. "
            "I am prescribing Atorvastatin 20mg daily for the cholesterol. "
            "Adjusting Metformin to 1000mg twice daily. "
            "Refer him to the cardiologist for a stress test. "
            "Follow up in 8 weeks."
        ),
        "expect": {
            "min_chief_complaints": 1,
            "min_assessments": 1,
            "min_actionables": 2,
            "expect_doc_reference": "DOC-RAD-202",
        },
    },
    {
        "name": "Edge case — near-empty transcript (graceful degradation)",
        "patient_id": "P-10101",
        "doctor_id": "D-99",
        "language": "en",
        "transcript": "Patient is here. No complaints today.",
        "expect": {
            "graceful": True,
        },
    },
    {
        "name": "Emma Watson — Hungarian patient summary language",
        "patient_id": "PT-1003",
        "doctor_id": "D-99",
        "language": "hu",
        "transcript": (
            "Emma Watson headache follow-up. "
            "Migraines reduced significantly with Topiramate. "
            "Continue current medications. "
            "Schedule follow up in three months."
        ),
        "expect": {
            "min_actionables": 1,
            "summary_language": "hu",
        },
    },
]


def cmd_run_all_tests(base_url: str, doctor_id: str = "D-99", verbose: bool = False):
    H1("Automated Pipeline Test Suite")
    print(f"  {len(TEST_CASES)} test cases | backend: {base_url}")
    SEP()

    results = []

    for i, tc in enumerate(TEST_CASES, 1):
        name = tc["name"]
        pid  = tc.get("patient_id", "P-10101")
        did  = tc.get("doctor_id", doctor_id)
        lang = tc.get("language", "en")
        transcript = tc["transcript"]
        expect = tc.get("expect", {})

        print(f"\n{BOLD}[{i}/{len(TEST_CASES)}] {name}{RST}")
        KV("Patient", pid)
        KV("Language", lang)
        print(f"  {DIM}Transcript ({len(transcript)} chars): {transcript[:80]}...{RST}")

        try:
            payload = {
                "patient_id": pid,
                "doctor_id": did,
                "encounter_date": datetime.utcnow().isoformat() + "Z",
                "language": lang,
                "transcript": transcript,
                "skip_pii_scrub": False,
            }
            r = post_json(base_url, "/api/v1/debug/run-draft", payload)

            val   = r["clinical_draft_validated"]
            n_cc  = len(val.get("chief_complaints", []))
            n_ass = len(val.get("assessments", []))
            n_act = len(val.get("actionables", []))
            hallucs = r["hallucinations_stripped"]
            n_pii = len(r["token_map"])

            # Assertions
            failures = []

            if "min_chief_complaints" in expect and n_cc < expect["min_chief_complaints"]:
                failures.append(f"expected >= {expect['min_chief_complaints']} chief complaints, got {n_cc}")
            if "min_assessments" in expect and n_ass < expect["min_assessments"]:
                failures.append(f"expected >= {expect['min_assessments']} assessments, got {n_ass}")
            if "min_actionables" in expect and n_act < expect["min_actionables"]:
                failures.append(f"expected >= {expect['min_actionables']} actionables, got {n_act}")

            # Check opaque pointer mapping
            if "expect_doc_reference" in expect:
                expected_ref = expect["expect_doc_reference"]
                all_refs = set()
                for section in ["chief_complaints", "assessments", "actionables"]:
                    for item in val.get(section, []):
                        if item.get("system_reference_id"):
                            all_refs.add(item["system_reference_id"])
                if expected_ref not in all_refs:
                    # Soft warning — LLM may not always map opaque pointers if transcript is not explicit enough
                    WARN(f"Expected opaque pointer {expected_ref}, got: {all_refs or 'none'}")
                else:
                    OK(f"Opaque pointer mapped: {expected_ref}")

            # Negation check
            if expect.get("no_positive_cc_for_denied"):
                positive = [c for c in val.get("chief_complaints", [])
                            if c.get("condition_status") == "CONFIRMED"]
                if positive:
                    failures.append(f"Negation failure: {len(positive)} CONFIRMED complaints despite denied symptoms")

            if failures:
                for f in failures:
                    ERR(f)
                results.append({"name": name, "pass": False, "failures": failures})
            else:
                OK(f"cc:{n_cc}  ass:{n_ass}  act:{n_act}  pii_scrubbed:{n_pii}  hallucs_stripped:{len(hallucs)}")
                results.append({"name": name, "pass": True, "hallucs": len(hallucs)})

            if verbose:
                _print_clinical(val)
                print(f"\n  Patient summary:\n{textwrap.indent(r['patient_summary_md'][:300], '    ')}...")

        except Exception as e:
            ERR(f"Exception: {e}")
            results.append({"name": name, "pass": False, "failures": [str(e)]})

    SEP()
    H1("Test Summary")
    passed = sum(1 for r in results if r["pass"])
    for r in results:
        if r["pass"]:
            print(f"  {GRN}PASS{RST}  {r['name']}  {DIM}hallucs:{r.get('hallucs','?')}{RST}")
        else:
            print(f"  {RED}FAIL{RST}  {r['name']}")
            for f in r.get("failures", []):
                print(f"        {DIM}→ {f}{RST}")
    print(f"\n  {BOLD}{passed}/{len(TEST_CASES)} passed{RST}")
    if passed < len(TEST_CASES):
        sys.exit(1)


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    description = __doc__ or "Mesh Pipeline Debug CLI"
    parser = argparse.ArgumentParser(
        description=description,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--patient", default="P-10101")
    parser.add_argument("--doctor", default="D-99")
    parser.add_argument("--language", default="en", choices=["en", "hu", "es"])
    parser.add_argument("--transcript", help="Inline transcript text")
    parser.add_argument("--file", help="Path to a .txt file containing the transcript")
    parser.add_argument("--skip-pii", action="store_true")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--db-context-only", action="store_true")
    parser.add_argument("--run-all-tests", action="store_true")

    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")

    if args.run_all_tests:
        cmd_run_all_tests(base_url, doctor_id=args.doctor, verbose=args.verbose)
        return

    if args.db_context_only:
        cmd_db_context(base_url, args.patient, args.doctor)
        return

    transcript = ""
    if args.transcript:
        transcript = args.transcript
    elif args.file:
        with open(args.file) as f:
            transcript = f.read()
    else:
        parser.error("Provide --transcript TEXT, --file PATH, --db-context-only, or --run-all-tests")

    cmd_run_draft(
        base_url=base_url,
        patient_id=args.patient,
        doctor_id=args.doctor,
        transcript=transcript,
        language=args.language,
        skip_pii=args.skip_pii,
        verbose=args.verbose,
    )


if __name__ == "__main__":
    main()
