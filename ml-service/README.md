# NIHMS ML Service

Decision-support ML for the National Integrated Healthcare Management System.

## Architecture

```
Browser → Node.js (port 5000) → FastAPI ML Service (port 8000)
```

The frontend NEVER contacts FastAPI directly. All ML calls go through Node.js.

## Quick Start

### 1. Install Python dependencies
```bash
cd ml-service
pip install -r requirements.txt
```

### 2. Train models (run once)
```bash
python training/train_all.py
```

### 3. Start ML service
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Add ML route to Node.js backend

In `backend/server.js`:
```js
app.use('/api/v1/ml', require('./routes/ml'));
```

Copy `backend_ml_route.js` to `backend/routes/ml.js`.

### 5. Add ML_SERVICE_HOST to backend/.env
```env
ML_SERVICE_HOST=localhost
ML_SERVICE_PORT=8000
```

### 6. Add frontend script to index.html
```html
<script src="js/ml.js"></script>
```

Copy `frontend_ml.js` to `frontend/js/ml.js`.

## Models

| Model | Type | MAE/Accuracy | Version |
|---|---|---|---|
| Wait-time | Random Forest Regressor | MAE: 3.3 min, R²: 0.979 | queue-v1 |
| Patient volume | Random Forest Regressor | MAE: 7.5 patients, R²: 0.832 | volume-v1 |
| Triage/Risk | Random Forest Classifier | Accuracy: 97.4%, F1: 0.974 | triage-v1 |
| No-show | Random Forest Classifier | Accuracy: 63.6% | no-show-v1 |
| Anomaly detection | Isolation Forest | Contamination: 5% | anomaly-v1 |

## Endpoints

| Method | Path | Role |
|---|---|---|
| GET | `/health` | All |
| POST | `/predict/wait-time` | Patient, Receptionist |
| POST | `/predict/queue-congestion` | Receptionist, Admin |
| POST | `/predict/patient-volume` | Admin, Facility Admin |
| POST | `/predict/staff-demand` | Admin |
| POST | `/predict/triage` | Doctor, Nurse |
| POST | `/predict/vital-trend` | Doctor |
| POST | `/predict/laboratory` | Doctor, Lab |
| POST | `/predict/medication` | Pharmacy, Doctor |
| POST | `/predict/no-show` | Receptionist |
| POST | `/predict/anomaly` | Admin |
| POST | `/advice` | All |

## Safety

This system is DECISION-SUPPORT ONLY. It:
- Never diagnoses
- Never prescribes
- Never automatically cancels appointments
- Never blocks medication dispensing
- Always defers final decisions to qualified healthcare professionals

## Frontend ML API

```js
// Patient queue panel
ML.renderPatientQueueML('container-id', { position: 3, queueSize: 12, staffCount: 4 });

// Doctor triage panel
ML.renderDoctorTriageML('container-id', { hr: 98, sbp: 145, spo2: 94, temp: 38.2 });

// Admin panel
ML.renderAdminML('container-id');

// Medication check
ML.renderMedicationML('container-id', { drug: 'Metformin 500mg', clinic: 'Johannesburg CHC', history: [...] });
```

## Privacy and POPIA

- No patient names, ID numbers, or contact details are used for ML training
- All training data is synthetic
- Patient data passed to predictions is used only for that prediction
- ML service logs do not include patient PII
