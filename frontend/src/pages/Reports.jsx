
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Search, ArrowRight, Activity } from "lucide-react";

export default function Reports() {
    const [scans, setScans] = useState([]);
    const [search, setSearch] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const history = JSON.parse(localStorage.getItem("scans") || "[]");

        // পুরোনো Scan-এ ID না থাকলে তৈরি করে দেওয়া
        const updatedHistory = history.map((scan) => ({
            ...scan,
            id: scan.id || scan.time,
        }));

        localStorage.setItem("scans", JSON.stringify(updatedHistory));
        setScans(updatedHistory);
    }, []);

    const filteredScans = scans.filter((scan) =>
        `${scan.input?.type || ""} ${scan.risk_level || ""} ${scan.prediction || ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    const getProbability = (value) => {
        const probability = Number(value);

        if (Number.isNaN(probability)) return "N/A";

        return `${(probability <= 1 ? probability * 100 : probability).toFixed(2)}%`;
    };

    const getRiskColor = (risk) => {
        switch (risk?.toLowerCase()) {
            case "high":
                return "text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-500/10";

            case "medium":
                return "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-500/10";

            default:
                return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10";
        }
    };

    const cardClass =
        "bg-white dark:bg-[#111827] border border-slate-200 dark:border-gray-800 rounded-xl p-5 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition cursor-pointer shadow-sm";

    const mutedText =
        "text-slate-500 dark:text-gray-400";

    return (
        <div className="space-y-6">

            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <FileText size={20} />
                    <span className="text-sm font-medium">
                        Machine Reports
                    </span>
                </div>

                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                    Scan Reports
                </h1>

                <p className={`${mutedText} mt-1`}>
                    View and analyze your previous machine scans.
                </p>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                />

                <input
                    type="text"
                    placeholder="Search reports..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none focus:border-emerald-500 transition"
                />
            </div>

            {/* Report List */}
            <div className="space-y-3">

                {filteredScans.length > 0 ? (
                    filteredScans.map((scan, index) => (
                        <div
                            key={scan.id}
                            onClick={() => navigate(`/reports/${encodeURIComponent(scan.id)}`)}
                            className={`${cardClass} group`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                                {/* Machine Information */}
                                <div className="flex items-start gap-4">

                                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <Activity size={22} />
                                    </div>

                                    <div>
                                        <h3 className="text-slate-800 dark:text-white font-semibold">
                                            Machine Scan #{scans.length - index}
                                        </h3>

                                        <p className={`text-sm mt-1 ${mutedText}`}>
                                            Machine Type: {scan.input?.type || "N/A"}
                                        </p>

                                        <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                                            {scan.time
                                                ? new Date(scan.time).toLocaleString()
                                                : "Date unavailable"}
                                        </p>
                                    </div>
                                </div>

                                {/* Scan Results */}
                                <div className="flex flex-wrap items-center gap-4 md:gap-6">

                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">
                                            Failure Probability
                                        </p>

                                        <p className="text-slate-800 dark:text-white font-semibold">
                                            {getProbability(scan.failure_probability)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">
                                            Risk Level
                                        </p>

                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(scan.risk_level)}`}
                                        >
                                            {scan.risk_level || "Unknown"}
                                        </span>
                                    </div>


                                    <div className="flex items-center gap-3 ml-auto">
                                        <div className="hidden sm:block text-right">
                                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                View Full Report
                                            </p>

                                            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                                                Click to view details
                                            </p>
                                        </div>

                                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                            <ArrowRight
                                                size={20}
                                                className="transition-transform group-hover:translate-x-1"
                                            />
                                        </div>
                                    </div>


                                </div>
                            </div>
                        </div>
                    ))
                ) : (

                    /* Empty State */
                    <div className="text-center py-16 bg-white dark:bg-[#111827] border border-slate-200 dark:border-gray-800 rounded-xl shadow-sm">

                        <FileText
                            size={36}
                            className="mx-auto text-slate-400 dark:text-gray-600 mb-3"
                        />

                        <h3 className="text-slate-800 dark:text-white font-semibold">
                            No Reports Found
                        </h3>

                        <p className="text-slate-500 dark:text-gray-500 text-sm mt-2">
                            {scans.length === 0
                                ? "Run a machine scan to generate your first report."
                                : "No reports match your search."}
                        </p>

                    </div>
                )}

            </div>
        </div>
    );
}
