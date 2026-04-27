// src/api.js — Utilitaire pour appeler le backend
const BASE = "http://localhost:3001/api";

export async function apiFetch(path, options = {}) {
    const token = localStorage.getItem("token");
    const res = await fetch(BASE + path, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...options
    });

    const data = await res.json();
    if (!res.ok) throw data; // { error: "..." }
    return data;
}

// Helpers auth
export const authAPI = {
    login: (email, password) =>
        apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

    register: (email, password) =>
        apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),

    me: () => apiFetch("/auth/me"),

    logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    },

    getUser: () => {
        const u = localStorage.getItem("user");
        return u ? JSON.parse(u) : null;
    },

    isLoggedIn: () => !!localStorage.getItem("token"),

    isAdmin: () => {
        const u = localStorage.getItem("user");
        return u ? JSON.parse(u).role === "admin" : false;
    }
};
