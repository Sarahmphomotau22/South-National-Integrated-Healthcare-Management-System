"""
NIHMS ML Service — FastAPI main.py
Runs on port 8000. Only accessible via Node.js backend (not exposed to frontend).
Start: uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any
import numpy as np
import joblib
from datetime import datetime

from preprocessing.preprocessing import queue_features, triage_features, check_lab, analyse_vital_trend, volume_features
from medication.medication_rules import check_duplicate
from advice.advice_engine import get_advice

# ── Load models ──────────────────────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

def load_model(name):
    path = os.path.join(MODELS_DIR, f"{name}.pkl")
    if os.path.exists(path):
        return joblib.load(path)
    return None

queue_model   = load_model("queue_model")
volume_model  = load_model("volume_model")
triage_model  = load_model("triage_model")
no_show_model = load_model("no_show_model")
anomaly_model = load_model("anomaly_model")

RISK_LABELS = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
STATUS_LABELS = {
    "wait_minutes": lambda m: "LOW" if m < 20 else "MEDIUM" if m < 45 else "HIGH",
    "queue_size":   lambda q: "LOW" if q < 10 else "MEDIUM" if q < 25 else "HIGH",
    "volume":       lambda v: "LOW" if v < 80 else "MEDIUM" if v < 150 else "HIGH",
}

app = FastAPI(title="NIHMS ML Service", version="1.0.0", description="Decision-support ML for NIHMS — not diagnostic")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5000","http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])

# ── Pydantic models ──────────────────────────────────────────────────────────
class QueueInput(BaseModel):
    hour: Optional[int] = None
    day_of_week: Optional[int] = None
    queue_size: int = 5
    staff_count: int = 3
    patient_type: int = 0
    dept_id: int = 0
    role: str = "receptionist"

class VolumeInput(BaseModel):
    day_of_week: Optional[int] = None
    month: Optional[int] = None
    day_of_month: int = 15
    role: str = "admin"

class TriageInput(BaseModel):
    hr: float = 80
    rr: float = 16
    sbp: float = 120
    temp: float = 36.6
    spo2: float = 98
    avpu: int = 0
    age: float = 35
    sex: int = 0
    role: str = "doctor"

class VitalTrendInput(BaseModel):
    readings: List[Any]
    role: str = "doctor"

class LabInput(BaseModel):
    test: str
    value: float
    sex: str = "female"
    role: str = "doctor"

class MedicationInput(BaseModel):
    current_drug: str
    current_clinic: str
    current_date: str
    history: List[Any] = []
    role: str = "pharmacy"

class NoShowInput(BaseModel):
    lead_days: int = 7
    age: float = 35
    prev_no_shows: int = 0
    sms_sent: int = 0
    distance_km: float = 10
    day_of_week: int = 1
    role: str = "receptionist"

class AnomalyInput(BaseModel):
    daily_cancellations: int = 10
    daily_no_shows: int = 20
    new_registrations: int = 80
    avg_wait_minutes: int = 25
    avg_queue_size: int = 15
    role: str = "admin"

class AdviceInput(BaseModel):
    feature: str
    role: str
    prediction: Any

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "NIHMS ML Service", "version": "1.0.0",
            "models": {
                "queue":    queue_model   is not None,
                "volume":   volume_model  is not None,
                "triage":   triage_model  is not None,
                "no_show":  no_show_model is not None,
                "anomaly":  anomaly_model is not None,
            }}

@app.post("/predict/wait-time")
def predict_wait_time(body: QueueInput):
    if queue_model is None:
        raise HTTPException(503, "Wait-time model not loaded")
    X = queue_features(body.dict())
    mins = float(np.clip(queue_model.predict(X)[0], 2, 120))
    status = STATUS_LABELS["wait_minutes"](mins)
    pred = {"wait_minutes": round(mins), "queue_size": body.queue_size, "status": status, "model_version": "queue-v1"}
    return {**pred, "advice": get_advice("wait_time", body.role, pred), "disclaimer": "Decision-support only."}

@app.post("/predict/queue-congestion")
def predict_congestion(body: QueueInput):
    if queue_model is None:
        raise HTTPException(503, "Queue model not loaded")
    now = body.queue_size
    # Predict 60-min queue using volume growth model
    X_now  = queue_features(body.dict())
    X_fut  = queue_features({**body.dict(), "hour": min(17, (body.hour or datetime.now().hour) + 1), "queue_size": int(now * 1.3)})
    fut    = int(np.clip(queue_model.predict(X_fut)[0] / 2.5 + now, now, now * 3))
    risk   = "HIGH" if fut > 25 else "MEDIUM" if fut > 12 else "LOW"
    now_h  = datetime.now().hour
    peak   = f"{now_h + 1:02d}:00 – {now_h + 2:02d}:00"
    pred   = {"current_queue": now, "predicted_queue_60min": fut, "congestion_risk": risk, "peak_period": peak, "model_version": "queue-v1"}
    return {**pred, "advice": get_advice("congestion", body.role, pred), "disclaimer": "Decision-support only."}

@app.post("/predict/patient-volume")
def predict_volume(body: VolumeInput):
    if volume_model is None:
        raise HTTPException(503, "Volume model not loaded")
    now = datetime.now()
    d = body.dict()
    d.setdefault("day_of_week", now.weekday())
    d.setdefault("month", now.month)
    X_today = volume_features(d)
    X_tmrw  = volume_features({**d, "day_of_week": (d["day_of_week"] + 1) % 7})
    today = int(np.clip(volume_model.predict(X_today)[0], 20, 300))
    tmrw  = int(np.clip(volume_model.predict(X_tmrw)[0], 20, 300))
    load  = STATUS_LABELS["volume"](tmrw)
    now_h = now.hour
    peak  = "08:00 – 11:00" if d["day_of_week"] in (0, 1) else "09:00 – 12:00"
    pred  = {"today_volume": today, "tomorrow_volume": tmrw, "queue_load": load, "peak_period": peak, "model_version": "volume-v1"}
    return {**pred, "advice": get_advice("volume", body.role, pred), "disclaimer": "Decision-support only."}

@app.post("/predict/staff-demand")
def predict_staff(body: VolumeInput):
    if volume_model is None:
        raise HTTPException(503, "Volume model not loaded")
    d = body.dict()
    d.setdefault("day_of_week", datetime.now().weekday())
    d.setdefault("month", datetime.now().month)
    X   = volume_features(d)
    vol = int(np.clip(volume_model.predict(X)[0], 20, 300))
    # 1 staff per 20 patients as heuristic
    needed = max(2, round(vol / 20))
    demand = "HIGH" if vol > 140 else "MEDIUM" if vol > 80 else "LOW"
    pred   = {"period": "08:00 – 11:00", "expected_patients": vol, "current_staff": 8, "recommended_staff": needed, "demand_level": demand, "model_version": "volume-v1"}
    return {**pred, "advice": get_advice("staff", body.role, pred), "disclaimer": "Planning recommendation only — not an instruction to change schedules."}

@app.post("/predict/triage")
def predict_triage(body: TriageInput):
    if triage_model is None:
        raise HTTPException(503, "Triage model not loaded")
    X = triage_features(body.dict())
    label_idx  = int(triage_model.predict(X)[0])
    proba      = triage_model.predict_proba(X)[0]
    risk       = RISK_LABELS[label_idx]
    confidence = round(float(proba[label_idx]), 2)
    news2      = float(X[0][-1])
    pred       = {"risk_level": risk, "confidence": confidence, "news2_score": news2, "model_version": "triage-v1"}
    return {**pred, "advice": get_advice("triage", body.role, pred),
            "disclaimer": "This is a clinical decision-support tool only. It does not replace professional assessment."}

@app.post("/predict/vital-trend")
def predict_vital_trend(body: VitalTrendInput):
    result = analyse_vital_trend(body.readings)
    return {**result, "advice": get_advice("vital_trend", body.role, result),
            "model_version": "vitals-v1",
            "disclaimer": "Clinical review recommended for any concerning trend. This tool does not diagnose."}

@app.post("/predict/laboratory")
def predict_lab(body: LabInput):
    result = check_lab(body.test, body.value, body.sex)
    pred   = {**result, "test": body.test, "value": body.value, "model_version": "lab-v1"}
    return {**pred, "advice": get_advice("laboratory", body.role, pred),
            "disclaimer": "Laboratory reference ranges are for guidance only. Clinical interpretation required."}

@app.post("/predict/medication")
def predict_medication(body: MedicationInput):
    result = check_duplicate(body.current_drug, body.current_clinic, body.current_date, body.history)
    return {**result, "advice": get_advice("medication", body.role, result)}

@app.post("/predict/no-show")
def predict_no_show(body: NoShowInput):
    if no_show_model is None:
        raise HTTPException(503, "No-show model not loaded")
    X = np.array([[body.lead_days, body.age, body.prev_no_shows, body.sms_sent, body.distance_km, body.day_of_week]])
    proba = float(no_show_model.predict_proba(X)[0][1])
    risk  = "HIGH" if proba > 0.6 else "MEDIUM" if proba > 0.35 else "LOW"
    pred  = {"risk": risk, "probability": round(proba, 2), "count": 1, "model_version": "no-show-v1"}
    return {**pred, "advice": get_advice("no_show", body.role, pred),
            "disclaimer": "No appointments are automatically cancelled based on this prediction."}

@app.post("/predict/anomaly")
def predict_anomaly(body: AnomalyInput):
    if anomaly_model is None:
        raise HTTPException(503, "Anomaly model not loaded")
    X = np.array([[body.daily_cancellations, body.daily_no_shows, body.new_registrations, body.avg_wait_minutes, body.avg_queue_size]])
    score     = float(anomaly_model.score_samples(X)[0])
    is_anomaly= bool(anomaly_model.predict(X)[0] == -1)
    severity  = "HIGH" if score < -0.15 else "MEDIUM" if score < -0.05 else "LOW"

    # Identify which field is most unusual
    thresholds = {"daily_cancellations": (8,15), "daily_no_shows": (10,30), "new_registrations": (50,150), "avg_wait_minutes": (10,40), "avg_queue_size": (5,30)}
    anomalous  = [k for k, (lo, hi) in thresholds.items() if not (lo <= getattr(body, k) <= hi)]
    desc = f"Unusual pattern detected in: {', '.join(anomalous).replace('_',' ')}." if anomalous else "Unusual operational pattern detected."

    pred = {"is_anomaly": is_anomaly, "severity": severity if is_anomaly else "LOW",
            "category":   anomalous[0] if anomalous else "general_operations",
            "description": desc, "score": round(score, 4), "model_version": "anomaly-v1"}
    return {**pred, "advice": get_advice("anomaly", body.role, pred),
            "disclaimer": "Anomaly detection identifies patterns for review only. No automatic action is taken."}

@app.post("/advice")
def get_advice_endpoint(body: AdviceInput):
    return {"advice": get_advice(body.feature, body.role, body.prediction),
            "disclaimer": "Decision-support only — does not replace clinical judgement."}
