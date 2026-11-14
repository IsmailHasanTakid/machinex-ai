# AI-Powered Predictive Maintenance System

An end-to-end machine learning system that analyzes a machine's operating condition, predicts the probability of failure, and warns when maintenance is needed.

It includes the full pipeline: dataset analysis, preprocessing, model training and evaluation (Random Forest and ANN), a FastAPI prediction service, and a React dashboard.

**Author:** Ismail Hasan Takid

---

## Features

- **Failure prediction** from five sensor readings (temperature, speed, torque, tool wear, product type)
- **Risk levels** (Low / Medium / High) with a maintenance recommendation
- **Possible failure causes** (TWF, HDF, PWF, OSF) based on the dataset's documented failure conditions
- **Machine Scanner** page to scan a machine and see the result instantly
- **Dashboard** with scan history, risk distribution and probability trend
- **Failure Analysis** page with feature importance, model comparison and threshold trade-off

---

## Tech Stack

| Layer | Technology |
|---|---|
| Machine Learning | Python, scikit-learn (Random Forest), TensorFlow / Keras (ANN), pandas, NumPy |
| Backend | FastAPI, Uvicorn, Pydantic, joblib |
| Frontend | React (Vite), React Router, Tailwind CSS, Recharts, Lucide icons |

---

## Dataset

**AI4I 2020 Predictive Maintenance Dataset** (UCI Machine Learning Repository, id 601)

- 10,000 records, 14 columns, no missing values, no duplicates
- Target: `Machine failure` (0 = no failure, 1 = failure)
- Highly imbalanced: 96.61% no failure, 3.39% failure (339 failures)
- Failure modes: TWF (46), HDF (115), PWF (95), OSF (98), RNF (19)

---

## Methodology

1. **Dataset analysis:** shape, missing values, duplicates, class distribution, feature distributions, correlation.
2. **Preprocessing:**
   - Dropped `UDI`, `Product ID`
   - Dropped `TWF`, `HDF`, `PWF`, `OSF`, `RNF` to avoid **data leakage** (the target is derived from them)
   - Ordinal encoding of `Type` (L=0, M=1, H=2)
   - Engineered features: `temp_diff = process_temp - air_temp` and `power = torque x rpm x 2pi / 60`
   - Stratified 80/20 train-test split, then `StandardScaler` fitted on the training set only
   - Class imbalance handled with balanced `class_weight`
3. **Models:** Random Forest (200 trees) and an ANN (64-32-16 dense layers with dropout, early stopping).
4. **Evaluation:** Accuracy, Precision, Recall, F1, ROC-AUC, PR-AUC and confusion matrix on the held-out test set (2,000 samples, 68 real failures).
5. **Threshold analysis:** decision threshold lowered from 0.5 to 0.4 to reduce missed failures.

---

## Results (Test Set)

| Model | Accuracy | Precision | Recall | F1 | False Alarms | Missed Failures |
|---|---|---|---|---|---|---|
| Random Forest (threshold 0.5) | 98.9% | 92.6% | 73.5% | 0.820 | 4 | 18 |
| **Random Forest (threshold 0.4), deployed** | **99.1%** | 90.3% | 82.4% | **0.862** | 6 | 12 |
| ANN (threshold 0.5) | 95.05% | 39.6% | 86.8% | 0.544 | 90 | 9 |

| Model | ROC-AUC | PR-AUC |
|---|---|---|
| Random Forest | 0.977 | 0.860 |
| ANN | 0.980 | 0.717 |

Random Forest with threshold 0.4 was chosen: it has the best F1 and PR-AUC, and misses fewer failures than the default threshold at the cost of only two extra false alarms. The ANN catches the most failures but produces too many false alarms for practical use.

> **Note:** the threshold was selected using the test set, so the reported F1 may be slightly optimistic. A cleaner approach is to select it with cross-validation on the training data.

**Most important features (Random Forest):** rotational speed, torque, power and tool wear.

---

## Project Structure

```
predictive-maintenance/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt
│   └── artifacts/              # Trained model and preprocessing files
│       ├── random_forest.pkl
│       ├── ann_model.keras
│       ├── scaler.pkl
│       ├── features.pkl
│       ├── type_map.pkl
│       └── config.pkl
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── index.css
│       ├── components/Layout.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Scanner.jsx
│           └── Analysis.jsx
└── notebooks/
    └── Predictive_Maintenance.ipynb   # Training and evaluation (Google Colab)
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Run the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Interactive docs: `http://127.0.0.1:8000/docs`.

> The saved model was trained with `scikit-learn==1.6.1`. Keep this version, otherwise the pickle files may fail to load.

### 2. Run the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## API Reference

### `GET /health`
Returns service status and the decision threshold.

### `POST /predict`

Request:

```json
{
  "type": "L",
  "air_temp": 300,
  "process_temp": 308.5,
  "rpm": 1300,
  "torque": 65,
  "tool_wear": 220
}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"L"`, `"M"` or `"H"` | Product quality type |
| `air_temp` | float | Air temperature [K] |
| `process_temp` | float | Process temperature [K] |
| `rpm` | float | Rotational speed [rpm] |
| `torque` | float | Torque [Nm] |
| `tool_wear` | float | Tool wear [min] |

Response:

```json
{
  "failure_probability": 0.841,
  "prediction": "Failure",
  "risk_level": "High",
  "message": "Immediate maintenance required. High risk of machine failure.",
  "maintenance_required": true,
  "rule_alerts": [
    {
      "code": "TWF",
      "name": "Tool Wear Failure",
      "detail": "Tool wear is 220 min (risk range: 200-240 min)"
    }
  ]
}
```

### `GET /feature-importance`
Returns Random Forest feature importances, sorted in descending order.

---

## Risk Levels

| Failure probability | Level | Meaning |
|---|---|---|
| below 0.2 | Low | Machine is operating normally |
| 0.2 to 0.4 | Medium | Monitor and inspect at next service |
| 0.4 or above | High | Immediate maintenance required |

`rule_alerts` come from the failure conditions documented with the dataset (not from the ML model), and explain *why* a machine may fail:

| Code | Condition |
|---|---|
| TWF | Tool wear in the 200-240 min range |
| HDF | Temperature difference below 8.6 K and speed below 1380 rpm |
| PWF | Power below 3500 W or above 9000 W |
| OSF | Tool wear x torque above 11000 (L), 12000 (M) or 13000 (H) |

---

## Screenshots

Add screenshots to `docs/screenshots/` and link them here:

```markdown
![Dashboard](docs/screenshots/dashboard.png)
![Machine Scanner](docs/screenshots/scanner.png)
![Failure Analysis](docs/screenshots/analysis.png)
```

---

## Limitations and Future Work

- The dataset is **synthetic**, so results may not transfer directly to real machines.
- Scan history is stored in the browser (`localStorage`), not in a database.
- The threshold was tuned on the test set; cross-validated selection would be more rigorous.
- Possible improvements: SMOTE or cost-sensitive learning, gradient boosting models, a database for scan history, user authentication, and real-time sensor input.

---

## License

This project was built for educational purposes.

## Acknowledgements

- Dataset: S. Matzka, *AI4I 2020 Predictive Maintenance Dataset*, UCI Machine Learning Repository.