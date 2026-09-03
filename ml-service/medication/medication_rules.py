"""
NIHMS ML — medication_rules.py
Rule-based medication duplicate and collection alert system.
Does NOT recommend medications. Does NOT automatically block dispensing.
Flags for pharmacist/doctor review only.
"""
from datetime import datetime, timedelta
from typing import Optional

# Days within which same-drug collection = potential duplicate
DUPLICATE_WINDOW_DAYS = 28

# Drug classes — same class collected twice = possible therapeutic duplicate
DRUG_CLASSES = {
    "ace_inhibitors":   ["enalapril","lisinopril","ramipril","perindopril","captopril"],
    "arbs":             ["losartan","valsartan","telmisartan","irbesartan","candesartan"],
    "beta_blockers":    ["metoprolol","atenolol","bisoprolol","carvedilol","propranolol"],
    "statins":          ["simvastatin","atorvastatin","rosuvastatin","pravastatin","lovastatin"],
    "biguanides":       ["metformin"],
    "sulfonylureas":    ["glibenclamide","glipizide","glimepiride","gliclazide"],
    "nsaids":           ["ibuprofen","naproxen","diclofenac","celecoxib","aspirin"],
    "ssris":            ["fluoxetine","sertraline","citalopram","escitalopram","paroxetine"],
    "opioids":          ["morphine","codeine","tramadol","oxycodone","fentanyl"],
    "antibiotics_pen":  ["amoxicillin","ampicillin","penicillin","cloxacillin"],
    "antibiotics_quino":["ciprofloxacin","levofloxacin","moxifloxacin","norfloxacin"],
    "anticoagulants":   ["warfarin","rivaroxaban","dabigatran","apixaban"],
    "antihypertensives":["amlodipine","nifedipine","felodipine","verapamil","diltiazem"],
    "diuretics":        ["furosemide","hydrochlorothiazide","spironolactone","amiloride"],
    "antiretrovirals":  ["tenofovir","emtricitabine","lamivudine","efavirenz","dolutegravir","atazanavir"],
}

def _drug_class(name: str) -> Optional[str]:
    n = name.lower()
    for cls, drugs in DRUG_CLASSES.items():
        if any(d in n for d in drugs):
            return cls
    return None

def check_duplicate(current_drug: str, current_clinic: str, current_date: str,
                    history: list) -> dict:
    """
    current_drug:    name of the currently prescribed medication
    current_clinic:  clinic where the new prescription was issued
    current_date:    ISO date string of new prescription
    history:         list of past dispensing records, each with:
                     { drug, clinic, collected_date, dosage, quantity, frequency }

    Returns: { is_duplicate: bool, alerts: list, severity: str }
    """
    alerts = []
    current_class = _drug_class(current_drug)
    try:
        curr_dt = datetime.fromisoformat(current_date.replace("Z", "+00:00"))
    except Exception:
        curr_dt = datetime.utcnow()
    cutoff = curr_dt - timedelta(days=DUPLICATE_WINDOW_DAYS)

    for rec in history:
        try:
            rec_dt = datetime.fromisoformat(rec["collected_date"].replace("Z", "+00:00"))
        except Exception:
            continue
        if rec_dt < cutoff:
            continue

        same_drug = current_drug.lower() in rec["drug"].lower() or rec["drug"].lower() in current_drug.lower()
        same_class = current_class and _drug_class(rec["drug"]) == current_class
        cross_clinic = rec.get("clinic", "").lower() != current_clinic.lower()

        if same_drug:
            alerts.append({
                "type":       "exact_duplicate",
                "severity":   "HIGH",
                "message":    f"{current_drug} was collected {int((curr_dt - rec_dt).days)} days ago.",
                "previous":   rec,
                "cross_clinic": cross_clinic,
            })
        elif same_class:
            alerts.append({
                "type":       "therapeutic_duplicate",
                "severity":   "MEDIUM",
                "message":    f"Another {current_class.replace('_',' ')} ({rec['drug']}) was recently collected.",
                "previous":   rec,
                "cross_clinic": cross_clinic,
            })

    severity = "HIGH" if any(a["severity"] == "HIGH" for a in alerts) else \
               "MEDIUM" if alerts else "LOW"
    return {
        "is_duplicate": bool(alerts),
        "alerts":       alerts,
        "severity":     severity,
        "action":       "Please review the patient medication history before dispensing." if alerts else "No duplicate detected.",
        "final_decision": "Must be made by a qualified pharmacist or healthcare professional.",
        "model_version":  "medication-rules-v1",
    }
