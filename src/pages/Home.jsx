import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Search, X, Plus, Minus, Star } from 'lucide-react';

function Home() {
  const [products, setProducts] = useState([]);
  const [heroImage, setHeroImage] = useState('/hero.jfif');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default'); // default, price_asc, price_desc, name_asc, name_desc
  const [heroSubtitle, setHeroSubtitle] = useState('💎 Acabados de calidad ✨ Regalos únicos para toda ocasión 📍 Ecuador 🇪🇨');
  const [whatsappNumber, setWhatsappNumber] = useState('593999999999');
  const [whatsappMessage, setWhatsappMessage] = useState('Hola, me gustaría realizar el siguiente pedido:');
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);

  useEffect(() => {
    // Fetch products from Supabase
    const fetchData = async () => {
      const { data: prodData } = await supabase
        .from('products')
        .select('*');

      if (prodData && prodData.length > 0) {
        setProducts(prodData);
      }

      // Fetch settings for hero image and WhatsApp
      const { data: setData } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (setData) {
        if (setData.hero_image_url) setHeroImage(setData.hero_image_url);
        if (setData.hero_subtitle) setHeroSubtitle(setData.hero_subtitle);
        if (setData.whatsapp_number) setWhatsappNumber(setData.whatsapp_number);
        if (setData.whatsapp_message) setWhatsappMessage(setData.whatsapp_message);
      }
    };
    fetchData();
  }, []);

  // Filter and sort products
  const filteredProducts = products
    .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'name_desc') return b.title.localeCompare(a.title);
      
      // Default: display_order ASC, then created_at DESC
      if ((a.display_order || 0) !== (b.display_order || 0)) {
        return (a.display_order || 0) - (b.display_order || 0);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const promotions = filteredProducts.filter(p => p.is_promotion);

  // Cart functions
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleWhatsApp = (e) => {
    e.preventDefault();
    const name = document.getElementById('checkout-name').value;
    const message = document.getElementById('checkout-message').value;

    let text = `${whatsappMessage}\n\n`;
    text += `*Cliente:* ${name}\n`;
    if (message) text += `*Nota:* ${message}\n\n`;
    
    text += `*Detalle del Pedido:*\n`;
    cart.forEach(item => {
      text += `- ${item.quantity}x ${item.product.title} ($${item.product.price})\n`;
    });
    
    text += `\n*TOTAL: $${cartTotal.toFixed(2)}*`;

    setCheckoutData({
      name,
      note: message,
      items: [...cart],
      total: cartTotal,
      whatsappText: text,
      date: new Date().toLocaleDateString()
    });

    setShowReceipt(true);
    setIsCartOpen(false);
  };

  return (
    <>
      <div className="glass-bg"></div>
      
      {/* Header with Cart Icon */}
      <header>
        <nav>
          <div className="logo">J&M <span>Resin Art</span></div>
          <ul className="nav-links">
            <li><a href="#home">Inicio</a></li>
            <li><a href="#products">Productos</a></li>
            <li>
              <button onClick={() => setIsCartOpen(true)} className="cart-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}>
                <ShoppingCart size={24} />
                {cartCount > 0 && <span className="cart-badge" style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--primary)', color: '#000', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{cartCount}</span>}
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        <section id="home" className="hero">
          <div className="hero-content">
            <h1>Arte en Resina <br /><span className="highlight">Personalizado</span></h1>
            <p style={{ whiteSpace: 'pre-line' }}>{heroSubtitle}</p>
            <a href="#products" className="btn-secondary">Explorar Colección</a>
          </div>
          <div className="hero-image-wrapper">
            <div className="floating-image">
              <img src={heroImage} alt="Arte en Resina" style={{ objectFit: 'cover' }} />
            </div>
          </div>
        </section>

        <section id="products" className="products">
          <h2>Nuestra <span className="highlight">Colección</span></h2>
          
          {/* Toolbar: Search and Sort */}
          <div className="toolbar" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem', flexWrap: 'wrap' }}>
            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', padding: '0.8rem 1.5rem', borderRadius: '50px', border: '1px solid var(--glass-border)', flex: '1', maxWidth: '400px' }}>
              <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '10px' }} />
              <input type="text" placeholder="Buscar productos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', width: '100%', fontSize: '1rem' }} />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', padding: '0.8rem 1.5rem', borderRadius: '50px', outline: 'none', fontSize: '1rem', cursor: 'pointer' }}>
              <option value="default">Recomendados</option>
              <option value="price_asc">Menor Precio</option>
              <option value="price_desc">Mayor Precio</option>
              <option value="name_asc">Nombre (A-Z)</option>
              <option value="name_desc">Nombre (Z-A)</option>
            </select>
          </div>

          {/* Promotions Section */}
          {promotions.length > 0 && (
            <div style={{ marginBottom: '4rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.8rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                <Star fill="var(--primary)" /> Ofertas Especiales
              </h3>
              <div className="product-grid">
                {promotions.map(product => (
                  <div key={product.id} className="product-card" style={{ border: '1px solid rgba(212,175,55,0.5)', boxShadow: '0 0 20px rgba(212,175,55,0.1)' }}>
                    <div style={{ position: 'absolute', top: '20px', left: '-10px', background: 'var(--primary)', color: '#fff', padding: '5px 15px', borderRadius: '0 20px 20px 0', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Star size={14} fill="#fff" /> OFERTA
                    </div>
                    <div className="card-image">
                      <img src={product.image_url.startsWith('http') ? product.image_url : `/old_backup/${product.image_url}`} alt={product.title} />
                    </div>
                    <div className="card-content" style={{ display: 'flex', flexDirection: 'column', flex: '1', padding: '1.5rem' }}>
                      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ textAlign: 'center', minHeight: '3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>{product.title}</h3>
                        <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem' }}>${product.price?.toFixed(2) || '0.00'}</p>
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
                      </div>
                      <button className="btn-order" onClick={() => addToCart(product)} style={{ width: '100%', marginTop: 'auto' }}>Añadir al Carrito</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Catálogo General</h3>
          <div className="product-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                <div className="card-image">
                  <img src={product.image_url.startsWith('http') ? product.image_url : `/old_backup/${product.image_url}`} alt={product.title} />
                </div>
                <div className="card-content" style={{ display: 'flex', flexDirection: 'column', flex: '1', padding: '1.5rem' }}>
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ textAlign: 'center', minHeight: '3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>{product.title}</h3>
                    <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem' }}>${product.price?.toFixed(2) || '0.00'}</p>
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
                  </div>
                  <button className="btn-order" onClick={() => addToCart(product)} style={{ width: '100%', marginTop: 'auto' }}>Añadir al Carrito</button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && <p style={{ color: 'var(--text-muted)', width: '100%', textAlign: 'center', gridColumn: '1 / -1' }}>No se encontraron productos.</p>}
          </div>
        </section>
      </main>

      {/* Shopping Cart Sidebar */}
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><ShoppingCart /> Tu Carrito</h2>
          <button onClick={() => setIsCartOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><X size={24} /></button>
        </div>
        
        <div className="cart-items" style={{ padding: '1.5rem', flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cart.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>El carrito está vacío</p>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="cart-item" style={{ display: 'flex', gap: '1rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <img src={item.product.image_url.startsWith('http') ? item.product.image_url : `/old_backup/${item.product.image_url}`} alt={item.product.title} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px' }} />
                <div className="cart-item-details" style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '1rem', margin: 0 }}>{item.product.title}</h4>
                  <p style={{ color: 'var(--primary)', margin: 0 }}>${((item.product.price || 0) * item.quantity).toFixed(2)}</p>
                  
                  <div className="qty-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <button onClick={() => { if(item.quantity > 1) updateQuantity(item.product.id, -1); else removeFromCart(item.product.id); }} style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '5px', borderRadius: '5px', cursor: 'pointer' }}><Minus size={14}/></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '5px', borderRadius: '5px', cursor: 'pointer' }}><Plus size={14}/></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', background: 'var(--panel-bg)', paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}>
            <div className="cart-total" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Total:</h3>
              <h3 style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>${cartTotal.toFixed(2)}</h3>
            </div>
            
            <form onSubmit={handleWhatsApp} className="checkout-form">
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="checkout-name" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nombre Completo</label>
                <input type="text" id="checkout-name" required placeholder="Ej. Juan Pérez" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', marginTop: '5px' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="checkout-message" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mensaje o Dedicatoria (Opcional)</label>
                <textarea id="checkout-message" rows="2" placeholder="Ej. Para mi novia con mucho amor..." style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', marginTop: '5px', resize: 'vertical' }}></textarea>
              </div>
              <button type="submit" className="btn-primary w-full">Comprar por WhatsApp</button>
            </form>
          </div>
        )}
      </div>

      {/* Overlay when cart is open */}
      {isCartOpen && <div className="cart-overlay" onClick={() => setIsCartOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1049, backdropFilter: 'blur(3px)' }}></div>}

      <footer>
        <p>&copy; 2026 J&M Resin Art Ecuador. Todos los derechos reservados.</p>
        <p>Síguenos en <a href="https://www.instagram.com/jm.gongbang/" target="_blank" rel="noreferrer">Instagram (@jm.gongbang)</a></p>
      </footer>
      {/* Receipt / Success Modal */}
      {showReceipt && checkoutData && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <div className="receipt-container" style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '16px', maxWidth: '500px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
            
            <div className="receipt-content" id="print-area" style={{ overflowY: 'auto', paddingRight: '5px', flex: '1' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '5px' }}>J&M Resin Art</h2>
                <p style={{ color: 'var(--text-muted)' }}>Comprobante de Pedido</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha: {checkoutData.date}</p>
              </div>

              <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                <p><strong>Cliente:</strong> {checkoutData.name}</p>
                {checkoutData.note && <p><strong>Nota:</strong> {checkoutData.note}</p>}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>Cant.</th>
                    <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>Producto</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--text-muted)' }}>Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {checkoutData.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 'bold' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 0' }}>{item.product.title}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>${((item.product.price || 0) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ textAlign: 'right', fontSize: '1.3rem', fontWeight: 'bold', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                Total a pagar: <span style={{ color: 'var(--primary)' }}>${checkoutData.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem', flexDirection: 'column', flexShrink: 0 }}>
              <button 
                onClick={() => window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(checkoutData.whatsappText)}`, '_blank')} 
                className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                Enviar Pedido por WhatsApp
              </button>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => window.print()} className="btn-secondary" style={{ flex: 1 }}>Imprimir Comprobante</button>
                <button onClick={() => { setShowReceipt(false); setCart([]); }} className="btn-secondary" style={{ flex: 1, border: 'none', background: 'var(--input-bg)' }}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Home;
