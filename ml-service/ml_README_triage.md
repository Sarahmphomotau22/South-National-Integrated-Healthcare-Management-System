# NIHMS Triage ML Service — v2.0

## Dataset
**File:** `patients_data_with_alerts.xlsx`  
**Records:** 50,000  
**Source:** IoMT Dataset for ML-Based Health Monitoring (Kaggle dsv/7736523)

### Dataset Columns (actual, not assumed)
| Column | Type | Range |
|--------|------|-------|
| Patient Number | int | 1–50000 |
| Heart Rate (bpm) | int | 60–149 |
| SpO2 Level (%) | int | ~80–100 |
| Systolic Blood Pressure (mmHg) | int | ~70–200 |
| Diastolic Blood Pressure (mmHg) | int | ~60–130 |
| Body Temperature (°C) | float | 35.0–40.5 |
| Fall Detection | str | Yes / No |
| Predicted Disease | str | Normal / Asthma / Diabetes Mellitus / Arrhythmia / Hypertension |
| Data Accuracy (%) | int | 80–99 |
| Heart Rate Alert | str | High / Normal |
| SpO2 Level Alert | str | Low / Normal |
| Blood Pressure Alert | str | High / Normal |
| Temperature Alert | str | Normal / Abnormal |

## Features Used (NIHMS field → Dataset column)
| NIHMS field | Dataset column |
|-------------|---------------|
| heartRate | Heart Rate (bpm) |
| spo2 | SpO2 Level (%) |
| systolicBP | Systolic Blood Pressure (mmHg) |
| diastolicBP | Diastolic Blood Pressure (mmHg) |
| temperature | Body Temperature (°C) |

**Not used:** Fall Detection, Predicted Disease, Data Accuracy (not vital signs)  
**Not used in features:** Alert columns (used only to build target variable — no leakage)

## Target Variable
No single risk/outcome column existed. Target derived from 4 alert columns:

```
alert_score = count of (Heart Rate Alert, SpO2 Alert, BP Alert, Temp Alert) that are abnormal
risk_level  = LOW (score=0) | MEDIUM (score=1) | HIGH (score≥2)
```

**Distribution:**
- HIGH: 36,335 (72.7%)
- MEDIUM: 11,231 (22.5%)
- LOW: 2,434 (4.9%)

## Preprocessing
- No missing values (confirmed via EDA)
- No duplicate rows (confirmed)
- Features: raw numerical vitals only
- No scaling needed for Decision Tree (but scaler saved for API compatibility)
- Train/test split: 80/20, stratified, random_seed=42

## Models Tested & Results

| Model | Accuracy | F1 (wt) | HIGH Recall | HIGH F1 |
|-------|----------|---------|------------|---------|
| Logistic Regression | 0.7600 | 0.7776 | 0.8060 | 0.8671 |
| **Decision Tree** | **0.9999** | **0.9999** | **1.0000** | **0.9999** |
| Random Forest | 0.9999 | 0.9999 | 1.0000 | 0.9999 |
| Gradient Boosting | 0.9999 | 0.9999 | 0.9999 | 0.9999 |

## Selected Model: Decision Tree (max_depth=8)

**Why Decision Tree over Random Forest:**
- Identical performance (both ~100% HIGH recall)
- Decision Tree is interpretable — the learned splits correspond directly to clinical thresholds (HR>100, SpO2≤89, SBP>140)
- Faster inference, no ensemble overhead
- The dataset has deterministic alert rules so a shallow tree captures the full pattern

**Verification:** Trained on raw vitals only (no alert columns as features) — perfect score confirmed, no leakage.

## Feature Importances
| Feature | Importance |
|---------|-----------|
| Body Temperature (°C) | 0.2944 |
| SpO2 Level (%) | 0.2372 |
| Systolic Blood Pressure (mmHg) | 0.1782 |
| Heart Rate (bpm) | 0.1761 |
| Diastolic Blood Pressure (mmHg) | 0.1140 |

## Model Files
- `triage_model.pkl` — trained Decision Tree
- `triage_scaler.pkl` — StandardScaler (saved for API compatibility)
- `triage_label_encoder.pkl` — LabelEncoder (HIGH=0, LOW=1, MEDIUM=2)
- `triage_model_metadata.json` — full metadata with actual metrics

## API Usage

### FastAPI
```bash
cd ml-service
uvicorn ml_api_triage:app --host 0.0.0.0 --port 8000 --reload
```

### Predict endpoint
```
POST /predict/triage
{
  "heartRate": 112,
  "spo2": 91,
  "systolicBP": 168,
  "diastolicBP": 104,
  "temperature": 38.1,
  "role": "nurse"
}
```

### Node.js → FastAPI
```
POST /api/v1/ml/triage   (requires JWT, role: doctor/nurse/admin)
```

### MongoDB
Predictions stored in `aipredictions` collection via `AIPrediction` model.

## Model Limitations
1. Trained on IoMT synthetic/simulated dataset — not validated on real clinical patient data
2. Does not use age, sex, respiratory rate (not in dataset)
3. HIGH-risk class is majority (72.7%) — reflects dataset design
4. **This model is a clinical decision-support tool only**

## Safety Statement
> AI predictions are provided for clinical decision-support purposes only and do not replace professional medical assessment, diagnosis or treatment.

Receptionist and Patient roles are blocked from accessing predictions.
