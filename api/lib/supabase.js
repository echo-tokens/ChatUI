const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Supabase configuration missing. API key creation will be disabled.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = { supabase }; 