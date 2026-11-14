const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(path, options) {
    const res = await fetch(`${BASE}${path}`, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ? JSON.stringify(err.detail) : `API error (${res.status})`);
    }
    return res.json();
}

export const predict = (payload) =>
    request("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

export const getFeatureImportance = () => request("/feature-importance");
export const getHealth = () => request("/health");