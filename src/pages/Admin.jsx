import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Edit2, Trash2, Image as ImageIcon, Star } from 'lucide-react';

export default function Admin() {
  // Settings State
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [heroSubtitle, setHeroSubtitle] = useState('💎 Acabados de calidad ✨ Regalos únicos para toda ocasión 📍 Ecuador 🇪🇨');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroMessage, setHeroMessage] = useState('');

  // Products State
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isPromotion, setIsPromotion] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchProductsAndSettings = async () => {
    try {
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*')
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

  useEffect(() => {
    fetchProductsAndSettings();
  }, []);

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
        const fileName = `hero_${Math.random()}.${fileExt}`;
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
        if(insertError) throw dbError;
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
        const fileName = `${Math.random()}.${fileExt}`;
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
        display_order: parseInt(displayOrder) || 0
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
    setIsPromotion(product.is_promotion || false);
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
    setIsPromotion(false);
    setDisplayOrder(0);
    setImageFile(null);
    setPreviewUrl('');
    const fileInput = document.getElementById('image-upload');
    if (fileInput) fileInput.value = '';
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

      <div className="admin-layout" style={{ display: 'block', paddingTop: '100px' }}>
        
        {/* Settings Section */}
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

        {/* Product Form Section */}
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
                  <label>Orden (0 es primero)</label>
                  <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} placeholder="0" />
                </div>
              </div>
              
              <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.3)' }}>
                <input type="checkbox" id="promo" checked={isPromotion} onChange={(e) => setIsPromotion(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                <label htmlFor="promo" style={{ margin: 0, color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}><Star size={16} fill={isPromotion ? "var(--primary)" : "none"}/> Marcar como Oferta / Promoción Especial</label>
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

        {/* List Section */}
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
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Oferta</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Orden</th>
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
                      {prod.is_promotion ? <Star size={18} fill="var(--primary)" color="var(--primary)" /> : <span style={{ color: 'var(--text-muted)' }}>No</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: 'var(--input-bg)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.9rem', border: '1px solid var(--glass-border)' }}>{prod.display_order || 0}</span>
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
      </div>
    </>
  );
}
