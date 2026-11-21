import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

// Placeholder values keep the landing page working when env vars are missing.
export const supabase = createClient(url || 'http://127.0.0.1:54321', key || 'not-configured');
