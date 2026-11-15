import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Activity,
    AlertTriangle,
    CheckCircle,
    Thermometer,
    Gauge,
    Settings,
    Clock,
    Wrench,
    FileText,
    Cpu,
    Zap,
    Droplets,
    ShieldCheck,
} from "lucide-react";
import html2canvas from "html2canvas-pro";

const ReportDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Toast state (hooks must stay above any early return)
    const [toast, setToast] = useState(null);

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    // Get all saved scans
    const scans = JSON.parse(localStorage.getItem("scans") || "[]");

    // Find selected machine report
    const scan = scans.find(
        (item) => String(item.id || item.time) === id
    );

    // Theme-aware styles
    const cardClass =
        "bg-white dark:bg-[#111827] border border-slate-200 dark:border-gray-800 rounded-xl p-5 shadow-sm";

    const headingClass =
        "text-lg font-semibold text-slate-800 dark:text-white";

    const descriptionClass =
        "text-sm text-slate-500 dark:text-gray-400";

    // Handle missing report
    if (!scan) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
                <AlertTriangle size={45} className="text-amber-500 mb-4" />

                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    Report Not Found
                </h2>

                <p className="text-slate-500 dark:text-gray-400 mt-2">
                    The requested machine report could not be found.
                </p>

                <button
                    onClick={() => navigate("/reports")}
                    className="mt-5 px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                    Back to Reports
                </button>
            </div>
        );
    }

    // Prediction status
    const isFailure =
        scan.prediction === true ||
        scan.prediction === 1 ||
        scan.prediction === "1" ||
        scan.prediction === "true";

    // Probability formatting
    const probability = Number(scan.failure_probability || 0);

    const probabilityPercent =
        probability <= 1
            ? (probability * 100).toFixed(2)
            : probability.toFixed(2);

    // Machine parameters
    const parameters = [
        {
            label: "Machine Type",
            value: scan.input?.type || "N/A",
            icon: Cpu,
        },
        {
            label: "Air Temperature",
            value: scan.input?.air_temp != null
                ? `${scan.input.air_temp} K`
                : "N/A",
            icon: Thermometer,
        },
        {
            label: "Process Temperature",
            value: scan.input?.process_temp != null
                ? `${scan.input.process_temp} K`
                : "N/A",
            icon: Thermometer,
        },
        {
            label: "Rotational Speed",
            value: scan.input?.rpm != null
                ? `${scan.input.rpm} RPM`
                : "N/A",
            icon: Gauge,
        },
        {
            label: "Torque",
            value: scan.input?.torque != null
                ? `${scan.input.torque} Nm`
                : "N/A",
            icon: Zap,
        },
        {
            label: "Tool Wear",
            value: scan.input?.tool_wear != null
                ? `${scan.input.tool_wear} min`
                : "N/A",
            icon: Settings,
        },
    ];

    // Rule-based failure alerts
    const alerts = Array.isArray(scan.rule_alerts)
        ? scan.rule_alerts
        : [];

    // Report date
    const reportDate = scan.time
        ? new Date(scan.time).toLocaleString()
        : "Unknown";

    // Export report as PDF
    const handleExportPDF = async () => {
        const reportElement = document.getElementById("report-content");

        if (!reportElement) {
            showToast("error", "Report content not found!");
            return;
        }

        const filename = `MachineGuard-Report-${scan.id || "report"}.pdf`;

        // IMPORTANT: showSaveFilePicker must be called FIRST, directly inside
        // the click handler (before any other await), otherwise the browser blocks it.
        let fileHandle = null;

        if (window.showSaveFilePicker) {
            try {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [
                        {
                            description: "PDF Document",
                            accept: { "application/pdf": [".pdf"] },
                        },
                    ],
                });
            } catch (error) {
                // User closed the Save dialog
                if (error.name === "AbortError") return;

                // Any other problem -> fall back to normal download
                console.warn("Save picker unavailable, using normal download:", error);
                fileHandle = null;
            }
        }

        try {
            // 1) Convert report to canvas (html2canvas-pro supports oklch colors)
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                onclone: (clonedDocument) => {
                    // Always export in light theme, even if dark mode is on
                    clonedDocument.documentElement.classList.remove("dark");
                },
            });

            // 2) Create A4 PDF, split canvas into pages
            const { jsPDF } = await import("jspdf");

            const pdf = new jsPDF("p", "mm", "a4");

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;

            const contentWidth = pageWidth - margin * 2;
            const contentHeight = pageHeight - margin * 2;

            const pxPerMm = canvas.width / contentWidth;
            const pageHeightPx = Math.floor(contentHeight * pxPerMm);

            let renderedPx = 0;
            let pageIndex = 0;

            while (renderedPx < canvas.height) {
                const sliceHeight = Math.min(
                    pageHeightPx,
                    canvas.height - renderedPx
                );

                const pageCanvas = document.createElement("canvas");
                pageCanvas.width = canvas.width;
                pageCanvas.height = sliceHeight;

                const ctx = pageCanvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                ctx.drawImage(
                    canvas,
                    0,
                    renderedPx,
                    canvas.width,
                    sliceHeight,
                    0,
                    0,
                    canvas.width,
                    sliceHeight
                );

                const imageData = pageCanvas.toDataURL("image/jpeg", 0.95);

                if (pageIndex > 0) pdf.addPage();

                pdf.addImage(
                    imageData,
                    "JPEG",
                    margin,
                    margin,
                    contentWidth,
                    sliceHeight / pxPerMm
                );

                renderedPx += sliceHeight;
                pageIndex++;
            }

            const pdfBlob = pdf.output("blob");

            // 3) Save
            if (fileHandle) {
                // Saved to the folder the user selected
                const writable = await fileHandle.createWritable();
                await writable.write(pdfBlob);
                await writable.close();
            } else {
                // Fallback: normal browser download
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            }

            showToast("success", "PDF downloaded successfully!");
        } catch (error) {
            console.error("PDF Export Error:", error);
            showToast("error", `Could not save PDF: ${error.message}`);
        }
    };

    return (
        <div id="report-content" className="space-y-6">

            {/* Header */}
            <div data-html2canvas-ignore="true"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">

                <div>
                    <button
                        onClick={() => navigate("/reports")}
                        className="flex items-center gap-2 text-slate-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-5 transition"
                    >
                        <ArrowLeft size={18} />
                        Back to Reports
                    </button>

                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Machine Report Details
                    </h1>

                    <p className={descriptionClass + " mt-1"}>
                        Individual machine prediction and failure analysis.
                    </p>
                </div>

                <button
                    onClick={handleExportPDF}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition shadow-lg shadow-emerald-500/10"
                >
                    <FileText size={18} />
                    Export PDF
                </button>

            </div>

            {/* Printable Report Header */}
            <div className="hidden print:block border-b border-gray-300 pb-5">
                <h1 className="text-2xl font-bold text-gray-900">
                    MACHINEGUARD AI
                </h1>

                <p className="text-gray-600 mt-1">
                    Predictive Maintenance - Individual Machine Report
                </p>

                <div className="mt-4 text-sm text-gray-600">
                    <p>Report ID: {scan.id || scan.time}</p>
                    <p>Generated: {reportDate}</p>
                </div>
            </div>

            {/* Report Overview */}
            <div className={cardClass + " print:shadow-none print:border-gray-300"}>

                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className={headingClass}>
                            Prediction Overview
                        </h2>

                        <p className={descriptionClass + " mt-1"}>
                            Machine condition assessment
                        </p>
                    </div>

                    <Activity
                        size={25}
                        className="text-emerald-500"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Prediction */}
                    <div className="rounded-xl p-4 bg-slate-50 dark:bg-[#0b1220] border border-slate-200 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-3">
                            {isFailure ? (
                                <AlertTriangle
                                    size={20}
                                    className="text-red-500"
                                />
                            ) : (
                                <CheckCircle
                                    size={20}
                                    className="text-emerald-500"
                                />
                            )}

                            <p className={descriptionClass}>
                                Prediction Result
                            </p>
                        </div>

                        <h3 className={`text-xl font-bold ${isFailure
                            ? "text-red-500"
                            : "text-emerald-500"
                            }`}>
                            {isFailure
                                ? "Failure Detected"
                                : "Normal Operation"}
                        </h3>
                    </div>

                    {/* Risk Level */}
                    <div className="rounded-xl p-4 bg-slate-50 dark:bg-[#0b1220] border border-slate-200 dark:border-gray-800">
                        <p className={descriptionClass + " mb-3"}>
                            Risk Level
                        </p>

                        <h3 className={`text-xl font-bold ${scan.risk_level?.toLowerCase() === "high"
                            ? "text-red-500"
                            : scan.risk_level?.toLowerCase() === "medium"
                                ? "text-amber-500"
                                : "text-emerald-500"
                            }`}>
                            {scan.risk_level || "Unknown"}
                        </h3>
                    </div>

                    {/* Failure Probability */}
                    <div className="rounded-xl p-4 bg-slate-50 dark:bg-[#0b1220] border border-slate-200 dark:border-gray-800">
                        <p className={descriptionClass + " mb-3"}>
                            Failure Probability
                        </p>

                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                            {probabilityPercent}%
                        </h3>

                        <div className="w-full h-2 bg-slate-200 dark:bg-gray-700 rounded-full mt-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${probability >= 0.7 || probability > 70
                                    ? "bg-red-500"
                                    : probability >= 0.4 || probability > 40
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                    }`}
                                style={{
                                    width: `${Math.min(Number(probabilityPercent), 100)}%`,
                                }}
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Machine Information */}
            <div className={cardClass + " print:shadow-none print:border-gray-300"}>

                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                        <Settings
                            size={22}
                            className="text-blue-500"
                        />
                    </div>

                    <div>
                        <h2 className={headingClass}>
                            Machine Parameters
                        </h2>

                        <p className={descriptionClass}>
                            Input values used for prediction
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                    {parameters.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#0b1220] border border-slate-200 dark:border-gray-800"
                            >
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                    <Icon
                                        size={20}
                                        className="text-emerald-500"
                                    />
                                </div>

                                <div>
                                    <p className={descriptionClass}>
                                        {item.label}
                                    </p>

                                    <p className="font-semibold text-slate-800 dark:text-white mt-1">
                                        {item.value}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                </div>
            </div>

            {/* Prediction Explanation */}
            <div className={cardClass + " print:shadow-none print:border-gray-300"}>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                        <Activity
                            size={22}
                            className="text-purple-500"
                        />
                    </div>

                    <div>
                        <h2 className={headingClass}>
                            Prediction Explanation
                        </h2>

                        <p className={descriptionClass}>
                            Result generated by the prediction system
                        </p>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0b1220] border border-slate-200 dark:border-gray-800">
                    <p className="text-slate-700 dark:text-gray-300 leading-relaxed">
                        {scan.message ||
                            "No additional prediction explanation is available for this scan."}
                    </p>
                </div>

            </div>

            {/* Failure Analysis */}
            <div className={cardClass + " print:shadow-none print:border-gray-300"}>

                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                        <AlertTriangle
                            size={22}
                            className="text-amber-500"
                        />
                    </div>

                    <div>
                        <h2 className={headingClass}>
                            Failure Analysis
                        </h2>

                        <p className={descriptionClass}>
                            Rule-based alerts detected during analysis
                        </p>
                    </div>
                </div>

                {alerts.length > 0 ? (
                    <div className="space-y-3">

                        {alerts.map((alert, index) => (
                            <div
                                key={index}
                                className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">

                                    <h3 className="font-semibold text-amber-800 dark:text-amber-400">
                                        {alert.name || "Failure Alert"}
                                    </h3>

                                    {alert.code && (
                                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 w-fit">
                                            {alert.code}
                                        </span>
                                    )}

                                </div>

                                <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">
                                    {alert.detail || "No additional details available."}
                                </p>
                            </div>
                        ))}

                    </div>
                ) : (
                    <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3">
                        <CheckCircle
                            size={22}
                            className="text-emerald-500"
                        />

                        <p className="text-emerald-700 dark:text-emerald-400">
                            No rule-based failure alerts were detected.
                        </p>
                    </div>
                )}

            </div>

            {/* Maintenance Recommendation */}
            <div className={cardClass + " print:shadow-none print:border-gray-300"}>

                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Wrench
                            size={22}
                            className="text-emerald-500"
                        />
                    </div>

                    <div>
                        <h2 className={headingClass}>
                            Maintenance Recommendations
                        </h2>

                        <p className={descriptionClass}>
                            Suggested maintenance actions
                        </p>
                    </div>
                </div>

                {scan.maintenance_required ? (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle
                                size={20}
                                className="text-red-500"
                            />

                            <h3 className="font-semibold text-red-700 dark:text-red-400">
                                Maintenance Required
                            </h3>
                        </div>

                        <ul className="space-y-2 text-sm text-slate-700 dark:text-gray-300 list-disc pl-5">
                            <li>Inspect the machine for abnormal operating conditions.</li>
                            <li>Check temperature, rotational speed and torque readings.</li>
                            <li>Inspect tool wear and replace worn components if necessary.</li>
                            <li>Schedule maintenance before continued operation.</li>
                        </ul>
                    </div>
                ) : (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck
                                size={20}
                                className="text-emerald-500"
                            />

                            <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">
                                No Immediate Maintenance Required
                            </h3>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-gray-400">
                            Continue regular machine monitoring and follow the recommended preventive maintenance schedule.
                        </p>
                    </div>
                )}

            </div>

            {/* Report Footer */}
            <div className="text-center py-4 border-t border-slate-200 dark:border-gray-800 print:border-gray-300">
                <p className="text-xs text-slate-500 dark:text-gray-400">
                    MACHINEGUARD AI - Predictive Maintenance System
                </p>

                <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                    Report generated on {reportDate}
                </p>
            </div>

            {/* Toast */}
            {toast && (
                <div
                    data-html2canvas-ignore="true"
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium print:hidden ${toast.type === "success"
                        ? "bg-emerald-50 dark:bg-[#0b2a1f] border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-[#2a0b0b] border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400"
                        }`}
                >
                    {toast.type === "success" ? (
                        <CheckCircle size={20} />
                    ) : (
                        <AlertTriangle size={20} />
                    )}

                    <span>{toast.message}</span>
                </div>
            )}

        </div>
    );
};

export default ReportDetails;