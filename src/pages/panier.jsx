import "../styles/panier.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Panier() {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);


    useEffect(() => {
        const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
        setCartItems(savedCart);
    }, []);

   

    const removeFromCart = (name) => {
        const updatedCart = cartItems.filter(item => item.name !== name);
        setCartItems(updatedCart);
        localStorage.setItem("cart", JSON.stringify(updatedCart));
    };

    const total = cartItems.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1),
        0
    );

    return (
        <div className="panier-container">
            <header className="panier-header">
                <h1>Mon Panier</h1>
                <button onClick={() => navigate("/")}>
                    Retour au marché
                </button>
            </header>

            <div className="panier-content">
                {cartItems.length === 0 && <p>Votre panier est vide</p>}

                {cartItems.map((item, index) => (
                    <div key={index} className="panier-item">
                        <img src={item.image} alt={item.name} />

                        <div className="item-details">
                            <h3>{item.name}</h3>
                            <p>{item.price} {item.currency}</p>
                            <p>Quantité : {item.quantity}</p>

                            <button onClick={() => removeFromCart(item.name)}>
                                Supprimer
                            </button>
                        </div>

                        <div className="item-total">
                            {(Number(item.price) * item.quantity).toFixed(2)} {item.currency}
                        </div>
                    </div>
                ))}
            </div>

            <div className="panier-summary">
                <h2>Total : {total.toFixed(2)} €</h2>
                <button className="checkout-button">
                    Procéder au paiement
                </button>
            </div>
        </div>
    );
}
