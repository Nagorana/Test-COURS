import "../styles/dashboard.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {

    // Cartes depuis localStorage
    const [cards, setCards] = useState(() => {
        const saved = localStorage.getItem("cards");
        return saved
            ? JSON.parse(saved)
            : [
                {
                    name: "Pikachu V",
                    price: 25,
                    currency: "€",
                    image: "https://images.pokemontcg.io/swsh4/44_hires.png",
                    endTime: null
                }
            ];
    });

    const [isSelling, setIsSelling] = useState(false);

    const [newCard, setNewCard] = useState({
        name: "",
        price: "",
        image: "",
        currency: "€",
        endTime: null
    });

    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const addCard = () => {
        if (!newCard.name || !newCard.price || !newCard.image) return;

        if (newCard.endTime && new Date(newCard.endTime).getTime() < Date.now()) {
            alert("Vous venez du passé !");
            return;
        }

        const cardToAdd = {
            ...newCard,
            price: parseFloat(newCard.price), // convertit en nombre
            endTime: newCard.endTime ? new Date(newCard.endTime).getTime() : null
        };

        const updatedCards = [cardToAdd, ...cards];
        setCards(updatedCards);
        localStorage.setItem("cards", JSON.stringify(updatedCards));

        setNewCard({
            name: "",
            price: "",
            image: "",
            currency: "€",
            endTime: null
        });
        setIsSelling(false);
    };

    const addToCart = (card) => {
        if (card.endTime && Date.now() > card.endTime) {
            alert("Enchère terminée !");
            return;
        }

        const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
        const alreadyReserved = savedCart.find((item) => item.name === card.name);
        if (alreadyReserved) {
            alert("Cette carte est déjà réservée !");
            return;
        }

        const updatedCart = [...savedCart, { ...card, quantity: 1 }];
        localStorage.setItem("cart", JSON.stringify(updatedCart));
    };

    return (
        <div className="market-container">
            <header className="market-header">
                <div className="filters">
                    <input type="text" placeholder="Rechercher..." className="search-input" />
                    <button>Temps</button>
                    <button>Prix</button>
                    <button>Rareté</button>
                    <button>Immédiat/Enchère</button>
                    <button onClick={() => setIsSelling(!isSelling)}>
                        {isSelling ? "Annuler" : "Vendre"}
                    </button>
                </div>
            </header>

            {/* FORMULAIRE VENTE */}
            {isSelling && (
                <div className="add-product-form">
                    <input
                        type="text"
                        placeholder="Nom du produit"
                        value={newCard.name}
                        onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="Prix"
                        value={newCard.price}
                        onChange={(e) => setNewCard({ ...newCard, price: e.target.value })}
                    />
                    <select
                        value={newCard.currency}
                        onChange={(e) => setNewCard({ ...newCard, currency: e.target.value })}
                    >
                        <option value="€">€</option>
                        <option value="$">$</option>
                        <option value="£">£</option>
                        <option value="¥">¥</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Lien image"
                        value={newCard.image}
                        onChange={(e) => setNewCard({ ...newCard, image: e.target.value })}
                    />

                    {/* Toggle Vente immédiate / Enchère */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                        <label>
                            <input
                                type="checkbox"
                                checked={!!newCard.endTime}
                                onChange={(e) =>
                                    setNewCard({ ...newCard, endTime: e.target.checked ? "" : null })
                                }
                            />
                            Enchère
                        </label>
                    </div>

                    {newCard.endTime !== null && (
                        <input
                            type="datetime-local"
                            value={newCard.endTime || ""}
                            onChange={(e) => setNewCard({ ...newCard, endTime: e.target.value })}
                        />
                    )}

                    <button onClick={addCard}>Mettre en vente</button>
                </div>
            )}

            {/* CARTES */}
            <div className="cards-grid">
                {cards.map((card, index) => {
                    const timeLeft = card.endTime ? Math.floor((card.endTime - currentTime) / 1000) : null;
                    const isFinished = card.endTime && currentTime > card.endTime;

                    return (
                        <div key={index} className="card">
                            <img src={card.image} alt={card.name} />
                            <h3>{card.name}</h3>
                            <p>{card.price} {card.currency}</p>

                            {card.endTime ? (
                                <p style={{ color: isFinished ? "red" : "orange" }}>
                                    {isFinished ? "Enchère terminée" : `Temps restant : ${timeLeft}s`}
                                </p>
                            ) : (
                                <p style={{ color: "green" }}>Vente immédiate</p>
                            )}

                            <button onClick={() => addToCart(card)} disabled={isFinished}>
                                Ajouter au panier
                            </button>

                            <button
                                className="delete-button"
                                onClick={() => {
                                    const updatedCards = cards.filter((_, i) => i !== index);
                                    setCards(updatedCards);
                                    localStorage.setItem("cards", JSON.stringify(updatedCards));
                                }}
                            >
                                Supprimer
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
