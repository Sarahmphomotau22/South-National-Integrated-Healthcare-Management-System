"""
NIHMS ML Service — FastAPI triage endpoint
Model: Decision Tree trained on patients_data_with_alerts.xlsx (50,000 records)
Features: Heart Rate, SpO2, Systolic BP, Diastolic BP, Body Temperature
Target: risk_level — LOW / MEDIUM / HIGH

SAFETY: Clinical decision-support only. Does not diagnose diseases or replace
professional medical judgment.

Start: uvicorn ml_api_triage:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, List
import numpy as np
import joblib
import os
import json
from datetime import datetime

# ── Load model artifacts ──────────────────────────────────────────────────────
BASE = os.path.dirname(__file__)

def _load(name):
    p = os.path.join(BASE, name)
    if os.path.exists(p):
        return joblib.load(p)
    return None

model   = _load('triage_model.pkl')
scaler  = _load('triage_scaler.pkl')    # not used for DT but kept for API compatibility
le      = _load('triage_label_encoder.pkl')

with open(os.path.join(BASE, 'triage_model_metadata.json')) as f:
    META = json.load(f)

MODEL_LOADED = model is not None and le is not None

# ── Clinical thresholds (for abnormal vital explanations) ─────────────────────
THRESHOLDS = {
    'heartRate':    {'high': 100, 'low': 60,   'unit': 'bpm',  'label': 'Heart Rate'},
    'spo2':         {'high': None,'low': 90,    'unit': '%',    'label': 'SpO₂'},
    'systolicBP':   {'high': 140, 'low': 90,   'unit': 'mmHg', 'label': 'Systolic BP'},
    'diastolicBP':  {'high': 90,  'low': 60,   'unit': 'mmHg', 'label': 'Diastolic BP'},
    'temperature':  {'high': 37.5,'low': 36.0, 'unit': '°C',   'label': 'Body Temperature'},
}

def check_abnormal(field, value):
    t = THRESHOLDS.get(field)
    if not t: return None
    if t['high'] and value > t['high']:
        return {'vital': t['label'], 'value': f"{value} {t['unit']}",
                'status': 'HIGH', 'reason': f"{t['label']} above threshold (>{t['high']} {t['unit']})"}
    if t['low'] and value < t['low']:
        return {'vital': t['label'], 'value': f"{value} {t['unit']}",
                'status': 'LOW',  'reason': f"{t['label']} below threshold (<{t['low']} {t['unit']})"}
    return None

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NIHMS Triage ML Service",
    version="2.0.0",
    description="Decision-support ML — NOT a diagnostic tool"
)
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5000","http://localhost:3000"],
    allow_methods=["*"], allow_headers=["*"])

# ── Schemas ───────────────────────────────────────────────────────────────────
class TriageRequest(BaseModel):
    heartRate:       Optional[float] = None
    spo2:            Optional[float] = None
    systolicBP:      Optional[float] = None
    diastolicBP:     Optional[float] = None
    temperature:     Optional[float] = None
    role:            str = "nurse"

class VitalFlag(BaseModel):
    vital:  str
    value:  str
    status: str
    reason: str

class TriageResponse(BaseModel):
    success:        bool
    riskLevel:      Optional[str] = None
    confidence:     Optional[float] = None
    abnormalVitals: List[dict] = []
    reasons:        List[str] = []
    aiRiskNote:     str = ""
    modelVersion:   str = META.get("modelVersion","triage-v2.0")
    error:          Optional[str] = None

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":       "ok" if MODEL_LOADED else "degraded",
        "modelLoaded":  MODEL_LOADED,
        "modelVersion": META.get("modelVersion"),
        "modelType":    META.get("modelType"),
        "dataset":      META.get("dataset"),
        "accuracy":     META.get("accuracy"),
        "f1Score":      META.get("f1Score"),
        "highRiskRecall": META.get("highRiskRecall"),
        "timestamp":    datetime.utcnow().isoformat()+"Z",
        "safetyNote":   META.get("safetyNote"),
    }

# ── Predict ───────────────────────────────────────────────────────────────────
@app.post("/predict/triage", response_model=TriageResponse)
def predict_triage(req: TriageRequest):
    if not MODEL_LOADED:
        return TriageResponse(
            success=False,
            error="ML prediction is currently unavailable. The existing NIHMS functionality is still available. Please try again later.",
            aiRiskNote="ML service offline."
        )

    # Role check — only doctors and nurses
    if req.role not in ("doctor","nurse","admin"):
        raise HTTPException(status_code=403, detail="Access denied. Clinical roles only.")

    # Check required fields
    required = {
        'heartRate': req.heartRate,
        'spo2':      req.spo2,
        'systolicBP':req.systolicBP,
        'diastolicBP':req.diastolicBP,
        'temperature':req.temperature,
    }
    missing = [k for k,v in required.items() if v is None]
    if missing:
        return TriageResponse(
            success=False,
            error=f"Insufficient information to generate this prediction. Missing: {', '.join(missing)}. Please verify the required information.",
            aiRiskNote=""
        )

    # Detect abnormal vitals using clinical thresholds
    abnormal = []
    reasons  = []
    for field, value in required.items():
        flag = check_abnormal(field, value)
        if flag:
            abnormal.append(flag)
            reasons.append(flag['reason'])

    # Build feature vector — must match training order exactly
    # Training order: HR, SpO2, SysBP, DiaBP, Temp
    X = np.array([[
        req.heartRate,
        req.spo2,
        req.systolicBP,
        req.diastolicBP,
        req.temperature,
    ]])

    try:
        pred      = model.predict(X)[0]
        risk      = le.inverse_transform([pred])[0]  # 'HIGH' / 'LOW' / 'MEDIUM'

        # Confidence from predict_proba if supported
        confidence = None
        if hasattr(model, 'predict_proba'):
            proba      = model.predict_proba(X)[0]
            confidence = round(float(max(proba)), 4)

    except Exception as e:
        return TriageResponse(
            success=False,
            error=f"Prediction error: {str(e)}",
            aiRiskNote="Error during ML prediction."
        )

    # Build AI risk note
    if risk == 'HIGH':
        note = "Multiple potentially abnormal vital measurements detected — immediate clinical review recommended."
    elif risk == 'MEDIUM':
        note = "Potentially abnormal vital signs detected — clinical review recommended."
    else:
        note = "Vital signs appear within normal ranges. Continue standard monitoring."

    return TriageResponse(
        success=True,
        riskLevel=risk,
        confidence=confidence,
        abnormalVitals=abnormal,
        reasons=reasons,
        aiRiskNote=note,
        modelVersion=META.get("modelVersion","triage-v2.0"),
    )

# ── Model info ────────────────────────────────────────────────────────────────
@app.get("/model/info")
def model_info():
    return META
