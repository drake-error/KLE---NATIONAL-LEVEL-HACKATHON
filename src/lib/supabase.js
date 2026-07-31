import { createClient } from '@supabase/supabase-js';

// The URL and Key provided by the user
const supabaseUrl = 'https://mnmbfpftbokynnzktgfs.supabase.co';
const supabaseKey = 'sb_publishable_91NJ7v9CGhHeXtoyW0yhoA_MyY-CndF';

export const supabase = createClient(supabaseUrl, supabaseKey);
