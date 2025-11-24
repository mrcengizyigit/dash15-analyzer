import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseUrl !== 'BURAYA_PROJE_URL_YAZIN' && supabaseAnonKey && supabaseAnonKey !== 'BURAYA_ANON_KEY_YAZIN') {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn('Supabase keys are missing or invalid. Check your .env file.');
}

export { supabase };
