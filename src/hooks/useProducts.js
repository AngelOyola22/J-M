import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook personalizado para cargar productos y configuraciones del sitio.
 */
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({
    heroImage: '/hero.jfif',
    heroSubtitle: '💎 Acabados de calidad ✨ Regalos únicos para toda ocasión 📍 Ecuador 🇪🇨',
    whatsappNumber: '593999999999',
    whatsappMessage: 'Hola, me gustaría realizar el siguiente pedido:',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*, categories(id, name, icon)');

      if (prodError) throw prodError;
      if (prodData) setProducts(prodData);

      const { data: setData, error: setError } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (setError && setError.code !== 'PGRST116') {
        console.warn('No se pudo cargar la configuración del sitio:', setError.message);
      }

      if (setData) {
        setSettings({
          heroImage: setData.hero_image_url || '/hero.jfif',
          heroSubtitle: setData.hero_subtitle || '💎 Acabados de calidad ✨ Regalos únicos para toda ocasión 📍 Ecuador 🇪🇨',
          whatsappNumber: setData.whatsapp_number || '593999999999',
          whatsappMessage: setData.whatsapp_message || 'Hola, me gustaría realizar el siguiente pedido:',
        });
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No se pudieron cargar los productos. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { products, settings, loading, error, refetch: fetchData };
}
