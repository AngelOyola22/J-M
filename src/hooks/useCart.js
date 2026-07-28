import { useState, useEffect } from 'react';

/**
 * Hook personalizado para gestionar el carrito de compras.
 * Persiste automáticamente en localStorage.
 * Soporta personalización por item (texto grabado, dedicatoria, etc.).
 */
export function useCart() {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('jm-cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sincronizar con localStorage cada vez que cambia el carrito
  useEffect(() => {
    localStorage.setItem('jm-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, options = {}) => {
    const { personalization = '', personalization_image_url = null } = options;

    setCart(prev => {
      // Find existing item with same product ID AND same personalization/image
      const existingIndex = prev.findIndex(item => 
        item.product.id === product.id && 
        item.personalization === personalization &&
        item.personalization_image_url === personalization_image_url
      );

      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += 1;
        return newCart;
      }
      return [...prev, { product, quantity: 1, personalization, personalization_image_url }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  /**
   * Actualiza el texto de personalización y foto de un item.
   * @param {string|number} id - ID del producto
   * @param {string} text - Texto de personalización
   * @param {string} imageUrl - URL de la imagen (opcional)
   */
  const updatePersonalization = (id, text, imageUrl = null) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === id) {
          const newItem = { ...item, personalization: text };
          if (imageUrl !== null) newItem.personalization_image_url = imageUrl;
          return newItem;
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.product.price || 0) * item.quantity,
    0
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    updateQuantity,
    updatePersonalization,
    removeFromCart,
    clearCart,
    cartTotal,
    cartCount,
  };
}
