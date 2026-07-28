import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCategories } from '../hooks/useCategories';
import { LogOut, Edit2, Trash2, Image as ImageIcon, Star, Plus, X, Settings, Tags, Package, Camera, ClipboardList } from 'lucide-react';

export default function Admin() {
  // UI State
  const [activeTab, setActiveTab] = useState('products');

  // Settings State
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [heroSubtitle, setHeroSubtitle] = useState('💎 Acabados de calidad ✨ Regalos únicos para toda ocasión 📍 Ecuador 🇪🇨');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroMessage, setHeroMessage] = useState('');

  // Categories (via hook)
  const { categories, createCategory, deleteCategory } = useCategories();

  // Products State
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPromotion, setIsPromotion] = useState(false);
  const [isPersonalizable, setIsPersonalizable] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [newCatOrder, setNewCatOrder] = useState(0);
  const [catMessage, setCatMessage] = useState('');

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchProductsAndSettings = async () => {
    try {
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*, categories(id, name, icon)')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (prodError) throw prodError;
      if (prodData) setProducts(prodData);

      const { data: setData, error: setError } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (setError && setError.code !== 'PGRST116') {
        console.error('Error fetching settings:', setError);
      }

      if (setData) {
        if (setData.hero_image_url) setHeroImageUrl(setData.hero_image_url);
        if (setData.hero_subtitle) setHeroSubtitle(setData.hero_subtitle);
        if (setData.whatsapp_number) setWhatsappNumber(setData.whatsapp_number);
        if (setData.whatsapp_message) setWhatsappMessage(setData.whatsapp_message);
      }
    } catch (err) {
      setMessage(`Error de conexión (quizás falta ejecutar SQL): ${err.message}`);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      // Usamos un simple inner join o un select con la relación implícita
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price_at_time,
            personalization_text,
            personalization_image_url,
            products ( title )
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      if (ordersData) setOrders(ordersData);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndSettings();
    fetchOrders();
  }, []);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      if (error) throw error;
      
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert(`Error actualizando estado: ${err.message}`);
    }
  };

  const handleSignOut = () => supabase.auth.signOut();

  // Settings Handlers
  const handleHeroImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setHeroImageFile(file);
      setHeroImageUrl(URL.createObjectURL(file));
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setHeroLoading(true);
    setHeroMessage('');
    try {
      let publicUrl = heroImageUrl;
      if (heroImageFile) {
        const fileExt = heroImageFile.name.split('.').pop();
        const fileName = `hero_${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, heroImageFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      const settingsData = {
        hero_image_url: publicUrl,
        hero_subtitle: heroSubtitle,
        whatsapp_number: whatsappNumber,
        whatsapp_message: whatsappMessage
      };

      const { error: dbError } = await supabase.from('site_settings').update(settingsData).eq('id', 1);

      if (dbError) {
        const { error: insertError } = await supabase.from('site_settings').insert([{ id: 1, ...settingsData }]);
        if (insertError) throw dbError;
      }

      setHeroMessage('¡Configuraciones guardadas!');
      setHeroImageFile(null);
    } catch (error) {
      setHeroMessage(`Error: ${error.message}`);
    } finally {
      setHeroLoading(false);
    }
  };

  // Product Handlers
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !price || (!imageFile && !previewUrl)) {
      setMessage('Por favor completa todos los campos.');
      return;
    }
    setLoading(true);
    setMessage('');

    try {
      let publicUrl = previewUrl;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      const productData = {
        title,
        description,
        price: parseFloat(price),
        image_url: publicUrl,
        is_promotion: isPromotion,
        is_personalizable: isPersonalizable,
        display_order: parseInt(displayOrder) || 0,
        stock: stock !== '' ? parseInt(stock) : null,
        category_id: categoryId !== '' ? parseInt(categoryId) : null,
      };

      if (editingId) {
        const { error: dbError } = await supabase.from('products').update(productData).eq('id', editingId);
        if (dbError) throw dbError;
        setMessage('¡Producto actualizado exitosamente!');
      } else {
        const { error: dbError } = await supabase.from('products').insert([productData]);
        if (dbError) throw dbError;
        setMessage('¡Producto publicado exitosamente!');
      }
      resetForm();
      fetchProductsAndSettings();
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setTitle(product.title);
    setDescription(product.description);
    setPrice(product.price || '');
    setStock(product.stock !== null && product.stock !== undefined ? product.stock : '');
    setCategoryId(product.category_id !== null && product.category_id !== undefined ? product.category_id : '');
    setIsPromotion(product.is_promotion || false);
    setIsPersonalizable(product.is_personalizable || false);
    setDisplayOrder(product.display_order || 0);
    setPreviewUrl(product.image_url);
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setMessage('Producto eliminado.');
      fetchProductsAndSettings();
    } catch (error) {
      setMessage(`Error al eliminar: ${error.message}`);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setStock('');
    setCategoryId('');
    setIsPromotion(false);
    setIsPersonalizable(false);
    setDisplayOrder(0);
    setImageFile(null);
    setPreviewUrl('');
    const fileInput = document.getElementById('image-upload');
    if (fileInput) fileInput.value = '';
  };

  // Category handlers
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await createCategory({
        name: newCatName.trim(),
        icon: newCatIcon.trim() || '🏷️',
        display_order: parseInt(newCatOrder) || 0,
      });
      setCatMessage('¡Categoría creada!');
      setNewCatName('');
      setNewCatIcon('');
      setNewCatOrder(0);
      setTimeout(() => setCatMessage(''), 3000);
    } catch (err) {
      setCatMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`¿Eliminar la categoría "${name}"? Los productos asignados quedarán sin categoría.`)) return;
    try {
      await deleteCategory(id);
      setCatMessage('Categoría eliminada.');
      setTimeout(() => setCatMessage(''), 3000);
    } catch (err) {
      setCatMessage(`Error: ${err.message}`);
    }
  };

  return (
    <>
      <div className="glass-bg"></div>
      <header style={{ padding: '1rem 5%' }}>
        <nav>
          <div className="logo">J&M <span>Admin</span></div>
          <ul className="nav-links">
            <li><a href="/">Ver Tienda Pública</a></li>
            <li>
              <button onClick={handleSignOut} className="btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LogOut size={16} /> Salir
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <div className="admin-layout" style={{ display: 'block', paddingTop: '120px' }}>

        {/* Tabs Navigation */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 5%' }}>
          <div className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
              <Package size={18} /> Productos
            </button>
            <button className={`admin-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
              <Tags size={18} /> Categorías
            </button>
            <button className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <ClipboardList size={18} /> Órdenes
            </button>
            <button className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={18} /> Configuración
            </button>
          </div>
        </div>

        {/* ============================
            SETTINGS TAB
            ============================ */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: '1200px', margin: '0 auto 4rem auto', padding: '0 5%' }}>
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '300px' }}>
                <h2>Configuración del <span className="highlight">Sitio</span></h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Personaliza cómo funciona tu tienda de cara al cliente.</p>
                {heroMessage && <div className={heroMessage.includes('Error') ? 'alert-error' : 'alert-success'}>{heroMessage}</div>}

                <form onSubmit={handleSettingsSubmit} style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: '1' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Foto de Portada</label>
                      <input type="file" accept="image/*" onChange={handleHeroImageChange} style={{ background: 'var(--input-bg)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', width: '100%' }} />
                    </div>
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--input-bg)' }}>
                      {heroImageUrl ? <img src={heroImageUrl} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={20} color="var(--text-muted)" />}
                    </div>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Subtítulo de la Portada</label>
                    <textarea rows="2" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Ej. 💎 Acabados de calidad..."></textarea>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Número de WhatsApp para pedidos (Ej. 59399999999)</label>
                    <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="Código de país sin el +" />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Mensaje Inicial del Cliente (El sistema agregará el detalle del pedido debajo)</label>
                    <textarea rows="2" value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)} placeholder="Ej. ¡Hola! Deseo realizar la siguiente compra:"></textarea>
                  </div>

                  <button type="submit" className="btn-primary" disabled={heroLoading}>
                    {heroLoading ? 'Guardando...' : 'Guardar Configuraciones'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ============================
            CATEGORIES TAB
            ============================ */}
        {activeTab === 'categories' && (
          <div style={{ maxWidth: '1200px', margin: '0 auto 4rem auto', padding: '0 5%' }}>
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h2>Gestión de <span className="highlight">Categorías</span></h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Las categorías se muestran como filtros en la tienda. Asígnalas a los productos desde el formulario de abajo.
              </p>

              {catMessage && (
                <div className={catMessage.includes('Error') ? 'alert-error' : 'alert-success'} style={{ marginBottom: '1rem' }}>
                  {catMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Formulario para crear categoría */}
                <form onSubmit={handleCreateCategory} style={{ flex: '1', minWidth: '280px' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nueva Categoría</h3>
                  <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ flex: '2', minWidth: '160px', marginBottom: 0 }}>
                      <label>Nombre</label>
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Ej. Llaveros"
                        required
                      />
                    </div>
                    <div className="input-group" style={{ flex: '1', minWidth: '90px', marginBottom: 0 }}>
                      <label>Ícono (emoji)</label>
                      <input
                        type="text"
                        value={newCatIcon}
                        onChange={(e) => setNewCatIcon(e.target.value)}
                        placeholder="🔑"
                        maxLength={4}
                      />
                    </div>
                    <div className="input-group" style={{ flex: '1', minWidth: '80px', marginBottom: 0 }}>
                      <label>Orden</label>
                      <input
                        type="number"
                        value={newCatOrder}
                        onChange={(e) => setNewCatOrder(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={16} /> Crear Categoría
                  </button>
                </form>

                {/* Lista de categorías existentes */}
                <div style={{ flex: '1', minWidth: '280px' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categorías Existentes</h3>
                  {categories.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay categorías creadas todavía.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {categories.map(cat => (
                        <div key={cat.id} className="admin-category-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                            <div>
                              <p style={{ fontWeight: 700, margin: 0 }}>{cat.name}</p>
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Orden: {cat.display_order}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

            {/* ============================
            PRODUCTS TAB
            ============================ */}
            {activeTab === 'products' && (
              <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '4rem', flexWrap: 'wrap', padding: '0 5%' }}>
                <div className="glass-card" style={{ flex: '1', minWidth: '350px' }}>
                  <h2>{editingId ? 'Editar' : 'Crear'} <span className="highlight">Producto</span></h2>
                  <p>{editingId ? 'Modifica los datos del producto.' : 'Publica un nuevo anuncio.'}</p>

                  {message && (
                    <div className={message.includes('Error') ? 'alert-error' : 'alert-success'}>
                      {message}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="input-group">
                      <label>Título del Producto</label>
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Llavero de Letra M" />
                    </div>
                    <div className="input-group">
                      <label>Descripción</label>
                      <textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe el producto..."></textarea>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="input-group" style={{ flex: '1' }}>
                        <label>Precio ($)</label>
                        <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej. 15.50" />
                      </div>
                      <div className="input-group" style={{ flex: '1' }}>
                        <label>Stock disponible</label>
                        <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Vacío = ilimitado" />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Categoría del Producto</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        <option value="">Sin categoría</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Orden de Visualización (0 es primero)</label>
                      <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} placeholder="0" />
                    </div>

                    <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.3)' }}>
                      <input type="checkbox" id="promo" checked={isPromotion} onChange={(e) => setIsPromotion(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                      <label htmlFor="promo" style={{ margin: 0, color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}><Star size={16} fill={isPromotion ? "var(--primary)" : "none"} /> Marcar como Oferta / Promoción Especial</label>
                    </div>

                    <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.3)' }}>
                      <input type="checkbox" id="personalizable" checked={isPersonalizable} onChange={(e) => setIsPersonalizable(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                      <label htmlFor="personalizable" style={{ margin: 0, color: 'var(--text-main)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}><Camera size={16} /> Requiere foto (Personalizable)</label>
                    </div>

                    <div className="input-group">
                      <label>Imagen del Producto</label>
                      <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Publicar Producto')}
                      </button>
                      {editingId && (
                        <button type="button" onClick={resetForm} className="btn-secondary w-full">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Preview */}
                <div style={{ flex: '1', minWidth: '350px' }}>
                  <h2>Vista <span className="highlight">Previa</span></h2>
                  <div className="preview-container">
                    <div className="product-card" style={{ maxWidth: '350px', margin: '0 auto', position: 'relative' }}>
                      {isPromotion && (
                        <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--primary)', color: '#fff', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', zIndex: 10, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Star size={14} fill="#fff" /> OFERTA
                        </div>
                      )}
                      <div className="card-image">
                        {previewUrl ? <img src={previewUrl} alt="Vista previa" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--input-bg)', color: 'var(--text-muted)' }}>Sin Imagen</div>}
                      </div>
                      <div className="card-content">
                        <h3>{title || 'Título del Producto'}</h3>
                        <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem' }}>${price ? parseFloat(price).toFixed(2) : '0.00'}</p>
                        <p>{description || 'La descripción del producto.'}</p>
                        <button className="btn-order" type="button" disabled>Añadir al Carrito</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* List Section */}
            {activeTab === 'products' && (
              <div style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 5%' }}>
                <h2>Gestión de <span className="highlight">Inventario</span></h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Lista de todos los productos publicados en tu tienda.</p>

                <div style={{ overflowX: 'auto', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                    <thead style={{ background: 'var(--input-bg)' }}>
                      <tr>
                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Imagen</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Título</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Precio</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Stock</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Oferta</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(prod => (
                        <tr key={prod.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '1rem' }}>
                            <img src={prod.image_url} alt={prod.title} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 'bold' }}>{prod.title}</td>
                          <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}>${prod.price?.toFixed(2) || '0.00'}</td>
                          <td style={{ padding: '1rem' }}>
                            {prod.stock === null || prod.stock === undefined
                              ? <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>∞ Ilimitado</span>
                              : prod.stock === 0
                                ? <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.85rem' }}>Agotado</span>
                                : <span style={{ color: prod.stock <= 5 ? '#f59e0b' : '#22c55e', fontWeight: 'bold', fontSize: '0.85rem' }}>{prod.stock} uds.</span>
                            }
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {prod.is_promotion ? <Star size={18} fill="var(--primary)" color="var(--primary)" /> : <span style={{ color: 'var(--text-muted)' }}>No</span>}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button onClick={() => handleEdit(prod)} className="btn-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Edit2 size={16} /> Editar
                              </button>
                              <button onClick={() => handleDelete(prod.id)} className="btn-secondary" style={{ padding: '0.5rem', borderColor: '#ff6b6b', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay productos publicados todavía.</p>}
                </div>
              </div>
            )}

            {/* ============================
            ORDERS TAB
            ============================ */}
            {activeTab === 'orders' && (
              <div style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 5%' }}>
                <h2>Gestión de <span className="highlight">Órdenes</span></h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Revisa y gestiona los pedidos realizados por tus clientes, junto con sus fotos de personalización.</p>
                
                {ordersLoading ? (
                  <p>Cargando órdenes...</p>
                ) : orders.length === 0 ? (
                  <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <ClipboardList size={48} opacity={0.3} style={{ marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Aún no tienes órdenes registradas.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {orders.map(order => (
                      <div 
                        key={order.id} 
                        className="glass-card" 
                        style={{ padding: '1.5rem', cursor: 'pointer', transition: 'var(--transition)' }}
                        onClick={() => setSelectedOrder(order)}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <h3 style={{ margin: '0 0 0.5rem 0' }}>Orden <span style={{ color: 'var(--primary)', fontSize: '0.9em' }}>#{order.id.split('-')[0]}</span></h3>
                        <p style={{ margin: '0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(order.created_at).toLocaleString('es-EC')}</p>
                        
                        <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <p style={{ margin: 0 }}><strong>{order.customer_name}</strong></p>
                           <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0', color: 'var(--primary)' }}>${Number(order.total_price).toFixed(2)}</p>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{order.order_items?.length || 0} artículos</span>
                          <span style={{ 
                                background: order.status === 'Completada' ? 'rgba(34, 197, 94, 0.2)' : order.status === 'Procesando' ? 'rgba(59, 130, 246, 0.2)' : order.status === 'Cancelada' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                color: order.status === 'Completada' ? '#22c55e' : order.status === 'Procesando' ? '#3b82f6' : order.status === 'Cancelada' ? '#ef4444' : '#f59e0b',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '50px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                              }}>
                              {order.status || 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Detalle Orden */}
          {selectedOrder && (
            <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setSelectedOrder(null) }}>
              <div className="receipt-container" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Orden <span style={{ color: 'var(--primary)' }}>#{selectedOrder.id.split('-')[0]}</span></h2>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>{new Date(selectedOrder.created_at).toLocaleString('es-EC')}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <X size={24} />
                  </button>
                </div>
                
                <div style={{ marginBottom: '1.5rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 0.5rem 0' }}><strong>Cliente:</strong> {selectedOrder.customer_name}</p>
                  {selectedOrder.customer_note && <p style={{ margin: '0', color: 'var(--text-muted)' }}><strong>Nota:</strong> {selectedOrder.customer_note}</p>}
                </div>

                <h3 style={{ marginBottom: '1rem' }}>Artículos</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(selectedOrder.order_items || []).map((item, idx) => (
                    <li key={idx} style={{ background: 'var(--panel-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>{item.quantity}x {item.products?.title || 'Producto Eliminado'}</strong>
                        <span>${Number(item.price_at_time).toFixed(2)} c/u</span>
                      </div>
                      {item.personalization_text && (
                        <p style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>
                          ✏️ {item.personalization_text}
                        </p>
                      )}
                      {item.personalization_image_url && (
                        <div style={{ marginTop: '0.8rem', background: 'var(--input-bg)', padding: '0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                          <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>📸 Foto adjuntada:</p>
                          <a href={item.personalization_image_url} target="_blank" rel="noreferrer">
                            <img src={item.personalization_image_url} alt="Personalización" style={{ height: '80px', borderRadius: '4px', objectFit: 'cover' }} />
                          </a>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <strong>Estado:</strong>
                    <select 
                      value={selectedOrder.status || 'Pendiente'}
                      onChange={(e) => {
                        handleUpdateOrderStatus(selectedOrder.id, e.target.value);
                        setSelectedOrder({...selectedOrder, status: e.target.value});
                      }}
                      style={{ 
                        background: selectedOrder.status === 'Completada' ? 'rgba(34, 197, 94, 0.2)' : selectedOrder.status === 'Procesando' ? 'rgba(59, 130, 246, 0.2)' : selectedOrder.status === 'Cancelada' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: selectedOrder.status === 'Completada' ? '#22c55e' : selectedOrder.status === 'Procesando' ? '#3b82f6' : selectedOrder.status === 'Cancelada' ? '#ef4444' : '#f59e0b',
                        border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold'
                      }}
                    >
                      <option value="Pendiente" style={{color:'#000'}}>Pendiente</option>
                      <option value="Procesando" style={{color:'#000'}}>Procesando</option>
                      <option value="Completada" style={{color:'#000'}}>Completada</option>
                      <option value="Cancelada" style={{color:'#000'}}>Cancelada</option>
                    </select>
                  </div>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Total: ${Number(selectedOrder.total_price).toFixed(2)}</h3>
                </div>
              </div>
            </div>
          )}
    </>
      );
}
