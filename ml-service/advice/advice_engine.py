"""
NIHMS ML — advice_engine.py
Converts ML predictions into role-specific, plain-language recommendations.
All language is decision-support only — never diagnostic.
"""

DISCLAIMER = "This is a decision-support tool only and does not replace professional clinical judgement."

def wait_time_advice(role: str, pred: dict) -> str:
    mins  = pred.get("wait_minutes", 0)
    status= pred.get("status", "MEDIUM")
    if role == "patient":
        return f"There are approximately {pred.get('queue_size',0)} patients ahead of you. Estimated waiting time: {mins} minutes. Queue status: {status}."
    if role == "receptionist":
        return f"Current queue: {pred.get('queue_size',0)} patients. Estimated waiting time: {mins} minutes. Congestion: {status}." + (" Consider advising patients of the delay." if status == "HIGH" else "")
    return f"Queue status: {status}. Estimated wait: {mins} minutes."

def congestion_advice(role: str, pred: dict) -> str:
    now  = pred.get("current_queue", 0)
    fut  = pred.get("predicted_queue_60min", 0)
    risk = pred.get("congestion_risk", "MEDIUM")
    peak = pred.get("peak_period", "")
    msg  = f"Current queue: {now} patients. Predicted queue in 60 minutes: {fut} patients. Congestion risk: {risk}."
    if risk == "HIGH":
        if role in ("receptionist", "admin", "facility_admin"):
            msg += f" Consider preparing reception and queue management for increased patient arrivals."
        if peak:
            msg += f" Expected peak: {peak}."
    return msg

def volume_advice(role: str, pred: dict) -> str:
    today = pred.get("today_volume", 0)
    tmrw  = pred.get("tomorrow_volume", 0)
    peak  = pred.get("peak_period", "")
    load  = pred.get("queue_load", "MEDIUM")
    change_pct = round((tmrw - today) / today * 100) if today else 0
    sign  = "+" if change_pct >= 0 else ""
    msg   = f"Patient demand today: {today}. Tomorrow: {tmrw} ({sign}{change_pct}%). Expected queue load: {load}."
    if peak:
        msg += f" Peak period: {peak}."
    if load == "HIGH" and role in ("admin", "facility_admin"):
        msg += " Consider reviewing staffing and clinic resources for the predicted peak period."
    return msg

def staff_advice(role: str, pred: dict) -> str:
    period  = pred.get("period", "")
    exp_pat = pred.get("expected_patients", 0)
    curr_st = pred.get("current_staff", 0)
    demand  = pred.get("demand_level", "MEDIUM")
    msg = f"Period: {period}. Expected patients: {exp_pat}. Current staff: {curr_st}. Predicted demand: {demand}."
    if demand == "HIGH":
        msg += " Consider increasing staff availability during this peak period."
    msg += " This is a planning recommendation only."
    return msg

def triage_advice(role: str, pred: dict) -> str:
    risk   = pred.get("risk_level", "LOW")
    news2  = pred.get("news2_score", 0)
    msg    = f"Patient risk level: {risk}."
    if risk == "HIGH":
        msg += " Prioritise this patient for clinical assessment."
    elif risk == "MEDIUM":
        msg += " Monitor the patient closely and reassess if condition changes."
    else:
        msg += " Continue routine monitoring."
    msg += f" ({DISCLAIMER})"
    return msg

def vital_trend_advice(role: str, pred: dict) -> str:
    alerts   = pred.get("alerts", [])
    severity = pred.get("severity", "LOW")
    action   = pred.get("action", "")
    if not alerts:
        return "Vital signs are stable. No concerning trends detected."
    names = ", ".join(a["vital"] for a in alerts)
    dirs  = ", ".join(f"{a['vital']} {a['direction']}" for a in alerts)
    msg   = f"Concerning vital sign trend detected. Changes: {dirs}. Severity: {severity}. {action} ({DISCLAIMER})"
    return msg

def lab_advice(role: str, pred: dict) -> str:
    test   = pred.get("test", "")
    value  = pred.get("value", "")
    status = pred.get("status", "normal")
    flag   = pred.get("flag", "")
    lo     = pred.get("low"); hi = pred.get("high")
    ref    = f"Reference range: {lo}–{hi}." if lo is not None and hi is not None else ""
    if status == "normal":
        return f"{test}: {value}. {ref} Result within reference range."
    msg = f"Laboratory alert. Test: {test}. Result: {value}. {ref} Status: {flag}. Clinical review recommended. ({DISCLAIMER})"
    return msg

def medication_advice(role: str, pred: dict) -> str:
    if not pred.get("is_duplicate"):
        return "No duplicate medication detected."
    alerts = pred.get("alerts", [])
    parts  = []
    for a in alerts:
        prev = a.get("previous", {})
        parts.append(
            f"Potential duplicate: {prev.get('drug','Unknown')} was collected from {prev.get('clinic','unknown clinic')} on {prev.get('collected_date','unknown date')}."
        )
    msg = " ".join(parts)
    msg += " Please review the patient medication history before dispensing. Final decision must be made by a qualified pharmacist or healthcare professional."
    return msg

def anomaly_advice(role: str, pred: dict) -> str:
    category = pred.get("category", "").replace("_", " ")
    severity = pred.get("severity", "MEDIUM")
    desc     = pred.get("description", "")
    msg      = f"System anomaly detected: {category}. Severity: {severity}. {desc} This requires administrator review."
    return msg

def no_show_advice(role: str, pred: dict) -> str:
    risk  = pred.get("risk", "LOW")
    count = pred.get("count", 0)
    if role == "receptionist" and risk == "HIGH":
        return f"High no-show risk: {count} appointments. Consider sending appointment reminders. The system will not automatically cancel any appointments based on this prediction."
    return f"No-show risk: {risk}. {count} appointments flagged."

def get_advice(feature: str, role: str, prediction: dict) -> str:
    fn = {
        "wait_time":       wait_time_advice,
        "congestion":      congestion_advice,
        "volume":          volume_advice,
        "staff":           staff_advice,
        "triage":          triage_advice,
        "vital_trend":     vital_trend_advice,
        "laboratory":      lab_advice,
        "medication":      medication_advice,
        "anomaly":         anomaly_advice,
        "no_show":         no_show_advice,
    }.get(feature)
    if fn:
        return fn(role, prediction)
    return "Prediction available. Please review with a qualified healthcare professional."
