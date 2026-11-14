import { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend,
} from "recharts";
import { getFeatureImportance } from "../api";

const NAMES = {
    type: "Quality Type", air_temp: "Air Temp", process_temp: "Process Temp",
    rpm: "Rotational Speed", torque: "Torque", tool_wear: "Tool Wear",
    temp_diff: "Temp Difference", power: "Power",
};

// Colab Step 4 results (test set, 2000 samples, 68 real failures)
const MODELS = [
    { name: "Random Forest (t = 0.5)", acc: 0.989, pre: 0.926, rec: 0.735, f1: 0.820, fp: 4, fn: 18, final: false },
    { name: "Random Forest (t = 0.4)", acc: 0.991, pre: 0.903, rec: 0.824, f1: 0.862, fp: 6, fn: 12, final: true },
    { name: "ANN (t = 0.5)", acc: 0.9505, pre: 0.396, rec: 0.868, f1: 0.544, fp: 90, fn: 9, final: false },
];

const THRESHOLDS = [
    { t: 0.1, Precision: 0.384, Recall: 0.926, F1: 0.543 },
    { t: 0.2, Precision: 0.592, Recall: 0.853, F1: 0.699 },
    { t: 0.3, Precision: 0.812, Recall: 0.824, F1: 0.818 },
    { t: 0.4, Precision: 0.903, Recall: 0.824, F1: 0.862 },
    { t: 0.5, Precision: 0.926, Recall: 0.735, F1: 0.820 },
    { t: 0.6, Precision: 0.958, Recall: 0.676, F1: 0.793 },
    { t: 0.7, Precision: 0.946, Recall: 0.515, F1: 0.667 },
];

const FAILURES = [
    { code: "TWF", name: "Tool Wear Failure", count: 46, rule: "Tool wear reaches the 200-240 min range" },
    { code: "HDF", name: "Heat Dissipation Failure", count: 115, rule: "Temp difference below 8.6 K and speed below 1380 rpm" },
    { code: "PWF", name: "Power Failure", count: 95, rule: "Power below 3500 W or above 9000 W" },
    { code: "OSF", name: "Overstrain Failure", count: 98, rule: "Tool wear x Torque above 11000 (L), 12000 (M), 13000 (H)" },
    { code: "RNF", name: "Random Failure", count: 19, rule: "Random 0.1% chance, not predictable" },
];

const pct = (v) => `${(v * 100).toFixed(1)}%`;

export default function Analysis() {
    const [imp, setImp] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        getFeatureImportance()
            .then((d) => setImp(d.map((x) => ({ name: NAMES[x.feature] || x.feature, value: +(x.importance * 100).toFixed(1) })).reverse()))
            .catch(() => setError("Could not load feature importance. Is the backend running?"));
    }, []);

    return (
        <div className="max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Failure Analysis</h1>
                <p className="text-slate-500">What drives failures, and how well the models detect them.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <h2 className="font-semibold text-slate-800 mb-1">Feature Importance (Random Forest)</h2>
                    <p className="text-sm text-slate-500 mb-3">Which sensor readings matter most for predicting failure.</p>
                    {error ? <p className="text-sm text-red-600">{error}</p> : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={imp} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" unit="%" />
                                <YAxis type="category" dataKey="name" width={110} />
                                <Tooltip formatter={(v) => `${v}%`} />
                                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-5">
                    <h2 className="font-semibold text-slate-800 mb-1">Failure Types in Dataset</h2>
                    <p className="text-sm text-slate-500 mb-3">Number of failures by type (10,000 records).</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={FAILURES}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="code" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
                <h2 className="font-semibold text-slate-800 mb-3">Failure Type Reference</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-slate-500 border-b">
                            <th className="py-2 pr-4">Code</th><th className="pr-4">Name</th><th>Condition</th>
                        </tr>
                    </thead>
                    <tbody>
                        {FAILURES.map((f) => (
                            <tr key={f.code} className="border-b last:border-0">
                                <td className="py-2 pr-4 font-semibold text-red-600">{f.code}</td>
                                <td className="pr-4">{f.name}</td>
                                <td className="text-slate-600">{f.rule}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
                <h2 className="font-semibold text-slate-800 mb-3">Model Comparison (Test Set)</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-slate-500 border-b">
                            <th className="py-2 pr-4">Model</th><th className="pr-4">Accuracy</th><th className="pr-4">Precision</th>
                            <th className="pr-4">Recall</th><th className="pr-4">F1</th>
                            <th className="pr-4">False Alarms</th><th>Missed Failures</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MODELS.map((m) => (
                            <tr key={m.name} className={`border-b last:border-0 ${m.final ? "bg-sky-50 font-semibold" : ""}`}>
                                <td className="py-2 pr-4">{m.name}{m.final && <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-xs text-white">Deployed</span>}</td>
                                <td className="pr-4">{pct(m.acc)}</td>
                                <td className="pr-4">{pct(m.pre)}</td>
                                <td className="pr-4">{pct(m.rec)}</td>
                                <td className="pr-4">{m.f1.toFixed(3)}</td>
                                <td className="pr-4">{m.fp}</td>
                                <td>{m.fn}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="font-semibold text-slate-800 mb-1">Threshold Trade-off (Random Forest)</h2>
                <p className="text-sm text-slate-500 mb-3">
                    Lowering the threshold catches more failures (Recall up) but raises false alarms (Precision down).
                    Threshold 0.4 gives the best F1.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={THRESHOLDS}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="t" label={{ value: "Threshold", position: "insideBottom", offset: -2 }} />
                        <YAxis domain={[0, 1]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Precision" stroke="#0ea5e9" strokeWidth={2} />
                        <Line type="monotone" dataKey="Recall" stroke="#ef4444" strokeWidth={2} />
                        <Line type="monotone" dataKey="F1" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}