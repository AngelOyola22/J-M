import { useState } from 'react';
import { ShoppingCart, Search, X, Plus, Minus, Star, CheckCircle, RefreshCw } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import ProductCard from '../components/ProductCard';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { supabase } from '../lib/supabase';

/* =====================================================
   Sub-componente: Item del carrito con personalización
   ===================================================== */
function CartItem({ item, onUpdateQty, onRemove, onUpdatePersonalization }) {
  const [showPersonal, setShowPersonal] = useState(!!item.personalization);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('customer-uploads')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('customer-uploads').getPublicUrl(fileName);
      
      // Update item in cart with existing text + new image URL
      onUpdatePersonalization(item.product.id, item.personalization || '', data.publicUrl);
    } catch (err) {
      alert('Error al subir la imagen: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="cart-item">
      <img
        src={item.product.image_url}
        alt={item.product.title}
        className="cart-item-img"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAiIGhlaWdodD0iNzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjcwIiBoZWlnaHQ9IjcwIiBmaWxsPSIjZjVmMGU4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNhYTk5ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7wn5SBPC90ZXh0Pjwvc3ZnPg==';
        }}
      />
      <div className="cart-item-details">
        <h4>{item.product.title}</h4>
        <p className="cart-item-price">${((item.product.price || 0) * item.quantity).toFixed(2)}</p>
        <div className="qty-controls">
          <button
            className="qty-btn"
            onClick={() => { if (item.quantity > 1) onUpdateQty(item.product.id, -1); else onRemove(item.product.id); }}
          >
            <Minus size={14} />
          </button>
          <span className="qty-value">{item.quantity}</span>
          <button className="qty-btn" onClick={() => onUpdateQty(item.product.id, 1)}>
            <Plus size={14} />
          </button>
          <button className="qty-remove" onClick={() => onRemove(item.product.id)}>
            <X size={14} />
          </button>
        </div>

        {/* Indicador de Foto */}
        {item.product.is_personalizable && (
          <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {item.personalization_image_url ? (
              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✅ Foto adjuntada</span>
            ) : isUploading ? (
              <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>⏳ Subiendo...</span>
            ) : (
              <label style={{ color: '#f59e0b', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>
                📸 Subir foto aquí
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            )}
          </div>
        )}

        {/* Toggle personalización */}
        <button
          className="cart-personalization-toggle"
          onClick={() => setShowPersonal(p => !p)}
        >
          ✏️ {showPersonal ? 'Ocultar' : (item.personalization ? 'Ver' : 'Agregar')} personalización
        </button>

        {showPersonal && (
          <textarea
            className="cart-personalization-input"
            rows="2"
            value={item.personalization}
            onChange={(e) => onUpdatePersonalization(item.product.id, e.target.value)}
            placeholder="Ej: Con el nombre 'Ana', letra dorada..."
          />
        )}
        {!showPersonal && item.personalization && (
          <p className="cart-personalization-preview">✏️ {item.personalization}</p>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   Página principal: Home
   ===================================================== */
function Home() {
  const { products, settings, loading, error, refetch } = useProducts();
  const { categories } = useCategories();
  const {
    cart, isCartOpen, setIsCartOpen,
    addToCart, updateQuantity, updatePersonalization,
    removeFromCart, clearCart, cartTotal, cartCount,
  } = useCart();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // null = Todos
  const [showReceipt, setShowReceipt] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Categoría activa (objeto completo)
  const activeCategory = categories.find(c => c.id === selectedCategoryId) || null;

  const handleAddToCart = (product) => {
    addToCart(product);
    setToast(`✓ ${product.title} agregado`);
    setTimeout(() => setToast(null), 2500);
  };

  // Filtrar y ordenar
  const filteredProducts = products
    .filter(p => {
      const matchSearch =
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      // Filtrar por category_id (null = mostrar todos)
      const matchCategory =
        selectedCategoryId === null || p.category_id === selectedCategoryId;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'name_desc') return b.title.localeCompare(a.title);
      if ((a.display_order || 0) !== (b.display_order || 0)) {
        return (a.display_order || 0) - (b.display_order || 0);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const promotions = filteredProducts.filter(p => p.is_promotion);
  const regularProducts = filteredProducts.filter(p => !p.is_promotion);

  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const handleWhatsApp = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setIsProcessingOrder(true);
    const name = document.getElementById('checkout-name').value;
    const message = document.getElementById('checkout-message').value;

    let text = `${settings.whatsappMessage}\n\n`;
    text += `*Cliente:* ${name}\n`;
    if (message) text += `*Nota general:* ${message}\n\n`;
    text += `*Detalle del Pedido:*\n`;

    cart.forEach(item => {
      text += `- ${item.quantity}x ${item.product.title} ($${item.product.price})\n`;
      if (item.personalization) {
        text += `  ↳ Personalización: ${item.personalization}\n`;
      }
      if (item.personalization_image_url) {
        text += `  ↳ Foto Adjunta: ${item.personalization_image_url}\n`;
      }
    });

    text += `\n*TOTAL: $${cartTotal.toFixed(2)}*`;

    const requiresPhoto = cart.some(item => item.product.is_personalizable && !item.personalization_image_url);
    if (requiresPhoto) {
      text += `\n\n_📸 Nota: He incluido productos personalizables con foto. Por favor, indícame cómo te envío las imágenes._`;
    }

    try {
      // 1. Crear Orden
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_name: name,
          customer_note: message,
          total_price: cartTotal
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Crear Items de la Orden
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price,
        personalization_text: item.personalization || null,
        personalization_image_url: item.personalization_image_url || null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      text += `\n\n_Orden #: ${orderData.id.split('-')[0]}_`;

      setCheckoutData({
        name,
        note: message,
        items: [...cart],
        total: cartTotal,
        whatsappText: text,
        date: new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }),
      });

      setShowReceipt(true);
      setIsCartOpen(false);
    } catch (error) {
      console.error('Error procesando la orden:', error);
      alert('Hubo un problema al procesar tu orden. Por favor intenta nuevamente.');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  return (
    <>
      <div className="glass-bg" />

      {/* Toast */}
      {toast && (
        <div className="toast-notification">
          <CheckCircle size={16} />
          {toast}
        </div>
      )}

      {/* Header */}
      <header>
        <nav>
          <div className="logo">J&M <span>Resin Art</span></div>

          <ul className="nav-links">
            <li><a href="#home" onClick={() => setMobileMenuOpen(false)}>Inicio</a></li>
            <li><a href="#products" onClick={() => setMobileMenuOpen(false)}>Productos</a></li>
            <li><a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>¿Cómo pedimos?</a></li>
            <li>
              <button onClick={() => setIsCartOpen(true)} className="cart-btn">
                <ShoppingCart size={24} />
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </button>
            </li>
          </ul>

          <div className="mobile-controls">
            <button onClick={() => setIsCartOpen(true)} className="cart-btn">
              <ShoppingCart size={22} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
            <button
              className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menú"
            >
              <span /><span /><span />
            </button>
          </div>
        </nav>

        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#home" onClick={() => setMobileMenuOpen(false)}>Inicio</a>
          <a href="#products" onClick={() => setMobileMenuOpen(false)}>Productos</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>¿Cómo pedimos?</a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="home" className="hero">
          <div className="hero-content">
            <h1>Arte en Resina <br /><span className="highlight">Personalizado</span></h1>
            <p style={{ whiteSpace: 'pre-line' }}>{settings.heroSubtitle}</p>
            <a href="#products" className="btn-secondary">Explorar Colección</a>
          </div>
          <div className="hero-image-wrapper">
            <div className="floating-image">
              <img
                src={settings.heroImage}
                alt="Arte en Resina J&M"
                onError={(e) => { e.target.onerror = null; e.target.src = '/hero.jfif'; }}
              />
            </div>
          </div>
        </section>

        {/* Productos */}
        <section id="products" className="products">
          <h2>Nuestra <span className="highlight">Colección</span></h2>

          {/* Toolbar: búsqueda + orden */}
          <div className="toolbar">
            <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="search-clear">
                  <X size={16} />
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="default">Recomendados</option>
              <option value="price_asc">Menor Precio</option>
              <option value="price_desc">Mayor Precio</option>
              <option value="name_asc">Nombre (A-Z)</option>
              <option value="name_desc">Nombre (Z-A)</option>
            </select>
          </div>

          {/* Category Chips — usando tabla categories de Supabase */}
          {categories.length > 0 && (
            <div className="category-chips">
              {/* Chip "Todos" */}
              <button
                className={`category-chip ${selectedCategoryId === null ? 'active' : ''}`}
                onClick={() => setSelectedCategoryId(null)}
              >
                🏷️ Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`category-chip ${selectedCategoryId === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  {cat.icon && <span>{cat.icon}</span>} {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Skeletons de carga */}
          {loading && (
            <div className="product-grid">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-image" />
                  <div className="skeleton-content">
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-line skeleton-price" />
                    <div className="skeleton-line skeleton-desc" />
                    <div className="skeleton-line skeleton-btn" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="error-state">
              <p>😕 {error}</p>
              <button onClick={refetch} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '1rem' }}>
                <RefreshCw size={16} /> Reintentar
              </button>
            </div>
          )}

          {/* Promociones */}
          {!loading && !error && promotions.length > 0 && (
            <div className="promo-section">
              <h3 className="section-subtitle promo-title">
                <Star fill="var(--primary)" size={22} /> Ofertas Especiales
              </h3>
              <div className="product-grid">
                {promotions.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    showPromoBadge
                  />
                ))}
              </div>
            </div>
          )}

          {/* Catálogo */}
          {!loading && !error && (
            <>
              <h3 className="section-subtitle">
                Catálogo General
                {activeCategory && (
                  <span className="category-filter-active">
                    {activeCategory.icon} {activeCategory.name}
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '6px', color: 'inherit' }}
                    >
                      <X size={14} />
                    </button>
                  </span>
                )}
              </h3>
              <div className="product-grid">
                {regularProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
                {filteredProducts.length === 0 && (
                  <p className="no-results">
                    No se encontraron productos{activeCategory ? ` en "${activeCategory.icon} ${activeCategory.name}"` : ''}.
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="how-section">
          <h2>¿Cómo <span className="highlight">Pedimos?</span></h2>
          <p className="how-subtitle">Realizar tu pedido es muy fácil. ¡Te guiamos paso a paso!</p>
          <div className="how-grid">
            {[
              { num: 1, icon: '🛒', title: 'Elige tu Producto', desc: 'Explora nuestra colección y agrega los que más te gusten al carrito.' },
              { num: 2, icon: '✏️', title: 'Personalízalo', desc: 'Agrega nombres, letras, colores o cualquier detalle especial en la opción de personalización.' },
              { num: 3, icon: '📱', title: 'Envía tu Pedido', desc: 'Completa tus datos y envíanos el pedido directamente por WhatsApp con un clic.' },
              { num: 4, icon: '🚀', title: '¡Lo recibes!', desc: 'Coordinamos la entrega o envío a cualquier parte de Ecuador.' },
            ].map(step => (
              <div key={step.num} className="how-card">
                <div className="how-number">{step.num}</div>
                <div className="how-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Cart Sidebar */}
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>
            <ShoppingCart size={22} /> Tu Carrito
            {cartCount > 0 && <span className="cart-count-label">{cartCount} items</span>}
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="cart-close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingCart size={48} opacity={0.2} />
              <p>Tu carrito está vacío</p>
              <a href="#products" onClick={() => setIsCartOpen(false)} className="btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                Ver Productos
              </a>
            </div>
          ) : (
            cart.map(item => (
              <CartItem
                key={item.product.id}
                item={item}
                onUpdateQty={updateQuantity}
                onRemove={removeFromCart}
                onUpdatePersonalization={updatePersonalization}
              />
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <span className="cart-total-price">${cartTotal.toFixed(2)}</span>
            </div>
            <form onSubmit={handleWhatsApp} className="checkout-form">
              <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                <label htmlFor="checkout-name">Nombre Completo</label>
                <input type="text" id="checkout-name" required placeholder="Ej. Juan Pérez" />
              </div>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="checkout-message">Nota General (Opcional)</label>
                <textarea id="checkout-message" rows="2" placeholder="Ej. Para entregar en Quito..." />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={isProcessingOrder}>
                {isProcessingOrder ? 'Procesando orden...' : 'Comprar por WhatsApp 💬'}
              </button>
            </form>
          </div>
        )}
      </div>

      {isCartOpen && <div className="cart-overlay" onClick={() => setIsCartOpen(false)} />}

      {/* Footer */}
      <footer>
        <div className="footer-content">
          <div className="footer-logo">J&M <span>Resin Art</span></div>
          <p>Arte en resina personalizado · Ecuador 🇪🇨</p>
          <p>
            Síguenos en{' '}
            <a href="https://www.instagram.com/jm.gongbang/" target="_blank" rel="noreferrer">
              Instagram (@jm.gongbang)
            </a>
          </p>
          <p className="footer-copy">© {new Date().getFullYear()} J&M Resin Art. Todos los derechos reservados.</p>
        </div>
      </footer>

      <FloatingWhatsApp phoneNumber={settings.whatsappNumber} />

      {/* Receipt Modal */}
      {showReceipt && checkoutData && (
        <div className="modal-overlay">
          <div className="receipt-container">
            <div className="receipt-content" id="print-area">
              <div className="receipt-header">
                <h2>J&M Resin Art</h2>
                <p>Comprobante de Pedido</p>
                <p className="receipt-date">Fecha: {checkoutData.date}</p>
              </div>
              <div className="receipt-client">
                <p><strong>Cliente:</strong> {checkoutData.name}</p>
                {checkoutData.note && <p><strong>Nota:</strong> {checkoutData.note}</p>}
              </div>
              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Cant.</th>
                    <th>Producto</th>
                    <th>Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {checkoutData.items.map((item, idx) => (
                    <>
                      <tr key={idx}>
                        <td>{item.quantity}</td>
                        <td>{item.product.title}</td>
                        <td>${((item.product.price || 0) * item.quantity).toFixed(2)}</td>
                      </tr>
                      {item.personalization && (
                        <tr key={`${idx}-p`} style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <td />
                          <td colSpan="2">✏️ {item.personalization}</td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              <div className="receipt-total">
                Total a pagar: <span>${checkoutData.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="no-print receipt-actions">
              <button
                onClick={() => window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(checkoutData.whatsappText)}`, '_blank')}
                className="btn-primary"
              >
                💬 Enviar Pedido por WhatsApp
              </button>
              <div className="receipt-secondary-btns">
                <button onClick={() => window.print()} className="btn-secondary">🖨️ Imprimir</button>
                <button
                  onClick={() => { setShowReceipt(false); clearCart(); }}
                  className="btn-secondary"
                  style={{ border: 'none', background: 'var(--input-bg)' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Home;
