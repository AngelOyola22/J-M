import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook para gestionar las categorías desde Supabase.
 * Permite leer, crear, actualizar y eliminar categorías.
 */
export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (err) throw err;
      setCategories(data || []);
    } catch (err) {
      console.error('Error cargando categorías:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /**
   * Crear una nueva categoría.
   * @param {{ name: string, icon: string, display_order: number }} data
   */
  const createCategory = async (data) => {
    const { error } = await supabase.from('categories').insert([data]);
    if (error) throw error;
    await fetchCategories();
  };

  /**
   * Actualizar una categoría existente.
   * @param {number} id
   * @param {{ name?: string, icon?: string, display_order?: number }} data
   */
  const updateCategory = async (id, data) => {
    const { error } = await supabase.from('categories').update(data).eq('id', id);
    if (error) throw error;
    await fetchCategories();
  };

  /**
   * Eliminar una categoría.
   * Los productos con esta categoría quedarán con category_id = NULL.
   * @param {number} id
   */
  const deleteCategory = async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    await fetchCategories();
  };

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
