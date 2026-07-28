import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../hooks/useCart';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import {
  ArrowLeft, ShoppingCart, Share2, Star,
  CheckCircle, X, Plus, Minus, Camera, Trash2, Check
} from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [personalization, setPersonalization] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [added, setAdded] = useState(false);
  const [settings, setSettings] = useState({
    whatsappNumber: '593999999999',
    whatsappMessage: 'Hola, me gustaría realizar el siguiente pedido:',
  });

  const {
    cart, isCartOpen, setIsCartOpen,
    addToCart, updateQuantity, updatePersonalization,
    removeFromCart, cartTotal, cartCount,
  } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      setQuantity(1);
      setPersonalization('');
      setAdded(false);

      try {
        // Cargar producto con categoría relacionada
        const { data, error: err } = await supabase
          .from('products')
          .select('*, categories(id, name, icon)')
          .eq('id', id)
          .single();

        if (err) throw err;
        setProduct(data);

        // Cargar relacionados por category_id
        if (data?.category_id) {
          const { data: related } = await supabase
            .from('products')
            .select('*, categories(id, name, icon)')
            .eq('category_id', data.category_id)
            .neq('id', id)
            .limit(4);
          setRelatedProducts(related || []);
        } else {
          const { data: related } = await supabase
            .from('products')
            .select('*, categories(id, name, icon)')
            .neq('id', id)
            .limit(4);
          setRelatedProducts(related || []);
        }

        // Cargar configuración de WhatsApp
        const { data: setData } = await supabase
          .from('site_settings')
          .select('whatsapp_number, whatsapp_message')
          .eq('id', 1)
          .single();

        if (setData?.whatsapp_number) {
          setSettings({
            whatsappNumber: setData.whatsapp_number,
            whatsappMessage: setData.whatsapp_message || 'Hola, me gustaría realizar el siguiente pedido:',
          });
        }
      } catch (err) {
        setError('No se pudo cargar el producto. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadPhoto = async () => {
    if (!selectedFile) return null;
    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('customer-uploads')
        .upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('customer-uploads').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      alert('Error al subir la imagen: ' + err.message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    let imageUrl = null;
    if (product.is_personalizable && selectedFile) {
      imageUrl = await uploadPhoto();
    }

    const options = {
      personalization: personalization.trim(),
      personalization_image_url: imageUrl
    };

    for (let i = 0; i < quantity; i++) {
      addToCart(product, options);
    }
    
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${product?.title} — J&M Resin Art`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelado */ }
    } else {
      navigator.clipboard.writeText(url);
      alert('¡Enlace copiado al portapapeles!');
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    
    let imageUrl = null;
    if (product.is_personalizable && selectedFile) {
      imageUrl = await uploadPhoto();
    }

    let text = `${settings.whatsappMessage}\n\n`;
    text += `*Producto:* ${product.title}\n`;
    text += `*Cantidad:* ${quantity}\n`;
    text += `*Precio unitario:* $${product.price?.toFixed(2)}\n`;
    if (personalization) text += `*Personalización:* ${personalization}\n`;
    if (imageUrl) text += `*Foto Adjunta:* ${imageUrl}\n`;
    text += `\n*TOTAL: $${((product.price || 0) * quantity).toFixed(2)}*`;

    if (product.is_personalizable && !imageUrl) {
      text += `\n\n_📸 Nota: Como este es un producto personalizable con foto, por favor envíame la imagen por aquí para prepararlo._`;
    }

    window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isOutOfStock = product?.stock !== null && product?.stock !== undefined && product?.stock <= 0;

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <div className="glass-bg" />
        <header>
          <nav>
            <div className="logo">J&M <span>Resin Art</span></div>
          </nav>
        </header>
        <div className="detail-loading">
          <div className="detail-skeleton-image" />
          <div className="detail-skeleton-info">
            <div className="skeleton-line" style={{ width: '60%', height: '32px' }} />
            <div className="skeleton-line" style={{ width: '30%', height: '24px', marginTop: '1rem' }} />
            <div className="skeleton-line" style={{ width: '90%', height: '14px', marginTop: '1.5rem' }} />
            <div className="skeleton-line" style={{ width: '75%', height: '14px', marginTop: '0.5rem' }} />
            <div className="skeleton-line" style={{ width: '100%', height: '48px', marginTop: '2rem', borderRadius: '12px' }} />
          </div>
        </div>
      </>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <>
        <div className="glass-bg" />
        <div className="detail-error">
          <p style={{ fontSize: '3rem' }}>😕</p>
          <p>{error || 'Producto no encontrado.'}</p>
          <button onClick={() => navigate('/')} className="btn-primary"
            style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={18} /> Volver a la tienda
          </button>
        </div>
      </>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="glass-bg" />

      {/* Header */}
      <header>
        <nav>
          <div className="logo">J&M <span>Resin Art</span></div>
          <ul className="nav-links">
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/#products">Productos</Link></li>
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
          </div>
        </nav>
      </header>

      <main className="detail-main">
        {/* Breadcrumb */}
        <div className="detail-breadcrumb">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={18} /> Volver
          </button>
          <span className="breadcrumb-sep">/</span>
          {product.categories?.name && (
            <>
              <Link to="/" className="breadcrumb-link">
                {product.categories.icon} {product.categories.name}
              </Link>
              <span className="breadcrumb-sep">/</span>
            </>
          )}
          <span className="breadcrumb-current">{product.title}</span>
        </div>

        {/* Producto Principal */}
        <div className="detail-grid">
          {/* ── Imagen ─────────────────────────────── */}
          <div className="detail-image-section">
            {product.is_promotion && (
              <div className="detail-promo-badge">
                <Star size={14} fill="#fff" /> OFERTA ESPECIAL
              </div>
            )}
            <div className="detail-image-wrapper">
              <img
                src={product.image_url}
                alt={product.title}
                className="detail-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2Y1ZjBlOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjYWE5OTg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U2luIEltYWdlbjwvdGV4dD48L3N2Zz4=';
                }}
              />
            </div>
            <button onClick={handleShare} className="share-btn">
              <Share2 size={16} /> Compartir
            </button>
          </div>

          {/* ── Info ───────────────────────────────── */}
          <div className="detail-info">
            {product.categories?.name && (
              <span className="detail-category-badge">
                {product.categories.icon} {product.categories.name}
              </span>
            )}
            <h1 className="detail-title">{product.title}</h1>
            <p className="detail-price">${product.price?.toFixed(2) || '0.00'}</p>

            {/* Stock */}
            {isOutOfStock ? (
              <div className="detail-stock out">🚫 Producto Agotado</div>
            ) : product.stock !== null && product.stock !== undefined ? (
              product.stock <= 5 ? (
                <div className="detail-stock low">⚡ ¡Solo quedan {product.stock} disponibles!</div>
              ) : (
                <div className="detail-stock ok">✅ En stock ({product.stock} disponibles)</div>
              )
            ) : (
              <div className="detail-stock ok">✅ Disponible</div>
            )}

            {/* Descripción */}
            <div className="detail-description">
              <h3>Descripción</h3>
              <p>{product.description}</p>
            </div>

            {/* Alerta de foto */}
            {product.is_personalizable && (
              <div className="personalization-alert" style={{ marginBottom: '1.5rem' }}>
                <div className="personalization-alert-icon">📸</div>
                <div className="personalization-alert-content">
                  <h4>Requiere Foto</h4>
                  <p style={{ marginBottom: '1rem' }}>Este producto incluye una foto personalizada. Sube la imagen que deseas utilizar aquí mismo, o envíala por WhatsApp al finalizar el pedido.</p>
                  
                  <label htmlFor="photo-upload" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', padding: '0.6rem 1rem' }}>
                    <Camera size={16} /> {selectedFile ? 'Cambiar Imagen' : 'Subir Imagen'}
                  </label>
                  <input 
                    id="photo-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />
                  
                  {selectedFile && (
                    <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--input-bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={URL.createObjectURL(selectedFile)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedFile.name}</span>
                      <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Personalización Textual */}
            <div className="detail-personalization">
              <label htmlFor="detail-personal">
                ✏️ ¿Quieres personalizar este producto?
                <span className="optional-tag">Opcional</span>
              </label>
              <textarea
                id="detail-personal"
                rows="3"
                value={personalization}
                onChange={(e) => setPersonalization(e.target.value)}
                placeholder="Ej: Con la letra 'A' en dorado, para regalo de cumpleaños, con el nombre 'María'..."
                className="personalization-textarea"
              />
            </div>

            {/* Cantidad */}
            {!isOutOfStock && (
              <div className="detail-quantity">
                <label>Cantidad:</label>
                <div className="qty-selector">
                  <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>
                    <Minus size={16} />
                  </button>
                  <span className="qty-display">{quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => setQuantity(q => q + 1)}
                    disabled={product.stock !== null && product.stock !== undefined && quantity >= product.stock}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Subtotal */}
            {!isOutOfStock && quantity > 1 && (
              <p className="detail-subtotal">
                Subtotal: <strong>${((product.price || 0) * quantity).toFixed(2)}</strong>
              </p>
            )}

            {/* Botones */}
            <div className="detail-actions">
              <button className={`btn-primary add-cart ${added ? 'added' : ''}`} onClick={handleAddToCart} disabled={isOutOfStock || isUploading}>
                {isUploading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Subiendo...
                  </span>
                ) : added ? (
                  <><Check size={20} /> Agregado</>
                ) : (
                  <><ShoppingCart size={20} /> Añadir al Carrito</>
                )}
              </button>
              <button className="btn-secondary buy-now" onClick={handleBuyNow} disabled={isOutOfStock || isUploading}>
                {isUploading ? 'Subiendo...' : 'Comprar Ahora'}
              </button>
            </div>

            {/* Trust badges */}
            <div className="detail-trust">
              <span>🔒 Pago seguro</span>
              <span>🚚 Envío a todo Ecuador</span>
              <span>💎 Calidad garantizada</span>
            </div>
          </div>
        </div>

        {/* ── Productos Relacionados ──────────────── */}
        {relatedProducts.length > 0 && (
          <section className="related-section">
            <h2>También te puede <span className="highlight">gustar</span></h2>
            <div className="product-grid" style={{ marginTop: '2rem' }}>
              {relatedProducts.map(rel => {
                const relOutOfStock = rel.stock !== null && rel.stock !== undefined && rel.stock <= 0;
                return (
                  <Link to={`/producto/${rel.id}`} key={rel.id} className="related-card">
                    {rel.is_promotion && (
                      <div className="promo-badge">
                        <Star size={12} fill="#fff" /> OFERTA
                      </div>
                    )}
                    <div className="card-image">
                      <img
                        src={rel.image_url}
                        alt={rel.title}
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2Y1ZjBlOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjYWE5OTg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U2luIEltYWdlbjwvdGV4dD48L3N2Zz4=';
                        }}
                      />
                    </div>
                    <div className="card-content">
                      <div className="card-info">
                        {rel.categories?.name && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>
                            {rel.categories.icon} {rel.categories.name}
                          </span>
                        )}
                        <h3 className="card-title">{rel.title}</h3>
                        <p className="card-price">${rel.price?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className={`related-btn ${relOutOfStock ? 'disabled' : ''}`}>
                        {relOutOfStock ? 'Agotado' : 'Ver Producto'}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* ── Cart Sidebar ──────────────────────────── */}
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>
            <ShoppingCart size={22} /> Tu Carrito
            {cartCount > 0 && <span className="cart-count-label">{cartCount} items</span>}
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="cart-close-btn"><X size={24} /></button>
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingCart size={48} opacity={0.2} />
              <p>Tu carrito está vacío</p>
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
            <Link
              to="/"
              onClick={() => setIsCartOpen(false)}
              className="btn-primary w-full"
              style={{ textAlign: 'center', display: 'block', marginTop: '1rem' }}
            >
              Ir a pagar
            </Link>
          </div>
        )}
      </div>
      {isCartOpen && <div className="cart-overlay" onClick={() => setIsCartOpen(false)} />}

      <FloatingWhatsApp phoneNumber={settings.whatsappNumber} />
    </>
  );
}

// ─── Sub-componente: Item del carrito ──────────────────────────────────────
function CartItem({ item, onUpdateQty, onRemove, onUpdatePersonalization }) {
  const [showPersonal, setShowPersonal] = useState(!!item.personalization);

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
          <button className="qty-btn" onClick={() => { if (item.quantity > 1) onUpdateQty(item.product.id, -1); else onRemove(item.product.id); }}>
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
        <button className="cart-personalization-toggle" onClick={() => setShowPersonal(p => !p)}>
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
