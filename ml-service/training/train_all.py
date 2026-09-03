"""
NIHMS ML — train_all.py
Trains all models using synthetic data that mirrors the structure
of the Kaggle datasets. Run once to generate .pkl files.
Usage: python training/train_all.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, IsolationForest
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score, f1_score, classification_report

MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

np.random.seed(42)
N = 5000

def save(model, name):
    path = os.path.join(MODELS_DIR, f"{name}.pkl")
    joblib.dump(model, path)
    print(f"  Saved: {path}")

# ── 1. QUEUE / WAIT-TIME MODEL ──────────────────────────────────────────────
print("\n[1] Training wait-time model...")
hour       = np.random.randint(7, 18, N)
dow        = np.random.randint(0, 6, N)
queue_size = np.random.randint(0, 40, N)
staff      = np.random.randint(1, 10, N)
pat_type   = np.random.randint(0, 2, N)
dept       = np.random.randint(0, 10, N)
is_morning = (hour <= 11).astype(int)
is_monday  = (dow == 0).astype(int)

X_q = np.column_stack([hour, dow, queue_size, staff, pat_type, dept, is_morning, is_monday])
# Realistic wait time: base 5 + queue effect + morning peak + monday effect + noise
y_wait = (5 + queue_size * 2.5 - staff * 3 + is_morning * 8 + is_monday * 5 +
          np.random.normal(0, 4, N)).clip(2, 120)

X_tr, X_te, y_tr, y_te = train_test_split(X_q, y_wait, test_size=0.2)
rf_wait = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
rf_wait.fit(X_tr, y_tr)
y_pred = rf_wait.predict(X_te)
print(f"  MAE: {mean_absolute_error(y_te, y_pred):.1f} min | R²: {r2_score(y_te, y_pred):.3f}")
save(rf_wait, "queue_model")

# ── 2. PATIENT VOLUME MODEL ──────────────────────────────────────────────────
print("\n[2] Training patient volume model...")
dow_v  = np.random.randint(0, 7, N)
month  = np.random.randint(1, 13, N)
is_mon = (dow_v == 0).astype(int)
is_fri = (dow_v == 4).astype(int)
is_ms  = np.random.randint(0, 2, N)

X_v = np.column_stack([dow_v, month, is_mon, is_fri, is_ms])
y_vol = (80 + is_mon * 40 + is_fri * 20 + is_ms * 25 +
         np.random.randint(-15, 15, N)).clip(20, 250).astype(float)

X_tr, X_te, y_tr, y_te = train_test_split(X_v, y_vol, test_size=0.2)
rf_vol = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
rf_vol.fit(X_tr, y_tr)
y_pred = rf_vol.predict(X_te)
print(f"  MAE: {mean_absolute_error(y_te, y_pred):.1f} patients | R²: {r2_score(y_te, y_pred):.3f}")
save(rf_vol, "volume_model")

# ── 3. TRIAGE / RISK MODEL ────────────────────────────────────────────────────
print("\n[3] Training triage model...")
hr   = np.random.randint(40, 140, N).astype(float)
rr   = np.random.randint(8, 30, N).astype(float)
sbp  = np.random.randint(70, 200, N).astype(float)
temp = np.random.uniform(35.0, 40.5, N)
spo2 = np.random.uniform(85, 100, N)
avpu = np.random.choice([0, 0, 0, 1, 2, 3], N)
age  = np.random.randint(1, 90, N).astype(float)
sex  = np.random.randint(0, 2, N)

# NEWS2 composite score
def news_score(hr, rr, sbp, spo2, temp, avpu):
    s = np.zeros(len(hr))
    s += np.where(hr <= 40, 3, np.where(hr <= 50, 1, np.where(hr <= 90, 0, np.where(hr <= 110, 1, np.where(hr <= 130, 2, 3)))))
    s += np.where(rr <= 8,  3, np.where(rr <= 11, 1, np.where(rr <= 20, 0, np.where(rr <= 24, 2, 3))))
    s += np.where(sbp <= 90, 3, np.where(sbp <= 100, 2, np.where(sbp <= 110, 1, np.where(sbp <= 219, 0, 3))))
    s += np.where(spo2 <= 91, 3, np.where(spo2 <= 93, 2, np.where(spo2 <= 95, 1, 0)))
    s += np.where(temp <= 35.0, 2, np.where(temp <= 36.0, 1, np.where(temp <= 38.0, 0, np.where(temp <= 39.0, 1, 2))))
    s += avpu * 3
    return s

news2 = news_score(hr, rr, sbp, spo2, temp, avpu)
X_t = np.column_stack([hr, rr, sbp, temp, spo2, avpu, age, sex, news2])

# Risk label: LOW / MEDIUM / HIGH based on NEWS2
y_risk_raw = np.where(news2 <= 4, 0, np.where(news2 <= 7, 1, 2))
# Add noise
noise_mask = np.random.random(N) < 0.05
y_risk = np.where(noise_mask, np.random.randint(0, 3, N), y_risk_raw)

X_tr, X_te, y_tr, y_te = train_test_split(X_t, y_risk, test_size=0.2, stratify=y_risk)
rf_triage = RandomForestClassifier(n_estimators=150, max_depth=10, class_weight="balanced", random_state=42)
rf_triage.fit(X_tr, y_tr)
y_pred = rf_triage.predict(X_te)
print(f"  Accuracy: {accuracy_score(y_te, y_pred):.3f} | F1: {f1_score(y_te, y_pred, average='weighted'):.3f}")
save(rf_triage, "triage_model")

# ── 4. NO-SHOW MODEL ──────────────────────────────────────────────────────────
print("\n[4] Training no-show model...")
lead_days   = np.random.randint(0, 30, N)
age_ns      = np.random.randint(18, 80, N).astype(float)
prev_noshow = np.random.randint(0, 5, N)
sms_sent    = np.random.randint(0, 2, N)
dist_km     = np.random.randint(1, 50, N).astype(float)
dow_ns      = np.random.randint(0, 7, N)

X_ns = np.column_stack([lead_days, age_ns, prev_noshow, sms_sent, dist_km, dow_ns])
p_noshow = (0.10 + prev_noshow * 0.10 + lead_days * 0.01 - sms_sent * 0.08 + dist_km * 0.003).clip(0.02, 0.95)
y_ns = np.random.binomial(1, p_noshow, N)

X_tr, X_te, y_tr, y_te = train_test_split(X_ns, y_ns, test_size=0.2, stratify=y_ns)
rf_ns = RandomForestClassifier(n_estimators=100, max_depth=6, class_weight="balanced", random_state=42)
rf_ns.fit(X_tr, y_tr)
y_pred = rf_ns.predict(X_te)
print(f"  Accuracy: {accuracy_score(y_te, y_pred):.3f} | F1: {f1_score(y_te, y_pred, average='weighted'):.3f}")
save(rf_ns, "no_show_model")

# ── 5. ANOMALY DETECTION MODEL (Isolation Forest) ─────────────────────────────
print("\n[5] Training anomaly detection model...")
# Features: daily cancellations, no-shows, new registrations, avg wait, queue size
norm_data = np.column_stack([
    np.random.randint(5, 18, N),    # cancellations (normal 8-15)
    np.random.randint(10, 35, N),   # no-shows
    np.random.randint(50, 150, N),  # registrations
    np.random.randint(15, 45, N),   # avg wait
    np.random.randint(5, 35, N),    # queue size
])
iso = IsolationForest(contamination=0.05, random_state=42, n_estimators=100)
iso.fit(norm_data)
print(f"  Isolation Forest fitted on {N} samples")
save(iso, "anomaly_model")

print("\n✅ All models trained and saved to ml-service/models/")
print("   queue_model.pkl | volume_model.pkl | triage_model.pkl | no_show_model.pkl | anomaly_model.pkl")
