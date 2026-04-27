import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/compte.css";
import { authAPI } from "../api";

function Register() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async () => {
        setError("");

        // Validation côté client avant d'appeler le serveur
        if (!email || !username || !password || !confirm) {
            setError("Veuillez remplir tous les champs.");
            return;
        }
        if (username.length < 3) {
            setError("Le pseudo doit faire au moins 3 caractères.");
            return;
        }
        if (password !== confirm) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }
        if (password.length < 6) {
            setError("Le mot de passe doit faire au moins 6 caractères.");
            return;
        }

        setLoading(true);
        try {
            // On envoie email + password + username au backend
            const { token, user } = await authAPI.register(email, password, username);
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            navigate("/"); // Redirige vers le dashboard après inscription
        } catch (err) {
            setError(err.error || "Erreur lors de l'inscription.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="compte-container">
            <div className="compte-box">
                <h1 className="compte-title">Créer un compte</h1>

                {/* Affiche l'erreur si elle existe */}
                {error && <p className="compte-error">{error}</p>}

                <div className="compte-input-group">
                    <label>Pseudo</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="MonPseudo"
                    />
                </div>

                <div className="compte-input-group">
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemple@mail.com"
                    />
                </div>

                <div className="compte-input-group">
                    <label>Mot de passe</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>

                <div className="compte-input-group">
                    <label>Confirmer le mot de passe</label>
                    <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        placeholder="••••••••"
                    />
                </div>

                <button
                    className="compte-button"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? "Inscription..." : "S'inscrire"}
                </button>

                <p className="redirect-text">
                    J'ai déjà un compte ?{" "}
                    <Link to="/login" className="redirect-link">
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
