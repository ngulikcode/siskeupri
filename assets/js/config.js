const SUPABASE_URL = window.env?.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = window.env?.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';

window.GEMINI_API_KEY = window.env?.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
