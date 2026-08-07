import { createClient } from '@supabase/supabase-js';

// The URL and Key provided by the user
const supabaseUrl = 'https://krnfbmhibzrfeafjfimh.supabase.co';
const supabaseKey = 'sb_publishable_9dyICXxKYCkDyS_TsiKQZQ_Xt8ZnCDh';

export const supabase = createClient(supabaseUrl, supabaseKey);
