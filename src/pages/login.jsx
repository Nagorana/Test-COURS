import React, { useState } from "react";
import "../styles/compte.css";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../api";

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setError("");
        if (!email || !password) {
            setError("Veuillez remplir tous les champs.");
            return;
        }
        setLoading(true);
        try {
            const { token, user } = await authAPI.login(email, password);
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            navigate("/");
        } catch (err) {
            setError(err.error || "Erreur de connexion.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="compte-container">
            <div className="compte-box">
                <h1 className="compte-title">Se connecter</h1>

                {error && <p className="compte-error">{error}</p>}

                <div className="compte-input-group">
                    <label>Adresse mail</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        placeholder="exemple@mail.com"
                    />
                </div>

                <div className="compte-input-group">
                    <label>Mot de passe</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        placeholder="••••••••"
                    />
                </div>

                <button
                    className="compte-button"
                    onClick={handleLogin}
                    disabled={loading}
                >
                    {loading ? "Connexion..." : "Se connecter"}
                </button>

                <p className="redirect-text">
                    Je n'ai pas de compte ?{" "}
                    <Link to="/register" className="redirect-link">
                        S'inscrire
                    </Link>
                </p>
            </div>
        </div>
    );
}