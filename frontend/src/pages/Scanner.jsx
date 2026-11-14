import { useState } from "react";
import { predict } from "../api";
import { Loader2, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

const FIELDS = [
    { key: "air_temp", label: "Air Temperature", unit: "K", step: "0.1" },
    { key: "process_temp", label: "Process Temperature", unit: "K", step: "0.1" },
    { key: "rpm", label: "Rotational Speed", unit: "rpm", step: "1" },
    { key: "torque", label: "Torque", unit: "Nm", step: "0.1" },
    { key: "tool_wear", label: "Tool Wear", unit: "min", step: "1" },
];

const PRESETS = {
    healthy: { type: "L", air_temp: 298.1, process_temp: 308.6, rpm: 1551, torque: 42.8, tool_wear: 0 },
    risky: { type: "L", air_temp: 300, process_temp: 308.5, rpm: 1300, torque: 65, tool_wear: 220 },
};

const RISK = {
    Low: { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", Icon: CheckCircle2 },
    Medium: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", bar: "bg-amber-500", Icon: AlertTriangle },
    High: { color: "text-red-600", bg: "bg-red-50 border-red-200", bar: "bg-red-500", Icon: ShieldAlert },
};

export default function Scanner() {
    const [form, setForm] = useState(PRESETS.healthy);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    async function onSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const payload = {
                type: form.type,
                air_temp: Number(form.air_temp),
                process_temp: Number(form.process_temp),
                rpm: Number(form.rpm),
                torque: Number(form.torque),
                tool_wear: Number(form.tool_wear),
            };
            const data = await predict(payload);
            setResult(data);

            // Save scan history for the Dashboard
            try {
                const history = JSON.parse(localStorage.getItem("scans") || "[]");
                history.unshift({
                    ...data,
                    id: Date.now().toString(),
                    input: payload,
                    time: new Date().toISOString(),
                });
                localStorage.setItem("scans", JSON.stringify(history.slice(0, 200)));
            } catch {
                /* scanning still works without localStorage */
            }
        } catch (err) {
            setError("Could not reach the backend. Make sure the server is running. " + err.message);
        } finally {
            setLoading(false);
        }
    }

    const risk = result ? RISK[result.risk_level] : null;
    const pct = result ? Math.round(result.failure_probability * 100) : 0;

    return (
        <div className="max-w-5xl">
            <h1 className="text-2xl font-bold text-slate-800">Machine Scanner</h1>
            <p className="text-slate-500 mb-6">Enter the machine's current operating condition and the AI will analyze the failure risk.</p>

            <div className="grid gap-6 lg:grid-cols-2">
                <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setForm(PRESETS.healthy)}
                            className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                            Healthy sample
                        </button>
                        <button type="button" onClick={() => setForm(PRESETS.risky)}
                            className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200">
                            Risky sample
                        </button>
                    </div>

                    <label className="block">
                        <span className="text-sm font-medium text-slate-700">Product Quality Type</span>
                        <select value={form.type} onChange={(e) => onChange("type", e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                            <option value="L">L (Low)</option>
                            <option value="M">M (Medium)</option>
                            <option value="H">H (High)</option>
                        </select>
                    </label>

                    {FIELDS.map(({ key, label, unit, step }) => (
                        <label key={key} className="block">
                            <span className="text-sm font-medium text-slate-700">
                                {label} <span className="text-slate-400">[{unit}]</span>
                            </span>
                            <input type="number" step={step} required value={form[key]}
                                onChange={(e) => onChange(key, e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        </label>
                    ))}

                    <button type="submit" disabled={loading}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                        {loading && <Loader2 className="animate-spin" size={18} />}
                        {loading ? "Analyzing..." : "Scan Machine"}
                    </button>

                    {error && <p className="text-sm text-red-600">{error}</p>}
                </form>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    {!result ? (
                        <div className="h-full min-h-64 flex items-center justify-center text-slate-400 text-center">
                            Fill the form and press "Scan Machine"
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className={`rounded-xl border p-4 ${risk.bg}`}>
                                <div className={`flex items-center gap-2 text-lg font-bold ${risk.color}`}>
                                    <risk.Icon /> {result.risk_level} Risk
                                </div>
                                <p className="mt-1 text-sm text-slate-700">{result.message}</p>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Failure Probability</span>
                                    <span className="font-semibold">{pct}%</span>
                                </div>
                                <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                                    <div className={`h-full ${risk.bar} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-lg bg-slate-50 p-3">
                                    <div className="text-slate-500">Prediction</div>
                                    <div className="font-semibold">{result.prediction}</div>
                                </div>
                                <div className="rounded-lg bg-slate-50 p-3">
                                    <div className="text-slate-500">Maintenance</div>
                                    <div className="font-semibold">{result.maintenance_required ? "Required" : "Not needed"}</div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-800 mb-2">Possible Failure Causes</h3>
                                {result.rule_alerts.length === 0 ? (
                                    <p className="text-sm text-slate-500">No specific failure condition was triggered.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {result.rule_alerts.map((a) => (
                                            <li key={a.code} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                                                <span className="font-semibold text-red-700">{a.code}</span> - {a.name}
                                                <div className="text-slate-600">{a.detail}</div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}