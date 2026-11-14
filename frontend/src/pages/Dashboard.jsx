import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
    Activity,
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    Loader2,
    Trash2,
    Wifi,
    WifiOff,
    ArrowUpRight,
    ScanLine,
    Cpu,
} from "lucide-react";
import { predict, getHealth } from "../api";

const COLORS = {
    Low: "#10b981",
    Medium: "#f59e0b",
    High: "#ef4444",
};

const BADGE = {
    Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    Medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    High: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function loadScans() {
    try {
        return JSON.parse(localStorage.getItem("scans") || "[]");
    } catch {
        return [];
    }
}

function randomMachine() {
    const r = (min, max, d = 1) =>
        +(min + Math.random() * (max - min)).toFixed(d);

    const air = r(296, 303);

    return {
        type: ["L", "L", "L", "M", "M", "H"][
            Math.floor(Math.random() * 6)
        ],
        air_temp: air,
        process_temp: +(air + r(7.5, 12)).toFixed(1),
        rpm: Math.round(r(1250, 2100)),
        torque: r(20, 70),
        tool_wear: Math.round(r(0, 250)),
    };
}

function KPI({ icon: Icon, label, value, color, description }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">

            <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon size={22} />
                </div>

                <ArrowUpRight
                    size={18}
                    className="text-slate-400"
                />
            </div>

            <div className="mt-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {label}
                </p>

                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                    {value}
                </h2>

                <p className="text-xs text-slate-400 mt-2">
                    {description}
                </p>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [scans, setScans] = useState(loadScans);
    const [online, setOnline] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getHealth()
            .then(() => setOnline(true))
            .catch(() => setOnline(false));
    }, []);

    const save = (list) => {
        setScans(list);

        try {
            localStorage.setItem(
                "scans",
                JSON.stringify(list.slice(0, 200))
            );
        } catch {
            // Ignore storage errors
        }
    };

    async function generateDemo() {
        setBusy(true);

        try {
            const fresh = [];

            for (let i = 0; i < 12; i++) {
                const input = randomMachine();
                const data = await predict(input);

                fresh.unshift({
                    ...data,
                    input,
                    time: new Date().toISOString(),
                });
            }

            save([...fresh, ...scans]);
            setOnline(true);
        } catch {
            setOnline(false);
        } finally {
            setBusy(false);
        }
    }

    const count = (level) =>
        scans.filter((s) => s.risk_level === level).length;

    const avg = scans.length
        ? Math.round(
            (scans.reduce(
                (total, s) => total + s.failure_probability,
                0
            ) / scans.length) * 100
        )
        : 0;

    const pie = ["Low", "Medium", "High"]
        .map((name) => ({
            name,
            value: count(name),
        }))
        .filter((item) => item.value > 0);

    const trend = [...scans]
        .slice(0, 30)
        .reverse()
        .map((s, i) => ({
            n: i + 1,
            probability: Math.round(
                s.failure_probability * 100
            ),
        }));

    return (
        <div className="max-w-7xl mx-auto space-y-7">

            {/* Header */}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                <div>
                    <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase tracking-widest mb-2">
                        <Cpu size={16} />
                        AI Monitoring System
                    </div>

                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Dashboard
                    </h1>

                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Monitor machine health and analyze failure risks.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">

                    <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border ${online
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                        : online === false
                            ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
                            : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700"
                        }`}>

                        {online === null ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : online ? (
                            <Wifi size={16} />
                        ) : (
                            <WifiOff size={16} />
                        )}

                        {online === null
                            ? "Checking API"
                            : online
                                ? "API Connected"
                                : "API Offline"}
                    </div>

                    <Link
                        to="/scanner"
                        className="flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 text-sm font-semibold shadow-lg shadow-sky-600/20 transition"
                    >
                        <ScanLine size={17} />
                        New Scan
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <KPI
                    icon={Activity}
                    label="Total Scans"
                    value={scans.length}
                    color="bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                    description="Total machine analyses"
                />

                <KPI
                    icon={CheckCircle2}
                    label="Low Risk"
                    value={count("Low")}
                    color="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    description="Machines with low predicted risk"
                />

                <KPI
                    icon={AlertTriangle}
                    label="Medium Risk"
                    value={count("Medium")}
                    color="bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                    description="Machines requiring attention"
                />

                <KPI
                    icon={ShieldAlert}
                    label="High Risk"
                    value={count("High")}
                    color="bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    description="Machines requiring inspection"
                />

            </div>

            {/* Charts */}

            {scans.length === 0 ? (

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">

                    <div className="mx-auto w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4">
                        <Activity size={30} />
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        No Scan Data Available
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">
                        Start analyzing machine conditions to see dashboard analytics.
                    </p>

                    <Link
                        to="/scanner"
                        className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-3 rounded-xl font-semibold transition"
                    >
                        <ScanLine size={18} />
                        Start Machine Scan
                    </Link>

                </div>

            ) : (

                <div className="grid gap-6 xl:grid-cols-3">

                    {/* Risk Distribution */}

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">

                        <div className="mb-4">
                            <h2 className="font-bold text-slate-800 dark:text-white">
                                Risk Distribution
                            </h2>

                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Machine risk overview
                            </p>
                        </div>

                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={pie}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={65}
                                    outerRadius={95}
                                    paddingAngle={4}
                                    stroke="none"
                                >
                                    {pie.map((d) => (
                                        <Cell
                                            key={d.name}
                                            fill={COLORS[d.name]}
                                        />
                                    ))}
                                </Pie>

                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="flex justify-center flex-wrap gap-4 text-sm mt-2">

                            {pie.map((d) => (
                                <span
                                    key={d.name}
                                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300"
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{
                                            background: COLORS[d.name],
                                        }}
                                    />

                                    {d.name}

                                    <b>{d.value}</b>
                                </span>
                            ))}

                        </div>
                    </div>

                    {/* Probability Trend */}

                    <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">

                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">

                            <div>
                                <h2 className="font-bold text-slate-800 dark:text-white">
                                    Failure Probability Trend
                                </h2>

                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Last 30 machine scans
                                </p>
                            </div>

                            <div className="bg-sky-50 dark:bg-sky-500/10 rounded-xl px-4 py-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Average Probability
                                </p>

                                <p className="text-xl font-bold text-sky-600 dark:text-sky-400">
                                    {avg}%
                                </p>
                            </div>

                        </div>

                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={trend}>

                                <defs>
                                    <linearGradient
                                        id="probabilityGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="#0ea5e9"
                                            stopOpacity={0.35}
                                        />

                                        <stop
                                            offset="95%"
                                            stopColor="#0ea5e9"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#64748b"
                                    opacity={0.15}
                                />

                                <XAxis
                                    dataKey="n"
                                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                                />

                                <YAxis
                                    domain={[0, 100]}
                                    unit="%"
                                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                                />

                                <Tooltip
                                    formatter={(v) => `${v}%`}
                                    labelFormatter={(l) => `Scan #${l}`}
                                />

                                <Area
                                    type="monotone"
                                    dataKey="probability"
                                    stroke="#0ea5e9"
                                    strokeWidth={3}
                                    fill="url(#probabilityGradient)"
                                />

                            </AreaChart>
                        </ResponsiveContainer>

                    </div>
                </div>
            )}

            {/* Recent Scans */}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">

                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800">

                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-white">
                            Recent Machine Scans
                        </h2>

                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Latest machine analysis records
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">

                        <button
                            onClick={generateDemo}
                            disabled={busy}
                            className="flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 text-sm font-semibold disabled:opacity-50 transition"
                        >
                            {busy ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Activity size={16} />
                            )}

                            {busy ? "Generating..." : "Generate Demo Scans"}
                        </button>

                        {scans.length > 0 && (
                            <button
                                onClick={() => save([])}
                                className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <Trash2 size={16} />
                                Clear
                            </button>
                        )}

                    </div>
                </div>

                {scans.length === 0 ? (

                    <div className="p-10 text-center text-slate-500 dark:text-slate-400">
                        No scan history available.
                    </div>

                ) : (

                    <div className="overflow-x-auto">

                        <table className="w-full text-sm text-left">

                            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">Time</th>
                                    <th className="px-5 py-4 font-semibold">Type</th>
                                    <th className="px-5 py-4 font-semibold">Temperature</th>
                                    <th className="px-5 py-4 font-semibold">RPM</th>
                                    <th className="px-5 py-4 font-semibold">Torque</th>
                                    <th className="px-5 py-4 font-semibold">Tool Wear</th>
                                    <th className="px-5 py-4 font-semibold">Probability</th>
                                    <th className="px-5 py-4 font-semibold">Risk</th>
                                </tr>
                            </thead>

                            <tbody>
                                {scans.slice(0, 10).map((s, i) => (

                                    <tr
                                        key={i}
                                        className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                                    >

                                        <td className="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                                            {new Date(s.time).toLocaleTimeString()}
                                        </td>

                                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                                            {s.input.type}
                                        </td>

                                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {s.input.air_temp} / {s.input.process_temp} K
                                        </td>

                                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                            {s.input.rpm}
                                        </td>

                                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                            {s.input.torque}
                                        </td>

                                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                            {s.input.tool_wear} min
                                        </td>

                                        <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-200">
                                            {Math.round(
                                                s.failure_probability * 100
                                            )}%
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-bold ${BADGE[s.risk_level] || ""}`}
                                            >
                                                {s.risk_level}
                                            </span>
                                        </td>

                                    </tr>
                                ))}

                            </tbody>
                        </table>

                    </div>
                )}
            </div>

            {/* Footer */}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
                <p>MACHINEGUARD AI · Predictive Maintenance System</p>
                <p>Powered by Machine Learning</p>
            </div>

        </div>
    );
}