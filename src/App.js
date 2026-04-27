// src/App.js — Chef d'orchestre de l'application
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/login";
import Register from "./pages/register";
import Panier from "./pages/panier";
import "./App.css";
import logo from "./assets/logo.png";
import { authAPI } from "./api";

export default function App() {
    return (
        // Router gère la navigation entre pages sans rechargement
        <Router>
            <div className="app-layout">
                {/* Sidebar toujours visible */}
                <Sidebar />
                {/* Zone de contenu : change selon l'URL */}
                <div className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/panier" element={<Panier />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

function Sidebar() {
    const navigate = useNavigate();

    // Lit l'utilisateur connecté depuis localStorage au chargement
    const [user, setUser] = useState(authAPI.getUser());

    useEffect(() => {
        // Polling toutes les 500ms pour détecter login/logout dans le même onglet
        const sync = () => setUser(authAPI.getUser());
        window.addEventListener("storage", sync); // Détecte les changements depuis d'autres onglets
        const interval = setInterval(sync, 500);
        return () => {
            window.removeEventListener("storage", sync);
            clearInterval(interval);
        };
    }, []);

    const handleLogout = () => {
        authAPI.logout(); // Supprime token + user du localStorage
        setUser(null);
        navigate("/login");
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img src={logo} alt="Logo" />
            </div>

            {/* Bloc utilisateur : visible seulement si connecté */}
            {user && (
                <div className="sidebar-user">
                    {/* Affiche le pseudo, pas l'email */}
                    <span className="sidebar-user-email">{user.username}</span>
                    {user.role === "admin" && (
                        <span className="sidebar-badge-admin">Admin</span>
                    )}
                </div>
            )}

            <button onClick={() => navigate("/")}>Dashboard</button>
            <button onClick={() => navigate("/panier")}>Panier</button>

            {/* Rendu conditionnel : connecté vs non connecté */}
            {user ? (
                <>
                    {user.role === "admin" && (
                        <button onClick={() => navigate("/admin")}>
                            ⚙️ Admin
                        </button>
                    )}
                    <button className="sidebar-btn-logout" onClick={handleLogout}>
                        Se déconnecter
                    </button>
                </>
            ) : (
                <button onClick={() => navigate("/login")}>Se connecter</button>
            )}
        </aside>
    );
}
