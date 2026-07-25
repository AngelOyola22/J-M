import { createClient } from '@supabase/supabase-js'

// Provide dummy values for now, the user will replace them
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tu-proyecto.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'tu-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
