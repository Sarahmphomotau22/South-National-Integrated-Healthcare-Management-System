"""NIHMS ML — preprocessing.py"""
import numpy as np
from datetime import datetime

REFERENCE_RANGES = {
    "haemoglobin":  {"male":(13.0,17.0),"female":(12.0,16.0)},
    "wbc":          {"male":(4.0,11.0), "female":(4.0,11.0)},
    "platelets":    {"male":(150,400),  "female":(150,400)},
    "sodium":       {"male":(136,145),  "female":(136,145)},
    "potassium":    {"male":(3.5,5.0),  "female":(3.5,5.0)},
    "creatinine":   {"male":(60,110),   "female":(45,90)},
    "glucose":      {"male":(4.0,7.0),  "female":(4.0,7.0)},
    "hba1c":        {"male":(4.0,6.0),  "female":(4.0,6.0)},
    "tsh":          {"male":(0.4,4.5),  "female":(0.4,4.5)},
    "alt":          {"male":(7,56),     "female":(7,45)},
    "crp":          {"male":(0,10),     "female":(0,10)},
    "cholesterol":  {"male":(0,5.0),    "female":(0,5.0)},
}

def queue_features(d):
    h=int(d.get("hour",datetime.now().hour))
    dow=int(d.get("day_of_week",datetime.now().weekday()))
    qs=int(d.get("queue_size",5))
    st=int(d.get("staff_count",3))
    pt=int(d.get("patient_type",0))
    dept=int(d.get("dept_id",0))
    return np.array([[h,dow,qs,st,pt,dept,1 if 7<=h<=11 else 0,1 if dow==0 else 0]])

def triage_features(d):
    hr=float(d.get("hr",80)); rr=float(d.get("rr",16)); sbp=float(d.get("sbp",120))
    temp=float(d.get("temp",36.6)); spo2=float(d.get("spo2",98))
    avpu=int(d.get("avpu",0)); age=float(d.get("age",35)); sex=int(d.get("sex",0))
    def news_hr(v): return 3 if v<=40 or v>=131 else 2 if v<=50 or v>=111 else 1 if v<=90 else 0
    def news_rr(v): return 3 if v<=8 or v>=25 else 2 if v>=21 else 1 if v<=11 else 0
    def news_sbp(v): return 3 if v<=90 else 2 if v<=100 else 1 if v<=110 or v>=220 else 0
    def news_spo2(v): return 3 if v<=91 else 2 if v<=93 else 1 if v<=95 else 0
    def news_temp(v): return 2 if v<=35 or v>=39.1 else 1 if v<=36 or v>=38.1 else 0
    news2=news_hr(hr)+news_rr(rr)+news_sbp(sbp)+news_spo2(spo2)+news_temp(temp)+avpu*3
    return np.array([[hr,rr,sbp,temp,spo2,avpu,age,sex,news2]])

def check_lab(test, value, sex="female"):
    key=test.lower().replace(" ","_").replace("-","_")
    r=REFERENCE_RANGES.get(key)
    if not r: return {"status":"unknown","flag":"No reference range available","low":None,"high":None}
    lo,hi=r.get(sex.lower(),r["female"])
    if value<lo:   return {"status":"low", "flag":"Below reference range","low":lo,"high":hi}
    elif value>hi: return {"status":"high","flag":"Above reference range","low":lo,"high":hi}
    return {"status":"normal","flag":"Within reference range","low":lo,"high":hi}

def analyse_vital_trend(readings):
    if not readings or len(readings)<2:
        return {"status":"insufficient_data","alerts":[],"severity":"LOW","action":"More readings needed."}
    fields={"hr":"Heart Rate","spo2":"SpO2","rr":"Respiratory Rate","sbp":"Blood Pressure","temp":"Temperature"}
    alerts=[]; trends={}
    for key,label in fields.items():
        vals=[float(r[key]) for r in readings if r.get(key) is not None]
        if len(vals)<2: continue
        delta=vals[-1]-vals[0]
        pct=abs(delta/vals[0]*100) if vals[0] else 0
        trends[key]={"values":vals,"direction":"increasing" if delta>0 else "decreasing" if delta<0 else "stable","change_pct":round(pct,1)}
        concern=(key=="spo2" and delta<-3) or (key=="hr" and abs(delta)>20) or (key=="rr" and delta>4) or (key=="sbp" and abs(delta)>30) or (key=="temp" and delta>1.5)
        if concern: alerts.append({"vital":label,"direction":trends[key]["direction"],"values":vals})
    return {"trends":trends,"alerts":alerts,"severity":"HIGH" if len(alerts)>=2 else "MEDIUM" if len(alerts)==1 else "LOW","action":"Clinical review recommended." if alerts else "Vital signs stable."}

def volume_features(d):
    dow=int(d.get("day_of_week",datetime.now().weekday()))
    month=int(d.get("month",datetime.now().month))
    dom=int(d.get("day_of_month",15))
    return np.array([[dow,month,1 if dow==0 else 0,1 if dow==4 else 0,1 if dom<=5 else 0]])
