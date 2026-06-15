// Supabase Configuration
const SUPABASE_URL = 'https://dnmpjibzumrqggwlront.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_z5NkM8wFRbLujhA4SsZW2Q_49bQbDOW';

// Initialize Supabase client
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
