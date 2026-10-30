import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from xgboost import XGBClassifier
import shap

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Standard feature mapping to avoid XGBoost naming restrictions
FEATURE_MAP = {
    'Air temperature [K]': 'air_temperature_k',
    'Process temperature [K]': 'process_temperature_k',
    'Rotational speed [rpm]': 'rotational_speed_rpm',
    'Torque [Nm]': 'torque_nm',
    'Tool wear [min]': 'tool_wear_min'
}
FEATURE_NAMES = list(FEATURE_MAP.values())
FEATURE_DISPLAY_NAMES = [
    'Air Temperature (K)',
    'Process Temperature (K)',
    'Rotational Speed (RPM)',
    'Torque (Nm)',
    'Tool Wear (min)'
]

class MachineHealthMLEngine:
    def __init__(self, dataset_path=None):
        if dataset_path is None:
            # Look for dataset in project root or current dir
            possible_paths = [
                os.path.join(os.path.dirname(__file__), "..", "ai4i2020.csv"),
                os.path.join(os.path.dirname(__file__), "ai4i2020.csv"),
                "ai4i2020.csv"
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    dataset_path = p
                    break

        self.dataset_path = dataset_path
        self.rf_model = None
        self.xgb_model = None
        self.rf_explainer = None
        self.xgb_explainer = None
        self.metrics = {}
        self.df = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None

        if self.dataset_path and os.path.exists(self.dataset_path):
            self.load_and_train()
        else:
            print(f"Warning: Dataset not found at {dataset_path}")

    def load_and_train(self):
        print(f"[ML Engine] Loading dataset from: {self.dataset_path}")
        self.df = pd.read_csv(self.dataset_path)
        self.df = self.df.rename(columns=FEATURE_MAP)

        X = self.df[FEATURE_NAMES]
        y = self.df['Machine failure']

        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )

        rf_path = os.path.join(MODELS_DIR, "random_forest.joblib")
        xgb_path = os.path.join(MODELS_DIR, "xgboost.json")

        # Train Random Forest
        print("[ML Engine] Training Random Forest Classifier...")
        self.rf_model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
        self.rf_model.fit(self.X_train, self.y_train)
        rf_pred = self.rf_model.predict(self.X_test)
        rf_probs = self.rf_model.predict_proba(self.X_test)[:, 1]

        joblib.dump(self.rf_model, rf_path)

        # Train XGBoost
        print("[ML Engine] Training XGBoost Classifier...")
        self.xgb_model = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1
        )
        self.xgb_model.fit(self.X_train, self.y_train)
        xgb_pred = self.xgb_model.predict(self.X_test)
        xgb_probs = self.xgb_model.predict_proba(self.X_test)[:, 1]

        self.xgb_model.save_model(xgb_path)

        # Calculate accurate metrics
        self.metrics = {
            "random_forest": {
                "name": "Random Forest",
                "accuracy": round(float(accuracy_score(self.y_test, rf_pred)), 4),
                "precision": round(float(precision_score(self.y_test, rf_pred, zero_division=0)), 4),
                "recall": round(float(recall_score(self.y_test, rf_pred, zero_division=0)), 4),
                "f1_score": round(float(f1_score(self.y_test, rf_pred, zero_division=0)), 4),
                "confusion_matrix": confusion_matrix(self.y_test, rf_pred).tolist(),
                "n_samples_test": int(len(self.y_test)),
                "n_failures_test": int(self.y_test.sum())
            },
            "xgboost": {
                "name": "XGBoost",
                "accuracy": round(float(accuracy_score(self.y_test, xgb_pred)), 4),
                "precision": round(float(precision_score(self.y_test, xgb_pred, zero_division=0)), 4),
                "recall": round(float(recall_score(self.y_test, xgb_pred, zero_division=0)), 4),
                "f1_score": round(float(f1_score(self.y_test, xgb_pred, zero_division=0)), 4),
                "confusion_matrix": confusion_matrix(self.y_test, xgb_pred).tolist(),
                "n_samples_test": int(len(self.y_test)),
                "n_failures_test": int(self.y_test.sum())
            }
        }
        print(f"[ML Engine] Models successfully trained. RF Acc: {self.metrics['random_forest']['accuracy']}, XGB Acc: {self.metrics['xgboost']['accuracy']}")

        # Initialize SHAP Explainers
        print("[ML Engine] Initializing SHAP TreeExplainers...")
        self.xgb_explainer = shap.TreeExplainer(self.xgb_model)
        self.rf_explainer = shap.TreeExplainer(self.rf_model)
        print("[ML Engine] SHAP Explainers ready.")

    def check_feature_compatibility(self, input_dict):
        """
        Inspects input readings to determine compatibility with the 5 AI4I trained features.
        Prevents fake predictions on machines with incompatible custom sensor fields.
        """
        core_features = ['air_temperature_k', 'process_temperature_k', 'rotational_speed_rpm', 'torque_nm', 'tool_wear_min']
        present = [f for f in core_features if f in input_dict and input_dict[f] is not None]
        missing = [f for f in core_features if f not in present]
        
        if len(present) == 5:
            return {
                "status": "FULL_COMPATIBILITY",
                "is_compatible": True,
                "full_compatibility": True,
                "present_features": present,
                "missing_features": [],
                "coverage_pct": 100.0,
                "message": "All 5 required sensor parameters match AI4I trained models."
            }
        elif len(present) > 0:
            return {
                "status": "PARTIAL_COMPATIBILITY",
                "is_compatible": True,
                "full_compatibility": False,
                "present_features": present,
                "missing_features": missing,
                "coverage_pct": round((len(present) / 5.0) * 100.0, 1),
                "message": f"{len(present)} of 5 sensor parameters mapped. Missing {missing} are imputed from nominal baselines."
            }
        else:
            return {
                "status": "INCOMPATIBLE",
                "is_compatible": False,
                "full_compatibility": False,
                "present_features": [],
                "missing_features": core_features,
                "coverage_pct": 0.0,
                "message": "Custom sensor parameters do not match AI4I feature definitions (Air Temp, Proc Temp, Speed, Torque, Tool Wear). Specialized models required."
            }

    def predict_both(self, input_dict):
        """
        Runs prediction on both Random Forest and XGBoost.
        input_dict keys: air_temperature_k, process_temperature_k, rotational_speed_rpm, torque_nm, tool_wear_min
        """
        compat = self.check_feature_compatibility(input_dict)

        sample_df = pd.DataFrame([{
            'air_temperature_k': float(input_dict.get('air_temperature_k', 300.0)),
            'process_temperature_k': float(input_dict.get('process_temperature_k', 310.0)),
            'rotational_speed_rpm': float(input_dict.get('rotational_speed_rpm', 1500.0)),
            'torque_nm': float(input_dict.get('torque_nm', 40.0)),
            'tool_wear_min': float(input_dict.get('tool_wear_min', 60.0))
        }])

        # RF Prediction
        rf_prob = float(self.rf_model.predict_proba(sample_df)[0, 1])
        rf_pred = int(self.rf_model.predict(sample_df)[0])

        # XGB Prediction
        xgb_prob = float(self.xgb_model.predict_proba(sample_df)[0, 1])
        xgb_pred = int(self.xgb_model.predict(sample_df)[0])

        # Combined ensemble consensus probability
        ensemble_prob = float((rf_prob + xgb_prob) / 2.0)

        # Health score (inverse of failure risk, calibrated from 0 to 100)
        health_score = max(5.0, min(100.0, round((1.0 - ensemble_prob) * 100.0, 1)))

        # Risk Classification
        if not compat["is_compatible"]:
            risk_level = "UNCALIBRATED"
            status = "Warning"
        elif ensemble_prob >= 0.70:
            risk_level = "CRITICAL"
            status = "Critical"
        elif ensemble_prob >= 0.35:
            risk_level = "HIGH RISK"
            status = "Warning"
        elif ensemble_prob >= 0.15:
            risk_level = "MODERATE"
            status = "Warning"
        else:
            risk_level = "LOW RISK"
            status = "Healthy"

        return {
            "random_forest": {
                "prediction": rf_pred,
                "failure_probability": round(rf_prob * 100.0, 2),
                "status": "Failure Likely" if rf_pred == 1 else "Normal"
            },
            "xgboost": {
                "prediction": xgb_pred,
                "failure_probability": round(xgb_prob * 100.0, 2),
                "status": "Failure Likely" if xgb_pred == 1 else "Normal"
            },
            "consensus": {
                "failure_probability": round(ensemble_prob * 100.0, 2),
                "health_score": health_score,
                "risk_level": risk_level,
                "status": status,
                "is_calibrated": compat["is_compatible"]
            },
            "feature_compatibility": compat
        }

    def explain_shap(self, input_dict, model_choice="xgboost"):
        """
        Calculates genuine SHAP explanation for the input parameters.
        Returns waterfall impact values and feature importance.
        """
        sample_df = pd.DataFrame([{
            'air_temperature_k': float(input_dict.get('air_temperature_k', 300.0)),
            'process_temperature_k': float(input_dict.get('process_temperature_k', 310.0)),
            'rotational_speed_rpm': float(input_dict.get('rotational_speed_rpm', 1500.0)),
            'torque_nm': float(input_dict.get('torque_nm', 40.0)),
            'tool_wear_min': float(input_dict.get('tool_wear_min', 60.0))
        }])

        if model_choice.lower() == "random_forest" and self.rf_explainer is not None:
            shap_vals = self.rf_explainer.shap_values(sample_df)
            # For RF binary classification, class 1 is failure
            if isinstance(shap_vals, np.ndarray) and len(shap_vals.shape) == 3:
                vals = shap_vals[0, :, 1]
            elif isinstance(shap_vals, list) and len(shap_vals) > 1:
                vals = shap_vals[1][0]
            else:
                vals = shap_vals[0]
            base_val = float(self.rf_explainer.expected_value[1]) if isinstance(self.rf_explainer.expected_value, (list, np.ndarray)) else float(self.rf_explainer.expected_value)
        else:
            # XGBoost explainer
            shap_output = self.xgb_explainer(sample_df)
            vals = shap_output.values[0]
            base_val = float(shap_output.base_values[0]) if hasattr(shap_output, "base_values") else 0.0

        features_summary = []
        for i, col in enumerate(FEATURE_NAMES):
            impact = float(vals[i])
            val = float(sample_df[col].iloc[0])
            features_summary.append({
                "feature": col,
                "display_name": FEATURE_DISPLAY_NAMES[i],
                "value": val,
                "shap_impact": round(impact, 4),
                "direction": "Risk Escalator (increases failure risk)" if impact > 0 else "Stabilizing Factor (reduces failure risk)"
            })

        # Sort features by absolute impact magnitude
        features_summary.sort(key=lambda x: abs(x["shap_impact"]), reverse=True)

        return {
            "model_used": model_choice,
            "base_value": round(base_val, 4),
            "features": features_summary,
            "top_risk_driver": features_summary[0]["display_name"] if features_summary else "N/A"
        }

    def estimate_rul(self, input_dict):
        """
        Estimates Remaining Useful Life (RUL) using physical degradation progression:
        Calibrated against critical industrial thresholds (max tool wear: 240 min, load torque, thermal delta).
        Returns: RUL hours, RUL cycles, degradation percentage, degradation curve points.
        """
        tool_wear = float(input_dict.get('tool_wear_min', 0.0))
        torque = float(input_dict.get('torque_nm', 40.0))
        rpm = float(input_dict.get('rotational_speed_rpm', 1500.0))
        air_temp = float(input_dict.get('air_temperature_k', 300.0))
        proc_temp = float(input_dict.get('process_temperature_k', 310.0))

        # Critical thresholds
        CRITICAL_WEAR_MIN = 240.0
        thermal_diff = max(0.1, proc_temp - air_temp)
        
        # Wear acceleration factor based on mechanical strain (Torque * RPM) and thermal stress
        mechanical_power_factor = (torque * rpm) / (40.0 * 1500.0) # normalized around nominal 1.0
        thermal_stress_factor = thermal_diff / 10.0 # nominal difference is ~10K

        wear_rate_per_hour = 1.25 * (mechanical_power_factor ** 0.6) * (thermal_stress_factor ** 0.3)
        wear_rate_per_hour = max(0.5, min(4.5, wear_rate_per_hour))

        remaining_wear = max(0.0, CRITICAL_WEAR_MIN - tool_wear)
        rul_hours = max(0.0, remaining_wear / wear_rate_per_hour)
        rul_cycles = int(rul_hours * 12) # ~12 machining cycles per hour

        degradation_pct = min(100.0, round((tool_wear / CRITICAL_WEAR_MIN) * 100.0, 1))

        # Generate degradation projection trajectory (past 5 intervals and next 10 intervals)
        curve = []
        for t in range(0, 16):
            future_wear = min(CRITICAL_WEAR_MIN, tool_wear + (t * wear_rate_per_hour))
            future_health = max(0.0, 100.0 - ((future_wear / CRITICAL_WEAR_MIN) * 100.0))
            curve.append({
                "interval_hours": t,
                "projected_wear": round(future_wear, 1),
                "projected_health": round(future_health, 1)
            })

        recommendation = ""
        if rul_hours < 12.0:
            recommendation = "URGENT REPLACEMENT REQUIRED: Tool wear nearing critical limit. Schedule tool insert replacement within next operational shift."
        elif rul_hours < 36.0:
            recommendation = "PRE-EMPTIVE INSPECTION: Machine wear approaching 80%. Prepare replacement tooling and calibrate spindle torque."
        else:
            recommendation = "OPTIMAL OPERATION: Tooling within safe wear envelope. Continue scheduled lubrication and monitoring."

        return {
            "estimated_rul_hours": round(rul_hours, 1),
            "estimated_rul_cycles": rul_cycles,
            "degradation_percentage": degradation_pct,
            "wear_rate_per_hour": round(wear_rate_per_hour, 2),
            "critical_wear_threshold_min": CRITICAL_WEAR_MIN,
            "recommendation": recommendation,
            "trajectory_curve": curve
        }

# Global engine instance
ml_engine = MachineHealthMLEngine()
