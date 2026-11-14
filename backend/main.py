from pathlib import Path
from typing import Literal
import math

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE = Path(__file__).parent / "artifacts"

# Load trained model and preprocessing artifacts
model = joblib.load(BASE / "random_forest.pkl")
scaler = joblib.load(BASE / "scaler.pkl")
features = joblib.load(BASE / "features.pkl")
type_map = joblib.load(BASE / "type_map.pkl")
config = joblib.load(BASE / "config.pkl")

THRESHOLD = config["threshold"]   # 0.4 -> High risk / failure
LOW_MAX = config["low_max"]       # 0.2 -> below this is Low risk

app = FastAPI(title="AI Predictive Maintenance API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class MachineInput(BaseModel):
    type: Literal["L", "M", "H"]
    air_temp: float = Field(..., ge=250, le=350, description="Air temperature [K]")
    process_temp: float = Field(..., ge=250, le=400, description="Process temperature [K]")
    rpm: float = Field(..., gt=0, le=5000, description="Rotational speed [rpm]")
    torque: float = Field(..., ge=0, le=200, description="Torque [Nm]")
    tool_wear: float = Field(..., ge=0, le=500, description="Tool wear [min]")


def build_row(d: MachineInput) -> pd.DataFrame:
    """Build a single-row DataFrame with the same features used in training."""
    row = {
        "type": type_map[d.type],
        "air_temp": d.air_temp,
        "process_temp": d.process_temp,
        "rpm": d.rpm,
        "torque": d.torque,
        "tool_wear": d.tool_wear,
        "temp_diff": d.process_temp - d.air_temp,
        "power": d.torque * d.rpm * 2 * math.pi / 60,
    }
    # Keep the exact feature order used during training
    return pd.DataFrame([row])[features]


def rule_checks(d: MachineInput) -> list[dict]:
    """Failure conditions described in the dataset documentation (used for Failure Analysis)."""
    temp_diff = d.process_temp - d.air_temp
    power = d.torque * d.rpm * 2 * math.pi / 60
    limit = {"L": 11000, "M": 12000, "H": 13000}[d.type]
    alerts = []

    if 200 <= d.tool_wear <= 240:
        alerts.append({
            "code": "TWF",
            "name": "Tool Wear Failure",
            "detail": f"Tool wear is {d.tool_wear:.0f} min (risk range: 200-240 min)",
        })
    if temp_diff < 8.6 and d.rpm < 1380:
        alerts.append({
            "code": "HDF",
            "name": "Heat Dissipation Failure",
            "detail": f"Temperature difference is {temp_diff:.1f} K and speed is {d.rpm:.0f} rpm",
        })
    if power < 3500 or power > 9000:
        alerts.append({
            "code": "PWF",
            "name": "Power Failure",
            "detail": f"Power is {power:.0f} W (normal range: 3500-9000 W)",
        })
    if d.tool_wear * d.torque > limit:
        alerts.append({
            "code": "OSF",
            "name": "Overstrain Failure",
            "detail": f"Tool wear x Torque = {d.tool_wear * d.torque:.0f} (limit for type {d.type}: {limit})",
        })
    return alerts


def risk_level(prob: float) -> tuple[str, str]:
    if prob >= THRESHOLD:
        return "High", "Immediate maintenance required. High risk of machine failure."
    if prob >= LOW_MAX:
        return "Medium", "Keep the machine under observation and inspect it at the next service."
    return "Low", "The machine is operating normally."


@app.get("/health")
def health():
    return {"status": "ok", "model": config["model"], "threshold": THRESHOLD}


@app.post("/predict")
def predict(data: MachineInput):
    X = scaler.transform(build_row(data))
    prob = float(model.predict_proba(X)[0, 1])
    level, message = risk_level(prob)

    return {
        "failure_probability": round(prob, 4),
        "prediction": "Failure" if prob >= THRESHOLD else "No Failure",
        "risk_level": level,
        "message": message,
        "maintenance_required": level in ("Medium", "High"),
        "rule_alerts": rule_checks(data),
    }


@app.get("/feature-importance")
def feature_importance():
    imp = sorted(zip(features, model.feature_importances_), key=lambda x: -x[1])
    return [{"feature": f, "importance": round(float(v), 4)} for f, v in imp]