import React, { useState, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import StoreHeader from '../../components/store/StoreHeader';
import StoreFooter from '../../components/store/StoreFooter';
import { cartItems as initialCart } from '../../data/mock';

// Create Cart Context
export const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const StoreLayout = () => {
  const [cart, setCart] = useState(initialCart);

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, getCartTotal, getCartCount }}>
      <div className="min-h-screen bg-white flex flex-col">
        <StoreHeader cartCount={getCartCount()} />
        <main className="flex-1">
          <Outlet />
        </main>
        <StoreFooter />
      </div>
    </CartContext.Provider>
  );
};

export default StoreLayout;
