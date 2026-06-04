import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (import.meta.env.PROD && (!supabaseUrl || !supabaseKey)) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Add them in Vercel Project Settings → Environment Variables.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');
