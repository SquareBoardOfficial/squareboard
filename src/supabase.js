// supabase.js
// This file sets up a single, shared Supabase client that the rest
// of the app imports and uses to talk to the database.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Safety check — if the env variables aren't loaded, log a clear error
// rather than failing with a cryptic message later.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase env variables. Make sure .env exists and contains ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);