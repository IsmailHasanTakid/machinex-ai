import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    ScanLine,
    Activity,
    Cpu,
    Sun,
    Moon,
    ChevronRight,
    Menu,
    FileText,
    X,
    ShieldCheck,
} from "lucide-react";

const links = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/scanner", label: "Machine Scanner", icon: ScanLine },
    { to: "/analysis", label: "Failure Analysis", icon: Activity },
    { to: "/reports", label: "Reports", icon: FileText },
];

export default function Layout() {
    const [dark, setDark] = useState(
        () => localStorage.getItem("machineguard-theme") === "dark"
    );

    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const currentPage =
        links.find((link) => link.to === location.pathname)?.label || "Dashboard";

    useEffect(() => {
        document.documentElement.classList.toggle("dark", dark);
        localStorage.setItem("machineguard-theme", dark ? "dark" : "light");
    }, [dark]);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-[#080f1e] transition-colors">

            {/* Desktop Sidebar */}

            <aside className="hidden md:flex fixed top-0 left-0 h-screen w-[260px] shrink-0 flex-col bg-[#0b1425] text-white border-r border-white/5 z-40 overflow-y-auto">

                {/* Brand */}

                <div className="px-6 py-7 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                            <Cpu size={25} />
                        </div>

                        <div>
                            <h1 className="font-bold text-lg tracking-wide">
                                MACHINEGUARD
                            </h1>
                            <p className="text-[10px] tracking-[3px] text-sky-400 font-semibold">
                                ARTIFICIAL INTELLIGENCE
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}

                <div className="px-4 py-7 flex-1">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-[2px] text-slate-500 mb-4">
                        Workspace
                    </p>

                    <nav className="space-y-2">
                        {links.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === "/"}
                                className={({ isActive }) =>
                                    `group relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${isActive
                                        ? "bg-sky-500/15 text-sky-400 border border-sky-400/20"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-sky-400" />
                                        )}

                                        <Icon size={19} />
                                        <span>{label}</span>

                                        {isActive && (
                                            <ChevronRight
                                                size={16}
                                                className="ml-auto"
                                            />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* Sidebar Bottom */}

                <div className="p-4">
                    <div className="rounded-2xl border border-sky-400/10 bg-gradient-to-br from-sky-500/10 to-blue-500/5 p-4">
                        <div className="flex items-center gap-2 text-sky-400">
                            <ShieldCheck size={18} />
                            <span className="text-xs font-semibold">
                                AI Prediction Engine
                            </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Intelligent machine failure prediction and maintenance analysis.
                        </p>
                    </div>

                    <div className="flex items-center justify-between px-2 pt-5">
                        <span className="text-[11px] text-slate-500">
                            MACHINEGUARD AI
                        </span>
                        <span className="text-[10px] text-slate-600">
                            v1.0.0
                        </span>
                    </div>
                </div>
            </aside>

            {/* Main Area */}

            <div className="flex-1 min-w-0 flex flex-col md:ml-[260px]">

                {/* Top Header */}

                <header className="sticky print:hidden top-0 z-30 h-[76px] flex items-center justify-between px-4 md:px-8 bg-white/90 dark:bg-[#0b1425]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">

                    <div className="flex items-center gap-3">

                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Toggle navigation"
                        >
                            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>

                        <div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>Workspace</span>
                                <ChevronRight size={13} />
                                <span className="text-sky-500 font-medium">
                                    {currentPage}
                                </span>
                            </div>

                            <h2 className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                                {currentPage}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">

                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Predictive Maintenance
                        </div>

                        <button
                            onClick={() => setDark(!dark)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:border-sky-400 transition"
                            aria-label="Toggle theme"
                            title={dark ? "Light Mode" : "Dark Mode"}
                        >
                            {dark ? <Sun size={19} /> : <Moon size={19} />}
                        </button>
                    </div>
                </header>

                {/* Mobile Navigation */}

                {mobileOpen && (
                    <div className="md:hidden bg-[#0b1425] p-4 space-y-2">
                        {links.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === "/"}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 p-3 rounded-xl text-sm ${isActive
                                        ? "bg-sky-500/15 text-sky-400"
                                        : "text-slate-400 hover:bg-white/5"
                                    }`
                                }
                            >
                                <Icon size={18} />
                                {label}
                            </NavLink>
                        ))}
                    </div>
                )}

                {/* Page Content */}

                <main className="flex-1 min-w-0 px-6 py-6 md:px-10 md:py-8 xl:px-14">
                    <div className="w-full max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}